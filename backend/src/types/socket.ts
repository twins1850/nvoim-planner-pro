/**
 * Socket.io 이벤트 타입 정의
 */

export interface ServerToClientEvents {
  // 수업 관련 실시간 이벤트
  lesson_started: (data: { lessonId: string; plannerId: string; studentIds: string[] }) => void;
  lesson_ended: (data: { lessonId: string; duration: number }) => void;
  lesson_paused: (data: { lessonId: string; timestamp: number }) => void;
  lesson_resumed: (data: { lessonId: string; timestamp: number }) => void;

  // 숙제 관련 실시간 이벤트
  homework_assigned: (data: { homeworkId: string; studentIds: string[]; dueDate: Date }) => void;
  homework_submitted: (data: { submissionId: string; homeworkId: string; studentId: string }) => void;
  homework_graded: (data: { submissionId: string; score: number; feedback: string }) => void;

  // 피드백 관련 실시간 이벤트
  feedback_received: (data: { feedbackId: string; studentId: string; type: string }) => void;
  feedback_updated: (data: { feedbackId: string; changes: string[] }) => void;

  // AI 분석 관련 실시간 이벤트
  analysis_started: (data: { analysisId: string; type: 'pronunciation' | 'grammar' | 'fluency' }) => void;
  analysis_progress: (data: { analysisId: string; progress: number; stage: string }) => void;
  analysis_completed: (data: { analysisId: string; results: any }) => void;
  analysis_failed: (data: { analysisId: string; error: string }) => void;

  // 파일 처리 관련 실시간 이벤트
  file_upload_progress: (data: { fileId: string; progress: number }) => void;
  file_processing_started: (data: { fileId: string; type: string }) => void;
  file_processing_completed: (data: { fileId: string; result: any }) => void;
  file_processing_failed: (data: { fileId: string; error: string }) => void;

  // 시스템 알림
  system_notification: (data: { type: 'info' | 'warning' | 'error'; message: string; timestamp: Date }) => void;
  user_notification: (data: { userId: string; type: string; title: string; message: string }) => void;

  // 연결 상태 및 방 관리
  connection_established: (data: { userId: string; timestamp: Date }) => void;
  user_online: (data: { userId: string; userType: 'planner' | 'student' }) => void;
  user_offline: (data: { userId: string; userType: 'planner' | 'student' }) => void;
  user_status_updated: (data: { userId: string; status: string; timestamp: Date }) => void;
  user_joined_room: (data: { userId: string; roomId: string; timestamp: Date }) => void;
  user_left_room: (data: { userId: string; roomId: string; timestamp: Date }) => void;
}

export interface ClientToServerEvents {
  // 연결 관리
  authenticate: (data: { token: string }) => void;
  join_room: (data: { roomId: string; roomType: 'lesson' | 'homework' | 'user' }) => void;
  leave_room: (data: { roomId: string }) => void;

  // 수업 관리
  start_lesson: (data: { lessonId: string; studentIds: string[] }) => void;
  end_lesson: (data: { lessonId: string }) => void;
  pause_lesson: (data: { lessonId: string }) => void;
  resume_lesson: (data: { lessonId: string }) => void;

  // 실시간 상호작용
  typing_indicator: (data: { roomId: string; isTyping: boolean }) => void;
  live_audio_data: (data: { roomId: string; audioChunk: Buffer; timestamp: number }) => void;
  screen_share_start: (data: { roomId: string; streamId: string }) => void;
  screen_share_stop: (data: { roomId: string }) => void;

  // 상태 업데이트
  update_status: (data: { status: 'online' | 'away' | 'busy' | 'offline' }) => void;
  heartbeat: () => void;
}

export interface InterServerEvents {
  ping: () => void;
  user_connected: (data: { userId: string; socketId: string; server: string }) => void;
  user_disconnected: (data: { userId: string; socketId: string; server: string }) => void;
  broadcast_to_room: (data: { roomId: string; event: string; data: any }) => void;
}

export interface SocketData {
  userId: string;
  userType: 'planner' | 'student' | 'admin';
  authenticatedAt: Date;
  lastActivity: Date;
  rooms: string[];
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: 'web' | 'mobile' | 'tablet';
  };
}

export interface RoomData {
  roomId: string;
  roomType: 'lesson' | 'homework' | 'user' | 'system';
  participants: string[]; // userId array
  createdAt: Date;
  metadata?: {
    lessonId?: string;
    homeworkId?: string;
    plannerId?: string;
    studentIds?: string[];
  };
}

// 실시간 이벤트 데이터 타입
export interface LessonEventData {
  lessonId: string;
  plannerId: string;
  studentIds: string[];
  action: 'start' | 'end' | 'pause' | 'resume';
  timestamp: Date;
  metadata?: any;
}

export interface HomeworkEventData {
  homeworkId: string;
  submissionId?: string;
  studentId?: string;
  plannerId: string;
  action: 'assigned' | 'submitted' | 'graded' | 'due_soon' | 'overdue';
  timestamp: Date;
  data?: any;
}

export interface AnalysisEventData {
  analysisId: string;
  fileId: string;
  userId: string;
  type: 'pronunciation' | 'grammar' | 'fluency' | 'comprehension';
  stage: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  results?: any;
  error?: string;
  timestamp: Date;
}

export interface NotificationEventData {
  notificationId: string;
  recipientId: string;
  type: 'lesson' | 'homework' | 'feedback' | 'system' | 'achievement';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: any;
  timestamp: Date;
  expiresAt?: Date;
}

// 에러 타입
export interface SocketError {
  code: string;
  message: string;
  details?: any;
}

// 인증 관련 타입
export interface AuthenticationData {
  token: string;
  userId: string;
  userType: 'planner' | 'student' | 'admin';
  permissions: string[];
}

// 연결 상태 관리
export interface ConnectionState {
  isConnected: boolean;
  connectedAt?: Date;
  lastPing?: Date;
  reconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unstable';
}