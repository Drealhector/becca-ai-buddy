import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneOff, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const PhoneCallSection = () => {
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [showMakeCall, setShowMakeCall] = useState(false);
  const [callTopic, setCallTopic] = useState("");
  const [callNumber, setCallNumber] = useState("");
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState<"calling" | "connected" | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [selectedCallTranscript, setSelectedCallTranscript] = useState<any>(null);

  useEffect(() => {
    fetchCallHistory();

    const channel = supabase
      .channel("call-history-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_history",
        },
        () => {
          fetchCallHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
        .limit(20);

      setCallHistory(data || []);
    } catch (error) {
      console.error("Error fetching call history:", error);
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMakeCall = async () => {
    if (!callTopic || !callNumber) {
      toast.error("Please enter both topic and number");
      return;
    }

    setIsInCall(true);
    setCallStatus("calling");
    setShowMakeCall(false);

    // Simulate ringing
    setTimeout(() => {
      setCallStatus("connected");
      setCallStartTime(new Date());
    }, 3000);
  };

  const handleEndCall = async () => {
    const finalDuration = Math.floor(callDuration / 60); // Convert to minutes
    
    try {
      await supabase.from("call_history").insert({
        type: "outgoing",
        number: callNumber,
        topic: callTopic,
        duration_minutes: finalDuration,
      });
      
      toast.success("Call ended");
    } catch (error) {
      console.error("Error saving call:", error);
    }

    setIsInCall(false);
    setCallStatus(null);
    setCallDuration(0);
    setCallStartTime(null);
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

  const handleViewTranscript = (call: any) => {
    setSelectedCallTranscript(call);
    setShowTranscriptDialog(true);
  };

  const incomingCalls = callHistory.filter((call) => call.type === "incoming");
  const outgoingCalls = callHistory.filter((call) => call.type === "outgoing");

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
              <p className="text-xl text-green-500 mb-4">Connected</p>
              <p className="text-4xl font-mono font-bold mb-8">{formatCallDuration(callDuration)}</p>
            </>
          )}

          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-20 h-20 shadow-elegant hover:shadow-hover"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-8 w-8" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Phone Calls</h3>
        </div>
        <Button
          onClick={() => setShowMakeCall(!showMakeCall)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Make a Call
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
          <div className="flex gap-2">
            <Button onClick={handleMakeCall} className="flex-1">
              Start Call
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowMakeCall(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Incoming Calls */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PhoneIncoming className="h-5 w-5 text-green-600" />
            <h4 className="font-medium">Incoming Calls</h4>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {incomingCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incoming calls</p>
            ) : (
              incomingCalls.map((call) => (
                <div
                  key={call.id}
                  className={`p-3 border rounded-lg hover:bg-muted/50 transition-all relative ${
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
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                    <Badge variant="secondary">
                      {call.duration_minutes || 0} min
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(call.timestamp), "MMM dd, HH:mm")}
                  </p>
                  {call.topic && (
                    <p className="text-xs mt-1">{call.topic}</p>
                  )}
                </div>
              ))
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
              outgoingCalls.map((call) => (
                <div
                  key={call.id}
                  className={`p-3 border rounded-lg hover:bg-muted/50 transition-all relative ${
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
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                    <Badge variant="secondary">
                      {call.duration_minutes || 0} min
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(call.timestamp), "MMM dd, HH:mm")}
                  </p>
                  {call.topic && (
                    <p className="text-xs mt-1">{call.topic}</p>
                  )}
                </div>
              ))
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
    </Card>
  );
};

export default PhoneCallSection;
