// ===== backend/src/models/Alert.ts =====
import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  origin: string;
  destination: string;
  airline: string;
  price: number;
  discountPercentage: number;
  detectedAt: Date;
  expiresAt: Date;
  sentTo: {
    user: mongoose.Types.ObjectId;
    sentAt: Date;
    opened: boolean;
    clicked: boolean;
  }[];
}

const alertSchema = new Schema<IAlert>({
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  airline: { type: String, required: true },
  price: { type: Number, required: true },
  discountPercentage: { type: Number, required: true },
  detectedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  sentTo: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date, default: Date.now },
    opened: { type: Boolean, default: false },
    clicked: { type: Boolean, default: false }
  }]
});

const Alert = mongoose.model<IAlert>('Alert', alertSchema);
export { Alert };
export default Alert;