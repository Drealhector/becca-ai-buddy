import React, { useEffect, useCallback, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import NeuralBrain from "@/components/3d/NeuralBrain";
import DimensionPortal from "@/components/ui/DimensionPortal";

const Welcome = () => {
  const navigate = useNavigate();
  const [portal, setPortal] = useState<{
    active: boolean;
    x: number;
    y: number;
    dest: string;
  }>({ active: false, x: 0, y: 0, dest: "" });

  useEffect(() => {
    const businessName = sessionStorage.getItem("becca_business_name");
    const businessKey = sessionStorage.getItem("becca_business_key");
    if (!businessName || !businessKey) {
      navigate("/");
    }
  }, [navigate]);

  const handleNavigate = useCallback(
    (dest: string, e: React.MouseEvent) => {
      if (portal.active) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPortal({
        active: true,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        dest,
      });
    },
    [portal.active]
  );

  const handlePortalComplete = useCallback(() => {
    navigate(portal.dest);
    setPortal((p) => ({ ...p, active: false }));
  }, [navigate, portal.dest]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050a18]">
      {/* Dimension Portal Transition */}
      <DimensionPortal
        active={portal.active}
        originX={portal.x}
        originY={portal.y}
        onComplete={handlePortalComplete}
      />

      {/* 3D Neural Brain Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0.5, 6], fov: 55 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#050a18']} />
          <fog attach="fog" args={['#050a18', 8, 18]} />
          <ambientLight intensity={0.15} />
          <pointLight position={[5, 5, 5]} intensity={0.3} color="#4488ff" />
          <pointLight position={[-5, -3, 3]} intensity={0.2} color="#44aaff" />
          <Suspense fallback={null}>
            <NeuralBrain />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.3}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 2.5}
          />
        </Canvas>
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, rgba(5,10,24,0.6) 75%, rgba(5,10,24,0.92) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-2xl animate-fade-in">
          {/* B Icon */}
          <div className="mb-6 md:mb-8 flex justify-center">
            <span style={{
              fontSize: 'clamp(2.5rem, 12vw, 6rem)',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 900,
              lineHeight: 1,
            }}>
              <span
                className="animate-b-glow"
                style={{
                  color: '#ffffff',
                  WebkitTextStroke: '2px #2c4a6f',
                  fontWeight: 900,
                  display: 'inline-block',
                }}
              >B</span>
            </span>
          </div>

          <h1 className="text-white text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-4 px-2">
            Welcome DREALHECTOR
          </h1>

          <p className="text-white/80 text-sm sm:text-lg md:text-xl mb-6 md:mb-12 px-4">
            Your AI business assistant is ready to help
          </p>

          <Button
            size="lg"
            onClick={(e) => handleNavigate("/dashboard", e)}
            disabled={portal.active}
            className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 text-xs sm:text-base md:text-lg px-4 sm:px-8 md:px-12 py-3 md:py-6 h-auto shadow-[0_0_30px_rgba(100,150,255,0.2)] transition-transform active:scale-95"
          >
            Continue to your BECCA Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
