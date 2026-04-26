import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  name:                { type: String, required: true },
  category:            { type: String, default: 'Medications' },
  quantity:            { type: Number, required: true, default: 0 },
  unit:                { type: String, default: 'Units' },
  expiry_date:         { type: Date },
  low_stock_threshold: { type: Number, default: 50 },
  unit_price:          { type: Number, default: 0 },
}, { timestamps: true });

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
export default Inventory;
