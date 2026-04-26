import mongoose from 'mongoose';

const PharmacyAmendmentSchema = new mongoose.Schema({
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
  pharmacist:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  old_data:     { type: String },
  new_data:     { type: String },
  reason:       { type: String },
}, { timestamps: true });

const PharmacyAmendment = mongoose.models.PharmacyAmendment || mongoose.model('PharmacyAmendment', PharmacyAmendmentSchema);
export default PharmacyAmendment;
