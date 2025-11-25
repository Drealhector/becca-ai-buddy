-- Fix RLS policies to work with business key authentication
-- Update toggles table policies
DROP POLICY IF EXISTS "Users can view their business toggles" ON toggles;
CREATE POLICY "Allow reading toggles"
  ON toggles FOR SELECT
  USING (true);

-- Update customizations table policies  
DROP POLICY IF EXISTS "Users can view their business customizations" ON customizations;
CREATE POLICY "Allow reading customizations"
  ON customizations FOR SELECT
  USING (true);