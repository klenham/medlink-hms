import mongoose from 'mongoose';

const LabRequestSchema = new mongoose.Schema({
  patient:   { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  test_type: { type: String, required: true },
  notes:     { type: String, default: '' },
  status:    { type: String, enum: ['pending', 'done'], default: 'pending' },
  result:    { type: String, default: '' },
}, { timestamps: true });

const LabRequest = mongoose.models.LabRequest || mongoose.model('LabRequest', LabRequestSchema);
export default LabRequest;
