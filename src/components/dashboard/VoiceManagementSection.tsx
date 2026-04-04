import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mic, RefreshCw, Volume2, Square, Circle, Play, Pause, Check, Trash2, Upload } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getAuthHeaders } from "@/lib/auth-fetch";

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Convex
  const customizations = useQuery(api.customizations.get, {});
  const updateCustomizations = useMutation(api.customizations.update);
  const fetchVoicesAction = useAction(api.voice.fetchVoices);
  const cloneVoiceAction = useAction(api.voice.cloneVoice);
  const deleteVoiceAction = useAction(api.voice.deleteVoice);

  // Sync selected voice to Telnyx phone agent
  const syncVoiceToTelnyx = useCallback(async (voiceId: string): Promise<boolean> => {
    const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL;
    if (!siteUrl) return false;
    try {
      const res = await fetch(`${siteUrl}/telnyx/sync-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ voice_id: voiceId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    fetchVoices();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (customizations) {
      const stored = Array.isArray(customizations.custom_voices) ? customizations.custom_voices as any[] : [];
      setCustomVoices(stored.map((v: any) => ({
        id: v.id || v.voice_id,
        name: v.name,
        provider: v.provider || "elevenlabs",
        description: v.description || "Cloned voice",
      })));
      const vapiVoicesData = customizations.voices;
      if (Array.isArray(vapiVoicesData) && vapiVoicesData.length > 0) {
        setSelectedVoice(vapiVoicesData[0] as string);
      }
    }
  }, [customizations]);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const data = await fetchVoicesAction();
      setVoices(data?.voices || []);
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error("Failed to load voices");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVoice = async (voiceId: string, voiceName: string) => {
    if (!customizations?._id) return;
    try {
      setSelectedVoice(voiceId);
      setSyncingVoice(true);
      await updateCustomizations({ id: customizations._id, voices: [voiceId] as any });

      const synced = await syncVoiceToTelnyx(voiceId);
      toast.success(synced ? `Voice "${voiceName}" synced to phone agent` : `Voice "${voiceName}" selected`);
    } catch (error) {
      console.error("Error selecting voice:", error);
      toast.error("Failed to select voice");
    } finally {
      setSyncingVoice(false);
    }
  };

  const handleDeleteVoice = async (voice: VoiceItem) => {
    setDeletingVoice(voice.id);
    try {
      await deleteVoiceAction({ voiceId: voice.id });

      if (customizations?._id) {
        const existing = Array.isArray(customizations.custom_voices) ? customizations.custom_voices as any[] : [];
        const updated = existing.filter((v: any) => (v.id || v.voice_id) !== voice.id);
        await updateCustomizations({ id: customizations._id, custom_voices: updated as any });
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedBlob(null);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (error: any) {
      console.error("Microphone error:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("File too large. Max 25MB."); return; }
    setRecordedBlob(file);
    setRecordingTime(0);
    if (!newVoiceName.trim()) setNewVoiceName(file.name.replace(/\.[^/.]+$/, ""));
    toast.success(`Audio file "${file.name}" loaded`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const playRecording = () => {
    if (!recordedBlob) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; };
  };

  const handleCloneVoice = async () => {
    if (!newVoiceName.trim()) { toast.error("Enter a voice name"); return; }
    if (!recordedBlob) { toast.error("Record a voice sample first"); return; }

    const nameForToast = newVoiceName.trim();
    setIsCloning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(recordedBlob);
      });

      const data = await cloneVoiceAction({ name: newVoiceName.trim(), audio: base64, setAsActive: true });

      if (customizations?._id) {
        const existing = Array.isArray(customizations.custom_voices) ? customizations.custom_voices as any[] : [];
        await updateCustomizations({
          id: customizations._id,
          custom_voices: [...existing, { id: data.voice_id, name: newVoiceName.trim(), provider: "elevenlabs", voice_id: data.voice_id }] as any,
          voices: [data.voice_id] as any,
        });
      }

      setCustomVoices(prev => [...prev, { id: data.voice_id, name: newVoiceName.trim(), provider: "elevenlabs", description: "Cloned voice" }]);
      setSelectedVoice(data.voice_id);
      setNewVoiceName("");
      setRecordedBlob(null);
      setRecordingTime(0);

      const synced = await syncVoiceToTelnyx(data.voice_id);
      toast.success(synced ? `Voice "${nameForToast}" cloned and synced to phone agent!` : `Voice "${nameForToast}" cloned successfully!`);
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

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const allVoices = useMemo(() => {
    const clonedIds = new Set(customVoices.map(v => v.id));
    const apiCloned = voices.filter(v => !clonedIds.has(v.id) && v.category === "cloned");
    const apiOther = voices.filter(v => !clonedIds.has(v.id) && v.category !== "cloned");
    return [
      ...customVoices.map(v => {
        const apiVoice = voices.find(av => av.id === v.id);
        return { ...v, category: "cloned" as const, preview_url: apiVoice?.preview_url || v.preview_url || null };
      }),
      ...apiCloned.map(v => ({ ...v, category: "cloned" as const })),
      ...apiOther,
    ];
  }, [customVoices, voices]);

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all h-full flex flex-col">
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
        <div>
          <Label className="text-sm font-semibold mb-2 block">Voices ({allVoices.length})</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading voices...</p>
            ) : allVoices.length > 0 ? (
              allVoices.map((voice) => (
                <div key={voice.id} onClick={() => handleSelectVoice(voice.id, voice.name)}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${selectedVoice === voice.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{voice.name}</span>
                      {voice.category === "cloned" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">Cloned</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{voice.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {voice.preview_url && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); playPreview(voice.preview_url!, voice.id); }}>
                        {playingPreview === voice.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                    )}
                    {voice.category === "cloned" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setVoiceToDelete(voice); }} disabled={deletingVoice === voice.id}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    {selectedVoice === voice.id && (
                      <div className="flex items-center gap-1"><Check className="w-4 h-4 text-primary" /><span className="text-xs text-primary font-semibold">Active</span></div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No voices found.</p>
            )}
          </div>
          {syncingVoice && <p className="text-xs text-primary mt-2 animate-pulse">Syncing voice...</p>}
        </div>

        <div className="border-t pt-4">
          <Label className="text-sm font-semibold mb-3 block">Clone a New Voice</Label>
          <div className="space-y-3">
            <Input placeholder="Voice name..." value={newVoiceName} onChange={(e) => setNewVoiceName(e.target.value)} />
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30 flex-wrap">
              {!isRecording ? (
                <Button size="sm" variant="outline" onClick={startRecording} disabled={isCloning} className="gap-2">
                  <Circle className="w-4 h-4 text-red-500 fill-red-500" />{recordedBlob ? "Re-record" : "Record Voice"}
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={stopRecording} className="gap-2">
                  <Square className="w-3 h-3 fill-current" />Stop ({formatTime(recordingTime)})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isCloning || isRecording} className="gap-2">
                <Upload className="w-4 h-4" />Upload Voice
              </Button>
              <input ref={fileInputRef} type="file" accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a" onChange={handleFileUpload} className="hidden" />
              {isRecording && <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-sm text-muted-foreground">Recording...</span></div>}
              {recordedBlob && !isRecording && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={playRecording} className="gap-1"><Play className="w-3 h-3" /> Play</Button>
                  <span className="text-xs text-muted-foreground">{recordingTime > 0 ? `${formatTime(recordingTime)} recorded` : "File loaded"}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Record or upload at least 30 seconds of clear speech.</p>
            {recordedBlob && newVoiceName.trim() && (
              <Button className="w-full gap-2" onClick={handleCloneVoice} disabled={isCloning}>
                <Mic className="w-4 h-4" />{isCloning ? "Cloning..." : `Clone "${newVoiceName}"`}
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!voiceToDelete} onOpenChange={(open) => !open && setVoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{voiceToDelete?.name}". This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => voiceToDelete && handleDeleteVoice(voiceToDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default VoiceManagementSection;
