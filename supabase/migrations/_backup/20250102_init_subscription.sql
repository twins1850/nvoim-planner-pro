-- Migration: 20250102_init_subscription
-- Description: Adds subscription management and planner invite codes

-- 1. Create Subscription Types
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trial');

-- 2. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type subscription_plan DEFAULT 'free',
    status subscription_status DEFAULT 'active',
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    max_students INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Add Invite Code to Planner Profiles
ALTER TABLE public.planner_profiles 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_accepting_students BOOLEAN DEFAULT true;

-- 4. Enable RLS for Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role should insert/update subscriptions (via Webhook), 
-- but for MVP/Testing we might allow the user to read it.
-- We generally don't want users updating their own subscription status directly via API.

-- 6. RPC Function for Student Onboarding (linking to planner)
-- This function allows a student to send a planner's invite code.
-- If valid, it links the student to that planner.
CREATE OR REPLACE FUNCTION link_student_to_planner(code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_planner_id UUID;
    planner_subscription_record RECORD;
    current_student_count INTEGER;
BEGIN
    -- 1. Find the planner by invite code
    SELECT id INTO target_planner_id
    FROM public.planner_profiles
    WHERE invite_code = code;

    IF target_planner_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid invite code');
    END IF;

    -- 2. Check Planner's Subscription Limits
    SELECT * INTO planner_subscription_record
    FROM public.subscriptions
    WHERE user_id = target_planner_id;

    -- If no subscription record, assume free tier defaults (e.g., 5 students) or strict (0)
    -- For now, let's assume they must have a record. 
    -- If NULL, we might want to create a default one or block.
    
    -- Count current students
    SELECT COUNT(*) INTO current_student_count
    FROM public.student_profiles
    WHERE planner_id = target_planner_id;

    IF planner_subscription_record.max_students <= current_student_count THEN
        RETURN jsonb_build_object('success', false, 'message', 'Planner has reached maximum student capacity');
    END IF;

    -- 3. Link Student
    UPDATE public.student_profiles
    SET planner_id = target_planner_id,
        updated_at = NOW()
    WHERE id = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Successfully linked to planner');
END;
$$;
