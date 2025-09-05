import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text } from 'react-native';
import { supabase } from '../lib/supabase';

// 네비게이션 타입
import { RootStackParamList, AuthStackParamList } from './types';

// 네비게이터
import MainTabNavigator from './MainTabNavigator';

// 스크린
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeworkDetailScreen from '../screens/HomeworkDetailScreen';
import HomeworkSubmissionScreen from '../screens/HomeworkSubmissionScreen';
import AudioRecordingScreen from '../screens/AudioRecordingScreen';
import FeedbackDetailScreen from '../screens/FeedbackDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OfflineQueueScreen from '../screens/OfflineQueueScreen';
import ServerTestScreen from '../screens/ServerTestScreen';

// 스택 네비게이터 생성
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// 인증 스택 네비게이터
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 인증 상태 확인
    const checkAuthStatus = async () => {
      try {
        // Supabase 인증 상태를 직접 확인
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log('현재 Supabase 사용자:', user);
        
        // Supabase에서 실제 로그인된 사용자가 있는지 확인
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('인증 상태 확인 실패:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
    
    // Supabase 인증 상태 변경 리스너 설정
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('인증 상태 변경:', event, session?.user?.email);
      setIsAuthenticated(!!session?.user);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    // 로딩 화면 표시
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#4F6CFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#757575' }}>앱을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="HomeworkDetail" 
              component={HomeworkDetailScreen}
              options={{
                headerShown: true,
                title: '숙제 상세',
              }}
            />
            <Stack.Screen 
              name="HomeworkSubmission" 
              component={HomeworkSubmissionScreen}
              options={{
                headerShown: true,
                title: '숙제 제출',
              }}
            />
            <Stack.Screen 
              name="AudioRecording" 
              component={AudioRecordingScreen}
              options={{
                headerShown: true,
                title: '오디오 녹음',
              }}
            />
            <Stack.Screen 
              name="FeedbackDetail" 
              component={FeedbackDetailScreen}
              options={{
                headerShown: true,
                title: '피드백 상세',
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: '설정',
              }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: '알림',
              }}
            />
            <Stack.Screen 
              name="OfflineQueue" 
              component={OfflineQueueScreen}
              options={{
                headerShown: true,
                title: '오프라인 큐',
              }}
            />
            <Stack.Screen 
              name="ServerTest" 
              component={ServerTestScreen}
              options={{
                headerShown: true,
                title: '서버 연결 테스트',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;