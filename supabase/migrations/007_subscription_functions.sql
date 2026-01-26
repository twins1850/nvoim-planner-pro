-- 수강권 시스템 RPC 함수들

-- 1. 수강권 생성 함수 (수업 스케줄 자동 계산 포함)
CREATE OR REPLACE FUNCTION create_subscription(
    p_student_id UUID,
    p_frequency subscription_frequency,
    p_duration lesson_duration,
    p_payment_period payment_period,
    p_start_date DATE,
    p_flexible_lessons_per_month INT DEFAULT NULL,
    p_weekly_schedule JSONB DEFAULT NULL, -- [{"day": 1, "start_time": "09:00", "end_time": "09:25"}]
    p_total_amount DECIMAL DEFAULT NULL,
    p_payment_amount DECIMAL DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    v_teacher_id UUID;
    v_end_date DATE;
    v_total_lessons INT;
    v_subscription_id UUID;
    v_subscription_name TEXT;
    v_schedule_item JSONB;
    v_weeks_count INT;
    v_lessons_per_week INT;
    v_months INT;
BEGIN
    -- 강사 ID 가져오기
    SELECT teacher_id INTO v_teacher_id
    FROM public.students
    WHERE id = p_student_id;
    
    IF v_teacher_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Student not found or teacher not assigned'
        );
    END IF;
    
    -- 결제 기간에 따른 개월 수 계산
    v_months := CASE p_payment_period
        WHEN '1개월' THEN 1
        WHEN '3개월' THEN 3
        WHEN '6개월' THEN 6
        WHEN '12개월' THEN 12
    END;
    
    -- 종료일 계산
    v_end_date := p_start_date + INTERVAL '1 month' * v_months - INTERVAL '1 day';
    
    -- 수강권명 생성
    IF p_frequency = '자율수강' THEN
        v_subscription_name := '자율수강 ' || p_duration || ' 월' || p_flexible_lessons_per_month || '회 ' || p_payment_period || '권';
        v_total_lessons := p_flexible_lessons_per_month * v_months;
    ELSE
        -- 주차별 수강의 경우
        v_lessons_per_week := CASE p_frequency
            WHEN '주2회' THEN 2
            WHEN '주3회' THEN 3
            WHEN '주5회' THEN 5
            WHEN '주6회' THEN 6
        END;
        
        -- 전체 주차 수 계산 (대략적)
        v_weeks_count := (v_months * 30) / 7;
        v_total_lessons := v_weeks_count * v_lessons_per_week;
        
        v_subscription_name := p_frequency || ' ' || p_duration || ' ' || p_payment_period || '권';
    END IF;
    
    -- 수강권 생성
    INSERT INTO public.subscriptions (
        student_id,
        teacher_id,
        subscription_name,
        frequency,
        duration,
        payment_period,
        flexible_lessons_per_month,
        start_date,
        end_date,
        total_lessons,
        remaining_lessons,
        total_amount,
        payment_amount,
        notes
    ) VALUES (
        p_student_id,
        v_teacher_id,
        v_subscription_name,
        p_frequency,
        p_duration,
        p_payment_period,
        p_flexible_lessons_per_month,
        p_start_date,
        v_end_date,
        v_total_lessons,
        v_total_lessons,
        p_total_amount,
        p_payment_amount,
        p_notes
    ) RETURNING id INTO v_subscription_id;
    
    -- 주별 고정 스케줄이 있는 경우 저장
    IF p_weekly_schedule IS NOT NULL AND p_frequency != '자율수강' THEN
        FOR v_schedule_item IN SELECT * FROM jsonb_array_elements(p_weekly_schedule)
        LOOP
            INSERT INTO public.weekly_schedules (
                subscription_id,
                day_of_week,
                start_time,
                end_time
            ) VALUES (
                v_subscription_id,
                (v_schedule_item->>'day')::INT,
                (v_schedule_item->>'start_time')::TIME,
                (v_schedule_item->>'end_time')::TIME
            );
        END LOOP;
    END IF;
    
    -- 성공 응답
    RETURN json_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'subscription_name', v_subscription_name,
        'total_lessons', v_total_lessons,
        'end_date', v_end_date
    );
    
EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to create subscription: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 수업 스케줄 자동 생성 함수 (고정 스케줄용)
CREATE OR REPLACE FUNCTION generate_lesson_schedule(
    p_subscription_id UUID,
    p_exclude_holidays BOOLEAN DEFAULT true
)
RETURNS json AS $$
DECLARE
    v_subscription public.subscriptions%ROWTYPE;
    v_schedule_item RECORD;
    v_current_date DATE;
    v_lessons_created INT := 0;
    v_holiday_dates DATE[];
    v_lesson_start_time TIME;
    v_lesson_end_time TIME;
BEGIN
    -- 수강권 정보 가져오기
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE id = p_subscription_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Subscription not found'
        );
    END IF;
    
    -- 자율수강은 스케줄 자동생성 안함
    IF v_subscription.frequency = '자율수강' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Flexible subscriptions do not use auto-generated schedules'
        );
    END IF;
    
    -- 공휴일 목록 가져오기
    IF p_exclude_holidays THEN
        SELECT array_agg(date) INTO v_holiday_dates
        FROM public.holidays
        WHERE date >= v_subscription.start_date
        AND date <= v_subscription.end_date;
    END IF;
    
    -- 기존 수업 삭제 (재생성의 경우)
    DELETE FROM public.lessons 
    WHERE subscription_id = p_subscription_id;
    
    -- 주별 스케줄에 따라 수업 생성
    FOR v_schedule_item IN 
        SELECT day_of_week, start_time, end_time
        FROM public.weekly_schedules
        WHERE subscription_id = p_subscription_id
        AND is_active = true
    LOOP
        v_current_date := v_subscription.start_date;
        
        -- 시작일부터 첫 번째 해당 요일 찾기
        WHILE EXTRACT(DOW FROM v_current_date) != (v_schedule_item.day_of_week % 7) LOOP
            v_current_date := v_current_date + 1;
        END LOOP;
        
        -- 수강권 기간 동안 해당 요일마다 수업 생성
        WHILE v_current_date <= v_subscription.end_date AND v_lessons_created < v_subscription.total_lessons LOOP
            -- 공휴일 체크
            IF v_holiday_dates IS NULL OR v_current_date != ALL(v_holiday_dates) THEN
                INSERT INTO public.lessons (
                    subscription_id,
                    student_id,
                    teacher_id,
                    scheduled_date,
                    scheduled_start_time,
                    scheduled_end_time,
                    status
                ) VALUES (
                    p_subscription_id,
                    v_subscription.student_id,
                    v_subscription.teacher_id,
                    v_current_date,
                    v_schedule_item.start_time,
                    v_schedule_item.end_time,
                    'scheduled'
                );
                
                v_lessons_created := v_lessons_created + 1;
            END IF;
            
            -- 다음 주 같은 요일로 이동
            v_current_date := v_current_date + 7;
        END LOOP;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'lessons_created', v_lessons_created,
        'subscription_id', p_subscription_id
    );
    
EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to generate schedule: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 수업 연기 함수
CREATE OR REPLACE FUNCTION postpone_lesson(
    p_lesson_id UUID,
    p_reason postponement_reason,
    p_reason_detail TEXT DEFAULT NULL,
    p_rescheduled_date DATE DEFAULT NULL,
    p_rescheduled_time TIME DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    v_lesson public.lessons%ROWTYPE;
    v_subscription public.subscriptions%ROWTYPE;
    v_current_user_id UUID;
    v_postponement_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    
    -- 수업 정보 가져오기
    SELECT * INTO v_lesson
    FROM public.lessons
    WHERE id = p_lesson_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Lesson not found'
        );
    END IF;
    
    -- 수강권 정보 가져오기
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE id = v_lesson.subscription_id;
    
    -- 연기 가능 횟수 체크
    IF v_subscription.postponements_used >= v_subscription.max_postponements THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Maximum postponements exceeded'
        );
    END IF;
    
    -- 수업 상태를 연기로 변경
    UPDATE public.lessons
    SET status = 'postponed',
        updated_at = NOW()
    WHERE id = p_lesson_id;
    
    -- 연기 기록 생성
    INSERT INTO public.postponements (
        lesson_id,
        subscription_id,
        original_date,
        original_start_time,
        rescheduled_date,
        rescheduled_start_time,
        reason,
        reason_detail,
        requested_by
    ) VALUES (
        p_lesson_id,
        v_lesson.subscription_id,
        v_lesson.scheduled_date,
        v_lesson.scheduled_start_time,
        p_rescheduled_date,
        p_rescheduled_time,
        p_reason,
        p_reason_detail,
        v_current_user_id
    ) RETURNING id INTO v_postponement_id;
    
    -- 수강권의 연기 횟수 증가
    UPDATE public.subscriptions
    SET postponements_used = postponements_used + 1,
        updated_at = NOW()
    WHERE id = v_lesson.subscription_id;
    
    RETURN json_build_object(
        'success', true,
        'postponement_id', v_postponement_id,
        'postponements_remaining', v_subscription.max_postponements - v_subscription.postponements_used - 1
    );
    
EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to postpone lesson: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 자율수강 예약 함수
CREATE OR REPLACE FUNCTION book_flexible_lesson(
    p_subscription_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS json AS $$
DECLARE
    v_subscription public.subscriptions%ROWTYPE;
    v_booking_month DATE;
    v_monthly_bookings INT;
    v_current_user_id UUID;
    v_booking_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    
    -- 수강권 정보 가져오기
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE id = p_subscription_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Subscription not found'
        );
    END IF;
    
    -- 자율수강이 아닌 경우 에러
    IF v_subscription.frequency != '자율수강' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'This function is only for flexible subscriptions'
        );
    END IF;
    
    -- 해당 월의 첫째 날 계산
    v_booking_month := DATE_TRUNC('month', p_booking_date)::DATE;
    
    -- 해당 월 예약 횟수 확인
    SELECT COUNT(*) INTO v_monthly_bookings
    FROM public.flexible_bookings
    WHERE subscription_id = p_subscription_id
    AND booking_month = v_booking_month
    AND status IN ('confirmed', 'completed');
    
    -- 월별 수업 횟수 초과 체크
    IF v_monthly_bookings >= v_subscription.flexible_lessons_per_month THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Monthly lesson limit exceeded'
        );
    END IF;
    
    -- 예약 생성
    INSERT INTO public.flexible_bookings (
        subscription_id,
        student_id,
        teacher_id,
        booking_date,
        start_time,
        end_time,
        booking_month,
        status
    ) VALUES (
        p_subscription_id,
        v_subscription.student_id,
        v_subscription.teacher_id,
        p_booking_date,
        p_start_time,
        p_end_time,
        v_booking_month,
        'pending'
    ) RETURNING id INTO v_booking_id;
    
    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'remaining_monthly_lessons', v_subscription.flexible_lessons_per_month - v_monthly_bookings - 1
    );
    
EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to book lesson: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 수강권 통계 함수
CREATE OR REPLACE FUNCTION get_subscription_stats(
    p_subscription_id UUID
)
RETURNS json AS $$
DECLARE
    v_subscription public.subscriptions%ROWTYPE;
    v_completed_lessons INT;
    v_scheduled_lessons INT;
    v_postponed_lessons INT;
    v_remaining_days INT;
    v_progress_percentage DECIMAL;
BEGIN
    -- 수강권 정보 가져오기
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE id = p_subscription_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Subscription not found'
        );
    END IF;
    
    -- 수업 통계 계산
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'scheduled'),
        COUNT(*) FILTER (WHERE status = 'postponed')
    INTO v_completed_lessons, v_scheduled_lessons, v_postponed_lessons
    FROM public.lessons
    WHERE subscription_id = p_subscription_id;
    
    -- 남은 일수 계산
    v_remaining_days := v_subscription.end_date - CURRENT_DATE;
    
    -- 진행률 계산
    IF v_subscription.total_lessons > 0 THEN
        v_progress_percentage := (v_completed_lessons::DECIMAL / v_subscription.total_lessons) * 100;
    ELSE
        v_progress_percentage := 0;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'subscription', json_build_object(
            'id', v_subscription.id,
            'name', v_subscription.subscription_name,
            'status', v_subscription.status,
            'start_date', v_subscription.start_date,
            'end_date', v_subscription.end_date,
            'remaining_days', v_remaining_days
        ),
        'lessons', json_build_object(
            'total', v_subscription.total_lessons,
            'completed', v_completed_lessons,
            'scheduled', v_scheduled_lessons,
            'postponed', v_postponed_lessons,
            'remaining', v_subscription.remaining_lessons
        ),
        'postponements', json_build_object(
            'used', v_subscription.postponements_used,
            'max', v_subscription.max_postponements,
            'remaining', v_subscription.max_postponements - v_subscription.postponements_used
        ),
        'progress', json_build_object(
            'percentage', v_progress_percentage,
            'on_track', v_remaining_days > 0 AND v_scheduled_lessons > 0
        )
    );
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION create_subscription(UUID, subscription_frequency, lesson_duration, payment_period, DATE, INT, JSONB, DECIMAL, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_lesson_schedule(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION postpone_lesson(UUID, postponement_reason, TEXT, DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION book_flexible_lesson(UUID, DATE, TIME, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_stats(UUID) TO authenticated;