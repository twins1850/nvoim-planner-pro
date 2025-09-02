import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

type LessonDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'LessonDetail'
>;

type LessonDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'LessonDetail'
>;

interface LessonDetailScreenProps {
  route: LessonDetailScreenRouteProp;
  navigation: LessonDetailScreenNavigationProp;
}

interface SpeakerSegment {
  speaker: 'teacher' | 'student';
  startTime: number;
  endTime: number;
  transcript: string;
  confidence: number;
}

const LessonDetailScreen = ({ route, navigation }: LessonDetailScreenProps) => {
  const { lessonId } = route.params;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'insights'>('overview');

  // Mock lesson data
  const [lesson, setLesson] = useState({
    id: lessonId,
    studentName: lessonId === '1' ? '김민준' : '이서연',
    lessonType: lessonId === '1' ? '일상 회화' : '비즈니스 영어',
    lessonDate: '2025-07-15',
    duration: 45, // minutes
    status: 'completed',
    metrics: {
      participationScore: lessonId === '1' ? 85 : 92,
      pronunciationAccuracy: lessonId === '1' ? 78 : 88,
      fluencyScore: lessonId === '1' ? 82 : 90,
      grammarAccuracy: lessonId === '1' ? 75 : 85,
      vocabularyUsage: lessonId === '1' ? 80 : 87,
    },
    speakerSegments: [
      {
        speaker: 'teacher',
        startTime: 0,
        endTime: 15.5,
        transcript: 'Hello, how are you today? Did you have a good weekend?',
        confidence: 0.95,
      },
      {
        speaker: 'student',
        startTime: 16.2,
        endTime: 25.8,
        transcript: 'I\'m good, thank you. Yes, I had a great weekend. I went to the park with my family.',
        confidence: 0.88,
      },
      {
        speaker: 'teacher',
        startTime: 26.5,
        endTime: 40.2,
        transcript: 'That sounds wonderful! What did you do at the park? Did you have a picnic?',
        confidence: 0.92,
      },
      {
        speaker: 'student',
        startTime: 41.0,
        endTime: 58.3,
        transcript: 'Yes, we had a picnic. We also played frisbee and walked around the lake. The weather was very nice.',
        confidence: 0.85,
      },
    ] as SpeakerSegment[],
    insights: {
      strengths: [
        '자연스러운 대화 흐름 유지',
        '기본 문법 구조 정확히 사용',
        '일상 관련 어휘 적절히 활용',
      ],
      improvementAreas: [
        '과거 시제 사용 시 불규칙 동사 형태 오류',
        '특정 자음 발음 (th, r) 정확도 향상 필요',
        '대화 중 자신감 있는 표현 부족',
      ],
      keyExpressions: [
        'I had a great weekend',
        'We had a picnic',
        'The weather was very nice',
      ],
      pronunciationPoints: [
        'th 발음 - "thank you" 발음 시 정확도 향상 필요',
        'r 발음 - "around" 발음 시 정확도 향상 필요',
      ],
      homeworkSuggestions: [
        '불규칙 동사 과거형 연습',
        'th, r 발음이 포함된 단어 반복 연습',
        '주말 활동 관련 추가 어휘 학습',
      ],
    },
  });

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const screenWidth = Dimensions.get('window').width - 40;

  const metricsData = {
    labels: ['참여도', '발음', '유창성', '문법', '어휘'],
    datasets: [
      {
        data: [
          lesson.metrics.participationScore,
          lesson.metrics.pronunciationAccuracy,
          lesson.metrics.fluencyScore,
          lesson.metrics.grammarAccuracy,
          lesson.metrics.vocabularyUsage,
        ],
      },
    ],
  };

  const speakingTimeData = {
    labels: ['교사', '학생'],
    datasets: [
      {
        data: [60, 40], // Percentage of speaking time
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(74, 109, 167, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>수업 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.studentName}>{lesson.studentName}</Text>
          <Text style={styles.lessonType}>{lesson.lessonType}</Text>
          <Text style={styles.lessonDate}>{lesson.lessonDate}</Text>
        </View>
        <TouchableOpacity
          style={styles.homeworkButton}
          onPress={() => navigation.navigate('HomeworkCreate')}
        >
          <Icon name="clipboard-text" size={16} color="#ffffff" />
          <Text style={styles.homeworkButtonText}>숙제 생성</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'overview' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('overview')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'overview' && styles.activeTabButtonText,
            ]}
          >
            개요
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'transcript' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('transcript')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'transcript' && styles.activeTabButtonText,
            ]}
          >
            대화 내용
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'insights' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('insights')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'insights' && styles.activeTabButtonText,
            ]}
          >
            인사이트
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'overview' && (
          <View>
            <View style={styles.metricsContainer}>
              <Text style={styles.sectionTitle}>성과 지표</Text>
              <BarChart
                data={metricsData}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                fromZero
                yAxisSuffix="%"
              />
            </View>

            <View style={styles.speakingTimeContainer}>
              <Text style={styles.sectionTitle}>발화 시간 분포</Text>
              <BarChart
                data={speakingTimeData}
                width={screenWidth}
                height={180}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                }}
                style={styles.chart}
                fromZero
                yAxisSuffix="%"
              />
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.sectionTitle}>수업 요약</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>총 수업 시간</Text>
                <Text style={styles.summaryValue}>{lesson.duration}분</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>학생 발화 시간</Text>
                <Text style={styles.summaryValue}>
                  {Math.round(lesson.duration * 0.4)}분
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>교사 발화 시간</Text>
                <Text style={styles.summaryValue}>
                  {Math.round(lesson.duration * 0.6)}분
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>총 대화 턴</Text>
                <Text style={styles.summaryValue}>
                  {lesson.speakerSegments.length}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'transcript' && (
          <View style={styles.transcriptContainer}>
            <Text style={styles.sectionTitle}>대화 내용</Text>
            {lesson.speakerSegments.map((segment, index) => (
              <View
                key={index}
                style={[
                  styles.transcriptItem,
                  segment.speaker === 'teacher'
                    ? styles.teacherSegment
                    : styles.studentSegment,
                ]}
              >
                <View style={styles.transcriptHeader}>
                  <Text style={styles.speakerLabel}>
                    {segment.speaker === 'teacher' ? '교사' : '학생'}
                  </Text>
                  <Text style={styles.timeLabel}>
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                  </Text>
                </View>
                <Text style={styles.transcriptText}>{segment.transcript}</Text>
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceLabel}>
                    정확도: {Math.round(segment.confidence * 100)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'insights' && (
          <View>
            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>강점</Text>
              {lesson.insights.strengths.map((strength, index) => (
                <View key={index} style={styles.insightItem}>
                  <Icon name="check-circle" size={16} color="#27ae60" />
                  <Text style={styles.insightText}>{strength}</Text>
                </View>
              ))}
            </View>

            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>개선 영역</Text>
              {lesson.insights.improvementAreas.map((area, index) => (
                <View key={index} style={styles.insightItem}>
                  <Icon name="alert-circle" size={16} color="#e74c3c" />
                  <Text style={styles.insightText}>{area}</Text>
                </View>
              ))}
            </View>

            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>오늘 배운 주요 표현</Text>
              {lesson.insights.keyExpressions.map((expression, index) => (
                <View key={index} style={styles.insightItem}>
                  <Icon name="lightbulb-on" size={16} color="#f39c12" />
                  <Text style={styles.insightText}>{expression}</Text>
                </View>
              ))}
            </View>

            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>발음 교정 포인트</Text>
              {lesson.insights.pronunciationPoints.map((point, index) => (
                <View key={index} style={styles.insightItem}>
                  <Icon name="microphone" size={16} color="#9b59b6" />
                  <Text style={styles.insightText}>{point}</Text>
                </View>
              ))}
            </View>

            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>숙제 연결 내용</Text>
              {lesson.insights.homeworkSuggestions.map((suggestion, index) => (
                <View key={index} style={styles.insightItem}>
                  <Icon name="clipboard-text" size={16} color="#3498db" />
                  <Text style={styles.insightText}>{suggestion}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  lessonType: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  lessonDate: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  homeworkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a6da7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  homeworkButtonText: {
    color: '#ffffff',
    marginLeft: 4,
    fontWeight: '500',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4a6da7',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabButtonText: {
    color: '#4a6da7',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  metricsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  speakingTimeContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a6da7',
  },
  transcriptContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transcriptItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  teacherSegment: {
    backgroundColor: '#f0f4f8',
    borderLeftWidth: 4,
    borderLeftColor: '#4a6da7',
  },
  studentSegment: {
    backgroundColor: '#f9f4f8',
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  speakerLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
  },
  timeLabel: {
    fontSize: 12,
    color: '#999999',
  },
  transcriptText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  confidenceContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  confidenceLabel: {
    fontSize: 10,
    color: '#999999',
  },
  insightsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  insightText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
    flex: 1,
  },
});

export default LessonDetailScreen;