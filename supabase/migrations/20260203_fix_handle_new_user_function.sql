-- Fix handle_new_user function to handle role casting more safely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_value user_role;
BEGIN
    -- Safely determine role - default to 'student' if not specified or invalid
    BEGIN
        user_role_value := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
        user_role_value := 'student'::user_role;
    END;

    -- If role is NULL, default to student
    IF user_role_value IS NULL THEN
        user_role_value := 'student'::user_role;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        user_role_value
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
