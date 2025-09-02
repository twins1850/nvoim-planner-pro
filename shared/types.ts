// 공통 타입 정의 파일
// 플래너 앱, 학생 앱, 백엔드에서 공통으로 사용하는 타입들

// 사용자 관련 타입
export interface UserProfile {
  name: string;
  phone?: string;
  avatar?: string;
  preferences: {
    language: 'ko' | 'en';
    notifications: boolean;
    timezone: string;
  };
  // 플래너 전용
  managedStudents?: string[];
  // 학생 전용
  assignedPlanner?: string;
  learningLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface User {
  _id: string;
  email: string;
  role: 'planner' | 'student';
  profile: UserProfile;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 인증 관련 타입
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: 'planner' | 'student';
  profile: {
    name: string;
    phone?: string;
    learningLevel?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: string;
}

// 파일 관련 타입
export interface FileReference {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  s3Key: string;
  s3Url: string;
  uploadedAt: string;
}

export interface FileUploadProgress {
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message?: string;
}

// 수업 관련 타입
export interface SpeakerSegment {
  speaker: 'teacher' | 'student';
  startTime: number;
  endTime: number;
  transcript: string;
  confidence: number;
}

export interface StudentMetrics {
  speakingTime: number;
  pronunciationAccuracy: number;
  fluencyScore: number;
  vocabularyUsage: {
    word: string;
    frequency: number;
    correctUsage: boolean;
  }[];
  grammarAccuracy: number;
}

export interface LessonAnalysis {
  speakerSegments: SpeakerSegment[];
  studentMetrics: StudentMetrics;
  pronunciationScores: {
    word: string;
    score: number;
    feedback: string;
  }[];
  participationLevel: number;
  improvementAreas: string[];
  lessonInsights: string[];
  generatedNotes: string;
  analysisCompletedAt: string;
}

export interface Lesson {
  _id: string;
  plannerId: string;
  studentId: string;
  originalVideoFile: FileReference;
  extractedAudioFile?: FileReference;
  analysisResult?: LessonAnalysis;
  lessonDate: string;
  duration: number;
  status: 'uploaded' | 'extracting' | 'extracted' | 'analyzing' | 'analyzed' | 'completed' | 'failed';
  errorMessage?: string;
  metadata: {
    studentName: string;
    extractedFromFilename: boolean;
    originalFileSize: number;
    extractedFileSize?: number;
    compressionRatio?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// 숙제 관련 타입
export interface HomeworkQuestion {
  id: string;
  type: 'audio_recording' | 'text_input' | 'multiple_choice';
  question: string;
  options?: string[];
  targetAnswer?: string;
}

export interface HomeworkContent {
  instructions: string;
  attachments: FileReference[];
  questions: HomeworkQuestion[];
  expectedDuration?: number;
}

export interface Homework {
  _id: string;
  plannerId: string;
  studentIds: string[];
  title: string;
  description: string;
  type: 'audio' | 'text' | 'mixed';
  content: HomeworkContent;
  dueDate: string;
  scheduledSendTime?: string;
  isPersonalized: boolean;
  basedOnLessonId?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'completed';
  createdAt: string;
}

// 제출 관련 타입
export interface SubmissionAnswer {
  questionId: string;
  type: 'audio' | 'text' | 'choice';
  content: string | FileReference;
  metadata?: {
    recordingDuration?: number;
    wordCount?: number;
    submittedAt: string;
  };
}

export interface AIEvaluation {
  pronunciationScore?: {
    overallScore: number;
    wordScores: { word: string; score: number }[];
    feedback: string;
  };
  grammarCorrections?: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  vocabularyFeedback?: {
    usedWords: string[];
    suggestions: string[];
    level: 'beginner' | 'intermediate' | 'advanced';
  };
  overallScore: number;
  strengths: string[];
  improvementAreas: string[];
  generatedAt: string;
}

export interface HomeworkSubmission {
  _id: string;
  homeworkId: string;
  studentId: string;
  answers: SubmissionAnswer[];
  submittedAt: string;
  aiEvaluation?: AIEvaluation;
  plannerFeedback?: {
    score: number;
    comments: string;
    audioFeedback?: FileReference;
    reviewedAt: string;
  };
  finalScore?: number;
  status: 'submitted' | 'ai_evaluated' | 'reviewed' | 'completed';
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// 알림 관련 타입
export interface Notification {
  _id: string;
  userId: string;
  type: 'homework_assigned' | 'homework_due' | 'feedback_available' | 'lesson_analyzed';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

// 진도 추적 타입
export interface StudentProgress {
  studentId: string;
  overallScore: number;
  completedHomework: number;
  totalHomework: number;
  streakDays: number;
  achievements: {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
  }[];
  weeklyProgress: {
    week: string;
    score: number;
    homeworkCount: number;
  }[];
}
// Dashboard and report related types
export interface StudentOverview {
  _id: string;
  name: string;
  email: string;
  learningLevel: string;
  lastActivity: string | null;
  completedHomework: number;
  totalHomework: number;
  completionRate: number;
  averageScore: number;
  streakDays: number;
  requiresAttention: boolean;
  attentionReason?: string;
}

export interface ClassStatistics {
  totalStudents: number;
  activeStudents: number;
  averageCompletionRate: number;
  averageScore: number;
  homeworkCompletedThisWeek: number;
  homeworkCompletedLastWeek: number;
  weeklyChangePercentage: number;
  topPerformingStudents: {
    _id: string;
    name: string;
    score: number;
  }[];
  studentsRequiringAttention: {
    _id: string;
    name: string;
    reason: string;
  }[];
}

export interface DashboardData {
  studentOverviews: StudentOverview[];
  classStatistics: ClassStatistics;
}

export interface PerformanceTrend {
  period: string; // e.g., "2023-W01", "2023-01", etc.
  averageScore: number;
  completionRate: number;
  participationRate: number;
  studentCount: number;
}

export interface StudentPerformanceDetail {
  studentId: string;
  studentName: string;
  email: string;
  learningLevel: string;
  overallScore: number;
  completionRate: number;
  streakDays: number;
  weeklyProgress: {
    week: string;
    score: number;
    homeworkCount: number;
  }[];
  recentLessons: {
    lessonId: string;
    lessonDate: string;
    participationLevel: number;
    pronunciationAccuracy: number;
    fluencyScore: number;
    grammarAccuracy: number;
  }[];
  recentSubmissions: {
    submissionId: string;
    homeworkId: string;
    submittedAt: string;
    score: number;
    status: string;
    isLate: boolean;
  }[];
  improvementAreas: string[];
  strengths: string[];
}

export interface ReportTemplate {
  _id: string;
  name: string;
  description: string;
  sections: {
    type: 'performance' | 'lessons' | 'homework' | 'progress' | 'custom';
    title: string;
    dataFields: string[];
    chartType?: 'bar' | 'line' | 'pie' | 'radar';
    customQuery?: any;
  }[];
  createdBy: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  _id: string;
  templateId: string;
  name: string;
  recipients: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRunDate: string;
  lastRunDate?: string;
  status: 'active' | 'paused';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportFormat {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  options?: any;
}

export interface BulkOperationResult {
  success: boolean;
  message: string;
  results?: any;
}