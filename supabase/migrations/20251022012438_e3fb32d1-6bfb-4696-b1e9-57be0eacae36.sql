-- Add vapi_public_key column to connections table
ALTER TABLE connections ADD COLUMN IF NOT EXISTS vapi_public_key TEXT;