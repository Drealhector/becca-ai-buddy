-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Business keys are viewable by authenticated users" ON business_keys;

-- Create a new policy that allows public read access for login verification
CREATE POLICY "Business keys are viewable by everyone for login"
  ON business_keys
  FOR SELECT
  USING (true);