-- Function to get planner profile information
-- This function bypasses RLS to allow students to read their planner's profile

CREATE OR REPLACE FUNCTION public.get_planner_profile(p_planner_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name
  FROM public.profiles p
  WHERE p.id = p_planner_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_planner_profile(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_planner_profile IS 'Allows students to fetch their planner''s profile information (bypasses RLS)';
