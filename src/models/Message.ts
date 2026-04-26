import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  thread:  { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  content: { type: String, required: true },
  readBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export default Message;
