import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Patient from '../models/Patient.js';
import Vitals from '../models/Vitals.js';
import Consultation from '../models/Consultation.js';
import LabRequest from '../models/LabRequest.js';
import Prescription from '../models/Prescription.js';
import Bill from '../models/Bill.js';
import PatientReview from '../models/PatientReview.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

// NHIS tariffs (placeholder — returns empty array; seed via admin if needed)
router.get('/tariffs/nhis', authenticateToken, async (req, res) => {
  res.json([]);
});

// Get missing-CCC vitals (NHIS patients where CCC was unable to generate)
router.get('/vitals/missing-ccc', authenticateToken, async (req, res) => {
  try {
    const list = await Vitals.find({ ccc_status: 'unable', status: 'pending' })
      .populate<{ patient: any }>('patient', 'name nhis_number patient_id')
      .sort({ referred_at: -1 })
      .lean();

    const formatted = list.map(v => ({
      id: (v._id as any).toString(),
      patient_name: v.patient?.name || '',
      nhis_number: v.patient?.nhis_number || '',
      patient_id: v.patient?.patient_id || '',
      referred_at: v.referred_at,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get medical history for a patient
router.get('/:patientId', authenticateToken, async (req, res) => {
  try {
    const history = await Consultation.find({ patient: req.params.patientId })
      .populate('doctor', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = history.map((h: any) => ({
      ...h,
      doctor_name: h.doctor?.name || 'Unknown',
      recorded_at: h.createdAt,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record vitals and refer patient to doctor
router.post('/vitals', authenticateToken, async (req: any, res) => {
  const { patient_id, bp, temperature, weight, pulse, spo2, ccc, ccc_status } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'Patient ID is required' });

  try {
    // Only enforce CCC for NHIS patients
    if (ccc_status === 'generated') {
      const patientDoc = await Patient.findById(patient_id).lean() as any;
      if (patientDoc?.nhis_number) {
        if (!ccc || !/^\d{5}$/.test(String(ccc))) {
          return res.status(400).json({ error: 'CCC must be exactly 5 digits for an active NHIS card' });
        }
      }
    }

    const [vitals] = await Promise.all([
      Vitals.create({
        patient: patient_id,
        bp, temperature, weight, pulse, spo2,
        ccc: ccc || '',
        ccc_status: ccc_status || 'generated',
        referred_at: new Date(),
        recorded_by: req.user.id,
      }),
      Patient.findByIdAndUpdate(patient_id, { status: 'consultation' }),
    ]);

    res.status(201).json({ id: (vitals._id as any).toString(), message: 'Vitals recorded and referred to doctor' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a standalone medical history record
router.post('/', authenticateToken, async (req: any, res) => {
  const { patientId, illness, treatment, notes } = req.body;
  if (!patientId || !illness) return res.status(400).json({ error: 'Patient ID and illness are required' });

  try {
    const record = await Consultation.create({
      patient: patientId,
      doctor: req.user.id,
      illness,
      treatment: treatment || '',
      notes: notes || '',
    });
    res.status(201).json({ id: (record._id as any).toString(), message: 'Medical history record added' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send lab requests to lab station early (without completing consultation)
router.post('/consultation/send-labs', authenticateToken, async (req: any, res) => {
  const { patient_id, lab_requests } = req.body;
  const doctor_id = req.user.id;
  try {
    if (!lab_requests?.length) return res.status(400).json({ error: 'No lab requests provided' });
    await LabRequest.insertMany(lab_requests.map((l: any) => ({
      patient: patient_id, doctor: doctor_id, test_type: l.type, notes: l.notes || '',
    })));
    res.json({ message: 'Lab requests sent' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send prescriptions to pharmacy early (without completing consultation)
router.post('/consultation/send-rx', authenticateToken, async (req: any, res) => {
  const { patient_id, prescriptions } = req.body;
  const doctor_id = req.user.id;
  try {
    if (!prescriptions?.length) return res.status(400).json({ error: 'No prescriptions provided' });
    await Prescription.create({ patient: patient_id, doctor: doctor_id, medications: prescriptions });
    res.json({ message: 'Prescriptions sent to pharmacy' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save partial consultation and set patient to awaiting_results
router.post('/consultation/await-results', authenticateToken, async (req: any, res) => {
  const { patient_id, illness, treatment, notes, lab_requests, lab_already_sent, prescriptions, rx_already_sent } = req.body;
  const doctor_id = req.user.id;
  try {
    await Consultation.create({
      patient: patient_id,
      doctor: doctor_id,
      illness: illness || 'Pending — awaiting lab results',
      treatment: treatment || '',
      notes: notes || '',
      status: 'partial',
    });

    if (!lab_already_sent && lab_requests?.length) {
      await LabRequest.insertMany(lab_requests.map((l: any) => ({
        patient: patient_id, doctor: doctor_id, test_type: l.type, notes: l.notes || '',
      })));
    }

    if (!rx_already_sent) {
      const validRx = (prescriptions || []).filter((p: any) => p.name);
      if (validRx.length) {
        await Prescription.create({ patient: patient_id, doctor: doctor_id, medications: validRx });
      }
    }

    await Patient.findByIdAndUpdate(patient_id, { status: 'awaiting_results' });
    res.json({ message: 'Patient awaiting lab results' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get partial consultation + lab results for a results_ready patient
router.get('/consultation/pending/:patientId', authenticateToken, async (req, res) => {
  try {
    const partial = await Consultation.findOne({ patient: req.params.patientId, status: 'partial' })
      .populate('doctor', 'name specialty')
      .sort({ createdAt: -1 })
      .lean();

    const lab_results = await (LabRequest as any).find({ patient: req.params.patientId, status: 'done' })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ consultation: partial, lab_results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Finalize consultation for a results_ready patient (add addendum and complete)
router.post('/consultation/finalize', authenticateToken, async (req: any, res) => {
  const { patient_id, addendum_notes, addendum_diagnosis, addendum_plan, bill_items } = req.body;
  const doctor_id = req.user.id;

  try {
    const patient = await Patient.findById(patient_id).lean() as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    await Consultation.findOneAndUpdate(
      { patient: patient_id, status: 'partial' },
      { addendum_notes, addendum_diagnosis, addendum_plan, status: 'complete' },
      { sort: { createdAt: -1 } }
    );

    const isInsured = !!patient.nhis_number;
    if (bill_items?.length) {
      const finalItems = isInsured ? bill_items.filter((i: any) => !i.nhis_covered) : bill_items;
      const total = finalItems.reduce((sum: number, i: any) => sum + (i.price || 0), 0);
      await Bill.create({ patient: patient_id, items: finalItems, total });
    }

    await Promise.all([
      Patient.findByIdAndUpdate(patient_id, { status: 'billing' }),
      Vitals.updateMany({ patient: patient_id, status: 'pending' }, { status: 'seen' }),
    ]);

    res.json({ message: 'Consultation finalized and bill generated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Complete consultation (all-in-one)
router.post('/consultation/complete', authenticateToken, async (req: any, res) => {
  const { patient_id, illness, treatment, notes, lab_requests, prescriptions, bill_items } = req.body;
  const doctor_id = req.user.id;

  try {
    const patient = await Patient.findById(patient_id).lean() as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const isInsured = !!patient.nhis_number;

    // 1. Consultation record
    await Consultation.create({ patient: patient_id, doctor: doctor_id, illness, treatment: treatment || '', notes: notes || '' });

    // 2. Lab requests
    if (lab_requests?.length) {
      await LabRequest.insertMany(lab_requests.map((l: any) => ({
        patient: patient_id, doctor: doctor_id, test_type: l.type, notes: l.notes || '',
      })));
    }

    // 3. Prescription
    if (prescriptions?.length) {
      await Prescription.create({ patient: patient_id, doctor: doctor_id, medications: prescriptions });
    }

    // 4. Bill (filter NHIS-covered items for insured patients)
    if (bill_items?.length) {
      const finalItems = isInsured ? bill_items.filter((i: any) => !i.nhis_covered) : bill_items;
      const total = finalItems.reduce((sum: number, i: any) => sum + (i.price || 0), 0);
      await Bill.create({ patient: patient_id, items: finalItems, total });
    }

    // 5. Update patient + vitals status
    await Promise.all([
      Patient.findByIdAndUpdate(patient_id, { status: 'billing' }),
      Vitals.updateMany({ patient: patient_id, status: 'pending' }, { status: 'seen' }),
    ]);

    res.json({ message: 'Consultation completed and bill generated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
