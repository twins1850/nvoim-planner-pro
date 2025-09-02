import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type LessonsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface Lesson {
  id: string;
  studentName: string;
  lessonType: string;
  date: string;
  status: 'uploaded' | 'extracting' | 'extracted' | 'analyzing' | 'analyzed' | 'completed' | 'failed';
  participationScore?: number;
  pronunciationScore?: number;
}

const LessonsScreen = () => {
  const navigation = useNavigation<LessonsScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Mock data for lessons
  const [lessons, setLessons] = useState<Lesson[]>([
    {
      id: '1',
      studentName: '김민준',
      lessonType: '일상 회화',
      date: '2025-07-15',
      status: 'completed',
      participationScore: 85,
      pronunciationScore: 78,
    },
    {
      id: '2',
      studentName: '이서연',
      lessonType: '비즈니스 영어',
      date: '2025-07-14',
      status: 'completed',
      participationScore: 92,
      pronunciationScore: 88,
    },
    {
      id: '3',
      studentName: '박지훈',
      lessonType: '여행 영어',
      date: '2025-07-13',
      status: 'analyzing',
    },
    {
      id: '4',
      studentName: '최수아',
      lessonType: '일상 회화',
      date: '2025-07-12',
      status: 'extracting',
    },
    {
      id: '5',
      studentName: '정도윤',
      lessonType: '비즈니스 영어',
      date: '2025-07-11',
      status: 'failed',
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleUpload = () => {
    navigation.navigate('FileUpload');
  };

  const handleLessonPress = (lessonId: string) => {
    navigation.navigate('LessonDetail', { lessonId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return '#f39c12';
      case 'extracting':
        return '#3498db';
      case 'extracted':
        return '#9b59b6';
      case 'analyzing':
        return '#9b59b6';
      case 'analyzed':
        return '#2ecc71';
      case 'completed':
        return '#27ae60';
      case 'failed':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return '업로드됨';
      case 'extracting':
        return '음성 추출 중';
      case 'extracted':
        return '음성 추출 완료';
      case 'analyzing':
        return '분석 중';
      case 'analyzed':
        return '분석 완료';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      default:
        return '알 수 없음';
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

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.lessonType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus ? lesson.status === filterStatus : true;
    
    return matchesSearch && matchesFilter;
  });

  const renderLesson = ({ item }: { item: Lesson }) => (
    <TouchableOpacity
      style={styles.lessonCard}
      onPress={() => handleLessonPress(item.id)}
    >
      <View style={styles.lessonHeader}>
        <Text style={styles.studentName}>{item.studentName}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <View style={styles.lessonDetails}>
        <Text style={styles.lessonType}>{item.lessonType}</Text>
        <Text style={styles.lessonDate}>{formatDate(item.date)}</Text>
      </View>
      {(item.status === 'completed' || item.status === 'analyzed') && (
        <View style={styles.scoreContainer}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>참여도</Text>
            <Text style={styles.scoreValue}>{item.participationScore}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>발음</Text>
            <Text style={styles.scoreValue}>{item.pronunciationScore}</Text>
          </View>
        </View>
      )}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLessonPress(item.id)}
        >
          <Text style={styles.actionButtonText}>상세 보기</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#666666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="학생 이름 또는 수업 유형 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={16} color="#666666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
          <Icon name="upload" size={18} color="#ffffff" />
          <Text style={styles.uploadButtonText}>업로드</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollableFilter
          options={[
            { label: '전체', value: null },
            { label: '업로드됨', value: 'uploaded' },
            { label: '음성 추출 중', value: 'extracting' },
            { label: '음성 추출 완료', value: 'extracted' },
            { label: '분석 중', value: 'analyzing' },
            { label: '분석 완료', value: 'analyzed' },
            { label: '완료', value: 'completed' },
            { label: '실패', value: 'failed' },
          ]}
          selectedValue={filterStatus}
          onSelect={setFilterStatus}
        />
      </View>

      <FlatList
        data={filteredLessons}
        renderItem={renderLesson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-search" size={48} color="#cccccc" />
            <Text style={styles.emptyText}>수업을 찾을 수 없습니다</Text>
            <Text style={styles.emptySubtext}>
              검색어를 변경하거나 필터를 초기화해보세요
            </Text>
          </View>
        }
      />
    </View>
  );
};

interface FilterOption {
  label: string;
  value: string | null;
}

interface ScrollableFilterProps {
  options: FilterOption[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
}

const ScrollableFilter = ({
  options,
  selectedValue,
  onSelect,
}: ScrollableFilterProps) => {
  return (
    <FlatList
      horizontal
      data={options}
      keyExtractor={(item) => item.label}
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.filterOption,
            item.value === selectedValue && styles.filterOptionSelected,
          ]}
          onPress={() => onSelect(item.value)}
        >
          <Text
            style={[
              styles.filterOptionText,
              item.value === selectedValue && styles.filterOptionTextSelected,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.filterList}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
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
  filterContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterList: {
    paddingHorizontal: 12,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#4a6da7',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#666666',
  },
  filterOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  lessonCard: {
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
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
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
  lessonDetails: {
    marginBottom: 12,
  },
  lessonType: {
    fontSize: 14,
    color: '#666666',
  },
  lessonDate: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  scoreContainer: {
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
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
});

export default LessonsScreen;