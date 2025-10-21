import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const CallPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [customization, setCustomization] = useState<any>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    fetchCustomization();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall]);

  const fetchCustomization = async () => {
    try {
      const { data } = await supabase
        .from("customizations")
        .select("*")
        .limit(1)
        .single();
      setCustomization(data);
    } catch (error) {
      console.error("Error fetching customization:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCall = () => {
    setIsInCall(true);
    setCallDuration(0);
  };

  const handleEndCall = async () => {
    setIsInCall(false);
    // Save call history
    try {
      await supabase.from("call_history").insert({
        type: "incoming",
        number: "demo-call",
        topic: "Voice call",
        duration_minutes: Math.round(callDuration / 60),
      });
    } catch (error) {
      console.error("Error saving call:", error);
    }
    setCallDuration(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="w-32 h-32 rounded-full mx-auto mb-6 bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white shadow-glow">
            {isInCall ? (
              <div className="animate-pulse">
                <Phone className="h-16 w-16 text-white" />
              </div>
            ) : (
              <span className="text-6xl">🤖</span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            {customization?.business_name || "BECCA"}
          </h1>
          
          {isInCall ? (
            <div className="space-y-4">
              <p className="text-white/90 text-xl">Connected</p>
              <p className="text-white text-3xl font-mono">{formatDuration(callDuration)}</p>
            </div>
          ) : (
            <p className="text-white/90 text-lg">
              Ready to talk with {slug || "BECCA"}
            </p>
          )}
        </div>

        {!isInCall ? (
          <Button
            onClick={handleCall}
            size="lg"
            className="w-48 h-48 rounded-full bg-white hover:bg-white/90 text-primary shadow-glow hover:scale-105 transition-transform"
          >
            <Phone className="h-24 w-24" />
          </Button>
        ) : (
          <Button
            onClick={handleEndCall}
            size="lg"
            variant="destructive"
            className="w-48 h-48 rounded-full shadow-glow hover:scale-105 transition-transform"
          >
            <PhoneOff className="h-24 w-24" />
          </Button>
        )}

        {/* Vapi Widget Placeholder */}
        {customization?.vapi_widget_code && (
          <div className="mt-8 text-white/60 text-sm">
            Vapi widget would be embedded here
          </div>
        )}
      </div>
    </div>
  );
};

export default CallPage;