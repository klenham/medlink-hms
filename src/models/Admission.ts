import mongoose from 'mongoose';

const AdmissionSchema = new mongoose.Schema({
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  admitted_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admission_date: { type: Date, default: Date.now },
  reason:         { type: String, required: true },
  ward:           { type: String, default: '' },
  urgency:        { type: String, enum: ['routine', 'urgent', 'emergency'], default: 'routine' },
  discharge_date: { type: Date },
  status:         { type: String, enum: ['admitted', 'discharged'], default: 'admitted' },
  notes:          { type: String, default: '' },
}, { timestamps: true });

const Admission = mongoose.models.Admission || mongoose.model('Admission', AdmissionSchema);
export default Admission;
