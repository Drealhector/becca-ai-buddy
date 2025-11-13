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
        <div className="mb-8 flex justify-center">
          <span style={{
            fontSize: '6rem',
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

        <h1 className="text-white text-5xl md:text-6xl font-bold mb-4">
          Welcome DREALHECTOR
        </h1>

        <p className="text-white/90 text-xl mb-12">
          Your AI business assistant is ready to help
        </p>

        <Button
          size="lg"
          onClick={handleContinue}
          className="bg-white text-slate-900 hover:bg-white/90 text-lg px-12 py-6 h-auto animate-pulse hover:animate-none"
        >
          Continue to your BECCA Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Welcome;