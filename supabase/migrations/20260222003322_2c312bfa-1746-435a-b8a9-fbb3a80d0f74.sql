
CREATE TABLE public.callers (
  phone text NOT NULL UNIQUE,
  name text,
  memory_summary text,
  last_call_at timestamp with time zone NOT NULL DEFAULT now(),
  call_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_callers_phone ON public.callers (phone);

ALTER TABLE public.callers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to callers"
  ON public.callers FOR ALL
  USING (true)
  WITH CHECK (true);
