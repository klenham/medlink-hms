import mongoose from 'mongoose';

const VitalsSchema = new mongoose.Schema({
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  bp:          { type: String },
  temperature: { type: Number },
  weight:      { type: Number },
  pulse:       { type: Number },
  spo2:        { type: Number },
  ccc:         { type: String, default: '' },
  ccc_status:  { type: String, enum: ['generated', 'inactive', 'unable'], default: 'generated' },
  referred_at: { type: Date, default: Date.now },
  status:      { type: String, enum: ['pending', 'seen'], default: 'pending' },
  recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Vitals = mongoose.models.Vitals || mongoose.model('Vitals', VitalsSchema);
export default Vitals;
