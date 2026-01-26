-- Phase 2: 예약 전송 시스템을 위한 scheduled_homework 테이블 생성
-- 2026-01-09: 예약 숙제 스케줄링 기능

-- 예약된 숙제 테이블
CREATE TABLE IF NOT EXISTS scheduled_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  resources JSONB DEFAULT '[]'::jsonb,
  estimated_time_minutes INTEGER,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- 예약 관련 필드
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL, -- 언제 자동 배정될지
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled')),
  
  -- 누구에게 보낼지 (학생들 선택)
  target_students JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{"id": "uuid", "name": "김학생"}]
  
  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE -- 실제로 전송된 시간
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_scheduled_homework_planner_id ON scheduled_homework(planner_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_homework_scheduled_for ON scheduled_homework(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_homework_status ON scheduled_homework(status);

-- RLS 정책 설정
ALTER TABLE scheduled_homework ENABLE ROW LEVEL SECURITY;

-- 플래너는 자신의 예약 숙제만 관리 가능
CREATE POLICY "Planners can manage their scheduled homework"
  ON scheduled_homework
  FOR ALL
  USING (
    auth.uid() = planner_id
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scheduled_homework_updated_at
  BEFORE UPDATE ON scheduled_homework
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- 예약된 숙제를 실제 숙제로 변환하는 함수
CREATE OR REPLACE FUNCTION process_scheduled_homework()
RETURNS TABLE(processed_count INTEGER) AS $$
DECLARE
  scheduled_hw RECORD;
  new_homework_id UUID;
  student_record JSONB;
  processed INTEGER := 0;
BEGIN
  -- 현재 시간이 지난 scheduled_homework들을 처리
  FOR scheduled_hw IN 
    SELECT * FROM scheduled_homework 
    WHERE scheduled_for <= NOW() 
    AND status = 'scheduled'
  LOOP
    -- 실제 숙제 생성
    INSERT INTO homework (
      planner_id,
      lesson_id,
      title,
      description,
      instructions,
      resources,
      estimated_time_minutes,
      due_date,
      created_at
    ) VALUES (
      scheduled_hw.planner_id,
      scheduled_hw.lesson_id,
      scheduled_hw.title,
      scheduled_hw.description,
      scheduled_hw.instructions,
      scheduled_hw.resources,
      scheduled_hw.estimated_time_minutes,
      scheduled_hw.due_date,
      NOW()
    ) RETURNING id INTO new_homework_id;
    
    -- 각 학생에게 숙제 배정
    FOR student_record IN SELECT * FROM jsonb_array_elements(scheduled_hw.target_students)
    LOOP
      INSERT INTO homework_assignments (
        homework_id,
        student_id,
        status,
        assigned_at
      ) VALUES (
        new_homework_id,
        (student_record->>'id')::UUID,
        'pending',
        NOW()
      );
    END LOOP;
    
    -- scheduled_homework 상태 업데이트
    UPDATE scheduled_homework 
    SET status = 'sent', sent_at = NOW()
    WHERE id = scheduled_hw.id;
    
    processed := processed + 1;
  END LOOP;
  
  RETURN QUERY SELECT processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE scheduled_homework IS 'Phase 2: 예약된 숙제 스케줄링을 위한 테이블';
COMMENT ON FUNCTION process_scheduled_homework() IS '예약된 시간이 지난 숙제들을 실제 숙제로 변환하는 함수';