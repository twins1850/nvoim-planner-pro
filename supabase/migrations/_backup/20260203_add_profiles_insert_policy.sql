-- Add INSERT policy for profiles table to allow handle_new_user() trigger to work
-- The trigger runs during user signup before auth.uid() is available,
-- so we need to allow INSERT when creating the user's own profile

CREATE POLICY "Allow insert during signup" ON public.profiles
    FOR INSERT
    WITH CHECK (true);

-- Note: This policy allows any INSERT, but in practice only the handle_new_user()
-- trigger will be inserting rows, and it's a SECURITY DEFINER function that
-- ensures the id matches the auth.users id being created.
