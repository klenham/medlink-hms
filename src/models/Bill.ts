import mongoose from 'mongoose';

const BillSchema = new mongoose.Schema({
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  items:          { type: Array, default: [] },
  total:          { type: Number, required: true, default: 0 },
  status:         { type: String, enum: ['pending', 'paid'], default: 'pending' },
  payment_method: { type: String, default: '' },
  issued_date:    { type: Date, default: Date.now },
}, { timestamps: true });

const Bill = mongoose.models.Bill || mongoose.model('Bill', BillSchema);
export default Bill;
