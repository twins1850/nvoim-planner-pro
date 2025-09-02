import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type StudentsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  learningLevel: 'beginner' | 'intermediate' | 'advanced';
  lastActivity: string;
  completedHomework: number;
  totalHomework: number;
  averageScore: number;
  requiresAttention: boolean;
  attentionReason?: string;
}

const StudentsScreen = () => {
  const navigation = useNavigation<StudentsScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string | null>(null);

  // Mock data for students
  const [students, setStudents] = useState<Student[]>([
    {
      id: '1',
      name: '김민준',
      email: 'minjun.kim@example.com',
      learningLevel: 'intermediate',
      lastActivity: '2025-07-15',
      completedHomework: 8,
      totalHomework: 10,
      averageScore: 85,
      requiresAttention: true,
      attentionReason: '3주 연속 숙제 미제출',
    },
    {
      id: '2',
      name: '이서연',
      email: 'seoyeon.lee@example.com',
      learningLevel: 'advanced',
      lastActivity: '2025-07-16',
      completedHomework: 12,
      totalHomework: 12,
      averageScore: 92,
      requiresAttention: true,
      attentionReason: '발음 정확도 하락 추세',
    },
    {
      id: '3',
      name: '박지훈',
      email: 'jihoon.park@example.com',
      learningLevel: 'beginner',
      lastActivity: '2025-07-14',
      completedHomework: 5,
      totalHomework: 10,
      averageScore: 78,
      requiresAttention: false,
    },
    {
      id: '4',
      name: '최수아',
      email: 'sua.choi@example.com',
      learningLevel: 'intermediate',
      lastActivity: '2025-07-13',
      completedHomework: 9,
      totalHomework: 10,
      averageScore: 88,
      requiresAttention: false,
    },
    {
      id: '5',
      name: '정도윤',
      email: 'doyoon.jung@example.com',
      learningLevel: 'beginner',
      lastActivity: '2025-07-10',
      completedHomework: 6,
      totalHomework: 10,
      averageScore: 72,
      requiresAttention: false,
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleStudentPress = (studentId: string) => {
    navigation.navigate('StudentDetail', { studentId });
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name.charAt(0);
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterLevel ? student.learningLevel === filterLevel : true;
    
    return matchesSearch && matchesFilter;
  });

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => handleStudentPress(item.id)}
    >
      <View style={styles.studentHeader}>
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: getLevelColor(item.learningLevel) },
              ]}
            >
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
          )}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentEmail}>{item.email}</Text>
          </View>
        </View>
        <View
          style={[
            styles.levelBadge,
            { backgroundColor: getLevelColor(item.learningLevel) },
          ]}
        >
          <Text style={styles.levelText}>
            {getLevelText(item.learningLevel)}
          </Text>
        </View>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>최근 활동</Text>
          <Text style={styles.statValue}>{formatDate(item.lastActivity)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>숙제 완료</Text>
          <Text style={styles.statValue}>
            {item.completedHomework}/{item.totalHomework}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>평균 점수</Text>
          <Text style={styles.statValue}>{item.averageScore}</Text>
        </View>
      </View>
      {item.requiresAttention && (
        <View style={styles.attentionContainer}>
          <Icon name="alert-circle" size={16} color="#e74c3c" />
          <Text style={styles.attentionText}>{item.attentionReason}</Text>
        </View>
      )}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleStudentPress(item.id)}
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
            placeholder="학생 이름 또는 이메일 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={16} color="#666666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollableFilter
          options={[
            { label: '전체', value: null },
            { label: '초급', value: 'beginner' },
            { label: '중급', value: 'intermediate' },
            { label: '고급', value: 'advanced' },
            { label: '주의 필요', value: 'attention' },
          ]}
          selectedValue={filterLevel}
          onSelect={(value) => {
            if (value === 'attention') {
              // Filter by attention in the component
              setFilterLevel(null);
              // We'll filter the students in the render method
            } else {
              setFilterLevel(value);
            }
          }}
        />
      </View>

      <FlatList
        data={
          filterLevel === 'attention'
            ? filteredStudents.filter((s) => s.requiresAttention)
            : filteredStudents
        }
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-search" size={48} color="#cccccc" />
            <Text style={styles.emptyText}>학생을 찾을 수 없습니다</Text>
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
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
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
  studentCard: {
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
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  studentInfo: {
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  studentEmail: {
    fontSize: 12,
    color: '#666666',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a6da7',
  },
  attentionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  attentionText: {
    fontSize: 12,
    color: '#e74c3c',
    marginLeft: 4,
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

export default StudentsScreen;