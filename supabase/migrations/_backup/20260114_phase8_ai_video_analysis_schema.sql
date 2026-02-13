-- ============================================================================
-- Phase 8.1: AI Video Analysis System - Database Schema
-- Created: 2026-01-14
-- Purpose: Create tables for planner API keys, video uploads, and AI analyses
-- ============================================================================

-- ============================================================================
-- Table 1: planner_api_keys - API Key Management
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.planner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_type TEXT NOT NULL CHECK (api_key_type IN ('openai', 'anthropic', 'google', 'custom')),
  encrypted_api_key TEXT NOT NULL, -- 암호화된 API 키
  key_name TEXT, -- 사용자 지정 이름 (예: "내 OpenAI 키")
  is_active BOOLEAN DEFAULT true,
  usage_limit_monthly INTEGER, -- 월간 사용량 제한 (선택사항)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(planner_id, key_name)
);

-- RLS 정책
ALTER TABLE public.planner_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners can manage their own API keys"
  ON public.planner_api_keys
  FOR ALL
  USING (planner_id = auth.uid());

-- 인덱스
CREATE INDEX idx_planner_api_keys_planner_id ON public.planner_api_keys(planner_id);
CREATE INDEX idx_planner_api_keys_is_active ON public.planner_api_keys(planner_id, is_active);

-- ============================================================================
-- Table 2: lesson_videos - Video Upload Metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lesson_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.student_profiles(id) ON DELETE SET NULL, -- 특정 학생의 수업 (선택사항)
  course_id UUID REFERENCES public.student_courses(id) ON DELETE SET NULL, -- 연결된 수강과정 (선택사항)

  -- 영상 정보
  video_title TEXT NOT NULL,
  video_description TEXT,
  original_filename TEXT NOT NULL,
  file_size_mb NUMERIC(10, 2), -- 원본 파일 크기
  video_duration_seconds INTEGER, -- 영상 길이 (초)
  upload_date TIMESTAMPTZ DEFAULT now(),

  -- 처리 상태
  processing_status TEXT CHECK (processing_status IN ('uploaded', 'extracting_audio', 'compressing', 'analyzing', 'completed', 'failed')) DEFAULT 'uploaded',
  error_message TEXT, -- 실패 시 오류 메시지

  -- 저장 경로
  video_storage_path TEXT, -- Supabase Storage 경로
  audio_storage_path TEXT, -- 추출된 오디오 파일 경로
  compressed_audio_size_mb NUMERIC(10, 2), -- 압축된 오디오 크기

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책
ALTER TABLE public.lesson_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners can manage their lesson videos"
  ON public.lesson_videos
  FOR ALL
  USING (planner_id = auth.uid());

CREATE POLICY "Students can view their lesson videos"
  ON public.lesson_videos
  FOR SELECT
  USING (student_id = auth.uid());

-- 인덱스
CREATE INDEX idx_lesson_videos_planner_id ON public.lesson_videos(planner_id);
CREATE INDEX idx_lesson_videos_student_id ON public.lesson_videos(student_id);
CREATE INDEX idx_lesson_videos_course_id ON public.lesson_videos(course_id);
CREATE INDEX idx_lesson_videos_processing_status ON public.lesson_videos(processing_status);

-- ============================================================================
-- Table 3: ai_lesson_analyses - AI Analysis Results
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_lesson_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_video_id UUID NOT NULL REFERENCES public.lesson_videos(id) ON DELETE CASCADE,
  planner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- AI 분석 메타데이터
  analysis_model_1 TEXT, -- 첫 번째 AI 모델 (예: "gpt-4-turbo")
  analysis_model_2 TEXT, -- 두 번째 AI 모델 (예: "claude-3-opus")
  analysis_date TIMESTAMPTZ DEFAULT now(),
  processing_time_seconds INTEGER, -- 분석 소요 시간

  -- 분석 결과
  lesson_summary TEXT NOT NULL, -- 수업 내용 요약
  student_strengths TEXT[], -- 학생의 강점 (배열)
  student_weaknesses TEXT[], -- 학생의 약점 (배열)
  recommended_homework JSONB, -- 추천 숙제 정보 { title, description, difficulty, focus_areas[] }

  -- 상세 분석 (선택사항)
  detailed_feedback JSONB, -- 세부 피드백 데이터
  transcript TEXT, -- 수업 대화 전사 내용 (선택사항)
  key_moments JSONB[], -- 중요 순간 타임스탬프 및 설명

  -- API 비용 추적
  api_1_tokens_used INTEGER, -- 첫 번째 API 토큰 사용량
  api_2_tokens_used INTEGER, -- 두 번째 API 토큰 사용량
  estimated_cost_usd NUMERIC(10, 4), -- 예상 비용

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책
ALTER TABLE public.ai_lesson_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners can manage their analyses"
  ON public.ai_lesson_analyses
  FOR ALL
  USING (planner_id = auth.uid());

-- 인덱스
CREATE INDEX idx_ai_lesson_analyses_video_id ON public.ai_lesson_analyses(lesson_video_id);
CREATE INDEX idx_ai_lesson_analyses_planner_id ON public.ai_lesson_analyses(planner_id);
CREATE INDEX idx_ai_lesson_analyses_analysis_date ON public.ai_lesson_analyses(analysis_date);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- 테이블 생성 확인
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('planner_api_keys', 'lesson_videos', 'ai_lesson_analyses');

-- RLS 정책 확인
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('planner_api_keys', 'lesson_videos', 'ai_lesson_analyses');

-- 인덱스 확인
-- SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('planner_api_keys', 'lesson_videos', 'ai_lesson_analyses');
