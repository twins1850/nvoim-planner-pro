-- ============================================
-- 앤보임 플래너 프로 - 성능 최적화 마이그레이션
-- 실행 날짜: 2026-02-10
-- 목적: 로딩 속도 개선, RLS 최적화, 인덱스 추가
-- ============================================

-- ==========================================
-- PART 1: 핵심 인덱스 추가
-- ==========================================

-- profiles 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role IS NOT NULL;

-- student_profiles 테이블 인덱스 (자주 조회되는 컬럼)
CREATE INDEX IF NOT EXISTS idx_student_profiles_planner_id ON public.student_profiles(planner_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON public.student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_full_name ON public.student_profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_student_profiles_level ON public.student_profiles(level) WHERE level IS NOT NULL;

-- students 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_students_invite_code ON public.students(invite_code) WHERE invite_code IS NOT NULL;

-- lessons 테이블 인덱스 (이미 추가된 것 외 추가)
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON public.lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_planner_status ON public.lessons(planner_id, lesson_status);

-- subscriptions 테이블 인덱스 (조건부 생성)
DO $$
BEGIN
    -- Check if student_id column exists (lesson subscription system)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'student_id') THEN
        CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON public.subscriptions(student_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_teacher_id ON public.subscriptions(teacher_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON public.subscriptions(start_date, end_date);
    END IF;

    -- Check if user_id column exists (planner subscription system)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
    END IF;

    -- Status column exists in both versions
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status) WHERE status = 'active';
END $$;

-- homework 테이블 인덱스 (조건부 생성)
DO $$
BEGIN
    -- Check if teacher_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'teacher_id') THEN
        CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON public.homework(teacher_id);
    END IF;

    -- Check if planner_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'planner_id') THEN
        CREATE INDEX IF NOT EXISTS idx_homework_planner_id ON public.homework(planner_id);
    END IF;

    -- created_at should exist in both versions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_homework_created_at ON public.homework(created_at DESC);
    END IF;
END $$;

-- homework_assignments 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_homework_assignments_student_id ON public.homework_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_status ON public.homework_assignments(status);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_homework_student ON public.homework_assignments(homework_id, student_id);

-- homework_submissions 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id ON public.homework_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_assignment_id ON public.homework_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_submitted_at ON public.homework_submissions(submitted_at DESC);

-- notifications 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- messages 테이블 인덱스 (조건부 생성)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        -- Check which column name is used (receiver_id or recipient_id)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
            CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'receiver_id') THEN
            CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id') THEN
            CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
        END IF;
    END IF;
END $$;

-- licenses 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_licenses_planner_id ON public.licenses(planner_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON public.licenses(license_key) WHERE license_key IS NOT NULL;

-- ==========================================
-- PART 2: RLS 정책 최적화
-- ==========================================

-- student_profiles RLS 정책 최적화
DROP POLICY IF EXISTS "Planners can view their students" ON public.student_profiles;
DROP POLICY IF EXISTS "Planners can update their students" ON public.student_profiles;
DROP POLICY IF EXISTS "Planners can delete their students" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;

CREATE POLICY "Planners can view their students"
ON public.student_profiles FOR SELECT
TO authenticated
USING (planner_id = auth.uid());

CREATE POLICY "Planners can update their students"
ON public.student_profiles FOR UPDATE
TO authenticated
USING (planner_id = auth.uid())
WITH CHECK (planner_id = auth.uid());

CREATE POLICY "Planners can delete their students"
ON public.student_profiles FOR DELETE
TO authenticated
USING (planner_id = auth.uid());

CREATE POLICY "Students can view own profile"
ON public.student_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- subscriptions RLS 정책 최적화 (조건부 생성)
DO $$
BEGIN
    -- Check if this is the lesson subscription system (has teacher_id)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'teacher_id') THEN
        DROP POLICY IF EXISTS "Teachers can view their students' subscriptions" ON public.subscriptions;
        DROP POLICY IF EXISTS "Teachers can create subscriptions for their students" ON public.subscriptions;
        DROP POLICY IF EXISTS "Teachers can update their students' subscriptions" ON public.subscriptions;

        CREATE POLICY "Teachers can view their students' subscriptions"
        ON public.subscriptions FOR SELECT
        TO authenticated
        USING (teacher_id = auth.uid());

        CREATE POLICY "Teachers can create subscriptions for their students"
        ON public.subscriptions FOR INSERT
        TO authenticated
        WITH CHECK (teacher_id = auth.uid());

        CREATE POLICY "Teachers can update their students' subscriptions"
        ON public.subscriptions FOR UPDATE
        TO authenticated
        USING (teacher_id = auth.uid())
        WITH CHECK (teacher_id = auth.uid());
    END IF;
END $$;

-- homework RLS 정책 최적화 (조건부 생성)
DO $$
BEGIN
    -- Check if teacher_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'teacher_id') THEN
        DROP POLICY IF EXISTS "Teachers can manage their homework" ON public.homework;

        CREATE POLICY "Teachers can manage their homework"
        ON public.homework FOR ALL
        TO authenticated
        USING (teacher_id = auth.uid())
        WITH CHECK (teacher_id = auth.uid());
    END IF;

    -- Check if planner_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'planner_id') THEN
        DROP POLICY IF EXISTS "Planners can manage their homework" ON public.homework;

        CREATE POLICY "Planners can manage their homework"
        ON public.homework FOR ALL
        TO authenticated
        USING (planner_id = auth.uid())
        WITH CHECK (planner_id = auth.uid());
    END IF;
END $$;

-- ==========================================
-- PART 3: 데이터베이스 함수 생성 (복잡한 쿼리 최적화)
-- ==========================================

-- 플래너의 학생 요약 정보 가져오기 (대시보드용) - 조건부 생성
DO $$
BEGIN
    -- Check if homework table has teacher_id or planner_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'teacher_id') THEN
        -- Version with teacher_id
        CREATE OR REPLACE FUNCTION get_planner_dashboard_stats(planner_uuid UUID)
        RETURNS TABLE(
          total_students BIGINT,
          active_students BIGINT,
          total_lessons_today BIGINT,
          pending_homework BIGINT
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        BEGIN
          RETURN QUERY
          SELECT
            (SELECT COUNT(*) FROM public.student_profiles WHERE planner_id = planner_uuid)::BIGINT,
            (SELECT COUNT(*) FROM public.student_profiles WHERE planner_id = planner_uuid)::BIGINT,
            (SELECT COUNT(*) FROM public.lessons WHERE planner_id = planner_uuid AND lesson_date = CURRENT_DATE)::BIGINT,
            (SELECT COUNT(*) FROM public.homework_assignments ha
             JOIN public.homework h ON ha.homework_id = h.id
             WHERE h.teacher_id = planner_uuid AND ha.status = 'pending')::BIGINT;
        END;
        $func$;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'planner_id') THEN
        -- Version with planner_id
        CREATE OR REPLACE FUNCTION get_planner_dashboard_stats(planner_uuid UUID)
        RETURNS TABLE(
          total_students BIGINT,
          active_students BIGINT,
          total_lessons_today BIGINT,
          pending_homework BIGINT
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        BEGIN
          RETURN QUERY
          SELECT
            (SELECT COUNT(*) FROM public.student_profiles WHERE planner_id = planner_uuid)::BIGINT,
            (SELECT COUNT(*) FROM public.student_profiles WHERE planner_id = planner_uuid)::BIGINT,
            (SELECT COUNT(*) FROM public.lessons WHERE planner_id = planner_uuid AND lesson_date = CURRENT_DATE)::BIGINT,
            (SELECT COUNT(*) FROM public.homework_assignments ha
             JOIN public.homework h ON ha.homework_id = h.id
             WHERE h.planner_id = planner_uuid AND ha.status = 'pending')::BIGINT;
        END;
        $func$;
    ELSE
        -- Fallback version without homework count
        CREATE OR REPLACE FUNCTION get_planner_dashboard_stats(planner_uuid UUID)
        RETURNS TABLE(
          total_students BIGINT,
          active_students BIGINT,
          total_lessons_today BIGINT,
          pending_homework BIGINT
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        BEGIN
          RETURN QUERY
          SELECT
            (SELECT COUNT(*) FROM public.student_profiles WHERE planner_id = planner_uuid)::BIGINT,
            (SELECT COUNT(*) FROM public.student_profiles WHERE planner_id = planner_uuid)::BIGINT,
            (SELECT COUNT(*) FROM public.lessons WHERE planner_id = planner_uuid AND lesson_date = CURRENT_DATE)::BIGINT,
            0::BIGINT;
        END;
        $func$;
    END IF;
END $$;

-- 학생의 상세 정보 가져오기 (JOIN 최적화)
CREATE OR REPLACE FUNCTION get_student_detail(student_uuid UUID, planner_uuid UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  level TEXT,
  native_teacher_name TEXT,
  active_subscriptions BIGINT,
  total_lessons BIGINT,
  completed_homework BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.full_name,
    sp.email,
    sp.phone,
    sp.level,
    sp.native_teacher_name,
    (SELECT COUNT(*) FROM public.subscriptions WHERE student_id = student_uuid AND status = 'active')::BIGINT,
    (SELECT COUNT(*) FROM public.lessons WHERE student_id = student_uuid)::BIGINT,
    (SELECT COUNT(*) FROM public.homework_assignments ha
     JOIN public.homework h ON ha.homework_id = h.id
     WHERE ha.student_id = student_uuid AND ha.status = 'completed')::BIGINT
  FROM public.student_profiles sp
  WHERE sp.id = student_uuid AND sp.planner_id = planner_uuid;
END;
$$;

-- 오늘의 수업 목록 가져오기 (최적화)
CREATE OR REPLACE FUNCTION get_today_lessons(planner_uuid UUID, lesson_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  lesson_id UUID,
  student_id UUID,
  student_name TEXT,
  teacher_name TEXT,
  lesson_title TEXT,
  start_time TIME,
  end_time TIME,
  lesson_status TEXT,
  attendance_status TEXT,
  student_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.student_id,
    sp.full_name,
    sp.native_teacher_name,
    l.title,
    l.start_time,
    l.end_time,
    l.lesson_status,
    l.attendance_status,
    sp.level
  FROM public.lessons l
  LEFT JOIN public.student_profiles sp ON l.student_id = sp.id
  WHERE l.planner_id = planner_uuid
    AND l.lesson_date = lesson_date
  ORDER BY l.start_time ASC;
END;
$$;

-- ==========================================
-- PART 4: 통계 업데이트 (쿼리 플래너 최적화)
-- ==========================================

-- 통계 업데이트 (쿼리 성능 향상)
ANALYZE public.profiles;
ANALYZE public.student_profiles;
ANALYZE public.planner_profiles;
ANALYZE public.lessons;
ANALYZE public.subscriptions;
ANALYZE public.homework;
ANALYZE public.homework_assignments;
ANALYZE public.homework_submissions;
ANALYZE public.notifications;
ANALYZE public.licenses;

-- ==========================================
-- PART 5: 자동 VACUUM 설정 조정
-- ==========================================

-- 자주 업데이트되는 테이블의 autovacuum 설정 최적화
ALTER TABLE public.student_profiles SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE public.lessons SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE public.subscriptions SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE public.homework_assignments SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- ==========================================
-- 최적화 완료 확인
-- ==========================================

SELECT
  '인덱스 생성' AS step,
  COUNT(*) AS count
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT
  'RLS 정책' AS step,
  COUNT(*) AS count
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
  '최적화 함수' AS step,
  COUNT(*) AS count
FROM pg_proc
WHERE proname IN ('get_planner_dashboard_stats', 'get_student_detail', 'get_today_lessons')

UNION ALL

SELECT
  '테이블 분석 완료' AS step,
  COUNT(*) AS count
FROM pg_stat_user_tables
WHERE schemaname = 'public';
