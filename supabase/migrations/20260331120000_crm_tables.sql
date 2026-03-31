-- ============================================================================
-- CRM Tables Migration
-- Creates: contacts, leads, properties, deals, activities, lead_stage_history
-- Plus ALTER TABLE additions, indexes, RLS policies, and realtime
-- ============================================================================

-- ===================
-- 1. contacts
-- ===================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  source TEXT CHECK (source IN ('phone_call', 'whatsapp', 'instagram', 'website', 'manual')),
  budget_min NUMERIC,
  budget_max NUMERIC,
  preferred_locations TEXT[] DEFAULT '{}',
  property_type_interest TEXT[] DEFAULT '{}',
  notes TEXT,
  memory_summary TEXT,
  lead_score INTEGER DEFAULT 0,
  lead_temperature TEXT DEFAULT 'cold',
  call_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  first_contact_at TIMESTAMPTZ DEFAULT now(),
  last_contact_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================
-- 2. leads
-- ===================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_made', 'negotiating', 'closed_won', 'closed_lost')),
  lead_type TEXT DEFAULT 'buyer' CHECK (lead_type IN ('buyer', 'seller', 'renter', 'landlord')),
  source TEXT,
  source_conversation_id UUID,
  assigned_agent TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  expected_close_date DATE,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================
-- 3. properties
-- ===================
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.inventory(id),
  title TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'land', 'commercial', 'duplex')),
  listing_type TEXT NOT NULL DEFAULT 'sale' CHECK (listing_type IN ('sale', 'rent', 'lease', 'short_let')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'under_offer', 'sold', 'rented', 'off_market')),
  price NUMERIC,
  currency TEXT DEFAULT 'NGN',
  price_period TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  sqft NUMERIC,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  latitude NUMERIC,
  longitude NUMERIC,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  virtual_tour_url TEXT,
  floor_plan_url TEXT,
  agent_assigned TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================
-- 4. deals
-- ===================
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deal_value NUMERIC,
  currency TEXT DEFAULT 'NGN',
  stage TEXT NOT NULL DEFAULT 'inquiry' CHECK (stage IN ('inquiry', 'viewing', 'offer', 'negotiation', 'contract', 'closed_won', 'closed_lost')),
  expected_close_date DATE,
  actual_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================
-- 5. activities
-- ===================
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'message', 'viewing', 'follow_up', 'note', 'task', 'status_change')),
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  conversation_id UUID,
  call_history_id UUID,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================
-- 6. lead_stage_history
-- ===================
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by TEXT DEFAULT 'system',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ALTER existing tables to add contact_id / lead_id columns
-- ============================================================================
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS sender_phone TEXT;
ALTER TABLE public.transcripts ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id);
ALTER TABLE public.scheduled_calls ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id);
ALTER TABLE public.scheduled_calls ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_temperature ON public.contacts(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON public.leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON public.activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled ON public.activities(scheduled_at) WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

-- Permissive policies (same pattern as existing tables)
CREATE POLICY "Allow all operations on contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on deals" ON public.deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on lead_stage_history" ON public.lead_stage_history FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Realtime
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE contacts, leads, deals, activities, properties;
