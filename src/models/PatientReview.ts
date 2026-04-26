import mongoose from 'mongoose';

const PatientReviewSchema = new mongoose.Schema({
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  review_date: { type: Date, required: true },
  purpose:     { type: String, required: true },
  status:      { type: String, enum: ['scheduled', 'notified', 'completed', 'missed'], default: 'scheduled' },
}, { timestamps: true });

const PatientReview = mongoose.models.PatientReview || mongoose.model('PatientReview', PatientReviewSchema);
export default PatientReview;
