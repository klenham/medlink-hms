import mongoose from 'mongoose';

const RequisitionSchema = new mongoose.Schema({
  items:        { type: Array, default: [] },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

const Requisition = mongoose.models.Requisition || mongoose.model('Requisition', RequisitionSchema);
export default Requisition;
