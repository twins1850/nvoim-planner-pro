-- ============================================================================
-- Migration 028: Scheduled Homework Delivery System
-- ============================================================================
-- Purpose: Add scheduled delivery capabilities to homework system
-- Date: 2026-02-13
-- Phase: 9B - Scheduled Homework Delivery
-- ============================================================================

-- ============================================================================
-- 1. Add Scheduled Delivery Columns
-- ============================================================================

DO $$
BEGIN
  -- scheduled_at column (예약 발송 시간)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework' AND column_name = 'scheduled_at') THEN
    ALTER TABLE public.homework
    ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;

  -- delivery_status column (발송 상태)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework' AND column_name = 'delivery_status') THEN
    ALTER TABLE public.homework
    ADD COLUMN delivery_status TEXT DEFAULT 'draft'
    CHECK (delivery_status IN ('draft', 'scheduled', 'published', 'cancelled'));
  END IF;

  -- published_at column (실제 발송 시간)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework' AND column_name = 'published_at') THEN
    ALTER TABLE public.homework
    ADD COLUMN published_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;

  -- target_student_ids column (예약 시 선택된 학생들)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework' AND column_name = 'target_student_ids') THEN
    ALTER TABLE public.homework
    ADD COLUMN target_student_ids UUID[] DEFAULT NULL;
  END IF;

  -- scheduled_metadata column (예약 메타데이터)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework' AND column_name = 'scheduled_metadata') THEN
    ALTER TABLE public.homework
    ADD COLUMN scheduled_metadata JSONB DEFAULT NULL;
  END IF;
END $$;

-- ============================================================================
-- 2. Add Performance Indexes
-- ============================================================================

-- Delivery status index for filtering
CREATE INDEX IF NOT EXISTS idx_homework_delivery_status
ON public.homework(delivery_status);

-- Scheduled time index for batch processing (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_homework_scheduled_at
ON public.homework(scheduled_at)
WHERE scheduled_at IS NOT NULL AND delivery_status = 'scheduled';

-- Composite index for finding pending scheduled homework (cron job optimization)
CREATE INDEX IF NOT EXISTS idx_homework_scheduled_pending
ON public.homework(scheduled_at, delivery_status)
WHERE delivery_status = 'scheduled';

-- Teacher-specific delivery status queries (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_homework_teacher_delivery
ON public.homework(planner_id, delivery_status, created_at DESC)
WHERE planner_id IS NOT NULL;

-- Array search for target student IDs (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_homework_target_students
ON public.homework USING GIN(target_student_ids)
WHERE target_student_ids IS NOT NULL;

-- JSONB metadata search
CREATE INDEX IF NOT EXISTS idx_homework_scheduled_metadata
ON public.homework USING GIN(scheduled_metadata)
WHERE scheduled_metadata IS NOT NULL;

-- ============================================================================
-- 3. Update Existing Data (Migration Strategy)
-- ============================================================================

-- Set existing homework to 'published' status (already sent)
UPDATE public.homework
SET
  delivery_status = 'published',
  published_at = created_at
WHERE delivery_status IS NULL OR delivery_status = 'draft';

-- ============================================================================
-- 4. Add Trigger for Auto-Publishing
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_publish_scheduled_homework()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-set published_at when status changes to 'published'
  IF NEW.delivery_status = 'published' AND OLD.delivery_status != 'published' THEN
    NEW.published_at = NOW();
  END IF;

  -- Prevent modification of published homework
  IF OLD.delivery_status = 'published' AND NEW.delivery_status != 'published' THEN
    RAISE EXCEPTION 'Cannot change delivery_status of already published homework';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_publish_homework ON public.homework;

CREATE TRIGGER trigger_auto_publish_homework
  BEFORE UPDATE OF delivery_status ON public.homework
  FOR EACH ROW
  EXECUTE FUNCTION auto_publish_scheduled_homework();

-- ============================================================================
-- 5. Add RPC Function: Get Scheduled Homework
-- ============================================================================

CREATE OR REPLACE FUNCTION get_scheduled_homework(
  p_planner_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT,
  target_student_count INTEGER,
  target_student_ids UUID[],
  scheduled_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.title,
    h.description,
    h.instructions,
    h.due_date,
    h.scheduled_at,
    h.published_at,
    h.delivery_status,
    COALESCE(array_length(h.target_student_ids, 1), 0) AS target_student_count,
    h.target_student_ids,
    h.scheduled_metadata,
    h.created_at
  FROM public.homework h
  WHERE h.planner_id = p_planner_id
    AND (p_status IS NULL OR h.delivery_status = p_status)
  ORDER BY
    CASE
      WHEN h.delivery_status = 'scheduled' THEN 1
      WHEN h.delivery_status = 'draft' THEN 2
      ELSE 3
    END,
    h.scheduled_at DESC NULLS LAST,
    h.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_scheduled_homework(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 6. Add RPC Function: Batch Process Scheduled Homework
-- ============================================================================

CREATE OR REPLACE FUNCTION process_scheduled_homework_batch()
RETURNS TABLE (
  hw_id UUID,
  is_processed BOOLEAN,
  err_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_homework RECORD;
  v_student_id UUID;
BEGIN
  -- Find all scheduled homework that should be published now
  FOR v_homework IN
    SELECT id, target_student_ids
    FROM public.homework
    WHERE delivery_status = 'scheduled'
      AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT 100  -- Process in batches to avoid timeouts
  LOOP
    BEGIN
      -- Create homework_assignments for each target student
      IF v_homework.target_student_ids IS NOT NULL THEN
        FOREACH v_student_id IN ARRAY v_homework.target_student_ids
        LOOP
          INSERT INTO public.homework_assignments (
            homework_id,
            student_id,
            status,
            assigned_at
          )
          VALUES (
            v_homework.id,
            v_student_id,
            'pending',
            NOW()
          )
          ON CONFLICT (homework_id, student_id) DO NOTHING;
        END LOOP;
      END IF;

      -- Update homework status to published
      UPDATE public.homework
      SET
        delivery_status = 'published',
        published_at = NOW()
      WHERE id = v_homework.id;

      -- Return success
      hw_id := v_homework.id;
      is_processed := TRUE;
      err_message := NULL;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other homework
      hw_id := v_homework.id;
      is_processed := FALSE;
      err_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION process_scheduled_homework_batch() TO authenticated;

-- ============================================================================
-- 7. Add Comments and Documentation
-- ============================================================================

COMMENT ON COLUMN public.homework.scheduled_at IS 'Scheduled delivery time - NULL means immediate delivery';
COMMENT ON COLUMN public.homework.delivery_status IS 'Delivery status - draft, scheduled, published, cancelled';
COMMENT ON COLUMN public.homework.published_at IS 'Actual time when homework was published to students';
COMMENT ON COLUMN public.homework.target_student_ids IS 'Student IDs selected at scheduling time - immune to student list changes';
COMMENT ON COLUMN public.homework.scheduled_metadata IS 'Metadata about scheduling (student count, scheduler info, etc)';

COMMENT ON FUNCTION get_scheduled_homework(UUID, TEXT) IS 'Retrieves scheduled homework for a planner with optional status filter';
COMMENT ON FUNCTION process_scheduled_homework_batch() IS 'Batch processes scheduled homework that is due for publishing (cron job)';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration adds:
-- ✅ scheduled_at (TIMESTAMP) - 예약 발송 시간
-- ✅ delivery_status (TEXT) - 발송 상태 (draft, scheduled, published, cancelled)
-- ✅ published_at (TIMESTAMP) - 실제 발송 시간
-- ✅ target_student_ids (UUID[]) - 예약 시 선택된 학생 ID 배열
-- ✅ scheduled_metadata (JSONB) - 예약 메타데이터
-- ✅ 6 performance indexes (B-tree + GIN)
-- ✅ Auto-publish trigger function
-- ✅ RPC functions for scheduled homework management
-- ✅ Batch processing function for cron jobs
-- ============================================================================
