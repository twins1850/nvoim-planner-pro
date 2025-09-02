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

type HomeworkScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface Homework {
  id: string;
  title: string;
  description: string;
  type: 'audio' | 'text' | 'mixed';
  dueDate: string;
  status: 'draft' | 'scheduled' | 'sent' | 'completed';
  assignedStudents: number;
  completedSubmissions: number;
  isPersonalized: boolean;
}

const HomeworkScreen = () => {
  const navigation = useNavigation<HomeworkScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Mock data for homework
  const [homeworkList, setHomeworkList] = useState<Homework[]>([
    {
      id: '1',
      title: '일상 대화 연습',
      description: '카페에서 주문하기 상황을 연습해보세요.',
      type: 'audio',
      dueDate: '2025-07-20',
      status: 'sent',
      assignedStudents: 5,
      completedSubmissions: 2,
      isPersonalized: false,
    },
    {
      id: '2',
      title: '비즈니스 이메일 작성',
      description: '회의 일정 조율을 위한 이메일을 작성해보세요.',
      type: 'text',
      dueDate: '2025-07-18',
      status: 'sent',
      assignedStudents: 3,
      completedSubmissions: 1,
      isPersonalized: true,
    },
    {
      id: '3',
      title: '여행 상황 대화',
      description: '호텔 체크인 상황을 연습해보세요.',
      type: 'mixed',
      dueDate: '2025-07-25',
      status: 'draft',
      assignedStudents: 0,
      completedSubmissions: 0,
      isPersonalized: false,
    },
    {
      id: '4',
      title: '발음 교정 연습',
      description: '오늘 수업에서 배운 발음을 연습해보세요.',
      type: 'audio',
      dueDate: '2025-07-15',
      status: 'completed',
      assignedStudents: 4,
      completedSubmissions: 4,
      isPersonalized: true,
    },
    {
      id: '5',
      title: '문법 연습',
      description: '조동사를 활용한 문장을 작성해보세요.',
      type: 'text',
      dueDate: '2025-07-22',
      status: 'scheduled',
      assignedStudents: 6,
      completedSubmissions: 0,
      isPersonalized: false,
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleCreateHomework = () => {
    navigation.navigate('HomeworkCreate');
  };

  const handleHomeworkPress = (homeworkId: string) => {
    navigation.navigate('HomeworkDetail', { homeworkId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#f39c12';
      case 'scheduled':
        return '#3498db';
      case 'sent':
        return '#9b59b6';
      case 'completed':
        return '#2ecc71';
      default:
        return '#7f8c8d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return '임시저장';
      case 'scheduled':
        return '예약됨';
      case 'sent':
        return '전송됨';
      case 'completed':
        return '완료됨';
      default:
        return '알 수 없음';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return 'microphone';
      case 'text':
        return 'text-box';
      case 'mixed':
        return 'file-multiple';
      default:
        return 'file';
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

  const filteredHomework = homeworkList.filter((homework) => {
    const matchesSearch = homework.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus ? homework.status === filterStatus : true;
    
    return matchesSearch && matchesFilter;
  });

  const renderHomework = ({ item }: { item: Homework }) => (
    <TouchableOpacity
      style={styles.homeworkCard}
      onPress={() => handleHomeworkPress(item.id)}
    >
      <View style={styles.homeworkHeader}>
        <View style={styles.titleContainer}>
          <Icon
            name={getTypeIcon(item.type)}
            size={20}
            color="#4a6da7"
            style={styles.typeIcon}
          />
          <Text style={styles.homeworkTitle}>{item.title}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.homeworkDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.homeworkDetails}>
        <View style={styles.detailItem}>
          <Icon name="calendar" size={16} color="#666666" />
          <Text style={styles.detailText}>마감: {formatDate(item.dueDate)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="account-group" size={16} color="#666666" />
          <Text style={styles.detailText}>
            {item.completedSubmissions}/{item.assignedStudents} 제출
          </Text>
        </View>
      </View>
      {item.isPersonalized && (
        <View style={styles.personalizedBadge}>
          <Icon name="account-check" size={12} color="#ffffff" />
          <Text style={styles.personalizedText}>맞춤형</Text>
        </View>
      )}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleHomeworkPress(item.id)}
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
            placeholder="숙제 제목 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={16} color="#666666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateHomework}
        >
          <Icon name="plus" size={18} color="#ffffff" />
          <Text style={styles.createButtonText}>생성</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollableFilter
          options={[
            { label: '전체', value: null },
            { label: '임시저장', value: 'draft' },
            { label: '예약됨', value: 'scheduled' },
            { label: '전송됨', value: 'sent' },
            { label: '완료됨', value: 'completed' },
          ]}
          selectedValue={filterStatus}
          onSelect={setFilterStatus}
        />
      </View>

      <FlatList
        data={filteredHomework}
        renderItem={renderHomework}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="clipboard-text-search" size={48} color="#cccccc" />
            <Text style={styles.emptyText}>숙제를 찾을 수 없습니다</Text>
            <Text style={styles.emptySubtext}>
              검색어를 변경하거나 필터를 초기화해보세요
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateHomework}
      >
        <Icon name="plus" size={24} color="#ffffff" />
      </TouchableOpacity>
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
    paddingBottom: 80, // Space for FAB
  },
  homeworkCard: {
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
  homeworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    marginRight: 8,
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
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
  homeworkDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  homeworkDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  personalizedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  personalizedText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 2,
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
});

export default HomeworkScreen;