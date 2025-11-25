-- Update RLS policies to allow anon access (business key login doesn't use auth)

-- Conversations
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can delete conversations" ON public.conversations;

CREATE POLICY "Allow all to view conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Allow all to insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update conversations" ON public.conversations FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete conversations" ON public.conversations FOR DELETE USING (true);

-- Messages
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can delete messages" ON public.messages;

CREATE POLICY "Allow all to view messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow all to insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update messages" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete messages" ON public.messages FOR DELETE USING (true);

-- Call history
DROP POLICY IF EXISTS "Authenticated users can view call history" ON public.call_history;
DROP POLICY IF EXISTS "Authenticated users can insert call history" ON public.call_history;
DROP POLICY IF EXISTS "Authenticated users can update call history" ON public.call_history;
DROP POLICY IF EXISTS "Authenticated users can delete call history" ON public.call_history;

CREATE POLICY "Allow all to view call history" ON public.call_history FOR SELECT USING (true);
CREATE POLICY "Allow all to insert call history" ON public.call_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update call history" ON public.call_history FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete call history" ON public.call_history FOR DELETE USING (true);

-- Transcripts
DROP POLICY IF EXISTS "Authenticated users can view transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Authenticated users can insert transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Authenticated users can update transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Authenticated users can delete transcripts" ON public.transcripts;

CREATE POLICY "Allow all to view transcripts" ON public.transcripts FOR SELECT USING (true);
CREATE POLICY "Allow all to insert transcripts" ON public.transcripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update transcripts" ON public.transcripts FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete transcripts" ON public.transcripts FOR DELETE USING (true);

-- Customizations
DROP POLICY IF EXISTS "Authenticated users can view customizations" ON public.customizations;
DROP POLICY IF EXISTS "Authenticated users can insert customizations" ON public.customizations;
DROP POLICY IF EXISTS "Authenticated users can update customizations" ON public.customizations;
DROP POLICY IF EXISTS "Authenticated users can delete customizations" ON public.customizations;

CREATE POLICY "Allow all to view customizations" ON public.customizations FOR SELECT USING (true);
CREATE POLICY "Allow all to insert customizations" ON public.customizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update customizations" ON public.customizations FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete customizations" ON public.customizations FOR DELETE USING (true);

-- Toggles
DROP POLICY IF EXISTS "Authenticated users can view toggles" ON public.toggles;
DROP POLICY IF EXISTS "Authenticated users can insert toggles" ON public.toggles;
DROP POLICY IF EXISTS "Authenticated users can update toggles" ON public.toggles;
DROP POLICY IF EXISTS "Authenticated users can delete toggles" ON public.toggles;

CREATE POLICY "Allow all to view toggles" ON public.toggles FOR SELECT USING (true);
CREATE POLICY "Allow all to insert toggles" ON public.toggles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update toggles" ON public.toggles FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete toggles" ON public.toggles FOR DELETE USING (true);

-- Products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Allow all to view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow all to insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete products" ON public.products FOR DELETE USING (true);

-- Connections
DROP POLICY IF EXISTS "Authenticated users can view connections" ON public.connections;
DROP POLICY IF EXISTS "Authenticated users can insert connections" ON public.connections;
DROP POLICY IF EXISTS "Authenticated users can update connections" ON public.connections;
DROP POLICY IF EXISTS "Authenticated users can delete connections" ON public.connections;

CREATE POLICY "Allow all to view connections" ON public.connections FOR SELECT USING (true);
CREATE POLICY "Allow all to insert connections" ON public.connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update connections" ON public.connections FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete connections" ON public.connections FOR DELETE USING (true);