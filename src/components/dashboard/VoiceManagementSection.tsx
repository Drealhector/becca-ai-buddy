import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, RefreshCw, Volume2, Square, Circle, Play, Pause, Check, Trash2, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deletingVoice, setDeletingVoice] = useState<string | null>(null);
  const [voiceToDelete, setVoiceToDelete] = useState<VoiceItem | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

      const { data: customData } = await supabase
        .from("customizations").select("id").limit(1).single();
      if (!customData) throw new Error("Customization not found");
      
      const { error } = await supabase
        .from("customizations")
        .update({ vapi_voices: [voiceId] })
        .eq("id", customData.id);
      if (error) throw error;

      const { data: syncData, error: syncError } = await supabase.functions.invoke("update-vapi-voice", {
        body: { voiceId, voiceName },
      });

      if (syncError) throw syncError;
      if (!syncData?.success) throw new Error(syncData?.error || 'Failed to sync voice');

      toast.success(`Voice "${voiceName}" applied to your AI Brain`);
    } catch (error) {
      console.error("Error selecting voice:", error);
      toast.error("Failed to sync voice with AI Brain");
    } finally {
      setSyncingVoice(false);
    }
  };

  const handleDeleteVoice = async (voice: VoiceItem) => {
    setDeletingVoice(voice.id);
    try {
      // Delete from ElevenLabs
      const { data, error } = await supabase.functions.invoke("delete-elevenlabs-voice", {
        body: { voiceId: voice.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Delete failed');

      // Remove from customizations DB
      const { data: customData } = await supabase
        .from("customizations").select("id, custom_voices").limit(1).single();
      if (customData) {
        const existing = Array.isArray(customData.custom_voices) ? customData.custom_voices as any[] : [];
        const updated = existing.filter((v: any) => (v.id || v.voice_id) !== voice.id);
        await supabase.from("customizations")
          .update({ custom_voices: updated })
          .eq("id", customData.id);
      }

      setCustomVoices(prev => prev.filter(v => v.id !== voice.id));
      if (selectedVoice === voice.id) setSelectedVoice(null);

      toast.success(`Voice "${voice.name}" deleted`);
    } catch (error) {
      console.error("Error deleting voice:", error);
      toast.error("Failed to delete voice");
    } finally {
      setDeletingVoice(null);
      setVoiceToDelete(null);
    }
  };

  const startRecording = async () => {
    try {
      // Stop any previous stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000); // collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedBlob(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error("Microphone error:", error);
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        toast.error("Microphone access was denied. Please check your browser settings and allow microphone access for this site.");
      } else if (error?.name === 'NotFoundError') {
        toast.error("No microphone found. Please connect a microphone and try again.");
      } else {
        toast.error("Could not access microphone. Try refreshing the page or using a different browser.");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'];
    if (!validTypes.some(t => file.type.includes(t.split('/')[1])) && !file.name.match(/\.(wav|mp3|webm|ogg|m4a|mp4)$/i)) {
      toast.error("Please upload a WAV, MP3, WebM, OGG, or M4A audio file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large. Max size is 25MB.");
      return;
    }

    setRecordedBlob(file);
    setRecordingTime(0);

    if (!newVoiceName.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setNewVoiceName(nameWithoutExt);
    }

    toast.success(`Audio file "${file.name}" loaded`);
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      
      const syncMsg = data.vapi_synced ? " and applied to your AI Brain" : "";
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

  // Combine voices: cloned first (with preview_url from API if available), then regular
  const clonedIds = new Set(customVoices.map(v => v.id));
  const allVoices = [
    ...customVoices.map(v => {
      // Find this cloned voice in the API response to get its preview_url
      const apiVoice = voices.find(av => av.id === v.id);
      return { ...v, category: 'cloned' as const, preview_url: apiVoice?.preview_url || v.preview_url || null };
    }),
    ...voices.filter(v => !clonedIds.has(v.id)),
  ];

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
        {/* All Voices - cloned first */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            Voices ({allVoices.length})
          </Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading voices...</p>
            ) : allVoices.length > 0 ? (
              allVoices.map((voice) => (
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
                    {voice.category === 'cloned' && (
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setVoiceToDelete(voice); }}
                        disabled={deletingVoice === voice.id}
                      >
                        <Trash2 className="w-3 h-3" />
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
            <p className="text-xs text-primary mt-2 animate-pulse">Syncing voice with your AI Brain...</p>
          )}
        </div>

        {/* Voice Cloning Section */}
        <div className="border-t pt-4">
          <Label className="text-sm font-semibold mb-3 block">Clone a New Voice</Label>

          <div className="space-y-3">
            <Input
              placeholder="Voice name (e.g. Becca, Jazzy)..."
              value={newVoiceName}
              onChange={(e) => setNewVoiceName(e.target.value)}
            />

            <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30 flex-wrap">
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

              <Button
                size="sm" variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCloning || isRecording}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Voice
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a"
                onChange={handleFileUpload}
                className="hidden"
              />

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
                  <span className="text-xs text-muted-foreground">
                    {recordingTime > 0 ? `${formatTime(recordingTime)} recorded` : "File loaded"}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Record or upload at least 30 seconds of clear speech. The voice will be cloned and automatically applied to your AI Brain.
            </p>

            {recordedBlob && newVoiceName.trim() && (
              <Button
                className="w-full gap-2"
                onClick={handleCloneVoice}
                disabled={isCloning}
              >
                <Mic className="w-4 h-4" />
                {isCloning ? "Cloning & Syncing..." : `Clone "${newVoiceName}" & Apply to AI Brain`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!voiceToDelete} onOpenChange={(open) => !open && setVoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{voiceToDelete?.name}" from ElevenLabs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => voiceToDelete && handleDeleteVoice(voiceToDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default VoiceManagementSection;
