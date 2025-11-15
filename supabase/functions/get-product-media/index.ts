import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, label, media_type } = await req.json();

    console.log('Fetching product media:', { product_id, label, media_type });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build query
    let query = supabase
      .from('product_media')
      .select('*')
      .eq('product_id', product_id);

    // Optional filters
    if (label) {
      query = query.ilike('label', `%${label}%`);
    }

    if (media_type) {
      query = query.eq('media_type', media_type);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} media items`);

    // Format response for Vapi
    const mediaList = data?.map(item => ({
      url: item.media_url,
      type: item.media_type,
      label: item.label,
      description: item.description || ''
    })) || [];

    return new Response(
      JSON.stringify({ 
        success: true,
        media: mediaList,
        count: mediaList.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        media: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
