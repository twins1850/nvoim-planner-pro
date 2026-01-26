-- Fix student profile access and ensure proper RLS policies

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.student_profiles;

-- Recreate RLS policies with proper permissions
CREATE POLICY "Students can view own profile"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Students can update own profile"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Students can insert own profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also allow teachers to view their students' profiles
CREATE POLICY "Teachers can view student profiles"
  ON public.student_profiles FOR SELECT
  USING (
    planner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.students s 
      WHERE s.user_id = student_profiles.id 
      AND s.teacher_id = auth.uid()
    )
  );

-- Create function to automatically create student profile on first login
CREATE OR REPLACE FUNCTION create_student_profile_if_not_exists()
RETURNS trigger AS $$
BEGIN
  -- Insert student profile if it doesn't exist
  INSERT INTO public.student_profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create student profile on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_student_profile_if_not_exists();

-- Also create a function to handle profile creation on login
CREATE OR REPLACE FUNCTION ensure_student_profile_exists(user_id UUID DEFAULT auth.uid())
RETURNS json AS $$
DECLARE
    profile_exists BOOLEAN;
    user_email TEXT;
BEGIN
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.student_profiles WHERE id = user_id) INTO profile_exists;
    
    -- If no profile exists, create one
    IF NOT profile_exists THEN
        -- Get user email from auth.users
        SELECT email INTO user_email FROM auth.users WHERE id = user_id;
        
        -- Insert new profile
        INSERT INTO public.student_profiles (id, email, created_at, updated_at)
        VALUES (user_id, user_email, NOW(), NOW());
        
        RETURN json_build_object(
            'success', true,
            'message', 'Student profile created',
            'profile_created', true
        );
    ELSE
        RETURN json_build_object(
            'success', true,
            'message', 'Student profile already exists',
            'profile_created', false
        );
    END IF;
    
EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to create student profile: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_student_profile_exists(UUID) TO authenticated;