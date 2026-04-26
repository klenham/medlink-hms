import mongoose from 'mongoose';

const PrescriptionSchema = new mongoose.Schema({
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medications: { type: Array, default: [] },
  status:      { type: String, enum: ['pending', 'ready', 'collected'], default: 'pending' },
}, { timestamps: true });

const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', PrescriptionSchema);
export default Prescription;
