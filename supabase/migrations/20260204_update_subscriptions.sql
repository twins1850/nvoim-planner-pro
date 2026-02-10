-- subscriptions 테이블에 가격 관련 컬럼 추가
-- pricing_type, payment_method, per_lesson_price, per_month_price

-- 가격 타입 enum 생성 (managed, regular, base)
DO $$ BEGIN
    CREATE TYPE pricing_type AS ENUM ('managed', 'regular', 'base');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 결제 수단 enum 생성 (cash, card)
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'card');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- subscriptions 테이블에 컬럼 추가
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS pricing_type pricing_type DEFAULT 'managed',
    ADD COLUMN IF NOT EXISTS payment_method payment_method DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS per_lesson_price DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS per_month_price DECIMAL(10,2);

-- 기존 컬럼 의미 명확화를 위한 코멘트
COMMENT ON COLUMN public.subscriptions.total_amount IS '정가 (원단가 기준)';
COMMENT ON COLUMN public.subscriptions.payment_amount IS '실제 결제 금액 (관리/일반/원단가 적용 후)';
COMMENT ON COLUMN public.subscriptions.pricing_type IS '가격 타입: managed(관리수강), regular(일반수강), base(원단가)';
COMMENT ON COLUMN public.subscriptions.payment_method IS '결제 수단: cash(현금), card(카드)';
COMMENT ON COLUMN public.subscriptions.per_lesson_price IS '회당 단가 (자동 계산)';
COMMENT ON COLUMN public.subscriptions.per_month_price IS '월 단가 (자동 계산)';

-- 인덱스 생성 (가격 타입별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_subscriptions_pricing ON public.subscriptions(pricing_type, payment_method);
