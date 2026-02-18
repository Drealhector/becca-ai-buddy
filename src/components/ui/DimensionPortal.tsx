import React, { useEffect, useRef } from "react";

interface DimensionPortalProps {
  onComplete: () => void;
  originX: number;
  originY: number;
  active: boolean;
}

const DimensionPortal: React.FC<DimensionPortalProps> = ({
  onComplete,
  originX,
  originY,
  active,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const DURATION = 900; // ms — snappy but smooth

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    startTimeRef.current = performance.now();

    const cx = originX;
    const cy = originY;

    // Max radius to cover the entire screen from the click point
    const maxR = Math.sqrt(
      Math.max(cx, canvas.width - cx) ** 2 +
      Math.max(cy, canvas.height - cy) ** 2
    ) * 1.1;

    const draw = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);

      // Ease in-out cubic — smooth acceleration then deceleration
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Phase 1 (0→0.6): Dark vignette expands inward from the click point
      // Phase 2 (0.6→1): Full black swallows the screen
      if (ease < 0.92) {
        // Radial gradient: black hole growing from click origin outward
        const outerR = Math.max(2, maxR * ease * 1.1);

        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
        grd.addColorStop(0,    `rgba(2,4,15,${Math.min(ease * 1.6, 1)})`);
        grd.addColorStop(0.35, `rgba(2,4,15,${Math.min(ease * 1.2, 0.95)})`);
        grd.addColorStop(0.65, `rgba(2,4,15,${Math.min(ease * 0.85, 0.7)})`);
        grd.addColorStop(1,    `rgba(2,4,15,0)`);

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle bright rim at the collapsing edge — very faint cyan ring
        const rimR = outerR * 0.78;
        const rimAlpha = Math.sin(ease * Math.PI) * 0.12;
        if (rimR > 2 && rimAlpha > 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, rimR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(93,213,237,${rimAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        // Final fill — full black sweep
        const finalT = (ease - 0.92) / 0.08;
        const alpha = Math.min(finalT * 2, 1);
        ctx.fillStyle = `rgba(2,4,15,${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(draw);
      } else {
        ctx.fillStyle = "rgb(2,4,15)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setTimeout(onComplete, 50);
      }
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, originX, originY, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
};

export default DimensionPortal;
