-- 연기권 계산 규칙 테이블
-- 수강권 총 횟수에 따른 최대 연기 가능 횟수 정의

CREATE TABLE IF NOT EXISTS public.postponement_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_lessons INT UNIQUE NOT NULL,
    max_postponements INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 연기권 규칙 데이터 삽입
INSERT INTO public.postponement_rules (total_lessons, max_postponements) VALUES
    (1, 0),   -- 1회권: 연기 불가
    (4, 1),   -- 4회권: 1회 연기 가능
    (8, 1),   -- 8회권: 1회 연기 가능
    (12, 2),  -- 12회권: 2회 연기 가능
    (20, 3),  -- 20회권: 3회 연기 가능
    (24, 3),  -- 24회권: 3회 연기 가능
    (36, 6),  -- 36회권: 6회 연기 가능
    (60, 10), -- 60회권: 10회 연기 가능
    (72, 12)  -- 72회권: 12회 연기 가능
ON CONFLICT (total_lessons) DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_postponement_lessons ON public.postponement_rules(total_lessons);

-- RLS 정책 설정
ALTER TABLE public.postponement_rules ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 연기권 규칙 조회 가능
CREATE POLICY "Anyone can view postponement rules"
    ON public.postponement_rules FOR SELECT
    TO authenticated
    USING (true);

-- 코멘트 추가
COMMENT ON TABLE public.postponement_rules IS '수강권 총 횟수별 최대 연기 가능 횟수 규칙';
COMMENT ON COLUMN public.postponement_rules.total_lessons IS '수강권 총 수업 횟수';
COMMENT ON COLUMN public.postponement_rules.max_postponements IS '최대 연기 가능 횟수';
