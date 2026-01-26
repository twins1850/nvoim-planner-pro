import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// 컴포넌트
import HomeworkCard from '../components/HomeworkCard';

// 타입
import { RootStackParamList } from '../navigation/types';

// API
import { homeworkAPI } from '../services/supabaseApi';
import { 
  isConnected, 
  getOfflineData, 
  saveOfflineData, 
  getOfflineHomework,
  setOfflineMode,
  initializeSampleData
} from '../utils/offlineStorage';
import { checkOfflineMode } from '../utils/offlineModeHelper';

type HomeworkScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeworkScreen = () => {
  const navigation = useNavigation<HomeworkScreenNavigationProp>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [isOfflineModeActive, setIsOfflineModeActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');

  useEffect(() => {
    loadHomeworks();
  }, []);

  const loadHomeworks = async () => {
    setLoading(true);
    
    try {
      console.log('🏠 HomeworkScreen: loadHomeworks 시작...');
      
      // 오프라인 모드 상태 확인
      const offlineModeEnabled = await checkOfflineMode();
      console.log('🔧 오프라인 모드:', offlineModeEnabled);
      setIsOfflineModeActive(offlineModeEnabled);
      
      // 네트워크 연결 상태 확인
      const connected = await isConnected();
      console.log('🌐 네트워크 연결:', connected);
      
      // 먼저 캐시된 데이터 확인 (빠른 화면 표시를 위해)
      const cachedHomeworks = await getOfflineData('homeworks');
      console.log('💾 캐시된 숙제 데이터:', cachedHomeworks?.length || 0, '개');
      if (cachedHomeworks && cachedHomeworks.length > 0) {
        // 캐시된 데이터가 있으면 먼저 표시
        setHomeworks(cachedHomeworks);
      }
      
      if (connected && !offlineModeEnabled) {
        // 온라인 모드
        try {
          console.log('📡 homeworkAPI.getHomeworks() 호출 중...');
          const response = await homeworkAPI.getHomeworks();
          console.log('📡 API 응답:', response);
          if (response.success) {
            console.log('✅ API 성공 - 숙제 개수:', response.data?.homeworks?.length || 0);
            console.log('📝 첫 번째 숙제 제목:', response.data?.homeworks?.[0]?.title);
            console.log('📝 숙제 데이터 상세:', response.data?.homeworks?.[0]);
            setHomeworks(response.data.homeworks || []);
            setIsOfflineModeActive(false);
            
            // 오프라인 사용을 위해 캐시
            await saveOfflineData('homeworks', response.data.homeworks || []);
          } else {
            console.log('❌ API 실패:', response.error);
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // API 오류 시 오프라인 모드로 자동 전환
          await setOfflineMode(true);
          setIsOfflineModeActive(true);
          
          // 캐시된 데이터가 없으면 샘플 데이터 초기화
          if (!cachedHomeworks || cachedHomeworks.length === 0) {
            await initializeSampleData();
          }
          
          // 오프라인 데이터 로드
          await loadOfflineHomeworks();
        }
      } else {
        // 오프라인 모드
        setIsOfflineModeActive(true);
        
        // 캐시된 데이터가 없으면 샘플 데이터 초기화
        if (!cachedHomeworks || cachedHomeworks.length === 0) {
          await initializeSampleData();
        }
        
        await loadOfflineHomeworks();
      }
    } catch (error) {
      console.error('Failed to load homeworks:', error);
      
      // 오류 발생 시 샘플 데이터 초기화 시도
      try {
        await initializeSampleData();
        await loadOfflineHomeworks();
      } catch (sampleError) {
        console.error('Failed to initialize sample data:', sampleError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOfflineHomeworks = async () => {
    // 오프라인 데이터 확인
    const offlineHomeworks = await getOfflineHomework();
    const cachedHomeworks = await getOfflineData('homeworks');
    
    // 오프라인 데이터와 캐시된 데이터 병합
    const combinedHomeworks = [...(cachedHomeworks || [])];
    
    if (offlineHomeworks && offlineHomeworks.length > 0) {
      offlineHomeworks.forEach(offlineHw => {
        const existingIndex = combinedHomeworks.findIndex(hw => hw.id === offlineHw._id);
        if (existingIndex !== -1) {
          combinedHomeworks[existingIndex] = {
            ...offlineHw,
            id: offlineHw._id,
            isOffline: true
          };
        } else {
          combinedHomeworks.push({
            ...offlineHw,
            id: offlineHw._id,
            isOffline: true
          });
        }
      });
    }
    
    setHomeworks(combinedHomeworks);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeworks();
  };

  const handleHomeworkPress = (homeworkId: string) => {
    navigation.navigate('HomeworkDetail', { homeworkId });
  };

  const getFilteredHomeworks = () => {
    if (activeTab === 'all') {
      return homeworks;
    } else if (activeTab === 'pending') {
      return homeworks.filter(hw => 
        hw.status === 'pending' || hw.status === 'overdue' || hw.status === 'submitted'
      );
    } else {
      return homeworks.filter(hw => hw.status === 'completed');
    }
  };

  const renderTabButton = (tab: 'pending' | 'completed' | 'all', label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text 
        style={[
          styles.tabButtonText, 
          activeTab === tab && styles.activeTabButtonText
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderHomeworkItem = ({ item }: { item: any }) => (
    <HomeworkCard
      id={item.id}
      title={item.title}
      dueDate={item.dueDate}
      type={item.type}
      status={item.status}
      onPress={handleHomeworkPress}
      isOffline={item.isOffline}
    />
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F6CFF" />
      </View>
    );
  }

  const filteredHomeworks = getFilteredHomeworks();

  return (
    <View style={styles.container}>
      {isOfflineModeActive && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>오프라인 모드</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <Text style={styles.title}>숙제</Text>
      </View>
      
      <View style={styles.tabContainer}>
        {renderTabButton('pending', '진행 중')}
        {renderTabButton('completed', '완료됨')}
        {renderTabButton('all', '전체')}
      </View>
      
      {filteredHomeworks.length > 0 ? (
        <FlatList
          data={filteredHomeworks}
          renderItem={renderHomeworkItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyStateText}>
            {activeTab === 'pending' ? '진행 중인 숙제가 없습니다.' :
             activeTab === 'completed' ? '완료된 숙제가 없습니다.' :
             '숙제가 없습니다.'}
          </Text>
        </View>
      )}
    </View>
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
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  activeTabButton: {
    backgroundColor: '#4F6CFF',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default HomeworkScreen;