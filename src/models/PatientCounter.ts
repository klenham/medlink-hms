import mongoose from 'mongoose';

const PatientCounterSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  seq:  { type: Number, default: 0 },
});

const PatientCounter = (mongoose.models.PatientCounter || mongoose.model('PatientCounter', PatientCounterSchema)) as mongoose.Model<any>;
export default PatientCounter;
