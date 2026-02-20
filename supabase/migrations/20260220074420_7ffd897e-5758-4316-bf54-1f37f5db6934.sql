
-- Create customer_memory table with phone_number as primary key
CREATE TABLE public.customer_memory (
  phone_number text PRIMARY KEY,
  name text,
  conversation_count integer NOT NULL DEFAULT 0,
  first_contacted_at timestamp with time zone NOT NULL DEFAULT now(),
  last_contacted_at timestamp with time zone NOT NULL DEFAULT now(),
  call_history jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.customer_memory ENABLE ROW LEVEL SECURITY;

-- Service role needs full access (edge functions use service role key)
-- Public read for edge functions with service role
CREATE POLICY "Allow service role full access to customer_memory"
ON public.customer_memory
FOR ALL
USING (true)
WITH CHECK (true);
