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
    const { messages, conversationId } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }
    
    const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_WEB_PRIVATE_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_WEB_ASSISTANT_ID');
    
    if (!VAPI_PRIVATE_KEY || !VAPI_ASSISTANT_ID) {
      throw new Error('VAPI credentials not configured');
    }

    // Get the latest user message
    const latestUserMessage = messages[messages.length - 1];
    
    if (!latestUserMessage || latestUserMessage.role !== 'user') {
      throw new Error('No user message found');
    }

    console.log('User input:', latestUserMessage.content);

    // Call Vapi's chat endpoint for text-based chat
    const response = await fetch('https://api.vapi.ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        input: latestUserMessage.content
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vapi API error:', response.status, errorText);
      throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract response from Vapi's output array
    const responseText = data.output?.[0]?.content || data.message || "I'm here to help!";
    
    // Return streaming response in SSE format for frontend compatibility
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const sseData = `data: ${JSON.stringify({
          choices: [{
            delta: { content: responseText }
          }]
        })}\n\n`;
        controller.enqueue(encoder.encode(sseData));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
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
