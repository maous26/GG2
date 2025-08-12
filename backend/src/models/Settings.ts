import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  value: any;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

settingsSchema.index({ key: 1 }, { unique: true });

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
export default Settings;

