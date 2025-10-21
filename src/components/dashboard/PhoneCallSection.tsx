import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const PhoneCallSection = () => {
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [showMakeCall, setShowMakeCall] = useState(false);
  const [callTopic, setCallTopic] = useState("");
  const [callNumber, setCallNumber] = useState("");

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

  const handleMakeCall = async () => {
    if (!callTopic || !callNumber) {
      toast.error("Please enter both topic and number");
      return;
    }

    toast.success(`Call queued with topic: ${callTopic}`);
    
    // Show notification
    setTimeout(() => {
      toast.info(`BECCA Assistant calling ${callNumber}`, {
        description: "Ringing...",
        duration: 4000,
      });
      
      setTimeout(() => {
        toast.success("Connected", {
          description: "Call in progress...",
        });
      }, 4000);
    }, 1000);

    // Save to history (mock)
    try {
      await supabase.from("call_history").insert({
        type: "outgoing",
        number: callNumber,
        topic: callTopic,
        duration_minutes: 0,
      });
    } catch (error) {
      console.error("Error saving call:", error);
    }

    setShowMakeCall(false);
    setCallTopic("");
    setCallNumber("");
  };

  const incomingCalls = callHistory.filter((call) => call.type === "incoming");
  const outgoingCalls = callHistory.filter((call) => call.type === "outgoing");

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Phone Calls</h3>
        </div>
        <Button
          onClick={() => setShowMakeCall(!showMakeCall)}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
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
                  className="p-3 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{call.number}</span>
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
                  className="p-3 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{call.number}</span>
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
    </Card>
  );
};

export default PhoneCallSection;