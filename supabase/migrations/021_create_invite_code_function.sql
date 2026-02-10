-- Create function to generate and store invite code for planners
-- This function generates a 6-character alphanumeric code and stores it in planner_profiles

CREATE OR REPLACE FUNCTION create_invite_code()
RETURNS json AS $$
DECLARE
  v_user_id UUID;
  v_invite_code TEXT;
  v_characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code_exists BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;

  -- Generate unique invite code (retry if collision)
  LOOP
    v_invite_code := '';
    FOR i IN 1..6 LOOP
      v_invite_code := v_invite_code || substr(v_characters, floor(random() * length(v_characters) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM planner_profiles WHERE invite_code = v_invite_code
    ) INTO v_code_exists;

    EXIT WHEN NOT v_code_exists;
  END LOOP;

  -- Update planner_profiles with new invite code
  UPDATE planner_profiles
  SET
    invite_code = v_invite_code,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Planner profile not found'
    );
  END IF;

  -- Return success with code
  RETURN json_build_object(
    'success', true,
    'code', v_invite_code,
    'message', 'Invite code generated successfully'
  );

EXCEPTION
  WHEN others THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to generate invite code: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_invite_code() TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_invite_code() IS 'Generates a unique 6-character invite code and stores it in planner_profiles for the authenticated planner';
