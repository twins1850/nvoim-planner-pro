import { NavigatorScreenParams } from '@react-navigation/native';

// 인증 스택 네비게이션 타입
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// 메인 탭 네비게이션 타입
export type MainTabParamList = {
  Home: undefined;
  Homework: undefined;
  Progress: undefined;
  Feedback: undefined;
  Messages: undefined;
  Profile: undefined;
};

// 홈워크 스택 네비게이션 타입
export type HomeworkStackParamList = {
  HomeworkList: undefined;
  HomeworkDetail: { homeworkId: string };
  HomeworkSubmission: { homeworkId: string };
  AudioRecording: { homeworkId: string; questionId: string };
};

// 피드백 스택 네비게이션 타입
export type FeedbackStackParamList = {
  FeedbackList: undefined;
  FeedbackDetail: { feedbackId: string };
};

// 프로필 스택 네비게이션 타입
export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  Notifications: undefined;
  OfflineQueue: undefined;
  ServerTest: undefined;
};

// 루트 네비게이션 타입
export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  ConnectPlanner: undefined;
  HomeworkDetail: { homeworkId: string };
  HomeworkSubmission: { homeworkId: string };
  AudioRecording: { homeworkId: string };
  FeedbackDetail: { feedbackId: string };
  Settings: undefined;
  Notifications: undefined;
  OfflineQueue: undefined;
  ServerTest: undefined;
};