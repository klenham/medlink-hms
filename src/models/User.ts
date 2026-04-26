import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, required: true, enum: ['admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician', 'accounts'] },
  avatar:   { type: String },
  specialty:{ type: String },
  schedule: { type: String },
  phone:    { type: String },
  room:     { type: String },
  address:  { type: String },
  bio:      { type: String },
  emergency_contact_name:  { type: String },
  emergency_contact_phone: { type: String },
  experience:   { type: String },
  availability: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  is_active:   { type: Boolean, default: true },
  permissions: { type: [String], default: [] },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
