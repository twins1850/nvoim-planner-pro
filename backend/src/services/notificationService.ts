import { messaging } from '../config/firebase';
import Notification, { NotificationDocument } from '../models/Notification';
import DeviceToken from '../models/DeviceToken';
import { User } from '../models/User';
import { Notification as NotificationType } from '../../../shared/types';
import mongoose from 'mongoose';
import { schedule } from 'node-cron';
import { LessonAnalysis } from '../../../shared/types';
import { getUserById } from './userService';

// Notification templates
const notificationTemplates = {
  homework_assigned: {
    title: '새로운 숙제가 배정되었습니다',
    message: '{{homeworkTitle}} 숙제가 배정되었습니다. 기한: {{dueDate}}',
  },
  homework_due: {
    title: '숙제 제출 기한이 다가옵니다',
    message: '{{homeworkTitle}} 숙제의 제출 기한이 {{timeRemaining}} 남았습니다.',
  },
  feedback_available: {
    title: '숙제 피드백이 도착했습니다',
    message: '{{homeworkTitle}} 숙제에 대한 피드백이 도착했습니다.',
  },
  lesson_analyzed: {
    title: '수업 분석이 완료되었습니다',
    message: '{{lessonDate}} 수업 분석이 완료되었습니다. 확인해보세요!',
  },
};

// Lesson summary template structure
interface LessonSummaryTemplate {
  title: string;
  sections: {
    title: string;
    content: string | string[];
  }[];
}

/**
 * Create a notification in the database
 */
export const createNotification = async (
  userId: string,
  type: NotificationType['type'],
  data: any = {},
  scheduledFor?: Date
): Promise<NotificationDocument> => {
  try {
    // Get template for this notification type
    const template = notificationTemplates[type];
    if (!template) {
      throw new Error(`No template found for notification type: ${type}`);
    }

    // Replace placeholders in template
    let title = template.title;
    let message = template.message;

    // Replace placeholders with actual data
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(regex, data[key]);
      message = message.replace(regex, data[key]);
    });

    // Get user's device tokens
    const deviceTokens = await DeviceToken.find({ userId, isActive: true }).select('token');
    const tokenArray = deviceTokens.map((dt) => dt.token);

    // Create notification document
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      title,
      message,
      data,
      deviceTokens: tokenArray,
      scheduledFor,
    });

    await notification.save();

    // If not scheduled for later, send immediately
    if (!scheduledFor) {
      await sendPushNotification(notification);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Send a push notification using Firebase Cloud Messaging
 */
export const sendPushNotification = async (notification: NotificationDocument): Promise<void> => {
  try {
    // Skip if no device tokens
    if (!notification.deviceTokens || notification.deviceTokens.length === 0) {
      notification.deliveryStatus = 'failed';
      await notification.save();
      return;
    }

    // Prepare the message
    const message = {
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        notificationId: (notification._id as mongoose.Types.ObjectId).toString(),
        type: notification.type,
        ...notification.data,
      },
      tokens: notification.deviceTokens,
    };

    // Send the message
    const response = await messaging.sendEachForMulticast ? 
      await messaging.sendEachForMulticast(message) : 
      await (messaging as any).sendMulticast(message);

    // Update delivery status
    notification.deliveryStatus = response.failureCount === 0 ? 'sent' : 'failed';
    notification.analytics = {
      ...notification.analytics,
      deliveredAt: new Date(),
    };
    await notification.save();

    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          failedTokens.push(notification.deviceTokens![idx]);
        }
      });

      // Deactivate failed tokens
      await DeviceToken.updateMany(
        { token: { $in: failedTokens } },
        { $set: { isActive: false } }
      );
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    notification.deliveryStatus = 'failed';
    await notification.save();
    throw error;
  }
};

/**
 * Register or update a device token
 */
export const registerDeviceToken = async (
  userId: string,
  token: string,
  deviceInfo: {
    platform: 'ios' | 'android' | 'web';
    model?: string;
    osVersion?: string;
    appVersion?: string;
  }
): Promise<void> => {
  try {
    // Check if token already exists
    const existingToken = await DeviceToken.findOne({ token });

    if (existingToken) {
      // Update existing token
      existingToken.userId = new mongoose.Types.ObjectId(userId);
      existingToken.device = deviceInfo;
      existingToken.isActive = true;
      existingToken.lastUsedAt = new Date();
      await existingToken.save();
    } else {
      // Create new token
      await DeviceToken.create({
        userId: new mongoose.Types.ObjectId(userId),
        token,
        device: deviceInfo,
        lastUsedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error registering device token:', error);
    throw error;
  }
};

/**
 * Deactivate a device token
 */
export const deactivateDeviceToken = async (token: string): Promise<void> => {
  try {
    await DeviceToken.updateOne({ token }, { $set: { isActive: false } });
  } catch (error) {
    console.error('Error deactivating device token:', error);
    throw error;
  }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    isRead?: boolean;
    type?: NotificationType['type'];
  } = {}
): Promise<{ notifications: NotificationDocument[]; total: number }> => {
  try {
    const { limit = 20, offset = 0, isRead, type } = options;

    // Build query
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (isRead !== undefined) query.isRead = isRead;
    if (type) query.type = type;

    // Execute query
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      Notification.countDocuments(query),
    ]);

    return { notifications, total };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark notifications as read
 */
export const markNotificationsAsRead = async (
  notificationIds: string[],
  userId: string
): Promise<void> => {
  try {
    await Notification.updateMany(
      {
        _id: { $in: notificationIds.map((id) => new mongoose.Types.ObjectId(id)) },
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

/**
 * Process scheduled notifications
 */
export const processScheduledNotifications = async (): Promise<void> => {
  try {
    const now = new Date();
    const scheduledNotifications = await Notification.find({
      scheduledFor: { $lte: now },
      deliveryStatus: 'pending',
    });

    for (const notification of scheduledNotifications) {
      await sendPushNotification(notification);
    }
  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
    throw error;
  }
};

/**
 * Schedule a notification for homework deadline reminder
 */
export const scheduleHomeworkReminder = async (
  homeworkId: string,
  studentId: string,
  homeworkTitle: string,
  dueDate: Date
): Promise<void> => {
  try {
    // Schedule reminder for 24 hours before due date
    const reminderTime = new Date(dueDate);
    reminderTime.setHours(reminderTime.getHours() - 24);

    // Only schedule if reminder time is in the future
    if (reminderTime > new Date()) {
      await createNotification(
        studentId,
        'homework_due',
        {
          homeworkId,
          homeworkTitle,
          dueDate: dueDate.toLocaleDateString(),
          timeRemaining: '24시간',
        },
        reminderTime
      );
    }

    // Schedule reminder for 1 hour before due date
    const lastReminderTime = new Date(dueDate);
    lastReminderTime.setHours(lastReminderTime.getHours() - 1);

    // Only schedule if reminder time is in the future
    if (lastReminderTime > new Date()) {
      await createNotification(
        studentId,
        'homework_due',
        {
          homeworkId,
          homeworkTitle,
          dueDate: dueDate.toLocaleDateString(),
          timeRemaining: '1시간',
        },
        lastReminderTime
      );
    }
  } catch (error) {
    console.error('Error scheduling homework reminder:', error);
    throw error;
  }
};

/**
 * Generate a structured lesson summary from analysis data
 */
export const generateLessonSummary = (analysis: LessonAnalysis): LessonSummaryTemplate => {
  // Extract key expressions from the lesson
  const keyExpressions = analysis.lessonInsights
    .filter(insight => insight.includes('표현') || insight.includes('expression'))
    .slice(0, 5);

  // Extract pronunciation points
  const pronunciationPoints = analysis.pronunciationScores
    .filter(score => score.score < 0.7)
    .map(score => `${score.word}: ${score.feedback}`)
    .slice(0, 5);

  // Extract improvement areas
  const improvementAreas = analysis.improvementAreas.slice(0, 3);

  return {
    title: '수업 요약',
    sections: [
      {
        title: '오늘 배운 주요 표현',
        content: keyExpressions.length > 0 ? keyExpressions : ['이번 수업에서 특별히 강조된 표현이 없습니다.'],
      },
      {
        title: '발음 교정 포인트',
        content: pronunciationPoints.length > 0 ? pronunciationPoints : ['발음 교정이 필요한 부분이 없습니다. 잘하고 있어요!'],
      },
      {
        title: '개선이 필요한 영역',
        content: improvementAreas.length > 0 ? improvementAreas : ['특별히 개선이 필요한 영역이 없습니다. 계속 노력하세요!'],
      },
    ],
  };
};

/**
 * Send lesson analysis notification with personalized summary
 */
export const sendLessonAnalysisNotification = async (
  lessonId: string,
  studentId: string,
  lessonDate: Date,
  analysis: LessonAnalysis,
  deliveryTiming: 'immediate' | 'one_hour' | 'next_day' = 'immediate'
): Promise<void> => {
  try {
    // Get student information
    const student = await getUserById(studentId);
    if (!student) {
      throw new Error(`Student not found with ID: ${studentId}`);
    }

    // Generate personalized lesson summary
    const summary = generateLessonSummary(analysis);

    // Format the lesson date
    const formattedDate = lessonDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Prepare notification data
    const notificationData = {
      lessonId,
      lessonDate: formattedDate,
      studentName: student.profile.name,
      summary: JSON.stringify(summary),
    };

    // Determine scheduled time based on delivery timing preference
    let scheduledFor: Date | undefined;
    
    switch (deliveryTiming) {
      case 'one_hour':
        scheduledFor = new Date();
        scheduledFor.setHours(scheduledFor.getHours() + 1);
        break;
      case 'next_day':
        scheduledFor = new Date();
        scheduledFor.setDate(scheduledFor.getDate() + 1);
        scheduledFor.setHours(9, 0, 0, 0); // 9 AM next day
        break;
      case 'immediate':
      default:
        scheduledFor = undefined; // Send immediately
        break;
    }

    // Create and send notification
    await createNotification(
      studentId,
      'lesson_analyzed',
      notificationData,
      scheduledFor
    );
  } catch (error) {
    console.error('Error sending lesson analysis notification:', error);
    throw error;
  }
};

/**
 * Get notification analytics for a user
 */
export const getNotificationAnalytics = async (userId: string): Promise<any> => {
  try {
    const analytics = await Notification.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          read: { $sum: { $cond: ['$isRead', 1, 0] } },
          sent: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        },
      },
    ]);

    return analytics;
  } catch (error) {
    console.error('Error getting notification analytics:', error);
    throw error;
  }
};

/**
 * Initialize notification cron jobs
 */
export const initializeNotificationCronJobs = (): void => {
  // Process scheduled notifications every minute
  schedule('* * * * *', async () => {
    try {
      await processScheduledNotifications();
    } catch (error) {
      console.error('Error in notification cron job:', error);
    }
  });
};

export default {
  createNotification,
  sendPushNotification,
  registerDeviceToken,
  deactivateDeviceToken,
  getUserNotifications,
  markNotificationsAsRead,
  processScheduledNotifications,
  scheduleHomeworkReminder,
  generateLessonSummary,
  sendLessonAnalysisNotification,
  getNotificationAnalytics,
  initializeNotificationCronJobs,
};