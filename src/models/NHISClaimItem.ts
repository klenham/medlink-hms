import mongoose from 'mongoose';

const NHISClaimItemSchema = new mongoose.Schema({
  claim:              { type: mongoose.Schema.Types.ObjectId, ref: 'NHISClaim', default: null },
  category:           { type: String, enum: ['medicine', 'service', 'lab', 'other'], default: 'medicine' },
  code:               { type: String, default: '' },
  description:        { type: String, required: true },
  quantity:           { type: Number, default: 1 },
  unit_price:         { type: Number, default: 0 },
  amount:             { type: Number, default: 0 },
  prescribing_level:  { type: String, default: '' },
  nhis_listed:        { type: Boolean, default: false },
  claimable:          { type: Boolean, default: false },
  validation_notes:   { type: Array, default: [] },
}, { timestamps: true });

const NHISClaimItem = (mongoose.models.NHISClaimItem || mongoose.model('NHISClaimItem', NHISClaimItemSchema)) as mongoose.Model<any>;
export default NHISClaimItem;
