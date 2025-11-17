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
    console.log('🔄 Updating Call Hector assistant with personality...');

    const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
    if (!VAPI_PRIVATE_KEY) {
      throw new Error('VAPI_PRIVATE_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch bot personality
    const { data: personalityData } = await supabase
      .from('bot_personality')
      .select('personality_text')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const personality = personalityData?.personality_text || 
      "You are DREALHECTOR's helpful AI assistant. Be professional, friendly, and engaging in all your responses.";

    // Fetch customization for business name
    const { data: customization } = await supabase
      .from('customizations')
      .select('business_name')
      .limit(1)
      .single();

    const businessName = customization?.business_name || 'DREALHECTOR';

    const systemPrompt = `${personality}

You are speaking on behalf of ${businessName}. Maintain a professional yet warm tone.
Answer questions clearly and concisely. If you don't know something, be honest about it.`;

    const assistantId = '6c411909-067b-4ce3-ad02-10299109dc64';

    // Update the assistant via VAPI API
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VAPI API Error:', errorText);
      throw new Error(`Failed to update assistant: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Call Hector assistant updated successfully');

    return new Response(
      JSON.stringify({ success: true, assistant: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
