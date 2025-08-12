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
  // Baggage policy information
  baggagePolicy?: {
    cabin: {
      included: boolean;
      weight: string;
      dimensions: string;
    };
    checked: {
      included: boolean;
      weight: string;
      price: number;
      currency: string;
    };
    additional: {
      extraBagPrice: number;
      sportEquipment: boolean;
      currency: string;
    };
  };
  // Intelligence-based validation fields
  validationScore?: number;
  adaptiveThreshold?: number;
  recommendation?: 'SEND' | 'REVIEW' | 'REJECT';
  validationMethod?: 'STATISTICAL' | 'PREDICTIVE' | 'CONTEXTUAL';
  priceHistory?: number[];
  seasonalAdjustment?: number;
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
  }],
  // Baggage policy information
  baggagePolicy: {
    cabin: {
      included: { type: Boolean, default: true },
      weight: { type: String, default: '10kg' },
      dimensions: { type: String, default: '55x40x20cm' }
    },
    checked: {
      included: { type: Boolean, default: true },
      weight: { type: String, default: '23kg' },
      price: { type: Number, default: 0 },
      currency: { type: String, default: 'EUR' }
    },
    additional: {
      extraBagPrice: { type: Number, default: 50 },
      sportEquipment: { type: Boolean, default: true },
      currency: { type: String, default: 'EUR' }
    }
  },
  // Intelligence-based validation fields
  validationScore: { type: Number, min: 0, max: 100 },
  adaptiveThreshold: { type: Number, min: 0, max: 100 },
  recommendation: { 
    type: String, 
    enum: ['SEND', 'REVIEW', 'REJECT'] 
  },
  validationMethod: { 
    type: String, 
    enum: ['STATISTICAL', 'PREDICTIVE', 'CONTEXTUAL'] 
  },
  priceHistory: [{ type: Number }],
  seasonalAdjustment: { type: Number }
});

// Ensure unique alerts and automatic expiry
alertSchema.index(
  { origin: 1, destination: 1, airline: 1, price: 1, detectedAt: 1 },
  { unique: true, sparse: true }
);
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Alert = mongoose.model<IAlert>('Alert', alertSchema);
export { Alert };
export default Alert;