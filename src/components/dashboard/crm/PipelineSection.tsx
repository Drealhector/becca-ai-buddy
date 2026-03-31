import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, GripVertical } from "lucide-react";

// --- Types ---

interface Lead {
  id: string;
  title: string;
  status: string;
  priority: string;
  lead_type: string;
  source: string | null;
  contact_id: string | null;
  updated_at: string;
  created_at: string;
  contact_name?: string;
  contact_lead_temperature?: string;
  deal_value?: number | null;
}

interface Contact {
  id: string;
  full_name: string;
  lead_temperature?: string;
}

// --- Pipeline stage config ---

const STAGES = [
  { key: "new", label: "New", color: "cyan" },
  { key: "contacted", label: "Contacted", color: "blue" },
  { key: "qualified", label: "Qualified", color: "indigo" },
  { key: "viewing_scheduled", label: "Viewing Scheduled", color: "purple" },
  { key: "offer_made", label: "Offer Made", color: "amber" },
  { key: "negotiating", label: "Negotiating", color: "orange" },
  { key: "closed_won", label: "Closed Won", color: "emerald" },
  { key: "closed_lost", label: "Closed Lost", color: "red" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

const STAGE_BORDER_COLORS: Record<string, string> = {
  cyan: "border-t-cyan-400",
  blue: "border-t-blue-400",
  indigo: "border-t-indigo-400",
  purple: "border-t-purple-400",
  amber: "border-t-amber-400",
  orange: "border-t-orange-400",
  emerald: "border-t-emerald-400",
  red: "border-t-red-400",
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  cyan: "bg-cyan-500/20 text-cyan-300",
  blue: "bg-blue-500/20 text-blue-300",
  indigo: "bg-indigo-500/20 text-indigo-300",
  purple: "bg-purple-500/20 text-purple-300",
  amber: "bg-amber-500/20 text-amber-300",
  orange: "bg-orange-500/20 text-orange-300",
  emerald: "bg-emerald-500/20 text-emerald-300",
  red: "bg-red-500/20 text-red-300",
};

const STAGE_GLOW_COLORS: Record<string, string> = {
  cyan: "shadow-cyan-500/20",
  blue: "shadow-blue-500/20",
  indigo: "shadow-indigo-500/20",
  purple: "shadow-purple-500/20",
  amber: "shadow-amber-500/20",
  orange: "shadow-orange-500/20",
  emerald: "shadow-emerald-500/20",
  red: "shadow-red-500/20",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};

const LEAD_TYPE_COLORS: Record<string, string> = {
  buyer: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  seller: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  renter: "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

// --- Helpers ---

function daysInStage(updatedAt: string): number {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function formatDealValue(value: number | null | undefined): string {
  if (value == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

// --- Component ---

const PipelineSection = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    contact_id: "",
    lead_type: "buyer",
    priority: "medium",
    source: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const dragCounter = useRef<Record<string, number>>({});

  // Fetch leads with contact names and deal values
  const fetchLeads = useCallback(async () => {
    try {
      const { data: leadsData, error } = await supabase
        .from("leads" as any)
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching leads:", error);
        return;
      }

      const leadsArr = (leadsData || []) as any[];

      // Gather unique contact IDs
      const contactIds = [
        ...new Set(leadsArr.filter((l) => l.contact_id).map((l) => l.contact_id)),
      ];

      // Fetch contacts for names
      let contactMap: Record<string, { full_name: string; lead_temperature?: string }> = {};
      if (contactIds.length > 0) {
        const { data: contactsData } = await supabase
          .from("contacts" as any)
          .select("id, full_name, lead_temperature")
          .in("id", contactIds);
        (contactsData || []).forEach((c: any) => {
          contactMap[c.id] = { full_name: c.full_name, lead_temperature: c.lead_temperature };
        });
      }

      // Fetch deal values
      const leadIds = leadsArr.map((l) => l.id);
      let dealMap: Record<string, number> = {};
      if (leadIds.length > 0) {
        const { data: dealsData } = await supabase
          .from("deals" as any)
          .select("lead_id, value")
          .in("lead_id", leadIds);
        (dealsData || []).forEach((d: any) => {
          if (d.lead_id && d.value != null) {
            dealMap[d.lead_id] = d.value;
          }
        });
      }

      const enriched: Lead[] = leadsArr.map((l) => ({
        ...l,
        contact_name: l.contact_id && contactMap[l.contact_id]
          ? contactMap[l.contact_id].full_name
          : undefined,
        contact_lead_temperature: l.contact_id && contactMap[l.contact_id]
          ? contactMap[l.contact_id].lead_temperature
          : undefined,
        deal_value: dealMap[l.id] ?? null,
      }));

      setLeads(enriched);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  }, []);

  // Fetch contacts for the add dialog
  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("contacts" as any)
        .select("id, full_name, lead_temperature")
        .order("full_name", { ascending: true });
      setContacts((data || []) as Contact[]);
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchContacts();

    const channel = supabase
      .channel("leads-pipeline-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads, fetchContacts]);

  // --- Drag and Drop ---

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    // Add drag styling after a tick so the browser captures the element first
    requestAnimationFrame(() => {
      const el = document.getElementById(`lead-card-${leadId}`);
      if (el) el.classList.add("opacity-40", "scale-95");
    });
  };

  const handleDragEnd = () => {
    if (draggedLead) {
      const el = document.getElementById(`lead-card-${draggedLead}`);
      if (el) el.classList.remove("opacity-40", "scale-95");
    }
    setDraggedLead(null);
    setDragOverStage(null);
    dragCounter.current = {};
  };

  const handleDragEnter = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    dragCounter.current[stageKey] = (dragCounter.current[stageKey] || 0) + 1;
    setDragOverStage(stageKey);
  };

  const handleDragLeave = (stageKey: string) => {
    dragCounter.current[stageKey] = (dragCounter.current[stageKey] || 0) - 1;
    if (dragCounter.current[stageKey] <= 0) {
      dragCounter.current[stageKey] = 0;
      if (dragOverStage === stageKey) setDragOverStage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, toStage: StageKey) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === toStage) {
      handleDragEnd();
      return;
    }

    const fromStage = lead.status;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status: toStage, updated_at: new Date().toISOString() }
          : l
      )
    );
    setDragOverStage(null);
    setDraggedLead(null);
    dragCounter.current = {};

    try {
      // Update lead status
      await supabase
        .from("leads" as any)
        .update({ status: toStage, updated_at: new Date().toISOString() } as any)
        .eq("id", leadId);

      // Insert stage history
      await supabase.from("lead_stage_history" as any).insert({
        lead_id: leadId,
        from_stage: fromStage,
        to_stage: toStage,
        changed_by: "manual",
      } as any);
    } catch (err) {
      console.error("Error updating lead stage:", err);
      fetchLeads(); // Rollback on error
    }
  };

  // --- Add Lead ---

  const handleAddLead = async () => {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from("leads" as any).insert({
        title: formData.title.trim(),
        contact_id: formData.contact_id || null,
        lead_type: formData.lead_type,
        priority: formData.priority,
        source: formData.source.trim() || null,
        status: "new",
      } as any);

      setFormData({ title: "", contact_id: "", lead_type: "buyer", priority: "medium", source: "" });
      setAddDialogOpen(false);
      fetchLeads();
    } catch (err) {
      console.error("Error adding lead:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render helpers ---

  const leadsForStage = (stageKey: string) =>
    leads.filter((l) => l.status === stageKey);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-lg font-semibold text-white tracking-wide">
          CRM Pipeline
        </h3>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white border-0"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-gray-300">Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. 3BR Apartment Interest"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Contact</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, contact_id: v }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-white">
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300">Lead Type</Label>
                  <Select
                    value={formData.lead_type}
                    onValueChange={(v) => setFormData((p) => ({ ...p, lead_type: v }))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="buyer" className="text-white">Buyer</SelectItem>
                      <SelectItem value="seller" className="text-white">Seller</SelectItem>
                      <SelectItem value="renter" className="text-white">Renter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData((p) => ({ ...p, priority: v }))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="high" className="text-white">High</SelectItem>
                      <SelectItem value="medium" className="text-white">Medium</SelectItem>
                      <SelectItem value="low" className="text-white">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Source</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData((p) => ({ ...p, source: e.target.value }))}
                  placeholder="e.g. Website, Referral, Social"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 mt-1"
                />
              </div>
              <Button
                onClick={handleAddLead}
                disabled={!formData.title.trim() || submitting}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {submitting ? "Adding..." : "Add Lead"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-2 flex-1 min-h-0">
        {STAGES.map((stage) => {
          const stageLeads = leadsForStage(stage.key);
          const isOver = dragOverStage === stage.key;
          const isLost = stage.key === "closed_lost";

          return (
            <div
              key={stage.key}
              className={`
                flex flex-col min-w-[260px] w-[260px] shrink-0 rounded-xl
                border-t-2 ${STAGE_BORDER_COLORS[stage.color]}
                bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]
                transition-all duration-200
                ${isOver ? `ring-2 ring-${stage.color}-400/40 bg-white/[0.06] ${STAGE_GLOW_COLORS[stage.color]} shadow-lg` : ""}
                ${isLost ? "opacity-75" : ""}
              `}
              onDragEnter={(e) => handleDragEnter(e, stage.key)}
              onDragLeave={() => handleDragLeave(stage.key)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-3 shrink-0">
                <span className="text-sm font-medium text-gray-200 truncate">
                  {stage.label}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_BADGE_COLORS[stage.color]}`}
                >
                  {stageLeads.length}
                </span>
              </div>

              {/* Card List */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[120px]">
                {stageLeads.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[100px] border border-dashed border-white/10 rounded-lg mx-1">
                    <span className="text-xs text-gray-600">No leads</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const isHot = lead.contact_lead_temperature === "hot";
                    const days = daysInStage(lead.updated_at);

                    return (
                      <div
                        key={lead.id}
                        id={`lead-card-${lead.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`
                          group relative p-3 rounded-lg cursor-grab active:cursor-grabbing
                          bg-white/[0.04] backdrop-blur-md border border-white/[0.08]
                          hover:bg-white/[0.07] hover:border-white/[0.14]
                          hover:shadow-md hover:shadow-cyan-500/5
                          transition-all duration-200 ease-out
                          ${isHot ? "animate-pulse-subtle ring-1 ring-orange-400/20" : ""}
                        `}
                      >
                        {/* Drag handle */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                          <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                        </div>

                        {/* Contact name */}
                        {lead.contact_name && (
                          <p className="text-xs text-cyan-400/80 font-medium mb-1 truncate pr-5">
                            {lead.contact_name}
                          </p>
                        )}

                        {/* Lead title */}
                        <p className="text-sm font-medium text-gray-100 leading-snug mb-2 truncate">
                          {lead.title}
                        </p>

                        {/* Deal value */}
                        {lead.deal_value != null && (
                          <p className="text-xs font-semibold text-emerald-400 mb-2">
                            {formatDealValue(lead.deal_value)}
                          </p>
                        )}

                        {/* Bottom row: priority, days, type */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Priority dot */}
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[lead.priority] || PRIORITY_DOT.medium}`}
                            title={`${lead.priority} priority`}
                          />

                          {/* Days in stage */}
                          <span className="text-[10px] text-gray-500">
                            {days === 0 ? "today" : `${days}d`}
                          </span>

                          {/* Lead type badge */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 border ${LEAD_TYPE_COLORS[lead.lead_type] || "bg-white/5 text-gray-400 border-white/10"}`}
                          >
                            {lead.lead_type}
                          </Badge>

                          {/* Hot indicator */}
                          {isHot && (
                            <span className="text-[10px] text-orange-400" title="Hot lead">
                              🔥
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtle pulsing animation for hot leads */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); }
          50% { box-shadow: 0 0 12px 2px rgba(251, 146, 60, 0.15); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PipelineSection;
