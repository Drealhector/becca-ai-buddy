
CREATE TABLE public.escalation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_call_id text NOT NULL,
  control_url text NOT NULL,
  escalation_call_id text,
  item_requested text,
  human_response text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to escalation_requests"
ON public.escalation_requests FOR ALL
USING (true) WITH CHECK (true);
