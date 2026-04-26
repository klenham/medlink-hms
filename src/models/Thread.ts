import mongoose from 'mongoose';

const ThreadSchema = new mongoose.Schema({
  participants:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage:     { type: String, default: '' },
  lastMessageAt:   { type: Date, default: Date.now },
  lastSenderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Thread = mongoose.models.Thread || mongoose.model('Thread', ThreadSchema);
export default Thread;
