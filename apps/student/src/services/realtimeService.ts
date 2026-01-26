import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationHandler {
  onHomeworkAssigned?: (data: any) => void;
  onFeedbackReceived?: (data: any) => void;
  onMessageReceived?: (data: any) => void;
  onGeneralNotification?: (data: any) => void;
}

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private handlers: NotificationHandler = {};

  /**
   * 실시간 알림 구독 시작
   */
  async subscribeToNotifications(userId: string, handlers: NotificationHandler) {
    this.handlers = handlers;

    // 기존 구독 정리
    this.unsubscribeAll();

    try {
      // 알림 테이블 변경 구독
      const notificationChannel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            this.handleNotification(payload.new);
          }
        )
        .subscribe();

      this.channels.set('notifications', notificationChannel);

      // 숙제 배정 구독
      const homeworkChannel = supabase
        .channel(`homework:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'homework_assignments',
            filter: `student_id=eq.${userId}`
          },
          (payload) => {
            if (this.handlers.onHomeworkAssigned) {
              this.handlers.onHomeworkAssigned(payload.new);
            }
            this.showLocalNotification('새로운 숙제', '새로운 숙제가 배정되었습니다.');
          }
        )
        .subscribe();

      this.channels.set('homework', homeworkChannel);

      // 피드백 구독
      const feedbackChannel = supabase
        .channel(`feedback:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'feedback'
          },
          async (payload) => {
            // 피드백이 자신의 제출물에 대한 것인지 확인
            const { data: submission } = await supabase
              .from('homework_submissions')
              .select('student_id')
              .eq('id', payload.new.submission_id)
              .single();

            if (submission?.student_id === userId) {
              if (this.handlers.onFeedbackReceived) {
                this.handlers.onFeedbackReceived(payload.new);
              }
              this.showLocalNotification('AI 피드백 도착', 'AI 분석이 완료되었습니다.');
            }
          }
        )
        .subscribe();

      this.channels.set('feedback', feedbackChannel);

      // 메시지 구독
      const messageChannel = supabase
        .channel(`messages:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${userId}`
          },
          (payload) => {
            if (this.handlers.onMessageReceived) {
              this.handlers.onMessageReceived(payload.new);
            }
            this.showLocalNotification('새 메시지', payload.new.content);
          }
        )
        .subscribe();

      this.channels.set('messages', messageChannel);

      console.log('실시간 알림 구독 시작:', userId);
      return true;
    } catch (error) {
      console.error('실시간 알림 구독 실패:', error);
      return false;
    }
  }

  /**
   * 알림 처리
   */
  private handleNotification(notification: any) {
    const { type, title, message, metadata } = notification;

    // 알림 타입별 처리
    switch (type) {
      case 'homework_assigned':
        if (this.handlers.onHomeworkAssigned) {
          this.handlers.onHomeworkAssigned(metadata);
        }
        break;
      
      case 'feedback_received':
        if (this.handlers.onFeedbackReceived) {
          this.handlers.onFeedbackReceived(metadata);
        }
        break;
      
      case 'message_received':
        if (this.handlers.onMessageReceived) {
          this.handlers.onMessageReceived(metadata);
        }
        break;
      
      default:
        if (this.handlers.onGeneralNotification) {
          this.handlers.onGeneralNotification(notification);
        }
    }

    // 로컬 알림 표시
    this.showLocalNotification(title, message);
  }

  /**
   * 로컬 알림 표시 (React Native)
   */
  private showLocalNotification(title: string, message: string) {
    // React Native의 로컬 알림 라이브러리 사용
    // 예: expo-notifications 또는 react-native-push-notification
    console.log(`[알림] ${title}: ${message}`);
    
    // TODO: 실제 로컬 알림 구현
    // Expo를 사용하는 경우:
    // import * as Notifications from 'expo-notifications';
    // Notifications.scheduleNotificationAsync({
    //   content: {
    //     title,
    //     body: message,
    //   },
    //   trigger: null,
    // });
  }

  /**
   * 특정 채널 구독 해제
   */
  unsubscribeChannel(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * 모든 채널 구독 해제
   */
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('읽지 않은 알림 개수 조회 실패:', error);
      return 0;
    }
  }

  /**
   * 알림을 읽음으로 표시
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      return false;
    }
  }

  /**
   * 모든 알림을 읽음으로 표시
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
const realtimeService = new RealtimeService();
export default realtimeService;