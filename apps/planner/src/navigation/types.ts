import { NavigatorScreenParams } from '@react-navigation/native';

// Define the types for our navigation structure
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  FileUpload: undefined;
  LessonDetail: { lessonId: string };
  StudentDetail: { studentId: string };
  HomeworkDetail: { homeworkId: string };
  HomeworkCreate: undefined;
  HomeworkEdit: { homeworkId: string };
  FeedbackReview: { submissionId: string };
  ReportDetail: { reportId: string };
  ReportCreate: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Lessons: undefined;
  Homework: undefined;
  Students: undefined;
  Reports: undefined;
};