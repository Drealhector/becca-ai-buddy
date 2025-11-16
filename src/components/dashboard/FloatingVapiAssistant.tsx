import React, { useState, useRef, useEffect } from "react";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";

const FloatingVapiAssistant = () => {
  const [position, setPosition] = useState({ x: window.innerWidth - 120, y: window.innerHeight - 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      setIsLoading(false);
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
      toast.error("Assistant connection error. Please verify your Vapi credentials.");
      setIsActive(false);
      setIsLoading(false);
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
        setIsLoading(false);
      } else {
        setIsLoading(true);
        await vapiRef.current.start("8eb153bb-e605-438c-85e6-bbe3484a64ff");
      }
    } catch (error) {
      console.error("Failed to toggle assistant:", error);
      setIsLoading(false);
      toast.error("Failed to connect to assistant. Please check your Vapi settings.");
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
      className="fixed z-50 cursor-grab active:cursor-grabbing animate-float"
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
          isLoading ? 'animate-[spin_1s_linear_infinite]' : isActive ? 'animate-pulse' : ''
        }`}>
          <div className={`absolute inset-0 rounded-full blur-xl ${
            isLoading ? 'bg-blue-300/40 animate-[ping_0.8s_ease-in-out_infinite]' : 'bg-blue-500/20 animate-[ping_2s_ease-in-out_infinite]'
          }`} />
          <div className={`absolute inset-0 rounded-full blur-lg ${
            isLoading ? 'bg-blue-400/50 animate-[ping_1s_ease-in-out_infinite]' : 'bg-blue-400/30 animate-[ping_2.5s_ease-in-out_infinite]'
          }`} style={{ animationDelay: isLoading ? '0.2s' : '0.5s' }} />
        </div>

        {/* Main sphere with B */}
        <div className={`relative w-full h-full rounded-full overflow-hidden transition-all duration-500 ${
          isLoading ? 'scale-105 shadow-xl shadow-blue-400/60' : isActive ? 'scale-110 shadow-2xl shadow-blue-500/50' : 'scale-100 shadow-lg'
        }`}
        style={{
          boxShadow: isLoading 
            ? 'inset 0 -20px 40px rgba(96, 165, 250, 0.5), inset 0 20px 40px rgba(255, 255, 255, 0.7), 0 10px 30px rgba(96, 165, 250, 0.6)'
            : 'inset 0 -20px 40px rgba(59, 130, 246, 0.3), inset 0 20px 40px rgba(255, 255, 255, 0.5), 0 10px 30px rgba(59, 130, 246, 0.4)'
        }}>
          {/* Deep 3D gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-blue-200" />
          
          {/* Rotating cloud layer 1 - slow */}
          <div className="absolute inset-0 opacity-60 animate-[cloud-rotate_20s_linear_infinite]">
            <div className="absolute inset-0 bg-gradient-radial from-white/90 via-blue-100/60 to-transparent" 
                 style={{ transform: 'translate(10%, 10%) scale(1.2)' }} />
            <div className="absolute inset-0 bg-gradient-radial from-blue-200/40 via-white/50 to-transparent" 
                 style={{ transform: 'translate(-15%, 5%) scale(1.3)' }} />
          </div>

          {/* Rotating cloud layer 2 - medium */}
          <div className="absolute inset-0 opacity-50 animate-[cloud-rotate_15s_linear_infinite_reverse]">
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-blue-100/70 to-white/60" 
                 style={{ transform: 'translate(-10%, -10%) scale(1.4)' }} />
            <div className="absolute inset-0 bg-gradient-radial from-white/80 via-transparent to-blue-200/50" 
                 style={{ transform: 'translate(20%, -5%) scale(1.2)' }} />
          </div>

          {/* Rotating cloud layer 3 - fast */}
          <div className="absolute inset-0 opacity-40 animate-[cloud-rotate_10s_linear_infinite]">
            <div className="absolute inset-0 bg-gradient-radial from-blue-300/50 via-white/70 to-transparent" 
                 style={{ transform: 'translate(5%, -15%) scale(1.5)' }} />
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-blue-100/60 to-white/40" 
                 style={{ transform: 'translate(-20%, 10%) scale(1.3)' }} />
          </div>

          {/* Swirling mist effect */}
          <div className="absolute inset-0 opacity-30 animate-[swirl_25s_ease-in-out_infinite]">
            <div className="absolute inset-0 bg-gradient-conic from-white via-blue-200 to-white blur-md" />
          </div>

          {/* 3D highlight effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent" 
               style={{ clipPath: 'circle(45% at 30% 30%)' }} />

          {/* B Letter with depth */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-4xl font-bold transition-all duration-300 relative ${
              isLoading
                ? 'text-blue-400 animate-pulse'
                : isActive 
                ? 'text-blue-600' 
                : 'text-blue-500'
            }`}
            style={{
              textShadow: isLoading
                ? '0 0 25px rgba(96, 165, 250, 1), 0 0 50px rgba(96, 165, 250, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3)'
                : isActive 
                ? '0 0 20px rgba(37, 99, 235, 0.8), 0 0 40px rgba(37, 99, 235, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)'
                : '0 0 10px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
              filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.8))'
            }}>
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

          {/* Loading/Active state border glow */}
          {isLoading && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-300/70 animate-[spin_0.8s_linear_infinite]" />
          )}
          {isActive && !isLoading && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-[spin_3s_linear_infinite]" />
          )}
        </div>

        {/* Digital brain particles when loading/active */}
        {(isLoading || isActive) && (
          <>
            <div className={`absolute top-0 left-1/2 w-1 h-1 rounded-full animate-[ping_1.5s_ease-out_infinite] ${
              isLoading ? 'bg-blue-300 w-1.5 h-1.5' : 'bg-blue-400'
            }`} style={{ animationDelay: '0s' }} />
            <div className={`absolute top-1/4 right-0 w-1 h-1 rounded-full animate-[ping_1.5s_ease-out_infinite] ${
              isLoading ? 'bg-blue-200 w-1.5 h-1.5' : 'bg-blue-300'
            }`} style={{ animationDelay: '0.3s' }} />
            <div className={`absolute bottom-1/4 left-0 w-1 h-1 rounded-full animate-[ping_1.5s_ease-out_infinite] ${
              isLoading ? 'bg-blue-400 w-1.5 h-1.5' : 'bg-blue-500'
            }`} style={{ animationDelay: '0.6s' }} />
            <div className={`absolute bottom-0 right-1/3 w-1 h-1 rounded-full animate-[ping_1.5s_ease-out_infinite] ${
              isLoading ? 'bg-blue-300 w-1.5 h-1.5' : 'bg-blue-400'
            }`} style={{ animationDelay: '0.9s' }} />
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes cloud-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes swirl {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
        .bg-gradient-conic {
          background: conic-gradient(var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
};

export default FloatingVapiAssistant;
