import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Vapi from "@vapi-ai/web";
import { useToast } from "@/hooks/use-toast";

const CallPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [customization, setCustomization] = useState<any>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const vapiPublicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;

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

  const handleCall = async () => {
    if (!vapiPublicKey) {
      toast({
        title: "Configuration Error",
        description: "Vapi public key not configured. Please add VITE_VAPI_PUBLIC_KEY to your environment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Initialize Vapi instance
      if (!vapiRef.current) {
        vapiRef.current = new Vapi(vapiPublicKey);
        
        // Set up event listeners
        vapiRef.current.on("call-start", () => {
          console.log("Call started");
          setIsInCall(true);
          setCallDuration(0);
          setIsLoading(false);
        });

        vapiRef.current.on("call-end", () => {
          console.log("Call ended");
          handleEndCall();
        });

        vapiRef.current.on("error", (error) => {
          console.error("Vapi error:", error);
          toast({
            title: "Call Error",
            description: error?.message || "Failed to connect. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          setIsInCall(false);
        });
      }

      // Get customization config from edge function
      const { data, error } = await supabase.functions.invoke("start-vapi-call");
      
      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to start call configuration");
      }

      if (!data?.assistantId) {
        throw new Error("No assistant ID configured. Please add your Vapi Assistant ID in the dashboard.");
      }

      console.log("Starting call with config:", data);
      
      // Start the call with assistant overrides
      await vapiRef.current.start(data.assistantId, data.assistantOverrides);
      
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start call. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    setIsInCall(false);
    
    // Stop Vapi call
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    
    // Save call history
    try {
      await supabase.from("call_history").insert({
        type: "outgoing",
        number: slug || "web-call",
        topic: "Voice call with BECCA",
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
            disabled={isLoading}
            className="w-64 h-64 rounded-full bg-white hover:bg-white/90 text-primary shadow-glow hover:scale-110 transition-all animate-pulse disabled:opacity-50 disabled:animate-none"
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Phone className="h-32 w-32 animate-pulse" />
                <span className="text-sm">Connecting...</span>
              </div>
            ) : (
              <Phone className="h-32 w-32" />
            )}
          </Button>
        ) : (
          <Button
            onClick={handleEndCall}
            size="lg"
            variant="destructive"
            className="w-64 h-64 rounded-full shadow-glow hover:scale-110 transition-all"
          >
            <PhoneOff className="h-32 w-32" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CallPage;