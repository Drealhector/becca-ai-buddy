import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, telnyx-signature-ed25519, telnyx-timestamp",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    console.log("Telnyx webhook received:", JSON.stringify(body, null, 2));

    const eventType = body?.data?.event_type;
    const payload = body?.data?.payload;

    if (!eventType || !payload) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callControlId = payload.call_control_id || payload.call_session_id || "";
    const callLegId = payload.call_leg_id || "";
    const from = payload.from || "";
    const to = payload.to || "";
    const direction = payload.direction || "inbound"; // "inbound" | "outbound"
    const startTime = payload.start_time || new Date().toISOString();
    const endTime = payload.end_time || null;

    switch (eventType) {
      case "call.initiated": {
        const callType = direction === "inbound" ? "incoming" : "outgoing";
        const number = direction === "inbound" ? from : to;
        const topic = direction === "inbound" ? "Call for DREALHECTOR" : `Outgoing call to ${to}`;

        await supabase.from("call_history").insert({
          type: callType,
          number: number,
          topic: topic,
          duration_minutes: 0,
          timestamp: new Date(startTime).toISOString(),
          conversation_id: callControlId,
        });
        break;
      }

      case "call.hangup": {
        // Calculate duration
        const hangupStartTime = payload.start_time ? new Date(payload.start_time).getTime() : null;
        const hangupEndTime = new Date().getTime();
        const durationMs = hangupStartTime ? hangupEndTime - hangupStartTime : 0;
        const durationMinutes = durationMs / 1000 / 60;

        // Update call record duration
        const { data: existingCall } = await supabase
          .from("call_history")
          .select("id, duration_minutes")
          .eq("conversation_id", callControlId)
          .order("timestamp", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingCall) {
          await supabase
            .from("call_history")
            .update({ duration_minutes: Math.round(durationMinutes * 100) / 100 })
            .eq("id", existingCall.id);
        }
        break;
      }

      case "call.transcription.started":
      case "call.transcription": {
        // Telnyx sends transcription events with transcript text
        const transcriptText = payload.transcription_data?.transcript || payload.transcript || "";
        const callerInfo = direction === "inbound" ? from : to;

        if (transcriptText) {
          // Check if a transcript already exists for this call
          const { data: existingTranscript } = await supabase
            .from("transcripts")
            .select("id, transcript_text")
            .eq("conversation_id", callControlId)
            .maybeSingle();

          if (existingTranscript) {
            // Append to existing transcript
            await supabase
              .from("transcripts")
              .update({
                transcript_text: existingTranscript.transcript_text
                  ? `${existingTranscript.transcript_text}\n${transcriptText}`
                  : transcriptText,
              })
              .eq("id", existingTranscript.id);
          } else {
            // Create new transcript
            await supabase.from("transcripts").insert({
              transcript_text: transcriptText,
              caller_info: callerInfo,
              conversation_id: callControlId,
              timestamp: new Date().toISOString(),
              sales_flagged: false,
            });
          }
        }
        break;
      }

      case "call.recording.saved": {
        // Recording URL available — store transcript from recording if transcription happened
        const recordingUrl = payload.recording_urls?.mp3 || payload.recording_urls?.wav || "";
        console.log("Recording saved:", recordingUrl);
        break;
      }

      default:
        console.log("Unhandled Telnyx event:", eventType);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Telnyx webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
