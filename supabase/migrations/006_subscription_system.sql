-- 수강권 시스템 완전 재설계
-- 주차별 수강 빈도, 수업 시간, 결제 기간, 공휴일 및 연기 관리 포함

-- 수강권 타입 정의 (주차별 수강 빈도)
CREATE TYPE subscription_frequency AS ENUM (
    '주2회',   -- 주 2회 고정 요일
    '주3회',   -- 주 3회 고정 요일  
    '주5회',   -- 주 5회 (평일)
    '주6회',   -- 주 6회 (평일+토)
    '자율수강' -- 월 8회 또는 12회, 자유 요일/시간
);

-- 수업 시간 타입
CREATE TYPE lesson_duration AS ENUM (
    '25분',
    '50분'
);

-- 결제 기간 타입
CREATE TYPE payment_period AS ENUM (
    '1개월',
    '3개월', 
    '6개월',
    '12개월'
);

-- 수강권 상태
CREATE TYPE subscription_status AS ENUM (
    'active',    -- 활성
    'paused',    -- 일시정지
    'expired',   -- 만료
    'cancelled'  -- 취소
);

-- 연기 사유 타입
CREATE TYPE postponement_reason AS ENUM (
    'student_request', -- 학생 요청
    'holiday',         -- 공휴일
    'teacher_absence', -- 강사 부재
    'system_error'     -- 시스템 오류
);

-- 수강권 마스터 테이블
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 수강권 기본 정보
    subscription_name TEXT NOT NULL, -- 자동 생성: "주2회 25분 3개월권" 등
    frequency subscription_frequency NOT NULL,
    duration lesson_duration NOT NULL,
    payment_period payment_period NOT NULL,
    
    -- 자율수강 전용 필드
    flexible_lessons_per_month INT, -- 자율수강시 월 수업 횟수 (8 or 12)
    
    -- 날짜 및 기간
    start_date DATE NOT NULL,
    end_date DATE NOT NULL, -- 자동 계산
    
    -- 수업 횟수 계산
    total_lessons INT NOT NULL, -- 전체 수업 횟수
    completed_lessons INT DEFAULT 0, -- 완료된 수업 횟수
    remaining_lessons INT NOT NULL, -- 남은 수업 횟수
    
    -- 연기 관리
    postponements_used INT DEFAULT 0, -- 사용한 연기 횟수
    max_postponements INT DEFAULT 2, -- 최대 연기 횟수 (기본 12회당 2회)
    
    -- 금액 정보
    total_amount DECIMAL(10,2), -- 총 금액
    payment_amount DECIMAL(10,2), -- 결제 금액 (할인 적용 후)
    
    -- 상태
    status subscription_status DEFAULT 'active',
    
    -- 메타 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT -- 특이사항
);

-- 주별 고정 수업 스케줄 (주2회, 주3회, 주5회, 주6회용)
CREATE TABLE IF NOT EXISTS public.weekly_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    
    -- 요일 (1=월요일, 7=일요일)
    day_of_week INT CHECK (day_of_week >= 1 AND day_of_week <= 7),
    
    -- 시간 (HH:MM 형식)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- 활성화 여부
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 개별 수업 기록 테이블
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 수업 일정
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME NOT NULL,
    
    -- 실제 수업 시간
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- 수업 상태
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed', 'no_show')),
    
    -- 수업 내용
    lesson_content TEXT,
    homework_assigned TEXT,
    teacher_notes TEXT,
    student_feedback TEXT,
    
    -- 평가 (1-5점)
    teacher_rating INT CHECK (teacher_rating >= 1 AND teacher_rating <= 5),
    student_rating INT CHECK (student_rating >= 1 AND student_rating <= 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 연기 기록 테이블
CREATE TABLE IF NOT EXISTS public.postponements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    
    -- 원래 수업 일정
    original_date DATE NOT NULL,
    original_start_time TIME NOT NULL,
    
    -- 연기된 수업 일정 (NULL이면 아직 재스케줄링 안됨)
    rescheduled_date DATE,
    rescheduled_start_time TIME,
    
    -- 연기 사유
    reason postponement_reason NOT NULL,
    reason_detail TEXT,
    
    -- 요청자
    requested_by UUID REFERENCES auth.users(id), -- 연기 요청한 사용자
    
    -- 승인 정보
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 공휴일 관리 테이블
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- 공휴일 명칭
    date DATE NOT NULL UNIQUE,
    is_recurring BOOLEAN DEFAULT false, -- 매년 반복 여부
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 자율수강 예약 테이블 (자율수강용)
CREATE TABLE IF NOT EXISTS public.flexible_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 예약 일정
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- 예약 상태
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    
    -- 예약 제한 체크 (월별)
    booking_month DATE NOT NULL, -- 해당 월 (YYYY-MM-01 형식)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_subscriptions_student_id ON public.subscriptions(student_id);
CREATE INDEX idx_subscriptions_teacher_id ON public.subscriptions(teacher_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_dates ON public.subscriptions(start_date, end_date);

CREATE INDEX idx_weekly_schedules_subscription_id ON public.weekly_schedules(subscription_id);
CREATE INDEX idx_weekly_schedules_day_time ON public.weekly_schedules(day_of_week, start_time);

CREATE INDEX idx_lessons_subscription_id ON public.lessons(subscription_id);
CREATE INDEX idx_lessons_student_id ON public.lessons(student_id);
CREATE INDEX idx_lessons_teacher_id ON public.lessons(teacher_id);
CREATE INDEX idx_lessons_date ON public.lessons(scheduled_date);
CREATE INDEX idx_lessons_status ON public.lessons(status);

CREATE INDEX idx_postponements_lesson_id ON public.postponements(lesson_id);
CREATE INDEX idx_postponements_subscription_id ON public.postponements(subscription_id);

CREATE INDEX idx_holidays_date ON public.holidays(date);

CREATE INDEX idx_flexible_bookings_subscription_id ON public.flexible_bookings(subscription_id);
CREATE INDEX idx_flexible_bookings_month ON public.flexible_bookings(booking_month);
CREATE INDEX idx_flexible_bookings_date ON public.flexible_bookings(booking_date);

-- RLS 정책 설정
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postponements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flexible_bookings ENABLE ROW LEVEL SECURITY;

-- Subscriptions 정책
CREATE POLICY "Teachers can view their students' subscriptions"
  ON public.subscriptions FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can create subscriptions for their students"
  ON public.subscriptions FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their students' subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s 
      WHERE s.id = subscriptions.student_id 
      AND s.user_id = auth.uid()
    )
  );

-- Weekly schedules 정책
CREATE POLICY "Teachers can manage weekly schedules"
  ON public.weekly_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s 
      WHERE s.id = weekly_schedules.subscription_id 
      AND s.teacher_id = auth.uid()
    )
  );

-- Lessons 정책
CREATE POLICY "Teachers can manage lessons"
  ON public.lessons FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their lessons"
  ON public.lessons FOR SELECT
  USING (student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  ));

-- Postponements 정책
CREATE POLICY "Teachers and students can view postponements"
  ON public.postponements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.students s ON l.student_id = s.id
      WHERE l.id = postponements.lesson_id 
      AND (l.teacher_id = auth.uid() OR s.user_id = auth.uid())
    )
  );

CREATE POLICY "Teachers and students can request postponements"
  ON public.postponements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.students s ON l.student_id = s.id
      WHERE l.id = postponements.lesson_id 
      AND (l.teacher_id = auth.uid() OR s.user_id = auth.uid())
    )
  );

-- Holidays 정책 (모든 인증된 사용자가 조회 가능)
CREATE POLICY "Authenticated users can view holidays"
  ON public.holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage holidays"
  ON public.holidays FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_profiles 
      WHERE id = auth.uid()
    )
  );

-- Flexible bookings 정책
CREATE POLICY "Teachers can manage flexible bookings"
  ON public.flexible_bookings FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their flexible bookings"
  ON public.flexible_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = flexible_bookings.student_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can create their flexible bookings"
  ON public.flexible_bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = flexible_bookings.student_id
      AND s.user_id = auth.uid()
    )
  );

-- 업데이트 트리거 추가
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flexible_bookings_updated_at
  BEFORE UPDATE ON public.flexible_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();