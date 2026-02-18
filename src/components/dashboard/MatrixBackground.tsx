import { useEffect, useRef } from "react";

const FONT_SIZE = 16;
const COL_GAP = 18;        // tighter columns = denser grid
const CHARS = "01";

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
  brightness: number;
}

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const dropsRef = useRef<Drop[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const initDrops = (w: number, h: number) => {
      const cols = Math.floor(w / COL_GAP) + 1;
      dropsRef.current = Array.from({ length: cols }, (_, i) => ({
        x: i * COL_GAP,
        y: Math.random() * -h,          // stagger start positions
        speed: 3 + Math.random() * 4,   // fast: 3–7 px/frame at 60fps
        length: 12 + Math.floor(Math.random() * 20),
        brightness: 0,
      }));
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDrops(canvas.width, canvas.height);
    };

    // ── Mouse tracking ──────────────────────────────────────────────────────
    const setMouse = (x: number, y: number) => {
      mouseRef.current = { x, y };
    };

    const onMouseMove = (e: MouseEvent) => setMouse(e.clientX, e.clientY);
    const onMouseLeave = () => setMouse(-9999, -9999);

    // Touch support for mobile
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => setMouse(-9999, -9999);

    // ── Draw loop ───────────────────────────────────────────────────────────
    const MOUSE_RADIUS = 220; // how wide the glow zone is

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      // Semi-transparent overlay fades old chars (controls trail length)
      ctx.fillStyle = "rgba(4, 10, 20, 0.25)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${FONT_SIZE}px 'Courier New', monospace`;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      dropsRef.current.forEach((drop) => {
        // ── Mouse reactivity: use only X distance ──
        // This means ANY column near the cursor lights up, regardless of
        // where the drop head currently is.
        const dx = Math.abs(drop.x - mx);
        const xProx = Math.max(0, 1 - dx / MOUSE_RADIUS);

        // Also add mild y-softening so it's not a hard vertical band
        const dy = Math.abs(drop.y - my);
        const yProx = Math.max(0, 1 - dy / (canvas.height * 0.6));

        const targetBrightness = xProx * (0.5 + yProx * 0.5);
        // Snap brightness up fast, decay slowly — snappy feel
        const blendRate = targetBrightness > drop.brightness ? 0.35 : 0.08;
        drop.brightness += (targetBrightness - drop.brightness) * blendRate;

        // ── Draw column chars from head downward ──
        for (let i = 0; i < drop.length; i++) {
          const charY = drop.y - i * FONT_SIZE;
          if (charY < -FONT_SIZE || charY > canvas.height + FONT_SIZE) continue;

          const char = CHARS[Math.floor(Math.random() * CHARS.length)];
          const headFactor = Math.max(0, 1 - i / drop.length);

          if (i === 0) {
            // Glowing head — white-green, extra bright near mouse
            const r = Math.round(180 + 75 * drop.brightness);
            ctx.fillStyle = `rgba(${r}, 255, ${Math.round(180 + 50 * drop.brightness)}, 1)`;
            ctx.shadowColor = `rgba(80, 255, 120, ${0.8 + 0.2 * drop.brightness})`;
            ctx.shadowBlur = 14 + drop.brightness * 22;
          } else {
            // Trail — bright green body, fades toward tail
            const alpha = headFactor * 0.85 + drop.brightness * 0.15;
            const green = Math.round(160 + 80 * headFactor + 15 * drop.brightness);
            const red = Math.round(0 + 30 * drop.brightness * headFactor);
            ctx.fillStyle = `rgba(${red}, ${green}, 50, ${alpha})`;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }

          ctx.fillText(char, drop.x, charY);
        }

        ctx.shadowBlur = 0;

        // ── Advance drop ──
        drop.y += drop.speed;

        if (drop.y - drop.length * FONT_SIZE > canvas.height) {
          drop.y = -FONT_SIZE * 2 - Math.random() * 60;
          drop.speed = 3 + Math.random() * 4;
          drop.length = 12 + Math.floor(Math.random() * 20);
        }
      });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", resize);

    resize();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
};

export default MatrixBackground;
