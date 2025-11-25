-- Temporarily update RLS policies to allow business key authentication to work
-- This allows conversations, messages, call_history, and transcripts to be queried
-- without requiring Supabase auth.uid()

-- Update conversations policies
DROP POLICY IF EXISTS "Users can view their business conversations" ON conversations;
CREATE POLICY "Allow reading conversations"
  ON conversations FOR SELECT
  USING (true);

-- Update messages policies
DROP POLICY IF EXISTS "Users can view their business messages" ON messages;
CREATE POLICY "Allow reading messages"
  ON messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert messages for their business" ON messages;
CREATE POLICY "Allow inserting messages"
  ON messages FOR INSERT
  WITH CHECK (true);

-- Update call_history policies
DROP POLICY IF EXISTS "Users can view their business call history" ON call_history;
CREATE POLICY "Allow reading call history"
  ON call_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert call history for their business" ON call_history;
CREATE POLICY "Allow inserting call history"
  ON call_history FOR INSERT
  WITH CHECK (true);

-- Allow deleting call history
CREATE POLICY "Allow deleting call history"
  ON call_history FOR DELETE
  USING (true);

-- Update transcripts policies
DROP POLICY IF EXISTS "Users can view their business transcripts" ON transcripts;
CREATE POLICY "Allow reading transcripts"
  ON transcripts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert transcripts for their business" ON transcripts;
CREATE POLICY "Allow inserting transcripts"
  ON transcripts FOR INSERT
  WITH CHECK (true);