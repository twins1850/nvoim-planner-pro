import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 컴포넌트
import HomeworkCard from '../components/HomeworkCard';

// 타입
import { RootStackParamList } from '../navigation/types';

// API
import { homeworkAPI, notificationAPI } from '../services/supabaseApi';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('학생');
  const [upcomingHomeworks, setUpcomingHomeworks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadUserInfo();
    loadData();
    
    // 화면 포커스 시 데이터 새로고침
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadUserInfo = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo && userInfo !== 'undefined' && userInfo !== 'null') {
        const parsed = JSON.parse(userInfo);
        if (parsed && parsed.profile && parsed.profile.name) {
          setUserName(parsed.profile.name);
        }
      }
    } catch (error) {
      console.error('Failed to load user info', error);
    }
  };


  const loadData = async () => {
    setLoading(true);
    
    try {
      // 숙제 데이터 로드
      const homeworkResponse = await homeworkAPI.getHomeworks();
      if (homeworkResponse.success) {
        const homeworks = homeworkResponse.data || [];
        setUpcomingHomeworks(homeworks.slice(0, 3)); // 최근 3개만 표시
      }
      
      // 알림 데이터 로드
      const notificationResponse = await notificationAPI.getNotifications();
      if (notificationResponse.success) {
        const notifs = notificationResponse.data || [];
        setNotifications(notifs.slice(0, 3)); // 최근 3개만 표시
      }
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleHomeworkPress = (homeworkId: string) => {
    navigation.navigate('HomeworkDetail', { homeworkId });
  };

  const handleNotificationPress = (notificationId: string) => {
    // 알림 읽음 처리
    notificationAPI.markAsRead(notificationId)
      .catch(error => console.error('Failed to mark notification as read', error));
    
    // 알림 타입에 따라 다른 화면으로 이동
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      if (notification.type === 'homework') {
        navigation.navigate('HomeworkDetail', { homeworkId: notification.referenceId });
      } else if (notification.type === 'feedback') {
        navigation.navigate('FeedbackDetail', { feedbackId: notification.referenceId });
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '날짜 없음';
      }
      return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    } catch (error) {
      console.error('Invalid date format:', dateString);
      return '날짜 없음';
    }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요, {userName}님!</Text>
        <Text style={styles.subGreeting}>오늘도 영어 공부 화이팅!</Text>
      </View>


      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>다가오는 숙제</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Main', { screen: 'Homework' })}
          >
            <Text style={styles.seeAllText}>전체보기</Text>
            <Ionicons name="chevron-forward" size={16} color="#4F6CFF" />
          </TouchableOpacity>
        </View>

        {upcomingHomeworks.length > 0 ? (
          upcomingHomeworks.map(homework => (
            <HomeworkCard
              key={homework.id}
              id={homework.id}
              title={homework.title}
              dueDate={homework.dueDate}
              type={homework.type}
              status={homework.status || 'pending'}
              onPress={handleHomeworkPress}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyStateText}>현재 진행 중인 숙제가 없습니다.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 알림</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.seeAllText}>전체보기</Text>
            <Ionicons name="chevron-forward" size={16} color="#4F6CFF" />
          </TouchableOpacity>
        </View>

        {notifications.length > 0 ? (
          notifications.map(notification => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.isRead && styles.unreadNotification
              ]}
              onPress={() => handleNotificationPress(notification.id)}
            >
              <View style={styles.notificationIcon}>
                <Ionicons 
                  name={
                    notification.type === 'homework' ? 'book-outline' :
                    notification.type === 'feedback' ? 'chatbubble-outline' : 'notifications-outline'
                  } 
                  size={24} 
                  color="#4F6CFF" 
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationBody} numberOfLines={2}>
                  {notification.body}
                </Text>
                <Text style={styles.notificationDate}>
                  {formatDate(notification.createdAt)}
                </Text>
              </View>
              {!notification.isRead && (
                <View style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyStateText}>새로운 알림이 없습니다.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#757575',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4F6CFF',
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
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
});

export default HomeScreen;