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
import { feedbackAPI } from '../services/supabaseApi';
import { isConnected, getOfflineData, saveOfflineData, isOfflineMode, setOfflineMode } from '../utils/offlineStorage';

type FeedbackScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FeedbackScreen = () => {
  const navigation = useNavigation<FeedbackScreenNavigationProp>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    checkOfflineMode();
    loadFeedbacks();
    
    // 화면 포커스 시 데이터 새로고침
    const unsubscribe = navigation.addListener('focus', () => {
      loadFeedbacks();
    });
    
    return unsubscribe;
  }, [navigation]);

  const checkOfflineMode = async () => {
    const connected = await isConnected();
    setIsOffline(!connected);
  };

  const loadFeedbacks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 오프라인 모드 상태 확인
      const offlineModeEnabled = await isOfflineMode();
      setIsOffline(offlineModeEnabled);
      
      // 네트워크 연결 상태 확인
      const connected = await isConnected();
      
      // 먼저 캐시된 데이터 확인 (빠른 화면 표시를 위해)
      const cachedFeedbacks = await getOfflineData('feedbacks');
      
      // 캐시된 데이터가 있으면 먼저 표시
      if (cachedFeedbacks) {
        setFeedbacks(cachedFeedbacks);
      }
      
      // 오프라인 모드가 아니고 네트워크 연결이 있는 경우에만 API 호출
      if (connected && !offlineModeEnabled) {
        try {
          // 서버에서 최신 데이터 가져오기 시도
          const response = await feedbackAPI.getFeedbacks();
          
          if (response.success) {
            const feedbackData = response.data.feedbacks || [];
            setFeedbacks(feedbackData);
            
            // 오프라인 사용을 위해 캐시 업데이트
            await saveOfflineData('feedbacks', feedbackData);
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // API 오류 발생 시 이미 캐시된 데이터를 표시 중이므로 추가 조치 필요 없음
          // 오류 메시지는 캐시된 데이터가 없는 경우에만 표시
          if (!cachedFeedbacks) {
            setError('피드백을 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
          }
          
          // 네트워크 오류 시 자동으로 오프라인 모드로 전환
          await setOfflineMode(true);
          setIsOffline(true);
        }
      } else {
        // 오프라인 모드이거나 네트워크 연결이 없는 경우
        if (!cachedFeedbacks) {
          // 캐시된 데이터도 없는 경우 오류 메시지 표시
          setError('오프라인 모드에서 피드백 정보를 찾을 수 없습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to load feedbacks:', error);
      setError('피드백을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFeedbacks();
  };

  const handleFeedbackPress = (feedbackId: string) => {
    navigation.navigate('FeedbackDetail', { feedbackId });
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

  const renderFeedbackItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.feedbackItem}
      onPress={() => handleFeedbackPress(item.id)}
    >
      <View style={styles.feedbackHeader}>
        <View style={[
          styles.typeBadge,
          { backgroundColor: item.type === 'homework' ? '#4F6CFF' : '#FF9800' }
        ]}>
          <Text style={styles.typeText}>
            {item.type === 'homework' ? '숙제' : '수업'}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>
      
      <Text style={styles.title}>{item.title}</Text>
      
      <View style={styles.scoreContainer}>
        {item.scores && (
          <>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>발음</Text>
              <Text style={styles.scoreValue}>{item.scores.pronunciation || '-'}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>유창성</Text>
              <Text style={styles.scoreValue}>{item.scores.fluency || '-'}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>정확성</Text>
              <Text style={styles.scoreValue}>{item.scores.accuracy || '-'}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>종합</Text>
              <Text style={[styles.scoreValue, styles.overallScore]}>
                {item.scores.overall || '-'}
              </Text>
            </View>
          </>
        )}
      </View>
      
      <View style={styles.footer}>
        <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>피드백</Text>
      </View>
      
      {isOffline && (
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
            onPress={loadFeedbacks}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={feedbacks}
          renderItem={renderFeedbackItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#BDBDBD" />
              <Text style={styles.emptyText}>피드백이 없습니다.</Text>
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
  feedbackItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#757575',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  overallScore: {
    color: '#4F6CFF',
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: 12,
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

export default FeedbackScreen;