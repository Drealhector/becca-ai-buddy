import React, { useState, useRef, useEffect, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { toast } from "sonner";
import beccaBLogo from "@/assets/becca-b-new-logo.png";

interface FloatingAssistantProps {
  agentId?: string;
  initialPosition?: { x: number; y: number };
  activationTrigger?: number;
}

const BALL_SIZE = 96;
const HIT_PADDING = 12;
const CONTAINER_SIZE = BALL_SIZE + HIT_PADDING * 2;

const FloatingAssistant = ({
  agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "",
  initialPosition,
  activationTrigger = 0
}: FloatingAssistantProps = {}) => {
  const defaultPosition = initialPosition || { x: window.innerWidth - CONTAINER_SIZE - 20, y: window.innerHeight - CONTAINER_SIZE - 20 };
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [clickBurst, setClickBurst] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const toggleLockRef = useRef<boolean>(false);
  const touchEventRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const hasHadCallRef = useRef<boolean>(false);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("BECCA assistant: Connected");
      setIsLoading(false);
      setIsActive(true);
      toggleLockRef.current = false;
      toast.success("BECCA activated");
    },
    onDisconnect: () => {
      console.log("BECCA assistant: Disconnected");
      setIsActive(false);
      setIsSpeaking(false);
      setIsLoading(false);
      toggleLockRef.current = false;
    },
    onModeChange: ({ mode }) => {
      setIsSpeaking(mode === "speaking");
    },
    onError: (error) => {
      console.error("BECCA assistant error:", error);
      setIsActive(false);
      setIsLoading(false);
      toggleLockRef.current = false;
      toast.error("Connection failed. Please try again.");
    },
  });

  // "Hey Becca" wake word detection using Web Speech API
  useEffect(() => {
    if (!agentId) return; // No wake word for decorative mode

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return; // Browser doesn't support speech recognition

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (transcript.includes('hey becca') || transcript.includes('hey beca') || transcript.includes('heybekka')) {
          console.log('Wake word detected: "Hey Becca"');
          recognition.stop();
          setIsListening(false);
          // Auto-activate the assistant
          if (!isActive && !isLoading) {
            handleClick();
          }
          break;
        }
      }
    };

    recognition.onend = () => {
      // Restart listening if not in active call and still mounted
      if (!isActive && recognitionRef.current) {
        try {
          recognition.start();
          setIsListening(true);
        } catch (e) {
          // Already started or page hidden
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-available' || event.error === 'aborted') {
        // Stop permanently on permission denied or service unavailable
        recognitionRef.current = null;
        setIsListening(false);
      }
      // For transient errors (network, audio-capture), onend will auto-restart
    };

    // Don't auto-start — wake word activates after user's first call ends
    // (mic permission will already be granted by then)
    console.log('Wake word detection ready: will activate after first call');

    return () => {
      recognitionRef.current = null;
      try { recognition.stop(); } catch (e) {}
      setIsListening(false);
    };
  }, [agentId]);

  // Stop/restart wake word when call state changes
  useEffect(() => {
    if (!recognitionRef.current) return;
    if (isActive) {
      hasHadCallRef.current = true;
      // Stop listening during active call
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    } else if (hasHadCallRef.current) {
      // Only start listening after user has had at least one call (mic permission granted)
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Wake word detection active: say "Hey Becca" to activate');
      } catch (e) {}
    }
  }, [isActive]);

  // Activation trigger effect
  useEffect(() => {
    if (activationTrigger > 0 && agentId && !isLoading) {
      if (isActive) {
        conversation.endSession();
        setTimeout(() => handleClick(), 300);
      } else {
        handleClick();
      }
    }
  }, [activationTrigger]);

  // --- DRAG HANDLERS ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (touchEventRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: position.x, startPosY: position.y };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    touchEventRef.current = true;
    setTimeout(() => { touchEventRef.current = false; }, 500);
    const touch = e.touches[0];
    setIsDragging(true);
    dragRef.current = { startX: touch.clientX, startY: touch.clientY, startPosX: position.x, startPosY: position.y };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const newX = Math.max(0, Math.min(window.innerWidth - CONTAINER_SIZE, dragRef.current.startPosX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - CONTAINER_SIZE, dragRef.current.startPosY + deltaY));
    setPosition({ x: newX, y: newY });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !dragRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragRef.current.startX;
    const deltaY = touch.clientY - dragRef.current.startY;
    const newX = Math.max(0, Math.min(window.innerWidth - CONTAINER_SIZE, dragRef.current.startPosX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - CONTAINER_SIZE, dragRef.current.startPosY + deltaY));
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (touchEventRef.current) return;
    if (!isDragging) return;
    const deltaX = Math.abs(e.clientX - (dragRef.current?.startX || 0));
    const deltaY = Math.abs(e.clientY - (dragRef.current?.startY || 0));
    if (deltaX < 5 && deltaY < 5) handleClick();
    setIsDragging(false);
    dragRef.current = null;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - (dragRef.current?.startX || 0));
    const deltaY = Math.abs(touch.clientY - (dragRef.current?.startY || 0));
    if (deltaX < 5 && deltaY < 5) handleClick();
    setIsDragging(false);
    dragRef.current = null;
  };

  const handleClick = useCallback(async () => {
    if (toggleLockRef.current) return;

    if (!agentId) return; // Decorative mode — no agent to connect

    // Trigger click burst animation
    setClickBurst(true);
    setTimeout(() => setClickBurst(false), 700);

    toggleLockRef.current = true;

    try {
      if (isActive || conversation.status === "connected") {
        await conversation.endSession();
        setIsActive(false);
        setIsLoading(false);
        setIsSpeaking(false);
        toggleLockRef.current = false;
        toast.info("BECCA stopped");
        return;
      }

      setIsLoading(true);

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start ElevenLabs conversation
      await conversation.startSession({ agentId } as any);
    } catch (error: any) {
      console.error("Failed to start BECCA:", error);
      setIsLoading(false);
      setIsActive(false);
      toggleLockRef.current = false;

      if (error?.name === "NotAllowedError" || error?.message?.includes("permission")) {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else {
        toast.error("Failed to connect. Please try again.");
      }
    }
  }, [agentId, isActive, conversation]);

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

  // Fluid speed based on state
  const blobSpeed = (idle: number) => {
    if (isSpeaking) return `${idle * 0.3}s`;
    if (isActive || isLoading) return `${idle * 0.45}s`;
    return `${idle}s`;
  };

  const blobEasing = isSpeaking
    ? 'cubic-bezier(0.2, 0.8, 0.3, 1.0)'
    : 'cubic-bezier(0.45,0.05,0.55,0.95)';

  return (
    <div
      ref={buttonRef}
      className="fixed z-50 cursor-grab active:cursor-grabbing"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${CONTAINER_SIZE}px`,
        height: `${CONTAINER_SIZE}px`,
        padding: `${HIT_PADDING}px`,
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Inner visual container — the actual ball */}
      <div className={`relative w-full h-full animate-float transition-transform duration-150 ${isDragging ? 'scale-95' : ''}`}>
        {/* Outer glow rings */}
        <div className={`absolute -inset-3 rounded-full transition-all duration-700 ${
          isLoading ? 'animate-[spin_1s_linear_infinite]' : isActive ? 'animate-pulse' : ''
        }`}>
          <div className={`absolute inset-0 rounded-full blur-xl ${
            isLoading ? 'bg-cyan-300/50 animate-[ping_0.8s_ease-in-out_infinite]' : 'bg-cyan-500/20 animate-[ping_2s_ease-in-out_infinite]'
          }`} />
          <div className={`absolute inset-0 rounded-full blur-lg ${
            isLoading ? 'bg-cyan-400/60 animate-[ping_1s_ease-in-out_infinite]' : 'bg-cyan-400/30 animate-[ping_2.5s_ease-in-out_infinite]'
          }`} style={{ animationDelay: isLoading ? '0.2s' : '0.5s' }} />
        </div>

        {/* Main sphere */}
        <div className={`relative w-full h-full rounded-full overflow-hidden transition-all duration-500 ${
          isLoading ? 'scale-105' : isActive ? 'scale-110' : 'scale-100'
        }`}
        style={{
          boxShadow: isActive
            ? '0 0 0 2px rgba(93,213,237,0.6), 0 12px 44px rgba(37,99,235,0.65), 0 4px 14px rgba(0,0,0,0.85), inset 0 3px 12px rgba(255,255,255,0.6), inset 0 -14px 30px rgba(20,60,150,0.45), 0 0 24px rgba(93,213,237,0.35)'
            : isLoading
            ? '0 0 0 2px rgba(96,165,250,0.75), 0 12px 40px rgba(96,165,250,0.65), 0 4px 12px rgba(0,0,0,0.8), inset 0 3px 10px rgba(255,255,255,0.6), inset 0 -12px 28px rgba(30,80,180,0.4), 0 0 20px rgba(96,165,250,0.3)'
            : '0 0 0 1.5px rgba(93,213,237,0.3), 0 8px 30px rgba(30,60,160,0.55), 0 3px 10px rgba(0,0,0,0.8), inset 0 3px 8px rgba(255,255,255,0.5), inset 0 -10px 24px rgba(20,50,140,0.35)',
        }}>
          {/* === BASE: deep cyan core === */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle at 38% 35%, #a5f3fc 0%, #22d3ee 10%, #06b6d4 25%, #0891b2 40%, #155e75 55%, #0c4a6e 70%, #082f49 85%, #051e2f 100%)'
          }} />

          {/* === BRAIN FLUID 1 — large cortex mass === */}
          <div className="milk-blob-1" style={{
            position: 'absolute', width: '82%', height: '78%', top: '8%', left: '4%',
            background: 'radial-gradient(ellipse 62% 58% at 48% 48%, rgba(210,180,160,0.95) 0%, rgba(195,165,140,0.80) 25%, rgba(180,148,120,0.55) 50%, rgba(160,128,100,0.25) 75%, transparent 100%)',
            filter: 'blur(3px)',
            borderRadius: '60% 40% 55% 45% / 50% 60% 40% 55%',
            animationDuration: blobSpeed(3.5),
            animationTimingFunction: blobEasing,
          }} />

          {/* === BRAIN FLUID 2 — secondary lobe === */}
          <div className="milk-blob-2" style={{
            position: 'absolute', width: '65%', height: '62%', top: '18%', left: '16%',
            background: 'radial-gradient(ellipse 55% 50% at 45% 52%, rgba(225,200,178,0.90) 0%, rgba(205,178,155,0.65) 35%, rgba(185,155,130,0.35) 65%, transparent 100%)',
            filter: 'blur(4px)',
            borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%',
            animationDuration: blobSpeed(4.5),
            animationTimingFunction: blobEasing,
          }} />

          {/* === BRAIN FLUID 3 — central tissue, faster === */}
          <div className="milk-blob-3" style={{
            position: 'absolute', width: '52%', height: '48%', top: '26%', left: '24%',
            background: 'radial-gradient(ellipse 50% 46% at 52% 48%, rgba(235,215,195,0.88) 0%, rgba(215,190,168,0.60) 40%, rgba(190,165,140,0.28) 72%, transparent 100%)',
            filter: 'blur(4px)',
            borderRadius: '55% 45% 50% 50% / 40% 60% 45% 55%',
            animationDuration: blobSpeed(3.0),
            animationTimingFunction: blobEasing,
          }} />

          {/* === BRAIN FLUID 4 — surface wrinkle film === */}
          <div className="milk-blob-4" style={{
            position: 'absolute', width: '88%', height: '35%', top: '2%', left: '6%',
            background: 'radial-gradient(ellipse 70% 78% at 50% 22%, rgba(220,195,172,0.50) 0%, rgba(200,175,150,0.25) 50%, transparent 85%)',
            filter: 'blur(4px)',
            borderRadius: '50% 50% 60% 40% / 70% 70% 30% 30%',
            animationDuration: blobSpeed(5.0),
            animationTimingFunction: 'ease-in-out',
          }} />

          {/* === BRAIN FLUID 5 — deep sloshing mass === */}
          <div className="milk-blob-5" style={{
            position: 'absolute', width: '72%', height: '55%', top: '35%', left: '10%',
            background: 'radial-gradient(ellipse 55% 50% at 48% 58%, rgba(200,175,152,0.72) 0%, rgba(180,155,132,0.42) 48%, transparent 85%)',
            filter: 'blur(5px)',
            borderRadius: '40% 60% 55% 45% / 60% 40% 55% 45%',
            animationDuration: blobSpeed(3.8),
            animationTimingFunction: blobEasing,
          }} />

          {/* === BRAIN FLUID 6 — bright cortex ridge === */}
          <div className="milk-blob-3" style={{
            position: 'absolute', width: '42%', height: '38%', top: '14%', left: '32%',
            background: 'radial-gradient(ellipse 48% 42% at 50% 45%, rgba(240,225,210,0.65) 0%, rgba(225,205,185,0.35) 50%, transparent 85%)',
            filter: 'blur(3px)',
            borderRadius: '50% 50% 45% 55% / 45% 55% 50% 50%',
            animationDuration: blobSpeed(2.5),
            animationTimingFunction: blobEasing,
          }} />

          {/* === BRAIN FLUID 7 — sulcus fold shadow === */}
          <div className="milk-blob-2" style={{
            position: 'absolute', width: '58%', height: '32%', top: '42%', left: '20%',
            background: 'radial-gradient(ellipse 52% 46% at 50% 55%, rgba(145,115,90,0.40) 0%, rgba(125,98,75,0.20) 50%, transparent 85%)',
            filter: 'blur(5px)',
            borderRadius: '48% 52% 55% 45% / 52% 48% 45% 55%',
            animationDuration: blobSpeed(5.2),
            animationTimingFunction: blobEasing,
            mixBlendMode: 'multiply' as any,
          }} />

          {/* === DEPTH SHADOW — enhanced 3D === */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle at 50% 120%, rgba(10,15,50,0.8) 0%, rgba(15,20,60,0.4) 35%, transparent 60%)',
            mixBlendMode: 'multiply',
          }} />

          {/* === RIM LIGHT — bottom catch light for 3D depth === */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(ellipse 80% 15% at 50% 92%, rgba(103,232,249,0.15) 0%, transparent 100%)',
          }} />

          {/* === GLASS RIM — double edge for realism === */}
          <div className="absolute inset-0 rounded-full" style={{
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.15), inset 0 0 0 3px rgba(0,230,255,0.05)',
            background: 'transparent',
          }} />

          {/* === GLASS REFRACTION / CHROMATIC EDGE === */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'conic-gradient(from 200deg, transparent 0%, rgba(147,197,253,0.08) 20%, transparent 40%, rgba(200,170,190,0.06) 60%, transparent 80%, rgba(103,232,249,0.06) 90%, transparent 100%)',
            mixBlendMode: 'overlay',
          }} />

          {/* === ENVIRONMENT REFLECTION — subtle === */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'linear-gradient(135deg, transparent 40%, rgba(103,232,249,0.04) 50%, transparent 60%)',
          }} />

          {/* === PRIMARY SPECULAR HIGHLIGHT === */}
          <div className="absolute" style={{
            width: '55%', height: '38%', top: '5%', left: '8%',
            background: 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.50) 35%, rgba(255,255,255,0.15) 55%, transparent 72%)',
            filter: 'blur(2px)',
            borderRadius: '50%',
          }} />

          {/* === SECONDARY SPECULAR — sharp pinpoint === */}
          <div className="absolute" style={{
            width: '16%', height: '12%', top: '10%', left: '17%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.70) 40%, transparent 80%)',
            borderRadius: '50%',
          }} />

          {/* === TERTIARY CATCH LIGHT — bottom right (new) === */}
          <div className="absolute" style={{
            width: '12%', height: '8%', bottom: '18%', right: '15%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 80%)',
            filter: 'blur(1px)',
            borderRadius: '50%',
          }} />

          {/* === B LOGO — embossed circuit === */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={beccaBLogo}
              alt="B"
              draggable={false}
              className={`transition-all duration-300 select-none ${
                isLoading ? 'circuit-pulse' : isActive ? 'circuit-active' : ''
              }`}
              style={{
                width: '54%',
                height: '54%',
                objectFit: 'contain',
                filter: isSpeaking
                  ? 'drop-shadow(0 0 14px rgba(103,232,249,1.0)) brightness(1.6)'
                  : isActive
                  ? 'drop-shadow(0 0 10px rgba(93,213,237,0.9)) brightness(1.4)'
                  : isLoading
                  ? 'drop-shadow(0 0 8px rgba(96,165,250,0.8)) brightness(1.3)'
                  : 'drop-shadow(0 2px 6px rgba(0,0,0,0.5)) brightness(1.1)',
                opacity: 0.55,
                pointerEvents: 'none',
              }}
            />
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

          {/* === CLICK BURST — shockwave + flash === */}
          {clickBurst && (
            <>
              <div className="absolute inset-0 rounded-full" style={{
                background: 'radial-gradient(circle, rgba(0,230,255,0.35) 0%, rgba(0,230,255,0.1) 40%, transparent 70%)',
                animation: 'click-flash 0.5s ease-out forwards',
              }} />
              <div className="absolute -inset-2 rounded-full" style={{
                border: '2px solid rgba(0,230,255,0.5)',
                animation: 'click-ring 0.7s ease-out forwards',
              }} />
              <div className="absolute -inset-4 rounded-full" style={{
                border: '1px solid rgba(0,230,255,0.25)',
                animation: 'click-ring 0.7s 0.1s ease-out forwards',
                opacity: 0,
              }} />
            </>
          )}
        </div>

        {/* Floor shadow under ball */}
        <div className="absolute" style={{
          width: '70%',
          height: '12px',
          bottom: '-8px',
          left: '15%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)',
          filter: 'blur(4px)',
          borderRadius: '50%',
        }} />

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

        /* BRAIN FLUID BLOBS — pronounced organic movement */
        @keyframes milk1 {
          0%   { transform: translate(0%, 0%)     rotate(0deg);   border-radius: 62% 38% 52% 48% / 48% 62% 38% 52%; }
          10%  { transform: translate(15%, -10%)  rotate(22deg);  border-radius: 48% 52% 42% 58% / 58% 42% 52% 48%; }
          20%  { transform: translate(22%, 8%)    rotate(40deg);  border-radius: 38% 62% 58% 42% / 52% 48% 42% 58%; }
          35%  { transform: translate(10%, 22%)   rotate(65deg);  border-radius: 55% 45% 38% 62% / 42% 58% 62% 38%; }
          50%  { transform: translate(-12%, 15%)  rotate(85deg);  border-radius: 42% 58% 62% 38% / 55% 45% 38% 62%; }
          65%  { transform: translate(-20%, -2%)  rotate(108deg); border-radius: 58% 42% 45% 55% / 38% 62% 55% 45%; }
          80%  { transform: translate(-8%, -18%)  rotate(125deg); border-radius: 45% 55% 55% 45% / 62% 38% 48% 52%; }
          90%  { transform: translate(8%, -15%)   rotate(140deg); border-radius: 40% 60% 48% 52% / 55% 45% 58% 42%; }
          100% { transform: translate(0%, 0%)     rotate(160deg); border-radius: 62% 38% 52% 48% / 48% 62% 38% 52%; }
        }
        .milk-blob-1 { animation: milk1 3.5s cubic-bezier(0.45,0.05,0.55,0.95) infinite; }

        @keyframes milk2 {
          0%   { transform: translate(0%, 0%)     rotate(0deg);   border-radius: 45% 55% 38% 62% / 55% 45% 62% 38%; }
          14%  { transform: translate(-18%, 10%)  rotate(-28deg); border-radius: 55% 45% 52% 48% / 42% 58% 45% 55%; }
          28%  { transform: translate(-10%, 22%)  rotate(-50deg); border-radius: 48% 52% 62% 38% / 60% 40% 48% 52%; }
          42%  { transform: translate(14%, 18%)   rotate(-72deg); border-radius: 62% 38% 42% 58% / 40% 60% 58% 42%; }
          57%  { transform: translate(20%, -5%)   rotate(-95deg); border-radius: 40% 60% 55% 45% / 52% 48% 40% 60%; }
          71%  { transform: translate(8%, -22%)   rotate(-118deg);border-radius: 52% 48% 60% 40% / 45% 55% 52% 48%; }
          85%  { transform: translate(-10%, -14%) rotate(-138deg);border-radius: 50% 50% 42% 58% / 58% 42% 50% 50%; }
          100% { transform: translate(0%, 0%)     rotate(-155deg);border-radius: 45% 55% 38% 62% / 55% 45% 62% 38%; }
        }
        .milk-blob-2 { animation: milk2 4.5s cubic-bezier(0.45,0.05,0.55,0.95) infinite; }

        @keyframes milk3 {
          0%   { transform: translate(0%, 0%)     rotate(0deg);   border-radius: 55% 45% 50% 50% / 38% 62% 48% 52%; }
          17%  { transform: translate(14%, 18%)   rotate(35deg);  border-radius: 40% 60% 58% 42% / 52% 48% 55% 45%; }
          33%  { transform: translate(-8%, 24%)   rotate(65deg);  border-radius: 62% 38% 42% 58% / 48% 52% 40% 60%; }
          50%  { transform: translate(-22%, 6%)   rotate(95deg);  border-radius: 48% 52% 60% 40% / 58% 42% 52% 48%; }
          67%  { transform: translate(-12%, -18%) rotate(120deg); border-radius: 55% 45% 45% 55% / 42% 58% 60% 40%; }
          83%  { transform: translate(10%, -20%)  rotate(148deg); border-radius: 42% 58% 52% 48% / 55% 45% 42% 58%; }
          100% { transform: translate(0%, 0%)     rotate(170deg); border-radius: 55% 45% 50% 50% / 38% 62% 48% 52%; }
        }
        .milk-blob-3 { animation: milk3 3s cubic-bezier(0.45,0.05,0.55,0.95) infinite; }

        @keyframes milk4 {
          0%   { transform: translate(0%,0%)     scaleX(1)    scaleY(1);    }
          20%  { transform: translate(10%,-8%)   scaleX(1.18) scaleY(0.85); }
          40%  { transform: translate(-8%,12%)   scaleX(0.88) scaleY(1.15); }
          60%  { transform: translate(-14%,-6%)  scaleX(1.12) scaleY(0.90); }
          80%  { transform: translate(6%,-10%)   scaleX(0.92) scaleY(1.10); }
          100% { transform: translate(0%,0%)     scaleX(1)    scaleY(1);    }
        }
        .milk-blob-4 { animation: milk4 5s ease-in-out infinite; }

        @keyframes milk5 {
          0%   { transform: translate(0%, 0%)    rotate(0deg);   border-radius: 38% 62% 55% 45% / 62% 38% 52% 48%; }
          25%  { transform: translate(18%, 14%)  rotate(-55deg);  border-radius: 55% 45% 40% 60% / 45% 55% 62% 38%; }
          50%  { transform: translate(-14%, 20%) rotate(-105deg); border-radius: 48% 52% 60% 40% / 55% 45% 38% 62%; }
          75%  { transform: translate(-18%, -8%) rotate(-145deg); border-radius: 60% 40% 48% 52% / 40% 60% 52% 48%; }
          100% { transform: translate(0%, 0%)    rotate(-180deg); border-radius: 38% 62% 55% 45% / 62% 38% 52% 48%; }
        }
        .milk-blob-5 { animation: milk5 3.8s cubic-bezier(0.45,0.05,0.55,0.95) infinite; }

        /* CLICK BURST ANIMATIONS */
        @keyframes click-flash {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; }
          100% { opacity: 0; transform: scale(1.3); }
        }
        @keyframes click-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        /* CIRCUIT ANIMATIONS */
        @keyframes circuitPulse {
          0%   { filter: drop-shadow(0 0 4px rgba(93,213,237,0.6)) brightness(1.1); }
          25%  { filter: drop-shadow(0 0 14px rgba(93,213,237,1.0)) brightness(1.5) hue-rotate(10deg); }
          50%  { filter: drop-shadow(0 0 6px rgba(96,165,250,0.8)) brightness(1.2) hue-rotate(-5deg); }
          75%  { filter: drop-shadow(0 0 16px rgba(103,232,249,1.0)) brightness(1.6) hue-rotate(15deg); }
          100% { filter: drop-shadow(0 0 4px rgba(93,213,237,0.6)) brightness(1.1); }
        }
        .circuit-pulse { animation: circuitPulse 0.8s ease-in-out infinite; }

        @keyframes circuitActive {
          0%   { filter: drop-shadow(0 0 8px rgba(93,213,237,0.9)) brightness(1.3); }
          50%  { filter: drop-shadow(0 0 18px rgba(103,232,249,1.0)) brightness(1.5) hue-rotate(8deg); }
          100% { filter: drop-shadow(0 0 8px rgba(93,213,237,0.9)) brightness(1.3); }
        }
        .circuit-active { animation: circuitActive 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default FloatingAssistant;
