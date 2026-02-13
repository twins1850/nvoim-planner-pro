-- 가격 조회 함수 수정: total_lessons 매칭 제거
-- frequency, duration, payment_period만으로 검색하도록 변경

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
    v_settings RECORD;
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
    -- 1. 플래너 설정 조회
    IF p_planner_id IS NOT NULL THEN
        SELECT * INTO v_settings
        FROM public.planner_pricing_settings
        WHERE planner_id = p_planner_id;

        IF NOT FOUND THEN
            INSERT INTO public.planner_pricing_settings (planner_id)
            VALUES (p_planner_id)
            RETURNING * INTO v_settings;
        END IF;
    ELSE
        SELECT false as use_custom_prices,
               10.00 as regular_margin_percent,
               20.00 as managed_margin_percent
        INTO v_settings;
    END IF;

    -- 2. 플래너 커스텀 가격 조회 (total_lessons 제거)
    IF v_settings.use_custom_prices AND p_planner_id IS NOT NULL THEN
        SELECT * INTO v_pricing
        FROM public.pricing_templates
        WHERE planner_id = p_planner_id
          AND frequency = p_frequency
          AND duration = p_duration
          AND payment_period = p_payment_period
          AND is_active = true
        LIMIT 1;  -- 여러 개 있을 경우 첫 번째 선택
    END IF;

    -- 3. 없으면 회사 기본 가격 조회 (total_lessons 제거)
    IF NOT FOUND OR v_pricing.id IS NULL THEN
        SELECT * INTO v_pricing
        FROM public.pricing_templates
        WHERE planner_id IS NULL
          AND frequency = p_frequency
          AND duration = p_duration
          AND payment_period = p_payment_period
          AND is_active = true
        LIMIT 1;  -- 여러 개 있을 경우 첫 번째 선택
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
        v_regular_cash := v_pricing.regular_cash_price;
        v_regular_card := v_pricing.regular_card_price;
    ELSE
        v_regular_cash := v_base_price * (1 + v_settings.regular_margin_percent / 100.0);
        v_regular_card := v_regular_cash * 1.1;
    END IF;

    -- 7. 관리수강 가격 계산
    IF v_pricing.managed_cash_price IS NOT NULL THEN
        v_managed_cash := v_pricing.managed_cash_price;
        v_managed_card := v_pricing.managed_card_price;
    ELSE
        v_managed_cash := v_base_price * (1 + v_settings.managed_margin_percent / 100.0);
        v_managed_card := v_managed_cash * 1.1;
    END IF;

    -- 8. 마진 계산
    v_regular_margin := v_regular_cash - v_base_price;
    v_managed_margin := v_managed_cash - v_base_price;

    -- 9. 결과 반환 (실제 수업 횟수 p_total_lessons 사용)
    v_result := jsonb_build_object(
        'success', true,
        'base_price', ROUND(v_base_price, 0),

        'regular', jsonb_build_object(
            'cash_price', ROUND(v_regular_cash, 0),
            'card_price', ROUND(v_regular_card, 0),
            'per_lesson_price', ROUND(v_regular_cash / p_total_lessons, 0),
            'per_month_price', ROUND(v_regular_cash / v_months, 0),
            'margin', ROUND(v_regular_margin, 0),
            'margin_percent', ROUND((v_regular_margin / v_base_price) * 100, 1),
            'available', v_regular_cash IS NOT NULL
        ),

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
        'db_total_lessons', v_pricing.total_lessons,  -- DB에 저장된 수업 횟수도 반환
        'months', v_months
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_subscription_prices(UUID, subscription_frequency, lesson_duration, payment_period, INT) TO authenticated;

COMMENT ON FUNCTION public.get_all_subscription_prices IS '수강권의 모든 가격 정보를 조회 - frequency, duration, payment_period로 검색 (total_lessons 무시)';
