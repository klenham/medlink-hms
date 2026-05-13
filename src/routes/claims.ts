import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import NHISClaim from '../models/NHISClaim.js';
import NHISClaimItem from '../models/NHISClaimItem.js';
import Patient from '../models/Patient.js';
import Consultation from '../models/Consultation.js';
import Prescription from '../models/Prescription.js';
import { createDraftClaimFromConsultation, createDraftClaimFromPrescription, validateClaimItems, buildClaimsCsv, CLAIM_STATUSES } from '../lib/claims.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || 'draft');
    const filter: any = {};
    if (status && CLAIM_STATUSES.includes(status as any)) {
      filter.status = status;
    }
    if (q) {
      filter.$or = [
        { claim_number: { $regex: q, $options: 'i' } },
        { diagnosis: { $regex: q, $options: 'i' } },
        { nhis_number: { $regex: q, $options: 'i' } },
      ];
    }

    const claims = await NHISClaim.find(filter)
      .populate('patient', 'name patient_id nhis_number')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    res.json(claims.map((claim: any) => ({
      ...claim,
      id: claim._id.toString(),
      patient_name: claim.patient?.name || '',
      patient_id: claim.patient?.patient_id || '',
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const claim = await NHISClaim.findById(req.params.id)
      .populate('patient', 'name patient_id nhis_number gender age')
      .populate('consultation', 'illness treatment notes addendum_diagnosis addendum_notes status')
      .populate('items')
      .lean();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    res.json({
      ...claim,
      id: claim._id.toString(),
      patient: claim.patient || null,
      items: claim.items || [],
      supporting_documents: claim.supporting_documents || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authenticateToken, async (req: any, res) => {
  try {
    const payload: any = {};
    ['diagnosis', 'notes', 'status', 'rejection_notes', 'supporting_documents', 'suggested_icd10', 'ai_recommendation'].forEach((key) => {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    });
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }
    payload.updated_by = req.user.id;
    const claim = await NHISClaim.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    res.json({ message: 'Claim updated', claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/validate', authenticateToken, async (req, res) => {
  try {
    const items = await validateClaimItems(req.params.id);
    if (!items) return res.status(404).json({ error: 'Claim not found' });
    res.json({ message: 'Claim items validated', items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/submit', authenticateToken, async (req: any, res) => {
  try {
    const claim = await NHISClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    claim.status = 'submitted';
    claim.submitted_at = new Date();
    claim.updated_by = req.user.id;
    await claim.save();
    res.json({ message: 'Claim submitted', claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/vet', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const claim = await NHISClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    claim.status = 'vetted';
    claim.vetted_at = new Date();
    claim.updated_by = req.user.id;
    await claim.save();
    res.json({ message: 'Claim vetted', claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/mark-paid', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const claim = await NHISClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    claim.status = 'paid';
    claim.paid_at = new Date();
    claim.updated_by = req.user.id;
    await claim.save();
    res.json({ message: 'Claim marked paid', claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const claim = await NHISClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    claim.status = 'rejected';
    claim.rejection_notes = String(req.body.rejection_notes || 'Requires correction');
    claim.updated_by = req.user.id;
    await claim.save();
    res.json({ message: 'Claim rejected', claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/export', authenticateToken, async (req, res) => {
  try {
    const status = String(req.query.status || 'draft');
    const filter: any = {};
    if (status && CLAIM_STATUSES.includes(status as any)) filter.status = status;
    const claims = await NHISClaim.find(filter)
      .populate('patient', 'name')
      .sort({ updatedAt: -1 })
      .lean();
    const csv = buildClaimsCsv(claims);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nhis_claims_${status || 'all'}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/draft/from-consultation/:consultationId', authenticateToken, async (req: any, res) => {
  try {
    const claim = await createDraftClaimFromConsultation(req.params.consultationId, req.user.id);
    if (!claim) return res.status(400).json({ error: 'Unable to create draft claim from consultation' });
    res.json({ message: 'Draft claim created', claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/draft/from-prescription/:prescriptionId', authenticateToken, async (req: any, res) => {
  try {
    const claim = await createDraftClaimFromPrescription(req.params.prescriptionId, req.user.id);
    if (!claim) return res.status(400).json({ error: 'Unable to create draft claim from prescription' });
    res.json({ message: 'Draft claim created', claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
