-- Add sender_name column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name TEXT;