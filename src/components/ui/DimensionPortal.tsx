import React, { useEffect, useRef, useState, useCallback } from "react";

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
  const DURATION = 1200; // ms

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

    // Particles for the vortex
    const particles: {
      angle: number;
      radius: number;
      speed: number;
      size: number;
      color: string;
      opacity: number;
    }[] = [];

    const COLORS = [
      "93,213,237",   // cyan
      "88,130,255",   // blue
      "180,100,255",  // purple
      "255,255,255",  // white
      "120,200,255",  // light blue
    ];

    for (let i = 0; i < 220; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 60 + Math.random() * 500,
        speed: 0.04 + Math.random() * 0.08,
        size: 1 + Math.random() * 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.4 + Math.random() * 0.6,
      });
    }

    const draw = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1); // 0→1

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Easing: fast suck at end
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // --- Background darkening + warp overlay ---
      const bgAlpha = ease * 0.97;
      ctx.fillStyle = `rgba(2,4,15,${bgAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- Portal ring glow ---
      const portalRadius = Math.max(0, 280 * (1 - ease * 1.1));
      if (portalRadius > 0) {
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, portalRadius);
        grd.addColorStop(0, `rgba(93,213,237,${0.9 * (1 - ease)})`);
        grd.addColorStop(0.3, `rgba(88,130,255,${0.7 * (1 - ease)})`);
        grd.addColorStop(0.7, `rgba(130,60,255,${0.4 * (1 - ease)})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(cx, cy, portalRadius, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Spinning outer ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ease * Math.PI * 6);
        const rings = 3;
        for (let r = 0; r < rings; r++) {
          const rr = portalRadius * (0.6 + r * 0.2);
          // ring stroke only, no gradient fill needed
          ctx.beginPath();
          ctx.arc(0, 0, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r === 0 ? "93,213,237" : r === 1 ? "88,130,255" : "180,80,255"},${0.5 * (1 - ease)})`;
          ctx.lineWidth = 2 - r * 0.4;
          ctx.stroke();
        }
        ctx.restore();
      }

      // --- Vortex particles spiraling inward ---
      particles.forEach((p) => {
        // Spiral inward as t increases
        const inwardFactor = 1 - ease * 0.98;
        const currentRadius = p.radius * inwardFactor;
        const spin = p.angle + ease * Math.PI * 8 * p.speed * 15;
        const px = cx + Math.cos(spin) * currentRadius;
        const py = cy + Math.sin(spin) * currentRadius * 0.55; // flatten into ellipse

        const alpha = p.opacity * (1 - ease * 0.7);
        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 - ease * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${alpha})`;
        ctx.fill();

        // Trail
        ctx.beginPath();
        ctx.moveTo(px, py);
        const trailSpin = spin - 0.15 * p.speed * 10;
        const tx2 = cx + Math.cos(trailSpin) * currentRadius;
        const ty2 = cy + Math.sin(trailSpin) * currentRadius * 0.55;
        ctx.lineTo(tx2, ty2);
        ctx.strokeStyle = `rgba(${p.color},${alpha * 0.4})`;
        ctx.lineWidth = p.size * 0.6;
        ctx.stroke();
      });

      // --- Chromatic aberration / lens distortion lines radiating in ---
      if (ease > 0.3) {
        const lensAlpha = (ease - 0.3) / 0.7;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + ease * 2;
          const len = 300 * ease;
          const lx1 = cx + Math.cos(a) * len * 1.5;
          const ly1 = cy + Math.sin(a) * len * 0.8;
          const grad = ctx.createLinearGradient(lx1, ly1, cx, cy);
          grad.addColorStop(0, `rgba(93,213,237,0)`);
          grad.addColorStop(1, `rgba(93,213,237,${lensAlpha * 0.6})`);
          ctx.beginPath();
          ctx.moveTo(lx1, ly1);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // --- Final flash to white/void ---
      if (t > 0.85) {
        const flashT = (t - 0.85) / 0.15;
        ctx.fillStyle = `rgba(2,4,15,${flashT})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(draw);
      } else {
        // Hold full black then navigate
        ctx.fillStyle = "rgb(2,4,15)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setTimeout(onComplete, 60);
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
