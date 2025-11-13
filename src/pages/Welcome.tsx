import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Welcome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const name = sessionStorage.getItem("becca_business_name");
    if (!name) {
      navigate("/auth");
      return;
    }
  }, [navigate]);

  const handleContinue = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl animate-fade-in">
        <div className="mb-6 md:mb-8 flex justify-center">
          <span style={{
            fontSize: 'clamp(3.5rem, 12vw, 6rem)',
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
          </span>
        </div>

        <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 px-2">
          Welcome DREALHECTOR
        </h1>

        <p className="text-white/90 text-base sm:text-lg md:text-xl mb-8 md:mb-12 px-4">
          Your AI business assistant is ready to help
        </p>

        <Button
          size="lg"
          onClick={handleContinue}
          className="bg-white text-slate-900 hover:bg-white/90 text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-12 py-4 md:py-6 h-auto animate-pulse hover:animate-none"
        >
          Continue to your BECCA Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Welcome;