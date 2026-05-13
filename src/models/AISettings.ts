import mongoose from 'mongoose';

const AISettingsSchema = new mongoose.Schema({
  groqApiKey: { type: String, default: '' },
  ollamaModel: { type: String, default: 'llama2' },
}, { timestamps: true });

const AISettings = (mongoose.models.AISettings || mongoose.model('AISettings', AISettingsSchema)) as mongoose.Model<any>;
export default AISettings;
