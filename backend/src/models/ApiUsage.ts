import mongoose, { Document, Schema } from 'mongoose';
import { User } from './User';
import { AIServiceType } from '../types/aiTypes';

export interface IApiUsage extends Document {
  plannerId: mongoose.Types.ObjectId;
  serviceType: AIServiceType;
  date: Date;
  units: number;
  cost: number;
  endpoint?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ApiUsageSchema = new Schema<IApiUsage>(
  {
    plannerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    serviceType: {
      type: String,
      enum: Object.values(AIServiceType),
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    units: {
      type: Number,
      required: true,
      default: 0
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
      index: true
    },
    endpoint: {
      type: String,
      index: true
    },
    requestId: {
      type: String,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for common queries
ApiUsageSchema.index({ plannerId: 1, serviceType: 1, date: 1 }, { unique: true });
ApiUsageSchema.index({ plannerId: 1, date: 1 });
ApiUsageSchema.index({ serviceType: 1, date: 1 });

// Add static methods for aggregation
ApiUsageSchema.statics.getDailyUsage = async function(plannerId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        plannerId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: '$date',
          serviceType: '$serviceType'
        },
        totalUnits: { $sum: '$units' },
        totalCost: { $sum: '$cost' }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

ApiUsageSchema.statics.getMonthlyUsage = async function(plannerId: mongoose.Types.ObjectId, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        plannerId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$serviceType',
        totalUnits: { $sum: '$units' },
        totalCost: { $sum: '$cost' }
      }
    }
  ]);
};

ApiUsageSchema.statics.getTotalUsage = async function(plannerId: mongoose.Types.ObjectId) {
  return this.aggregate([
    {
      $match: { plannerId }
    },
    {
      $group: {
        _id: null,
        totalUnits: { $sum: '$units' },
        totalCost: { $sum: '$cost' }
      }
    }
  ]);
};

export const ApiUsage = mongoose.model<IApiUsage>('ApiUsage', ApiUsageSchema);