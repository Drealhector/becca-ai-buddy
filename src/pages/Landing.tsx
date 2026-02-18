import React, { Suspense, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import NeuralBrain from "@/components/3d/NeuralBrain";
import DimensionPortal from "@/components/ui/DimensionPortal";

const Landing = () => {
  const navigate = useNavigate();

  const [portal, setPortal] = useState<{
    active: boolean;
    x: number;
    y: number;
    dest: string;
  }>({ active: false, x: 0, y: 0, dest: "" });

  const handleNavigate = useCallback(
    (dest: string, e: React.MouseEvent) => {
      if (portal.active) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      setPortal({ active: true, x, y, dest });
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

      {/* Full-page 3D Canvas */}
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
          <pointLight position={[-5, -3, 3]} intensity={0.2} color="#8844ff" />
          <Suspense fallback={null}>
            <NeuralBrain />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 2.5}
          />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 pointer-events-none min-h-screen flex flex-col">
        {/* Header */}
        <header className="container mx-auto px-4 py-6 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center">
            <span style={{
              fontSize: 'clamp(1.5rem, 6vw, 3rem)',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 900,
              letterSpacing: '0',
              lineHeight: 1,
              display: 'inline-block'
            }}>
              <span style={{
                color: '#ffffff',
                WebkitTextStroke: '1.5px #2c4a6f',
                textShadow: `-3px -3px 0 #5dd5ed, -6px -6px 0 #5dd5ed, -9px -9px 0 #70dff0, 0 4px 12px rgba(0,0,0,0.4)`,
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
              onClick={(e) => handleNavigate("/auth", e)}
              className="text-white hover:bg-white/10 transition-transform active:scale-95"
            >
              Sign in
            </Button>
            <Button
              onClick={(e) => handleNavigate("/talk-to-us", e)}
              className="bg-white text-slate-900 hover:bg-white/90 transition-transform active:scale-95"
            >
              Talk to us
            </Button>
          </div>
        </header>

        {/* Hero Content - vertically centered */}
        <div className="flex-1 flex items-center justify-center">
          <div className="container mx-auto px-4 text-center max-w-5xl pointer-events-auto">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 md:mb-8 leading-tight px-2 flex flex-col items-center"
              style={{
                textShadow: `
                  0 1px 0 rgba(255,255,255,0.6),
                  0 2px 0 rgba(200,220,255,0.4),
                  0 4px 0 rgba(150,180,255,0.25),
                  0 6px 0 rgba(100,140,255,0.15),
                  0 8px 0 rgba(80,120,255,0.08),
                  0 12px 20px rgba(60,100,255,0.3),
                  0 20px 40px rgba(40,80,255,0.15)
                `,
              }}
            >
              <span className="text-center">AI that talks like a human.</span>
              <span className="text-center">Handles millions of calls.</span>
              <span className="text-center">Integrates into any platform.</span>
            </h1>

            <p
              className="text-sm sm:text-lg md:text-xl lg:text-2xl text-white/80 mb-6 md:mb-12 px-4"
              style={{
                textShadow: "0 2px 8px rgba(100,150,255,0.3), 0 4px 16px rgba(60,100,255,0.15)",
              }}
            >
              AI brain for enterprise support
            </p>

            <Button
              size="lg"
              onClick={(e) => handleNavigate("/talk-to-us", e)}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 text-xs sm:text-base md:text-lg px-4 sm:px-8 py-3 sm:py-5 md:py-6 h-auto shadow-[0_0_30px_rgba(100,150,255,0.2)] transition-transform active:scale-95"
            >
              Talk to us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
