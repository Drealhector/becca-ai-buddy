-- Add new fields to customizations table for enhanced features
ALTER TABLE customizations
ADD COLUMN IF NOT EXISTS whatsapp_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS facebook_username TEXT,
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS chat_logo_url TEXT,
ADD COLUMN IF NOT EXISTS vapi_voices JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_voices JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS business_description TEXT,
ADD COLUMN IF NOT EXISTS business_industry TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS key_services TEXT,
ADD COLUMN IF NOT EXISTS business_hours TEXT,
ADD COLUMN IF NOT EXISTS assistant_personality TEXT,
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS setup_strength TEXT DEFAULT 'weak';

-- Add onboarding tracking to track user progress
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_onboarding
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own onboarding
CREATE POLICY "Users can view their own onboarding"
  ON user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding"
  ON user_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding"
  ON user_onboarding FOR UPDATE
  USING (auth.uid() = user_id);