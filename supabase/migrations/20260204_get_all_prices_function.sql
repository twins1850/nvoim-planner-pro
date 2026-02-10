-- 모든 가격 정보를 한 번에 조회하는 함수
-- 수강권 옵션 선택 시 회원가, 일반수강, 관리수강 모두 표시하기 위한 함수
-- NULL planner_id 지원 (회사 기본 가격용)

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.get_all_subscription_prices(UUID, subscription_frequency, lesson_duration, payment_period, INT) CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_subscription_prices(
    p_planner_id UUID,
    p_frequency subscription_frequency,
    p_duration lesson_duration,
    p_payment_period payment_period,
    p_total_lessons INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pricing public.pricing_templates%ROWTYPE;
    v_settings RECORD;  -- Changed from %ROWTYPE to RECORD to support NULL planner_id
    v_result JSONB;
    v_months INT;
    v_base_price DECIMAL(10,2);
    v_regular_cash DECIMAL(10,2);
    v_regular_card DECIMAL(10,2);
    v_managed_cash DECIMAL(10,2);
    v_managed_card DECIMAL(10,2);
    v_regular_margin DECIMAL(10,2);
    v_managed_margin DECIMAL(10,2);
BEGIN
    -- 1. 플래너 설정 조회 (NULL 체크 추가)
    IF p_planner_id IS NOT NULL THEN
        SELECT * INTO v_settings
        FROM public.planner_pricing_settings
        WHERE planner_id = p_planner_id;

        -- 설정 없으면 기본값 생성
        IF NOT FOUND THEN
            INSERT INTO public.planner_pricing_settings (planner_id)
            VALUES (p_planner_id)
            RETURNING * INTO v_settings;
        END IF;
    ELSE
        -- planner_id가 NULL이면 회사 기본 마진율 사용
        SELECT false as use_custom_prices,
               10.00 as regular_margin_percent,
               20.00 as managed_margin_percent
        INTO v_settings;
    END IF;

    -- 2. 플래너 커스텀 가격 조회 (커스텀 가격 사용 시)
    IF v_settings.use_custom_prices AND p_planner_id IS NOT NULL THEN
        SELECT * INTO v_pricing
        FROM public.pricing_templates
        WHERE planner_id = p_planner_id
          AND frequency = p_frequency
          AND duration = p_duration
          AND payment_period = p_payment_period
          AND total_lessons = p_total_lessons
          AND is_active = true;
    END IF;

    -- 3. 없으면 회사 기본 가격 조회
    IF NOT FOUND OR v_pricing.id IS NULL THEN
        SELECT * INTO v_pricing
        FROM public.pricing_templates
        WHERE planner_id IS NULL
          AND frequency = p_frequency
          AND duration = p_duration
          AND payment_period = p_payment_period
          AND total_lessons = p_total_lessons
          AND is_active = true;
    END IF;

    -- 4. 가격 정보 없으면 에러 반환
    IF NOT FOUND OR v_pricing.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '해당 수강권의 가격 정보가 없습니다.'
        );
    END IF;

    -- 5. 기본 가격 정보
    v_base_price := v_pricing.base_price;

    -- 개월 수 계산
    v_months := CASE p_payment_period
        WHEN '1개월' THEN 1
        WHEN '3개월' THEN 3
        WHEN '6개월' THEN 6
        WHEN '12개월' THEN 12
        ELSE 1
    END;

    -- 6. 일반수강 가격 계산
    IF v_pricing.regular_cash_price IS NOT NULL THEN
        -- DB에 저장된 가격 사용
        v_regular_cash := v_pricing.regular_cash_price;
        v_regular_card := v_pricing.regular_card_price;
    ELSE
        -- 마진율로 계산
        v_regular_cash := v_base_price * (1 + v_settings.regular_margin_percent / 100.0);
        v_regular_card := v_regular_cash * 1.1;
    END IF;

    -- 7. 관리수강 가격 계산
    IF v_pricing.managed_cash_price IS NOT NULL THEN
        -- DB에 저장된 가격 사용
        v_managed_cash := v_pricing.managed_cash_price;
        v_managed_card := v_pricing.managed_card_price;
    ELSE
        -- 마진율로 계산
        v_managed_cash := v_base_price * (1 + v_settings.managed_margin_percent / 100.0);
        v_managed_card := v_managed_cash * 1.1;
    END IF;

    -- 8. 마진 계산
    v_regular_margin := v_regular_cash - v_base_price;
    v_managed_margin := v_managed_cash - v_base_price;

    -- 9. 결과 반환
    v_result := jsonb_build_object(
        'success', true,
        'base_price', ROUND(v_base_price, 0),

        -- 일반수강 정보
        'regular', jsonb_build_object(
            'cash_price', ROUND(v_regular_cash, 0),
            'card_price', ROUND(v_regular_card, 0),
            'per_lesson_price', ROUND(v_regular_cash / p_total_lessons, 0),
            'per_month_price', ROUND(v_regular_cash / v_months, 0),
            'margin', ROUND(v_regular_margin, 0),
            'margin_percent', ROUND((v_regular_margin / v_base_price) * 100, 1),
            'available', v_regular_cash IS NOT NULL
        ),

        -- 관리수강 정보
        'managed', jsonb_build_object(
            'cash_price', ROUND(v_managed_cash, 0),
            'card_price', ROUND(v_managed_card, 0),
            'per_lesson_price', ROUND(v_managed_cash / p_total_lessons, 0),
            'per_month_price', ROUND(v_managed_cash / v_months, 0),
            'margin', ROUND(v_managed_margin, 0),
            'margin_percent', ROUND((v_managed_margin / v_base_price) * 100, 1),
            'available', v_managed_cash IS NOT NULL
        ),

        'is_custom', v_settings.use_custom_prices,
        'total_lessons', p_total_lessons,
        'months', v_months
    );

    RETURN v_result;
END;
$$;

-- 함수에 대한 권한 부여
GRANT EXECUTE ON FUNCTION public.get_all_subscription_prices(UUID, subscription_frequency, lesson_duration, payment_period, INT) TO authenticated;

-- 코멘트 추가
COMMENT ON FUNCTION public.get_all_subscription_prices IS '수강권의 모든 가격 정보를 한 번에 조회 (회원가, 일반수강, 관리수강, 마진 포함) - NULL planner_id 지원';
