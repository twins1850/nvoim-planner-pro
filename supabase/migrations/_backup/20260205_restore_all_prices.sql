-- 모든 수강권 가격 복원 (관리수강 및 일반수강)
-- DELETE 쿼리로 삭제된 가격 데이터를 PRICING_DATA.md 기준으로 복원

-- 1개월 수강권 (이미 20260205_add_1month_managed_regular_prices.sql로 추가됨)
-- 이 마이그레이션은 3개월, 6개월, 12개월 수강권 가격만 추가

-- 3개월 수강권 가격 추가
INSERT INTO public.pricing_templates
    (planner_id, frequency, duration, payment_period, total_lessons,
     base_price, managed_cash_price, managed_card_price, regular_cash_price, regular_card_price, is_active)
VALUES
    -- 25분 3개월 수강권
    -- 주2회 (24회)
    (NULL, '주2회', '25분', '3개월', 24, 422000, 673900, 741290, 486000, 534600, true),

    -- 주3회 (36회) ⭐ 사용자가 테스트 중인 수강권
    (NULL, '주3회', '25분', '3개월', 36, 609000, 844400, 929000, 684000, 752400, true),

    -- 주5회 (60회)
    (NULL, '주5회', '25분', '3개월', 60, 1008000, 1252300, 1377530, 1155000, 1270500, true),

    -- 50분 3개월 수강권
    -- 주2회 (24회)
    (NULL, '주2회', '50분', '3개월', 24, 844000, 1157900, 1273690, 969000, 1065900, true),

    -- 주3회 (36회)
    (NULL, '주3회', '50분', '3개월', 36, 1218000, 1526400, 1679040, 1365000, 1501500, true),

    -- 주5회 (60회)
    (NULL, '주5회', '50분', '3개월', 60, 2016000, 2407300, 2648030, 2310000, 2541000, true),

    -- 6개월 수강권 가격 추가
    -- 25분 6개월 수강권
    -- 주3회 (72회)
    (NULL, '주3회', '25분', '6개월', 72, 1218000, 1568800, 1725680, 1308000, 1438800, true),

    -- 주5회 (120회)
    (NULL, '주5회', '25분', '6개월', 120, 2016000, 2384600, 2623060, 2250000, 2475000, true),

    -- 50분 6개월 수강권
    -- 주3회 (72회)
    (NULL, '주3회', '50분', '6개월', 72, 2436000, 2808800, 3089680, 2670000, 2937000, true),

    -- 주5회 (120회)
    (NULL, '주5회', '50분', '6개월', 120, 4032000, 4694600, 5164060, 4560000, 5016000, true),

    -- 12개월 수강권 가격 추가
    -- 25분 12개월 수강권
    -- 주3회 (144회)
    (NULL, '주3회', '25분', '12개월', 144, 2436000, 3027600, 3330360, 2496000, 2745600, true),

    -- 주5회 (240회)
    (NULL, '주5회', '25분', '12개월', 240, 4032000, 4659200, 5125120, 4380000, 4818000, true),

    -- 50분 12개월 수강권
    -- 주3회 (144회)
    (NULL, '주3회', '50분', '12개월', 144, 4872000, 5507600, 6058360, 5220000, 5742000, true),

    -- 주5회 (240회)
    (NULL, '주5회', '50분', '12개월', 240, 8064000, 9279200, 10207120, 9000000, 9900000, true)

ON CONFLICT (planner_id, frequency, duration, payment_period, total_lessons)
DO UPDATE SET
    managed_cash_price = EXCLUDED.managed_cash_price,
    managed_card_price = EXCLUDED.managed_card_price,
    regular_cash_price = EXCLUDED.regular_cash_price,
    regular_card_price = EXCLUDED.regular_card_price,
    updated_at = NOW();

COMMENT ON TABLE public.pricing_templates IS '3개월, 6개월, 12개월 수강권 관리수강/일반수강 가격 복원됨 (2026-02-05)';
