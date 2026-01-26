-- Fix link_student_to_planner function parameter mismatch
-- This replaces the non-existent 'is_used' column check with 'student_id IS NULL'

CREATE OR REPLACE FUNCTION link_student_to_planner(invite_code_input TEXT)
RETURNS json AS $$
DECLARE
    invite_record record;
BEGIN
    -- Find valid invite code (student_id is NULL means unused)
    SELECT * INTO invite_record
    FROM public.invite_codes
    WHERE code = invite_code_input
    AND student_id IS NULL
    AND expires_at > NOW();

    IF invite_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid or expired invite code'
        );
    END IF;

    -- Update the invite code with the current student
    UPDATE public.invite_codes
    SET student_id = auth.uid()
    WHERE id = invite_record.id;

    -- Return success response
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully connected to planner',
        'teacher_id', invite_record.teacher_id
    );

EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Connection failed: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION link_student_to_planner(TEXT) TO authenticated;