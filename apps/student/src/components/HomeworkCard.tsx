import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeworkCardProps {
  id: string;
  title: string;
  dueDate: string;
  type: 'audio' | 'text' | 'mixed';
  status: 'pending' | 'submitted' | 'completed' | 'overdue' | 'offline';
  onPress: (id: string) => void;
  isOffline?: boolean;
}

const HomeworkCard: React.FC<HomeworkCardProps> = ({
  id,
  title,
  dueDate,
  type,
  status,
  onPress,
  isOffline = false,
}) => {
  // 상태에 따른 색상 및 아이콘 설정
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return '#FFA500'; // 주황색
      case 'submitted':
        return '#4F6CFF'; // 파란색
      case 'completed':
        return '#4CAF50'; // 녹색
      case 'overdue':
        return '#FF5252'; // 빨간색
      case 'offline':
        return '#9C27B0'; // 보라색
      default:
        return '#757575'; // 회색
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'submitted':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-circle';
      case 'overdue':
        return 'alert-circle';
      case 'offline':
        return 'cloud-offline-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return '진행 중';
      case 'submitted':
        return '제출됨';
      case 'completed':
        return '완료됨';
      case 'overdue':
        return '기한 초과';
      case 'offline':
        return '오프라인';
      default:
        return '알 수 없음';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'audio':
        return 'mic-outline';
      case 'text':
        return 'document-text-outline';
      case 'mixed':
        return 'albums-outline';
      default:
        return 'help-circle-outline';
    }
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

  // 남은 시간 계산
  const getRemainingTime = () => {
    try {
      const now = new Date();
      const due = new Date(dueDate);
      
      if (isNaN(due.getTime())) {
        return null;
      }
      
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return null; // 이미 기한 지남
      } else if (diffDays === 0) {
        // 오늘이 마감일
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        if (diffHours <= 0) {
          return null;
        } else if (diffHours < 24) {
          return `${diffHours}시간 남음`;
        }
      } else if (diffDays === 1) {
        return '내일 마감';
      } else if (diffDays <= 3) {
        return `${diffDays}일 남음`;
      }
      
      return null;
    } catch (error) {
      console.error('Error calculating remaining time:', error);
      return null;
    }
  };

  const remainingTime = getRemainingTime();

  return (
    <TouchableOpacity
      style={[styles.container, isOffline && styles.offlineContainer]}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Ionicons name={getTypeIcon()} size={16} color="#757575" />
          <Text style={styles.typeText}>
            {type === 'audio' ? '음성' : type === 'text' ? '텍스트' : '혼합'}
          </Text>
        </View>
        <View style={[styles.statusContainer, { backgroundColor: getStatusColor() }]}>
          <Ionicons name={getStatusIcon()} size={14} color="#FFFFFF" />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>
      
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      
      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Text style={styles.dueDate}>
            마감일: {formatDate(dueDate)}
          </Text>
          {remainingTime && (
            <View style={styles.remainingTimeContainer}>
              <Ionicons name="alarm-outline" size={12} color="#FF5252" />
              <Text style={styles.remainingTimeText}>{remainingTime}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#757575" />
      </View>
      
      {isOffline && (
        <View style={styles.offlineBadge}>
          <Ionicons name="cloud-offline-outline" size={12} color="#FFFFFF" />
          <Text style={styles.offlineBadgeText}>오프라인</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  offlineContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'column',
  },
  dueDate: {
    fontSize: 12,
    color: '#757575',
  },
  remainingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  remainingTimeText: {
    fontSize: 12,
    color: '#FF5252',
    fontWeight: '500',
    marginLeft: 4,
  },
  offlineBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#9C27B0',
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 2,
  },
});

export default HomeworkCard;