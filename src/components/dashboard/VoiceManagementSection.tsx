import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, RefreshCw, Volume2, Square, Circle, Play, Pause, Check } from "lucide-react";

interface VoiceItem {
  id: string;
  name: string;
  provider: string;
  description: string;
  category?: string;
  preview_url?: string | null;
}

const VoiceManagementSection = () => {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [customVoices, setCustomVoices] = useState<VoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [syncingVoice, setSyncingVoice] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoices();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-vapi-voices");
      if (error) throw error;
      setVoices(data?.voices || []);

      // Fetch custom voices from DB
      const { data: customData } = await supabase
        .from("customizations")
        .select("custom_voices, vapi_voices")
        .limit(1)
        .single();

      const stored = Array.isArray(customData?.custom_voices) ? customData.custom_voices as any[] : [];
      setCustomVoices(stored.map((v: any) => ({
        id: v.id || v.voice_id,
        name: v.name,
        provider: v.provider || 'elevenlabs',
        description: v.description || 'Cloned voice',
      })));

      const vapiVoicesData = customData?.vapi_voices;
      if (Array.isArray(vapiVoicesData) && vapiVoicesData.length > 0) {
        setSelectedVoice(vapiVoicesData[0] as string);
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error("Failed to load voices");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVoice = async (voiceId: string, voiceName: string) => {
    try {
      setSelectedVoice(voiceId);
      setSyncingVoice(true);

      // Save selection to DB
      const { data: customData } = await supabase
        .from("customizations").select("id").limit(1).single();
      if (!customData) throw new Error("Customization not found");
      
      const { error } = await supabase
        .from("customizations")
        .update({ vapi_voices: [voiceId] })
        .eq("id", customData.id);
      if (error) throw error;

      // Push the voice to Vapi assistant
      const { data: syncData, error: syncError } = await supabase.functions.invoke("update-vapi-voice", {
        body: { voiceId, voiceName },
      });

      if (syncError) throw syncError;
      if (!syncData?.success) throw new Error(syncData?.error || 'Failed to sync voice');

      toast.success(`Voice "${voiceName}" applied to your AI agent`);
    } catch (error) {
      console.error("Error selecting voice:", error);
      toast.error("Failed to sync voice with agent");
    } finally {
      setSyncingVoice(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedBlob(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone error:", error);
      toast.error("Please allow microphone access to record voice");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const playRecording = () => {
    if (!recordedBlob) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    audio.onended = () => { audioRef.current = null; };
  };

  const handleCloneVoice = async () => {
    if (!newVoiceName.trim()) { toast.error("Enter a voice name"); return; }
    if (!recordedBlob) { toast.error("Record a voice sample first"); return; }

    setIsCloning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(recordedBlob);
      });

      // Clone on ElevenLabs AND set as active on Vapi
      const { data, error } = await supabase.functions.invoke("clone-voice", {
        body: { name: newVoiceName.trim(), audio: base64, setAsActive: true },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Clone failed');

      const newVoice = {
        id: data.voice_id,
        name: newVoiceName.trim(),
        provider: 'elevenlabs',
        description: 'Cloned voice',
      };

      // Save to customizations
      const { data: customData } = await supabase
        .from("customizations").select("id, custom_voices").limit(1).single();
      if (customData) {
        const existing = Array.isArray(customData.custom_voices) ? customData.custom_voices as any[] : [];
        await supabase.from("customizations")
          .update({
            custom_voices: [...existing, { id: data.voice_id, name: newVoiceName.trim(), provider: 'elevenlabs', voice_id: data.voice_id }],
            vapi_voices: [data.voice_id],
          })
          .eq("id", customData.id);
      }

      setCustomVoices(prev => [...prev, newVoice]);
      setSelectedVoice(data.voice_id);
      setNewVoiceName("");
      setRecordedBlob(null);
      setRecordingTime(0);
      
      const syncMsg = data.vapi_synced ? " and applied to your AI agent" : "";
      toast.success(`Voice "${newVoiceName}" cloned successfully${syncMsg}!`);
      
      fetchVoices();
    } catch (error) {
      console.error("Error cloning voice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to clone voice");
    } finally {
      setIsCloning(false);
    }
  };

  const playPreview = (url: string, voiceId: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingPreview(null); }
    if (playingPreview === voiceId) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingPreview(voiceId);
    audio.play();
    audio.onended = () => { setPlayingPreview(null); audioRef.current = null; };
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Voice Management</h3>
        </div>
        <Button size="sm" variant="outline" onClick={fetchVoices} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* Available Voices */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            Available Voices ({voices.length})
          </Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading voices...</p>
            ) : voices.length > 0 ? (
              voices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => handleSelectVoice(voice.id, voice.name)}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedVoice === voice.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{voice.name}</span>
                      {voice.category === 'cloned' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">Cloned</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{voice.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {voice.preview_url && (
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); playPreview(voice.preview_url!, voice.id); }}
                      >
                        {playingPreview === voice.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                    )}
                    {selectedVoice === voice.id && (
                      <div className="flex items-center gap-1">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-xs text-primary font-semibold">Active</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No voices found. Check your voice API configuration.</p>
            )}
          </div>
          {syncingVoice && (
            <p className="text-xs text-primary mt-2 animate-pulse">Syncing voice with your AI agent...</p>
          )}
        </div>

        {/* Custom Cloned Voices */}
        {customVoices.length > 0 && (
          <div>
            <Label className="text-sm font-semibold mb-2 block">Custom Cloned Voices</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {customVoices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => handleSelectVoice(voice.id, voice.name)}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedVoice === voice.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-accent" />
                    <span className="font-medium">{voice.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">Cloned</span>
                  </div>
                  {selectedVoice === voice.id && (
                    <div className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-xs text-primary font-semibold">Active</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Cloning Section */}
        <div className="border-t pt-4">
          <Label className="text-sm font-semibold mb-3 block">Clone a New Voice</Label>

          <div className="space-y-3">
            <Input
              placeholder="Voice name (e.g. Becca, Jazzy)..."
              value={newVoiceName}
              onChange={(e) => setNewVoiceName(e.target.value)}
            />

            <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
              {!isRecording ? (
                <Button
                  size="sm" variant="outline"
                  onClick={startRecording}
                  disabled={isCloning}
                  className="gap-2"
                >
                  <Circle className="w-4 h-4 text-red-500 fill-red-500" />
                  {recordedBlob ? "Re-record" : "Record Voice"}
                </Button>
              ) : (
                <Button
                  size="sm" variant="destructive"
                  onClick={stopRecording}
                  className="gap-2"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop ({formatTime(recordingTime)})
                </Button>
              )}

              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Recording...</span>
                </div>
              )}

              {recordedBlob && !isRecording && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={playRecording} className="gap-1">
                    <Play className="w-3 h-3" /> Play
                  </Button>
                  <span className="text-xs text-muted-foreground">{formatTime(recordingTime)} recorded</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Record at least 30 seconds of clear speech. The voice will be cloned and automatically applied to your AI Brain.
            </p>

            {recordedBlob && newVoiceName.trim() && (
              <Button
                className="w-full gap-2"
                onClick={handleCloneVoice}
                disabled={isCloning}
              >
                <Mic className="w-4 h-4" />
                {isCloning ? "Cloning & Syncing..." : `Clone "${newVoiceName}" & Apply to Agent`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VoiceManagementSection;
