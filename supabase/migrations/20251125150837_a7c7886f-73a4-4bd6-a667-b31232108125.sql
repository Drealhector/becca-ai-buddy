-- Create function to get user's business_id from user_onboarding table
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bk.id
  FROM public.user_onboarding uo
  JOIN public.business_keys bk ON bk.business_key = uo.business_key
  WHERE uo.user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_business_id() TO authenticated;