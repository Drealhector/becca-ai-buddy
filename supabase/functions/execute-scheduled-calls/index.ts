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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find all pending calls whose scheduled_at has passed
    const now = new Date().toISOString();
    const { data: pendingCalls, error } = await supabase
      .from('scheduled_calls')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (error) {
      console.error('Error fetching scheduled calls:', error);
      throw error;
    }

    if (!pendingCalls || pendingCalls.length === 0) {
      return new Response(JSON.stringify({ executed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pendingCalls.length} scheduled calls to execute`);

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_WEB_ASSISTANT_ID');

    let executedCount = 0;

    for (const call of pendingCalls) {
      try {
        // Mark as executing
        await supabase
          .from('scheduled_calls')
          .update({ status: 'executing' })
          .eq('id', call.id);

        // Use the vapi-outbound-call logic inline
        const { data: personalityData } = await supabase
          .from('bot_personality')
          .select('personality_text')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        const { data: custData } = await supabase
          .from('customizations')
          .select('business_name, assistant_personality')
          .limit(1)
          .maybeSingle();

        const personality = personalityData?.personality_text || custData?.assistant_personality || '';
        const businessName = custData?.business_name || 'our business';

        // Get phone number from Vapi
        const phoneNumbersRes = await fetch('https://api.vapi.ai/phone-number', {
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        let phoneNumberId = null;
        if (phoneNumbersRes.ok) {
          const phoneNumbers = await phoneNumbersRes.json();
          if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
            phoneNumberId = phoneNumbers[0].id;
          }
        }

        // Get existing tool IDs
        const getResponse = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
          headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` }
        });

        let existingToolIds: string[] = [];
        let existingVoice: any = null;
        if (getResponse.ok) {
          const existing = await getResponse.json();
          existingToolIds = existing.model?.toolIds || [];
          existingVoice = existing.voice || null;
        }

        const outboundPrompt = `${personality}

=== OUTBOUND CALL CONTEXT ===
This is an OUTBOUND call YOU are making. You are NOT receiving a call.
You are calling on behalf of ${businessName}.
The purpose of this call: ${call.purpose}

CRITICAL OUTBOUND CALL BEHAVIOR:
- Parse the purpose intelligently. If a name is mentioned, use it naturally.
- Your FIRST message should be a casual greeting. If you know the person's name, use it.
- Do NOT immediately state the purpose. Have 1 or 2 natural pleasantry exchanges first.
- THEN naturally transition to the purpose.
- Keep everything to 1 or 2 sentences per response. Be conversational.
- NEVER say "I am calling about:" — just flow into it naturally.
- Maintain your personality throughout.
- NEVER greet with "How may I help you?" — YOU called THEM.

=== CONVERSATIONAL STYLE ===
- Keep EVERY response to 1 or 2 sentences MAX.
- Be warm, casual, and human.
- Use natural fillers occasionally.`;

        const callPayload: any = {
          assistantId: VAPI_ASSISTANT_ID,
          customer: { number: call.phone_number },
          assistantOverrides: {
            model: {
              provider: 'openai',
              model: 'gpt-4o',
              messages: [{ role: 'system', content: outboundPrompt }],
              toolIds: existingToolIds,
            },
          },
        };

        // Preserve voice config so scheduled calls have audio
        if (existingVoice) {
          callPayload.assistantOverrides.voice = existingVoice;
        }

        if (phoneNumberId) {
          callPayload.phoneNumberId = phoneNumberId;
        }

        const callResponse = await fetch('https://api.vapi.ai/call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(callPayload),
        });

        const callData = await callResponse.json();

        if (callResponse.ok) {
          // Mark as completed
          await supabase
            .from('scheduled_calls')
            .update({ status: 'completed', executed_at: new Date().toISOString() })
            .eq('id', call.id);

          // Log to call_history
          await supabase.from("call_history").insert({
            type: "outgoing",
            number: call.phone_number,
            topic: `[Scheduled] ${call.purpose}`,
            duration_minutes: 0,
            timestamp: new Date().toISOString(),
            conversation_id: callData.id,
          });

          executedCount++;
          console.log(`Scheduled call ${call.id} executed successfully`);
        } else {
          console.error(`Failed to execute scheduled call ${call.id}:`, callData);
          await supabase
            .from('scheduled_calls')
            .update({ status: 'failed' })
            .eq('id', call.id);
        }
      } catch (callError) {
        console.error(`Error executing scheduled call ${call.id}:`, callError);
        await supabase
          .from('scheduled_calls')
          .update({ status: 'failed' })
          .eq('id', call.id);
      }
    }

    return new Response(JSON.stringify({ executed: executedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in execute-scheduled-calls:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
