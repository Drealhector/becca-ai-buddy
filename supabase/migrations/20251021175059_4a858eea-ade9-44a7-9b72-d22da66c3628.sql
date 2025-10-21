-- Create toggles table
CREATE TABLE IF NOT EXISTS public.toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_switch BOOLEAN DEFAULT true,
  whatsapp_on BOOLEAN DEFAULT false,
  instagram_on BOOLEAN DEFAULT false,
  facebook_on BOOLEAN DEFAULT false,
  telegram_on BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_n8n_webhook_url TEXT,
  instagram_n8n_webhook_url TEXT,
  facebook_n8n_webhook_url TEXT,
  telegram_n8n_webhook_url TEXT,
  vapi_assistant_id TEXT,
  vapi_widget_code TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create transcripts table
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  transcript_text TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  caller_info TEXT,
  sales_flagged BOOLEAN DEFAULT false
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  summary TEXT
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'ai')),
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  platform TEXT
);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  amount NUMERIC,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Create customizations table
CREATE TABLE IF NOT EXISTS public.customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT DEFAULT 'Hector''s Business',
  tone TEXT DEFAULT 'friendly and professional',
  greeting TEXT DEFAULT 'Hi, I''m BECCA, Hector''s AI assistant! How can I help?',
  faqs JSONB,
  logo_url TEXT,
  background_image_url TEXT,
  voices JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create wallet table
CREATE TABLE IF NOT EXISTS public.wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total NUMERIC DEFAULT 0,
  history JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create call_history table
CREATE TABLE IF NOT EXISTS public.call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('incoming', 'outgoing')),
  number TEXT,
  topic TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  duration_minutes NUMERIC
);

-- Enable RLS on all tables
ALTER TABLE public.toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for prototype, can be tightened later)
CREATE POLICY "Allow all operations on toggles" ON public.toggles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on connections" ON public.connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on transcripts" ON public.transcripts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on customizations" ON public.customizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on wallet" ON public.wallet FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on call_history" ON public.call_history FOR ALL USING (true) WITH CHECK (true);

-- Insert default data
INSERT INTO public.toggles (master_switch, whatsapp_on, instagram_on, facebook_on, telegram_on) 
VALUES (true, false, false, false, false);

INSERT INTO public.connections DEFAULT VALUES;

INSERT INTO public.customizations (business_name, tone, greeting) 
VALUES ('Hector''s Business', 'friendly and professional', 'Hi, I''m BECCA, Hector''s AI assistant! How can I help?');

INSERT INTO public.wallet (total) VALUES (0);

-- Enable realtime for messages and transcripts
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;