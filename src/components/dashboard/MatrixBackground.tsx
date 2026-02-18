import { useEffect, useRef } from "react";

const FONT_SIZE = 13;    // small = more rows visible, still legible
const COL_GAP = 15;      // tight = many columns
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
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const initDrops = (w: number, h: number) => {
      const cols = Math.floor(w / COL_GAP) + 1;
      dropsRef.current = Array.from({ length: cols }, (_, i) => ({
        x: i * COL_GAP,
        y: Math.random() * -h,
        speed: 2.5 + Math.random() * 3.5,
        length: 14 + Math.floor(Math.random() * 22),
        brightness: 0,
      }));
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.imageSmoothingEnabled = false;
      initDrops(canvas.width, canvas.height);
    };

    const setMouse = (x: number, y: number) => { mouseRef.current = { x, y }; };
    const onMouseMove = (e: MouseEvent) => setMouse(e.clientX, e.clientY);
    const onMouseLeave = () => setMouse(-9999, -9999);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) setMouse(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => setMouse(-9999, -9999);

    const MOUSE_RADIUS = 240;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      // Slow fade — keeps more chars visible at once
      ctx.fillStyle = "rgba(4, 10, 20, 0.14)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bold monospace renders 0 and 1 distinctly at small sizes
      ctx.font = `bold ${FONT_SIZE}px 'Courier New', monospace`;
      ctx.textBaseline = "top";

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      dropsRef.current.forEach((drop) => {
        // X-only proximity — whole column lights up near cursor
        const dx = Math.abs(drop.x - mx);
        const xProx = Math.max(0, 1 - dx / MOUSE_RADIUS);
        const targetBrightness = xProx;
        const blendRate = targetBrightness > drop.brightness ? 0.4 : 0.07;
        drop.brightness += (targetBrightness - drop.brightness) * blendRate;

        for (let i = 0; i < drop.length; i++) {
          const charY = drop.y - i * FONT_SIZE;
          if (charY < -FONT_SIZE || charY > canvas.height) continue;

          const char = CHARS[Math.floor(Math.random() * CHARS.length)];
          const headFactor = Math.max(0, 1 - i / drop.length);
          const mouseLift = drop.brightness * 0.4 * headFactor;

          if (i === 0) {
            // Head — white-cyan, glowing
            ctx.fillStyle = "rgba(220, 255, 255, 1)";
            ctx.shadowColor = `rgba(0, 220, 255, ${0.9 + drop.brightness * 0.1})`;
            ctx.shadowBlur = 10 + drop.brightness * 18;
          } else if (i <= 4) {
            // Near-head — bright cyan, fully visible
            const alpha = Math.min(1, 0.92 - i * 0.04 + mouseLift);
            ctx.fillStyle = `rgba(0, 220, 255, ${alpha})`;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          } else {
            // Tail — dimmer cyan, minimum 0.45 so always legible
            const alpha = Math.min(1, Math.max(0.45, headFactor * 0.85 + mouseLift));
            const g = Math.round(160 + 60 * headFactor);
            const b = Math.round(200 + 55 * headFactor);
            ctx.fillStyle = `rgba(0, ${g}, ${b}, ${alpha})`;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }

          ctx.fillText(char, drop.x, charY);
        }

        ctx.shadowBlur = 0;
        drop.y += drop.speed;

        if (drop.y - drop.length * FONT_SIZE > canvas.height) {
          drop.y = -FONT_SIZE * 2 - Math.random() * 80;
          drop.speed = 2.5 + Math.random() * 3.5;
          drop.length = 14 + Math.floor(Math.random() * 22);
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
