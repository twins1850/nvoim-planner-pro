-- Add resources field to homework table for file attachments
-- 2026년 1월 9일

-- homework 테이블에 resources JSONB 컬럼 추가 (이미 존재하지 않는 경우)
ALTER TABLE public.homework 
ADD COLUMN IF NOT EXISTS resources JSONB;

-- resources 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN public.homework.resources IS 'File attachments and other resources in JSON format';

-- 인덱스 추가 (JSON 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_homework_resources ON public.homework USING GIN (resources);