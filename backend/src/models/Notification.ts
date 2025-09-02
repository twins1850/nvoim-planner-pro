import mongoose, { Schema, Document } from 'mongoose';
import { Notification as NotificationType } from '../../../shared/types';

export interface NotificationDocument extends Document, Omit<NotificationType, '_id'> {
  // Additional fields for the document
  deviceTokens?: string[];
  deliveryStatus: 'pending' | 'sent' | 'failed';
  readAt?: Date;
  scheduledFor?: Date;
  analytics?: {
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    actionTaken?: string;
  };
}

const NotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['homework_assigned', 'homework_due', 'feedback_available', 'lesson_analyzed'],
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    deviceTokens: {
      type: [String],
      default: [],
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    readAt: {
      type: Date,
    },
    scheduledFor: {
      type: Date,
      index: true,
    },
    analytics: {
      deliveredAt: Date,
      openedAt: Date,
      clickedAt: Date,
      actionTaken: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ scheduledFor: 1, deliveryStatus: 1 });

export const Notification = mongoose.model<NotificationDocument>('Notification', NotificationSchema);

export default Notification;