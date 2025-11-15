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
    const { product_name, label_filter } = await req.json();

    console.log('🖼️  Fetching media for product:', product_name, 'filter:', label_filter);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build query - search by product name in label
    let query = supabase
      .from('product_media')
      .select('*')
      .ilike('label', `%${product_name}%`);

    // Optional filter for specific views
    if (label_filter) {
      query = query.ilike('label', `%${label_filter}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} media items for ${product_name}`);

    // Format response for Vapi function calling
    const mediaList = data?.map(item => ({
      url: item.media_url,
      type: item.media_type,
      label: item.label,
      description: item.description || ''
    })) || [];

    const message = mediaList.length > 0
      ? `Found ${mediaList.length} media item(s) for ${product_name}. Display these to the customer.`
      : `No media available for ${product_name} yet.`;

    return new Response(
      JSON.stringify({ 
        result: message,
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
