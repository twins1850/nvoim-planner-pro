-- 가격 관리 시스템
-- pricing_templates: 회사 기본 가격 및 플래너별 커스텀 가격 저장
-- planner_pricing_settings: 플래너별 마진율 설정

-- 20분 수업 시간 타입 추가 (없으면 추가)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_duration') THEN
        CREATE TYPE lesson_duration AS ENUM ('20분', '25분', '50분');
    ELSE
        BEGIN
            ALTER TYPE lesson_duration ADD VALUE IF NOT EXISTS '20분';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 가격 템플릿 테이블
-- 회사 기본 가격(planner_id = NULL) 및 플래너별 커스텀 가격 저장
CREATE TABLE IF NOT EXISTS public.pricing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- 수강권 식별 정보
    frequency subscription_frequency NOT NULL,
    duration lesson_duration NOT NULL,
    payment_period payment_period NOT NULL,
    total_lessons INT NOT NULL,

    -- 원단가 (회원가, 회사 판매가)
    base_price DECIMAL(10,2) NOT NULL,

    -- 관리수강 가격 (학생 관리 서비스 포함)
    managed_cash_price DECIMAL(10,2),
    managed_card_price DECIMAL(10,2),

    -- 일반수강 가격 (관리 서비스 미포함)
    regular_cash_price DECIMAL(10,2),
    regular_card_price DECIMAL(10,2),

    -- 계산된 단가 (자동 계산)
    per_lesson_price DECIMAL(10,2),
    per_month_price DECIMAL(10,2),

    -- 메타 정보
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 유니크 제약: 플래너별로 동일한 수강권 타입은 하나만
    UNIQUE(planner_id, frequency, duration, payment_period, total_lessons)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pricing_planner ON public.pricing_templates(planner_id);
CREATE INDEX IF NOT EXISTS idx_pricing_active ON public.pricing_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_lookup ON public.pricing_templates(frequency, duration, payment_period, total_lessons)
    WHERE planner_id IS NULL;

-- 플래너 가격 설정 테이블
-- 플래너별 마진율 및 가격 설정 방식
CREATE TABLE IF NOT EXISTS public.planner_pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planner_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- 마진율 설정 (백분율, 예: 20 = 20%)
    managed_margin_percent DECIMAL(5,2) DEFAULT 20.00,
    regular_margin_percent DECIMAL(5,2) DEFAULT 10.00,

    -- 가격 설정 방식
    use_custom_prices BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE public.pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_pricing_settings ENABLE ROW LEVEL SECURITY;

-- pricing_templates 정책
-- 1. 회사 기본 가격(planner_id = NULL)은 모든 인증된 사용자가 조회 가능
CREATE POLICY "Anyone can view company base prices"
    ON public.pricing_templates FOR SELECT
    TO authenticated
    USING (planner_id IS NULL);

-- 2. 플래너는 자신의 커스텀 가격 조회 가능
CREATE POLICY "Planners can view their own custom prices"
    ON public.pricing_templates FOR SELECT
    TO authenticated
    USING (planner_id = auth.uid());

-- 3. 플래너는 자신의 커스텀 가격 수정 가능
CREATE POLICY "Planners can manage their own custom prices"
    ON public.pricing_templates FOR ALL
    TO authenticated
    USING (planner_id = auth.uid())
    WITH CHECK (planner_id = auth.uid());

-- planner_pricing_settings 정책
-- 1. 플래너는 자신의 설정 조회 가능
CREATE POLICY "Planners can view their own settings"
    ON public.planner_pricing_settings FOR SELECT
    TO authenticated
    USING (planner_id = auth.uid());

-- 2. 플래너는 자신의 설정 수정 가능
CREATE POLICY "Planners can manage their own settings"
    ON public.planner_pricing_settings FOR ALL
    TO authenticated
    USING (planner_id = auth.uid())
    WITH CHECK (planner_id = auth.uid());

-- 코멘트 추가
COMMENT ON TABLE public.pricing_templates IS '수강권 가격 템플릿: 회사 기본 가격(planner_id=NULL) 및 플래너별 커스텀 가격';
COMMENT ON TABLE public.planner_pricing_settings IS '플래너별 가격 설정: 마진율 또는 직접 입력 방식 선택';
COMMENT ON COLUMN public.pricing_templates.planner_id IS 'NULL이면 회사 기본 가격, UUID이면 플래너 커스텀 가격';
COMMENT ON COLUMN public.pricing_templates.base_price IS '원단가 (회원가, 회사 판매가)';
COMMENT ON COLUMN public.pricing_templates.managed_cash_price IS '관리수강 현금가 (학생 관리 서비스 포함)';
COMMENT ON COLUMN public.pricing_templates.managed_card_price IS '관리수강 카드가 (현금가 + 10%)';
COMMENT ON COLUMN public.pricing_templates.regular_cash_price IS '일반수강 현금가 (관리 서비스 미포함)';
COMMENT ON COLUMN public.pricing_templates.regular_card_price IS '일반수강 카드가 (현금가 + 10%)';
