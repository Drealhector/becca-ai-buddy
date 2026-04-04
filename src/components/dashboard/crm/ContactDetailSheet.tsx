import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  Flame,
  Thermometer,
  Snowflake,
  Phone,
  Mail,
  Plus,
  X,
  FileText,
  PhoneCall,
  Activity,
  Home,
  DollarSign,
  MapPin,
  MessageSquare,
  Target,
  Calendar,
  StickyNote,
  TrendingUp,
} from "lucide-react";

interface ContactDetailSheetProps {
  contact: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPERATURE_CONFIG: Record<string, { label: string; color: string; glow: string; icon: React.ReactNode }> = {
  hot: {
    label: "Hot",
    color: "bg-red-500/20 text-red-400 border-red-500/40",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.4)]",
    icon: <Flame className="h-3.5 w-3.5" />,
  },
  warm: {
    label: "Warm",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    glow: "shadow-[0_0_10px_rgba(249,115,22,0.3)]",
    icon: <Thermometer className="h-3.5 w-3.5" />,
  },
  cold: {
    label: "Cold",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    glow: "shadow-[0_0_10px_rgba(59,130,246,0.3)]",
    icon: <Snowflake className="h-3.5 w-3.5" />,
  },
};

const TAG_COLORS: Record<string, string> = {
  buyer: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  seller: "bg-violet-500/20 text-violet-400 border-violet-500/40",
  investor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  VIP: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <PhoneCall className="h-3.5 w-3.5 text-green-400" />,
  email: <Mail className="h-3.5 w-3.5 text-blue-400" />,
  meeting: <Calendar className="h-3.5 w-3.5 text-purple-400" />,
  note: <StickyNote className="h-3.5 w-3.5 text-yellow-400" />,
  viewing: <Home className="h-3.5 w-3.5 text-cyan-400" />,
  message: <MessageSquare className="h-3.5 w-3.5 text-pink-400" />,
  default: <Activity className="h-3.5 w-3.5 text-gray-400" />,
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  contacted: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  qualified: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  proposal: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  negotiation: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  won: "bg-green-500/20 text-green-400 border-green-500/40",
  lost: "bg-red-500/20 text-red-400 border-red-500/40",
};

export const ContactDetailSheet = ({ contact, open, onOpenChange }: ContactDetailSheetProps) => {
  const leads = useQuery(api.leads.listByContact, contact?._id ? { contact_id: contact._id } : "skip") ?? [];
  const activities = useQuery(api.activities.listByContact, contact?._id ? { contact_id: contact._id } : "skip") ?? [];
  const updateContact = useMutation(api.contacts.update);

  const [notes, setNotes] = useState(contact.notes || "");
  const [tags, setTags] = useState<string[]>(contact.tags || []);
  const [newTag, setNewTag] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (open && contact?._id) {
      setNotes(contact.notes || "");
      setTags(contact.tags || []);
    }
  }, [open, contact?._id]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateContact({ id: contact._id, notes });
      toast.success("Notes saved");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) return;
    const updatedTags = [...tags, tag];
    setTags(updatedTags);
    setNewTag("");
    try {
      await updateContact({ id: contact._id, tags: updatedTags });
    } catch (error) {
      console.error("Error updating tags:", error);
      setTags(tags);
      toast.error("Failed to update tags");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    setTags(updatedTags);
    try {
      await updateContact({ id: contact._id, tags: updatedTags });
    } catch (error) {
      console.error("Error updating tags:", error);
      setTags(tags);
      toast.error("Failed to update tags");
    }
  };

  const temp = TEMPERATURE_CONFIG[contact.temperature] || TEMPERATURE_CONFIG.warm;
  const scorePercent = Math.min(100, Math.max(0, contact.lead_score || 0));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-gray-950/95 backdrop-blur-xl border-l border-cyan-500/20 text-white p-0"
      >
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="space-y-0">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl font-bold text-white">
                    {contact.full_name}
                  </SheetTitle>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {contact.phone}
                      </span>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {contact.email}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 ${temp.color} ${temp.glow}`}
                >
                  {temp.icon}
                  {temp.label}
                </Badge>
              </div>

              {/* Lead Score Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Lead Score
                  </span>
                  <span className="text-cyan-300 font-medium">{scorePercent}/100</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all"
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              </div>
            </SheetHeader>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                <Target className="h-3.5 w-3.5" /> Create Lead
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                <PhoneCall className="h-3.5 w-3.5" /> Schedule Call
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                <StickyNote className="h-3.5 w-3.5" /> Add Note
              </Button>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`text-xs flex items-center gap-1 ${TAG_COLORS[tag] || "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    placeholder="Add tag..."
                    className="h-6 w-24 text-xs bg-white/5 border-white/10 text-white placeholder:text-gray-500 px-2"
                  />
                  <button
                    onClick={handleAddTag}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Budget */}
            {(contact.budget_min != null || contact.budget_max != null) && (
              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-green-400" /> Budget Range
                </h4>
                <p className="text-white font-medium">
                  {contact.budget_min != null ? `$${Number(contact.budget_min).toLocaleString()}` : "N/A"}
                  {" - "}
                  {contact.budget_max != null ? `$${Number(contact.budget_max).toLocaleString()}` : "N/A"}
                </p>
              </div>
            )}

            {/* Preferred Locations */}
            {contact.preferred_locations && contact.preferred_locations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-red-400" /> Preferred Locations
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {contact.preferred_locations.map((loc: string) => (
                    <Badge
                      key={loc}
                      variant="outline"
                      className="text-xs bg-white/5 text-gray-300 border-white/10"
                    >
                      {loc}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Property Type Interests */}
            {contact.property_type_interests && contact.property_type_interests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5 text-cyan-400" /> Property Interests
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {contact.property_type_interests.map((type: string) => (
                    <Badge
                      key={type}
                      variant="outline"
                      className="text-xs bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-yellow-400" /> Notes
              </h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this contact..."
                className="min-h-[80px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
              />
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </Button>
            </div>

            {/* Active Leads */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-cyan-400" /> Active Leads
                {leads.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-cyan-500/10 text-cyan-300">
                    {leads.length}
                  </Badge>
                )}
              </h4>
              {leads.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">No leads yet</p>
              ) : (
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white truncate">
                          {lead.title || "Untitled Lead"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${LEAD_STATUS_COLORS[lead.status] || LEAD_STATUS_COLORS.new}`}
                        >
                          {lead.status}
                        </Badge>
                      </div>
                      {lead.lead_type && (
                        <p className="text-xs text-gray-400 mt-1">{lead.lead_type}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activities */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-purple-400" /> Recent Activities
              </h4>
              {activities.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">No recent activities</p>
              ) : (
                <div className="space-y-1.5">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-start gap-2.5 p-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors"
                    >
                      <div className="mt-0.5">
                        {ACTIVITY_ICONS[act.activity_type] || ACTIVITY_ICONS.default}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {act.title || act.activity_type}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {act.created_at
                            ? formatDistanceToNow(new Date(act.created_at), { addSuffix: true })
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conversation Summary */}
            {contact.memory_summary && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-pink-400" /> Conversation Summary
                </h4>
                <div className="p-3 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-300 leading-relaxed">
                  {contact.memory_summary}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
