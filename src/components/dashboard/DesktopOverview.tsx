import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Clock, PhoneCall, MessageSquare, Users, Building2,
  Zap, Mic, Brain, Image as ImageIcon, Radio, ToggleLeft,
  Activity, TrendingUp, PieChart as PieIcon, Share2,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

interface DesktopOverviewProps {
  businessName: string;
  /** Switches the dashboard's main view. Receives optional click coordinates so the
   *  parent can render an origin-anchored ripple (Gangmates-style expand animation). */
  openView: (viewId: string, originX?: number, originY?: number) => void;
}

const greetingForHour = (h: number) => {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatLongDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const formatRelativeTime = (ts: number) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const DesktopOverview = ({ businessName, openView }: DesktopOverviewProps) => {
  const [now, setNow] = useState(new Date());
  // Local press state so the clicked icon visibly "lifts" before the section opens
  const [pressedId, setPressedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Live data from Convex
  const callStats = useQuery(api.callHistory.stats) ?? { totalCalls: 0, incoming: 0, outgoing: 0, avgDuration: 0, totalDuration: 0 };
  const contactsCount = useQuery(api.contacts.count, {}) ?? 0;
  const conversations = useQuery(api.conversations.listWithMessages, { limit: 200 }) ?? [];
  const properties = useQuery(api.properties.list, {}) ?? [];
  const recentActivities = useQuery(api.activities.listRecent, { limit: 10 }) ?? [];
  const recentCalls = useQuery(api.callHistory.list, { limit: 100 }) ?? [];

  const greeting = greetingForHour(now.getHours());
  // Show the full business name (cleaned of separators), not just first segment.
  // Falls back to "there" if no business name was set.
  const displayName = businessName
    ? businessName.replace(/[_-]+/g, " ").trim() || "there"
    : "there";

  // === Calls trend (last 7 days) ===
  const callsTrend = useMemo(() => {
    const days: { day: string; calls: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = (recentCalls as any[]).filter((c) => {
        const t = c?._creationTime ?? c?.created_at ?? 0;
        return t >= d.getTime() && t < next.getTime();
      }).length;
      days.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        calls: count,
      });
    }
    return days;
  }, [recentCalls]);

  // === Channel split (donut) ===
  const channelSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    (conversations as any[]).forEach((c) => {
      const key = c?.channel || c?.platform || "Other";
      counts[key] = (counts[key] || 0) + 1;
    });
    const result = Object.entries(counts).map(([name, value]) => ({ name, value }));
    if (result.length === 0) return [{ name: "No data", value: 1 }];
    return result;
  }, [conversations]);

  const stats = [
    {
      label: "Total Calls",
      value: callStats.totalCalls ?? 0,
      sub: `${callStats.incoming ?? 0} in / ${callStats.outgoing ?? 0} out`,
      icon: PhoneCall,
      ringColor: "from-cyan-400 to-sky-400",
      iconBg: "from-cyan-500/20 to-sky-500/10",
      iconColor: "text-cyan-300",
      viewId: "phone-calls",
    },
    {
      label: "Conversations",
      value: conversations.length,
      sub: "Across all channels",
      icon: MessageSquare,
      ringColor: "from-cyan-400 to-teal-400",
      iconBg: "from-cyan-500/20 to-teal-500/10",
      iconColor: "text-cyan-300",
      viewId: "conversations",
    },
    {
      label: "Contacts",
      value: contactsCount,
      sub: "In your CRM",
      icon: Users,
      ringColor: "from-sky-400 to-cyan-400",
      iconBg: "from-sky-500/20 to-cyan-500/10",
      iconColor: "text-sky-300",
      viewId: "crm",
    },
    {
      label: "Properties",
      value: properties.length,
      sub: "Listed for sale/rent",
      icon: Building2,
      ringColor: "from-cyan-400 to-blue-400",
      iconBg: "from-cyan-500/20 to-blue-500/10",
      iconColor: "text-cyan-300",
      viewId: "properties",
    },
  ];

  // ALL Becca sections — clicking any opens that section full-bleed
  const quickActions = [
    { id: "master-switch", label: "Master Switch", icon: ToggleLeft },
    { id: "channels",      label: "Channels",      icon: Radio },
    { id: "properties",    label: "Properties",    icon: Building2 },
    { id: "crm",           label: "CRM",           icon: Users },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "phone-calls",   label: "Phone Calls",   icon: PhoneCall },
    { id: "logo-voice",    label: "Voice",         icon: Mic },
    { id: "ai-personality",label: "AI Personality",icon: Brain },
    { id: "hub-background",label: "Hub Design",    icon: ImageIcon },
    { id: "links",         label: "Links",         icon: Share2 },
  ];

  // Becca-native cyan palette across the whole overview (no purple/red/orange)
  const donutColors = ["#22d3ee", "#67e8f9", "#06b6d4", "#0ea5e9", "#7dd3fc", "#a5f3fc", "#0891b2"];

  const cardSurface = {
    background: "linear-gradient(145deg, rgba(8,22,44,0.85) 0%, rgba(4,14,32,0.8) 100%)",
    border: "1px solid rgba(0,230,255,0.12)",
    boxShadow: "0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
  } as const;

  const handleQuickActionClick = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setPressedId(id);
    const x = e.clientX;
    const y = e.clientY;
    // Brief lift before the view transitions, so the user sees the icon "expand"
    setTimeout(() => {
      openView(id, x, y);
      setPressedId(null);
    }, 160);
  };

  const handleStatClick = (viewId: string, e: React.MouseEvent<HTMLDivElement>) => {
    openView(viewId, e.clientX, e.clientY);
  };

  return (
    <div className="space-y-5">
      {/* === BECCA BRAIN PULSE — unique "AI assistant status" hero. Same purpose
              (greet user + situate them in the day) but reframed as Becca's live
              consciousness panel. Same height/density as before so layout below
              is undisturbed. === */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(4,20,40,0.85) 0%, rgba(8,30,60,0.92) 50%, rgba(4,18,38,0.88) 100%)",
          border: "1px solid rgba(0,230,255,0.22)",
          boxShadow:
            "0 12px 40px rgba(0,80,140,0.25), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,230,255,0.08)",
        }}
      >
        {/* Animated cyan blob top-left */}
        <div
          className="absolute -top-16 -left-12 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,230,255,0.18) 0%, rgba(0,230,255,0) 70%)",
            filter: "blur(28px)",
            animation: "becca-brain-blob 14s ease-in-out infinite",
          }}
        />
        {/* Animated cyan blob bottom-right */}
        <div
          className="absolute -bottom-20 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,180,220,0.14) 0%, rgba(0,180,220,0) 70%)",
            filter: "blur(32px)",
            animation: "becca-brain-blob 18s ease-in-out infinite reverse",
          }}
        />
        {/* Subtle scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,230,255,0.025) 3px, rgba(0,230,255,0.025) 4px)",
          }}
        />

        <div className="relative z-10 flex items-center justify-between gap-6">
          {/* LEFT: Pulsing brain core + greeting */}
          <div className="flex items-center gap-5 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 30% 30%, rgba(0,230,255,0.55) 0%, rgba(0,140,200,0.35) 50%, rgba(0,60,120,0.25) 100%)",
                  boxShadow: "0 0 30px rgba(0,230,255,0.45), inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,30,80,0.6)",
                }}>
                <Brain className="h-6 w-6 text-white drop-shadow-[0_0_8px_rgba(0,230,255,0.9)]" strokeWidth={2.2} />
              </div>
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: "2px solid rgba(0,230,255,0.5)",
                  animation: "becca-brain-pulse 2.5s ease-out infinite",
                }} />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                style={{
                  background: "#10b981",
                  boxShadow: "0 0 8px rgba(16,185,129,0.8), 0 0 0 2px rgba(4,20,40,1)",
                  animation: "becca-live-dot 1.6s ease-in-out infinite",
                }} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-cyan-300/80 tracking-[0.25em] uppercase">
                  Becca · Online
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase text-emerald-300"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  Live
                </span>
              </div>
              <h1 className="text-xl xl:text-2xl font-bold text-white tracking-tight truncate">
                <span className="capitalize">{greeting}, {displayName}.</span>
              </h1>
              <p className="text-xs text-cyan-100/65 mt-1 tracking-wide">
                {formatLongDate(now)} · Your AI is handling everything in the background.
              </p>
            </div>
          </div>

          {/* RIGHT: TODAY box (Calls | Convos) + Time pill */}
          {(() => {
            const todayStart = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
            const todayCalls = (recentCalls as any[]).filter((c: any) => (c?._creationTime ?? 0) >= todayStart).length;
            const todayConvos = (conversations as any[]).filter((c: any) => {
              const t = c?._creationTime ?? c?.last_message_at ?? c?.updated_at ?? 0;
              return t >= todayStart;
            }).length;
            return (
              <div className="flex items-stretch gap-2 flex-shrink-0">
                {/* Unified TODAY box: header + Calls | Convos divided */}
                <div className="rounded-xl overflow-hidden"
                  style={{
                    background: "linear-gradient(180deg, rgba(0,230,255,0.08) 0%, rgba(0,140,200,0.04) 100%)",
                    border: "1px solid rgba(0,230,255,0.18)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}>
                  <div className="flex items-center justify-center gap-1.5 px-3 py-1"
                    style={{
                      background: "rgba(0,230,255,0.06)",
                      borderBottom: "1px solid rgba(0,230,255,0.12)",
                    }}>
                    <Clock className="h-2.5 w-2.5 text-cyan-300/80" />
                    <span className="text-[9px] font-bold text-cyan-200/85 tracking-[0.22em] uppercase">Today</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="flex flex-col items-center justify-center px-4 py-2 min-w-[78px]"
                      style={{ borderRight: "1px solid rgba(0,230,255,0.12)" }}>
                      <div className="text-lg font-bold text-cyan-100 tabular-nums leading-none">{todayCalls}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <PhoneCall className="h-2.5 w-2.5 text-cyan-300/70" />
                        <span className="text-[9px] text-white/60 uppercase tracking-wider font-medium">Calls</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center px-4 py-2 min-w-[78px]">
                      <div className="text-lg font-bold text-cyan-100 tabular-nums leading-none">{todayConvos}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <MessageSquare className="h-2.5 w-2.5 text-cyan-300/70" />
                        <span className="text-[9px] text-white/60 uppercase tracking-wider font-medium">Convos</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time pill — kept separate */}
                <div className="flex flex-col items-center justify-center px-4 min-w-[92px] rounded-xl"
                  style={{
                    background: "linear-gradient(180deg, rgba(0,230,255,0.14) 0%, rgba(0,140,200,0.08) 100%)",
                    border: "1px solid rgba(0,230,255,0.3)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 16px rgba(0,230,255,0.12)",
                  }}>
                  <div className="text-base font-bold text-white tabular-nums leading-tight tracking-wide">
                    {formatTime(now)}
                  </div>
                  <div className="text-[9px] text-cyan-300/70 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Local
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* === STAT STRIP (clickable → opens related section) === */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const SIcon = s.icon;
          return (
            <div
              key={s.label}
              onClick={(e) => handleStatClick(s.viewId, e)}
              className="group relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99]"
              style={cardSurface}
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${s.ringColor} opacity-80`} />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: "radial-gradient(circle at top right, rgba(0,230,255,0.08), transparent 60%)" }}
              />
              <div className="relative flex items-start justify-between mb-3">
                <div
                  className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${s.iconBg}`}
                  style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)" }}
                >
                  <SIcon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
              </div>
              <div className="relative">
                <div className="text-3xl font-bold text-white tabular-nums leading-none">{s.value}</div>
                <div className="text-[13px] text-white/65 mt-2 font-medium">{s.label}</div>
                <div className="text-[11px] text-cyan-300/70 mt-1.5 tracking-wide">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* === QUICK ACTIONS + RECENT ACTIVITY === */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Quick Actions — ALL Becca sections, clicking opens that section */}
        <div className="xl:col-span-2 relative overflow-hidden rounded-2xl p-5" style={cardSurface}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white/80 tracking-wide">Quick Actions</h2>
            <span className="ml-auto text-[10px] text-cyan-300/60 tracking-wider uppercase">click to open</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {quickActions.map((qa) => {
              const QIcon = qa.icon;
              const isPressed = pressedId === qa.id;
              return (
                <button
                  key={qa.id}
                  onClick={(e) => handleQuickActionClick(qa.id, e)}
                  className={`group/qa relative overflow-hidden rounded-xl p-3.5 flex flex-col items-center gap-2.5
                    transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                    hover:-translate-y-0.5 active:scale-[0.95]
                    ${isPressed ? 'scale-[1.06] -translate-y-1' : ''}`}
                  style={{
                    background: isPressed
                      ? 'linear-gradient(145deg, rgba(0,230,255,0.18) 0%, rgba(0,180,220,0.10) 100%)'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isPressed ? 'rgba(0,230,255,0.45)' : 'rgba(0,230,255,0.1)'}`,
                    boxShadow: isPressed
                      ? '0 12px 32px rgba(0,230,255,0.25), 0 0 0 1px rgba(0,230,255,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  {/* Hover glow sweep */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover/qa:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at center, rgba(0,230,255,0.08), transparent 70%)' }}
                  />
                  {/* 3D Embossed Icon Tile — layered: outer ring → bevel highlight → inner gradient → glow ring → icon */}
                  <div
                    className={`relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300
                      ${isPressed ? 'scale-110 -translate-y-0.5' : 'group-hover/qa:scale-105'}`}
                    style={{
                      // Outer pressed/embossed effect: dark ring sitting in a "well"
                      background: isPressed
                        ? 'linear-gradient(145deg, rgba(0,230,255,0.55) 0%, rgba(0,140,200,0.35) 50%, rgba(0,90,150,0.20) 100%)'
                        : 'linear-gradient(145deg, rgba(0,230,255,0.32) 0%, rgba(0,150,210,0.18) 50%, rgba(0,90,160,0.10) 100%)',
                      // Multi-layer shadow stack creates physical depth:
                      //  · top inset highlight (bevel rim from above)
                      //  · bottom inset shadow (bevel rim from below)
                      //  · outer drop shadow (lifts off card)
                      //  · soft glow halo (cyan ambient)
                      boxShadow: isPressed
                        ? `inset 0 1.5px 0 rgba(255,255,255,0.45),
                           inset 0 -1.5px 2px rgba(0,40,80,0.5),
                           inset 0 0 0 1px rgba(0,230,255,0.35),
                           0 14px 28px -8px rgba(0,0,0,0.6),
                           0 4px 10px rgba(0,180,220,0.35),
                           0 0 30px rgba(0,230,255,0.4)`
                        : `inset 0 1.5px 0 rgba(255,255,255,0.30),
                           inset 0 -1.5px 2px rgba(0,30,70,0.55),
                           inset 0 0 0 1px rgba(0,230,255,0.18),
                           0 8px 20px -4px rgba(0,0,0,0.5),
                           0 2px 6px rgba(0,160,210,0.18),
                           0 0 14px rgba(0,230,255,0.10)`,
                    }}
                  >
                    {/* Inner glossy highlight — top half lighter to simulate light source */}
                    <div className="absolute top-0.5 left-1.5 right-1.5 h-1/2 rounded-t-xl pointer-events-none"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)',
                      }} />
                    {/* Inner pit ring — adds the "punched in" feel */}
                    <div className="absolute inset-1 rounded-xl pointer-events-none"
                      style={{
                        boxShadow: 'inset 0 0 0 1px rgba(0,40,80,0.25), inset 0 0 12px rgba(0,15,40,0.3)',
                      }} />
                    {/* Icon with its own depth shadow */}
                    <QIcon className={`relative h-6 w-6 transition-all duration-300
                      ${isPressed
                        ? 'text-white drop-shadow-[0_2px_4px_rgba(0,80,140,0.8)] drop-shadow-[0_0_10px_rgba(0,230,255,0.9)]'
                        : 'text-cyan-100 group-hover/qa:text-white drop-shadow-[0_2px_3px_rgba(0,60,110,0.6)] drop-shadow-[0_0_6px_rgba(0,230,255,0.45)]'}`}
                      strokeWidth={2.2} />
                  </div>
                  <span className={`text-[11px] font-medium text-center leading-tight transition-colors
                    ${isPressed ? 'text-cyan-100' : 'text-white/75 group-hover/qa:text-white'}`}>
                    {qa.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="relative overflow-hidden rounded-2xl p-5 flex flex-col" style={cardSurface}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white/80 tracking-wide">Recent Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3" style={{ maxHeight: 280 }}>
            {(recentActivities as any[]).length === 0 ? (
              <div className="text-xs text-white/40 italic py-8 text-center">No activity yet — your CRM events will show here.</div>
            ) : (
              (recentActivities as any[]).slice(0, 8).map((a: any, i: number) => (
                <div
                  key={a._id ?? i}
                  className="flex items-start gap-3 pb-3 border-b last:border-b-0"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                    style={{ background: "rgba(0,230,255,0.7)", boxShadow: "0 0 8px rgba(0,230,255,0.4)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white/85 font-medium truncate">{a.title || a.type || "Activity"}</div>
                    {a.description && (
                      <div className="text-[11px] text-white/50 line-clamp-1 mt-0.5">{a.description}</div>
                    )}
                    <div className="text-[10px] text-cyan-300/60 mt-1 tracking-wide">
                      {formatRelativeTime(a._creationTime || a.due_date || Date.now())}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* === CHARTS ROW === */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5" style={cardSurface}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white/80 tracking-wide">Calls — last 7 days</h2>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={callsTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,230,255,0.08)" />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} stroke="rgba(0,230,255,0.15)" />
                <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} stroke="rgba(0,230,255,0.15)" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(4,14,32,0.95)",
                    border: "1px solid rgba(0,230,255,0.25)",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                  }}
                  cursor={{ stroke: "rgba(0,230,255,0.2)" }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#22d3ee", strokeWidth: 2, stroke: "rgba(0,230,255,0.3)" }}
                  activeDot={{ r: 6, fill: "#67e8f9" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5" style={cardSurface}>
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white/80 tracking-wide">Channel Split</h2>
          </div>
          <div className="flex items-center gap-4" style={{ minHeight: 220 }}>
            <div style={{ width: "60%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={channelSplit}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="rgba(0,20,40,0.8)"
                    strokeWidth={2}
                  >
                    {channelSplit.map((_, i) => (
                      <Cell key={i} fill={donutColors[i % donutColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(4,14,32,0.95)",
                      border: "1px solid rgba(0,230,255,0.25)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {channelSplit.slice(0, 6).map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: donutColors[i % donutColors.length] }} />
                  <span className="text-white/80 capitalize truncate">{c.name}</span>
                  <span className="ml-auto text-white/50 tabular-nums">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopOverview;
