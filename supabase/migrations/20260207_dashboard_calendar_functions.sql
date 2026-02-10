-- Dashboard Calendar Functions
-- RPC function to get calendar events for dashboard view

CREATE OR REPLACE FUNCTION get_dashboard_calendar_events(
    p_planner_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_events JSONB := '[]'::JSONB;
    v_lessons JSONB;
    v_expiring_subscriptions JSONB;
BEGIN
    -- 1. 기간 내 예정된 수업 조회
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', l.id,
            'type', 'lesson',
            'date', l.scheduled_date,
            'start_time', l.scheduled_start_time,
            'end_time', l.scheduled_end_time,
            'student_name', sp.full_name,
            'student_id', sp.id,
            'status', l.status,
            'subscription_name', s.subscription_name
        )
    ), '[]'::JSONB)
    INTO v_lessons
    FROM public.lessons l
    JOIN public.student_profiles sp ON l.student_id = sp.id
    JOIN public.subscriptions s ON l.subscription_id = s.id
    WHERE sp.planner_id = p_planner_id
      AND l.scheduled_date BETWEEN p_start_date AND p_end_date
      AND l.status IN ('scheduled', 'postponed');

    -- 2. 기간 내 종료 예정 수강권 조회 (7일 이내)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', s.id,
            'type', 'subscription_expiring',
            'date', s.end_date,
            'student_name', sp.full_name,
            'student_id', sp.id,
            'subscription_name', s.subscription_name,
            'days_until_expiry', s.end_date - CURRENT_DATE
        )
    ), '[]'::JSONB)
    INTO v_expiring_subscriptions
    FROM public.subscriptions s
    JOIN public.student_profiles sp ON s.student_id = sp.id
    WHERE sp.planner_id = p_planner_id
      AND s.status = 'active'
      AND s.end_date BETWEEN p_start_date AND p_end_date
      AND s.end_date - CURRENT_DATE <= 7;

    -- 3. 이벤트 병합
    v_events := v_lessons || v_expiring_subscriptions;

    RETURN jsonb_build_object(
        'success', true,
        'events', v_events
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_calendar_events TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_dashboard_calendar_events IS 'Get calendar events for dashboard view including lessons and expiring subscriptions';
