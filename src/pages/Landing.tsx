import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import bLogo from "@/assets/b-logo.png";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 relative overflow-hidden">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070')] bg-cover bg-center opacity-20"></div>
      
      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={bLogo} alt="B" className="h-10 w-10 drop-shadow-2xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
          <span className="text-white text-2xl font-bold">ECCA</span>
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
      <div className="relative z-10 container mx-auto px-4 py-20 text-center max-w-5xl">
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-8 leading-tight">
          AI that talks and acts like a human.<br />
          Handles millions of calls and chats.
        </h1>
        
        <p className="text-xl md:text-2xl text-white/90 mb-12">
          AI brain for business support
        </p>

        <Button
          size="lg"
          onClick={() => navigate("/talk-to-us")}
          className="bg-white text-slate-900 hover:bg-white/90 text-lg px-8 py-6 h-auto"
        >
          Talk to us
        </Button>
      </div>
    </div>
  );
};

export default Landing;