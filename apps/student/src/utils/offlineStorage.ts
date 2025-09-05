import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { sampleFeedbacks, sampleNotifications, sampleUserProfile } from './sampleData';
import { sampleHomeworkData } from './sampleHomeworkData';

// 오프라인 저장소 키
const OFFLINE_QUEUE_KEY = '@offline_queue';
const OFFLINE_DATA_KEY = '@offline_data';
const OFFLINE_HOMEWORK_KEY = '@offline_homework';
const OFFLINE_SUBMISSIONS_KEY = '@offline_submissions';
const OFFLINE_AUDIO_FILES_KEY = '@offline_audio_files';

// 오프라인 큐 아이템 타입
interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
}

// 네트워크 상태 확인
export const isConnected = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
};

// 오프라인 큐에 요청 추가
export const addToOfflineQueue = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: any
): Promise<string> => {
  try {
    // 기존 큐 가져오기
    const queueString = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: OfflineQueueItem[] = queueString ? JSON.parse(queueString) : [];
    
    // 새 아이템 생성
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newItem: OfflineQueueItem = {
      id,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    // 큐에 추가
    queue.push(newItem);
    
    // 저장
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    
    return id;
  } catch (error) {
    console.error('Failed to add to offline queue', error);
    throw error;
  }
};

// 오프라인 큐 가져오기
export const getOfflineQueue = async (): Promise<OfflineQueueItem[]> => {
  try {
    const queueString = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return queueString ? JSON.parse(queueString) : [];
  } catch (error) {
    console.error('Failed to get offline queue', error);
    return [];
  }
};

// 오프라인 큐에서 아이템 제거
export const removeFromOfflineQueue = async (id: string): Promise<void> => {
  try {
    const queueString = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueString) return;
    
    const queue: OfflineQueueItem[] = JSON.parse(queueString);
    const updatedQueue = queue.filter(item => item.id !== id);
    
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (error) {
    console.error('Failed to remove from offline queue', error);
    throw error;
  }
};

// 오프라인 데이터 저장
export const saveOfflineData = async (key: string, data: any): Promise<void> => {
  try {
    const dataString = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
    const offlineData = dataString ? JSON.parse(dataString) : {};
    
    offlineData[key] = {
      data,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineData));
  } catch (error) {
    console.error('Failed to save offline data', error);
    throw error;
  }
};

// 오프라인 데이터 가져오기
export const getOfflineData = async (key: string): Promise<any> => {
  try {
    const dataString = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
    if (!dataString) return null;
    
    const offlineData = JSON.parse(dataString);
    return offlineData[key]?.data || null;
  } catch (error) {
    console.error('Failed to get offline data', error);
    return null;
  }
};

// 오프라인 데이터 삭제
export const removeOfflineData = async (key: string): Promise<void> => {
  try {
    const dataString = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
    if (!dataString) return;
    
    const offlineData = JSON.parse(dataString);
    delete offlineData[key];
    
    await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineData));
  } catch (error) {
    console.error('Failed to remove offline data', error);
    throw error;
  }
};

// 오프라인 큐 처리 (네트워크 연결 시 자동 실행)
export const processOfflineQueue = async (
  apiCallback: (endpoint: string, method: string, data?: any) => Promise<any>
): Promise<{ success: number; failed: number }> => {
  try {
    const connected = await isConnected();
    if (!connected) {
      console.log('네트워크 연결 없음, 동기화 불가');
      return { success: 0, failed: 0 };
    }
    
    // 오프라인 모드 확인
    const offlineMode = await AsyncStorage.getItem('offlineMode');
    const offlineModeEnabled = offlineMode === 'true';
    if (offlineModeEnabled) {
      console.log('오프라인 모드 활성화됨, 동기화 불가');
      return { success: 0, failed: 0 };
    }
    
    const queue = await getOfflineQueue();
    if (queue.length === 0) {
      console.log('오프라인 큐가 비어있음');
      return { success: 0, failed: 0 };
    }
    
    console.log(`오프라인 큐에 ${queue.length}개 항목 있음, 동기화 시작`);
    let success = 0;
    let failed = 0;
    const newQueue = [];
    
    // 각 큐 아이템 처리
    for (const item of queue) {
      try {
        await apiCallback(item.endpoint, item.method, item.data);
        // 성공한 항목은 큐에서 제거
        await removeFromOfflineQueue(item.id);
        success++;
        console.log(`항목 동기화 성공: ${item.endpoint}`);
      } catch (error) {
        console.error(`항목 동기화 오류: ${item.endpoint}`, error);
        
        // 재시도 횟수 증가
        const updatedQueue = await getOfflineQueue();
        const itemIndex = updatedQueue.findIndex(i => i.id === item.id);
        
        if (itemIndex !== -1) {
          updatedQueue[itemIndex].retryCount++;
          
          // 최대 재시도 횟수(5회) 초과 시 제거
          if (updatedQueue[itemIndex].retryCount > 5) {
            console.log(`최대 재시도 횟수 초과로 항목 제거: ${item.endpoint}`);
            updatedQueue.splice(itemIndex, 1);
          } else {
            // 실패한 항목은 새 큐에 추가
            newQueue.push(updatedQueue[itemIndex]);
          }
          
          await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
        }
        
        failed++;
      }
    }
    
    console.log(`동기화 완료: 성공 ${success}개, 실패 ${failed}개`);
    return { success, failed };
  } catch (error) {
    console.error('오프라인 큐 처리 중 오류 발생:', error);
    return { success: 0, failed: 0 };
  }
};

// 오프라인 데이터 만료 확인 및 정리 (7일 이상 된 데이터 삭제)
export const cleanupExpiredOfflineData = async (): Promise<void> => {
  try {
    const dataString = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
    if (!dataString) return;
    
    const offlineData = JSON.parse(dataString);
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    
    let hasChanges = false;
    
    // 만료된 데이터 확인 및 삭제
    Object.keys(offlineData).forEach(key => {
      if (now - offlineData[key].timestamp > sevenDaysInMs) {
        delete offlineData[key];
        hasChanges = true;
      }
    });
    
    // 변경사항이 있을 경우에만 저장
    if (hasChanges) {
      await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineData));
    }
  } catch (error) {
    console.error('Failed to cleanup expired offline data', error);
  }
};

// 오프라인 숙제 데이터 저장
export const saveOfflineHomework = async (homework: any): Promise<void> => {
  try {
    const homeworkString = await AsyncStorage.getItem(OFFLINE_HOMEWORK_KEY);
    const homeworkData = homeworkString ? JSON.parse(homeworkString) : [];
    
    // 이미 존재하는 숙제인지 확인
    const existingIndex = homeworkData.findIndex((h: any) => h._id === homework._id);
    
    if (existingIndex !== -1) {
      // 기존 숙제 업데이트
      homeworkData[existingIndex] = {
        ...homework,
        lastUpdated: Date.now()
      };
    } else {
      // 새 숙제 추가
      homeworkData.push({
        ...homework,
        lastUpdated: Date.now()
      });
    }
    
    await AsyncStorage.setItem(OFFLINE_HOMEWORK_KEY, JSON.stringify(homeworkData));
  } catch (error) {
    console.error('Failed to save offline homework', error);
    throw error;
  }
};

// 오프라인 숙제 데이터 가져오기
export const getOfflineHomework = async (): Promise<any[]> => {
  try {
    const homeworkString = await AsyncStorage.getItem(OFFLINE_HOMEWORK_KEY);
    return homeworkString ? JSON.parse(homeworkString) : [];
  } catch (error) {
    console.error('Failed to get offline homework', error);
    return [];
  }
};

// 오프라인 숙제 제출 저장
export const saveOfflineSubmission = async (homeworkId: string, submission: any): Promise<string> => {
  try {
    const submissionsString = await AsyncStorage.getItem(OFFLINE_SUBMISSIONS_KEY);
    const submissions = submissionsString ? JSON.parse(submissionsString) : [];
    
    // 제출 ID 생성
    const submissionId = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 새 제출 추가
    submissions.push({
      _id: submissionId,
      homeworkId,
      ...submission,
      submittedAt: new Date().toISOString(),
      status: 'offline',
      syncStatus: 'pending',
      lastUpdated: Date.now()
    });
    
    await AsyncStorage.setItem(OFFLINE_SUBMISSIONS_KEY, JSON.stringify(submissions));
    return submissionId;
  } catch (error) {
    console.error('Failed to save offline submission', error);
    throw error;
  }
};

// 오프라인 숙제 제출 가져오기
export const getOfflineSubmissions = async (): Promise<any[]> => {
  try {
    const submissionsString = await AsyncStorage.getItem(OFFLINE_SUBMISSIONS_KEY);
    return submissionsString ? JSON.parse(submissionsString) : [];
  } catch (error) {
    console.error('Failed to get offline submissions', error);
    return [];
  }
};

// 오프라인 오디오 파일 저장
export const saveOfflineAudioFile = async (audioUri: string, metadata: any): Promise<string> => {
  try {
    const audioFilesString = await AsyncStorage.getItem(OFFLINE_AUDIO_FILES_KEY);
    const audioFiles = audioFilesString ? JSON.parse(audioFilesString) : {};
    
    // 파일 ID 생성
    const fileId = `offline-audio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 오디오 파일 정보 저장
    audioFiles[fileId] = {
      uri: audioUri,
      metadata,
      createdAt: Date.now()
    };
    
    await AsyncStorage.setItem(OFFLINE_AUDIO_FILES_KEY, JSON.stringify(audioFiles));
    return fileId;
  } catch (error) {
    console.error('Failed to save offline audio file', error);
    throw error;
  }
};

// 오프라인 오디오 파일 가져오기
export const getOfflineAudioFile = async (fileId: string): Promise<any> => {
  try {
    const audioFilesString = await AsyncStorage.getItem(OFFLINE_AUDIO_FILES_KEY);
    if (!audioFilesString) return null;
    
    const audioFiles = JSON.parse(audioFilesString);
    return audioFiles[fileId] || null;
  } catch (error) {
    console.error('Failed to get offline audio file', error);
    return null;
  }
};

// 오프라인 모드 상태 확인
export const isOfflineMode = async (): Promise<boolean> => {
  try {
    const offlineMode = await AsyncStorage.getItem('offlineMode');
    return offlineMode === 'true';
  } catch (error) {
    console.error('Failed to check offline mode', error);
    return false;
  }
};

// 오프라인 모드 설정
export const setOfflineMode = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem('offlineMode', enabled ? 'true' : 'false');
    
    // 오프라인 모드로 전환할 때 샘플 데이터 초기화
    if (enabled) {
      await initializeSampleData();
    }
  } catch (error) {
    console.error('Failed to set offline mode', error);
    throw error;
  }
};

// 오프라인 큐 동기화 함수
export const syncOfflineQueue = async (): Promise<{ success: number; failed: number }> => {
  try {
    // 네트워크 연결 확인
    const connected = await isConnected();
    if (!connected) {
      console.log('네트워크 연결 없음, 동기화 불가');
      return { success: 0, failed: 0 };
    }
    
    // 오프라인 모드 확인
    const offlineMode = await AsyncStorage.getItem('offlineMode');
    const offlineModeEnabled = offlineMode === 'true';
    if (offlineModeEnabled) {
      console.log('오프라인 모드 활성화됨, 동기화 불가');
      return { success: 0, failed: 0 };
    }
    
    // 오프라인 큐 가져오기
    const queueString = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueString) {
      console.log('오프라인 큐가 비어있음');
      return { success: 0, failed: 0 };
    }
    
    const queue = JSON.parse(queueString);
    if (!queue.length) {
      console.log('오프라인 큐가 비어있음');
      return { success: 0, failed: 0 };
    }
    
    console.log(`오프라인 큐에 ${queue.length}개 항목 있음, 동기화 시작`);
    
    // 각 항목 동기화 시도
    let successCount = 0;
    let failedCount = 0;
    const newQueue = [];
    
    // API URL 가져오기 (모듈에서 직접 가져올 수 없으므로 하드코딩)
    const API_URL = 'http://192.168.123.181:3001/api'; // 로컬 네트워크에서 접근 가능한 서버 주소
    
    for (const item of queue) {
      try {
        // 토큰 가져오기
        const token = await AsyncStorage.getItem('token');
        
        // API 요청 보내기
        const response = await fetch(`${API_URL}${item.endpoint}`, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: item.data ? JSON.stringify(item.data) : undefined
        });
        
        if (response.ok) {
          successCount++;
          console.log(`항목 동기화 성공: ${item.endpoint}`);
          await removeFromOfflineQueue(item.id);
        } else {
          failedCount++;
          newQueue.push(item);
          console.log(`항목 동기화 실패: ${item.endpoint}, 상태 코드: ${response.status}`);
        }
      } catch (error) {
        failedCount++;
        
        // 재시도 횟수 증가
        const updatedQueue = await getOfflineQueue();
        const itemIndex = updatedQueue.findIndex(i => i.id === item.id);
        
        if (itemIndex !== -1) {
          updatedQueue[itemIndex].retryCount++;
          
          // 최대 재시도 횟수(5회) 초과 시 제거
          if (updatedQueue[itemIndex].retryCount > 5) {
            console.log(`최대 재시도 횟수 초과로 항목 제거: ${item.endpoint}`);
            updatedQueue.splice(itemIndex, 1);
          } else {
            newQueue.push(updatedQueue[itemIndex]);
          }
          
          await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
        }
        
        console.error(`항목 동기화 오류: ${item.endpoint}`, error);
      }
    }
    
    console.log(`동기화 완료: 성공 ${successCount}개, 실패 ${failedCount}개`);
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('오프라인 큐 동기화 중 오류 발생:', error);
    return { success: 0, failed: 0 };
  }
};

// 샘플 데이터 초기화 (오프라인 모드에서 사용)
export const initializeSampleData = async (): Promise<void> => {
  try {
    // 이미 데이터가 있는지 확인
    const dataString = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
    const offlineData = dataString ? JSON.parse(dataString) : {};
    
    // 피드백 데이터 초기화
    if (!offlineData.feedbacks) {
      offlineData.feedbacks = {
        data: sampleFeedbacks,
        timestamp: Date.now()
      };
    }
    
    // 숙제 데이터 초기화
    if (!offlineData.homeworks) {
      offlineData.homeworks = {
        data: sampleHomeworkData, // 새로운 상세 샘플 데이터 사용
        timestamp: Date.now()
      };
    }
    
    // 알림 데이터 초기화
    if (!offlineData.notifications) {
      offlineData.notifications = {
        data: sampleNotifications,
        timestamp: Date.now()
      };
    }
    
    // 오프라인 데이터 저장
    await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineData));
    
    // 사용자 정보 초기화 (아직 없는 경우)
    const userInfo = await AsyncStorage.getItem('userInfo');
    if (!userInfo) {
      await AsyncStorage.setItem('userInfo', JSON.stringify(sampleUserProfile));
    }
    
    // 오프라인 숙제 데이터 초기화 (상세 화면용)
    const homeworkString = await AsyncStorage.getItem(OFFLINE_HOMEWORK_KEY);
    if (!homeworkString) {
      // 샘플 숙제 데이터를 오프라인 숙제 형식으로 변환
      const offlineHomeworks = sampleHomeworkData.map(hw => ({
        _id: hw.id,
        title: hw.title,
        description: hw.description,
        type: hw.type,
        dueDate: hw.dueDate,
        status: hw.status,
        content: hw.content,
        lastUpdated: Date.now()
      }));
      
      await AsyncStorage.setItem(OFFLINE_HOMEWORK_KEY, JSON.stringify(offlineHomeworks));
    }
    
    console.log('샘플 데이터 초기화 완료');
  } catch (error) {
    console.error('Failed to initialize sample data', error);
  }
};