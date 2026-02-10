-- 학생별 수업 일정 조회 함수
-- Phase 2: 학생 상세 페이지 달력용

CREATE OR REPLACE FUNCTION get_student_lesson_calendar(
    p_student_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lessons JSONB;
    v_subscription JSONB;
BEGIN
    -- 1. 활성 수강권 정보 조회
    SELECT jsonb_build_object(
        'id', s.id,
        'subscription_name', s.subscription_name,
        'start_date', s.start_date,
        'end_date', s.end_date,
        'postponements_used', s.postponements_used,
        'max_postponements', s.max_postponements,
        'remaining_postponements', s.max_postponements - s.postponements_used,
        'total_lessons', s.total_lessons,
        'completed_lessons', s.completed_lessons,
        'remaining_lessons', s.remaining_lessons,
        'status', s.status
    )
    INTO v_subscription
    FROM public.subscriptions s
    WHERE s.student_id = p_student_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;

    -- 2. 기간 내 수업 일정 조회
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', l.id,
            'date', l.scheduled_date,
            'start_time', l.scheduled_start_time,
            'end_time', l.scheduled_end_time,
            'status', l.status,
            'subscription_id', l.subscription_id,
            'lesson_content', l.lesson_content,
            'teacher_notes', l.teacher_notes,
            'homework_assigned', l.homework_assigned
        ) ORDER BY l.scheduled_date, l.scheduled_start_time
    ), '[]'::JSONB)
    INTO v_lessons
    FROM public.lessons l
    WHERE l.student_id = p_student_id
      AND l.scheduled_date BETWEEN p_start_date AND p_end_date;

    RETURN jsonb_build_object(
        'success', true,
        'subscription', v_subscription,
        'lessons', v_lessons
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_lesson_calendar TO authenticated;

COMMENT ON FUNCTION get_student_lesson_calendar IS '학생별 수업 일정 조회 - Phase 2 학생 상세 페이지 달력용';
