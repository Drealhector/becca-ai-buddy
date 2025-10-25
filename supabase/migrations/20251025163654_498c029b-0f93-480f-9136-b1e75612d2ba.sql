-- Create bot_config table
CREATE TABLE IF NOT EXISTS public.bot_config (
  id INTEGER PRIMARY KEY,
  bot_active BOOLEAN DEFAULT true,
  personality TEXT DEFAULT 'helpful and friendly',
  tone TEXT DEFAULT 'professional',
  character TEXT DEFAULT 'polite and informative',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a single-config table)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bot_config' 
    AND policyname = 'Allow all operations on bot_config'
  ) THEN
    CREATE POLICY "Allow all operations on bot_config" 
    ON public.bot_config 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;
END $$;

-- Insert default configuration
INSERT INTO public.bot_config (id, bot_active, personality, tone, character, updated_at)
VALUES (1, true, 'helpful and friendly', 'professional', 'polite and informative', NOW())
ON CONFLICT (id) DO NOTHING;