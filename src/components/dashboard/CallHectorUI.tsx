import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';
import Vapi from '@vapi-ai/web';
import { supabase } from '@/integrations/supabase/client';

interface CallHectorUIProps {
  onClose: () => void;
}

const CallHectorUI: React.FC<CallHectorUIProps> = ({ onClose }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const callIdRef = useRef<string | null>(null);

  useEffect(() => {
    startCall();
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && startTimeRef.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const startCall = async () => {
    try {
      startTimeRef.current = Date.now();
      
      // Show connecting UI for 3 seconds
      setTimeout(() => {
        setIsConnecting(false);
        setShowLimitReached(true);
        
        // Show limit reached message for 2 seconds then end call
        setTimeout(async () => {
          toast.error('Limit reached - Connect routing number');
          
          // Record failed call
          const duration = startTimeRef.current 
            ? Math.floor((Date.now() - startTimeRef.current) / 1000) 
            : 0;
          const durationMinutes = duration / 60;
          
          await supabase.from("call_history").insert({
            type: "outgoing",
            number: "DREALHECTOR",
            topic: "Call failed - Limit reached",
            duration_minutes: durationMinutes,
            timestamp: new Date().toISOString(),
            conversation_id: null,
          });
          
          setTimeout(() => {
            onClose();
          }, 1500);
        }, 2000);
      }, 3000);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      onClose();
    }
  };

  const handleEndCall = async () => {
    if (isEnding) return; // Prevent multiple clicks
    
    setIsEnding(true);
    console.log('Ending call...');
    
    try {
      // Calculate call duration
      const duration = startTimeRef.current 
        ? Math.floor((Date.now() - startTimeRef.current) / 1000) 
        : 0;
      const durationMinutes = duration / 60;
      
      console.log('Call duration:', duration, 'seconds');

      // Save call to database
      const { error: callError } = await supabase.from("call_history").insert({
        type: "outgoing",
        number: "DREALHECTOR",
        topic: "Voice call with DREALHECTOR",
        duration_minutes: durationMinutes,
        timestamp: new Date().toISOString(),
        conversation_id: callIdRef.current,
      });

      if (callError) {
        console.error('Error saving call history:', callError);
      } else {
        console.log('Call saved to database');
      }

      // Stop the call
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
      
      setIsConnected(false);
      toast.info('Call ended');
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Error ending call');
    } finally {
      onClose();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl shadow-2xl overflow-hidden border border-gray-800">
          {/* Call Header */}
          <div className="pt-12 pb-8 px-6 text-center">
            <div className="text-gray-400 text-sm mb-2">
              {isConnecting ? 'Connecting...' : showLimitReached ? 'Limit reached - Connect routing number' : 'Call Ended'}
            </div>
            <h2 className="text-3xl font-semibold text-white mb-2">DREALHECTOR</h2>
            <div className="text-lg text-gray-300 font-mono">
              00:00
            </div>
          </div>

          {/* Avatar/Status Circle */}
          <div className="flex justify-center py-8">
            <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center transition-all duration-300 ${
              isSpeaking ? 'scale-110 shadow-2xl shadow-blue-500/50' : 'scale-100'
            }`}>
              <div className={`absolute inset-0 rounded-full animate-pulse ${
                isSpeaking ? 'bg-blue-400/30' : 'bg-transparent'
              }`} />
              <Phone className="w-16 h-16 text-white relative z-10" />
            </div>
          </div>

          {/* Call Status */}
          <div className="text-center py-4 px-6">
            {isSpeaking && (
              <div className="flex items-center justify-center gap-1">
                <div className="w-1 h-4 bg-green-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" />
                <div className="w-1 h-6 bg-green-500 rounded-full animate-[bounce_0.6s_ease-in-out_0.1s_infinite]" />
                <div className="w-1 h-4 bg-green-500 rounded-full animate-[bounce_0.6s_ease-in-out_0.2s_infinite]" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center pb-12 pt-4 px-6">
            <Button
              onClick={handleEndCall}
              disabled={isConnecting || isEnding}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
            >
              <PhoneOff className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallHectorUI;
