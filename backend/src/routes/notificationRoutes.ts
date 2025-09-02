import express from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get(
  '/',
  validateRequest({
    query: [
      { field: 'limit', type: 'number', optional: true },
      { field: 'offset', type: 'number', optional: true },
      { field: 'isRead', enum: ['true', 'false'], optional: true },
      { field: 'type', enum: ['homework_assigned', 'homework_due', 'feedback_available', 'lesson_analyzed'], optional: true },
    ],
  }),
  notificationController.getUserNotifications
);

// Mark notifications as read
router.post(
  '/read',
  validateRequest({
    body: [
      { field: 'notificationIds', type: 'array', itemType: 'string' },
    ],
  }),
  notificationController.markNotificationsAsRead
);

// Register device token
router.post(
  '/device-token',
  validateRequest({
    body: [
      { field: 'token', type: 'string' },
      { field: 'device.platform', enum: ['ios', 'android', 'web'] },
      { field: 'device.model', type: 'string', optional: true },
      { field: 'device.osVersion', type: 'string', optional: true },
      { field: 'device.appVersion', type: 'string', optional: true },
    ],
  }),
  notificationController.registerDeviceToken
);

// Deactivate device token
router.delete(
  '/device-token',
  validateRequest({
    body: [
      { field: 'token', type: 'string' },
    ],
  }),
  notificationController.deactivateDeviceToken
);

// Get notification analytics
router.get('/analytics', notificationController.getNotificationAnalytics);

// Update notification preferences
router.put(
  '/preferences',
  validateRequest({
    body: [
      { field: 'preferences.notifications', type: 'boolean' },
    ],
  }),
  notificationController.updateNotificationPreferences
);

export default router;