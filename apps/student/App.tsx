import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { initializeSampleData, isConnected } from './src/utils/offlineStorage';

export default function App() {
  // 앱 시작 시 네트워크 상태 확인 및 샘플 데이터 초기화
  useEffect(() => {
    const checkNetworkAndInitialize = async () => {
      try {
        // 네트워크 연결 확인
        const connected = await isConnected();
        
        // 네트워크 연결이 없으면 샘플 데이터 초기화
        if (!connected) {
          console.log('네트워크 연결 없음, 샘플 데이터 초기화');
          await initializeSampleData();
        }
      } catch (error) {
        console.error('앱 초기화 중 오류 발생:', error);
        // 오류 발생 시에도 샘플 데이터 초기화 시도
        await initializeSampleData();
      }
    };
    
    checkNetworkAndInitialize();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
