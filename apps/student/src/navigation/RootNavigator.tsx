import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import realtimeService from '../services/realtimeService';

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
import ConnectPlannerScreen from '../screens/onboarding/ConnectPlannerScreen';

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
  const [hasPlanner, setHasPlanner] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // 인증 상태 및 플래너 연결 상태 확인
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('현재 Supabase 사용자:', user);
        
        if (user) {
          setIsAuthenticated(true);
          setCurrentUserId(user.id);
          
          // 플래너 연결 여부 확인 (폴백 로직 포함)
          try {
            const { data: profile, error } = await supabase
              .from('student_profiles')
              .select('planner_id')
              .eq('id', user.id)
              .single();
              
            if (!error && profile?.planner_id) {
              setHasPlanner(true);
              
              // 실시간 알림 구독 시작
              realtimeService.subscribeToNotifications(user.id, {
                onHomeworkAssigned: (data) => {
                  console.log('새로운 숙제 배정됨');
                },
                onFeedbackReceived: (data) => {
                  console.log('AI 피드백 완료됨');
                },
                onMessageReceived: (data) => {
                  console.log('새 메시지 도착함');
                },
                onGeneralNotification: (data) => {
                  console.log('일반 알림:', data.title || '알림');
                }
              });
            } else {
              setHasPlanner(false);
            }
          } catch (profileError) {
            console.log('student_profiles 접근 실패, 테스트를 위해 true로 설정:', profileError);
            setHasPlanner(true); // 테스트를 위해 임시로 true로 설정
          }
        } else {
          setIsAuthenticated(false);
          setHasPlanner(false);
        }
      } catch (error) {
        console.error('상태 확인 실패:', error);
        setIsAuthenticated(false);
        setHasPlanner(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
    
    // Supabase 인증 상태 변경 리스너 설정
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('인증 상태 변경:', event, session?.user?.email);
      if (session?.user) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        // 로그인 시 플래너 체크 다시 수행 (폴백 로직 포함)
        supabase
          .from('student_profiles')
          .select('planner_id')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            const hasPlanner = !error && !!data?.planner_id;
            setHasPlanner(hasPlanner);
            
            // 플래너가 있으면 실시간 알림 구독
            if (hasPlanner) {
              realtimeService.subscribeToNotifications(session.user.id, {
                onHomeworkAssigned: (data) => {
                  console.log('새로운 숙제 배정됨');
                },
                onFeedbackReceived: (data) => {
                  console.log('AI 피드백 완료됨');
                },
                onMessageReceived: (data) => {
                  console.log('새 메시지 도착함');
                },
                onGeneralNotification: (data) => {
                  console.log('일반 알림:', data.title || '알림');
                }
              });
            }
          })
          .catch((err) => {
            console.log('student_profiles 접근 실패 (인증 변경 시), 테스트를 위해 true로 설정:', err);
            setHasPlanner(true); // 테스트를 위해 임시로 true로 설정
          });
      } else {
        setIsAuthenticated(false);
        setHasPlanner(false);
        setCurrentUserId(null);
        // 로그아웃 시 알림 구독 해제
        realtimeService.unsubscribeAll();
      }
    });
    
    return () => {
      subscription.unsubscribe();
      // 컴포넌트 언마운트 시 알림 구독 해제
      realtimeService.unsubscribeAll();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#4F6CFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#757575' }}>앱을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          hasPlanner ? (
            // 플래너가 연결된 경우 메인 화면 진입
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen 
                name="HomeworkDetail" 
                component={HomeworkDetailScreen}
                options={{ headerShown: true, title: '숙제 상세' }}
              />
              <Stack.Screen 
                name="HomeworkSubmission" 
                component={HomeworkSubmissionScreen}
                options={{ headerShown: true, title: '숙제 제출' }}
              />
              <Stack.Screen 
                name="AudioRecording" 
                component={AudioRecordingScreen}
                options={{ headerShown: true, title: '오디오 녹음' }}
              />
              <Stack.Screen 
                name="FeedbackDetail" 
                component={FeedbackDetailScreen}
                options={{ headerShown: true, title: '피드백 상세' }}
              />
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{ headerShown: true, title: '설정' }}
              />
              <Stack.Screen 
                name="Notifications" 
                component={NotificationsScreen}
                options={{ headerShown: true, title: '알림' }}
              />
              <Stack.Screen 
                name="OfflineQueue" 
                component={OfflineQueueScreen}
                options={{ headerShown: true, title: '오프라인 큐' }}
              />
              <Stack.Screen 
                name="ServerTest" 
                component={ServerTestScreen}
                options={{ headerShown: true, title: '서버 연결 테스트' }}
              />
            </>
          ) : (
            // 플래너가 연결되지 않은 경우 연결 화면 표시
            <Stack.Screen name="ConnectPlanner">
              {(props) => (
                <ConnectPlannerScreen 
                  {...props} 
                  onConnected={() => setHasPlanner(true)} 
                />
              )}
            </Stack.Screen>
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;