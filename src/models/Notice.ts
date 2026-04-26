import mongoose from 'mongoose';

const NoticeSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  content:  { type: String, required: true },
  type:     { type: String, enum: ['info', 'warning', 'event'], default: 'info' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Notice = mongoose.models.Notice || mongoose.model('Notice', NoticeSchema);
export default Notice;
