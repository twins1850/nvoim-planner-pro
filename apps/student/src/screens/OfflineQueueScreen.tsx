import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// 유틸리티
import {
  getOfflineQueue,
  getOfflineSubmissions,
  processOfflineQueue,
  syncOfflineQueue,
  setOfflineMode,
  isConnected,
  isOfflineMode
} from '../utils/offlineStorage';

// API URL 가져오기
import api, { API_URL } from '../services/supabaseApi';

const OfflineQueueScreen = () => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = async () => {
    setLoading(true);
    try {
      // 오프라인 큐 아이템 로드
      const queue = await getOfflineQueue();
      setQueueItems(queue);

      // 오프라인 제출 항목 로드
      const offlineSubmissions = await getOfflineSubmissions();
      setSubmissions(offlineSubmissions);
    } catch (error) {
      console.error('Failed to load offline data', error);
      Alert.alert('오류', '오프라인 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineData = async () => {
    if (queueItems.length === 0 && submissions.length === 0) {
      Alert.alert('알림', '동기화할 항목이 없습니다.');
      return;
    }

    setProcessing(true);
    try {
      // 네트워크 연결 확인
      const connected = await isConnected();
      if (!connected) {
        Alert.alert('네트워크 오류', '네트워크 연결이 없습니다. 인터넷 연결을 확인해주세요.');
        setProcessing(false);
        return;
      }

      // 오프라인 모드 확인
      const offlineModeEnabled = await isOfflineMode();
      if (offlineModeEnabled) {
        Alert.alert(
          '오프라인 모드',
          '오프라인 모드가 활성화되어 있습니다. 동기화하려면 오프라인 모드를 해제해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '오프라인 모드 해제', 
              onPress: async () => {
                await setOfflineMode(false);
                Alert.alert('알림', '오프라인 모드가 해제되었습니다. 다시 동기화를 시도해주세요.');
              } 
            }
          ]
        );
        setProcessing(false);
        return;
      }

      // 개선된 오프라인 큐 동기화 함수 사용
      const result = await syncOfflineQueue();
      
      // 오프라인 모드 해제 여부 확인
      if (result.success > 0 && result.failed === 0 && queueItems.length === result.success) {
        await setOfflineMode(false);
        
        Alert.alert(
          '동기화 완료',
          `${result.success}개의 항목이 성공적으로 동기화되었습니다.`,
          [{ text: '확인', onPress: () => loadOfflineData() }]
        );
      } else {
        Alert.alert(
          '동기화 결과',
          `성공: ${result.success}개, 실패: ${result.failed}개`,
          [{ text: '확인', onPress: () => loadOfflineData() }]
        );
      }
    } catch (error) {
      console.error('Failed to sync offline data', error);
      Alert.alert('동기화 오류', '오프라인 데이터 동기화 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return '#4CAF50';
      case 'POST':
        return '#2196F3';
      case 'PUT':
        return '#FF9800';
      case 'DELETE':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const renderQueueItem = ({ item }: { item: any }) => (
    <View style={styles.queueItem}>
      <View style={styles.queueItemHeader}>
        <View style={[styles.methodBadge, { backgroundColor: getMethodColor(item.method) }]}>
          <Text style={styles.methodText}>{item.method}</Text>
        </View>
        <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
      </View>
      <Text style={styles.endpoint} numberOfLines={1}>{item.endpoint}</Text>
      {item.retryCount > 0 && (
        <View style={styles.retryContainer}>
          <Ionicons name="refresh" size={14} color="#FF9800" />
          <Text style={styles.retryText}>재시도: {item.retryCount}회</Text>
        </View>
      )}
    </View>
  );

  const renderSubmissionItem = ({ item }: { item: any }) => (
    <View style={styles.submissionItem}>
      <View style={styles.submissionHeader}>
        <Text style={styles.submissionTitle} numberOfLines={1}>
          숙제 제출: {item.homeworkId}
        </Text>
        <View style={[
          styles.statusBadge, 
          { 
            backgroundColor: 
              item.syncStatus === 'synced' ? '#4CAF50' : 
              item.syncStatus === 'failed' ? '#F44336' : '#FF9800'
          }
        ]}>
          <Text style={styles.statusText}>
            {item.syncStatus === 'synced' ? '동기화됨' : 
             item.syncStatus === 'failed' ? '실패' : '대기중'}
          </Text>
        </View>
      </View>
      <Text style={styles.submissionDate}>
        제출일: {formatDate(new Date(item.submittedAt).getTime())}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>오프라인 큐</Text>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={syncOfflineData}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sync" size={16} color="#FFFFFF" />
              <Text style={styles.syncButtonText}>동기화</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {queueItems.length === 0 && submissions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={64} color="#BDBDBD" />
          <Text style={styles.emptyStateText}>동기화할 항목이 없습니다.</Text>
        </View>
      ) : (
        <>
          {queueItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API 요청 큐 ({queueItems.length})</Text>
              <FlatList
                data={queueItems}
                renderItem={renderQueueItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
              />
            </View>
          )}

          {submissions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>숙제 제출 ({submissions.length})</Text>
              <FlatList
                data={submissions}
                renderItem={renderSubmissionItem}
                keyExtractor={(item) => item._id}
                style={styles.list}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F6CFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  queueItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  queueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  methodText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#757575',
  },
  endpoint: {
    fontSize: 14,
    color: '#212121',
    marginBottom: 4,
  },
  retryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 4,
  },
  submissionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  submissionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  submissionDate: {
    fontSize: 12,
    color: '#757575',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default OfflineQueueScreen;