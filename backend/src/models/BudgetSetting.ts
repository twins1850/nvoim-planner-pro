import mongoose, { Document, Schema } from 'mongoose';
import { User } from './User';
import { AIServiceType } from '../types/aiTypes';

export interface IBudgetSetting extends Document {
  plannerId: mongoose.Types.ObjectId;
  monthlyBudget: number;
  currentUsage: number;
  alertThreshold: number;
  alertsEnabled: boolean;
  lastResetDate: Date;
  serviceSpecificLimits: {
    [AIServiceType.AZURE_SPEECH]?: {
      monthlyBudget: number;
      enabled: boolean;
    };
    [AIServiceType.OPENAI_GPT]?: {
      monthlyBudget: number;
      enabled: boolean;
    };
    [AIServiceType.AZURE_OCR]?: {
      monthlyBudget: number;
      enabled: boolean;
    };
  };
  costOptimizationEnabled: boolean;
  autoScalingEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSettingSchema = new Schema<IBudgetSetting>(
  {
    plannerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    monthlyBudget: {
      type: Number,
      required: true,
      default: 10000 // 1만원 기본값 (원 단위)
    },
    currentUsage: {
      type: Number,
      default: 0
    },
    alertThreshold: {
      type: Number,
      required: true,
      default: 80 // 80% 기본값
    },
    alertsEnabled: {
      type: Boolean,
      default: true
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    serviceSpecificLimits: {
      [AIServiceType.AZURE_SPEECH]: {
        monthlyBudget: {
          type: Number,
          default: 5000 // 5천원 기본값
        },
        enabled: {
          type: Boolean,
          default: true
        }
      },
      [AIServiceType.OPENAI_GPT]: {
        monthlyBudget: {
          type: Number,
          default: 4000 // 4천원 기본값
        },
        enabled: {
          type: Boolean,
          default: true
        }
      },
      [AIServiceType.AZURE_OCR]: {
        monthlyBudget: {
          type: Number,
          default: 1000 // 1천원 기본값
        },
        enabled: {
          type: Boolean,
          default: true
        }
      }
    },
    costOptimizationEnabled: {
      type: Boolean,
      default: true
    },
    autoScalingEnabled: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Add methods to check budget status
BudgetSettingSchema.methods.isServiceEnabled = function(serviceType: AIServiceType): boolean {
  if (!this.serviceSpecificLimits || !this.serviceSpecificLimits[serviceType]) {
    return true; // Default to enabled if not specified
  }
  return this.serviceSpecificLimits[serviceType].enabled;
};

BudgetSettingSchema.methods.getServiceBudget = function(serviceType: AIServiceType): number {
  if (!this.serviceSpecificLimits || !this.serviceSpecificLimits[serviceType]) {
    return this.monthlyBudget; // Default to overall budget if not specified
  }
  return this.serviceSpecificLimits[serviceType].monthlyBudget || this.monthlyBudget;
};

export const BudgetSetting = mongoose.model<IBudgetSetting>('BudgetSetting', BudgetSettingSchema);