import AsyncStorage from '@react-native-async-storage/async-storage';

// 오프라인 모드 상태 확인 함수
export const checkOfflineMode = async (): Promise<boolean> => {
  try {
    const offlineMode = await AsyncStorage.getItem('offlineMode');
    return offlineMode === 'true';
  } catch (error) {
    console.error('오프라인 모드 확인 중 오류 발생:', error);
    return false;
  }
};

// 오프라인 모드 설정 함수
export const setOfflineModeStatus = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem('offlineMode', enabled ? 'true' : 'false');
    console.log(`오프라인 모드 ${enabled ? '활성화' : '비활성화'} 완료`);
  } catch (error) {
    console.error('오프라인 모드 설정 중 오류 발생:', error);
    throw error;
  }
};