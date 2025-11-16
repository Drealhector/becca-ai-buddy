import React, { useState, useRef, useEffect } from "react";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";

const FloatingVapiAssistant = () => {
  const [position, setPosition] = useState({ x: window.innerWidth - 120, y: window.innerHeight - 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Vapi
    const vapi = new Vapi("cb6d31db-2209-4ffa-ac27-794c02fcd8ec");
    vapiRef.current = vapi;

    // Set up event listeners
    vapi.on("call-start", () => {
      setIsActive(true);
      toast.success("Assistant activated");
    });

    vapi.on("call-end", () => {
      setIsActive(false);
      setIsSpeaking(false);
      toast.info("Assistant deactivated");
    });

    vapi.on("speech-start", () => {
      setIsSpeaking(true);
    });

    vapi.on("speech-end", () => {
      setIsSpeaking(false);
    });

    vapi.on("error", (error: any) => {
      console.error("Vapi error:", error);
      toast.error("Assistant error");
      setIsActive(false);
    });

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
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

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = Math.abs(e.clientX - (dragRef.current?.startX || 0));
    const deltaY = Math.abs(e.clientY - (dragRef.current?.startY || 0));
    
    // If barely moved, treat as click
    if (deltaX < 5 && deltaY < 5) {
      handleClick();
    }
    
    setIsDragging(false);
    dragRef.current = null;
  };

  const handleClick = async () => {
    if (!vapiRef.current) return;

    try {
      if (isActive) {
        vapiRef.current.stop();
      } else {
        await vapiRef.current.start("8eb153bb-e605-438c-85e6-bbe3484a64ff");
      }
    } catch (error) {
      console.error("Failed to toggle assistant:", error);
      toast.error("Failed to toggle assistant");
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      ref={buttonRef}
      className="fixed z-50 cursor-grab active:cursor-grabbing"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '80px',
        height: '80px',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-full">
        {/* Outer glow rings */}
        <div className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isActive ? 'animate-pulse' : ''
        }`}>
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-[ping_2s_ease-in-out_infinite]" />
          <div className="absolute inset-0 rounded-full bg-blue-400/30 blur-lg animate-[ping_2.5s_ease-in-out_infinite]" 
               style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Main sphere with B */}
        <div className={`relative w-full h-full rounded-full overflow-hidden transition-all duration-500 ${
          isActive ? 'scale-110 shadow-2xl shadow-blue-500/50' : 'scale-100 shadow-lg'
        }`}>
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-100 to-blue-300 animate-[spin_8s_linear_infinite]" />
          
          {/* Cloudy overlay effect */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-gradient-radial from-white/80 via-blue-200/50 to-transparent animate-[pulse_3s_ease-in-out_infinite]" />
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-white/60 to-blue-300/40 animate-[pulse_4s_ease-in-out_infinite]" 
                 style={{ animationDelay: '1s' }} />
          </div>

          {/* B Letter */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-4xl font-bold transition-all duration-300 ${
              isActive 
                ? 'text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]' 
                : 'text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]'
            }`}>
              B
            </span>
          </div>

          {/* Speaking pulse overlay */}
          {isSpeaking && (
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-[ping_1s_ease-out_infinite]" />
            </div>
          )}

          {/* Active state border glow */}
          {isActive && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-[spin_3s_linear_infinite]" />
          )}
        </div>

        {/* Digital brain particles when active */}
        {isActive && (
          <>
            <div className="absolute top-0 left-1/2 w-1 h-1 rounded-full bg-blue-400 animate-[ping_1.5s_ease-out_infinite]" 
                 style={{ animationDelay: '0s' }} />
            <div className="absolute top-1/4 right-0 w-1 h-1 rounded-full bg-blue-300 animate-[ping_1.5s_ease-out_infinite]" 
                 style={{ animationDelay: '0.3s' }} />
            <div className="absolute bottom-1/4 left-0 w-1 h-1 rounded-full bg-blue-500 animate-[ping_1.5s_ease-out_infinite]" 
                 style={{ animationDelay: '0.6s' }} />
            <div className="absolute bottom-0 right-1/3 w-1 h-1 rounded-full bg-blue-400 animate-[ping_1.5s_ease-out_infinite]" 
                 style={{ animationDelay: '0.9s' }} />
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
};

export default FloatingVapiAssistant;
