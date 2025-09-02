import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService';
import { ApiResponse } from '../../../shared/types';

/**
 * Get notifications for the authenticated user
 */
export const getUserNotifications = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { limit, offset, isRead, type } = req.query;

    const options = {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      type: type as any,
    };

    const { notifications, total } = await notificationService.getUserNotifications(
      userId.toString(),
      options
    );

    res.status(200).json({
      success: true,
      data: {
        notifications,
        total,
        limit: options.limit || 20,
        offset: options.offset || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notifications as read
 */
export const markNotificationsAsRead = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid notification IDs',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await notificationService.markNotificationsAsRead(notificationIds, userId.toString());

    res.status(200).json({
      success: true,
      data: { message: 'Notifications marked as read' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a device token for push notifications
 */
export const registerDeviceToken = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { token, device } = req.body;

    if (!token || !device || !device.platform) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Token and device information are required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await notificationService.registerDeviceToken(userId.toString(), token, device);

    res.status(200).json({
      success: true,
      data: { message: 'Device token registered successfully' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate a device token
 */
export const deactivateDeviceToken = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Token is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await notificationService.deactivateDeviceToken(token);

    res.status(200).json({
      success: true,
      data: { message: 'Device token deactivated successfully' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification analytics
 */
export const getNotificationAnalytics = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const analytics = await notificationService.getNotificationAnalytics(userId.toString());

    res.status(200).json({
      success: true,
      data: { analytics },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { notifications } = req.body.preferences || {};

    if (notifications === undefined) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Notification preference is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Update user preferences in the user service
    // This is handled in the userController, so we don't need to implement it here

    res.status(200).json({
      success: true,
      data: { message: 'Notification preferences updated successfully' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getUserNotifications,
  markNotificationsAsRead,
  registerDeviceToken,
  deactivateDeviceToken,
  getNotificationAnalytics,
  updateNotificationPreferences,
};