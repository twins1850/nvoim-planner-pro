import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';

// Import screens
import FileUploadScreen from '../screens/FileUploadScreen';
import LessonDetailScreen from '../screens/LessonDetailScreen';
import StudentDetailScreen from '../screens/StudentDetailScreen';
import HomeworkDetailScreen from '../screens/HomeworkDetailScreen';
import HomeworkCreateScreen from '../screens/HomeworkCreateScreen';
import HomeworkEditScreen from '../screens/HomeworkEditScreen';
import FeedbackReviewScreen from '../screens/FeedbackReviewScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import ReportCreateScreen from '../screens/ReportCreateScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#f8f9fa' },
      }}
    >
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen 
        name="FileUpload" 
        component={FileUploadScreen} 
        options={{ 
          headerShown: true, 
          title: '파일 업로드',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="LessonDetail" 
        component={LessonDetailScreen} 
        options={{ 
          headerShown: true, 
          title: '수업 분석',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="StudentDetail" 
        component={StudentDetailScreen} 
        options={{ 
          headerShown: true, 
          title: '학생 정보',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="HomeworkDetail" 
        component={HomeworkDetailScreen} 
        options={{ 
          headerShown: true, 
          title: '숙제 상세',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="HomeworkCreate" 
        component={HomeworkCreateScreen} 
        options={{ 
          headerShown: true, 
          title: '숙제 생성',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="HomeworkEdit" 
        component={HomeworkEditScreen} 
        options={{ 
          headerShown: true, 
          title: '숙제 수정',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="FeedbackReview" 
        component={FeedbackReviewScreen} 
        options={{ 
          headerShown: true, 
          title: '피드백 검토',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="ReportDetail" 
        component={ReportDetailScreen} 
        options={{ 
          headerShown: true, 
          title: '보고서 상세',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="ReportCreate" 
        component={ReportCreateScreen} 
        options={{ 
          headerShown: true, 
          title: '보고서 생성',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          headerShown: true, 
          title: '설정',
          headerStyle: {
            backgroundColor: '#4a6da7',
          },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;