-- Step 1: Add business_id column to all data tables
ALTER TABLE connections ADD COLUMN business_id UUID;
ALTER TABLE conversations ADD COLUMN business_id UUID;
ALTER TABLE messages ADD COLUMN business_id UUID;
ALTER TABLE call_history ADD COLUMN business_id UUID;
ALTER TABLE customizations ADD COLUMN business_id UUID;
ALTER TABLE transcripts ADD COLUMN business_id UUID;
ALTER TABLE sales ADD COLUMN business_id UUID;
ALTER TABLE wallet ADD COLUMN business_id UUID;
ALTER TABLE toggles ADD COLUMN business_id UUID;
ALTER TABLE products ADD COLUMN business_id UUID;
ALTER TABLE customer_interactions ADD COLUMN business_id UUID;
ALTER TABLE product_media ADD COLUMN business_id UUID;
ALTER TABLE ai_agents ADD COLUMN business_id UUID;

-- Step 2: Create foreign key constraints to business_keys
ALTER TABLE connections ADD CONSTRAINT connections_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD CONSTRAINT conversations_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE call_history ADD CONSTRAINT call_history_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE customizations ADD CONSTRAINT customizations_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE transcripts ADD CONSTRAINT transcripts_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE sales ADD CONSTRAINT sales_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE wallet ADD CONSTRAINT wallet_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE toggles ADD CONSTRAINT toggles_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE products ADD CONSTRAINT products_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE customer_interactions ADD CONSTRAINT customer_interactions_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE product_media ADD CONSTRAINT product_media_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;
ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES business_keys(id) ON DELETE CASCADE;

-- Step 3: Create helper function to get user's business_id
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS UUID
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

-- Step 4: Drop existing overly permissive RLS policies and create proper ones

-- Connections policies
DROP POLICY IF EXISTS "Allow all operations on connections" ON connections;
CREATE POLICY "Users can view their business connections"
  ON connections FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can update their business connections"
  ON connections FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business connections"
  ON connections FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business connections"
  ON connections FOR DELETE
  USING (business_id = get_user_business_id());

-- Conversations policies
DROP POLICY IF EXISTS "Allow all operations on conversations" ON conversations;
CREATE POLICY "Users can view their business conversations"
  ON conversations FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business conversations"
  ON conversations FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business conversations"
  ON conversations FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business conversations"
  ON conversations FOR DELETE
  USING (business_id = get_user_business_id());

-- Messages policies
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
CREATE POLICY "Users can view their business messages"
  ON messages FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business messages"
  ON messages FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business messages"
  ON messages FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business messages"
  ON messages FOR DELETE
  USING (business_id = get_user_business_id());

-- Call history policies
DROP POLICY IF EXISTS "Allow all operations on call_history" ON call_history;
CREATE POLICY "Users can view their business call history"
  ON call_history FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business call history"
  ON call_history FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business call history"
  ON call_history FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business call history"
  ON call_history FOR DELETE
  USING (business_id = get_user_business_id());

-- Customizations policies
DROP POLICY IF EXISTS "Allow all operations on customizations" ON customizations;
CREATE POLICY "Users can view their business customizations"
  ON customizations FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business customizations"
  ON customizations FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business customizations"
  ON customizations FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business customizations"
  ON customizations FOR DELETE
  USING (business_id = get_user_business_id());

-- Transcripts policies
DROP POLICY IF EXISTS "Allow all operations on transcripts" ON transcripts;
CREATE POLICY "Users can view their business transcripts"
  ON transcripts FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business transcripts"
  ON transcripts FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business transcripts"
  ON transcripts FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business transcripts"
  ON transcripts FOR DELETE
  USING (business_id = get_user_business_id());

-- Sales policies
DROP POLICY IF EXISTS "Allow all operations on sales" ON sales;
CREATE POLICY "Users can view their business sales"
  ON sales FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business sales"
  ON sales FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business sales"
  ON sales FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business sales"
  ON sales FOR DELETE
  USING (business_id = get_user_business_id());

-- Wallet policies
DROP POLICY IF EXISTS "Allow all operations on wallet" ON wallet;
CREATE POLICY "Users can view their business wallet"
  ON wallet FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business wallet"
  ON wallet FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business wallet"
  ON wallet FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business wallet"
  ON wallet FOR DELETE
  USING (business_id = get_user_business_id());

-- Toggles policies
DROP POLICY IF EXISTS "Allow all operations on toggles" ON toggles;
CREATE POLICY "Users can view their business toggles"
  ON toggles FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business toggles"
  ON toggles FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business toggles"
  ON toggles FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business toggles"
  ON toggles FOR DELETE
  USING (business_id = get_user_business_id());

-- Products policies (keep public read, but restrict write)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products can be created by anyone" ON products;
DROP POLICY IF EXISTS "Products can be updated by anyone" ON products;
DROP POLICY IF EXISTS "Products can be deleted by anyone" ON products;
CREATE POLICY "Users can view their business products"
  ON products FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business products"
  ON products FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business products"
  ON products FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business products"
  ON products FOR DELETE
  USING (business_id = get_user_business_id());

-- Customer interactions policies
DROP POLICY IF EXISTS "Public can view customer_interactions" ON customer_interactions;
DROP POLICY IF EXISTS "Public can insert customer_interactions" ON customer_interactions;
DROP POLICY IF EXISTS "Public can update customer_interactions" ON customer_interactions;
DROP POLICY IF EXISTS "Public can delete customer_interactions" ON customer_interactions;
CREATE POLICY "Users can view their business interactions"
  ON customer_interactions FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business interactions"
  ON customer_interactions FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business interactions"
  ON customer_interactions FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business interactions"
  ON customer_interactions FOR DELETE
  USING (business_id = get_user_business_id());

-- Product media policies
DROP POLICY IF EXISTS "Public can view product_media" ON product_media;
DROP POLICY IF EXISTS "Public can insert product_media" ON product_media;
DROP POLICY IF EXISTS "Public can update product_media" ON product_media;
DROP POLICY IF EXISTS "Public can delete product_media" ON product_media;
CREATE POLICY "Users can view their business product media"
  ON product_media FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business product media"
  ON product_media FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business product media"
  ON product_media FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business product media"
  ON product_media FOR DELETE
  USING (business_id = get_user_business_id());

-- AI agents policies
DROP POLICY IF EXISTS "Public can view ai_agents" ON ai_agents;
DROP POLICY IF EXISTS "Public can insert ai_agents" ON ai_agents;
DROP POLICY IF EXISTS "Public can update ai_agents" ON ai_agents;
DROP POLICY IF EXISTS "Public can delete ai_agents" ON ai_agents;
CREATE POLICY "Users can view their business AI agents"
  ON ai_agents FOR SELECT
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can insert their business AI agents"
  ON ai_agents FOR INSERT
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "Users can update their business AI agents"
  ON ai_agents FOR UPDATE
  USING (business_id = get_user_business_id());
CREATE POLICY "Users can delete their business AI agents"
  ON ai_agents FOR DELETE
  USING (business_id = get_user_business_id());

-- Bot config and personality tables remain globally accessible (single config for now)
-- whatsapp_messages remains globally accessible (webhook endpoint)