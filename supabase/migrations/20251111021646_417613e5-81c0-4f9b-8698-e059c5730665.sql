-- Add new fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS price numeric,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS features text[],
ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0;

-- Create ai_agents table
CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  assistant_id text NOT NULL,
  web_url text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- Create product_media table
CREATE TABLE IF NOT EXISTS product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  assistant_id text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL,
  label text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create customer_interactions table
CREATE TABLE IF NOT EXISTS customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  assistant_id text NOT NULL,
  transcript text,
  duration integer,
  outcome text,
  timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public can view ai_agents" ON ai_agents FOR SELECT USING (true);
CREATE POLICY "Public can insert ai_agents" ON ai_agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update ai_agents" ON ai_agents FOR UPDATE USING (true);
CREATE POLICY "Public can delete ai_agents" ON ai_agents FOR DELETE USING (true);

CREATE POLICY "Public can view product_media" ON product_media FOR SELECT USING (true);
CREATE POLICY "Public can insert product_media" ON product_media FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update product_media" ON product_media FOR UPDATE USING (true);
CREATE POLICY "Public can delete product_media" ON product_media FOR DELETE USING (true);

CREATE POLICY "Public can view customer_interactions" ON customer_interactions FOR SELECT USING (true);
CREATE POLICY "Public can insert customer_interactions" ON customer_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update customer_interactions" ON customer_interactions FOR UPDATE USING (true);
CREATE POLICY "Public can delete customer_interactions" ON customer_interactions FOR DELETE USING (true);