import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * VOICE MANAGEMENT — Voice cloning and management
 */

// Fetch current voice and speed from the assistant
export const fetchCurrentVoice = action({
  handler: async (ctx) => {
    const telnyxKey = process.env.TELNYX_API_KEY;
    const assistantId = process.env.TELNYX_ASSISTANT_ID;
    if (!telnyxKey || !assistantId) return { voice: null, voice_speed: null, voice_settings: null };

    try {
      const response = await fetch(
        `https://api.telnyx.com/v2/ai/assistants/${assistantId}`,
        { headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" } }
      );
      if (!response.ok) return { voice: null, voice_speed: null, voice_settings: null };

      const result = await response.json();
      const data = result.data || result;
      return {
        voice: data.voice_settings?.voice || null,
        voice_speed: data.voice_settings?.voice_speed ?? null,
        voice_settings: data.voice_settings || null,
      };
    } catch {
      return { voice: null, voice_speed: null, voice_settings: null };
    }
  },
});

// Clone a voice from uploaded audio
// API response format:
// {
//   "data": {
//     "id": "uuid",
//     "name": "voice name",
//     "provider": "<provider>",
//     "model_id": "<model>",
//     "provider_voice_id": "XXXX",
//     "provider_supported_models": [...],
//     "status": "active"
//   }
// }
// Full voice string for assistant: "{provider}.{model_id}.{provider_voice_id}"
export const cloneVoice = action({
  args: {
    name: v.string(),
    audio: v.string(), // base64 data URL
    language: v.optional(v.string()),
    gender: v.optional(v.string()),
    setAsActive: v.optional(v.boolean()), // accepted but not used here — handled by frontend via sync
  },
  handler: async (ctx, { name, audio, language = "en", gender = "female" }) => {
    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) throw new Error("Voice service not configured");

    if (!name || name.length > 100) throw new Error("Voice name must be 1-100 characters");
    // Base64 cap stays generous — the real constraint is decoded size below
    if (audio.length > 7 * 1024 * 1024) throw new Error("Audio file too large. Please use a sample under 4.5MB raw.");

    // Convert base64 to buffer — split on ";base64," to handle MIME params like codecs=opus
    const base64Split = audio.split(";base64,");
    const base64Data = base64Split.length > 1 ? base64Split[1] : audio;
    const binaryStr = atob(base64Data);

    // Telnyx voice clone gateway rejects payloads at ~5MB (HTTP 413). Empirically tested:
    // 4.8MB → success, 5.0MB → 413. Cap at 4.5MB to leave safety margin for form overhead.
    const rawBytes = binaryStr.length;
    if (rawBytes > 4.5 * 1024 * 1024) throw new Error(`Audio is ${(rawBytes / 1024 / 1024).toFixed(1)}MB. Maximum is 4.5MB. Try a shorter clip (60-90 seconds is plenty for cloning), or re-export at 128kbps mono.`);

    const bytes = new Uint8Array(rawBytes);
    for (let i = 0; i < rawBytes; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Normalize MIME — browsers sometimes mis-tag .mpeg as video/mpeg even though it's audio
    let mimeMatch = audio.match(/^data:([^;,]+)/);
    let mimeType = mimeMatch ? mimeMatch[1] : "audio/mpeg";
    if (mimeType.startsWith("video/")) {
      // .mpeg / .mp4 audio files often come through as video/* — rewrite to audio for Telnyx
      mimeType = mimeType === "video/mpeg" ? "audio/mpeg" : "audio/mp4";
    }
    const extension = mimeType.split("/")[1] || "mp3";

    const formData = new FormData();
    formData.append("audio_file", new Blob([bytes], { type: mimeType }), `voice_sample.${extension}`);
    formData.append("name", name);
    formData.append("language", language);
    formData.append("gender", gender);
    formData.append("provider", "minimax");

    const response = await fetch("https://api.telnyx.com/v2/voice_clones/from_upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${telnyxKey}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Voice clone error:", response.status, err);

      // Try to parse as JSON for a clean error detail
      let detail: string | null = null;
      try {
        const errJson = JSON.parse(err);
        detail = errJson.errors?.[0]?.detail || errJson.errors?.[0]?.title || null;
      } catch {
        // Non-JSON response (e.g. "Request Entity Too Large" HTML from gateway)
        // Map common HTTP status codes to user-friendly messages
        if (response.status === 413) detail = "Audio file too large for the voice provider. Try a shorter clip (under 5MB).";
        else if (response.status === 415) detail = "Audio format not supported. Try MP3 or WAV.";
        else if (response.status === 401 || response.status === 403) detail = "Voice provider authentication failed.";
        else if (response.status >= 500) detail = "Voice provider is having issues. Please try again in a moment.";
        else detail = `Voice cloning failed (HTTP ${response.status})`;
      }

      throw new Error(detail || `Voice cloning failed (HTTP ${response.status})`);
    }

    const result = await response.json();
    const clone = result.data;

    // Build the full voice string: "{provider}.{model_id}.{provider_voice_id}"
    const modelId = clone.model_id || "speech-2.8-turbo";
    const providerVoiceId = clone.provider_voice_id;
    const fullVoiceString = `Minimax.${modelId}.${providerVoiceId}`;

    console.log("Voice cloned:", JSON.stringify({
      id: clone.id,
      name: clone.name,
      fullVoiceString,
      provider_voice_id: providerVoiceId,
      model_id: modelId,
    }));

    return {
      success: true,
      voice_id: fullVoiceString,
      clone_id: clone.id,
      name: clone.name || name,
    };
  },
});

// Store a voice sample audio in Convex storage (called during cloning)
export const storeVoiceSample = action({
  args: { audio: v.string() }, // base64 data URL
  handler: async (ctx, { audio }) => {
    const base64Split = audio.split(";base64,");
    const base64Data = base64Split.length > 1 ? base64Split[1] : audio;
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const mimeMatch = audio.match(/^data:([^;,]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : "audio/webm";

    const blob = new Blob([bytes], { type: mimeType });
    const storageId = await ctx.storage.store(blob);
    return { storageId };
  },
});

// Get a playback URL for a stored voice sample
export const getVoiceSampleUrl = action({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    const url = await ctx.storage.getUrl(storageId as any);
    return { url };
  },
});

// Delete a cloned voice from Telnyx
// Accepts either cloneId (UUID), voiceId (voice string), or name as fallback
export const deleteVoice = action({
  args: {
    cloneId: v.optional(v.string()),
    voiceId: v.optional(v.string()), // e.g. "Minimax.speech-2.8-turbo.XXX"
    name: v.optional(v.string()),
  },
  handler: async (ctx, { cloneId, voiceId, name }) => {
    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) return { success: false, error: "Not configured" };

    try {
      let deleteId: string | null = null;

      // Try 1: Use cloneId directly if it's a valid UUID
      if (cloneId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cloneId);
        if (isUuid) {
          deleteId = cloneId;
        }
      }

      // Try 2: If cloneId is a voice string or missing, look up from Telnyx
      if (!deleteId) {
        const listRes = await fetch("https://api.telnyx.com/v2/voice_clones", {
          headers: { Authorization: `Bearer ${telnyxKey}` },
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const clones = listData.data || [];

          // Extract provider_voice_id from cloneId or voiceId (format: "Provider.Model.provider_voice_id")
          let providerVoiceId: string | null = null;
          const source = cloneId || voiceId || "";
          if (source.includes(".")) {
            providerVoiceId = source.split(".").slice(2).join(".");
          }

          if (providerVoiceId) {
            const match = clones.find((c: any) => c.provider_voice_id === providerVoiceId);
            if (match) deleteId = match.id;
          }

          // Fallback: match by name (least reliable but best effort)
          if (!deleteId && name) {
            const match = clones.find((c: any) => c.name === name);
            if (match) deleteId = match.id;
          }
        }
      }

      if (!deleteId) {
        console.error("Voice delete: could not resolve clone UUID", { cloneId, voiceId, name });
        return { success: false, error: "Clone not found" };
      }

      const res = await fetch(`https://api.telnyx.com/v2/voice_clones/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${telnyxKey}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Voice delete failed:", res.status, errText);
        // If 404, the clone is already gone from Telnyx — that's fine, proceed with DB cleanup
        if (res.status === 404) {
          console.log("Voice already deleted from provider:", deleteId);
          return { success: true };
        }
        return { success: false, error: `HTTP ${res.status}` };
      }

      console.log("Voice clone deleted from provider:", deleteId);
      return { success: true };
    } catch (e) {
      console.error("Voice delete error:", e);
      return { success: false, error: String(e) };
    }
  },
});
