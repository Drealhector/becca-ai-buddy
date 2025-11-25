-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table to map users to businesses
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.business_keys(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, business_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user's business access
CREATE OR REPLACE FUNCTION public.user_has_business_access(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND business_id = _business_id
  )
$$;

-- Create security definer function to get user's business IDs
CREATE OR REPLACE FUNCTION public.get_user_business_ids(_user_id UUID)
RETURNS TABLE (business_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update RLS policies for all tables to use proper authentication

-- products table
DROP POLICY IF EXISTS "Allow all to view products" ON public.products;
DROP POLICY IF EXISTS "Allow all to insert products" ON public.products;
DROP POLICY IF EXISTS "Allow all to update products" ON public.products;
DROP POLICY IF EXISTS "Allow all to delete products" ON public.products;

CREATE POLICY "Users can view products from their business"
ON public.products FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can insert products for their business"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can update products from their business"
ON public.products FOR UPDATE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can delete products from their business"
ON public.products FOR DELETE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- customizations table
DROP POLICY IF EXISTS "Allow all to view customizations" ON public.customizations;
DROP POLICY IF EXISTS "Allow all to insert customizations" ON public.customizations;
DROP POLICY IF EXISTS "Allow all to update customizations" ON public.customizations;
DROP POLICY IF EXISTS "Allow all to delete customizations" ON public.customizations;

CREATE POLICY "Users can view their business customizations"
ON public.customizations FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can update their business customizations"
ON public.customizations FOR UPDATE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- messages table
DROP POLICY IF EXISTS "Allow all to view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all to update messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all to delete messages" ON public.messages;

CREATE POLICY "Users can view their business messages"
ON public.messages FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can insert messages for their business"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- conversations table
DROP POLICY IF EXISTS "Allow all to view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow all to insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow all to update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow all to delete conversations" ON public.conversations;

CREATE POLICY "Users can view their business conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can insert conversations for their business"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- transcripts table
DROP POLICY IF EXISTS "Allow all to view transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Allow all to insert transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Allow all to update transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Allow all to delete transcripts" ON public.transcripts;

CREATE POLICY "Users can view their business transcripts"
ON public.transcripts FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can insert transcripts for their business"
ON public.transcripts FOR INSERT
TO authenticated
WITH CHECK (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- call_history table
DROP POLICY IF EXISTS "Allow all to view call history" ON public.call_history;
DROP POLICY IF EXISTS "Allow all to insert call history" ON public.call_history;
DROP POLICY IF EXISTS "Allow all to update call history" ON public.call_history;
DROP POLICY IF EXISTS "Allow all to delete call history" ON public.call_history;

CREATE POLICY "Users can view their business call history"
ON public.call_history FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can insert call history for their business"
ON public.call_history FOR INSERT
TO authenticated
WITH CHECK (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- connections table
DROP POLICY IF EXISTS "Allow all to view connections" ON public.connections;
DROP POLICY IF EXISTS "Allow all to insert connections" ON public.connections;
DROP POLICY IF EXISTS "Allow all to update connections" ON public.connections;
DROP POLICY IF EXISTS "Allow all to delete connections" ON public.connections;

CREATE POLICY "Users can view their business connections"
ON public.connections FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can update their business connections"
ON public.connections FOR UPDATE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- toggles table
DROP POLICY IF EXISTS "Allow all to view toggles" ON public.toggles;
DROP POLICY IF EXISTS "Allow all to insert toggles" ON public.toggles;
DROP POLICY IF EXISTS "Allow all to update toggles" ON public.toggles;
DROP POLICY IF EXISTS "Allow all to delete toggles" ON public.toggles;

CREATE POLICY "Users can view their business toggles"
ON public.toggles FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can update their business toggles"
ON public.toggles FOR UPDATE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- sales table
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;

CREATE POLICY "Users can view their business sales"
ON public.sales FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- wallet table
DROP POLICY IF EXISTS "Authenticated users can view wallet" ON public.wallet;
DROP POLICY IF EXISTS "Authenticated users can insert wallet" ON public.wallet;
DROP POLICY IF EXISTS "Authenticated users can update wallet" ON public.wallet;
DROP POLICY IF EXISTS "Authenticated users can delete wallet" ON public.wallet;

CREATE POLICY "Users can view their business wallet"
ON public.wallet FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- ai_agents table
DROP POLICY IF EXISTS "Authenticated users can view AI agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Authenticated users can insert AI agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Authenticated users can update AI agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Authenticated users can delete AI agents" ON public.ai_agents;

CREATE POLICY "Users can view their business AI agents"
ON public.ai_agents FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can insert AI agents for their business"
ON public.ai_agents FOR INSERT
TO authenticated
WITH CHECK (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can update their business AI agents"
ON public.ai_agents FOR UPDATE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can delete their business AI agents"
ON public.ai_agents FOR DELETE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- product_media table
DROP POLICY IF EXISTS "Authenticated users can view product media" ON public.product_media;
DROP POLICY IF EXISTS "Authenticated users can insert product media" ON public.product_media;
DROP POLICY IF EXISTS "Authenticated users can update product media" ON public.product_media;
DROP POLICY IF EXISTS "Authenticated users can delete product media" ON public.product_media;

CREATE POLICY "Users can view their business product media"
ON public.product_media FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can insert product media for their business"
ON public.product_media FOR INSERT
TO authenticated
WITH CHECK (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can update their business product media"
ON public.product_media FOR UPDATE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Users can delete their business product media"
ON public.product_media FOR DELETE
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- customer_interactions table
DROP POLICY IF EXISTS "Authenticated users can view interactions" ON public.customer_interactions;
DROP POLICY IF EXISTS "Authenticated users can insert interactions" ON public.customer_interactions;
DROP POLICY IF EXISTS "Authenticated users can update interactions" ON public.customer_interactions;
DROP POLICY IF EXISTS "Authenticated users can delete interactions" ON public.customer_interactions;

CREATE POLICY "Users can view their business interactions"
ON public.customer_interactions FOR SELECT
TO authenticated
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- business_keys table - keep SELECT public for login, but restrict management
DROP POLICY IF EXISTS "Business keys are viewable by everyone for login" ON public.business_keys;

CREATE POLICY "Business keys are viewable for login"
ON public.business_keys FOR SELECT
USING (true);

-- whatsapp_messages - keep public for webhook integration
-- Note: This should ideally have webhook signature verification