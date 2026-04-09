import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneOff, Trash2, FileText, Clock, Brain, Play, Pause, CalendarIcon, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalyzeCallTranscriptsDialog } from "./AnalyzeCallTranscriptsDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getAuthHeaders } from "@/lib/auth-fetch";

const MY_PHONE_NUMBER = "+2342093940544";

const PhoneCallSection = () => {
  const [showMakeCall, setShowMakeCall] = useState(false);
  const [showScheduleCall, setShowScheduleCall] = useState(false);
  const [showQueuedCalls, setShowQueuedCalls] = useState(false);
  const [callTopic, setCallTopic] = useState("");
  const [callNumber, setCallNumber] = useState("");
  const [scheduleTopic, setScheduleTopic] = useState("");
  const [scheduleNumber, setScheduleNumber] = useState("");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleHour, setScheduleHour] = useState("");
  const [scheduleMinute, setScheduleMinute] = useState("");
  const [schedulePeriod, setSchedulePeriod] = useState<"AM" | "PM">("AM");
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState<"calling" | "connected" | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showMyNumber, setShowMyNumber] = useState(false);
  const [copied, setCopied] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [selectedCallTranscript, setSelectedCallTranscript] = useState<any>(null);
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceUpdate] = useState(0);

  // Convex reactive queries (auto-update, no manual fetch needed)
  const callHistory = useQuery(api.callHistory.list, { limit: 100 }) ?? [];
  const transcriptsList = useQuery(api.transcripts.list) ?? [];
  const scheduledCalls = useQuery(api.scheduledCalls.listPending) ?? [];
  const deleteCall = useMutation(api.callHistory.remove);
  const createScheduledCall = useMutation(api.scheduledCalls.create);
  const removeScheduledCall = useMutation(api.scheduledCalls.remove);

  // Countdown timer for scheduled calls
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Call timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isInCall && callStatus === "connected" && callStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall, callStatus, callStartTime]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Telnyx outbound call via Telnyx AI Assistant API
  const handleMakeCall = async () => {
    if (!callTopic || !callNumber) {
      toast.error("Please enter both a purpose and a phone number");
      return;
    }

    setIsInCall(true);
    setCallStatus("calling");
    setShowMakeCall(false);

    try {
      const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
      const response = await fetch(`${CONVEX_SITE_URL}/telnyx/outbound-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ to_number: callNumber, purpose: callTopic }),
      });

      const data = await response.json();

      if (data?.success) {
        setCallStatus("connected");
        setCallStartTime(new Date());
        setCurrentCallId(data.call_id);
        toast.success(`Outbound call initiated to ${callNumber}`);
      } else {
        throw new Error(data?.error || "Call failed");
      }
    } catch (error: any) {
      console.error("Error making call:", error);
      setIsInCall(false);
      setCallStatus(null);
      setCallTopic("");
      setCallNumber("");
      toast.error(`Call failed: ${error.message || "Unable to connect."}`);
    }
  };

  const handleScheduleCall = async () => {
    if (!scheduleTopic || !scheduleNumber || !scheduleDate || !scheduleHour || !scheduleMinute) {
      toast.error("Please enter topic, number, date, and time");
      return;
    }

    let hour24 = parseInt(scheduleHour);
    if (schedulePeriod === "PM" && hour24 !== 12) hour24 += 12;
    if (schedulePeriod === "AM" && hour24 === 12) hour24 = 0;
    const scheduledAt = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), hour24, parseInt(scheduleMinute), 0, 0);

    if (scheduledAt.getTime() <= Date.now()) {
      toast.error("Please select a future date and time");
      return;
    }

    try {
      await createScheduledCall({
        phone_number: scheduleNumber,
        purpose: scheduleTopic,
        scheduled_at: scheduledAt.toISOString(),
      });

      toast.success(`Call scheduled for ${format(scheduledAt, "MMM dd, yyyy HH:mm")}`);
      setScheduleTopic("");
      setScheduleNumber("");
      setScheduleDate(undefined);
      setScheduleHour("");
      setScheduleMinute("");
      setSchedulePeriod("AM");
      setShowScheduleCall(false);
    } catch (error) {
      console.error("Error scheduling call:", error);
      toast.error("Failed to schedule call");
    }
  };

  const handleRemoveScheduledCall = async (callId: any) => {
    try {
      await removeScheduledCall({ id: callId });
      toast.success("Scheduled call removed");
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
    if (currentCallId) {
      try {
        const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
        await fetch(`${CONVEX_SITE_URL}/telnyx/end-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ call_id: currentCallId }),
        });
        toast.success("Call ended");
      } catch (error) {
        console.error("Error ending call:", error);
        toast.error("Failed to end call");
      }
    } else {
      toast.success("Call ended");
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

  const handleDeleteCall = async (callId: any) => {
    try {
      await deleteCall({ id: callId });
      toast.success("Call deleted");
      setSelectedCallId(null);
    } catch (error) {
      console.error("Error deleting call:", error);
      toast.error("Failed to delete call");
    }
  };

  const handleViewTranscript = async (call: any) => {
    // Look up transcript by conversation_id from already-loaded transcripts
    let transcriptText = call.topic || "No transcript available for this call";
    let callerInfo = call.number;

    if (call.conversation_id) {
      const match = transcriptsList.find(
        (t: any) => t.conversation_id === call.conversation_id
      );
      if (match?.transcript_text) {
        transcriptText = match.transcript_text;
        callerInfo = match.caller_info || call.number;
      }
    }

    setSelectedCallTranscript({
      ...call,
      transcript: transcriptText,
      caller_info: callerInfo,
    });
    setShowTranscriptDialog(true);
  };

  const handlePlayRecording = (call: any) => {
    if (!call.recording_url) {
      toast.error("No recording available for this call");
      return;
    }

    if (playingCallId === call._id) {
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
    setPlayingCallId(call._id);
    setAudioRef(audio);
  };

  const sortByTime = (a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  const incomingCalls = callHistory.filter((call) => call.type === "incoming").sort(sortByTime);
  const outgoingCalls = callHistory.filter((call) => call.type === "outgoing").sort(sortByTime);

  const renderCallTile = (call: any) => (
    <div
      key={call._id}
      className={`p-3 border rounded-lg hover:bg-muted/50 transition-all relative min-h-[72px] ${
        selectedCallId === call._id ? "border-destructive" : "border-border"
      }`}
      onMouseDown={() => handleLongPressStart(call._id)}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onTouchStart={() => handleLongPressStart(call._id)}
      onTouchEnd={handleLongPressEnd}
    >
      {selectedCallId === call._id && (
        <Button
          size="icon"
          variant="destructive"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => handleDeleteCall(call._id)}
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
              {playingCallId === call._id ? (
                <Pause className="h-3 w-3 text-primary" />
              ) : (
                <Play className="h-3 w-3 text-primary" />
              )}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {call.timestamp ? format(new Date(call.timestamp), "MMM dd, HH:mm") : ""}
      </p>
      {call.topic && (
        <p className="text-xs mt-1 truncate">{call.topic}</p>
      )}
    </div>
  );

  return (
    <Card className="p-6 relative h-full flex flex-col">
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
            <Popover open={showMyNumber} onOpenChange={setShowMyNumber}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 flex-1 sm:flex-initial"
                >
                  <Phone className="w-3 h-3" />
                  My Number
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <p className="text-sm font-medium mb-2">Your Phone Number</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono">{MY_PHONE_NUMBER}</code>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(MY_PHONE_NUMBER);
                      setCopied(true);
                      toast.success("Number copied!");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
          <Input value={callTopic} onChange={(e) => setCallTopic(e.target.value)} placeholder="Topic or purpose of the call" />
          <Input value={callNumber} onChange={(e) => setCallNumber(e.target.value)} placeholder="Phone number (e.g., +1-555-123-4567)" />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleMakeCall} className="flex-1 w-full">Start Call</Button>
            <Button variant="outline" onClick={() => setShowMakeCall(false)} className="flex-1 w-full">Cancel</Button>
          </div>
        </div>
      )}

      {showScheduleCall && (
        <div className="mb-6 p-4 border border-border rounded-lg space-y-3">
          <p className="font-medium">Schedule a call for later</p>
          <Input value={scheduleTopic} onChange={(e) => setScheduleTopic(e.target.value)} placeholder="Topic or purpose of the call" />
          <Input value={scheduleNumber} onChange={(e) => setScheduleNumber(e.target.value)} placeholder="Phone number (e.g., +1-555-123-4567)" />
          <div className="flex flex-col gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduleDate ? format(scheduleDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2 items-center">
              <Input type="number" min="1" max="12" value={scheduleHour} onChange={(e) => setScheduleHour(e.target.value)} placeholder="HH" className="w-20 text-center" />
              <span className="text-lg font-bold">:</span>
              <Input type="number" min="0" max="59" value={scheduleMinute} onChange={(e) => setScheduleMinute(e.target.value)} placeholder="MM" className="w-20 text-center" />
              <Button type="button" variant={schedulePeriod === "AM" ? "default" : "outline"} size="sm" onClick={() => setSchedulePeriod("AM")}>AM</Button>
              <Button type="button" variant={schedulePeriod === "PM" ? "default" : "outline"} size="sm" onClick={() => setSchedulePeriod("PM")}>PM</Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleScheduleCall} className="flex-1 w-full">Schedule Call</Button>
            <Button variant="outline" onClick={() => setShowQueuedCalls(!showQueuedCalls)} className="relative w-full sm:w-auto">
              Scheduled Calls
              {scheduledCalls.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">{scheduledCalls.length}</Badge>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowScheduleCall(false)} className="w-full sm:w-auto">Cancel</Button>
          </div>

          {showQueuedCalls && (
            <>
            {scheduledCalls.length === 0 ? (
              <div className="mt-4 p-3 border border-border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">No scheduled calls yet</div>
            ) : (
            <div className="mt-4 p-3 border border-border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-sm mb-3">Scheduled Calls</h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {scheduledCalls.map((call) => (
                    <div key={call._id} className="flex items-center justify-between p-3 border border-border rounded bg-background">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{call.purpose}</p>
                        <p className="text-xs text-muted-foreground">{call.phone_number}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(call.scheduled_at), "MMM dd, yyyy HH:mm")}</p>
                        <p className="text-xs font-semibold mt-1" style={{color:"rgb(0,220,255)"}}>⏳ {getTimeLeft(call.scheduled_at)}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveScheduledCall(call._id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            )}
            </>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
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
            <DialogTitle>
              Call Transcript{selectedCallTranscript?.caller_info ? ` - ${selectedCallTranscript.caller_info}` : ` - ${selectedCallTranscript?.number}`}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-4 mb-3">
                  <p className="text-sm text-muted-foreground">
                    {selectedCallTranscript?.timestamp && format(new Date(selectedCallTranscript.timestamp), "MMM dd, yyyy HH:mm")}
                  </p>
                  <p className="text-sm font-medium">Duration: {selectedCallTranscript?.duration_minutes || 0} min</p>
                  <Badge variant={selectedCallTranscript?.type === "incoming" ? "default" : "secondary"}>
                    {selectedCallTranscript?.type || "call"}
                  </Badge>
                </div>
                {selectedCallTranscript?.recording_url && (
                  <div className="mb-3">
                    <audio controls className="w-full h-8" src={selectedCallTranscript.recording_url}>
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
                <div className="mt-3 p-3 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Transcript:</p>
                  <div className="text-sm space-y-1">
                    {(selectedCallTranscript?.transcript || "No transcript available").split("\n").map((line: string, i: number) => (
                      <p key={i} className={line.startsWith("Becca:") ? "text-cyan-400" : line.startsWith("Caller:") ? "text-white" : "text-muted-foreground"}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AnalyzeCallTranscriptsDialog open={analyzeDialogOpen} onOpenChange={setAnalyzeDialogOpen} />
    </Card>
  );
};

export default PhoneCallSection;
