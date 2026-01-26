-- NVOIM Planner Pro - 숙제 첨부파일 시스템 설정
-- 2026년 1월 9일

-- 1. homework 테이블에 resources 필드 추가
ALTER TABLE public.homework 
ADD COLUMN IF NOT EXISTS resources JSONB;

-- 2. resources 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN public.homework.resources IS 'File attachments and other resources in JSON format';

-- 3. 인덱스 추가 (JSON 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_homework_resources ON public.homework USING GIN (resources);

-- 4. homework-files 스토리지 버킷을 위한 RLS 정책 생성 준비
-- (실제 버킷은 Supabase 웹 콘솔에서 생성 필요)

-- homework-files 버킷 업로드 정책
-- CREATE POLICY "homework_files_upload" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'homework-files' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- homework-files 버킷 다운로드 정책
-- CREATE POLICY "homework_files_download" ON storage.objects
-- FOR SELECT USING (bucket_id = 'homework-files');

-- homework-files 버킷 삭제 정책
-- CREATE POLICY "homework_files_delete" ON storage.objects
-- FOR DELETE USING (
--   bucket_id = 'homework-files' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- 5. 파일 다운로드 추적을 위한 테이블 (자동 삭제 시스템용)
CREATE TABLE IF NOT EXISTS public.file_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(homework_id, student_id, file_name)
);

-- 6. file_downloads 테이블 RLS 설정
ALTER TABLE public.file_downloads ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 다운로드 기록만 볼 수 있음
CREATE POLICY "Students can view own downloads" ON public.file_downloads
FOR SELECT USING (student_id = auth.uid());

-- 학생은 자신의 다운로드 기록만 삽입 가능
CREATE POLICY "Students can insert own downloads" ON public.file_downloads
FOR INSERT WITH CHECK (student_id = auth.uid());

-- 교사는 자신이 낸 숙제의 다운로드 기록을 볼 수 있음
CREATE POLICY "Teachers can view homework downloads" ON public.file_downloads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.homework h
    WHERE h.id = file_downloads.homework_id
    AND h.teacher_id = auth.uid()
  )
);

-- 7. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_file_downloads_homework_id ON public.file_downloads(homework_id);
CREATE INDEX IF NOT EXISTS idx_file_downloads_student_id ON public.file_downloads(student_id);
CREATE INDEX IF NOT EXISTS idx_file_downloads_downloaded_at ON public.file_downloads(downloaded_at);

-- 8. homework 테이블에 파일 만료 시간 필드 추가
ALTER TABLE public.homework 
ADD COLUMN IF NOT EXISTS file_expires_at TIMESTAMP WITH TIME ZONE;

-- 기본값: 생성 후 7일
UPDATE public.homework 
SET file_expires_at = created_at + INTERVAL '7 days'
WHERE file_expires_at IS NULL;

COMMENT ON COLUMN public.homework.file_expires_at IS 'Expiry time for attached files (auto-delete after this time)';

-- 9. 파일 만료를 확인하는 함수 (자동 삭제용)
CREATE OR REPLACE FUNCTION check_expired_homework_files()
RETURNS TABLE(homework_id UUID, file_path TEXT, expired_at TIMESTAMP WITH TIME ZONE)
LANGUAGE SQL
AS $$
  SELECT 
    h.id as homework_id,
    (jsonb_array_elements(h.resources->'attachments')->>'path')::TEXT as file_path,
    h.file_expires_at as expired_at
  FROM public.homework h
  WHERE h.file_expires_at < NOW()
    AND h.resources IS NOT NULL
    AND h.resources->'attachments' IS NOT NULL;
$$;