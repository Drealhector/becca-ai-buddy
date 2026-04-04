import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  Users,
  TrendingUp,
  Flame,
  Handshake,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

// ---------- types ----------
interface MetricCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string; // tailwind ring / glow color token
  glowColor: string; // css color for icon shadow
}

interface PipelineRow {
  stage: string;
  count: number;
  color: string;
}

interface SourceRow {
  source: string;
  count: number;
  color: string;
}

interface RevenueRow {
  month: string;
  revenue: number;
}

// ---------- constants ----------
const PIPELINE_STAGES: { key: string; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#06b6d4' },
  { key: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { key: 'qualified', label: 'Qualified', color: '#6366f1' },
  { key: 'viewing_scheduled', label: 'Viewing', color: '#a855f7' },
  { key: 'offer_made', label: 'Offer Made', color: '#f59e0b' },
  { key: 'negotiating', label: 'Negotiating', color: '#f97316' },
  { key: 'closed_won', label: 'Won', color: '#10b981' },
  { key: 'closed_lost', label: 'Lost', color: '#ef4444' },
];

const LEAD_SOURCES: { key: string; label: string; color: string }[] = [
  { key: 'phone_call', label: 'Phone', color: '#06b6d4' },
  { key: 'whatsapp', label: 'WhatsApp', color: '#22c55e' },
  { key: 'instagram', label: 'Instagram', color: '#e879f9' },
  { key: 'facebook', label: 'Facebook', color: '#3b82f6' },
  { key: 'telegram', label: 'Telegram', color: '#38bdf8' },
  { key: 'website', label: 'Website', color: '#f59e0b' },
  { key: 'manual', label: 'Manual', color: '#94a3b8' },
];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ---------- helpers ----------
function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1).toISOString();
  const end = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
  return { start, end };
}

function getLast6Months(): { label: string; year: number; month: number }[] {
  const now = new Date();
  const out: { label: string; year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth() + 1, // 1-indexed
    });
  }
  return out;
}

// ---------- custom tooltip ----------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cyan-500/40 bg-gray-900/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-medium text-white">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color || '#06b6d4' }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

// ---------- main component ----------
const AnalyticsSection: React.FC = () => {
  // metric state
  const [totalContacts, setTotalContacts] = useState(0);
  const [activeLeads, setActiveLeads] = useState(0);
  const [hotLeads, setHotLeads] = useState(0);
  const [dealsThisMonth, setDealsThisMonth] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [overdueFollowups, setOverdueFollowups] = useState(0);

  // chart state
  const [pipelineData, setPipelineData] = useState<PipelineRow[]>([]);
  const [sourceData, setSourceData] = useState<SourceRow[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueRow[]>([]);

  // Convex reactive queries for analytics
  const totalContactsQ = useQuery(api.contacts.count, {}) ?? 0;
  const activeLeadsQ = useQuery(api.leads.countActive) ?? 0;
  const hotLeadsQ = useQuery(api.contacts.count, { temperature: "hot" }) ?? 0;
  const overdueQ = useQuery(api.activities.countOverdue) ?? 0;
  const revenueQ = useQuery(api.deals.revenueThisMonth) ?? 0;
  const closedDealsQ = useQuery(api.deals.closedThisMonth) ?? 0;
  const leadStatusCounts = useQuery(api.leads.countByStatus) ?? {};
  const allContacts = useQuery(api.contacts.list, {}) ?? [];
  const allDeals = useQuery(api.deals.list, {}) ?? [];

  useEffect(() => {
    setTotalContacts(totalContactsQ);
    setActiveLeads(activeLeadsQ);
    setHotLeads(hotLeadsQ);
    setOverdueFollowups(overdueQ);
    setRevenueThisMonth(revenueQ);
    setDealsThisMonth(closedDealsQ);

    // Pipeline data
    setPipelineData(
      PIPELINE_STAGES.map((s) => ({
        stage: s.label,
        count: (leadStatusCounts as any)[s.key] || 0,
        color: s.color,
      })),
    );

    // Source data
    const sourceCounts: Record<string, number> = {};
    allContacts.forEach((c: any) => {
      if (c.source) sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1;
    });
    setSourceData(
      LEAD_SOURCES.map((s) => ({
        source: s.label,
        count: sourceCounts[s.key] || 0,
        color: s.color,
      })),
    );

    // Monthly revenue
    const months = getLast6Months();
    const buckets: Record<string, number> = {};
    months.forEach((m) => {
      buckets[`${m.year}-${m.month}`] = 0;
    });

    allDeals.forEach((d: any) => {
      if (d.stage !== 'closed_won' || !d.actual_close_date) return;
      const dt = new Date(d.actual_close_date);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      if (key in buckets) {
        buckets[key] += Number(d.deal_value) || 0;
      }
    });

    setRevenueData(
      months.map((m) => ({
        month: m.label,
        revenue: buckets[`${m.year}-${m.month}`],
      })),
    );
  }, [totalContactsQ, activeLeadsQ, hotLeadsQ, overdueQ, revenueQ, closedDealsQ, leadStatusCounts, allContacts, allDeals]);

  // ---- metric cards definition ----
  const metrics: MetricCard[] = [
    {
      label: 'Total Contacts',
      value: totalContacts,
      icon: <Users className="h-6 w-6" />,
      color: 'text-cyan-400',
      glowColor: '0 0 20px rgba(6,182,212,0.5)',
    },
    {
      label: 'Active Leads',
      value: activeLeads,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'text-blue-400',
      glowColor: '0 0 20px rgba(59,130,246,0.5)',
    },
    {
      label: 'Hot Leads',
      value: hotLeads,
      icon: <Flame className="h-6 w-6" />,
      color: 'text-orange-400',
      glowColor: '0 0 20px rgba(249,115,22,0.5)',
    },
    {
      label: 'Deals This Month',
      value: dealsThisMonth,
      icon: <Handshake className="h-6 w-6" />,
      color: 'text-emerald-400',
      glowColor: '0 0 20px rgba(16,185,129,0.5)',
    },
    {
      label: 'Revenue This Month',
      value: formatCurrency(revenueThisMonth),
      icon: <DollarSign className="h-6 w-6" />,
      color: 'text-green-400',
      glowColor: '0 0 20px rgba(34,197,94,0.5)',
    },
    {
      label: 'Overdue Follow-ups',
      value: overdueFollowups,
      icon: <AlertCircle className="h-6 w-6" />,
      color: 'text-red-400',
      glowColor: '0 0 20px rgba(239,68,68,0.5)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ---------- Metric Cards ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur-md transition-all hover:border-white/20 hover:shadow-lg"
          >
            {/* subtle gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">{m.label}</p>
                <p
                  className="mt-1 text-3xl font-bold text-white"
                  style={{ textShadow: '0 0 10px rgba(255,255,255,0.15)' }}
                >
                  {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800/80 ${m.color}`}
                style={{ boxShadow: m.glowColor }}
              >
                {m.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Charts Row ---------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline Funnel */}
        <div className="rounded-xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">Pipeline Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="stage"
                width={80}
                tick={{ fill: '#d1d5db', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]} barSize={20}>
                {pipelineData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="rounded-xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">Lead Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <XAxis
                dataKey="source"
                tick={{ fill: '#d1d5db', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" name="Contacts" radius={[6, 6, 0, 0]} barSize={32}>
                {sourceData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---------- Monthly Revenue ---------- */}
      <div className="rounded-xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-semibold text-gray-300">Monthly Revenue</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: '#d1d5db', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(6,182,212,0.3)' }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={{ r: 4, fill: '#06b6d4', stroke: '#0e1a2b', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsSection;
