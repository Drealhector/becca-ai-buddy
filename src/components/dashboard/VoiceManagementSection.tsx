import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mic, RefreshCw, Volume2, Square, Circle, Play, Check, Trash2, Upload, Gauge } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getAuthHeaders } from "@/lib/auth-fetch";

interface VoiceItem {
  id: string; // full voice string for the calling voice
  cloneId: string; // clone UUID for deletion
  name: string;
  description: string;
}

const VoiceManagementSection = () => {
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [syncingVoice, setSyncingVoice] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState<VoiceItem | null>(null);
  const [deletingVoice, setDeletingVoice] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [savingSpeed, setSavingSpeed] = useState(false);
  const speedDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const customizations = useQuery(api.customizations.get, {});
  const updateCustomizations = useMutation(api.customizations.update);
  const fetchCurrentVoiceAction = useAction(api.voice.fetchCurrentVoice);
  const cloneVoiceAction = useAction(api.voice.cloneVoice);
  const deleteVoiceAction = useAction(api.voice.deleteVoice);
  const storeVoiceSampleAction = useAction(api.voice.storeVoiceSample);
  const getVoiceSampleUrlAction = useAction(api.voice.getVoiceSampleUrl);

  const syncVoiceToTelnyx = useCallback(async (
    voiceId?: string,
    speed?: number
  ): Promise<{ ok: boolean; confirmedSpeed?: number }> => {
    const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL;
    if (!siteUrl) return { ok: false };
    try {
      const body: Record<string, any> = {};
      if (voiceId) body.voice_id = voiceId;
      if (speed !== undefined) body.voice_speed = speed;
      const res = await fetch(`${siteUrl}/telnyx/sync-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) return { ok: false };
      const data = await res.json();
      return { ok: true, confirmedSpeed: data.voice_speed };
    } catch {
      return { ok: false };
    }
  }, []);

  // Load voices from database
  const voices = useMemo<VoiceItem[]>(() => {
    if (!customizations) return [];
    const stored = Array.isArray(customizations.custom_voices) ? customizations.custom_voices as any[] : [];
    return stored.map((v: any) => ({
      id: v.id || v.voice_id,
      cloneId: v.clone_id || v.id || "",
      name: v.name || "Unnamed Voice",
      description: (v.description || "Cloned voice").replace(/\s*\((?:MiniMax|Minimax|Telnyx|ElevenLabs)\)/gi, ""),
    }));
  }, [customizations]);

  useEffect(() => {
    loadCurrentVoice();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (customizations) {
      const selectedData = customizations.voices;
      if (Array.isArray(selectedData) && selectedData.length > 0) {
        setSelectedVoice(selectedData[0] as string);
      }
    }
  }, [customizations]);

  const loadCurrentVoice = async () => {
    setLoading(true);
    try {
      const current = await fetchCurrentVoiceAction();
      if (current?.voice) setSelectedVoice(current.voice);
      if (current?.voice_speed != null) setVoiceSpeed(current.voice_speed);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleSelectVoice = async (voice: VoiceItem) => {
    if (!customizations?._id) return;
    try {
      setSelectedVoice(voice.id);
      setSyncingVoice(true);
      await updateCustomizations({ id: customizations._id, voices: [voice.id] as any });
      const { ok: synced } = await syncVoiceToTelnyx(voice.id);
      toast.success(synced ? `"${voice.name}" is now your calling voice` : `"${voice.name}" selected`);
    } catch {
      toast.error("Failed to set voice");
    } finally {
      setSyncingVoice(false);
    }
  };

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setVoiceSpeed(newSpeed);
    // Debounce the API call — sync after user stops sliding
    if (speedDebounceRef.current) clearTimeout(speedDebounceRef.current);
    speedDebounceRef.current = setTimeout(async () => {
      setSavingSpeed(true);
      try {
        const { ok, confirmedSpeed } = await syncVoiceToTelnyx(undefined, newSpeed);
        if (ok) {
          // Snap slider to what Telnyx actually stored (may differ slightly)
          if (confirmedSpeed != null) setVoiceSpeed(confirmedSpeed);
          toast.success(`Voice speed set to ${(confirmedSpeed ?? newSpeed).toFixed(2)}x`);
        } else {
          toast.error("Failed to update voice speed");
        }
      } catch {
        toast.error("Failed to update voice speed");
      } finally {
        setSavingSpeed(false);
      }
    }, 500);
  }, [syncVoiceToTelnyx]);

  const handleDeleteVoice = async (voice: VoiceItem) => {
    setDeletingVoice(voice.id);
    try {
      // Pass all available identifiers — server will pick the best one
      const result = await deleteVoiceAction({
        cloneId: voice.cloneId || undefined,
        voiceId: voice.id,
        name: voice.name,
      });

      // Always remove from DB even if Telnyx deletion had issues (best effort)
      if (customizations?._id) {
        const existing = Array.isArray(customizations.custom_voices) ? customizations.custom_voices as any[] : [];
        const updated = existing.filter((v: any) => (v.id || v.voice_id) !== voice.id);
        const currentVoices = Array.isArray(customizations.voices) ? customizations.voices as any[] : [];
        const updatedVoices = currentVoices.filter((id: any) => id !== voice.id);
        await updateCustomizations({
          id: customizations._id,
          custom_voices: updated as any,
          voices: updatedVoices as any,
        });
      }
      if (selectedVoice === voice.id) setSelectedVoice(null);

      if (result?.success) {
        toast.success(`"${voice.name}" deleted`);
      } else {
        toast.success(`"${voice.name}" removed from list`);
      }
    } catch (err) {
      console.error("Delete voice error:", err);
      toast.error("Failed to delete voice");
    } finally {
      setDeletingVoice(null);
      setVoiceToDelete(null);
    }
  };

  const handlePreviewVoice = async (voice: VoiceItem) => {
    if (previewingVoice === voice.id) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setPreviewingVoice(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    // Check if voice has a stored sample
    const stored = Array.isArray(customizations?.custom_voices) ? customizations.custom_voices as any[] : [];
    const voiceEntry = stored.find((v: any) => (v.id || v.voice_id) === voice.id);
    if (!voiceEntry?.sampleStorageId) {
      toast.error("No voice sample available. Re-clone this voice to enable preview.");
      return;
    }

    setPreviewingVoice(voice.id);
    try {
      const result = await getVoiceSampleUrlAction({ storageId: voiceEntry.sampleStorageId });
      if (result.url) {
        const audio = new Audio(result.url);
        audioRef.current = audio;
        audio.play();
        audio.onended = () => { audioRef.current = null; setPreviewingVoice(null); };
        audio.onerror = () => { toast.error("Could not play sample"); setPreviewingVoice(null); };
      } else {
        toast.error("Sample not found");
        setPreviewingVoice(null);
      }
    } catch {
      toast.error("Could not preview voice");
      setPreviewingVoice(null);
    }
  };

  const handleCloneVoice = async () => {
    if (!newVoiceName.trim()) { toast.error("Enter a voice name"); return; }
    if (!recordedBlob) { toast.error("Record or upload a voice sample first"); return; }

    const nameForToast = newVoiceName.trim();
    setIsCloning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(recordedBlob);
      });

      const data = await cloneVoiceAction({
        name: newVoiceName.trim(),
        audio: base64,
        language: "en",
        gender: "female",
      });

      // Store the audio sample for playback preview
      let sampleStorageId: string | undefined;
      try {
        const stored = await storeVoiceSampleAction({ audio: base64 });
        sampleStorageId = stored.storageId;
      } catch { /* non-critical */ }

      if (customizations?._id) {
        const existing = Array.isArray(customizations.custom_voices) ? customizations.custom_voices as any[] : [];
        await updateCustomizations({
          id: customizations._id,
          custom_voices: [...existing, {
            id: data.voice_id,
            clone_id: data.clone_id,
            name: data.name || newVoiceName.trim(),
            voice_id: data.voice_id,
            description: "Cloned voice",
            ...(sampleStorageId ? { sampleStorageId } : {}),
          }] as any,
          voices: [data.voice_id] as any,
        });
      }

      setSelectedVoice(data.voice_id);
      setNewVoiceName("");
      setRecordedBlob(null);
      setRecordingTime(0);

      const { ok: synced } = await syncVoiceToTelnyx(data.voice_id, voiceSpeed);
      toast.success(synced
        ? `"${nameForToast}" cloned and set as your calling voice!`
        : `"${nameForToast}" cloned successfully!`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clone voice");
    } finally {
      setIsCloning(false);
    }
  };

  const startRecording = async () => {
    try {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
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
    } catch {
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
    if (file.size > 4.5 * 1024 * 1024) { toast.error(`File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 4.5MB. Try a 60-90 second clip, or re-export at 128kbps mono.`); return; }
    setRecordedBlob(file);
    setRecordingTime(0);
    if (!newVoiceName.trim()) setNewVoiceName(file.name.replace(/\.[^/.]+$/, ""));
    toast.success(`"${file.name}" loaded`);
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Card className="p-6 shadow-elegant hover:shadow-hover transition-all h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Voice Management</h3>
        </div>
        <Button size="sm" variant="outline" onClick={loadCurrentVoice} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* Voice List — cloned voices */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            Your Voices ({voices.length})
          </Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {voices.length > 0 ? (
              voices.map((voice) => (
                <div key={voice.id} onClick={() => handleSelectVoice(voice)}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${selectedVoice === voice.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{voice.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Cloned</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{voice.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="icon" variant="ghost" className={`h-7 w-7 ${previewingVoice === voice.id ? "text-primary animate-pulse" : "text-muted-foreground hover:text-primary"}`}
                      onClick={(e) => { e.stopPropagation(); handlePreviewVoice(voice); }}
                      disabled={previewingVoice !== null && previewingVoice !== voice.id}
                      title="Preview voice">
                      {previewingVoice === voice.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setVoiceToDelete(voice); }}
                      disabled={deletingVoice === voice.id}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
              <div className="text-center py-6 text-muted-foreground">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No voices cloned yet.</p>
                <p className="text-xs mt-1">Record or upload your voice below to get started.</p>
              </div>
            )}
          </div>
          {syncingVoice && <p className="text-xs text-primary mt-2 animate-pulse">Setting as calling voice...</p>}
        </div>

        {/* Voice Speed Control */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" />
              Voice Speed
            </Label>
            <span className="text-sm font-mono text-primary">
              {voiceSpeed.toFixed(1)}x
              {savingSpeed && <span className="ml-2 text-xs text-muted-foreground animate-pulse">saving...</span>}
            </span>
          </div>
          <input
            type="range"
            min="0.25"
            max="2.0"
            step="0.05"
            value={voiceSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>0.25x (slow)</span>
            <span>1.0x (normal)</span>
            <span>2.0x (fast)</span>
          </div>
        </div>

        {/* Clone Voice Section */}
        <div className="border-t pt-4">
          <Label className="text-sm font-semibold mb-3 block">Clone Your Voice</Label>
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
                <Upload className="w-4 h-4" />Upload Audio
              </Button>
              <input ref={fileInputRef} type="file" accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a,.mpeg,.mpga" onChange={handleFileUpload} className="hidden" />
              {isRecording && <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-sm text-muted-foreground">Recording...</span></div>}
              {recordedBlob && !isRecording && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={playRecording} className="gap-1"><Play className="w-3 h-3" /> Play</Button>
                  <span className="text-xs text-muted-foreground">{recordingTime > 0 ? `${formatTime(recordingTime)} recorded` : "File loaded"}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">Record or upload at least 10 seconds of clear speech. Longer samples (up to 5 minutes) produce better results.</p>

            {recordedBlob && newVoiceName.trim() && (
              <Button className="w-full gap-2" onClick={handleCloneVoice} disabled={isCloning}>
                <Mic className="w-4 h-4" />{isCloning ? "Cloning..." : `Clone "${newVoiceName}"`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!voiceToDelete} onOpenChange={(open) => !open && setVoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete "{voiceToDelete?.name}"? This cannot be undone.
            </AlertDialogDescription>
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
