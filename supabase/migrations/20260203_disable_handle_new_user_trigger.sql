-- Disable the on_auth_user_created trigger since we're now creating profiles manually in client code
-- This works around the trigger execution issues

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function for reference but it won't be used
-- If you need to re-enable the trigger later, you can run:
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
