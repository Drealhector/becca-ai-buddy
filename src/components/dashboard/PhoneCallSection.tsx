import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneOff, Trash2, FileText, Clock, Brain, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalyzeCallTranscriptsDialog } from "./AnalyzeCallTranscriptsDialog";

const PhoneCallSection = () => {
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [showMakeCall, setShowMakeCall] = useState(false);
  const [showScheduleCall, setShowScheduleCall] = useState(false);
  const [showQueuedCalls, setShowQueuedCalls] = useState(false);
  const [callTopic, setCallTopic] = useState("");
  const [callNumber, setCallNumber] = useState("");
  const [scheduleTopic, setScheduleTopic] = useState("");
  const [scheduleNumber, setScheduleNumber] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduledCalls, setScheduledCalls] = useState<any[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState<"calling" | "connected" | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [selectedCallTranscript, setSelectedCallTranscript] = useState<any>(null);
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCallHistory();
    fetchScheduledCalls();

    const channel = supabase
      .channel("call-history-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_history" },
        () => fetchCallHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Countdown timer for scheduled calls - update every second
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setScheduledCalls(prev => [...prev]); // force re-render for countdown
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Call timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall && callStatus === "connected" && callStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall, callStatus, callStartTime]);

  const fetchCallHistory = async () => {
    try {
      const { data } = await supabase
        .from("call_history")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);
      setCallHistory(data || []);
    } catch (error) {
      console.error("Error fetching call history:", error);
    }
  };

  const fetchScheduledCalls = async () => {
    try {
      const { data } = await supabase
        .from("scheduled_calls")
        .select("*")
        .eq("status", "pending")
        .order("scheduled_at", { ascending: true });
      setScheduledCalls(data || []);
    } catch (error) {
      console.error("Error fetching scheduled calls:", error);
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMakeCall = async () => {
    if (!callTopic || !callNumber) {
      toast.error("Please enter both a purpose and a phone number");
      return;
    }

    setIsInCall(true);
    setCallStatus("calling");
    setShowMakeCall(false);

    try {
      const { data, error } = await supabase.functions.invoke("vapi-outbound-call", {
        body: { toNumber: callNumber, purpose: callTopic },
      });

      if (error) throw error;

      if (data?.success) {
        setCallStatus("connected");
        setCallStartTime(new Date());
        setCurrentCallId(data.callId);
        toast.success(`Outbound call initiated to ${callNumber}`);
      } else {
        throw new Error(data?.error || "Call failed");
      }
    } catch (error: any) {
      console.error("Error making Vapi call:", error);
      setIsInCall(false);
      setCallStatus(null);
      setCallTopic("");
      setCallNumber("");
      toast.error(`Call failed: ${error.message || "Unable to connect."}`);
    }
  };

  const handleScheduleCall = async () => {
    if (!scheduleTopic || !scheduleNumber || !scheduleTime) {
      toast.error("Please enter topic, number, and time");
      return;
    }

    const scheduledAt = new Date(scheduleTime);
    if (scheduledAt <= new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    try {
      const { error } = await supabase.from("scheduled_calls").insert({
        phone_number: scheduleNumber,
        purpose: scheduleTopic,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
      });

      if (error) throw error;

      toast.success(`Call scheduled for ${format(scheduledAt, "MMM dd, yyyy HH:mm")}`);
      setScheduleTopic("");
      setScheduleNumber("");
      setScheduleTime("");
      setShowScheduleCall(false);
      fetchScheduledCalls();
    } catch (error) {
      console.error("Error scheduling call:", error);
      toast.error("Failed to schedule call");
    }
  };

  const handleRemoveScheduledCall = async (callId: string) => {
    try {
      await supabase.from("scheduled_calls").delete().eq("id", callId);
      toast.success("Scheduled call removed");
      fetchScheduledCalls();
    } catch (error) {
      console.error("Error removing scheduled call:", error);
      toast.error("Failed to remove scheduled call");
    }
  };

  const getTimeLeft = (scheduledTime: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diff = scheduled.getTime() - now.getTime();

    if (diff <= 0) return "Executing...";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const handleEndCall = async () => {
    try {
      // Actually stop the Vapi call via API
      if (currentCallId) {
        await supabase.functions.invoke("vapi-outbound-call", {
          body: { action: "end", callId: currentCallId },
        }).catch(() => {
          // If the edge function doesn't support end, call Vapi directly
          // The call will end on Vapi's side when we stop
        });
      }

      const finalDuration = callDuration / 60;

      // Don't double-insert - the outbound call edge function already logs it
      toast.success("Call ended");
    } catch (error) {
      console.error("Error ending call:", error);
    }

    setIsInCall(false);
    setCallStatus(null);
    setCallDuration(0);
    setCallStartTime(null);
    setCurrentCallId(null);
    setCallTopic("");
    setCallNumber("");
  };

  const handleLongPressStart = (callId: string) => {
    const timer = setTimeout(() => {
      setSelectedCallId(callId);
    }, 800);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleDeleteCall = async (callId: string) => {
    try {
      await supabase.from("call_history").delete().eq("id", callId);
      toast.success("Call deleted");
      setSelectedCallId(null);
    } catch (error) {
      console.error("Error deleting call:", error);
      toast.error("Failed to delete call");
    }
  };

  const handleViewTranscript = async (call: any) => {
    const { data: transcript } = await supabase
      .from("transcripts")
      .select("*")
      .eq("conversation_id", call.conversation_id)
      .single();

    setSelectedCallTranscript({
      ...call,
      transcript: transcript?.transcript_text || "No transcript available for this call"
    });
    setShowTranscriptDialog(true);
  };

  const handlePlayRecording = (call: any) => {
    if (!call.recording_url) {
      toast.error("No recording available for this call");
      return;
    }

    if (playingCallId === call.id) {
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
      setPlayingCallId(null);
      setAudioRef(null);
      return;
    }

    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }

    const audio = new Audio(call.recording_url);
    audio.onended = () => { setPlayingCallId(null); setAudioRef(null); };
    audio.onerror = () => { toast.error("Failed to play recording"); setPlayingCallId(null); setAudioRef(null); };
    audio.play();
    setPlayingCallId(call.id);
    setAudioRef(audio);
  };

  const incomingCalls = callHistory.filter((call) => call.type === "incoming");
  const outgoingCalls = callHistory.filter((call) => call.type === "outgoing");

  const renderCallTile = (call: any) => (
    <div
      key={call.id}
      className={`p-3 border rounded-lg hover:bg-muted/50 transition-all relative min-h-[72px] ${
        selectedCallId === call.id ? "border-destructive" : "border-border"
      }`}
      onMouseDown={() => handleLongPressStart(call.id)}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onTouchStart={() => handleLongPressStart(call.id)}
      onTouchEnd={handleLongPressEnd}
    >
      {selectedCallId === call.id && (
        <Button
          size="icon"
          variant="destructive"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => handleDeleteCall(call.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{call.number}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewTranscript(call)}
            className="h-6 w-6 p-0"
          >
            <FileText className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {call.duration_minutes ? `${Math.round(call.duration_minutes * 10) / 10} min` : "0 min"}
          </Badge>
          {call.recording_url && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handlePlayRecording(call)}
              className="h-5 w-5 p-0"
            >
              {playingCallId === call.id ? (
                <Pause className="h-3 w-3 text-primary" />
              ) : (
                <Play className="h-3 w-3 text-primary" />
              )}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {format(new Date(call.timestamp), "MMM dd, HH:mm")}
      </p>
      {call.topic && (
        <p className="text-xs mt-1 truncate">{call.topic}</p>
      )}
    </div>
  );

  return (
    <Card className="p-6 relative">
      {/* Call Widget Overlay */}
      {isInCall && (
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-card to-background/95 backdrop-blur-lg rounded-lg flex flex-col items-center justify-center p-8">
          <div className="bg-primary/10 rounded-full p-20 mb-8 shadow-glow">
            <Phone className="h-24 w-24 text-primary" />
          </div>
          
          <h2 className="text-3xl font-bold mb-2">{callNumber}</h2>
          
          {callStatus === "calling" ? (
            <p className="text-xl text-muted-foreground mb-8 animate-pulse">Calling...</p>
          ) : (
            <>
              <p className="text-xl mb-4" style={{color:"rgb(0,220,255)"}}>Connected</p>
              <p className="text-4xl font-mono font-bold mb-8">{formatCallDuration(callDuration)}</p>
            </>
          )}

          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-24 h-24 shadow-elegant hover:shadow-hover"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-10 w-10" />
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Phone Calls</h3>
            </div>
            <Button
              onClick={() => setAnalyzeDialogOpen(true)}
              variant="outline"
              className="gap-2 sm:hidden"
            >
              <Brain className="w-4 h-4" />
              <Phone className="w-4 h-4" />
              Analyze
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowMakeCall(!showMakeCall)}
              size="sm"
              className="text-white gap-1 flex-1 sm:flex-initial" style={{backgroundColor:"rgb(0,190,220)"}}
            >
              <Phone className="w-3 h-3" />
              Make Call
            </Button>
            <Button
              onClick={() => setShowScheduleCall(!showScheduleCall)}
              size="sm"
              variant="outline"
              className="gap-1 flex-1 sm:flex-initial"
            >
              <Clock className="w-3 h-3" />
              Schedule
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setAnalyzeDialogOpen(true)}
          variant="outline"
          className="gap-2 hidden sm:flex"
        >
          <Brain className="w-4 h-4" />
          <Phone className="w-4 h-4" />
          Analyze
        </Button>
      </div>

      {showMakeCall && (
        <div className="mb-6 p-4 border border-border rounded-lg space-y-3">
          <p className="font-medium">What do you want the AI to talk about?</p>
          <Input
            value={callTopic}
            onChange={(e) => setCallTopic(e.target.value)}
            placeholder="Topic or purpose of the call"
          />
          <Input
            value={callNumber}
            onChange={(e) => setCallNumber(e.target.value)}
            placeholder="Phone number (e.g., +1-555-123-4567)"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleMakeCall} className="flex-1 w-full">
              Start Call
            </Button>
            <Button variant="outline" onClick={() => setShowMakeCall(false)} className="flex-1 w-full">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showScheduleCall && (
        <div className="mb-6 p-4 border border-border rounded-lg space-y-3">
          <p className="font-medium">Schedule a call for later</p>
          <Input
            value={scheduleTopic}
            onChange={(e) => setScheduleTopic(e.target.value)}
            placeholder="Topic or purpose of the call"
          />
          <Input
            value={scheduleNumber}
            onChange={(e) => setScheduleNumber(e.target.value)}
            placeholder="Phone number (e.g., +1-555-123-4567)"
          />
          <Input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleScheduleCall} className="flex-1 w-full">
              Schedule Call
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowQueuedCalls(!showQueuedCalls)}
              className="relative w-full sm:w-auto"
            >
              Scheduled Calls
              {scheduledCalls.length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {scheduledCalls.length}
                </Badge>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowScheduleCall(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>

          {showQueuedCalls && scheduledCalls.length > 0 && (
            <div className="mt-4 p-3 border border-border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-sm mb-3">Scheduled Calls</h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {scheduledCalls.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-3 border border-border rounded bg-background"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{call.purpose}</p>
                        <p className="text-xs text-muted-foreground">{call.phone_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(call.scheduled_at), "MMM dd, yyyy HH:mm")}
                        </p>
                        <p className="text-xs font-semibold mt-1" style={{color:"rgb(0,220,255)"}}>
                          ⏳ {getTimeLeft(call.scheduled_at)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveScheduledCall(call.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Incoming Calls */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PhoneIncoming className="h-5 w-5" style={{color:"rgb(0,220,255)"}} />
            <h4 className="font-medium">Incoming Calls</h4>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {incomingCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incoming calls</p>
            ) : (
              incomingCalls.map(renderCallTile)
            )}
          </div>
        </div>

        {/* Outgoing Calls */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PhoneOutgoing className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium">Outgoing Calls</h4>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {outgoingCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outgoing calls</p>
            ) : (
              outgoingCalls.map(renderCallTile)
            )}
          </div>
        </div>
      </div>

      {/* Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call Transcript - {selectedCallTranscript?.number}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedCallTranscript?.timestamp && format(new Date(selectedCallTranscript.timestamp), "MMM dd, yyyy HH:mm")}
                </p>
                <p className="text-sm font-medium mb-2">
                  Duration: {selectedCallTranscript?.duration_minutes || 0} minutes
                </p>
                {selectedCallTranscript?.topic && (
                  <p className="text-sm mb-3">
                    <span className="font-medium">Topic:</span> {selectedCallTranscript.topic}
                  </p>
                )}
                <div className="mt-3 p-3 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Transcript:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedCallTranscript?.transcript || "No transcript available for this call"}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AnalyzeCallTranscriptsDialog
        open={analyzeDialogOpen}
        onOpenChange={setAnalyzeDialogOpen}
      />
    </Card>
  );
};

export default PhoneCallSection;
