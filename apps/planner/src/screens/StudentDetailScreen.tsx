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
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

type StudentDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'StudentDetail'
>;

type StudentDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'StudentDetail'
>;

interface StudentDetailScreenProps {
  route: StudentDetailScreenRouteProp;
  navigation: StudentDetailScreenNavigationProp;
}

const StudentDetailScreen = ({ route, navigation }: StudentDetailScreenProps) => {
  const { studentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'lessons' | 'homework'>('overview');

  // Mock student data
  const [student, setStudent] = useState({
    id: studentId,
    name: studentId === '1' ? '김민준' : '이서연',
    email: studentId === '1' ? 'minjun.kim@example.com' : 'seoyeon.lee@example.com',
    learningLevel: studentId === '1' ? 'intermediate' : 'advanced',
    lastActivity: '2025-07-15',
    completedHomework: studentId === '1' ? 8 : 12,
    totalHomework: studentId === '1' ? 10 : 12,
    averageScore: studentId === '1' ? 85 : 92,
    requiresAttention: true,
    attentionReason: studentId === '1' ? '3주 연속 숙제 미제출' : '발음 정확도 하락 추세',
    joinDate: '2025-01-15',
    progressData: {
      weeks: ['1주', '2주', '3주', '4주', '5주', '6주', '7주', '8주'],
      scores: studentId === '1' 
        ? [75, 78, 82, 80, 85, 83, 85, 85] 
        : [85, 87, 90, 88, 92, 90, 92, 92],
    },
    recentLessons: [
      {
        id: '1',
        date: '2025-07-15',
        type: studentId === '1' ? '일상 회화' : '비즈니스 영어',
        participationScore: studentId === '1' ? 85 : 92,
        pronunciationScore: studentId === '1' ? 78 : 88,
      },
      {
        id: '2',
        date: '2025-07-08',
        type: studentId === '1' ? '일상 회화' : '비즈니스 영어',
        participationScore: studentId === '1' ? 82 : 90,
        pronunciationScore: studentId === '1' ? 75 : 85,
      },
      {
        id: '3',
        date: '2025-07-01',
        type: studentId === '1' ? '일상 회화' : '비즈니스 영어',
        participationScore: studentId === '1' ? 80 : 88,
        pronunciationScore: studentId === '1' ? 72 : 82,
      },
    ],
    recentHomework: [
      {
        id: '1',
        title: studentId === '1' ? '일상 대화 연습' : '비즈니스 이메일 작성',
        dueDate: '2025-07-20',
        status: 'sent',
        isCompleted: false,
      },
      {
        id: '2',
        title: studentId === '1' ? '발음 교정 연습' : '회의 대화 연습',
        dueDate: '2025-07-15',
        status: 'completed',
        isCompleted: true,
        score: studentId === '1' ? 85 : 92,
      },
      {
        id: '3',
        title: studentId === '1' ? '문법 연습' : '프레젠테이션 스크립트 작성',
        dueDate: '2025-07-10',
        status: 'completed',
        isCompleted: true,
        score: studentId === '1' ? 82 : 90,
      },
    ],
    improvementAreas: [
      studentId === '1' ? '과거 시제 사용 시 불규칙 동사 형태 오류' : '비즈니스 용어 활용 확장 필요',
      studentId === '1' ? '특정 자음 발음 (th, r) 정확도 향상 필요' : '복잡한 문장 구조 사용 시 어순 오류',
      studentId === '1' ? '대화 중 자신감 있는 표현 부족' : '발표 시 자연스러운 강세와 억양 개선 필요',
    ],
    strengths: [
      studentId === '1' ? '자연스러운 대화 흐름 유지' : '풍부한 어휘력과 표현 구사',
      studentId === '1' ? '기본 문법 구조 정확히 사용' : '복잡한 주제에 대한 의견 표현 능력',
      studentId === '1' ? '일상 관련 어휘 적절히 활용' : '논리적인 구조로 대화 전개',
    ],
  });

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const screenWidth = Dimensions.get('window').width - 40;

  const progressData = {
    labels: student.progressData.weeks,
    datasets: [
      {
        data: student.progressData.scores,
        color: (opacity = 1) => `rgba(74, 109, 167, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['주간 점수'],
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return '#3498db';
      case 'intermediate':
        return '#f39c12';
      case 'advanced':
        return '#9b59b6';
      default:
        return '#7f8c8d';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner':
        return '초급';
      case 'intermediate':
        return '중급';
      case 'advanced':
        return '고급';
      default:
        return '알 수 없음';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>학생 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.studentName}>{student.name}</Text>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: getLevelColor(student.learningLevel) },
              ]}
            >
              <Text style={styles.levelText}>
                {getLevelText(student.learningLevel)}
              </Text>
            </View>
          </View>
          <Text style={styles.studentEmail}>{student.email}</Text>
          <Text style={styles.joinDate}>가입일: {formatDate(student.joinDate)}</Text>
        </View>
        <TouchableOpacity
          style={styles.homeworkButton}
          onPress={() => navigation.navigate('HomeworkCreate')}
        >
          <Icon name="clipboard-text" size={16} color="#ffffff" />
          <Text style={styles.homeworkButtonText}>숙제 배정</Text>
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
            activeTab === 'lessons' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('lessons')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'lessons' && styles.activeTabButtonText,
            ]}
          >
            수업
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'homework' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('homework')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'homework' && styles.activeTabButtonText,
            ]}
          >
            숙제
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'overview' && (
          <View>
            {student.requiresAttention && (
              <View style={styles.attentionContainer}>
                <Icon name="alert-circle" size={20} color="#e74c3c" />
                <Text style={styles.attentionText}>{student.attentionReason}</Text>
              </View>
            )}

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{student.averageScore}</Text>
                <Text style={styles.statLabel}>평균 점수</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {student.completedHomework}/{student.totalHomework}
                </Text>
                <Text style={styles.statLabel}>숙제 완료</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {Math.round((student.completedHomework / student.totalHomework) * 100)}%
                </Text>
                <Text style={styles.statLabel}>완료율</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {student.recentLessons.length}
                </Text>
                <Text style={styles.statLabel}>최근 수업</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <Text style={styles.sectionTitle}>학습 진도</Text>
              <LineChart
                data={progressData}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>

            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>강점</Text>
              {student.strengths.map((strength, index) => (
                <View key={index} style={styles.insightItem}>
                  <Icon name="check-circle" size={16} color="#27ae60" />
                  <Text style={styles.insightText}>{strength}</Text>
                </View>
              ))}
            </View>

            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>개선 영역</Text>
              {student.improvementAreas.map((area, index) => (
                <View key={index} style={styles.insightItem}>
                  <Icon name="alert-circle" size={16} color="#e74c3c" />
                  <Text style={styles.insightText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'lessons' && (
          <View style={styles.lessonsContainer}>
            <Text style={styles.sectionTitle}>최근 수업</Text>
            {student.recentLessons.map((lesson, index) => (
              <TouchableOpacity
                key={index}
                style={styles.lessonItem}
                onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id })}
              >
                <View style={styles.lessonHeader}>
                  <Text style={styles.lessonTitle}>{lesson.type}</Text>
                  <Text style={styles.lessonDate}>{formatDate(lesson.date)}</Text>
                </View>
                <View style={styles.lessonScores}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>참여도</Text>
                    <Text style={styles.scoreValue}>{lesson.participationScore}</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>발음</Text>
                    <Text style={styles.scoreValue}>{lesson.pronunciationScore}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id })}
                >
                  <Text style={styles.viewButtonText}>상세 보기</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'homework' && (
          <View style={styles.homeworkContainer}>
            <Text style={styles.sectionTitle}>숙제</Text>
            {student.recentHomework.map((homework, index) => (
              <TouchableOpacity
                key={index}
                style={styles.homeworkItem}
                onPress={() => navigation.navigate('HomeworkDetail', { homeworkId: homework.id })}
              >
                <View style={styles.homeworkHeader}>
                  <Text style={styles.homeworkTitle}>{homework.title}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: homework.isCompleted
                          ? '#27ae60'
                          : '#f39c12',
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {homework.isCompleted ? '완료' : '진행 중'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.homeworkDueDate}>
                  마감일: {formatDate(homework.dueDate)}
                </Text>
                {homework.isCompleted && homework.score && (
                  <View style={styles.homeworkScore}>
                    <Text style={styles.scoreLabel}>점수</Text>
                    <Text style={styles.scoreValue}>{homework.score}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('HomeworkDetail', { homeworkId: homework.id })}
                >
                  <Text style={styles.viewButtonText}>상세 보기</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginRight: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  studentEmail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  joinDate: {
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
  attentionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  attentionText: {
    fontSize: 14,
    color: '#e74c3c',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a6da7',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  progressContainer: {
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
  lessonsContainer: {
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
  lessonItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  lessonDate: {
    fontSize: 12,
    color: '#999999',
  },
  lessonScores: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666666',
    marginRight: 4,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a6da7',
  },
  viewButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#4a6da7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  homeworkContainer: {
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
  homeworkItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  homeworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  homeworkDueDate: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 8,
  },
  homeworkScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
});

export default StudentDetailScreen;