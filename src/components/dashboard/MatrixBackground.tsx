import { useEffect, useRef } from "react";

const FONT_SIZE = 15;   // readable size
const COL_GAP = 16;     // dense columns
const CHARS = "01";

interface Column {
  x: number;
  headRow: number;
  tailLength: number;
  speed: number;        // rows per second
  chars: string[];
  brightness: number;
}

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cols: Column[] = [];
    let numRows = 0;

    const makeCol = (i: number, h: number, stagger = true): Column => {
      const tailLen = 12 + Math.floor(Math.random() * 16);
      return {
        x: i * COL_GAP,
        headRow: stagger ? -Math.random() * Math.floor(h / FONT_SIZE) : -2,
        tailLength: tailLen,
        speed: 10 + Math.random() * 14,
        chars: Array.from({ length: tailLen }, () =>
          CHARS[Math.floor(Math.random() * CHARS.length)]
        ),
        brightness: 0,
      };
    };

    const initCols = (w: number, h: number) => {
      numRows = Math.floor(h / FONT_SIZE) + 2;
      const numCols = Math.floor(w / COL_GAP) + 1;
      cols = Array.from({ length: numCols }, (_, i) => makeCol(i, h, true));
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initCols(canvas.width, canvas.height);
    };

    const setMouse = (x: number, y: number) => { mouseRef.current = { x, y }; };
    const onMouseMove = (e: MouseEvent) => setMouse(e.clientX, e.clientY);
    const onMouseLeave = () => setMouse(-9999, -9999);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0)
        setMouse(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => setMouse(-9999, -9999);

    const MOUSE_RADIUS = 250;
    let lastTime = performance.now();

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // ── Full clear each frame ─────────────────────────────────────────────
      // This is the key: no fade overlay, no ghosting, every char is pixel-crisp
      ctx.fillStyle = "rgb(4, 10, 20)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${FONT_SIZE}px 'Courier New', monospace`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";

      const mx = mouseRef.current.x;

      cols.forEach((col, ci) => {
        // ── Advance head ──
        col.headRow += col.speed * dt;

        // Occasionally scramble a char in the trail for flicker effect
        if (Math.random() < 0.15) {
          const idx = Math.floor(Math.random() * col.chars.length);
          col.chars[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
        }

        // Reset when fully off screen
        if (col.headRow - col.tailLength > numRows) {
          const newCol = makeCol(ci, canvas.height, false);
          col.headRow = newCol.headRow;
          col.tailLength = newCol.tailLength;
          col.speed = newCol.speed;
          col.chars = newCol.chars;
        }

        // ── Mouse brightness (X-only so full column reacts) ──
        const dx = Math.abs(col.x - mx);
        const xProx = Math.max(0, 1 - dx / MOUSE_RADIUS);
        col.brightness += (xProx - col.brightness) * (xProx > col.brightness ? 0.4 : 0.07);

        const headRow = Math.floor(col.headRow);

        // ── Draw trail from head backward ──
        for (let i = 0; i < col.tailLength; i++) {
          const row = headRow - i;
          if (row < 0 || row >= numRows) continue;

          const y = row * FONT_SIZE;
          const char = col.chars[i] ?? "0";
          // fade: 1.0 at head, 0.0 at tail end
          const fade = 1 - i / col.tailLength;

          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";

          if (i === 0) {
            // Head — white-cyan, crisp glow
            ctx.fillStyle = "rgba(230, 255, 255, 1)";
            ctx.shadowColor = `rgba(0, 230, 255, ${0.85 + col.brightness * 0.15})`;
            ctx.shadowBlur = 10 + col.brightness * 14;
          } else if (i <= 3) {
            // Near-head — bright full cyan, fully opaque
            const alpha = 1 - i * 0.08 + col.brightness * 0.08;
            ctx.fillStyle = `rgba(0, 230, 255, ${Math.min(1, alpha)})`;
          } else {
            // Tail — pure cyan (0, 230, 255), only alpha fades — no green tint ever
            const alpha = Math.max(0.5, fade * 0.88 + col.brightness * 0.12);
            ctx.fillStyle = `rgba(0, 230, 255, ${alpha})`;
          }

          ctx.fillText(char, col.x, y);
        }
      });

      ctx.shadowBlur = 0;
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
