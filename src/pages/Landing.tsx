import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 relative overflow-hidden">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070')] bg-cover bg-center opacity-20"></div>
      
      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center">
          <span style={{
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            fontWeight: 900,
            letterSpacing: '0',
            lineHeight: 1,
            display: 'inline-block'
          }}>
            <span style={{
              color: '#ffffff',
              WebkitTextStroke: '2px #2c4a6f',
              textShadow: `
                -4px -4px 0 #5dd5ed,
                -8px -8px 0 #5dd5ed,
                -12px -12px 0 #70dff0,
                0 4px 12px rgba(0,0,0,0.4)
              `,
              fontWeight: 900
            }}>B</span>
            <span style={{
              color: '#ffffff',
              fontWeight: 800,
              textShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>ECCA</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="text-white hover:bg-white/10"
          >
            Sign in
          </Button>
          <Button
            onClick={() => navigate("/talk-to-us")}
            className="bg-white text-slate-900 hover:bg-white/90"
          >
            Talk to us
          </Button>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 sm:py-16 md:py-20 text-center max-w-5xl">

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 md:mb-8 leading-tight px-2">
          AI that talks like a human.<br />
          Handles millions of calls.
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-8 md:mb-12 px-4">
          AI agents for enterprise support
        </p>

        <Button
          size="lg"
          onClick={() => navigate("/talk-to-us")}
          className="bg-white text-slate-900 hover:bg-white/90 text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-5 md:py-6 h-auto"
        >
          Talk to us
        </Button>
      </div>
    </div>
  );
};

export default Landing;