-- Add conversation_id to call_history to link with transcripts
ALTER TABLE public.call_history 
ADD COLUMN conversation_id TEXT;