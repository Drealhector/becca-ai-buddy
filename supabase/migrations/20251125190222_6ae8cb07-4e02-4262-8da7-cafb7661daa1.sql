-- Add RLS policies for connections table to allow business key authentication

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their business connections" ON connections;
DROP POLICY IF EXISTS "Users can update their business connections" ON connections;
DROP POLICY IF EXISTS "Users can insert connections for their business" ON connections;

-- Create new policies that allow access
CREATE POLICY "Allow reading connections"
  ON connections FOR SELECT
  USING (true);

CREATE POLICY "Allow updating connections"
  ON connections FOR UPDATE
  USING (true);

CREATE POLICY "Allow inserting connections"
  ON connections FOR INSERT
  WITH CHECK (true);

-- Also ensure toggles and customizations have proper UPDATE policies
DROP POLICY IF EXISTS "Users can update their business toggles" ON toggles;
CREATE POLICY "Allow updating toggles"
  ON toggles FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can update their business customizations" ON customizations;
CREATE POLICY "Allow updating customizations"
  ON customizations FOR UPDATE
  USING (true);