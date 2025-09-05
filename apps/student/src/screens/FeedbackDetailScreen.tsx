import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// 타입
import { RootStackParamList } from '../navigation/types';

// API
import { feedbackAPI } from '../services/supabaseApi';
import { isConnected, getOfflineData, isOfflineMode, setOfflineMode } from '../utils/offlineStorage';

type FeedbackDetailScreenRouteProp = RouteProp<RootStackParamList, 'FeedbackDetail'>;
type FeedbackDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FeedbackDetailScreen = () => {
  const navigation = useNavigation<FeedbackDetailScreenNavigationProp>();
  const route = useRoute<FeedbackDetailScreenRouteProp>();
  const { feedbackId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    loadFeedbackDetail();
  }, [feedbackId]);

  const loadFeedbackDetail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 오프라인 모드 상태 확인
      const offlineModeEnabled = await isOfflineMode();
      setIsOfflineMode(offlineModeEnabled);
      
      // 먼저 캐시된 데이터 확인 (빠른 화면 표시를 위해)
      const cachedFeedbacks = await getOfflineData('feedbacks');
      const cachedFeedback = cachedFeedbacks?.find((fb: any) => fb.id === feedbackId);
      
      // 캐시된 데이터가 있으면 먼저 표시
      if (cachedFeedback) {
        setFeedback(cachedFeedback);
      }
      
      // 네트워크 연결 상태 확인
      const connected = await isConnected();
      
      // 오프라인 모드가 아니고 네트워크 연결이 있는 경우에만 API 호출
      if (connected && !offlineModeEnabled) {
        try {
          // 서버에서 최신 데이터 가져오기 시도
          const response = await feedbackAPI.getFeedbackDetail(feedbackId);
          
          if (response.success) {
            setFeedback(response.data.feedback);
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // API 오류 발생 시 이미 캐시된 데이터를 표시 중이므로 추가 조치 필요 없음
          // 오류 메시지는 캐시된 데이터가 없는 경우에만 표시
          if (!cachedFeedback) {
            setError('피드백 정보를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
          }
          
          // 네트워크 오류 시 자동으로 오프라인 모드로 전환
          await setOfflineMode(true);
          setIsOfflineMode(true);
        }
      } else {
        // 오프라인 모드이거나 네트워크 연결이 없는 경우
        if (!cachedFeedback) {
          // 캐시된 데이터도 없는 경우 오류 메시지 표시
          setError('오프라인 모드에서 피드백 정보를 찾을 수 없습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to load feedback detail:', error);
      setError('피드백 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '날짜 없음';
      }
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
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

  if (error || !feedback) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#D32F2F" />
        <Text style={styles.errorText}>{error || '피드백 정보를 불러올 수 없습니다.'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadFeedbackDetail}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {isOfflineMode && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
            <Text style={styles.offlineBannerText}>오프라인 모드</Text>
          </View>
        )}
        
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{feedback.title}</Text>
            <View style={[
              styles.typeBadge,
              { backgroundColor: feedback.type === 'homework' ? '#4F6CFF' : '#FF9800' }
            ]}>
              <Text style={styles.typeText}>
                {feedback.type === 'homework' ? '숙제' : '수업'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.date}>
            {formatDate(feedback.createdAt)}
          </Text>
        </View>
        
        <View style={styles.scoreSection}>
          <Text style={styles.sectionTitle}>평가 점수</Text>
          
          <View style={styles.scoreContainer}>
            {feedback.scores && (
              <>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>발음</Text>
                  <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(feedback.scores.pronunciation) }]}>
                    <Text style={styles.scoreValue}>{feedback.scores.pronunciation || '-'}</Text>
                  </View>
                </View>
                
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>유창성</Text>
                  <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(feedback.scores.fluency) }]}>
                    <Text style={styles.scoreValue}>{feedback.scores.fluency || '-'}</Text>
                  </View>
                </View>
                
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>정확성</Text>
                  <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(feedback.scores.accuracy) }]}>
                    <Text style={styles.scoreValue}>{feedback.scores.accuracy || '-'}</Text>
                  </View>
                </View>
                
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>종합</Text>
                  <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(feedback.scores.overall) }]}>
                    <Text style={styles.scoreValue}>{feedback.scores.overall || '-'}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
        
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>피드백 내용</Text>
          
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackText}>{feedback.content || '피드백 내용이 없습니다.'}</Text>
          </View>
        </View>
        
        {feedback.strengths && feedback.strengths.length > 0 && (
          <View style={styles.strengthsSection}>
            <Text style={styles.sectionTitle}>잘한 점</Text>
            
            <View style={styles.pointsContainer}>
              {feedback.strengths.map((strength: string, index: number) => (
                <View key={`strength-${index}`} style={styles.pointItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.pointText}>{strength}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {feedback.improvements && feedback.improvements.length > 0 && (
          <View style={styles.improvementsSection}>
            <Text style={styles.sectionTitle}>개선할 점</Text>
            
            <View style={styles.pointsContainer}>
              {feedback.improvements.map((improvement: string, index: number) => (
                <View key={`improvement-${index}`} style={styles.pointItem}>
                  <Ionicons name="alert-circle" size={20} color="#FF9800" />
                  <Text style={styles.pointText}>{improvement}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {feedback.nextSteps && (
          <View style={styles.nextStepsSection}>
            <Text style={styles.sectionTitle}>다음 학습 계획</Text>
            
            <View style={styles.nextStepsContainer}>
              <Text style={styles.nextStepsText}>{feedback.nextSteps}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

// 점수에 따른 색상 반환
const getScoreColor = (score: number) => {
  if (!score) return '#BDBDBD';
  if (score >= 90) return '#4CAF50';
  if (score >= 70) return '#8BC34A';
  if (score >= 50) return '#FFC107';
  return '#FF5722';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  header: {
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
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
    marginRight: 12,
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
  date: {
    fontSize: 14,
    color: '#757575',
  },
  scoreSection: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackSection: {
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
  feedbackContent: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 16,
  },
  feedbackText: {
    fontSize: 16,
    color: '#212121',
    lineHeight: 24,
  },
  strengthsSection: {
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
  pointsContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 16,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pointText: {
    fontSize: 16,
    color: '#212121',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  improvementsSection: {
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
  nextStepsSection: {
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
  nextStepsContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 16,
  },
  nextStepsText: {
    fontSize: 16,
    color: '#212121',
    lineHeight: 24,
  },
});

export default FeedbackDetailScreen;