import { useState, useRef, useCallback, useEffect } from "react";
import { Info, X, Zap, ChevronRight, EyeOff } from "lucide-react";

interface SectionCardProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  infoText: string;
  children: React.ReactNode;
  className?: string;
  alwaysOpen?: boolean;
}

const SectionCard = ({ id, title, icon: Icon, infoText, children, className = "", alwaysOpen = false }: SectionCardProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [isRevealed, setIsRevealed] = useState(alwaysOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Show hint briefly when section is revealed
  useEffect(() => {
    if (isRevealed && !alwaysOpen) {
      // Small delay so the reveal animation completes first
      const showTimer = setTimeout(() => setShowHint(true), 300);
      const hideTimer = setTimeout(() => setShowHint(false), 4000);
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
    } else {
      setShowHint(false);
    }
  }, [isRevealed, alwaysOpen]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRipple(null), 800);

    // Toggle reveal (unless alwaysOpen or clicking interactive elements)
    if (!alwaysOpen) {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking buttons, inputs, switches, selects, or other interactive elements
      if (target.closest('button, input, select, textarea, [role="switch"], [role="combobox"], [role="option"], a, label')) return;

      setIsAnimating(true);
      setIsRevealed(prev => !prev);
      setTimeout(() => setIsAnimating(false), 700);
    }
  };

  // 3D tilt on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -4, y: x * 4 });
  }, []);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => { setTilt({ x: 0, y: 0 }); setIsHovered(false); };

  const isOpen = alwaysOpen || isRevealed;

  return (
    <div className={`scifi-card-wrapper h-full ${className}`} style={{ perspective: '1200px', animation: `card-float ${5 + (id.length % 3)}s ease-in-out infinite`, animationDelay: `${(id.charCodeAt(0) % 5) * 0.6}s` }}>
      <div
        id={id}
        ref={cardRef}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`group/card relative rounded-xl overflow-hidden h-full flex flex-col
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          active:scale-[0.997]
          ${!alwaysOpen && !isRevealed ? 'cursor-pointer' : ''}`}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(145deg, rgba(6,18,36,0.8) 0%, rgba(4,12,28,0.75) 40%, rgba(8,22,44,0.7) 100%)',
          backdropFilter: 'blur(24px)',
          border: `1px solid ${isOpen && !alwaysOpen ? 'rgba(0,230,255,0.18)' : 'rgba(0,230,255,0.1)'}`,
          boxShadow: isOpen && !alwaysOpen
            ? `0 8px 40px rgba(0,230,255,0.08), 0 2px 8px rgba(0,0,0,0.3), 0 0 1px rgba(0,230,255,0.3), 0 -1px 0 rgba(255,255,255,0.04) inset, 0 1px 0 rgba(0,0,0,0.3) inset`
            : `0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), 0 0 1px rgba(0,230,255,0.2), 0 -1px 0 rgba(255,255,255,0.04) inset, 0 1px 0 rgba(0,0,0,0.3) inset`,
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
        <svg className="absolute top-1.5 left-1.5 w-3 h-3 text-cyan-500/0 group-hover/card:text-cyan-500/30 transition-all duration-500 z-20" viewBox="0 0 12 12"><path d="M0 4V0h4" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        <svg className="absolute top-1.5 right-1.5 w-3 h-3 text-cyan-500/0 group-hover/card:text-cyan-500/30 transition-all duration-500 z-20" viewBox="0 0 12 12"><path d="M12 4V0H8" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        <svg className="absolute bottom-1.5 left-1.5 w-3 h-3 text-cyan-500/0 group-hover/card:text-cyan-500/30 transition-all duration-500 z-20" viewBox="0 0 12 12"><path d="M0 8v4h4" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        <svg className="absolute bottom-1.5 right-1.5 w-3 h-3 text-cyan-500/0 group-hover/card:text-cyan-500/30 transition-all duration-500 z-20" viewBox="0 0 12 12"><path d="M12 8v4H8" fill="none" stroke="currentColor" strokeWidth="1"/></svg>

        {/* === SECTION HEADER === */}
        <div className="relative flex items-center justify-between px-4 py-3 z-20"
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

          <div className="flex items-center gap-2">
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

            {/* Reveal indicator (not for alwaysOpen) */}
            {!alwaysOpen && (
              <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isRevealed ? 'rotate-90' : 'rotate-0'}`}>
                <ChevronRight className={`h-4 w-4 transition-colors duration-300 ${isRevealed ? 'text-cyan-400' : 'text-white/20 group-hover/card:text-white/40'}`} />
              </div>
            )}
          </div>
        </div>

        {/* === 3D HOLOGRAPHIC INFO PROJECTION === */}
        <div
          className={`transition-all ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden z-20 relative
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

        {/* === CONTENT AREA WITH BLURRED MIRROR === */}
        <div className="relative flex flex-col overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ maxHeight: isOpen ? '2000px' : '180px' }}
        >

          {/* Layer B — Actual Content (always in DOM for sizing) */}
          <div
            className="relative p-4 flex-1 flex flex-col overflow-y-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              opacity: isOpen ? 1 : (isHovered && !isRevealed ? 0.18 : 0),
              transform: isOpen
                ? 'perspective(800px) rotateX(0deg) scale(1) translateY(0)'
                : isHovered && !isRevealed
                  ? 'perspective(800px) rotateX(-3deg) scale(0.98) translateY(4px)'
                  : 'perspective(800px) rotateX(-8deg) scale(0.96) translateY(8px)',
              transformOrigin: 'top center',
              filter: isOpen ? 'none' : 'blur(1px)',
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          >
            {children}
          </div>

          {/* Layer A — Blurred Mirror Overlay (visible when closed) */}
          {!alwaysOpen && (
            <div
              className={`absolute inset-0 z-15 flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
              style={{
                opacity: isOpen ? 0 : 1,
                backdropFilter: isOpen ? 'blur(0px)' : (isHovered ? 'blur(4px)' : 'blur(14px)'),
                WebkitBackdropFilter: isOpen ? 'blur(0px)' : (isHovered ? 'blur(4px)' : 'blur(14px)'),
                background: isOpen
                  ? 'transparent'
                  : isHovered
                    ? 'linear-gradient(165deg, rgba(8,20,40,0.25) 0%, rgba(4,14,32,0.35) 30%, rgba(6,16,36,0.3) 60%, rgba(10,24,48,0.2) 100%)'
                    : 'linear-gradient(165deg, rgba(8,20,40,0.6) 0%, rgba(4,14,32,0.75) 30%, rgba(6,16,36,0.65) 60%, rgba(10,24,48,0.55) 100%)',
                transform: isOpen ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* Frosted glass noise texture */}
              <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
                }} />

              {/* Animated scanlines on mirror */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,230,255,0.015) 2px, rgba(0,230,255,0.015) 3px)',
                    animation: 'mirror-scanlines 10s linear infinite',
                  }} />
              </div>

              {/* Reflection spots */}
              <div className="absolute top-[15%] left-[20%] w-32 h-32 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(0,230,255,0.04) 0%, transparent 70%)',
                  animation: 'reflection-float 6s ease-in-out infinite',
                }} />
              <div className="absolute bottom-[20%] right-[15%] w-24 h-24 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(100,180,255,0.03) 0%, transparent 70%)',
                  animation: 'reflection-float 8s ease-in-out infinite reverse',
                }} />

              {/* Center content — icon + description (fades on hover to show projection) */}
              <div className={`relative flex flex-col items-center gap-4 px-8 max-w-sm text-center transition-all duration-500 ${isHovered && !isRevealed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Floating icon */}
                <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,230,255,0.08) 0%, rgba(0,180,220,0.04) 100%)',
                    border: '1px solid rgba(0,230,255,0.1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2), 0 0 30px rgba(0,230,255,0.05)',
                    animation: 'icon-float 3s ease-in-out infinite',
                  }}>
                  <Icon className="h-6 w-6 text-cyan-400/60" />
                  {/* Icon glow ring */}
                  <div className="absolute inset-0 rounded-2xl"
                    style={{
                      boxShadow: '0 0 20px rgba(0,230,255,0.08), inset 0 0 20px rgba(0,230,255,0.03)',
                      animation: 'glow-ring 3s ease-in-out infinite',
                    }} />
                </div>

                {/* Description text */}
                <p className="text-[11px] text-white/35 leading-relaxed tracking-wide group-hover/card:text-white/50 transition-colors duration-500"
                  style={{ textShadow: '0 0 15px rgba(0,230,255,0.05)' }}>
                  {infoText}
                </p>

                {/* "Click to access" indicator */}
                <div className="flex items-center gap-2 mt-1"
                  style={{ animation: 'access-pulse 2.5s ease-in-out infinite' }}>
                  <div className="w-1 h-1 rounded-full bg-cyan-400/30" />
                  <span className="text-[9px] text-cyan-400/25 uppercase tracking-[0.25em] font-medium">
                    Click to access
                  </span>
                  <div className="w-1 h-1 rounded-full bg-cyan-400/30" />
                </div>
              </div>

              {/* Bottom edge glow on hover */}
              <div className="absolute bottom-0 left-[10%] right-[10%] h-[1px]
                bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent
                group-hover/card:via-cyan-500/20 transition-all duration-700" />
            </div>
          )}

          {/* Layer C — Projection animation overlay (during reveal transition) */}
          {isAnimating && (
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-b-xl">
              {/* Holographic grid sweep */}
              <div className="absolute inset-0"
                style={{
                  backgroundImage: isRevealed
                    ? 'linear-gradient(0deg, rgba(0,230,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,255,0.03) 1px, transparent 1px)'
                    : 'none',
                  backgroundSize: '20px 20px',
                  animation: 'holo-grid-reveal 0.7s cubic-bezier(0.23,1,0.32,1) forwards',
                }} />

              {/* Cyan glow burst */}
              <div className="absolute inset-0"
                style={{
                  background: isRevealed
                    ? 'radial-gradient(ellipse at center top, rgba(0,230,255,0.1) 0%, transparent 60%)'
                    : 'radial-gradient(ellipse at center top, rgba(0,230,255,0.05) 0%, transparent 60%)',
                  animation: 'glow-burst 0.7s cubic-bezier(0.23,1,0.32,1) forwards',
                }} />

              {/* Horizontal wipe line */}
              <div className="absolute left-0 right-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, transparent 10%, rgba(0,230,255,0.5) 50%, transparent 90%)',
                  boxShadow: '0 0 15px rgba(0,230,255,0.3), 0 0 30px rgba(0,230,255,0.1)',
                  animation: isRevealed
                    ? 'wipe-down 0.6s cubic-bezier(0.23,1,0.32,1) forwards'
                    : 'wipe-up 0.6s cubic-bezier(0.23,1,0.32,1) forwards',
                }} />
            </div>
          )}
        </div>

        {/* "Tap to collapse" hint — fixed toast on mobile, absolute on desktop */}
        {!alwaysOpen && showHint && (
          <div
            className="fixed top-20 left-1/2 z-[100] lg:absolute lg:top-auto lg:bottom-4 flex items-center gap-1.5 px-4 py-2 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(0,20,40,0.9) 0%, rgba(0,15,35,0.95) 100%)',
              border: '1px solid rgba(0,230,255,0.2)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 20px rgba(0,230,255,0.12)',
              backdropFilter: 'blur(12px)',
              transform: 'translateX(-50%)',
              animation: 'hint-pop 0.4s cubic-bezier(0.23,1,0.32,1) forwards',
            }}
          >
            <EyeOff className="h-3 w-3 text-cyan-400/80" />
            <span className="text-[11px] text-cyan-300/80 font-medium tracking-wide whitespace-nowrap">
              Tap anywhere to collapse
            </span>
          </div>
        )}

        {/* Bottom glow */}
        <div className="absolute bottom-0 left-[20%] right-[20%] h-[1px]
          bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent
          group-hover/card:via-cyan-500/25 transition-all duration-700" />

        {/* Bottom shadow for float effect */}
        <div className="absolute -bottom-2 left-[15%] right-[15%] h-4 rounded-full pointer-events-none
          bg-cyan-500/0 group-hover/card:bg-cyan-500/[0.02] blur-md transition-all duration-500" />
      </div>

      <style>{`
        @keyframes hint-pop {
          0% { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.9); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes card-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
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
        @keyframes mirror-scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(100px); }
        }
        @keyframes shimmer-line {
          0%, 100% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 85%; }
        }
        @keyframes reflection-float {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(10px, -8px) scale(1.1); opacity: 1; }
        }
        @keyframes icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes glow-ring {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes access-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes holo-grid-reveal {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        @keyframes glow-burst {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes wipe-down {
          0% { top: 0%; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes wipe-up {
          0% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SectionCard;
