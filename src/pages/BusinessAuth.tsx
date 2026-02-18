import React, { useState, useCallback, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import NeuralBrain from "@/components/3d/NeuralBrain";
import DimensionPortal from "@/components/ui/DimensionPortal";

const BusinessAuth = () => {
  const [businessName, setBusinessName] = useState("");
  const [businessKey, setBusinessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [portal, setPortal] = useState<{
    active: boolean;
    x: number;
    y: number;
    dest: string;
  }>({ active: false, x: 0, y: 0, dest: "" });

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: keyData, error: keyError } = await supabase
        .from("business_keys")
        .select("business_name, is_active")
        .eq("business_name", businessName.trim())
        .eq("business_key", businessKey.trim())
        .eq("is_active", true)
        .single();

      if (keyError || !keyData) {
        toast({
          title: "Invalid Credentials",
          description: "Please check your business name and business key and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      sessionStorage.setItem("becca_business_name", keyData.business_name);
      sessionStorage.setItem("becca_business_key", businessKey);

      // Trigger portal then navigate
      const btn = document.getElementById("signin-btn");
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setPortal({
          active: true,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          dest: "/welcome",
        });
      } else {
        navigate("/welcome");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: "An error occurred during sign in.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handlePortalComplete = useCallback(() => {
    navigate(portal.dest);
    setPortal((p) => ({ ...p, active: false }));
  }, [navigate, portal.dest]);

  const handleBackClick = useCallback((e: React.MouseEvent) => {
    if (portal.active) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPortal({
      active: true,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      dest: "/",
    });
  }, [portal.active]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#02040f]">
      {/* Dimension Portal Transition */}
      <DimensionPortal
        active={portal.active}
        originX={portal.x}
        originY={portal.y}
        onComplete={handlePortalComplete}
      />

      {/* 3D Neural Brain Background — warmer purple/magenta tones to differ from landing */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 1.2, 7], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#02040f']} />
          <fog attach="fog" args={['#02040f', 10, 20]} />
          <ambientLight intensity={0.1} />
          {/* Shifted to warmer magenta/violet lights vs landing's blue */}
          <pointLight position={[4, 4, 4]} intensity={0.35} color="#aa44ff" />
          <pointLight position={[-4, -2, 3]} intensity={0.25} color="#ff44aa" />
          <pointLight position={[0, -5, 2]} intensity={0.15} color="#4444ff" />
          <Suspense fallback={null}>
            <NeuralBrain />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.4}
            maxPolarAngle={Math.PI / 1.6}
            minPolarAngle={Math.PI / 2.8}
          />
        </Canvas>
      </div>

      {/* Vignette overlay for readability */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(2,4,15,0.65) 80%, rgba(2,4,15,0.92) 100%)",
        }}
      />

      {/* Back to landing */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={handleBackClick}
          className="text-white/50 hover:text-white/90 text-sm transition-colors flex items-center gap-2"
        >
          ← Back
        </button>
      </div>

      {/* Auth Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background:
                  "radial-gradient(circle at 35% 35%, rgba(170,68,255,0.35), rgba(2,4,15,0.9) 80%)",
                border: "1px solid rgba(170,68,255,0.3)",
                boxShadow:
                  "0 0 40px rgba(170,68,255,0.25), 0 0 80px rgba(170,68,255,0.1)",
              }}
            >
              <span
                style={{
                  fontSize: "4.5rem",
                  fontFamily:
                    "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#ffffff",
                  WebkitTextStroke: "1.5px #5c2a8f",
                  textShadow: `
                    -3px -3px 0 #aa44ff,
                    -6px -6px 0 #cc66ff,
                    0 3px 12px rgba(170,68,255,0.5)
                  `,
                }}
              >
                B
              </span>
            </div>
          </div>

          <h1
            className="text-white text-3xl font-bold text-center mb-2"
            style={{
              textShadow: "0 0 30px rgba(170,68,255,0.4)",
            }}
          >
            Log in to BECCA
          </h1>
          <p className="text-white/40 text-sm text-center mb-8">
            Enter your business credentials to continue
          </p>

          {/* Form Card */}
          <form onSubmit={handleSignIn} className="space-y-6">
            <div
              className="rounded-2xl p-8"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(170,68,255,0.2)",
                backdropFilter: "blur(20px)",
                boxShadow:
                  "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div className="space-y-5">
                <div>
                  <Label
                    htmlFor="businessName"
                    className="text-white/70 text-sm mb-2 block"
                  >
                    Business Name
                  </Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Enter your business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 h-11"
                    required
                  />
                </div>

                <div>
                  <Label
                    htmlFor="businessKey"
                    className="text-white/70 text-sm mb-2 block"
                  >
                    Business Key
                  </Label>
                  <Input
                    id="businessKey"
                    type="password"
                    placeholder="Enter your business key"
                    value={businessKey}
                    onChange={(e) => setBusinessKey(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 h-11"
                    required
                  />
                </div>

                <Button
                  id="signin-btn"
                  type="submit"
                  className="w-full h-12 font-semibold text-sm transition-all active:scale-95"
                  disabled={loading || portal.active}
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(170,68,255,0.9), rgba(88,44,255,0.9))",
                    border: "1px solid rgba(170,68,255,0.4)",
                    boxShadow:
                      "0 0 20px rgba(170,68,255,0.3), 0 4px 15px rgba(0,0,0,0.4)",
                    color: "#fff",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Enter the dimension →"
                  )}
                </Button>
              </div>
            </div>
          </form>

          <p className="text-white/30 text-xs text-center mt-6">
            Contact your administrator for access credentials
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessAuth;
