// Database types generated from Supabase schema

export type UserRole = 'planner' | 'student';
export type HomeworkStatus = 'pending' | 'submitted' | 'reviewed' | 'completed';
export type SubmissionType = 'text' | 'audio' | 'video' | 'file';
export type NotificationType = 'homework_assigned' | 'homework_submitted' | 'feedback_received' | 'message' | 'system';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlannerProfile {
  id: string;
  bio?: string;
  specialization?: string[];
  years_of_experience?: number;
  rating?: number;
  total_students: number;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  planner_id?: string;
  level?: string;
  learning_goals?: string[];
  preferred_learning_style?: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  planner_id: string;
  name: string;
  description?: string;
  schedule?: any; // JSONB
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  is_active: boolean;
}

export interface Lesson {
  id: string;
  class_id?: string;
  planner_id: string;
  title: string;
  description?: string;
  content?: any; // JSONB
  scheduled_at?: string;
  duration_minutes?: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Homework {
  id: string;
  lesson_id?: string;
  planner_id: string;
  title: string;
  description?: string;
  instructions?: string;
  resources?: any; // JSONB
  due_date?: string;
  estimated_time_minutes?: number;
  max_score?: number;
  created_at: string;
  updated_at: string;
}

export interface HomeworkAssignment {
  id: string;
  homework_id: string;
  student_id: string;
  assigned_at: string;
  status: HomeworkStatus;
}

export interface HomeworkSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_type: SubmissionType;
  content?: string;
  file_url?: string;
  metadata?: any; // JSONB
  submitted_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  submission_id: string;
  planner_id: string;
  score?: number;
  comments?: string;
  audio_feedback_url?: string;
  strengths?: string[];
  areas_for_improvement?: string[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  class_id?: string;
  content: string;
  attachments?: any; // JSONB
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: any; // JSONB
  is_read: boolean;
  created_at: string;
}

export interface ProgressTracking {
  id: string;
  student_id: string;
  lesson_id?: string;
  homework_id?: string;
  skill_area?: string;
  score?: number;
  notes?: string;
  recorded_at: string;
}

export interface StudyMaterial {
  id: string;
  planner_id: string;
  title: string;
  description?: string;
  type?: string;
  file_url?: string;
  tags?: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialAccess {
  id: string;
  material_id: string;
  class_id?: string;
  student_id?: string;
  granted_at: string;
}

export interface Attendance {
  id: string;
  lesson_id: string;
  student_id: string;
  is_present: boolean;
  check_in_time?: string;
  notes?: string;
  created_at: string;
}