import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import beccaLogo from "@/assets/becca-b-logo.png";

const Welcome = () => {
  const [businessName, setBusinessName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const name = sessionStorage.getItem("becca_business_name");
    if (!name) {
      navigate("/auth");
      return;
    }
    setBusinessName(name);
  }, [navigate]);

  const handleContinue = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-4">
      <div className="text-center max-w-2xl animate-fade-in">
        <div className="mb-8 flex justify-center">
          <img src={beccaLogo} alt="BECCA" className="h-24 w-24 drop-shadow-2xl animate-scale-in" />
        </div>

        <h1 className="text-white text-5xl md:text-6xl font-bold mb-4">
          Welcome {businessName}
        </h1>

        <p className="text-white/90 text-xl mb-12">
          Your AI business assistant is ready to help
        </p>

        <Button
          size="lg"
          onClick={handleContinue}
          className="bg-white text-primary hover:bg-white/90 text-lg px-12 py-6 h-auto animate-pulse hover:animate-none"
        >
          Continue to your BECCA Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Welcome;