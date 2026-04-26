import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date:         { type: Date, required: true },
  time:         { type: String, default: '10:00' },
  type:         { type: String, default: 'review' },
  status:       { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  notes:        { type: String, default: '' },
}, { timestamps: true });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);
export default Appointment;
