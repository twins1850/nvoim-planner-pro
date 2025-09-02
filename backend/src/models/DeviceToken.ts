import mongoose, { Schema, Document } from 'mongoose';

export interface DeviceTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  device: {
    platform: 'ios' | 'android' | 'web';
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
  isActive: boolean;
  lastUsedAt: Date;
}

const DeviceTokenSchema = new Schema<DeviceTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    device: {
      platform: {
        type: String,
        enum: ['ios', 'android', 'web'],
        required: true,
      },
      model: String,
      osVersion: String,
      appVersion: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
DeviceTokenSchema.index({ userId: 1, isActive: 1 });
DeviceTokenSchema.index({ token: 1 }, { unique: true });

export const DeviceToken = mongoose.model<DeviceTokenDocument>('DeviceToken', DeviceTokenSchema);

export default DeviceToken;