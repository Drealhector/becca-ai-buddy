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
          <span className="flex items-center justify-center" style={{
            fontSize: '3rem',
            fontFamily: 'Montserrat, Futura, sans-serif',
            fontWeight: 900,
            letterSpacing: '0.05em',
            lineHeight: 1,
            textShadow: '0 4px 8px rgba(0,0,0,0.3)',
            gap: '0.02em'
          }}>
            <span className="relative inline-block" style={{
              color: '#ffffff',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              WebkitTextStroke: '2px #06b6d4',
              textShadow: '-2px -2px 0 #06b6d4, 2px -2px 0 #06b6d4, -2px 2px 0 #06b6d4, 2px 2px 0 #06b6d4',
              transform: 'skewX(-2deg)',
              transition: 'transform 0.3s ease'
            }}>B</span>
            <span style={{
              color: '#ffffff',
              transform: 'skewX(-5deg)',
              WebkitTextStroke: '0.5px #06b6d4'
            }}>E</span>
            <span style={{
              color: '#ffffff',
              WebkitTextStroke: '1.5px #06b6d4',
              WebkitTextFillColor: 'transparent'
            }}>C</span>
            <span style={{
              color: '#ffffff',
              WebkitTextStroke: '1.5px #06b6d4',
              WebkitTextFillColor: 'transparent',
              transform: 'scale(0.95)'
            }}>C</span>
            <span className="relative" style={{
              color: '#ffffff',
              WebkitTextStroke: '0.8px #06b6d4',
              transform: 'skewX(-3deg)'
            }}>
              A
              <span className="absolute" style={{
                content: '*',
                fontSize: '0.2em',
                color: '#06b6d4',
                top: '-0.1em',
                right: '-0.1em',
                animation: 'pulse 2s infinite',
                opacity: 0.8
              }}>✦</span>
            </span>
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
      <div className="relative z-10 container mx-auto px-4 py-20 text-center max-w-5xl">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <span className="text-white text-sm">BECCA RAISES $61M SERIES A</span>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold text-white mb-8 leading-tight">
          AI that talks like a human.<br />
          Handles millions of calls.
        </h1>
        
        <p className="text-xl md:text-2xl text-white/90 mb-12">
          AI agents for enterprise support
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