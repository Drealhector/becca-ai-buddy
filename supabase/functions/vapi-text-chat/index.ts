import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    
    const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
    const ASSISTANT_ID = '6c411909-067b-4ce3-ad02-10299109dc64';
    
    if (!VAPI_PRIVATE_KEY) {
      throw new Error('VAPI_PRIVATE_KEY not configured');
    }

    // Get customization data for context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: customData } = await supabase
      .from("customizations")
      .select("business_name, assistant_personality, greeting, faqs")
      .limit(1)
      .maybeSingle();

    // Build context from customization
    let contextPrompt = '';
    if (customData) {
      if (customData.business_name) {
        contextPrompt += `Business: ${customData.business_name}\n`;
      }
      if (customData.assistant_personality) {
        contextPrompt += `Personality: ${customData.assistant_personality}\n`;
      }
      if (customData.faqs) {
        contextPrompt += `FAQs: ${JSON.stringify(customData.faqs)}\n`;
      }
    }

    // Call Vapi API for text-based chat
    const response = await fetch('https://api.vapi.ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: ASSISTANT_ID,
        input: message
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vapi API error:', response.status, errorText);
      throw new Error(`Vapi API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Vapi response:', JSON.stringify(data));
    
    // Extract the assistant's response from Vapi's output
    const assistantResponse = data.output?.[0]?.content || data.message || "I'm here to help!";
    
    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in vapi-text-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
