import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

type ReportsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'lessons' | 'homework' | 'progress' | 'custom';
  lastGenerated: string;
  isDefault: boolean;
}

const ReportsScreen = () => {
  const navigation = useNavigation<ReportsScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'analytics'>('analytics');

  // Mock data for reports
  const [reports, setReports] = useState<Report[]>([
    {
      id: '1',
      name: '월간 학생 성과 보고서',
      description: '학생별 월간 성과 및 진도 추적',
      type: 'performance',
      lastGenerated: '2025-07-15',
      isDefault: true,
    },
    {
      id: '2',
      name: '수업 분석 요약',
      description: '수업 참여도 및 발음 정확도 분석',
      type: 'lessons',
      lastGenerated: '2025-07-14',
      isDefault: true,
    },
    {
      id: '3',
      name: '숙제 완료율 보고서',
      description: '학생별 숙제 제출 및 완료율',
      type: 'homework',
      lastGenerated: '2025-07-10',
      isDefault: false,
    },
    {
      id: '4',
      name: '학생 진도 보고서',
      description: '학생별 학습 진도 및 성취도',
      type: 'progress',
      lastGenerated: '2025-07-08',
      isDefault: false,
    },
    {
      id: '5',
      name: '맞춤형 분석 보고서',
      description: '특정 학생 그룹에 대한 맞춤형 분석',
      type: 'custom',
      lastGenerated: '2025-07-05',
      isDefault: false,
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleCreateReport = () => {
    navigation.navigate('ReportCreate');
  };

  const handleReportPress = (reportId: string) => {
    navigation.navigate('ReportDetail', { reportId });
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return 'chart-line';
      case 'lessons':
        return 'book-open-variant';
      case 'homework':
        return 'clipboard-text';
      case 'progress':
        return 'chart-timeline-variant';
      case 'custom':
        return 'chart-box';
      default:
        return 'file-document';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderReport = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => handleReportPress(item.id)}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleContainer}>
          <Icon
            name={getReportIcon(item.type)}
            size={24}
            color="#4a6da7"
            style={styles.reportIcon}
          />
          <Text style={styles.reportTitle}>{item.name}</Text>
        </View>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>기본</Text>
          </View>
        )}
      </View>
      <Text style={styles.reportDescription}>{item.description}</Text>
      <View style={styles.reportFooter}>
        <Text style={styles.lastGeneratedText}>
          마지막 생성: {formatDate(item.lastGenerated)}
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleReportPress(item.id)}
        >
          <Text style={styles.actionButtonText}>보기</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const screenWidth = Dimensions.get('window').width - 40;

  const performanceData = {
    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월'],
    datasets: [
      {
        data: [65, 68, 72, 75, 78, 82, 85],
        color: (opacity = 1) => `rgba(74, 109, 167, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['평균 점수'],
  };

  const completionData = {
    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월'],
    datasets: [
      {
        data: [70, 75, 80, 78, 82, 85, 88],
        color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['숙제 완료율 (%)'],
  };

  const participationData = {
    labels: ['김민준', '이서연', '박지훈', '최수아', '정도윤'],
    datasets: [
      {
        data: [85, 92, 78, 88, 72],
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
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'analytics' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'analytics' && styles.activeTabButtonText,
            ]}
          >
            분석
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'reports' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('reports')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'reports' && styles.activeTabButtonText,
            ]}
          >
            보고서
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'reports' ? (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>보고서</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateReport}
              >
                <Icon name="plus" size={18} color="#ffffff" />
                <Text style={styles.createButtonText}>새 보고서</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="file-document-outline" size={48} color="#cccccc" />
              <Text style={styles.emptyText}>보고서가 없습니다</Text>
              <Text style={styles.emptySubtext}>
                새 보고서를 생성해보세요
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={[]}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.analyticsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>학생 성과 추이</Text>
                  <TouchableOpacity>
                    <Text style={styles.chartAction}>상세 보기</Text>
                  </TouchableOpacity>
                </View>
                <LineChart
                  data={performanceData}
                  width={screenWidth}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              </View>

              <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>숙제 완료율 추이</Text>
                  <TouchableOpacity>
                    <Text style={styles.chartAction}>상세 보기</Text>
                  </TouchableOpacity>
                </View>
                <LineChart
                  data={completionData}
                  width={screenWidth}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>

              <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>학생별 참여도</Text>
                  <TouchableOpacity>
                    <Text style={styles.chartAction}>상세 보기</Text>
                  </TouchableOpacity>
                </View>
                <BarChart
                  data={participationData}
                  width={screenWidth}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
                  }}
                  style={styles.chart}
                  fromZero
                />
              </View>

              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>요약 통계</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>85%</Text>
                    <Text style={styles.summaryLabel}>평균 완료율</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>82</Text>
                    <Text style={styles.summaryLabel}>평균 점수</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>78%</Text>
                    <Text style={styles.summaryLabel}>참여도</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>12</Text>
                    <Text style={styles.summaryLabel}>활성 학생</Text>
                  </View>
                </View>
              </View>
            </View>
          }
        />
      )}

      {activeTab === 'reports' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateReport}
        >
          <Icon name="plus" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a6da7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  createButtonText: {
    color: '#ffffff',
    marginLeft: 4,
    fontWeight: '500',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportIcon: {
    marginRight: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#4a6da7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  reportDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastGeneratedText: {
    fontSize: 12,
    color: '#999999',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4a6da7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  analyticsContainer: {
    padding: 16,
  },
  chartContainer: {
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  chartAction: {
    fontSize: 14,
    color: '#4a6da7',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a6da7',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
});

export default ReportsScreen;