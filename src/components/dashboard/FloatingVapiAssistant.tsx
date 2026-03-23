import React, { useState, useRef, useEffect } from "react";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";
import beccaBLogo from "@/assets/becca-b-new-logo.png";

interface FloatingVapiAssistantProps {
  publicKey?: string;
  assistantId?: string;
  initialPosition?: { x: number; y: number };
  activationTrigger?: number;
}

const BALL_SIZE = 96;
const HIT_PADDING = 12;
const CONTAINER_SIZE = BALL_SIZE + HIT_PADDING * 2;

const FloatingVapiAssistant = ({
  publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY || "cb6d31db-2209-4ffa-ac27-794c02fcd8ec",
  assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID || "8eb153bb-e605-438c-85e6-bbe3484a64ff",
  initialPosition,
  activationTrigger = 0
}: FloatingVapiAssistantProps = {}) => {
  const defaultPosition = initialPosition || { x: window.innerWidth - CONTAINER_SIZE - 20, y: window.innerHeight - CONTAINER_SIZE - 20 };
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
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchEventRef = useRef<boolean>(false);
  const isActiveRef = useRef<boolean>(false);
  const isLoadingRef = useRef<boolean>(false);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const extractVapiErrorMessage = (error: unknown) => {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;
    if (typeof error === "object") {
      const maybeError = error as Record<string, unknown>;
      const nested = maybeError.error as Record<string, unknown> | undefined;
      return (
        (typeof maybeError.message === "string" && maybeError.message) ||
        (typeof maybeError.reason === "string" && maybeError.reason) ||
        (typeof nested?.message === "string" && nested.message) ||
        JSON.stringify(error)
      );
    }
    return String(error);
  };

  // Cleanup function to destroy a Vapi instance
  const destroyVapiInstance = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch (e) {
        // Ignore cleanup errors
      }
      vapiRef.current = null;
    }
  };

  // Create a fresh Vapi instance with event listeners
  const createVapiInstance = () => {
    destroyVapiInstance();
    console.log("Creating fresh Vapi instance with publicKey:", publicKey, "assistantId:", assistantId);
    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      console.log("Ball assistant: Call started successfully");
      if (connectionTimeoutRef.current) { clearTimeout(connectionTimeoutRef.current); connectionTimeoutRef.current = null; }
      setIsLoading(false);
      setIsActive(true);
      setRetryCount(0);
      toggleLockRef.current = false;
      toast.success("Assistant activated");
    });

    vapi.on("call-end", () => {
      console.log("Ball assistant: Call ended");
      if (connectionTimeoutRef.current) { clearTimeout(connectionTimeoutRef.current); connectionTimeoutRef.current = null; }
      setIsActive(false);
      setIsSpeaking(false);
      setIsLoading(false);
      setRetryCount(0);
      toggleLockRef.current = false;
      vapiRef.current = null;
    });

    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));
    vapi.on("volume-level", (volume: number) => { if (volume > 0.1) setIsSpeaking(true); });

    vapi.on("error", (error: unknown) => {
      const errorMessage = extractVapiErrorMessage(error);
      console.error("Ball assistant Vapi error:", errorMessage, error);
      if (connectionTimeoutRef.current) { clearTimeout(connectionTimeoutRef.current); connectionTimeoutRef.current = null; }
      setIsActive(false);
      setIsLoading(false);
      setIsSpeaking(false);
      toggleLockRef.current = false;
      destroyVapiInstance();

      const normalized = errorMessage.toLowerCase();

      // Auto-retry silently for Daily.co "ejected" / "Meeting has ended" errors
      if (normalized.includes("ejected") || normalized.includes("meeting has ended") || normalized.includes("daily-error")) {
        if (retryCount < 3) {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          const retryDelay = Math.pow(2, newRetryCount) * 500;
          console.log(`Daily.co session error, auto-retrying in ${retryDelay}ms (attempt ${newRetryCount}/3)`);
          setIsLoading(true);
          setTimeout(() => {
            toggleLockRef.current = false;
            handleClick();
          }, retryDelay);
        } else {
          setRetryCount(0);
          toast.error("Unable to connect. Please try again.");
        }
        return;
      }

      if (normalized.includes("microphone") || normalized.includes("permission") || normalized.includes("notallowederror")) {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else if (normalized.includes("invalid key") || normalized.includes("assistant") || normalized.includes("unauthorized")) {
        toast.error(`Vapi credential error: ${errorMessage}`);
      } else if (normalized.includes("network") || normalized.includes("connection") || normalized.includes("timeout")) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error(`Connection failed: ${errorMessage}`);
      }
    });

    return vapi;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      destroyVapiInstance();
    };
  }, []);

  // Activation trigger effect
  useEffect(() => {
    if (activationTrigger > 0 && publicKey && !isLoading) {
      if (isActive) {
        destroyVapiInstance();
        setIsActive(false);
        setTimeout(() => handleClick(), 300);
      } else {
        handleClick();
      }
    }
  }, [activationTrigger]);

  // --- DRAG HANDLERS (GPU-accelerated with transform) ---

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

  const handleClick = async () => {
    if (!publicKey || toggleLockRef.current) return;

    // Runtime guard for missing credentials
    if (!publicKey || !assistantId) {
      toast.error("VAPI credentials not configured. Set VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID in .env");
      return;
    }

    toggleLockRef.current = true;

    try {
      if (isActiveRef.current || isLoadingRef.current) {
        if (connectionTimeoutRef.current) { clearTimeout(connectionTimeoutRef.current); connectionTimeoutRef.current = null; }
        destroyVapiInstance();
        setIsActive(false);
        setIsLoading(false);
        setIsSpeaking(false);
        toggleLockRef.current = false;
        toast.info("Assistant stopped");
        return;
      }

      setIsLoading(true);

      connectionTimeoutRef.current = setTimeout(() => {
        if (isLoadingRef.current && !isActiveRef.current) {
          console.log('Connection timeout');
          destroyVapiInstance();
          if (retryCount < 3) {
            const newRetryCount = retryCount + 1;
            setRetryCount(newRetryCount);
            const retryDelay = Math.pow(2, newRetryCount) * 1000;
            toast.error(`Connection timeout. Retrying in ${retryDelay / 1000}s... (${newRetryCount}/3)`);
            setTimeout(() => { setIsLoading(false); toggleLockRef.current = false; handleClick(); }, retryDelay);
          } else {
            setIsLoading(false);
            setIsActive(false);
            setRetryCount(0);
            toggleLockRef.current = false;
            toast.error("Unable to connect after multiple attempts. Please check your internet connection and try again later.");
          }
        }
      }, 30000);

      const vapi = createVapiInstance();
      // Give the SDK time to fully initialize before starting
      await new Promise(resolve => setTimeout(resolve, 200));
      const call = await vapi.start(assistantId);
      if (!call) throw new Error("Call session was not created");
    } catch (error) {
      const errorMessage = extractVapiErrorMessage(error);
      console.error("Failed to toggle assistant:", errorMessage, error);
      if (connectionTimeoutRef.current) { clearTimeout(connectionTimeoutRef.current); connectionTimeoutRef.current = null; }
      setIsLoading(false);
      setIsActive(false);
      destroyVapiInstance();

      const normalized = errorMessage.toLowerCase();
      if ((normalized.includes('network') || normalized.includes('fetch') || normalized.includes('timeout')) && retryCount < 3) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        const retryDelay = Math.pow(2, newRetryCount) * 1000;
        toast.error(`Connection failed. Retrying in ${retryDelay / 1000}s... (${newRetryCount}/3)`);
        setTimeout(() => { toggleLockRef.current = false; handleClick(); }, retryDelay);
      } else if (normalized.includes("invalid key") || normalized.includes("assistant") || normalized.includes("unauthorized")) {
        toast.error(`Vapi credential error: ${errorMessage}`);
        setRetryCount(0);
        toggleLockRef.current = false;
      } else {
        toast.error(`Failed to connect: ${errorMessage}`);
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
          {/* === BASE: deep ocean-blue core === */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle at 36% 33%, #e0f2fe 0%, #67e8f9 15%, #06b6d4 35%, #0891b2 50%, #0e4f5c 70%, #082f49 88%, #051e2f 100%)'
          }} />

          {/* === MILK BLOB 1 === */}
          <div className="milk-blob-1" style={{
            position: 'absolute', width: '80%', height: '75%', top: '10%', left: '5%',
            background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(255,254,250,0.98) 0%, rgba(255,251,240,0.85) 45%, rgba(253,246,225,0.50) 72%, transparent 100%)',
            filter: 'blur(4px)',
            borderRadius: '60% 40% 55% 45% / 50% 60% 40% 55%',
            animationDuration: blobSpeed(3.5),
            animationTimingFunction: blobEasing,
          }} />

          {/* === MILK BLOB 2 === */}
          <div className="milk-blob-2" style={{
            position: 'absolute', width: '65%', height: '60%', top: '20%', left: '18%',
            background: 'radial-gradient(ellipse 55% 50% at 45% 52%, rgba(255,253,248,0.92) 0%, rgba(254,249,235,0.70) 50%, rgba(252,243,215,0.35) 75%, transparent 100%)',
            filter: 'blur(5px)',
            borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%',
            animationDuration: blobSpeed(4.5),
            animationTimingFunction: blobEasing,
          }} />

          {/* === MILK BLOB 3 === */}
          <div className="milk-blob-3" style={{
            position: 'absolute', width: '50%', height: '45%', top: '30%', left: '25%',
            background: 'radial-gradient(ellipse 50% 45% at 52% 48%, rgba(255,252,245,0.88) 0%, rgba(254,247,228,0.60) 55%, transparent 85%)',
            filter: 'blur(6px)',
            borderRadius: '55% 45% 50% 50% / 40% 60% 45% 55%',
            animationDuration: blobSpeed(3.0),
            animationTimingFunction: blobEasing,
          }} />

          {/* === MILK BLOB 4 === */}
          <div className="milk-blob-4" style={{
            position: 'absolute', width: '90%', height: '35%', top: '0%', left: '5%',
            background: 'radial-gradient(ellipse 70% 80% at 50% 20%, rgba(255,255,255,0.55) 0%, rgba(255,252,240,0.28) 55%, transparent 85%)',
            filter: 'blur(5px)',
            borderRadius: '50% 50% 60% 40% / 70% 70% 30% 30%',
            animationDuration: blobSpeed(5.0),
            animationTimingFunction: isSpeaking ? 'ease-in-out' : 'ease-in-out',
          }} />

          {/* === MILK BLOB 5 === */}
          <div className="milk-blob-5" style={{
            position: 'absolute', width: '70%', height: '55%', top: '35%', left: '10%',
            background: 'radial-gradient(ellipse 55% 50% at 48% 60%, rgba(255,251,238,0.75) 0%, rgba(253,244,218,0.45) 55%, transparent 85%)',
            filter: 'blur(7px)',
            borderRadius: '40% 60% 55% 45% / 60% 40% 55% 45%',
            animationDuration: blobSpeed(3.8),
            animationTimingFunction: blobEasing,
          }} />

          {/* === DEPTH SHADOW === */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle at 50% 115%, rgba(10,20,80,0.7) 0%, transparent 60%)',
            mixBlendMode: 'multiply',
          }} />

          {/* === GLASS RIM === */}
          <div className="absolute inset-0 rounded-full" style={{
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.2)',
            background: 'transparent',
          }} />

          {/* === GLASS REFRACTION / CHROMATIC EDGE === */}
          <div className="absolute inset-0 rounded-full" style={{
            background: 'conic-gradient(from 180deg, transparent 0%, rgba(147,197,253,0.1) 25%, transparent 50%, rgba(103,232,249,0.08) 75%, transparent 100%)',
            mixBlendMode: 'overlay',
          }} />

          {/* === PRIMARY SPECULAR HIGHLIGHT === */}
          <div className="absolute" style={{
            width: '58%', height: '42%', top: '4%', left: '6%',
            background: 'radial-gradient(ellipse at 38% 38%, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.55) 40%, transparent 72%)',
            filter: 'blur(2.5px)',
            borderRadius: '50%',
          }} />

          {/* === SECONDARY SPECULAR === */}
          <div className="absolute" style={{
            width: '20%', height: '16%', top: '9%', left: '15%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.65) 50%, transparent 80%)',
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

        /* MILK BLOBS */
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

export default FloatingVapiAssistant;
