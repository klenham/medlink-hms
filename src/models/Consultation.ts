import mongoose from 'mongoose';

const ConsultationSchema = new mongoose.Schema({
  patient:            { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  illness:            { type: String, default: '' },
  treatment:          { type: String, default: '' },
  notes:              { type: String, default: '' },
  status:             { type: String, enum: ['partial', 'complete'], default: 'complete' },
  addendum_notes:     { type: String, default: '' },
  addendum_diagnosis: { type: String, default: '' },
  addendum_plan:      { type: String, default: '' },
}, { timestamps: true });

const Consultation = mongoose.models.Consultation || mongoose.model('Consultation', ConsultationSchema);
export default Consultation;
