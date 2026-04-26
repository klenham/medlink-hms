import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  patient_id:     { type: String, required: true, unique: true },
  surname:        { type: String, required: true },
  other_names:    { type: String, default: '' },
  name:           { type: String, required: true },
  date_of_birth:  { type: Date },
  age:            { type: Number },
  gender:         { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone:          { type: String, required: true },
  address:        { type: String, default: '' },
  marital_status: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed', ''], default: '' },
  religion:       { type: String, default: '' },
  occupation:     { type: String, default: '' },
  nhis_number:    { type: String, default: '' },
  next_of_kin:    { type: String, default: '' },
  status:         { type: String, enum: ['triage', 'consultation', 'awaiting_results', 'results_ready', 'laboratory', 'pharmacy', 'billing', 'discharged'], default: 'triage' },
}, { timestamps: true });

PatientSchema.index({ name: 'text', patient_id: 1 });

const Patient = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
export default Patient;
