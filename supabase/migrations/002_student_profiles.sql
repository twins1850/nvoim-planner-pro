-- 학생 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  birth_date DATE,
  level TEXT DEFAULT '1',
  parent_name TEXT,
  parent_phone TEXT,
  address TEXT,
  notes TEXT,
  planner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 강사 프로필 테이블 생성  
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  organization TEXT,
  bio TEXT,
  avatar_url TEXT,
  api_key TEXT,
  openai_api_key TEXT,
  azure_api_key TEXT,
  max_students INT DEFAULT 30,
  subscription_status TEXT DEFAULT 'trial',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 학생 테이블 (강사가 관리하는 학생 정보)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  level TEXT DEFAULT 'Intermediate',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
  invite_code TEXT,
  is_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_lesson_date TIMESTAMP WITH TIME ZONE,
  total_lessons INT DEFAULT 0,
  completion_rate INT DEFAULT 0
);

-- 숙제 테이블
CREATE TABLE IF NOT EXISTS public.homework (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'speaking',
  difficulty TEXT DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'late')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 숙제 제출 테이블
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text TEXT,
  audio_url TEXT,
  video_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_feedback JSONB,
  teacher_feedback TEXT,
  score INT,
  status TEXT DEFAULT 'submitted'
);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- 학생 프로필 정책
CREATE POLICY "Users can view own profile"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 강사 프로필 정책
CREATE POLICY "Teachers can view own profile"
  ON public.teacher_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Teachers can update own profile"
  ON public.teacher_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Teachers can insert own profile"
  ON public.teacher_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 학생 관리 정책
CREATE POLICY "Teachers can view their students"
  ON public.students FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert students"
  ON public.students FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their students"
  ON public.students FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their students"
  ON public.students FOR DELETE
  USING (teacher_id = auth.uid());

-- 숙제 정책
CREATE POLICY "Teachers can manage their homework"
  ON public.homework FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view assigned homework"
  ON public.homework FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = homework.student_id
      AND students.user_id = auth.uid()
    )
  );

-- 숙제 제출 정책
CREATE POLICY "Students can submit homework"
  ON public.homework_submissions FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own submissions"
  ON public.homework_submissions FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view student submissions"
  ON public.homework_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_submissions.homework_id
      AND h.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can grade submissions"
  ON public.homework_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_submissions.homework_id
      AND h.teacher_id = auth.uid()
    )
  );

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_student_profiles_planner_id ON public.student_profiles(planner_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON public.homework(teacher_id);
CREATE INDEX IF NOT EXISTS idx_homework_student_id ON public.homework(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_homework_id ON public.homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id ON public.homework_submissions(student_id);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 업데이트 트리거 적용
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_profiles_updated_at
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();