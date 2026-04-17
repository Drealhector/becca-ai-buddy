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

interface MobileOverviewProps {
  businessName: string;
  openView: (viewId: string, originX?: number, originY?: number) => void;
}

const greetingForHour = (h: number) => {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatShortDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const formatRelativeTime = (ts: number) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

const MobileOverview = ({ businessName, openView }: MobileOverviewProps) => {
  const [now, setNow] = useState(new Date());
  const [pressedId, setPressedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Live data
  const callStats = useQuery(api.callHistory.stats) ?? { totalCalls: 0, incoming: 0, outgoing: 0, avgDuration: 0, totalDuration: 0 };
  const contactsCount = useQuery(api.contacts.count, {}) ?? 0;
  const conversations = useQuery(api.conversations.listWithMessages, { limit: 200 }) ?? [];
  const properties = useQuery(api.properties.list, {}) ?? [];
  const recentActivities = useQuery(api.activities.listRecent, { limit: 10 }) ?? [];
  const recentCalls = useQuery(api.callHistory.list, { limit: 100 }) ?? [];

  const greeting = greetingForHour(now.getHours());
  const displayName = businessName
    ? businessName.replace(/[_-]+/g, " ").trim() || "there"
    : "there";

  // 7-day trend
  const callsTrend = useMemo(() => {
    const days: { day: string; calls: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = (recentCalls as any[]).filter((c) => {
        const t = c?._creationTime ?? 0;
        return t >= d.getTime() && t < next.getTime();
      }).length;
      days.push({ day: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1), calls: count });
    }
    return days;
  }, [recentCalls]);

  // Channel split
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

  // Both metrics filtered to TODAY (since midnight)
  const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const todayCallsCount = (recentCalls as any[]).filter((c: any) => (c?._creationTime ?? 0) >= todayStart).length;
  const todayConvosCount = (conversations as any[]).filter((c: any) => {
    const t = c?._creationTime ?? c?.last_message_at ?? c?.updated_at ?? 0;
    return t >= todayStart;
  }).length;

  const stats = [
    { label: "Calls",   value: callStats.totalCalls ?? 0,  icon: PhoneCall,     viewId: "phone-calls"   },
    { label: "Convos",  value: conversations.length,       icon: MessageSquare, viewId: "conversations" },
    { label: "Contacts",value: contactsCount,              icon: Users,         viewId: "crm"           },
    { label: "Listings",value: properties.length,          icon: Building2,     viewId: "properties"    },
  ];

  const quickActions = [
    { id: "master-switch", label: "Master Switch", icon: ToggleLeft },
    { id: "channels",      label: "Channels",      icon: Radio },
    { id: "properties",    label: "Properties",    icon: Building2 },
    { id: "crm",           label: "CRM",           icon: Users },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "phone-calls",   label: "Phone Calls",   icon: PhoneCall },
    { id: "logo-voice",    label: "Voice",         icon: Mic },
    { id: "ai-personality",label: "AI",            icon: Brain },
    { id: "hub-background",label: "Hub Design",    icon: ImageIcon },
    { id: "links",         label: "Links",         icon: Share2 },
  ];

  const donutColors = ["#22d3ee", "#67e8f9", "#06b6d4", "#0ea5e9", "#7dd3fc", "#a5f3fc", "#0891b2"];

  const surface = {
    background: "linear-gradient(145deg, rgba(8,22,44,0.85) 0%, rgba(4,14,32,0.8) 100%)",
    border: "1px solid rgba(0,230,255,0.12)",
    boxShadow: "0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
  } as const;

  const handleQuickAction = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setPressedId(id);
    const x = e.clientX;
    const y = e.clientY;
    setTimeout(() => {
      openView(id, x, y);
      setPressedId(null);
    }, 140);
  };

  const handleStatClick = (viewId: string, e: React.MouseEvent<HTMLDivElement>) => {
    openView(viewId, e.clientX, e.clientY);
  };

  return (
    <div className="space-y-4">
      {/* === MOBILE BRAIN HERO — compact, stacked === */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(4,20,40,0.85) 0%, rgba(8,30,60,0.92) 50%, rgba(4,18,38,0.88) 100%)",
          border: "1px solid rgba(0,230,255,0.22)",
          boxShadow: "0 8px 28px rgba(0,80,140,0.22), inset 0 1px 0 rgba(0,230,255,0.08)",
        }}
      >
        <div className="absolute -top-12 -left-8 w-44 h-44 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,230,255,0.18) 0%, rgba(0,230,255,0) 70%)",
            filter: "blur(24px)",
            animation: "becca-brain-blob 14s ease-in-out infinite",
          }} />
        <div className="absolute -bottom-16 right-0 w-52 h-52 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,180,220,0.14) 0%, rgba(0,180,220,0) 70%)",
            filter: "blur(28px)",
            animation: "becca-brain-blob 18s ease-in-out infinite reverse",
          }} />
        <div className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,230,255,0.025) 3px, rgba(0,230,255,0.025) 4px)",
          }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            {/* Pulsing brain orb */}
            <div className="relative flex-shrink-0">
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 30% 30%, rgba(0,230,255,0.55) 0%, rgba(0,140,200,0.35) 50%, rgba(0,60,120,0.25) 100%)",
                  boxShadow: "0 0 22px rgba(0,230,255,0.45), inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,30,80,0.6)",
                }}>
                <Brain className="h-5 w-5 text-white drop-shadow-[0_0_6px_rgba(0,230,255,0.9)]" strokeWidth={2.2} />
              </div>
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: "2px solid rgba(0,230,255,0.5)", animation: "becca-brain-pulse 2.5s ease-out infinite" }} />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{
                  background: "#10b981",
                  boxShadow: "0 0 6px rgba(16,185,129,0.8), 0 0 0 2px rgba(4,20,40,1)",
                  animation: "becca-live-dot 1.6s ease-in-out infinite",
                }} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-bold text-cyan-300/80 tracking-[0.22em] uppercase">Becca · Online</span>
                <span className="px-1 py-0.5 rounded text-[8px] font-semibold tracking-wider uppercase text-emerald-300"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>Live</span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight leading-tight truncate">
                <span className="capitalize">{greeting}, {displayName}.</span>
              </h1>
              <p className="text-[11px] text-cyan-100/65 mt-0.5 tracking-wide truncate">
                {formatShortDate(now)} · AI is on duty
              </p>
            </div>

            {/* Time pill compact */}
            <div className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg flex-shrink-0"
              style={{
                background: "linear-gradient(180deg, rgba(0,230,255,0.14) 0%, rgba(0,140,200,0.08) 100%)",
                border: "1px solid rgba(0,230,255,0.3)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}>
              <div className="text-xs font-bold text-white tabular-nums leading-tight">{formatTime(now)}</div>
              <div className="text-[8px] text-cyan-300/70 uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
                <Clock className="h-2 w-2" /> Now
              </div>
            </div>
          </div>

          {/* TODAY box — labeled header on top, two divided halves: Calls | Convos */}
          <div className="mt-3 rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(0,230,255,0.08) 0%, rgba(0,140,200,0.04) 100%)",
              border: "1px solid rgba(0,230,255,0.18)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}>
            {/* Top label bar */}
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5"
              style={{
                background: "rgba(0,230,255,0.06)",
                borderBottom: "1px solid rgba(0,230,255,0.12)",
              }}>
              <Clock className="h-2.5 w-2.5 text-cyan-300/80" />
              <span className="text-[9px] font-bold text-cyan-200/85 tracking-[0.22em] uppercase">Today</span>
            </div>
            {/* Two halves divided by vertical line */}
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: "rgba(0,230,255,0.12)" }}>
              <div className="flex flex-col items-center justify-center px-3 py-2.5"
                style={{ borderRight: "1px solid rgba(0,230,255,0.12)" }}>
                <div className="text-xl font-bold text-cyan-100 tabular-nums leading-none">{todayCallsCount}</div>
                <div className="flex items-center gap-1 mt-1">
                  <PhoneCall className="h-2.5 w-2.5 text-cyan-300/70" />
                  <span className="text-[9px] text-white/60 uppercase tracking-wider font-medium">Calls</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center px-3 py-2.5">
                <div className="text-xl font-bold text-cyan-100 tabular-nums leading-none">{todayConvosCount}</div>
                <div className="flex items-center gap-1 mt-1">
                  <MessageSquare className="h-2.5 w-2.5 text-cyan-300/70" />
                  <span className="text-[9px] text-white/60 uppercase tracking-wider font-medium">Convos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === STAT GRID — 2x2 on mobile === */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => {
          const SIcon = s.icon;
          return (
            <div
              key={s.label}
              onClick={(e) => handleStatClick(s.viewId, e)}
              className="relative overflow-hidden rounded-2xl p-3.5 cursor-pointer active:scale-[0.97] transition-transform"
              style={surface}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-sky-400 opacity-80" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,230,255,0.22) 0%, rgba(0,180,220,0.10) 100%)",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}>
                  <SIcon className="h-4 w-4 text-cyan-300" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums leading-none">{s.value}</div>
              <div className="text-[11px] text-white/60 mt-1.5 font-medium">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* === QUICK ACTIONS — 4-col grid on mobile, 3D embossed icons === */}
      <div className="relative overflow-hidden rounded-2xl p-4" style={surface}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold text-white/80 tracking-wide">Quick Actions</h2>
          <span className="ml-auto text-[9px] text-cyan-300/60 tracking-wider uppercase">tap to open</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {quickActions.map((qa) => {
            const QIcon = qa.icon;
            const isPressed = pressedId === qa.id;
            return (
              <button
                key={qa.id}
                onClick={(e) => handleQuickAction(qa.id, e)}
                className={`group/qa relative overflow-hidden rounded-xl p-2.5 flex flex-col items-center gap-1.5
                  transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                  active:scale-[0.93]
                  ${isPressed ? 'scale-[1.06] -translate-y-0.5' : ''}`}
                style={{
                  background: isPressed
                    ? 'linear-gradient(145deg, rgba(0,230,255,0.18) 0%, rgba(0,180,220,0.10) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isPressed ? 'rgba(0,230,255,0.45)' : 'rgba(0,230,255,0.1)'}`,
                  boxShadow: isPressed
                    ? '0 8px 20px rgba(0,230,255,0.22), 0 0 0 1px rgba(0,230,255,0.3)'
                    : '0 2px 5px rgba(0,0,0,0.15)',
                }}
              >
                {/* 3D Embossed icon tile (mobile size) */}
                <div
                  className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300
                    ${isPressed ? 'scale-110' : ''}`}
                  style={{
                    background: isPressed
                      ? 'linear-gradient(145deg, rgba(0,230,255,0.55) 0%, rgba(0,140,200,0.35) 50%, rgba(0,90,150,0.20) 100%)'
                      : 'linear-gradient(145deg, rgba(0,230,255,0.32) 0%, rgba(0,150,210,0.18) 50%, rgba(0,90,160,0.10) 100%)',
                    boxShadow: isPressed
                      ? `inset 0 1.5px 0 rgba(255,255,255,0.45),
                         inset 0 -1.5px 2px rgba(0,40,80,0.5),
                         inset 0 0 0 1px rgba(0,230,255,0.35),
                         0 10px 20px -6px rgba(0,0,0,0.55),
                         0 0 22px rgba(0,230,255,0.4)`
                      : `inset 0 1.5px 0 rgba(255,255,255,0.30),
                         inset 0 -1.5px 2px rgba(0,30,70,0.55),
                         inset 0 0 0 1px rgba(0,230,255,0.18),
                         0 6px 14px -3px rgba(0,0,0,0.45),
                         0 0 10px rgba(0,230,255,0.08)`,
                  }}
                >
                  {/* Top half highlight */}
                  <div className="absolute top-0.5 left-1 right-1 h-1/2 rounded-t-lg pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%)' }} />
                  {/* Inner pit ring */}
                  <div className="absolute inset-1 rounded-lg pointer-events-none"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(0,40,80,0.25), inset 0 0 10px rgba(0,15,40,0.3)' }} />
                  <QIcon className={`relative h-5 w-5 transition-all duration-300
                    ${isPressed
                      ? 'text-white drop-shadow-[0_2px_3px_rgba(0,80,140,0.8)] drop-shadow-[0_0_8px_rgba(0,230,255,0.9)]'
                      : 'text-cyan-100 drop-shadow-[0_2px_3px_rgba(0,60,110,0.6)] drop-shadow-[0_0_5px_rgba(0,230,255,0.45)]'}`}
                    strokeWidth={2.2} />
                </div>
                <span className={`text-[9.5px] font-medium text-center leading-tight transition-colors
                  ${isPressed ? 'text-cyan-100' : 'text-white/75'}`}>
                  {qa.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* === RECENT ACTIVITY === */}
      <div className="relative overflow-hidden rounded-2xl p-4" style={surface}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold text-white/80 tracking-wide">Recent Activity</h2>
        </div>
        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
          {(recentActivities as any[]).length === 0 ? (
            <div className="text-[11px] text-white/40 italic py-6 text-center">No activity yet.</div>
          ) : (
            (recentActivities as any[]).slice(0, 6).map((a: any, i: number) => (
              <div key={a._id ?? i} className="flex items-start gap-2.5 pb-2.5 border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ background: "rgba(0,230,255,0.7)", boxShadow: "0 0 6px rgba(0,230,255,0.4)" }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-white/85 font-medium truncate">{a.title || a.type || "Activity"}</div>
                  {a.description && (
                    <div className="text-[10px] text-white/50 line-clamp-1 mt-0.5">{a.description}</div>
                  )}
                </div>
                <div className="text-[9px] text-cyan-300/60 tabular-nums flex-shrink-0">
                  {formatRelativeTime(a._creationTime || a.due_date || Date.now())}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* === MOBILE CHARTS — stacked === */}
      <div className="relative overflow-hidden rounded-2xl p-4" style={surface}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold text-white/80 tracking-wide">Calls — last 7 days</h2>
        </div>
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <LineChart data={callsTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,230,255,0.08)" />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(0,230,255,0.15)" />
              <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(0,230,255,0.15)" width={28} />
              <Tooltip contentStyle={{ background: "rgba(4,14,32,0.95)", border: "1px solid rgba(0,230,255,0.25)", borderRadius: 8, color: "#fff", fontSize: 11 }} cursor={{ stroke: "rgba(0,230,255,0.2)" }} />
              <Line type="monotone" dataKey="calls" stroke="#22d3ee" strokeWidth={2}
                dot={{ r: 3, fill: "#22d3ee" }} activeDot={{ r: 5, fill: "#67e8f9" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl p-4" style={surface}>
        <div className="flex items-center gap-2 mb-3">
          <PieIcon className="h-3.5 w-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold text-white/80 tracking-wide">Channel Split</h2>
        </div>
        <div className="flex items-center gap-3" style={{ minHeight: 160 }}>
          <div style={{ width: "55%", height: 160 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={channelSplit} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2} stroke="rgba(0,20,40,0.8)" strokeWidth={2}>
                  {channelSplit.map((_, i) => (
                    <Cell key={i} fill={donutColors[i % donutColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(4,14,32,0.95)", border: "1px solid rgba(0,230,255,0.25)", borderRadius: 8, color: "#fff", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {channelSplit.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-[11px]">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: donutColors[i % donutColors.length] }} />
                <span className="text-white/80 capitalize truncate">{c.name}</span>
                <span className="ml-auto text-white/50 tabular-nums">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileOverview;
