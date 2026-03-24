import { useState, useRef, useCallback } from "react";
import { Info, X, Zap } from "lucide-react";

interface SectionCardProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  infoText: string;
  children: React.ReactNode;
  className?: string;
}

const SectionCard = ({ id, title, icon: Icon, infoText, children, className = "" }: SectionCardProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRipple(null), 800);
  };

  // 3D tilt on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -4, y: x * 4 });
  }, []);

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div className={`scifi-card-wrapper ${className}`} style={{ perspective: '1200px' }}>
      <div
        id={id}
        ref={cardRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group/card relative rounded-xl overflow-visible
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          active:scale-[0.997]"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(145deg, rgba(6,18,36,0.8) 0%, rgba(4,12,28,0.75) 40%, rgba(8,22,44,0.7) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0,230,255,0.1)',
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.4),
            0 2px 8px rgba(0,0,0,0.3),
            0 0 1px rgba(0,230,255,0.2),
            0 -1px 0 rgba(255,255,255,0.04) inset,
            0 1px 0 rgba(0,0,0,0.3) inset
          `,
        }}
      >
        {/* === EMBOSSED TOP HIGHLIGHT === */}
        <div className="absolute top-0 left-0 right-0 h-12 rounded-t-xl pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
          }}
        />

        {/* Click ripple */}
        {ripple && (
          <div className="absolute pointer-events-none z-30"
            style={{
              left: ripple.x - 60, top: ripple.y - 60,
              width: 120, height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,230,255,0.2) 0%, rgba(0,230,255,0.05) 40%, transparent 70%)',
              animation: 'scifi-ripple 0.8s cubic-bezier(0.23,1,0.32,1) forwards',
            }}
          />
        )}

        {/* Sweeping border glow */}
        <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden rounded-t-xl">
          <div className="h-full w-[40%] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent
            translate-x-[-100%] group-hover/card:translate-x-[350%] transition-transform duration-[1.5s] ease-in-out" />
        </div>

        {/* Glass reflection sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-10">
          <div className="absolute top-0 -left-[120%] w-[60%] h-full skew-x-[-15deg]
            bg-gradient-to-r from-transparent via-white/[0.025] to-transparent
            group-hover/card:left-[160%] transition-all duration-[1.2s] ease-[cubic-bezier(0.23,1,0.32,1)]" />
        </div>

        {/* Corner brackets */}
        <svg className="absolute top-1.5 left-1.5 w-3 h-3 text-cyan-500/0 group-hover/card:text-cyan-500/30 transition-all duration-500" viewBox="0 0 12 12"><path d="M0 4V0h4" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        <svg className="absolute top-1.5 right-1.5 w-3 h-3 text-cyan-500/0 group-hover/card:text-cyan-500/30 transition-all duration-500" viewBox="0 0 12 12"><path d="M12 4V0H8" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        <svg className="absolute bottom-1.5 left-1.5 w-3 h-3 text-cyan-500/0 group-hover/card:text-cyan-500/30 transition-all duration-500" viewBox="0 0 12 12"><path d="M0 8v4h4" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        <svg className="absolute bottom-1.5 right-1.5 w-3 h-3 text-cyan-500/0 group-hover/card:text-cyan-500/30 transition-all duration-500" viewBox="0 0 12 12"><path d="M12 8v4H8" fill="none" stroke="currentColor" strokeWidth="1"/></svg>

        {/* === SECTION HEADER === */}
        <div className="relative flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="flex items-center gap-3">
            {/* 3D icon container */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg
              transition-all duration-500 group-hover/card:shadow-[0_0_16px_rgba(0,230,255,0.15)]"
              style={{
                background: 'linear-gradient(135deg, rgba(0,230,255,0.12) 0%, rgba(0,180,220,0.06) 100%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.1)',
              }}>
              <Icon className="h-4 w-4 text-cyan-400/80 group-hover/card:text-cyan-300 transition-all duration-300
                group-hover/card:drop-shadow-[0_0_4px_rgba(0,230,255,0.5)]" />
            </div>
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-[0.15em]
              group-hover/card:text-white/90 transition-colors duration-300
              group-hover/card:drop-shadow-[0_0_8px_rgba(0,230,255,0.15)]">{title}</h2>
          </div>

          {/* Info button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
            className={`relative p-1.5 rounded-lg transition-all duration-300 active:scale-75
              ${showInfo
                ? 'text-cyan-300 bg-cyan-500/15 shadow-[0_0_12px_rgba(0,230,255,0.25),0_0_4px_rgba(0,230,255,0.4)]'
                : 'text-white/25 hover:text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_10px_rgba(0,230,255,0.1)]'
              }`}
          >
            {showInfo
              ? <X className="h-3.5 w-3.5" />
              : <Info className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* === 3D HOLOGRAPHIC INFO PROJECTION === */}
        <div
          className={`transition-all ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
            ${showInfo ? 'holo-open' : 'holo-closed'}`}
          style={{
            transformOrigin: 'top center',
            transform: showInfo ? 'perspective(800px) rotateX(0deg) scaleY(1)' : 'perspective(800px) rotateX(-90deg) scaleY(0)',
            opacity: showInfo ? 1 : 0,
            maxHeight: showInfo ? '200px' : '0px',
            transition: 'transform 0.5s cubic-bezier(0.23,1,0.32,1), opacity 0.4s ease, max-height 0.5s cubic-bezier(0.23,1,0.32,1)',
          }}
        >
          <div className="relative px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, rgba(0,230,255,0.06) 0%, rgba(0,100,200,0.04) 50%, rgba(0,230,255,0.03) 100%)',
              borderBottom: '1px solid rgba(0,230,255,0.1)',
            }}>
            {/* Scan lines */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,230,255,0.02) 3px, rgba(0,230,255,0.02) 4px)',
                animation: showInfo ? 'scanlines 8s linear infinite' : 'none',
              }} />

            {/* Left glow bar */}
            <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,230,255,0.5) 30%, rgba(0,230,255,0.8) 50%, rgba(0,230,255,0.5) 70%, transparent 100%)',
                boxShadow: '0 0 10px rgba(0,230,255,0.4), 0 0 20px rgba(0,230,255,0.15)',
                animation: showInfo ? 'holo-bar-pulse 2s ease-in-out infinite' : 'none',
              }} />

            {/* Top glow line */}
            <div className="absolute top-0 left-[10%] right-[10%] h-[1px]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(0,230,255,0.3), transparent)',
                boxShadow: '0 0 6px rgba(0,230,255,0.2)',
              }} />

            <div className="relative flex items-start gap-3 pl-3">
              <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
                style={{
                  background: 'rgba(0,230,255,0.1)',
                  boxShadow: '0 0 8px rgba(0,230,255,0.15)',
                }}>
                <Zap className="h-3 w-3 text-cyan-400" />
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed tracking-wide"
                style={{
                  textShadow: '0 0 20px rgba(0,230,255,0.1)',
                }}>{infoText}</p>
            </div>

            {/* Bottom data dots */}
            <div className="flex gap-1 mt-3 pl-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-cyan-400/30"
                  style={{
                    animation: showInfo ? `data-dot 1.5s ease-in-out ${i * 0.1}s infinite` : 'none',
                  }} />
              ))}
            </div>
          </div>
        </div>

        {/* === CONTENT === */}
        <div className="relative p-4">
          {children}
        </div>

        {/* Bottom glow */}
        <div className="absolute bottom-0 left-[20%] right-[20%] h-[1px]
          bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent
          group-hover/card:via-cyan-500/25 transition-all duration-700" />

        {/* Bottom shadow for float effect */}
        <div className="absolute -bottom-2 left-[15%] right-[15%] h-4 rounded-full pointer-events-none
          bg-cyan-500/0 group-hover/card:bg-cyan-500/[0.02] blur-md transition-all duration-500" />
      </div>

      <style>{`
        @keyframes scifi-ripple {
          0% { transform: scale(0); opacity: 1; }
          50% { opacity: 0.6; }
          100% { transform: scale(8); opacity: 0; }
        }
        @keyframes scanlines {
          0% { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }
        @keyframes holo-bar-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes data-dot {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); background: rgba(0,230,255,0.6); }
        }
      `}</style>
    </div>
  );
};

export default SectionCard;
