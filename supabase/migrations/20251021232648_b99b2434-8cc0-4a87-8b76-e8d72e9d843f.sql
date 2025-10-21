-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow public read access to logos
CREATE POLICY "Public logo access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos');

-- Create policy to allow authenticated uploads to logos
CREATE POLICY "Authenticated logo upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Create policy to allow authenticated updates to logos
CREATE POLICY "Authenticated logo update" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');