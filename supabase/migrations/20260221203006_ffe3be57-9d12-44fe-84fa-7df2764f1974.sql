
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NULL,
  conversation_count INTEGER DEFAULT 0,
  last_summary TEXT,
  last_called_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Service role full access (for n8n via direct DB connection)
CREATE POLICY "Allow service role full access to customers"
ON public.customers
FOR ALL
USING (true)
WITH CHECK (true);
