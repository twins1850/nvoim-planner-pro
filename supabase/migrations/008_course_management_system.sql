-- 수강과정 관리 시스템 테이블 생성
-- 2026년 1월 7일 - 플래너 메모 및 이력 관리 기능 추가

-- 1. 현재 활성 수강과정 테이블
CREATE TABLE IF NOT EXISTS public.student_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 과정 기본 정보
    course_name TEXT NOT NULL,
    course_category TEXT NOT NULL,
    course_description TEXT,
    course_level TEXT NOT NULL,
    course_duration TEXT,
    
    -- 날짜 정보
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    
    -- 상태 관리
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'switched', 'dropped', 'paused')),
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- 플래너 메모 및 노트 (핵심 기능)
    planner_notes TEXT,  -- 플래너가 작성하는 메모
    learning_goals TEXT, -- 학습 목표
    special_notes TEXT,  -- 특이사항
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 수강과정 이력 테이블 (자동 저장)
CREATE TABLE IF NOT EXISTS public.course_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 과정 정보
    course_name TEXT NOT NULL,
    course_category TEXT NOT NULL,
    course_description TEXT,
    course_level TEXT NOT NULL,
    course_duration TEXT,
    
    -- 기간 정보
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_weeks INT,
    
    -- 완료 정보
    completion_status TEXT NOT NULL CHECK (completion_status IN ('completed', 'switched', 'dropped')),
    completion_percentage INT DEFAULT 0,
    
    -- 전환 정보
    next_course_name TEXT,
    next_course_category TEXT,
    progression_reason TEXT,
    
    -- 메모 및 평가
    planner_notes TEXT,
    learning_goals TEXT,
    achievement_summary TEXT,
    recommendations TEXT,
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI 추천 과정 테이블
CREATE TABLE IF NOT EXISTS public.course_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    
    -- 추천 과정 정보
    recommended_course_name TEXT NOT NULL,
    recommended_course_category TEXT NOT NULL,
    recommended_course_level TEXT,
    recommended_course_duration TEXT,
    
    -- 추천 이유 및 점수
    recommendation_reason TEXT,
    match_percentage INT CHECK (match_percentage >= 0 AND match_percentage <= 100),
    priority_rank INT CHECK (priority_rank >= 1),
    
    -- 분석 정보
    strength_analysis TEXT,
    improvement_areas TEXT,
    learning_direction TEXT,
    
    -- 메타데이터
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- 인덱스 생성
CREATE INDEX idx_student_courses_student_id ON public.student_courses(student_id);
CREATE INDEX idx_student_courses_status ON public.student_courses(status);
CREATE INDEX idx_student_courses_dates ON public.student_courses(start_date, end_date);

CREATE INDEX idx_course_history_student_id ON public.course_history(student_id);
CREATE INDEX idx_course_history_dates ON public.course_history(start_date, end_date);
CREATE INDEX idx_course_history_status ON public.course_history(completion_status);

CREATE INDEX idx_course_recommendations_student_id ON public.course_recommendations(student_id);
CREATE INDEX idx_course_recommendations_active ON public.course_recommendations(is_active);
CREATE INDEX idx_course_recommendations_rank ON public.course_recommendations(priority_rank);

-- 자동 이력 저장 트리거 함수
CREATE OR REPLACE FUNCTION save_course_to_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 상태가 변경되어 완료/전환/중단 상태가 되거나, 종료일이 설정된 경우
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
                ELSE '과정이 종료되었습니다.'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER course_history_trigger
    BEFORE UPDATE ON public.student_courses
    FOR EACH ROW
    EXECUTE FUNCTION save_course_to_history();

-- 업데이트 시간 자동 갱신 트리거
CREATE TRIGGER update_student_courses_updated_at
    BEFORE UPDATE ON public.student_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_recommendations ENABLE ROW LEVEL SECURITY;

-- student_courses RLS 정책
CREATE POLICY "Teachers can view their students courses"
    ON public.student_courses FOR SELECT
    USING (planner_id = auth.uid());

CREATE POLICY "Teachers can manage their students courses"
    ON public.student_courses FOR ALL
    USING (planner_id = auth.uid());

CREATE POLICY "Students can view their own courses"
    ON public.student_courses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s 
            WHERE s.id = student_courses.student_id 
            AND s.user_id = auth.uid()
        )
    );

-- course_history RLS 정책
CREATE POLICY "Teachers can view course history"
    ON public.course_history FOR SELECT
    USING (planner_id = auth.uid());

CREATE POLICY "Students can view their course history"
    ON public.course_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s 
            WHERE s.id = course_history.student_id 
            AND s.user_id = auth.uid()
        )
    );

-- course_recommendations RLS 정책
CREATE POLICY "Teachers can view recommendations"
    ON public.course_recommendations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = course_recommendations.student_id
            AND s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create recommendations"
    ON public.course_recommendations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = course_recommendations.student_id
            AND s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update recommendations"
    ON public.course_recommendations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = course_recommendations.student_id
            AND s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete recommendations"
    ON public.course_recommendations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = course_recommendations.student_id
            AND s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view their recommendations"
    ON public.course_recommendations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s 
            WHERE s.id = course_recommendations.student_id 
            AND s.user_id = auth.uid()
        )
    );

-- 샘플 AI 추천 생성 함수 (테스트용)
CREATE OR REPLACE FUNCTION generate_sample_recommendations(p_student_id UUID)
RETURNS void AS $$
BEGIN
    -- 기존 추천 비활성화
    UPDATE public.course_recommendations
    SET is_active = false
    WHERE student_id = p_student_id;
    
    -- 새 추천 생성
    INSERT INTO public.course_recommendations (
        student_id,
        recommended_course_name,
        recommended_course_category,
        recommended_course_level,
        recommended_course_duration,
        recommendation_reason,
        match_percentage,
        priority_rank,
        strength_analysis,
        improvement_areas,
        learning_direction
    ) VALUES 
    (
        p_student_id,
        'Business English Conversation',
        '비즈니스',
        '중급',
        '12주',
        '회화 기초 과정을 완료하여 비즈니스 회화로 진급 가능',
        95,
        1,
        '회화, 발음, 실전 응용',
        '비즈니스 용어, 고급 문법',
        '실무 중심 학습'
    ),
    (
        p_student_id,
        'TOEIC Speaking Advanced',
        '시험준비',
        '고급',
        '8주',
        '회화 실력 향상으로 토익 스피킹 고득점 도전 가능',
        87,
        2,
        '회화, 발음, 실전 응용',
        '비즈니스 용어, 고급 문법',
        '실무 중심 학습'
    ),
    (
        p_student_id,
        'Travel English Intensive',
        '여행영어',
        '중급',
        '6주',
        '실전 회화 실력으로 다양한 상황별 영어 학습 가능',
        78,
        3,
        '회화, 발음, 실전 응용',
        '비즈니스 용어, 고급 문법',
        '실무 중심 학습'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.student_courses TO authenticated;
GRANT ALL ON public.course_history TO authenticated;
GRANT ALL ON public.course_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION generate_sample_recommendations(UUID) TO authenticated;