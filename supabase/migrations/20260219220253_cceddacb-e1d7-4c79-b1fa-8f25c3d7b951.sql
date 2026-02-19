
-- Create inventory table with fields for all business types
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.business_keys(id),
  business_type TEXT NOT NULL DEFAULT 'gadgets', -- gadgets, real_estate, restaurant
  name TEXT NOT NULL,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  quantity INTEGER DEFAULT 1,
  -- Gadget fields
  colors TEXT[] DEFAULT '{}',
  specs JSONB DEFAULT '{}',
  -- Real estate fields
  location TEXT,
  -- Common
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Open RLS policies (matches project's business-key auth pattern)
CREATE POLICY "Allow reading inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow inserting inventory" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updating inventory" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "Allow deleting inventory" ON public.inventory FOR DELETE USING (true);

-- Enable realtime for inventory
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
