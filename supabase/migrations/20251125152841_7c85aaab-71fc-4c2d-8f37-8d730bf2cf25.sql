-- Remove business_id requirement from RLS policies
-- Allow authenticated users to access their data

-- Conversations table
DROP POLICY IF EXISTS "Users can view their business conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their business conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their business conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their business conversations" ON public.conversations;

CREATE POLICY "Authenticated users can view conversations" ON public.conversations
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert conversations" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update conversations" ON public.conversations
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete conversations" ON public.conversations
FOR DELETE TO authenticated USING (true);

-- Messages table
DROP POLICY IF EXISTS "Users can view their business messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their business messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their business messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their business messages" ON public.messages;

CREATE POLICY "Authenticated users can view messages" ON public.messages
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages" ON public.messages
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete messages" ON public.messages
FOR DELETE TO authenticated USING (true);

-- Call history table
DROP POLICY IF EXISTS "Users can view their business call history" ON public.call_history;
DROP POLICY IF EXISTS "Users can insert their business call history" ON public.call_history;
DROP POLICY IF EXISTS "Users can update their business call history" ON public.call_history;
DROP POLICY IF EXISTS "Users can delete their business call history" ON public.call_history;

CREATE POLICY "Authenticated users can view call history" ON public.call_history
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert call history" ON public.call_history
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update call history" ON public.call_history
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete call history" ON public.call_history
FOR DELETE TO authenticated USING (true);

-- Transcripts table
DROP POLICY IF EXISTS "Users can view their business transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can insert their business transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can update their business transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can delete their business transcripts" ON public.transcripts;

CREATE POLICY "Authenticated users can view transcripts" ON public.transcripts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert transcripts" ON public.transcripts
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update transcripts" ON public.transcripts
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete transcripts" ON public.transcripts
FOR DELETE TO authenticated USING (true);

-- Customizations table
DROP POLICY IF EXISTS "Users can view their business customizations" ON public.customizations;
DROP POLICY IF EXISTS "Users can insert their business customizations" ON public.customizations;
DROP POLICY IF EXISTS "Users can update their business customizations" ON public.customizations;
DROP POLICY IF EXISTS "Users can delete their business customizations" ON public.customizations;

CREATE POLICY "Authenticated users can view customizations" ON public.customizations
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert customizations" ON public.customizations
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update customizations" ON public.customizations
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete customizations" ON public.customizations
FOR DELETE TO authenticated USING (true);

-- Products table
DROP POLICY IF EXISTS "Users can view their business products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their business products" ON public.products;
DROP POLICY IF EXISTS "Users can update their business products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their business products" ON public.products;

CREATE POLICY "Authenticated users can view products" ON public.products
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert products" ON public.products
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" ON public.products
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete products" ON public.products
FOR DELETE TO authenticated USING (true);

-- Connections table
DROP POLICY IF EXISTS "Users can view their business connections" ON public.connections;
DROP POLICY IF EXISTS "Users can insert their business connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update their business connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete their business connections" ON public.connections;

CREATE POLICY "Authenticated users can view connections" ON public.connections
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert connections" ON public.connections
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update connections" ON public.connections
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete connections" ON public.connections
FOR DELETE TO authenticated USING (true);

-- Toggles table
DROP POLICY IF EXISTS "Users can view their business toggles" ON public.toggles;
DROP POLICY IF EXISTS "Users can insert their business toggles" ON public.toggles;
DROP POLICY IF EXISTS "Users can update their business toggles" ON public.toggles;
DROP POLICY IF EXISTS "Users can delete their business toggles" ON public.toggles;

CREATE POLICY "Authenticated users can view toggles" ON public.toggles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert toggles" ON public.toggles
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update toggles" ON public.toggles
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete toggles" ON public.toggles
FOR DELETE TO authenticated USING (true);

-- Wallet table
DROP POLICY IF EXISTS "Users can view their business wallet" ON public.wallet;
DROP POLICY IF EXISTS "Users can insert their business wallet" ON public.wallet;
DROP POLICY IF EXISTS "Users can update their business wallet" ON public.wallet;
DROP POLICY IF EXISTS "Users can delete their business wallet" ON public.wallet;

CREATE POLICY "Authenticated users can view wallet" ON public.wallet
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert wallet" ON public.wallet
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update wallet" ON public.wallet
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete wallet" ON public.wallet
FOR DELETE TO authenticated USING (true);

-- Sales table
DROP POLICY IF EXISTS "Users can view their business sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert their business sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update their business sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their business sales" ON public.sales;

CREATE POLICY "Authenticated users can view sales" ON public.sales
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sales" ON public.sales
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales" ON public.sales
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete sales" ON public.sales
FOR DELETE TO authenticated USING (true);

-- AI Agents table
DROP POLICY IF EXISTS "Users can view their business AI agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can insert their business AI agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can update their business AI agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can delete their business AI agents" ON public.ai_agents;

CREATE POLICY "Authenticated users can view AI agents" ON public.ai_agents
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert AI agents" ON public.ai_agents
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update AI agents" ON public.ai_agents
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete AI agents" ON public.ai_agents
FOR DELETE TO authenticated USING (true);

-- Product media table
DROP POLICY IF EXISTS "Users can view their business product media" ON public.product_media;
DROP POLICY IF EXISTS "Users can insert their business product media" ON public.product_media;
DROP POLICY IF EXISTS "Users can update their business product media" ON public.product_media;
DROP POLICY IF EXISTS "Users can delete their business product media" ON public.product_media;

CREATE POLICY "Authenticated users can view product media" ON public.product_media
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert product media" ON public.product_media
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update product media" ON public.product_media
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete product media" ON public.product_media
FOR DELETE TO authenticated USING (true);

-- Customer interactions table
DROP POLICY IF EXISTS "Users can view their business interactions" ON public.customer_interactions;
DROP POLICY IF EXISTS "Users can insert their business interactions" ON public.customer_interactions;
DROP POLICY IF EXISTS "Users can update their business interactions" ON public.customer_interactions;
DROP POLICY IF EXISTS "Users can delete their business interactions" ON public.customer_interactions;

CREATE POLICY "Authenticated users can view interactions" ON public.customer_interactions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interactions" ON public.customer_interactions
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update interactions" ON public.customer_interactions
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete interactions" ON public.customer_interactions
FOR DELETE TO authenticated USING (true);