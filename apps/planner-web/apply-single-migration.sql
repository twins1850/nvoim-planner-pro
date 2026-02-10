-- subscriptions 테이블에 컬럼 추가

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'managed',
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS per_lesson_price DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS per_month_price DECIMAL(10,2);
