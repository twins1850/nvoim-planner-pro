-- 1개월 수강권 관리수강 및 일반수강 가격 추가
-- 이미지 기준: 수강단가표/KakaoTalk_Photo_2026-02-04-10-13-07 003.jpeg
-- 일반수강 = 관리수강 - 20,000원

INSERT INTO public.pricing_templates
    (planner_id, frequency, duration, payment_period, total_lessons,
     base_price, managed_cash_price, managed_card_price, regular_cash_price, regular_card_price, is_active)
VALUES
    -- 25분 1개월 수강권
    -- 주2회 (8회)
    (NULL, '주2회', '25분', '1개월', 8, 145000, 265000, 291500, 245000, 269500, true),

    -- 주3회 (12회)
    (NULL, '주3회', '25분', '1개월', 12, 213000, 342000, 376200, 322000, 354200, true),

    -- 주5회 (20회)
    (NULL, '주5회', '25분', '1개월', 20, 354000, 507000, 557000, 487000, 535700, true),

    -- 50분 1개월 수강권
    -- 주2회 (8회)
    (NULL, '주2회', '50분', '1개월', 8, 290000, 430000, 473000, 410000, 451000, true),

    -- 주3회 (12회)
    (NULL, '주3회', '50분', '1개월', 12, 426000, 584000, 642400, 564000, 620400, true),

    -- 주5회 (20회)
    (NULL, '주5회', '50분', '1개월', 20, 708000, 914000, 1005400, 894000, 983400, true)

ON CONFLICT (planner_id, frequency, duration, payment_period, total_lessons)
DO UPDATE SET
    managed_cash_price = EXCLUDED.managed_cash_price,
    managed_card_price = EXCLUDED.managed_card_price,
    regular_cash_price = EXCLUDED.regular_cash_price,
    regular_card_price = EXCLUDED.regular_card_price,
    updated_at = NOW();

COMMENT ON TABLE public.pricing_templates IS '수강권 가격 템플릿 - 1개월 수강권 관리수강/일반수강 가격 추가됨 (2026-02-05)';
