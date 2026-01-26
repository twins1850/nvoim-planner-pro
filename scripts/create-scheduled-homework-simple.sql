-- 간단한 scheduled_homework 테이블 생성
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
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled')),
  target_students JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_scheduled_homework_planner_id ON scheduled_homework(planner_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_homework_scheduled_for ON scheduled_homework(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_homework_status ON scheduled_homework(status);

-- RLS 정책 설정
ALTER TABLE scheduled_homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners can manage their scheduled homework"
  ON scheduled_homework
  FOR ALL
  USING (auth.uid() = planner_id);