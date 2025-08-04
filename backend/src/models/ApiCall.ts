// ===== backend/src/models/ApiCall.ts =====
import mongoose, { Document, Schema } from 'mongoose';

export interface IApiCall extends Document {
  endpoint: string;
  method: string;
  status: 'success' | 'error';
  responseTime: number;
  userId?: mongoose.Types.ObjectId;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

const apiCallSchema = new Schema<IApiCall>({
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'error']
  },
  responseTime: {
    type: Number,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  userAgent: String,
  ipAddress: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for performance
apiCallSchema.index({ createdAt: -1 });
apiCallSchema.index({ status: 1, createdAt: -1 });
apiCallSchema.index({ userId: 1, createdAt: -1 });

const ApiCall = mongoose.model<IApiCall>('ApiCall', apiCallSchema);

export { ApiCall };
export default ApiCall;
