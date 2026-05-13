import mongoose from 'mongoose';

const NHISClaimSchema = new mongoose.Schema({
  patient:             { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  consultation:        { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
  claim_number:        { type: String, required: true, unique: true },
  nhis_number:         { type: String, default: '' },
  facility_level:      { type: String, default: 'B2' },
  diagnosis:           { type: String, default: '' },
  notes:               { type: String, default: '' },
  status:              { type: String, enum: ['draft', 'submitted', 'vetted', 'paid', 'rejected'], default: 'draft' },
  total_amount:        { type: Number, default: 0 },
  supporting_documents:{ type: Array, default: [] },
  items:               [{ type: mongoose.Schema.Types.ObjectId, ref: 'NHISClaimItem' }],
  suggested_icd10:     { type: Array, default: [] },
  ai_recommendation:   { type: String, default: '' },
  rejection_notes:     { type: String, default: '' },
  created_by:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updated_by:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  submitted_at:        { type: Date, default: null },
  vetted_at:           { type: Date, default: null },
  paid_at:             { type: Date, default: null },
}, { timestamps: true });

const NHISClaim = (mongoose.models.NHISClaim || mongoose.model('NHISClaim', NHISClaimSchema)) as mongoose.Model<any>;
export default NHISClaim;
