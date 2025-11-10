-- Create table for bot personality
CREATE TABLE IF NOT EXISTS public.bot_personality (
  id SERIAL PRIMARY KEY,
  personality_text TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bot_personality ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on bot_personality"
ON public.bot_personality
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default personality
INSERT INTO bot_personality (personality_text) VALUES 
('You are a helpful and friendly AI assistant. Be warm, engaging, and professional in all your responses.')
ON CONFLICT DO NOTHING;