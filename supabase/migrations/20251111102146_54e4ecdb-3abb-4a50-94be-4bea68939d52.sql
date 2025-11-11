-- Create business_keys table for B2B authentication
CREATE TABLE IF NOT EXISTS public.business_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_key TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.business_keys ENABLE ROW LEVEL SECURITY;

-- Policies for business_keys
CREATE POLICY "Business keys are viewable by authenticated users"
  ON public.business_keys
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add business_key column to user_onboarding to link users to their business
ALTER TABLE public.user_onboarding 
ADD COLUMN IF NOT EXISTS business_key TEXT REFERENCES public.business_keys(business_key);

-- Insert initial business key for Hector
INSERT INTO public.business_keys (business_key, business_name)
VALUES ('BECCA-HECTOR-2024', 'HECTOR')
ON CONFLICT (business_key) DO NOTHING;