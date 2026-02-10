-- 관리수강 및 일반수강 가격 데이터 추가
-- 이미지 기반 실제 가격 데이터

-- 25분/주3회 관리수강 가격
INSERT INTO public.pricing_templates (
  planner_id, frequency, duration, payment_period, total_lessons,
  base_price, managed_cash_price, managed_card_price,
  per_lesson_price, per_month_price, is_active
) VALUES
  -- 3개월 (36회)
  (NULL, '주3회', '25분', '3개월', 36, 609000, 844400, 929000, 23456, 281467, true),
  -- 6개월 (72회) = 3개월 × 2
  (NULL, '주3회', '25분', '6개월', 72, 1218000, 1568800, 1725680, 21789, 261467, true),
  -- 12개월 (144회) = 3개월 × 4
  (NULL, '주3회', '25분', '12개월', 144, 2436000, 3027600, 3330360, 21025, 252300, true)
ON CONFLICT (planner_id, frequency, duration, payment_period, total_lessons)
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  managed_cash_price = EXCLUDED.managed_cash_price,
  managed_card_price = EXCLUDED.managed_card_price,
  per_lesson_price = EXCLUDED.per_lesson_price,
  per_month_price = EXCLUDED.per_month_price;

-- 50분/주3회 관리수강 가격
INSERT INTO public.pricing_templates (
  planner_id, frequency, duration, payment_period, total_lessons,
  base_price, managed_cash_price, managed_card_price,
  per_lesson_price, per_month_price, is_active
) VALUES
  -- 3개월 (36회)
  (NULL, '주3회', '50분', '3개월', 36, 1218000, 1526400, 1679040, 42400, 508800, true),
  -- 6개월 (72회) = 3개월 × 2
  (NULL, '주3회', '50분', '6개월', 72, 2436000, 2808800, 3089680, 39011, 468133, true),
  -- 12개월 (144회) = 3개월 × 4
  (NULL, '주3회', '50분', '12개월', 144, 4872000, 5507600, 6058360, 38247, 458967, true)
ON CONFLICT (planner_id, frequency, duration, payment_period, total_lessons)
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  managed_cash_price = EXCLUDED.managed_cash_price,
  managed_card_price = EXCLUDED.managed_card_price,
  per_lesson_price = EXCLUDED.per_lesson_price,
  per_month_price = EXCLUDED.per_month_price;

-- 25분/주5회 관리수강 가격
INSERT INTO public.pricing_templates (
  planner_id, frequency, duration, payment_period, total_lessons,
  base_price, managed_cash_price, managed_card_price,
  per_lesson_price, per_month_price, is_active
) VALUES
  -- 3개월 (60회)
  (NULL, '주5회', '25분', '3개월', 60, 1008000, 1252300, 1377530, 20872, 417433, true),
  -- 6개월 (120회) = 3개월 × 2
  (NULL, '주5회', '25분', '6개월', 120, 2016000, 2384600, 2623060, 19871, 397433, true),
  -- 12개월 (240회) = 3개월 × 4
  (NULL, '주5회', '25분', '12개월', 240, 4032000, 4659200, 5125120, 19413, 388266, true)
ON CONFLICT (planner_id, frequency, duration, payment_period, total_lessons)
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  managed_cash_price = EXCLUDED.managed_cash_price,
  managed_card_price = EXCLUDED.managed_card_price,
  per_lesson_price = EXCLUDED.per_lesson_price,
  per_month_price = EXCLUDED.per_month_price;

-- 50분/주5회 관리수강 가격
INSERT INTO public.pricing_templates (
  planner_id, frequency, duration, payment_period, total_lessons,
  base_price, managed_cash_price, managed_card_price,
  per_lesson_price, per_month_price, is_active
) VALUES
  -- 3개월 (60회)
  (NULL, '주5회', '50분', '3개월', 60, 2016000, 2407300, 2648030, 40122, 802433, true),
  -- 6개월 (120회) = 3개월 × 2
  (NULL, '주5회', '50분', '6개월', 120, 4032000, 4694600, 5164060, 39122, 782433, true),
  -- 12개월 (240회) = 3개월 × 4
  (NULL, '주5회', '50분', '12개월', 240, 8064000, 9279200, 10207120, 38663, 773267, true)
ON CONFLICT (planner_id, frequency, duration, payment_period, total_lessons)
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  managed_cash_price = EXCLUDED.managed_cash_price,
  managed_card_price = EXCLUDED.managed_card_price,
  per_lesson_price = EXCLUDED.per_lesson_price,
  per_month_price = EXCLUDED.per_month_price;

-- 일반수강 가격은 관리수강 현금가에서 약 10% 할인된 가격으로 설정
-- (실제 데이터가 있다면 그 값으로 교체)
-- 25분/주3회 일반수강
INSERT INTO public.pricing_templates (
  planner_id, frequency, duration, payment_period, total_lessons,
  base_price, regular_cash_price, regular_card_price,
  is_active
) VALUES
  (NULL, '주3회', '25분', '3개월', 36, 609000, 670000, 737000, true),
  (NULL, '주3회', '25분', '6개월', 72, 1218000, 1320000, 1452000, true),
  (NULL, '주3회', '25분', '12개월', 144, 2436000, 2640000, 2904000, true)
ON CONFLICT (planner_id, frequency, duration, payment_period, total_lessons)
DO UPDATE SET
  regular_cash_price = EXCLUDED.regular_cash_price,
  regular_card_price = EXCLUDED.regular_card_price;

COMMIT;
