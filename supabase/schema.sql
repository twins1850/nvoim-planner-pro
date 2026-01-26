-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('planner', 'student');
CREATE TYPE homework_status AS ENUM ('pending', 'submitted', 'reviewed', 'completed');
CREATE TYPE submission_type AS ENUM ('text', 'audio', 'video', 'file');
CREATE TYPE notification_type AS ENUM ('homework_assigned', 'homework_submitted', 'feedback_received', 'message', 'system');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trial');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planner profiles (additional info for planners)
CREATE TABLE public.planner_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bio TEXT,
    specialization TEXT[],
    years_of_experience INTEGER,
    rating DECIMAL(3,2),
    total_students INTEGER DEFAULT 0,
    invite_code TEXT UNIQUE,
    is_accepting_students BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student profiles (additional info for students)
CREATE TABLE public.student_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    planner_id UUID REFERENCES public.profiles(id),
    level TEXT,
    learning_goals TEXT[],
    preferred_learning_style TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions Table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type subscription_plan DEFAULT 'free',
    status subscription_status DEFAULT 'active',
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    max_students INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Classes/Groups
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    schedule JSONB, -- Store recurring schedule info
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class enrollments
CREATE TABLE public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(class_id, student_id)
);

-- Lessons
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.classes(id),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    content JSONB, -- Store lesson materials, links, etc.
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework assignments
CREATE TABLE public.homework (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES public.lessons(id),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    resources JSONB, -- Links, files, etc.
    due_date TIMESTAMPTZ,
    estimated_time_minutes INTEGER,
    max_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework assignments to students (many-to-many)
CREATE TABLE public.homework_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status homework_status DEFAULT 'pending',
    UNIQUE(homework_id, student_id)
);

-- Homework submissions
CREATE TABLE public.homework_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.homework_assignments(id),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    submission_type submission_type NOT NULL,
    content TEXT, -- For text submissions
    file_url TEXT, -- For file/audio/video submissions
    metadata JSONB, -- Additional data like duration, file size, etc.
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback on submissions
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.homework_submissions(id),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    score INTEGER,
    comments TEXT,
    audio_feedback_url TEXT,
    strengths TEXT[],
    areas_for_improvement TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages/Chat
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    receiver_id UUID REFERENCES public.profiles(id), -- NULL for group messages
    class_id UUID REFERENCES public.classes(id), -- For class-wide messages
    content TEXT NOT NULL,
    attachments JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB, -- Additional context data
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning progress tracking
CREATE TABLE public.progress_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    lesson_id UUID REFERENCES public.lessons(id),
    homework_id UUID REFERENCES public.homework(id),
    skill_area TEXT,
    score DECIMAL(5,2),
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study materials/Resources
CREATE TABLE public.study_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT, -- 'document', 'video', 'audio', 'link'
    file_url TEXT,
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material access permissions
CREATE TABLE public.material_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id),
    student_id UUID REFERENCES public.profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(material_id, class_id, student_id)
);

-- Attendance records
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    is_present BOOLEAN DEFAULT false,
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_student_profiles_planner ON public.student_profiles(planner_id);
CREATE INDEX idx_planner_invite_code ON public.planner_profiles(invite_code);
CREATE INDEX idx_classes_planner ON public.classes(planner_id);
CREATE INDEX idx_homework_planner ON public.homework(planner_id);
CREATE INDEX idx_homework_due_date ON public.homework(due_date);
CREATE INDEX idx_homework_assignments_student ON public.homework_assignments(student_id);
CREATE INDEX idx_homework_assignments_status ON public.homework_assignments(status);
CREATE INDEX idx_submissions_student ON public.homework_submissions(student_id);
CREATE INDEX idx_feedback_submission ON public.feedback(submission_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_progress_student ON public.progress_tracking(student_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Planners can view student profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = profiles.id
            AND sp.planner_id = auth.uid()
        )
    );

-- Student Profiles policies (새로 추가!)
CREATE POLICY "Planners can view their students' profiles" ON public.student_profiles
    FOR SELECT USING (planner_id = auth.uid());

CREATE POLICY "Students can view their own profile" ON public.student_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Planners can manage their students' profiles" ON public.student_profiles
    FOR ALL USING (planner_id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Classes policies
CREATE POLICY "Planners can manage their own classes" ON public.classes
    FOR ALL USING (planner_id = auth.uid());

CREATE POLICY "Students can view their enrolled classes" ON public.classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_enrollments ce
            WHERE ce.class_id = classes.id
            AND ce.student_id = auth.uid()
        )
    );

-- Homework policies
CREATE POLICY "Planners can manage their homework" ON public.homework
    FOR ALL USING (planner_id = auth.uid());

CREATE POLICY "Students can view assigned homework" ON public.homework
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.homework_assignments ha
            WHERE ha.homework_id = homework.id
            AND ha.student_id = auth.uid()
        )
    );

-- Homework Assignments policies
CREATE POLICY "Students can view their homework assignments" ON public.homework_assignments
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Planners can view homework assignments they created" ON public.homework_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.homework h
            WHERE h.id = homework_assignments.homework_id
            AND h.planner_id = auth.uid()
        )
    );

CREATE POLICY "Planners can create homework assignments" ON public.homework_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.homework h
            WHERE h.id = homework_id
            AND h.planner_id = auth.uid()
        )
    );

CREATE POLICY "Planners can update homework assignments" ON public.homework_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.homework h
            WHERE h.id = homework_assignments.homework_id
            AND h.planner_id = auth.uid()
        )
    );

CREATE POLICY "Planners can delete homework assignments" ON public.homework_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.homework h
            WHERE h.id = homework_assignments.homework_id
            AND h.planner_id = auth.uid()
        )
    );

-- Submissions policies
CREATE POLICY "Students can manage their submissions" ON public.homework_submissions
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Planners can view student submissions" ON public.homework_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.homework_assignments ha
            JOIN public.homework h ON ha.homework_id = h.id
            WHERE ha.id = homework_submissions.assignment_id
            AND h.planner_id = auth.uid()
        )
    );

-- Messages policies
CREATE POLICY "Users can view their messages" ON public.messages
    FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Planners can send notifications to students" ON public.notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = user_id
            AND sp.planner_id = auth.uid()
        )
    );

-- Create functions for common operations

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planner_profiles_updated_at BEFORE UPDATE ON public.planner_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON public.homework
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.homework_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.study_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC Function for Student Onboarding (linking to planner)
-- ============================================================================
-- 학생 연결 함수 (라이선스 기반 학생수 제한 적용)
-- 학생 앱에서 초대코드로 플래너와 연결 시 사용
-- ============================================================================
CREATE OR REPLACE FUNCTION connect_student_with_info(
    invite_code_input TEXT,
    student_name TEXT,
    student_phone TEXT,
    student_email TEXT
)
RETURNS json AS $$
DECLARE
    target_planner_id UUID;
    active_license_record RECORD;
    current_student_count INTEGER;
    current_user_id UUID;
BEGIN
    -- 1. 현재 사용자 ID 가져오기
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
    END IF;

    -- 2. planner_profiles에서 초대코드로 플래너 찾기
    SELECT id INTO target_planner_id
    FROM public.planner_profiles
    WHERE invite_code = invite_code_input;

    IF target_planner_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid invite code'
        );
    END IF;

    -- 3. 플래너의 활성 라이선스 확인
    SELECT * INTO active_license_record
    FROM public.licenses
    WHERE planner_id = target_planner_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- 라이선스 없음
    IF active_license_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Planner license not found or expired'
        );
    END IF;

    -- 라이선스 만료 확인
    IF active_license_record.expires_at IS NOT NULL AND active_license_record.expires_at < NOW() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Planner license has expired'
        );
    END IF;

    -- 4. 현재 학생 수 카운트
    SELECT COUNT(*) INTO current_student_count
    FROM public.student_profiles
    WHERE planner_id = target_planner_id;

    -- 5. 학생수 제한 체크 (실시간 차단)
    IF current_student_count >= active_license_record.max_students THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Planner has reached maximum student capacity (' ||
                       active_license_record.max_students || ' students)',
            'current_count', current_student_count,
            'max_students', active_license_record.max_students
        );
    END IF;

    -- 6. student_profiles에 플래너 연결 및 학생 정보 업데이트
    INSERT INTO public.student_profiles (
        id,
        planner_id,
        full_name,
        email,
        phone,
        level,
        created_at,
        updated_at
    ) VALUES (
        current_user_id,
        target_planner_id,
        student_name,
        student_email,
        student_phone,
        '1',  -- 기본 레벨
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        planner_id = target_planner_id,
        full_name = student_name,
        email = student_email,
        phone = student_phone,
        level = '1',
        updated_at = NOW();

    -- 7. profiles 테이블도 업데이트 (full_name, phone 동기화)
    UPDATE public.profiles
    SET full_name = student_name,
        phone = student_phone,
        updated_at = NOW()
    WHERE id = current_user_id;

    -- 8. 성공 응답 반환
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully connected to planner',
        'planner_id', target_planner_id,
        'student_count', current_student_count + 1,
        'max_students', active_license_record.max_students,
        'remaining_slots', active_license_record.max_students - current_student_count - 1
    );

EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Connection failed: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION connect_student_with_info(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 수강과정 이력 관리 시스템 (Course History Management System)
-- =============================================================================

-- 현재 활성 수강과정 테이블
CREATE TABLE public.student_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    planner_id UUID NOT NULL REFERENCES public.planner_profiles(id) ON DELETE CASCADE,
    
    -- 과정 정보
    course_name TEXT NOT NULL,
    course_category TEXT NOT NULL, -- 정규통합과정, 회화, 비즈니스 등
    course_description TEXT,
    course_level TEXT NOT NULL,
    course_duration TEXT,
    
    -- 일정 정보
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- NULL이면 진행중
    estimated_end_date DATE, -- 예상 종료일
    
    -- 진행 상황
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'switched', 'dropped', 'paused')),
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- 플래너 메모
    planner_notes TEXT,
    learning_goals TEXT, -- 학습 목표
    special_notes TEXT,  -- 특이사항
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 수강과정 이력 테이블 (과정 변경/완료 시 자동 저장)
CREATE TABLE public.course_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    planner_id UUID NOT NULL REFERENCES public.planner_profiles(id) ON DELETE CASCADE,
    
    -- 과정 정보
    course_name TEXT NOT NULL,
    course_category TEXT NOT NULL,
    course_description TEXT,
    course_level TEXT NOT NULL,
    course_duration TEXT,
    
    -- 기간 정보
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_weeks INT, -- 실제 수강 주차
    
    -- 완료 상태
    completion_status TEXT NOT NULL CHECK (completion_status IN ('completed', 'switched', 'dropped')),
    completion_percentage INT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- 다음 과정 정보 (진급한 경우)
    next_course_name TEXT,
    next_course_category TEXT,
    progression_reason TEXT, -- 진급/변경 사유
    
    -- 플래너 기록
    planner_notes TEXT,
    learning_goals TEXT,
    achievement_summary TEXT, -- 성취도 요약
    recommendations TEXT,     -- 추천사항
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 과정 추천 로그 테이블 (AI 추천 기록)
CREATE TABLE public.course_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    planner_id UUID NOT NULL REFERENCES public.planner_profiles(id) ON DELETE CASCADE,
    
    -- 추천 정보
    recommended_courses JSONB NOT NULL, -- 추천 과정들 (배열)
    recommendation_reason TEXT,         -- 추천 사유
    current_course_context JSONB,      -- 현재 과정 컨텍스트
    learning_history_context JSONB,    -- 학습 이력 컨텍스트
    
    -- 추천 결과
    was_accepted BOOLEAN,
    accepted_course_name TEXT,
    planner_feedback TEXT,
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_student_courses_student_id ON public.student_courses(student_id);
CREATE INDEX idx_student_courses_planner_id ON public.student_courses(planner_id);
CREATE INDEX idx_student_courses_status ON public.student_courses(status);
CREATE INDEX idx_student_courses_dates ON public.student_courses(start_date, end_date);

CREATE INDEX idx_course_history_student_id ON public.course_history(student_id);
CREATE INDEX idx_course_history_planner_id ON public.course_history(planner_id);
CREATE INDEX idx_course_history_dates ON public.course_history(start_date, end_date);
CREATE INDEX idx_course_history_completion ON public.course_history(completion_status);

CREATE INDEX idx_course_recommendations_student_id ON public.course_recommendations(student_id);
CREATE INDEX idx_course_recommendations_planner_id ON public.course_recommendations(planner_id);
CREATE INDEX idx_course_recommendations_created ON public.course_recommendations(created_at);

-- RLS 정책 활성화
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_recommendations ENABLE ROW LEVEL SECURITY;

-- student_courses RLS 정책
CREATE POLICY "Planners can manage their students' courses"
    ON public.student_courses FOR ALL
    USING (planner_id = auth.uid());

CREATE POLICY "Students can view their own courses"
    ON public.student_courses FOR SELECT
    USING (student_id IN (
        SELECT id FROM public.student_profiles WHERE id = auth.uid()
    ));

-- course_history RLS 정책
CREATE POLICY "Planners can view their students' course history"
    ON public.course_history FOR SELECT
    USING (planner_id = auth.uid());

CREATE POLICY "Planners can create course history records"
    ON public.course_history FOR INSERT
    WITH CHECK (planner_id = auth.uid());

CREATE POLICY "Students can view their own course history"
    ON public.course_history FOR SELECT
    USING (student_id IN (
        SELECT id FROM public.student_profiles WHERE id = auth.uid()
    ));

-- course_recommendations RLS 정책
CREATE POLICY "Planners can manage course recommendations"
    ON public.course_recommendations FOR ALL
    USING (planner_id = auth.uid());

CREATE POLICY "Students can view their recommendations"
    ON public.course_recommendations FOR SELECT
    USING (student_id IN (
        SELECT id FROM public.student_profiles WHERE id = auth.uid()
    ));

-- 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_courses_updated_at
    BEFORE UPDATE ON public.student_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 과정 이력 자동 저장 트리거 함수
CREATE OR REPLACE FUNCTION save_course_to_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 과정이 완료, 변경, 중단된 경우 이력에 저장
    IF (OLD.status != NEW.status AND NEW.status IN ('completed', 'switched', 'dropped')) 
       OR (NEW.end_date IS NOT NULL AND OLD.end_date IS NULL) THEN
        
        INSERT INTO public.course_history (
            student_id,
            planner_id,
            course_name,
            course_category,
            course_description,
            course_level,
            course_duration,
            start_date,
            end_date,
            duration_weeks,
            completion_status,
            completion_percentage,
            planner_notes,
            learning_goals,
            achievement_summary
        ) VALUES (
            NEW.student_id,
            NEW.planner_id,
            NEW.course_name,
            NEW.course_category,
            NEW.course_description,
            NEW.course_level,
            NEW.course_duration,
            NEW.start_date,
            COALESCE(NEW.end_date, CURRENT_DATE),
            EXTRACT(WEEKS FROM (COALESCE(NEW.end_date, CURRENT_DATE) - NEW.start_date))::INT,
            NEW.status::TEXT,
            NEW.progress_percentage,
            NEW.planner_notes,
            NEW.learning_goals,
            CASE 
                WHEN NEW.status = 'completed' THEN '과정을 성공적으로 완료했습니다.'
                WHEN NEW.status = 'switched' THEN '다른 과정으로 전환했습니다.'
                WHEN NEW.status = 'dropped' THEN '과정을 중단했습니다.'
                ELSE ''
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 과정 상태 변경 시 이력 자동 저장 트리거
CREATE TRIGGER save_course_history_on_status_change
    AFTER UPDATE ON public.student_courses
    FOR EACH ROW EXECUTE FUNCTION save_course_to_history();
