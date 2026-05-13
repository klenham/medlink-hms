import NHISClaim from '../models/NHISClaim.js';
import NHISClaimItem from '../models/NHISClaimItem.js';
import Patient from '../models/Patient.js';
import Consultation from '../models/Consultation.js';
import Prescription from '../models/Prescription.js';
import LabRequest from '../models/LabRequest.js';
import { runHybridLLM } from './ai.js';
import { buildClaimItemsFromPrescriptions, buildSupportingDocuments, findNHISMedicine, isLevelAllowedAtB2 } from './nhis.js';

export const CLAIM_STATUSES = ['draft', 'submitted', 'vetted', 'paid', 'rejected'] as const;
export type ClaimStatus = typeof CLAIM_STATUSES[number];

const FACILITY_LEVEL = process.env.FACILITY_LEVEL || 'B2';

export function generateClaimNumber() {
  const prefix = 'CLM';
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 9000 + 1000).toString();
  return `${prefix}-${time}-${random}`;
}

export function buildDraftClaimData(options: {
  patient: any;
  consultation: any;
  prescriptions: any[];
  labResults: any[];
}) {
  const { patient, consultation, prescriptions, labResults } = options;
  const items = buildClaimItemsFromPrescriptions(prescriptions);
  const supporting_documents = buildSupportingDocuments(prescriptions, labResults);
  const total_amount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return {
    claim_number: generateClaimNumber(),
    patient: patient._id,
    consultation: consultation?._id || null,
    nhis_number: patient.nhis_number || '',
    facility_level: FACILITY_LEVEL,
    diagnosis: consultation?.illness || consultation?.addendum_diagnosis || 'Not specified',
    notes: consultation?.notes || consultation?.addendum_notes || '',
    status: 'draft',
    total_amount,
    supporting_documents,
    suggested_icd10: [],
    ai_recommendation: '',
    items,
  };
}

export async function createDraftClaimFromConsultation(consultationId: string, userId?: string) {
  const consultation = await Consultation.findById(consultationId).lean() as any;
  if (!consultation) return null;
  const patient = await Patient.findById(consultation.patient).lean() as any;
  if (!patient || !patient.nhis_number) return null;

  const existing = await NHISClaim.findOne({ consultation: consultation._id, status: { $in: ['draft', 'submitted', 'vetted'] } }).lean();
  if (existing) return existing;

  const prescriptions = await Prescription.find({ patient: patient._id }).lean();
  const labResults = await LabRequest.find({ patient: patient._id, status: 'done' }).lean();
  const claimData = buildDraftClaimData({ patient, consultation, prescriptions, labResults });
  const items = await Promise.all(claimData.items.map((item: any) => NHISClaimItem.create({ ...item, validation_notes: item.validation_notes || [], claim: null })));
  const claim = await NHISClaim.create({
    ...claimData,
    items: items.map((item) => item._id),
    created_by: userId || null,
    updated_by: userId || null,
  });
  await NHISClaimItem.updateMany({ _id: { $in: items.map((i) => i._id) } }, { claim: claim._id });
  return claim;
}

export async function createDraftClaimFromPrescription(prescriptionId: string, userId?: string) {
  const prescription = await Prescription.findById(prescriptionId).lean() as any;
  if (!prescription) return null;
  const patient = await Patient.findById(prescription.patient).lean() as any;
  if (!patient || !patient.nhis_number) return null;

  const consultation = await Consultation.findOne({ patient: patient._id, status: 'complete' }).sort({ updatedAt: -1 }).lean() as any;
  if (!consultation) return null;

  const existing = await NHISClaim.findOne({ consultation: consultation._id, status: { $in: ['draft', 'submitted', 'vetted'] } }).lean();
  if (existing) return existing;

  const prescriptions = await Prescription.find({ patient: patient._id }).lean();
  const labResults = await LabRequest.find({ patient: patient._id, status: 'done' }).lean();
  const claimData = buildDraftClaimData({ patient, consultation, prescriptions, labResults });
  const items = await Promise.all(claimData.items.map((item: any) => NHISClaimItem.create({ ...item, validation_notes: item.validation_notes || [], claim: null })));
  const claim = await NHISClaim.create({
    ...claimData,
    items: items.map((item) => item._id),
    created_by: userId || null,
    updated_by: userId || null,
  });
  await NHISClaimItem.updateMany({ _id: { $in: items.map((i) => i._id) } }, { claim: claim._id });
  return claim;
}

export async function validateClaimItems(claimId: string) {
  const claim = await NHISClaim.findById(claimId).populate('items').lean() as any;
  if (!claim) return null;

  const updatedItems = await Promise.all((claim.items || []).map(async (item: any) => {
    const medication = findNHISMedicine(item.description || item.code || '');
    const level = medication?.level || item.prescribing_level || '';
    const isListed = item.category !== 'medicine' ? true : Boolean(medication) || item.nhis_listed;
    const isClaimableAtLevel = item.category !== 'medicine' ? true : isLevelAllowedAtB2(level);
    const claimable = isListed && isClaimableAtLevel;
    const validation_notes = [] as string[];
    if (item.category === 'medicine' && !isListed) validation_notes.push('Not matched to a known NHIS medicine.');
    if (!claimable) validation_notes.push('Not claimable under B2 prescribing level.');
    if (!item.quantity || item.quantity <= 0) validation_notes.push('Invalid quantity.');
    if (!item.unit_price || item.unit_price <= 0) validation_notes.push('Unit price missing or zero.');
    await NHISClaimItem.findByIdAndUpdate(item._id, { nhis_listed: isListed, claimable, prescribing_level: level, validation_notes });
    return { ...item, nhis_listed: isListed, claimable, prescribing_level: level, validation_notes };
  }));

  return updatedItems;
}

export async function runClaimOptimization(claimId: string) {
  const claim = await NHISClaim.findById(claimId).populate('items').populate('patient').lean() as any;
  if (!claim) throw new Error('Claim not found');
  const patient = claim.patient;
  const itemsText = (claim.items || []).map((item: any) => `- ${item.description} | Qty: ${item.quantity} | Price: ${item.unit_price} | Claimable: ${item.claimable}`).join('\n');
  const prompt = `You are an NHIS claims validation specialist for a B2 health centre. Review this draft claim and provide the best ICD-10 code suggestions, explain which items are not claimable, and recommend corrections to improve NHIS approval chances.\n\nPatient NHIS number: ${patient.nhis_number || 'N/A'}\nFacility level: ${claim.facility_level}\nDiagnosis: ${claim.diagnosis}\nNotes: ${claim.notes}\nClaim items:\n${itemsText}\n\nReturn JSON with keys \"suggested_icd10\", \"notes\", and \"recommendations\".`;
  const result = await runHybridLLM(prompt);
  const text = result.text || '';

  try {
    const parsed = JSON.parse(text);
    const suggested_icd10 = Array.isArray(parsed.suggested_icd10) ? parsed.suggested_icd10 : [];
    const ai_recommendation = String(parsed.recommendations || parsed.notes || text);
    await NHISClaim.findByIdAndUpdate(claimId, { suggested_icd10, ai_recommendation });
    return { provider: result.provider, suggested_icd10, ai_recommendation, raw: text };
  } catch {
    const ai_recommendation = text.trim();
    await NHISClaim.findByIdAndUpdate(claimId, { ai_recommendation, updated_at: new Date() });
    return { provider: result.provider, suggested_icd10: [], ai_recommendation, raw: text };
  }
}

export function buildClaimsCsv(claims: any[]) {
  const header = ['Claim Number', 'Patient Name', 'NHIS Number', 'Status', 'Facility Level', 'Diagnosis', 'Total Amount', 'Submitted At', 'Vetted At', 'Paid At'];
  const rows = claims.map((claim) => [
    claim.claim_number,
    claim.patient?.name || '',
    claim.nhis_number,
    claim.status,
    claim.facility_level,
    claim.diagnosis,
    claim.total_amount.toFixed(2),
    claim.submitted_at ? new Date(claim.submitted_at).toISOString() : '',
    claim.vetted_at ? new Date(claim.vetted_at).toISOString() : '',
    claim.paid_at ? new Date(claim.paid_at).toISOString() : '',
  ].map((field) => `"${String(field || '').replace(/"/g, '""')}"`).join(','));

  return [header.join(','), ...rows].join('\n');
}
