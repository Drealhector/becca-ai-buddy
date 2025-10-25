-- Update bot_config table structure
-- Add new columns
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT 'You are a helpful WhatsApp assistant. Be friendly, professional, and concise in your responses.';
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- Copy bot_active to is_enabled if needed
UPDATE bot_config SET is_enabled = bot_active WHERE is_enabled IS NULL;

-- Make sure we have exactly one config row with id=1
INSERT INTO bot_config (id, is_enabled, system_prompt, tone, character, model, personality, created_at, updated_at)
VALUES (
  1,
  true,
  'You are a helpful WhatsApp assistant. Be friendly, professional, and concise in your responses.',
  'professional',
  'helpful and informative',
  'gpt-4o-mini',
  'helpful and friendly',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;