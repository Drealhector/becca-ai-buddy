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
  const DURATION = 1400;

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
    const maxR = Math.sqrt(
      Math.max(cx, canvas.width - cx) ** 2 +
      Math.max(cy, canvas.height - cy) ** 2
    ) * 1.15;

    const draw = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);

      // Ease: slow start, aggressive pull at end
      const ease = 1 - Math.pow(1 - t, 3);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Phase 1: Shockwave ripple from click (0 → 0.25) ──
      if (t < 0.3) {
        const rippleT = t / 0.3;
        const rippleR = Math.max(2, maxR * rippleT * 0.6);
        const rippleAlpha = (1 - rippleT) * 0.55;

        // Outer ripple ring
        ctx.beginPath();
        ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(93,213,237,${rippleAlpha})`;
        ctx.lineWidth = 2.5 * (1 - rippleT);
        ctx.stroke();

        // Inner bright flash at origin
        const flashR = Math.max(2, 60 * (1 - rippleT * 1.5));
        if (flashR > 2) {
          const flashGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
          flashGrd.addColorStop(0, `rgba(255,255,255,${(1 - rippleT) * 0.9})`);
          flashGrd.addColorStop(0.4, `rgba(93,213,237,${(1 - rippleT) * 0.6})`);
          flashGrd.addColorStop(1, `rgba(93,213,237,0)`);
          ctx.fillStyle = flashGrd;
          ctx.beginPath();
          ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Phase 2: Wormhole tunnel collapsing inward (0.15 → 0.9) ──
      if (t > 0.15 && t < 0.95) {
        const tunnelT = Math.min((t - 0.15) / 0.75, 1);
        const tunnelEase = 1 - Math.pow(1 - tunnelT, 2.5);

        // Dark vignette pulling from edges toward origin
        const vigR = Math.max(2, maxR * (1 - tunnelEase * 0.85));
        const vigGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, vigR);
        vigGrd.addColorStop(0, `rgba(2,4,15,0)`);
        vigGrd.addColorStop(0.4, `rgba(2,4,15,${tunnelEase * 0.5})`);
        vigGrd.addColorStop(0.75, `rgba(2,4,15,${tunnelEase * 0.88})`);
        vigGrd.addColorStop(1, `rgba(2,4,15,${Math.min(tunnelEase * 1.3, 1)})`);
        ctx.fillStyle = vigGrd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Wormhole tunnel rings — concentric, compressing toward origin
        const numRings = 10;
        for (let i = 0; i < numRings; i++) {
          const ringProgress = (i / numRings + tunnelEase * 1.2) % 1;
          // Rings fly toward the click point — large → small
          const ringR = Math.max(2, maxR * (1 - ringProgress) * (1 - tunnelEase * 0.6));
          const ringAlpha = ringProgress * (1 - ringProgress) * 2.8 * tunnelEase;

          if (ringR > 2 && ringAlpha > 0.01) {
            // Color shift from cyan → blue → white near center
            const colorMix = ringProgress;
            const r = Math.round(93 + colorMix * 162);
            const g = Math.round(213 - colorMix * 83);
            const b = Math.round(237 + colorMix * 18);

            ctx.beginPath();
            ctx.ellipse(cx, cy, ringR, ringR * 0.55, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(ringAlpha, 0.7)})`;
            ctx.lineWidth = Math.max(0.5, (1 - ringProgress) * 2.5 * tunnelEase);
            ctx.stroke();
          }
        }

        // Radial light streaks pulling toward origin (gravity lines)
        const streakCount = 16;
        for (let i = 0; i < streakCount; i++) {
          const angle = (i / streakCount) * Math.PI * 2;
          const streakLen = maxR * 0.6 * tunnelEase;
          const x1 = cx + Math.cos(angle) * streakLen;
          const y1 = cy + Math.sin(angle) * streakLen * 0.55;
          const streakAlpha = tunnelEase * 0.18;

          if (streakAlpha > 0.01 && streakLen > 2) {
            const sg = ctx.createLinearGradient(x1, y1, cx, cy);
            sg.addColorStop(0, `rgba(93,213,237,0)`);
            sg.addColorStop(0.6, `rgba(93,213,237,${streakAlpha * 0.5})`);
            sg.addColorStop(1, `rgba(200,240,255,${streakAlpha})`);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(cx, cy);
            ctx.strokeStyle = sg;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Bright portal core glow at origin
        const coreR = Math.max(2, 40 * tunnelEase * (1 - tunnelEase * 0.5) + 6);
        const coreGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreGrd.addColorStop(0, `rgba(255,255,255,${tunnelEase * 0.95})`);
        coreGrd.addColorStop(0.3, `rgba(93,213,237,${tunnelEase * 0.7})`);
        coreGrd.addColorStop(1, `rgba(93,213,237,0)`);
        ctx.fillStyle = coreGrd;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Phase 3: Final collapse to black (0.85 → 1) ──
      if (t > 0.85) {
        const blackT = (t - 0.85) / 0.15;
        const blackEase = blackT * blackT;
        ctx.fillStyle = `rgba(2,4,15,${Math.min(blackEase * 1.4, 1)})`;
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
    return () => cancelAnimationFrame(animFrameRef.current);
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
