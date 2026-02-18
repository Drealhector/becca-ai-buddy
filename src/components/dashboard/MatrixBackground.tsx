import { useEffect, useRef } from "react";

const FONT_SIZE = 14;
const CHARS = "01";

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
  brightness: number; // 0-1, boosted by mouse proximity
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

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDrops();
    };

    const initDrops = () => {
      const cols = Math.floor(canvas.width / FONT_SIZE);
      dropsRef.current = Array.from({ length: cols }, (_, i) => ({
        x: i * FONT_SIZE,
        y: Math.random() * -canvas.height,
        speed: 0.6 + Math.random() * 1.4,
        length: 8 + Math.floor(Math.random() * 24),
        brightness: 0,
      }));
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    let lastTime = 0;
    const FRAME_INTERVAL = 1000 / 30; // 30fps for matrix feel

    const draw = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const delta = timestamp - lastTime;
      if (delta < FRAME_INTERVAL) return;
      lastTime = timestamp - (delta % FRAME_INTERVAL);

      // Dark fade trail — maintain current dark navy background hue
      ctx.fillStyle = "rgba(4, 10, 20, 0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px 'Courier New', monospace`;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const MOUSE_RADIUS = 180;

      dropsRef.current.forEach((drop) => {
        // Mouse proximity boost
        const dx = drop.x - mx;
        const dy = drop.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.max(0, 1 - dist / MOUSE_RADIUS);

        // Smoothly blend brightness
        const targetBrightness = proximity;
        drop.brightness += (targetBrightness - drop.brightness) * 0.12;

        // Draw the column of chars
        for (let i = 0; i < drop.length; i++) {
          const charY = drop.y - i * FONT_SIZE;
          if (charY < -FONT_SIZE || charY > canvas.height + FONT_SIZE) continue;

          const char = CHARS[Math.floor(Math.random() * CHARS.length)];

          // Head char: bright white-green, tail fades to dim green
          const headFactor = i === 0 ? 1 : Math.max(0, 1 - i / drop.length);

          if (i === 0) {
            // Glowing head
            const boost = drop.brightness * 0.7;
            ctx.fillStyle = `rgba(${180 + Math.round(75 * boost)}, 255, ${180 + Math.round(75 * boost)}, ${0.95 + boost * 0.05})`;
            ctx.shadowColor = drop.brightness > 0.3
              ? `rgba(100, 255, 150, ${0.9 * drop.brightness})`
              : "rgba(0, 255, 70, 0.8)";
            ctx.shadowBlur = 10 + drop.brightness * 20;
          } else {
            // Trail — dimmer green, mouse makes it brighter
            const alpha = headFactor * (0.15 + 0.6 * headFactor) + drop.brightness * 0.3 * headFactor;
            const green = Math.round(140 + 80 * headFactor + 35 * drop.brightness);
            ctx.fillStyle = `rgba(0, ${green}, 40, ${alpha})`;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }

          ctx.fillText(char, drop.x, charY);
        }

        // Reset shadow
        ctx.shadowBlur = 0;

        // Advance drop
        drop.y += drop.speed;

        // Reset when out of screen
        if (drop.y - drop.length * FONT_SIZE > canvas.height) {
          drop.y = Math.random() * -120;
          drop.speed = 0.6 + Math.random() * 1.4;
          drop.length = 8 + Math.floor(Math.random() * 24);
        }
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("resize", resize);

    resize();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
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
