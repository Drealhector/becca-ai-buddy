
ALTER TABLE public.customizations 
ADD COLUMN IF NOT EXISTS hub_bg_desktop_url text,
ADD COLUMN IF NOT EXISTS hub_bg_tablet_url text,
ADD COLUMN IF NOT EXISTS hub_bg_phone_url text;
