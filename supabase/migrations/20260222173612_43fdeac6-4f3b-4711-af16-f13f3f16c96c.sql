
CREATE TABLE public.scheduled_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  business_id UUID REFERENCES public.business_keys(id)
);

ALTER TABLE public.scheduled_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading scheduled calls" ON public.scheduled_calls FOR SELECT USING (true);
CREATE POLICY "Allow inserting scheduled calls" ON public.scheduled_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updating scheduled calls" ON public.scheduled_calls FOR UPDATE USING (true);
CREATE POLICY "Allow deleting scheduled calls" ON public.scheduled_calls FOR DELETE USING (true);
