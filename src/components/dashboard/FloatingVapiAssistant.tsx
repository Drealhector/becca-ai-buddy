import React, { useState, useRef, useEffect } from "react";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";

interface FloatingVapiAssistantProps {
  publicKey?: string;
  assistantId?: string;
  initialPosition?: { x: number; y: number };
  activationTrigger?: number;
}

const FloatingVapiAssistant = ({ 
  publicKey = "cb6d31db-2209-4ffa-ac27-794c02fcd8ec",
  assistantId = "8eb153bb-e605-438c-85e6-bbe3484a64ff",
  initialPosition,
  activationTrigger = 0
}: FloatingVapiAssistantProps = {}) => {
  const defaultPosition = initialPosition || { x: window.innerWidth - 120, y: window.innerHeight - 120 };
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const toggleLockRef = useRef<boolean>(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchEventRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize Vapi with optimized settings
    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    // Set up event listeners with faster response
    vapi.on("call-start", () => {
      console.log("Call started successfully");
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setIsLoading(false);
      setIsActive(true);
      setRetryCount(0);
      toggleLockRef.current = false; // Unlock after successful start
      toast.success("Assistant activated");
    });

    vapi.on("call-end", () => {
      console.log("Call ended");
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setIsActive(false);
      setIsSpeaking(false);
      setIsLoading(false);
      setRetryCount(0);
      toggleLockRef.current = false;
    });

    vapi.on("speech-start", () => {
      setIsSpeaking(true);
    });

    vapi.on("speech-end", () => {
      setIsSpeaking(false);
    });

    vapi.on("volume-level", (volume: number) => {
      // Visual feedback for audio activity
      if (volume > 0.1) {
        setIsSpeaking(true);
      }
    });

    vapi.on("error", (error: any) => {
      console.error("Vapi error:", error);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setIsActive(false);
      setIsLoading(false);
      
      // Check for specific error types
      const errorMessage = error?.message || error?.toString() || '';
      if (errorMessage.includes('microphone') || errorMessage.includes('permission')) {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error("Connection failed. Please try again.");
      }
    });

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  // Activation trigger effect
  useEffect(() => {
    if (activationTrigger > 0 && vapiRef.current && !isLoading) {
      // If already active, stop first then restart
      if (isActive) {
        vapiRef.current.stop();
        setTimeout(() => handleClick(), 300);
      } else {
        handleClick();
      }
    }
  }, [activationTrigger]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore mouse events if touch just happened
    if (touchEventRef.current) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    // Mark that touch event occurred to prevent mouse events
    touchEventRef.current = true;
    setTimeout(() => {
      touchEventRef.current = false;
    }, 500);
    
    const touch = e.touches[0];
    setIsDragging(true);
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const newX = Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.startPosX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.startPosY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !dragRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - dragRef.current.startX;
    const deltaY = touch.clientY - dragRef.current.startY;

    const newX = Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.startPosX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.startPosY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = (e: MouseEvent) => {
    // Ignore mouse events if touch just happened
    if (touchEventRef.current) return;
    if (!isDragging) return;
    
    const deltaX = Math.abs(e.clientX - (dragRef.current?.startX || 0));
    const deltaY = Math.abs(e.clientY - (dragRef.current?.startY || 0));
    
    // If barely moved, treat as click
    if (deltaX < 10 && deltaY < 10) {
      handleClick();
    }
    
    setIsDragging(false);
    dragRef.current = null;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - (dragRef.current?.startX || 0));
    const deltaY = Math.abs(touch.clientY - (dragRef.current?.startY || 0));
    
    // If barely moved, treat as click
    if (deltaX < 10 && deltaY < 10) {
      handleClick();
    }
    
    setIsDragging(false);
    dragRef.current = null;
  };

  const handleClick = async () => {
    if (!vapiRef.current || toggleLockRef.current) return;

    // Lock to prevent rapid toggling
    toggleLockRef.current = true;

    try {
      // If active OR loading, stop immediately
      if (isActive || isLoading) {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        vapiRef.current.stop();
        setIsActive(false);
        setIsLoading(false);
        setIsSpeaking(false);
        toast.info("Assistant stopped");
      } else {
        // Check microphone permissions first with proper cleanup
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Immediately stop the test stream
          stream.getTracks().forEach(track => track.stop());
        } catch (permError) {
          console.error("Microphone permission error:", permError);
          toast.error("Microphone access required. Please allow microphone permissions in your browser settings.");
          toggleLockRef.current = false;
          return;
        }

        setIsLoading(true);
        
        // Set connection timeout (30 seconds for better reliability)
        connectionTimeoutRef.current = setTimeout(() => {
          if (isLoading && !isActive) {
            console.log('Connection timeout');
            
            if (vapiRef.current) {
              vapiRef.current.stop();
            }
            
            // Retry logic with exponential backoff
            if (retryCount < 3) {
              const newRetryCount = retryCount + 1;
              setRetryCount(newRetryCount);
              
              // Exponential backoff: 2s, 4s, 8s
              const retryDelay = Math.pow(2, newRetryCount) * 1000;
              
              toast.error(`Connection timeout. Retrying in ${retryDelay/1000}s... (${newRetryCount}/3)`);
              
              setTimeout(() => {
                setIsLoading(false);
                toggleLockRef.current = false;
                handleClick();
              }, retryDelay);
            } else {
              setIsLoading(false);
              setIsActive(false);
              setRetryCount(0);
              toggleLockRef.current = false;
              toast.error("Unable to connect after multiple attempts. Please check your internet connection and try again later.");
            }
          }
        }, 30000);

        // Start the call
        await vapiRef.current.start(assistantId);
      }
    } catch (error) {
      console.error("Failed to toggle assistant:", error);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setIsLoading(false);
      setIsActive(false);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Retry logic for network errors with exponential backoff
      if ((errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) && retryCount < 3) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        // Exponential backoff: 2s, 4s, 8s
        const retryDelay = Math.pow(2, newRetryCount) * 1000;
        
        toast.error(`Connection failed. Retrying in ${retryDelay/1000}s... (${newRetryCount}/3)`);
        
        setTimeout(() => {
          toggleLockRef.current = false;
          handleClick();
        }, retryDelay);
      } else {
        toast.error("Failed to connect. Please try again in a moment.");
        setRetryCount(0);
        toggleLockRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging]);

  return (
    <div
      ref={buttonRef}
      className="fixed z-50 cursor-grab active:cursor-grabbing animate-float"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '80px',
        height: '80px',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="relative w-full h-full">
        {/* Outer glow rings */}
        <div className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isLoading ? 'animate-[spin_1s_linear_infinite]' : isActive ? 'animate-pulse' : ''
        }`}>
          <div className={`absolute inset-0 rounded-full blur-xl ${
            isLoading ? 'bg-cyan-300/40 animate-[ping_0.8s_ease-in-out_infinite]' : 'bg-cyan-500/20 animate-[ping_2s_ease-in-out_infinite]'
          }`} />
          <div className={`absolute inset-0 rounded-full blur-lg ${
            isLoading ? 'bg-cyan-400/50 animate-[ping_1s_ease-in-out_infinite]' : 'bg-cyan-400/30 animate-[ping_2.5s_ease-in-out_infinite]'
          }`} style={{ animationDelay: isLoading ? '0.2s' : '0.5s' }} />
        </div>

        {/* Main sphere with B */}
        <div className={`relative w-full h-full rounded-full overflow-hidden transition-all duration-500 ${
          isLoading ? 'scale-105' : isActive ? 'scale-110' : 'scale-100'
        }`}
        style={{
          /* Deep outer shadow + inner rim lighting for a glass-sphere look */
          boxShadow: isActive
            ? '0 0 0 1.5px rgba(93,213,237,0.55), 0 8px 32px rgba(37,99,235,0.55), 0 2px 8px rgba(0,0,0,0.7), inset 0 2px 8px rgba(255,255,255,0.55), inset 0 -10px 24px rgba(30,80,180,0.35)'
            : isLoading
            ? '0 0 0 1.5px rgba(96,165,250,0.7), 0 8px 32px rgba(96,165,250,0.6), 0 2px 8px rgba(0,0,0,0.7), inset 0 2px 8px rgba(255,255,255,0.55), inset 0 -10px 24px rgba(30,80,180,0.35)'
            : '0 0 0 1px rgba(93,213,237,0.25), 0 6px 24px rgba(30,60,160,0.5), 0 2px 6px rgba(0,0,0,0.7), inset 0 2px 6px rgba(255,255,255,0.45), inset 0 -8px 20px rgba(20,50,140,0.3)',
        }}>
          {/* === BASE: deep ocean-blue core === */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle at 38% 35%, #dbeafe 0%, #67e8f9 20%, #06b6d4 45%, #0e4f5c 72%, #0a2a30 100%)'
          }} />

          {/* === MILK BLOB 1 — large dominant mass, slow rolling slosh === */}
          <div className="milk-blob-1" style={{
            position: 'absolute',
            width: '80%', height: '75%',
            top: '10%', left: '5%',
            background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(255,254,250,0.98) 0%, rgba(255,251,240,0.85) 45%, rgba(253,246,225,0.50) 72%, transparent 100%)',
            filter: 'blur(4px)',
            borderRadius: '60% 40% 55% 45% / 50% 60% 40% 55%',
          }} />

          {/* === MILK BLOB 2 — secondary mass, offset phase, rolling behind === */}
          <div className="milk-blob-2" style={{
            position: 'absolute',
            width: '65%', height: '60%',
            top: '20%', left: '18%',
            background: 'radial-gradient(ellipse 55% 50% at 45% 52%, rgba(255,253,248,0.92) 0%, rgba(254,249,235,0.70) 50%, rgba(252,243,215,0.35) 75%, transparent 100%)',
            filter: 'blur(5px)',
            borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%',
          }} />

          {/* === MILK BLOB 3 — small wispy trail, faster === */}
          <div className="milk-blob-3" style={{
            position: 'absolute',
            width: '50%', height: '45%',
            top: '30%', left: '25%',
            background: 'radial-gradient(ellipse 50% 45% at 52% 48%, rgba(255,252,245,0.88) 0%, rgba(254,247,228,0.60) 55%, transparent 85%)',
            filter: 'blur(6px)',
            borderRadius: '55% 45% 50% 50% / 40% 60% 45% 55%',
          }} />

          {/* === MILK BLOB 4 — thin surface film wrapping the top === */}
          <div className="milk-blob-4" style={{
            position: 'absolute',
            width: '90%', height: '35%',
            top: '0%', left: '5%',
            background: 'radial-gradient(ellipse 70% 80% at 50% 20%, rgba(255,255,255,0.55) 0%, rgba(255,252,240,0.28) 55%, transparent 85%)',
            filter: 'blur(5px)',
            borderRadius: '50% 50% 60% 40% / 70% 70% 30% 30%',
          }} />

          {/* === MILK BLOB 5 — bottom sloshing tail === */}
          <div className="milk-blob-5" style={{
            position: 'absolute',
            width: '70%', height: '55%',
            top: '35%', left: '10%',
            background: 'radial-gradient(ellipse 55% 50% at 48% 60%, rgba(255,251,238,0.75) 0%, rgba(253,244,218,0.45) 55%, transparent 85%)',
            filter: 'blur(7px)',
            borderRadius: '40% 60% 55% 45% / 60% 40% 55% 45%',
          }} />

          {/* === DEPTH SHADOW — bottom darkening for spherical feel === */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle at 50% 110%, rgba(10,20,80,0.65) 0%, transparent 65%)',
            mixBlendMode: 'multiply',
          }} />

          {/* === GLASS RIM — thin bright ring on edge === */}
          <div className="absolute inset-0 rounded-full" style={{
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.18)',
            background: 'transparent',
          }} />

          {/* === PRIMARY SPECULAR HIGHLIGHT — large soft shine top-left === */}
          <div className="absolute" style={{
            width: '55%', height: '40%', top: '6%', left: '8%',
            background: 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.50) 45%, transparent 75%)',
            filter: 'blur(2px)',
            borderRadius: '50%',
          }} />

          {/* === SECONDARY SPECULAR — small sharp pinpoint === */}
          <div className="absolute" style={{
            width: '18%', height: '14%', top: '10%', left: '16%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.60) 50%, transparent 80%)',
            borderRadius: '50%',
          }} />

          {/* === B Letter — embossed, glowing === */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`transition-all duration-300 ${isLoading ? 'animate-pulse' : ''}`}
              style={{
                fontSize: '2.4rem',
                fontWeight: 900,
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                color: '#ffffff',
                WebkitTextStroke: isLoading ? '1.5px #60a5fa' : isActive ? '1.5px #2563eb' : '1.5px #1e3a8a',
                textShadow: isActive
                  ? '-2px -2px 0 #5dd5ed, -4px -4px 0 #5dd5ed, 0 6px 18px rgba(0,0,0,0.6), 0 0 28px rgba(93,213,237,0.9)'
                  : isLoading
                  ? '-2px -2px 0 #60a5fa, -4px -4px 0 #93c5fd, 0 6px 18px rgba(0,0,0,0.6), 0 0 28px rgba(96,165,250,0.9)'
                  : '-2px -2px 0 #5dd5ed, -4px -4px 0 #5dd5ed, 0 5px 14px rgba(0,0,0,0.55)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              }}
            >B</span>
          </div>

          {/* === SPEAKING pulse overlay === */}
          {isSpeaking && (
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-cyan-400/25 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
              <div className="absolute inset-0 bg-cyan-500/15 rounded-full animate-[ping_1s_ease-out_infinite]" />
            </div>
          )}

          {/* === LOADING border spin === */}
          {isLoading && (
            <div className="absolute inset-0 rounded-full border-2 border-cyan-300/60 animate-[spin_0.9s_linear_infinite]" />
          )}
          {isActive && !isLoading && (
            <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-[spin_4s_linear_infinite]" />
          )}
        </div>

        {/* Digital brain particles when loading/active */}
        {(isLoading || isActive) && (
          <>
            <div className={`absolute top-0 left-1/2 w-1 h-1 rounded-full animate-[ping_1.5s_ease-out_infinite] ${
              isLoading ? 'bg-cyan-300 w-1.5 h-1.5' : 'bg-cyan-400'
            }`} style={{ animationDelay: '0s' }} />
            <div className={`absolute top-1/4 right-0 w-1 h-1 rounded-full animate-[ping_1.5s_ease-out_infinite] ${
              isLoading ? 'bg-cyan-200 w-1.5 h-1.5' : 'bg-cyan-300'
            }`} style={{ animationDelay: '0.3s' }} />
            <div className={`absolute bottom-1/4 left-0 w-1 h-1 rounded-full animate-[ping_1.5s_ease-out_infinite] ${
              isLoading ? 'bg-cyan-400 w-1.5 h-1.5' : 'bg-cyan-500'
            }`} style={{ animationDelay: '0.6s' }} />
            <div className={`absolute bottom-0 right-1/3 w-1 h-1 rounded-full animate-[ping_1.5s_ease-out_infinite] ${
              isLoading ? 'bg-cyan-300 w-1.5 h-1.5' : 'bg-cyan-400'
            }`} style={{ animationDelay: '0.9s' }} />
          </>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          33%      { transform: translateY(-7px) rotate(1deg); }
          66%      { transform: translateY(-4px) rotate(-1deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }

        /* =====================================================
           MILK BLOBS — organic slosh inside a glass sphere
           Each blob: translates along a rolling elliptical path
           + morphs border-radius to simulate fluid deformation
           + opacity breathes for depth
           ===================================================== */

        @keyframes milk1 {
          0%   { transform: translate(0%,   0%)   rotate(0deg);   border-radius: 60% 40% 55% 45% / 50% 60% 40% 55%; opacity: 0.90; }
          12%  { transform: translate(12%, -8%)   rotate(18deg);  border-radius: 50% 50% 45% 55% / 60% 40% 55% 45%; opacity: 0.82; }
          25%  { transform: translate(18%, 5%)    rotate(35deg);  border-radius: 40% 60% 55% 45% / 55% 45% 50% 50%; opacity: 0.88; }
          37%  { transform: translate(8%,  18%)   rotate(50deg);  border-radius: 55% 45% 42% 58% / 48% 52% 58% 42%; opacity: 0.78; }
          50%  { transform: translate(-8%, 12%)   rotate(70deg);  border-radius: 45% 55% 60% 40% / 52% 48% 42% 58%; opacity: 0.92; }
          62%  { transform: translate(-16%, 0%)   rotate(85deg);  border-radius: 58% 42% 48% 52% / 40% 60% 52% 48%; opacity: 0.80; }
          75%  { transform: translate(-10%,-12%)  rotate(100deg); border-radius: 50% 50% 55% 45% / 55% 45% 50% 50%; opacity: 0.86; }
          88%  { transform: translate(4%,  -16%)  rotate(120deg); border-radius: 42% 58% 45% 55% / 58% 42% 55% 45%; opacity: 0.84; }
          100% { transform: translate(0%,   0%)   rotate(135deg); border-radius: 60% 40% 55% 45% / 50% 60% 40% 55%; opacity: 0.90; }
        }
        .milk-blob-1 { animation: milk1 3.5s cubic-bezier(0.45,0.05,0.55,0.95) infinite; }

        @keyframes milk2 {
          0%   { transform: translate(0%,   0%)   rotate(0deg);   border-radius: 45% 55% 40% 60% / 55% 45% 60% 40%; opacity: 0.78; }
          15%  { transform: translate(-14%, 6%)   rotate(-22deg); border-radius: 55% 45% 50% 50% / 48% 52% 45% 55%; opacity: 0.88; }
          30%  { transform: translate(-8%, 18%)   rotate(-40deg); border-radius: 48% 52% 58% 42% / 60% 40% 48% 52%; opacity: 0.72; }
          45%  { transform: translate(10%, 14%)   rotate(-58deg); border-radius: 60% 40% 45% 55% / 42% 58% 55% 45%; opacity: 0.85; }
          60%  { transform: translate(16%, -4%)   rotate(-75deg); border-radius: 42% 58% 52% 48% / 55% 45% 42% 58%; opacity: 0.75; }
          75%  { transform: translate(6%, -18%)   rotate(-95deg); border-radius: 52% 48% 60% 40% / 45% 55% 52% 48%; opacity: 0.88; }
          90%  { transform: translate(-8%, -12%)  rotate(-115deg);border-radius: 50% 50% 44% 56% / 58% 42% 50% 50%; opacity: 0.80; }
          100% { transform: translate(0%,   0%)   rotate(-130deg);border-radius: 45% 55% 40% 60% / 55% 45% 60% 40%; opacity: 0.78; }
        }
        .milk-blob-2 { animation: milk2 4.5s cubic-bezier(0.45,0.05,0.55,0.95) infinite; }

        @keyframes milk3 {
          0%   { transform: translate(0%,   0%)   rotate(0deg);   border-radius: 55% 45% 50% 50% / 40% 60% 45% 55%; opacity: 0.70; }
          20%  { transform: translate(10%, 14%)   rotate(28deg);  border-radius: 42% 58% 55% 45% / 52% 48% 58% 42%; opacity: 0.80; }
          40%  { transform: translate(-6%, 20%)   rotate(55deg);  border-radius: 60% 40% 44% 56% / 48% 52% 42% 58%; opacity: 0.65; }
          60%  { transform: translate(-18%, 4%)   rotate(82deg);  border-radius: 48% 52% 58% 42% / 58% 42% 52% 48%; opacity: 0.78; }
          80%  { transform: translate(-6%, -16%)  rotate(108deg); border-radius: 52% 48% 45% 55% / 44% 56% 58% 42%; opacity: 0.72; }
          100% { transform: translate(0%,   0%)   rotate(135deg); border-radius: 55% 45% 50% 50% / 40% 60% 45% 55%; opacity: 0.70; }
        }
        .milk-blob-3 { animation: milk3 3s cubic-bezier(0.45,0.05,0.55,0.95) infinite; }

        @keyframes milk4 {
          0%   { transform: translate(0%,0%)    scaleX(1)    scaleY(1);    opacity: 0.50; }
          25%  { transform: translate(8%,-5%)   scaleX(1.15) scaleY(0.88); opacity: 0.42; }
          50%  { transform: translate(-5%,8%)   scaleX(0.90) scaleY(1.12); opacity: 0.55; }
          75%  { transform: translate(-10%,-4%) scaleX(1.10) scaleY(0.92); opacity: 0.44; }
          100% { transform: translate(0%,0%)    scaleX(1)    scaleY(1);    opacity: 0.50; }
        }
        .milk-blob-4 { animation: milk4 5s ease-in-out infinite; }

        @keyframes milk5 {
          0%   { transform: translate(0%,  0%)  rotate(0deg);   border-radius: 40% 60% 55% 45% / 60% 40% 55% 45%; opacity: 0.65; }
          33%  { transform: translate(14%, 10%) rotate(-45deg); border-radius: 55% 45% 42% 58% / 48% 52% 60% 40%; opacity: 0.75; }
          66%  { transform: translate(-10%,16%) rotate(-90deg); border-radius: 48% 52% 58% 42% / 55% 45% 40% 60%; opacity: 0.60; }
          100% { transform: translate(0%,  0%)  rotate(-135deg);border-radius: 40% 60% 55% 45% / 60% 40% 55% 45%; opacity: 0.65; }
        }
        .milk-blob-5 { animation: milk5 3.8s cubic-bezier(0.45,0.05,0.55,0.95) infinite; }
      `}</style>
    </div>
  );
};

export default FloatingVapiAssistant;
