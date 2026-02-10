-- create_subscription 함수 업데이트
-- pricing_type과 payment_method 파라미터 추가

DROP FUNCTION IF EXISTS create_subscription(UUID, subscription_frequency, lesson_duration, payment_period, DATE, INT, JSONB, DECIMAL, DECIMAL, TEXT);

CREATE OR REPLACE FUNCTION create_subscription(
    p_student_id UUID,
    p_frequency subscription_frequency,
    p_duration lesson_duration,
    p_payment_period payment_period,
    p_start_date DATE,
    p_flexible_lessons_per_month INT DEFAULT NULL,
    p_weekly_schedule JSONB DEFAULT NULL,
    p_total_amount DECIMAL DEFAULT NULL,
    p_payment_amount DECIMAL DEFAULT NULL,
    p_pricing_type TEXT DEFAULT 'managed',  -- 추가: 가격 타입
    p_payment_method TEXT DEFAULT 'cash',   -- 추가: 결제 수단
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
    v_max_postponements INT;
    v_per_lesson_price DECIMAL;
    v_per_month_price DECIMAL;
BEGIN
    -- 플래너 ID 가져오기 (student_profiles.planner_id 사용)
    SELECT planner_id INTO v_teacher_id
    FROM public.student_profiles
    WHERE id = p_student_id;

    IF v_teacher_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Student not found or planner not assigned'
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

    -- 최대 연기 횟수 계산
    SELECT max_postponements INTO v_max_postponements
    FROM public.postponement_rules
    WHERE total_lessons = v_total_lessons;

    -- 규칙에 없으면 기본 공식 사용 (6회당 1회)
    IF v_max_postponements IS NULL THEN
        v_max_postponements := FLOOR(v_total_lessons / 6.0);
    END IF;

    -- 회당 단가 계산
    IF p_payment_amount IS NOT NULL AND p_payment_amount > 0 AND v_total_lessons > 0 THEN
        v_per_lesson_price := p_payment_amount / v_total_lessons;
    END IF;

    -- 월 단가 계산
    IF p_payment_amount IS NOT NULL AND p_payment_amount > 0 AND v_months > 0 THEN
        v_per_month_price := p_payment_amount / v_months;
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
        pricing_type,
        payment_method,
        per_lesson_price,
        per_month_price,
        max_postponements,
        postponements_used,
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
        p_pricing_type,
        p_payment_method,
        v_per_lesson_price,
        v_per_month_price,
        v_max_postponements,
        0,
        p_notes
    ) RETURNING id INTO v_subscription_id;

    -- 주별 고정 스케줄이 있는 경우 저장
    IF p_weekly_schedule IS NOT NULL AND p_frequency != '자율수강' THEN
        FOR v_schedule_item IN SELECT * FROM jsonb_array_elements(p_weekly_schedule::JSONB)
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
        'max_postponements', v_max_postponements,
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

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION create_subscription(UUID, subscription_frequency, lesson_duration, payment_period, DATE, INT, JSONB, DECIMAL, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION create_subscription IS '수강권 생성 함수 - pricing_type, payment_method, per_lesson_price, per_month_price, max_postponements 지원';
