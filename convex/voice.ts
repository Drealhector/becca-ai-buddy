import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * VOICE MANAGEMENT — Convex actions for ElevenLabs voice cloning + Telnyx voice sync
 */

// Fetch available voices from ElevenLabs
export const fetchVoices = action({
  handler: async (ctx) => {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return { voices: [] };
    }

    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": elevenLabsKey },
      });
      if (!response.ok) return { voices: [] };

      const data = await response.json();
      return {
        voices: (data.voices || []).map((v: any) => ({
          id: v.voice_id,
          name: v.name,
          provider: "elevenlabs",
          description: v.description || v.labels?.accent || "ElevenLabs voice",
          category: v.category,
          preview_url: v.preview_url,
        })),
      };
    } catch {
      return { voices: [] };
    }
  },
});

// Clone a voice from audio (base64)
export const cloneVoice = action({
  args: {
    name: v.string(),
    audio: v.string(), // base64 data URL
    setAsActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { name, audio, setAsActive }) => {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) throw new Error("ELEVENLABS_API_KEY not set");

    // Validate name
    if (!name || name.length > 100) {
      throw new Error("Voice name must be 1-100 characters");
    }

    // Cap audio at 10MB of base64 data (~7.5MB decoded)
    if (audio.length > 10 * 1024 * 1024) {
      throw new Error("Audio file too large (max 10MB)");
    }

    // Convert base64 to buffer
    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, "");
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("files", new Blob([bytes], { type: "audio/webm" }), "voice_sample.webm");

    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": elevenLabsKey },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs clone error:", err);
      throw new Error("Voice cloning failed. Please try again.");
    }

    const data = await response.json();
    return { success: true, voice_id: data.voice_id };
  },
});

// Delete a cloned voice from ElevenLabs
export const deleteVoice = action({
  args: { voiceId: v.string() },
  handler: async (ctx, { voiceId }) => {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) throw new Error("ELEVENLABS_API_KEY not set");

    // Validate voiceId format to prevent path injection
    if (!voiceId || !/^[a-zA-Z0-9_-]+$/.test(voiceId)) {
      throw new Error("Invalid voice ID");
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      method: "DELETE",
      headers: { "xi-api-key": elevenLabsKey },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs delete error:", err);
      throw new Error("Voice deletion failed. Please try again.");
    }

    return { success: true };
  },
});
