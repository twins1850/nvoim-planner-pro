import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// 타입
import { RootStackParamList } from '../navigation/types';

// API
import { notificationAPI } from '../services/supabaseApi';
import { isConnected, getOfflineData, saveOfflineData } from '../utils/offlineStorage';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    checkOfflineMode();
    loadNotifications();
  }, []);

  const checkOfflineMode = async () => {
    const connected = await isConnected();
    setIsOfflineMode(!connected);
  };

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const connected = await isConnected();
      
      if (connected && !isOfflineMode) {
        // 온라인 모드
        try {
          const response = await notificationAPI.getNotifications();
          if (response.success) {
            const notificationData = (response.data as any).notifications || response.data || [];
            setNotifications(notificationData);
            
            // 오프라인 사용을 위해 캐시
            await saveOfflineData('notifications', notificationData);
          } else {
            setError('알림을 불러오는데 실패했습니다.');
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // API 오류 시 캐시된 데이터 사용
          const cachedNotifications = await getOfflineData('notifications');
          if (cachedNotifications) {
            setNotifications(cachedNotifications);
          } else {
            setError('알림을 불러올 수 없습니다.');
          }
        }
      } else {
        // 오프라인 모드
        const cachedNotifications = await getOfflineData('notifications');
        if (cachedNotifications) {
          setNotifications(cachedNotifications);
        } else {
          setError('오프라인 모드에서 알림 정보를 찾을 수 없습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('알림을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = (notification: any) => {
    // 알림 읽음 처리
    notificationAPI.markAsRead(notification.id)
      .catch(error => console.error('Failed to mark notification as read', error));
    
    // 알림 타입에 따라 다른 화면으로 이동
    if (notification.type === 'homework') {
      navigation.navigate('HomeworkDetail', { homeworkId: notification.referenceId });
    } else if (notification.type === 'feedback') {
      navigation.navigate('FeedbackDetail', { feedbackId: notification.referenceId });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return '날짜 없음';
      }
      
      // 오늘 날짜인 경우 시간만 표시
      if (date.toDateString() === now.toDateString()) {
        return `오늘 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      
      // 어제 날짜인 경우
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return '어제';
      }
      
      // 일주일 이내인 경우 요일 표시
      const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        return `${weekDays[date.getDay()]}요일`;
      }
      
      // 그 외의 경우 날짜 표시
      return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    } catch (error) {
      console.error('Invalid date format:', dateString);
      return '날짜 없음';
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons 
          name={
            item.type === 'homework' ? 'book-outline' :
            item.type === 'feedback' ? 'chatbubble-outline' : 'notifications-outline'
          } 
          size={24} 
          color="#4F6CFF" 
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notificationDate}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      {!item.isRead && (
        <View style={styles.unreadDot} />
      )}
    </TouchableOpacity>
  );

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    try {
      const connected = await isConnected();
      
      if (connected && !isOfflineMode) {
        // 온라인 모드
        try {
          // API 호출 (실제 구현 시 적절한 엔드포인트로 변경)
          await (notificationAPI as any).markAllAsRead?.();
          
          // 로컬 상태 업데이트
          const updatedNotifications = notifications.map(notification => ({
            ...notification,
            isRead: true
          }));
          
          setNotifications(updatedNotifications);
          await saveOfflineData('notifications', updatedNotifications);
        } catch (apiError) {
          console.error('API error:', apiError);
          Alert.alert('오류', '알림 읽음 처리 중 오류가 발생했습니다.');
        }
      } else {
        // 오프라인 모드
        Alert.alert('오프라인 모드', '인터넷 연결 시 알림을 읽음 처리할 수 있습니다.');
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      Alert.alert('오류', '알림 읽음 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>알림</Text>
        {notifications.length > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>모두 읽음</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {isOfflineMode && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>오프라인 모드</Text>
        </View>
      )}
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#D32F2F" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadNotifications}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#BDBDBD" />
              <Text style={styles.emptyText}>새로운 알림이 없습니다.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  markAllText: {
    fontSize: 14,
    color: '#4F6CFF',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    padding: 12,
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F0F4FF',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  notificationDate: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F6CFF',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4F6CFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
  },
});

export default NotificationsScreen;