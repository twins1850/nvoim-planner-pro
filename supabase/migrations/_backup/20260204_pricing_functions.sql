-- 가격 계산 및 연기권 계산 RPC 함수

-- 1. 연기권 계산 함수
CREATE OR REPLACE FUNCTION public.calculate_max_postponements(
    p_total_lessons INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_postponements INT;
BEGIN
    -- 정확한 규칙 조회
    SELECT max_postponements INTO v_max_postponements
    FROM public.postponement_rules
    WHERE total_lessons = p_total_lessons;

    -- 규칙에 없으면 기본 공식 사용 (6회당 1회)
    IF NOT FOUND THEN
        v_max_postponements := FLOOR(p_total_lessons / 6.0);
    END IF;

    RETURN v_max_postponements;
END;
$$;

-- 2. 수강권 가격 계산 함수
CREATE OR REPLACE FUNCTION public.calculate_subscription_price(
    p_planner_id UUID,
    p_frequency subscription_frequency,
    p_duration lesson_duration,
    p_payment_period payment_period,
    p_total_lessons INT,
    p_pricing_type TEXT DEFAULT 'managed', -- 'managed', 'regular', 'base'
    p_payment_method TEXT DEFAULT 'cash'   -- 'cash', 'card'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pricing public.pricing_templates%ROWTYPE;
    v_settings public.planner_pricing_settings%ROWTYPE;
    v_base_price DECIMAL(10,2);
    v_final_price DECIMAL(10,2);
    v_per_lesson DECIMAL(10,2);
    v_per_month DECIMAL(10,2);
    v_months INT;
BEGIN
    -- 1. 플래너 설정 조회
    SELECT * INTO v_settings
    FROM public.planner_pricing_settings
    WHERE planner_id = p_planner_id;

    -- 설정 없으면 기본값 생성
    IF NOT FOUND THEN
        INSERT INTO public.planner_pricing_settings (planner_id)
        VALUES (p_planner_id)
        RETURNING * INTO v_settings;
    END IF;

    -- 2. 플래너 커스텀 가격 조회 (커스텀 가격 사용 시)
    IF v_settings.use_custom_prices THEN
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

    v_base_price := v_pricing.base_price;

    -- 5. 가격 타입별 계산
    IF p_pricing_type = 'base' THEN
        -- 원단가 그대로 사용
        v_final_price := v_base_price;

    ELSIF p_pricing_type = 'managed' THEN
        -- 관리수강 가격
        IF v_settings.use_custom_prices AND v_pricing.managed_cash_price IS NOT NULL THEN
            -- 커스텀 가격 사용
            IF p_payment_method = 'card' THEN
                v_final_price := v_pricing.managed_card_price;
            ELSE
                v_final_price := v_pricing.managed_cash_price;
            END IF;
        ELSE
            -- 마진율 사용
            v_final_price := v_base_price * (1 + v_settings.managed_margin_percent / 100.0);
            IF p_payment_method = 'card' THEN
                v_final_price := v_final_price * 1.1; -- 카드가 10% 추가
            END IF;
        END IF;

    ELSIF p_pricing_type = 'regular' THEN
        -- 일반수강 가격
        IF v_settings.use_custom_prices AND v_pricing.regular_cash_price IS NOT NULL THEN
            -- 커스텀 가격 사용
            IF p_payment_method = 'card' THEN
                v_final_price := v_pricing.regular_card_price;
            ELSE
                v_final_price := v_pricing.regular_cash_price;
            END IF;
        ELSE
            -- 마진율 사용
            v_final_price := v_base_price * (1 + v_settings.regular_margin_percent / 100.0);
            IF p_payment_method = 'card' THEN
                v_final_price := v_final_price * 1.1; -- 카드가 10% 추가
            END IF;
        END IF;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', '잘못된 pricing_type입니다. managed, regular, base 중 하나를 선택하세요.'
        );
    END IF;

    -- 6. 단가 계산
    v_per_lesson := v_final_price / p_total_lessons;

    -- 개월 수 계산
    v_months := CASE p_payment_period
        WHEN '1개월' THEN 1
        WHEN '3개월' THEN 3
        WHEN '6개월' THEN 6
        WHEN '12개월' THEN 12
        ELSE 1
    END;

    v_per_month := v_final_price / v_months;

    -- 7. 결과 반환
    RETURN jsonb_build_object(
        'success', true,
        'base_price', ROUND(v_base_price, 0),
        'final_price', ROUND(v_final_price, 0),
        'per_lesson_price', ROUND(v_per_lesson, 0),
        'per_month_price', ROUND(v_per_month, 0),
        'pricing_type', p_pricing_type,
        'payment_method', p_payment_method,
        'is_custom', v_settings.use_custom_prices
    );
END;
$$;

-- 함수에 대한 권한 부여
GRANT EXECUTE ON FUNCTION public.calculate_max_postponements(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_subscription_price(UUID, subscription_frequency, lesson_duration, payment_period, INT, TEXT, TEXT) TO authenticated;

-- 코멘트 추가
COMMENT ON FUNCTION public.calculate_max_postponements IS '수강권 총 횟수에 따른 최대 연기 가능 횟수 계산';
COMMENT ON FUNCTION public.calculate_subscription_price IS '플래너 설정에 따라 수강권 가격 자동 계산 (원단가, 관리수강, 일반수강)';
