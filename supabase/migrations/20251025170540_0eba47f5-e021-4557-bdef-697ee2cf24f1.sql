-- Ensure bot_config has initial data
INSERT INTO bot_config (id, bot_active, personality, tone, character, updated_at) 
VALUES (1, true, 'helpful and friendly', 'professional', 'polite and informative', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create whatsapp_messages table for n8n integration
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  user_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations (since this is for n8n webhook integration)
CREATE POLICY "Allow all operations on whatsapp_messages"
ON whatsapp_messages
FOR ALL
USING (true)
WITH CHECK (true);