import express from 'express';
import Patient from '../models/Patient.js';
import PatientCounter from '../models/PatientCounter.js';
import Vitals from '../models/Vitals.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

async function generatePatientId(): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await PatientCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const seq = String(counter.seq).padStart(5, '0');
  const yr = String(year).slice(-2);
  return `PT-${seq}/${yr}`;
}

// GET all patients (with search + pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

    const filter: Record<string, any> = q ? {
      $or: [
        { name:       { $regex: q, $options: 'i' } },
        { patient_id: { $regex: q, $options: 'i' } },
        { phone:      { $regex: q, $options: 'i' } },
      ]
    } : {};

    const [docs, total] = await Promise.all([
      Patient.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Patient.countDocuments(filter),
    ]);

    const patients = docs.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      created_at: p.createdAt,
    }));

    res.json({ patients, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST register new patient
router.post('/', authenticateToken, async (req, res) => {
  const {
    surname, other_names, gender, phone, date_of_birth, address,
    marital_status, religion, occupation, nhis_number, next_of_kin,
  } = req.body;

  if (!surname || !gender || !phone) {
    return res.status(400).json({ error: 'Surname, gender, and phone are required' });
  }

  try {
    const fullName = [surname, other_names].filter(Boolean).join(' ').trim();
    const patient_id = await generatePatientId();

    let age: number | undefined;
    if (date_of_birth) {
      const dob = new Date(date_of_birth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    }

    const patient = await Patient.create({
      patient_id,
      surname,
      other_names: other_names || '',
      name: fullName,
      date_of_birth: date_of_birth || undefined,
      age,
      gender,
      phone,
      address: address || '',
      marital_status: marital_status || '',
      religion: religion || '',
      occupation: occupation || '',
      nhis_number: nhis_number || '',
      next_of_kin: next_of_kin || '',
    });

    res.status(201).json({ id: patient._id.toString(), patient_id: patient.patient_id, name: patient.name });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create patient: ' + err.message });
  }
});

// PUT update patient profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      surname, other_names, gender, phone, date_of_birth, address,
      marital_status, religion, occupation, nhis_number, next_of_kin,
    } = req.body;

    const fullName = [surname, other_names].filter(Boolean).join(' ').trim();
    let age: number | undefined;
    if (date_of_birth) {
      const dob = new Date(date_of_birth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { surname, other_names, name: fullName, gender, phone, date_of_birth, age, address, marital_status, religion, occupation, nhis_number, next_of_kin },
      { new: true }
    ).lean();

    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ patient });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET referred patients (for doctors) — patients in consultation or results_ready status with pending vitals
router.get('/referred', authenticateToken, async (req, res) => {
  try {
    const vitals = await Vitals.find({ status: 'pending' })
      .populate<{ patient: any }>('patient')
      .sort({ referred_at: 1 })
      .lean();

    const referred = vitals
      .filter(v => v.patient && ['consultation', 'awaiting_results', 'results_ready'].includes(v.patient.status))
      .map(v => ({
        id: v.patient._id.toString(),
        _id: v.patient._id.toString(),
        patient_id: v.patient.patient_id,
        name: v.patient.name,
        age: v.patient.age,
        gender: v.patient.gender,
        phone: v.patient.phone,
        nhis_number: v.patient.nhis_number,
        queue_status: v.patient.status,
        vitals_id: (v._id as any).toString(),
        bp: v.bp,
        temperature: v.temperature,
        weight: v.weight,
        pulse: v.pulse,
        spo2: v.spo2,
        ccc: v.ccc,
        ccc_status: v.ccc_status,
        referred_at: v.referred_at,
      }));

    res.json(referred);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// GET patient medical history
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const Consultation = (await import('../models/Consultation.js')).default;
    const history = await Consultation.find({ patient: req.params.id })
      .populate('doctor', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
