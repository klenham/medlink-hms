import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import LabRequest from '../models/LabRequest.js';
import Prescription from '../models/Prescription.js';
import PharmacyAmendment from '../models/PharmacyAmendment.js';
import Inventory from '../models/Inventory.js';
import Requisition from '../models/Requisition.js';
import Bill from '../models/Bill.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import { sendSSE } from '../lib/sse.js';

const router = express.Router();

/* ─── LAB ─── */

router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const list = await LabRequest.find({ status: 'pending' })
      .populate('patient', 'name patient_id')
      .sort({ createdAt: 1 })
      .lean();
    const formatted = list.map((l: any) => ({
      ...l, id: l._id.toString(), patient_name: l.patient?.name, patient_pid: l.patient?.patient_id,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lab/history', authenticateToken, async (req, res) => {
  try {
    const list = await LabRequest.find({ status: 'done' })
      .populate('patient', 'name patient_id')
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();
    const formatted = list.map((l: any) => ({
      id: l._id.toString(),
      patient_name: l.patient?.name || 'Unknown',
      patient_pid: l.patient?.patient_id || '',
      test_type: l.test_type,
      result: l.result,
      notes: l.notes,
      completed_at: l.updatedAt,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { result } = req.body;
  try {
    const lab = await LabRequest.findByIdAndUpdate(req.params.id, { result, status: 'done' }, { returnDocument: 'after' });
    if (lab) {
      const patient = await Patient.findById(lab.patient).lean() as any;

      /* Promote awaiting_results → results_ready when all labs for this patient are done */
      const pendingCount = await (LabRequest as any).countDocuments({ patient: lab.patient, status: 'pending' });
      if (pendingCount === 0 && patient?.status === 'awaiting_results') {
        await Patient.findByIdAndUpdate(lab.patient, { status: 'results_ready' });
      }

      /* Create/update grouped notification and push SSE event to the requesting doctor */
      if (lab.doctor) {
        const patientName = patient?.name || 'Unknown patient';
        const newEntry = {
          test_type: (lab as any).test_type,
          result,
          lab_request_id: lab._id.toString(),
        };

        // Find existing unread grouped notification for this doctor+patient
        const existing = await Notification.findOne({
          doctor: lab.doctor,
          patient: lab.patient,
          type: 'lab_result',
          read: false,
        }).lean() as any;

        let notif: any;
        if (existing) {
          // Append new result to the existing notification
          const prevResults: any[] = Array.isArray(existing.detail?.results)
            ? existing.detail.results
            : (existing.detail?.result
                ? [{ test_type: existing.detail.test_type, result: existing.detail.result, lab_request_id: existing.detail.lab_request_id }]
                : []);

          const updatedResults = [...prevResults, newEntry];
          notif = await Notification.findByIdAndUpdate(
            existing._id,
            {
              title: `Result for ${patientName}`,
              body: `${updatedResults.length} test result${updatedResults.length > 1 ? 's' : ''} ready`,
              detail: { patient_name: patientName, patient_id: patient?.patient_id || '', results: updatedResults },
            },
            { returnDocument: 'after' }
          ).lean() as any;
        } else {
          // Create new grouped notification
          const created = await Notification.create({
            doctor: lab.doctor,
            patient: lab.patient,
            type: 'lab_result',
            title: `Result for ${patientName}`,
            body: '1 test result ready',
            detail: { patient_name: patientName, patient_id: patient?.patient_id || '', results: [newEntry] },
          });
          notif = created.toObject ? created.toObject() : created;
        }

        sendSSE(lab.doctor.toString(), 'lab_result', {
          id: notif._id.toString(),
          title: notif.title,
          body: notif.body,
          detail: notif.detail,
          read: false,
          createdAt: notif.createdAt,
        });
      }
    }
    res.json({ message: 'Result updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── PHARMACY ─── */

router.get('/pharmacy/pending', authenticateToken, async (req, res) => {
  try {
    const list = await Prescription.find({ status: 'pending' })
      .populate('patient', 'name patient_id')
      .populate('doctor', 'name')
      .sort({ createdAt: 1 })
      .lean();
    const formatted = list.map((p: any) => ({
      ...p, id: p._id.toString(), patient_name: p.patient?.name, doctor_name: p.doctor?.name,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pharmacy/:id', authenticateToken, async (req, res) => {
  try {
    await Prescription.findByIdAndUpdate(req.params.id, { status: 'ready' });
    res.json({ message: 'Prescription marked as ready' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pharmacy/inventory', authenticateToken, async (req, res) => {
  try {
    const items = await Inventory.find().sort({ name: 1 }).lean();
    const formatted = items.map((i: any) => ({ ...i, id: i._id.toString() }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pharmacy/inventory', authenticateToken, async (req, res) => {
  const { id, name, category, quantity, unit, expiry_date, low_stock_threshold, unit_price } = req.body;
  try {
    if (id) {
      await Inventory.findByIdAndUpdate(id, { name, category, quantity, unit, expiry_date, low_stock_threshold, unit_price });
    } else {
      await Inventory.create({ name, category, quantity, unit, expiry_date, low_stock_threshold, unit_price });
    }
    res.json({ message: 'Inventory updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/pharmacy/inventory/:id', authenticateToken, async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pharmacy/served', authenticateToken, async (req, res) => {
  try {
    const list = await Prescription.find({ status: { $in: ['ready', 'collected'] } })
      .populate('patient', 'name patient_id')
      .populate('doctor', 'name')
      .sort({ createdAt: -1 })
      .lean();
    const formatted = list.map((p: any) => ({
      ...p, id: p._id.toString(), patient_name: p.patient?.name, doctor_name: p.doctor?.name,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pharmacy/prescriptions/:id/amend', authenticateToken, async (req: any, res) => {
  const { newMedications, reason } = req.body;
  const pharmacistId = req.user.id;
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    await PharmacyAmendment.create({
      prescription: req.params.id,
      pharmacist: pharmacistId,
      old_data: JSON.stringify(prescription.medications),
      new_data: JSON.stringify(newMedications),
      reason,
    });
    prescription.medications = newMedications;
    await prescription.save();

    res.json({ message: 'Prescription amended and logged' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pharmacy/requisitions', authenticateToken, async (req, res) => {
  try {
    const list = await Requisition.find()
      .populate('requested_by', 'name')
      .sort({ createdAt: -1 })
      .lean();
    const formatted = list.map((r: any) => ({
      ...r, id: r._id.toString(), requester_name: r.requested_by?.name,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pharmacy/requisitions', authenticateToken, async (req: any, res) => {
  const { items } = req.body;
  try {
    const req_ = await Requisition.create({ items, requested_by: req.user.id });
    res.status(201).json({ id: (req_._id as any).toString(), message: 'Requisition submitted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pharmacy/amendment-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await PharmacyAmendment.find()
      .populate({ path: 'prescription', populate: { path: 'patient', select: 'name patient_id' } })
      .populate('pharmacist', 'name')
      .sort({ createdAt: -1 })
      .lean();
    const formatted = logs.map((l: any) => ({
      ...l,
      id: l._id.toString(),
      patient_name: (l.prescription as any)?.patient?.name || '',
      pharmacist_name: l.pharmacist?.name || '',
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── BILLING ─── */

router.get('/billing/paid', authenticateToken, async (req, res) => {
  try {
    const list = await Bill.find({ status: 'paid' })
      .populate('patient', 'name patient_id')
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();
    const formatted = list.map((b: any) => ({
      ...b,
      id: b._id.toString(),
      patient_name: b.patient?.name || 'Unknown',
      patient_pid: b.patient?.patient_id || '',
      paid_at: b.updatedAt,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/billing/pending', authenticateToken, async (req, res) => {
  try {
    const list = await Bill.find({ status: 'pending' })
      .populate('patient', 'name patient_id')
      .sort({ issued_date: 1 })
      .lean();
    const formatted = list.map((b: any) => ({
      ...b, id: b._id.toString(), patient_name: b.patient?.name,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/billing/pay/:id', authenticateToken, async (req, res) => {
  const { method } = req.body;
  try {
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', payment_method: method },
      { returnDocument: 'after' }
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    await Patient.findByIdAndUpdate(bill.patient, { status: 'discharged' });
    res.json({ message: 'Payment recorded' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
