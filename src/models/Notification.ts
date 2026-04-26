import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  doctor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  type:    { type: String, default: 'lab_result' },
  title:   { type: String, required: true },
  body:    { type: String, required: true },
  detail:  { type: mongoose.Schema.Types.Mixed, default: {} },
  read:    { type: Boolean, default: false },
}, { timestamps: true });

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export default Notification;
