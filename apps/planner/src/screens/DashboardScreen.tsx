import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

type DashboardScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [refreshing, setRefreshing] = React.useState(false);
  const [dashboardData, setDashboardData] = React.useState({
    totalStudents: 12,
    activeStudents: 10,
    completionRate: 85,
    averageScore: 78,
    studentsRequiringAttention: 2,
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate fetching data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const screenWidth = Dimensions.get('window').width - 40;

  const weeklyData = {
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 50],
        color: (opacity = 1) => `rgba(74, 109, 167, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['주간 활동'],
  };

  const completionData = {
    labels: ['완료', '진행중', '미제출'],
    datasets: [
      {
        data: [85, 10, 5],
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>플래너 대시보드</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => navigation.navigate('FileUpload')}
        >
          <Icon name="upload" size={18} color="#ffffff" />
          <Text style={styles.uploadButtonText}>파일 업로드</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dashboardData.totalStudents}</Text>
          <Text style={styles.statLabel}>전체 학생</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dashboardData.activeStudents}</Text>
          <Text style={styles.statLabel}>활성 학생</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dashboardData.completionRate}%</Text>
          <Text style={styles.statLabel}>완료율</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dashboardData.averageScore}</Text>
          <Text style={styles.statLabel}>평균 점수</Text>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>주간 활동</Text>
        </View>
        <LineChart
          data={weeklyData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>숙제 완료 현황</Text>
        </View>
        <BarChart
          data={completionData}
          width={screenWidth}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(74, 109, 167, ${opacity})`,
          }}
          style={styles.chart}
          fromZero
        />
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>주의가 필요한 학생</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Students')}
          >
            <Text style={styles.seeAllText}>모두 보기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.attentionCard}>
          <View style={styles.attentionStudent}>
            <Icon name="account-alert" size={24} color="#e74c3c" />
            <View style={styles.attentionInfo}>
              <Text style={styles.attentionName}>김민준</Text>
              <Text style={styles.attentionReason}>
                3주 연속 숙제 미제출
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('StudentDetail', { studentId: '1' })}
            >
              <Text style={styles.actionButtonText}>상세</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.attentionStudent}>
            <Icon name="account-alert" size={24} color="#e74c3c" />
            <View style={styles.attentionInfo}>
              <Text style={styles.attentionName}>이서연</Text>
              <Text style={styles.attentionReason}>
                발음 정확도 하락 추세
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('StudentDetail', { studentId: '2' })}
            >
              <Text style={styles.actionButtonText}>상세</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 수업</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Lessons')}
          >
            <Text style={styles.seeAllText}>모두 보기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.lessonCard}>
          <View style={styles.lessonItem}>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>김민준 - 일상 회화</Text>
              <Text style={styles.lessonDate}>2025년 7월 15일</Text>
            </View>
            <View style={styles.lessonStatus}>
              <Text style={[styles.statusText, styles.statusAnalyzed]}>
                분석 완료
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('LessonDetail', { lessonId: '1' })}
              >
                <Text style={styles.actionButtonText}>보기</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.lessonItem}>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>이서연 - 비즈니스 영어</Text>
              <Text style={styles.lessonDate}>2025년 7월 14일</Text>
            </View>
            <View style={styles.lessonStatus}>
              <Text style={[styles.statusText, styles.statusAnalyzed]}>
                분석 완료
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('LessonDetail', { lessonId: '2' })}
              >
                <Text style={styles.actionButtonText}>보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a6da7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  uploadButtonText: {
    color: '#ffffff',
    marginLeft: 4,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
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
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4a6da7',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  attentionCard: {
    backgroundColor: '#ffffff',
  },
  attentionStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attentionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attentionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  attentionReason: {
    fontSize: 14,
    color: '#e74c3c',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#4a6da7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  lessonCard: {
    backgroundColor: '#ffffff',
  },
  lessonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  lessonDate: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  lessonStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  statusAnalyzed: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
});

export default DashboardScreen;