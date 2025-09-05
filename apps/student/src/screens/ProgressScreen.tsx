import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// API
import { progressAPI } from '../services/supabaseApi';
import { isConnected, getOfflineData, saveOfflineData } from '../utils/offlineStorage';

const ProgressScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const [isOfflineModeActive, setIsOfflineModeActive] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    setLoading(true);
    
    try {
      const connected = await isConnected();
      
      if (connected) {
        // 온라인 모드
        try {
          const response = await progressAPI.getStudentProgress();
          if (response.success && response.data) {
            setProgressData(response.data);
            setIsOfflineModeActive(false);
            
            // 오프라인 사용을 위해 캐시
            await saveOfflineData('progress', response.data);
          } else {
            // API 응답이 없으면 더미 데이터 사용
            setProgressData(generateDummyData());
            setIsOfflineModeActive(false);
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // API 오류 시 캐시된 데이터 사용
          const cachedProgress = await getOfflineData('progress');
          if (cachedProgress) {
            setProgressData(cachedProgress);
            setIsOfflineModeActive(true);
          } else {
            // 캐시된 데이터도 없으면 더미 데이터 사용
            setProgressData(generateDummyData());
            setIsOfflineModeActive(true);
          }
        }
      } else {
        // 오프라인 모드
        setIsOfflineModeActive(true);
        
        // 캐시된 데이터 확인
        const cachedProgress = await getOfflineData('progress');
        if (cachedProgress) {
          setProgressData(cachedProgress);
        } else {
          // 캐시된 데이터가 없으면 더미 데이터 사용
          setProgressData(generateDummyData());
        }
      }
    } catch (error) {
      console.error('Failed to load progress data:', error);
      // 오류 발생 시에도 더미 데이터 사용
      setProgressData(generateDummyData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProgressData();
  };

  // 임시 데이터 생성 (실제 API 응답이 없을 경우)
  const generateDummyData = () => {
    return {
      overall: {
        completedHomeworks: 12,
        totalHomeworks: 15,
        averageScore: 85,
        attendedLessons: 8,
        totalLessons: 10
      },
      skills: {
        speaking: 75,
        listening: 80,
        reading: 90,
        writing: 70,
        vocabulary: 85,
        grammar: 78
      },
      recentSubmissions: [
        {
          id: '1',
          title: '일상 대화 연습',
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          score: 85,
          type: 'audio'
        },
        {
          id: '2',
          title: '여행 관련 어휘',
          submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          score: 90,
          type: 'text'
        },
        {
          id: '3',
          title: '문법 연습 - 시제',
          submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          score: 75,
          type: 'mixed'
        }
      ],
      improvementAreas: [
        '발음 - 특히 th 발음에 주의하세요',
        '과거 시제 사용에 더 주의하세요',
        '듣기 연습을 더 많이 하세요'
      ],
      strengths: [
        '어휘력이 꾸준히 향상되고 있습니다',
        '문장 구조가 점점 더 복잡해지고 있습니다',
        '대화 주제에 적절하게 반응합니다'
      ]
    };
  };

  // 날짜 포맷팅
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
      </View>
    );
  }

  // 데이터가 없으면 더미 데이터 사용
  const data = progressData || generateDummyData();
  
  // 데이터 구조 확인 및 필요한 경우 기본값 설정
  // overall 또는 overallProgress 속성 확인
  const overallData = data.overall || data.overallProgress || {
    completedHomeworks: 0,
    totalHomeworks: 0,
    averageScore: 0,
    attendedLessons: 0,
    totalLessons: 0
  };
  
  // 데이터 구조 통일
  data.overallProgress = overallData;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {isOfflineModeActive && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>오프라인 모드</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <Text style={styles.title}>학습 진도</Text>
      </View>
      
      <View style={styles.overallProgressContainer}>
        <Text style={styles.sectionTitle}>전체 진도</Text>
        
        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>숙제 완료</Text>
            <View style={styles.progressValueContainer}>
              <Text style={styles.progressValue}>
                {data.overallProgress.completedHomeworks}
              </Text>
              <Text style={styles.progressTotal}>
                /{data.overallProgress.totalHomeworks}
              </Text>
            </View>
          </View>
          
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>평균 점수</Text>
            <View style={styles.progressValueContainer}>
              <Text style={styles.progressValue}>
                {data.overallProgress.averageScore}
              </Text>
              <Text style={styles.progressTotal}>/100</Text>
            </View>
          </View>
          
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>수업 참석</Text>
            <View style={styles.progressValueContainer}>
              <Text style={styles.progressValue}>
                {data.overallProgress.attendedLessons}
              </Text>
              <Text style={styles.progressTotal}>
                /{data.overallProgress.totalLessons}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.skillsContainer}>
        <Text style={styles.sectionTitle}>능력별 진도</Text>
        
        <View style={styles.skillRow}>
          <View style={styles.skillItem}>
            <Text style={styles.skillLabel}>말하기</Text>
            <View style={styles.skillBarContainer}>
              <View 
                style={[
                  styles.skillBar, 
                  { width: `${data.skills.speaking}%` }
                ]} 
              />
            </View>
            <Text style={styles.skillValue}>{data.skills.speaking}%</Text>
          </View>
          
          <View style={styles.skillItem}>
            <Text style={styles.skillLabel}>듣기</Text>
            <View style={styles.skillBarContainer}>
              <View 
                style={[
                  styles.skillBar, 
                  { width: `${data.skills.listening}%` }
                ]} 
              />
            </View>
            <Text style={styles.skillValue}>{data.skills.listening}%</Text>
          </View>
          
          <View style={styles.skillItem}>
            <Text style={styles.skillLabel}>읽기</Text>
            <View style={styles.skillBarContainer}>
              <View 
                style={[
                  styles.skillBar, 
                  { width: `${data.skills.reading}%` }
                ]} 
              />
            </View>
            <Text style={styles.skillValue}>{data.skills.reading}%</Text>
          </View>
          
          <View style={styles.skillItem}>
            <Text style={styles.skillLabel}>쓰기</Text>
            <View style={styles.skillBarContainer}>
              <View 
                style={[
                  styles.skillBar, 
                  { width: `${data.skills.writing}%` }
                ]} 
              />
            </View>
            <Text style={styles.skillValue}>{data.skills.writing}%</Text>
          </View>
          
          <View style={styles.skillItem}>
            <Text style={styles.skillLabel}>어휘</Text>
            <View style={styles.skillBarContainer}>
              <View 
                style={[
                  styles.skillBar, 
                  { width: `${data.skills.vocabulary}%` }
                ]} 
              />
            </View>
            <Text style={styles.skillValue}>{data.skills.vocabulary}%</Text>
          </View>
          
          <View style={styles.skillItem}>
            <Text style={styles.skillLabel}>문법</Text>
            <View style={styles.skillBarContainer}>
              <View 
                style={[
                  styles.skillBar, 
                  { width: `${data.skills.grammar}%` }
                ]} 
              />
            </View>
            <Text style={styles.skillValue}>{data.skills.grammar}%</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.submissionsContainer}>
        <Text style={styles.sectionTitle}>최근 제출</Text>
        
        {data.recentSubmissions && data.recentSubmissions.length > 0 ? (
          data.recentSubmissions.map((submission: any) => (
            <View key={submission.id} style={styles.submissionItem}>
              <View style={styles.submissionHeader}>
                <Text style={styles.submissionTitle}>{submission.title}</Text>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreText}>{submission.score}</Text>
                </View>
              </View>
              
              <View style={styles.submissionInfo}>
                <View style={styles.submissionInfoItem}>
                  <Ionicons name="calendar-outline" size={16} color="#757575" />
                  <Text style={styles.submissionInfoText}>
                    {formatDate(submission.submittedAt)}
                  </Text>
                </View>
                
                <View style={styles.submissionInfoItem}>
                  <Ionicons 
                    name={
                      submission.type === 'audio' ? 'mic-outline' : 
                      submission.type === 'text' ? 'document-text-outline' : 'albums-outline'
                    } 
                    size={16} 
                    color="#757575" 
                  />
                  <Text style={styles.submissionInfoText}>
                    {submission.type === 'audio' ? '음성' : 
                     submission.type === 'text' ? '텍스트' : '혼합'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>최근 제출 내역이 없습니다.</Text>
          </View>
        )}
      </View>
      
      <View style={styles.feedbackContainer}>
        <Text style={styles.sectionTitle}>개선할 점</Text>
        
        {data.improvementAreas && data.improvementAreas.length > 0 ? (
          data.improvementAreas.map((area: string, index: number) => (
            <View key={index} style={styles.feedbackItem}>
              <Ionicons name="alert-circle" size={20} color="#FF9800" />
              <Text style={styles.feedbackText}>{area}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>개선할 점이 없습니다.</Text>
          </View>
        )}
      </View>
      
      <View style={styles.feedbackContainer}>
        <Text style={styles.sectionTitle}>잘하는 점</Text>
        
        {data.strengths && data.strengths.length > 0 ? (
          data.strengths.map((strength: string, index: number) => (
            <View key={index} style={styles.feedbackItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.feedbackText}>{strength}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>잘하는 점이 없습니다.</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    padding: 12,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
  },
  overallProgressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
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
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  progressValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F6CFF',
  },
  progressTotal: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 2,
  },
  skillsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skillRow: {
    marginBottom: 8,
  },
  skillItem: {
    marginBottom: 16,
  },
  skillLabel: {
    fontSize: 14,
    color: '#212121',
    marginBottom: 8,
  },
  skillBarContainer: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginBottom: 4,
  },
  skillBar: {
    height: 8,
    backgroundColor: '#4F6CFF',
    borderRadius: 4,
  },
  skillValue: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
  submissionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submissionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 12,
    marginBottom: 12,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
    flex: 1,
  },
  scoreContainer: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F6CFF',
  },
  submissionInfo: {
    flexDirection: 'row',
  },
  submissionInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  submissionInfoText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  feedbackContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 12,
    flex: 1,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
});

export default ProgressScreen;