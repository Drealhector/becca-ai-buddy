import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  MessageSquare,
  Eye,
  Clock,
  FileText,
  CheckSquare,
  ArrowRightCircle,
  CheckCircle2,
  Plus,
  Bot,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ActivityType =
  | "call"
  | "message"
  | "viewing"
  | "follow_up"
  | "note"
  | "task"
  | "status_change";

interface Activity {
  id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  contact_id: string | null;
  lead_id: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  is_completed: boolean;
  is_ai_generated: boolean;
  created_by: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string | null;
}

interface Lead {
  id: string;
  property_interest: string | null;
  status: string | null;
}

const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { icon: typeof Phone; color: string; borderColor: string }
> = {
  call: { icon: Phone, color: "text-cyan-400", borderColor: "border-cyan-500" },
  message: {
    icon: MessageSquare,
    color: "text-blue-400",
    borderColor: "border-blue-500",
  },
  viewing: { icon: Eye, color: "text-purple-400", borderColor: "border-purple-500" },
  follow_up: {
    icon: Clock,
    color: "text-amber-400",
    borderColor: "border-amber-500",
  },
  note: { icon: FileText, color: "text-gray-400", borderColor: "border-gray-500" },
  task: {
    icon: CheckSquare,
    color: "text-green-400",
    borderColor: "border-green-500",
  },
  status_change: {
    icon: ArrowRightCircle,
    color: "text-indigo-400",
    borderColor: "border-indigo-500",
  },
};

const ActivitiesSection = () => {
  const [upcoming, setUpcoming] = useState<Activity[]>([]);
  const [overdue, setOverdue] = useState<Activity[]>([]);
  const [completed, setCompleted] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contactMap, setContactMap] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Form state
  const [formType, setFormType] = useState<ActivityType>("task");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContactId, setFormContactId] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchActivities = useCallback(async () => {
    const now = new Date().toISOString();

    const [upcomingRes, overdueRes, completedRes] = await Promise.all([
      supabase
        .from("activities" as any)
        .select("*")
        .eq("is_completed", false)
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("activities" as any)
        .select("*")
        .eq("is_completed", false)
        .lt("scheduled_at", now)
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("activities" as any)
        .select("*")
        .eq("is_completed", true)
        .order("completed_at", { ascending: false })
        .limit(20),
    ]);

    setUpcoming((upcomingRes.data as Activity[] | null) || []);
    setOverdue((overdueRes.data as Activity[] | null) || []);
    setCompleted((completedRes.data as Activity[] | null) || []);
  }, []);

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contacts" as any)
      .select("id, name, phone")
      .order("name", { ascending: true });

    const contactList = (data as Contact[] | null) || [];
    setContacts(contactList);

    const map: Record<string, string> = {};
    contactList.forEach((c) => {
      map[c.id] = c.name;
    });
    setContactMap(map);
  }, []);

  const fetchLeadsForContact = useCallback(async (contactId: string) => {
    if (!contactId) {
      setLeads([]);
      return;
    }
    const { data } = await supabase
      .from("leads" as any)
      .select("id, property_interest, status")
      .eq("contact_id", contactId);

    setLeads((data as Lead[] | null) || []);
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchContacts();

    const channel = supabase
      .channel("activities-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities, fetchContacts]);

  useEffect(() => {
    fetchLeadsForContact(formContactId);
  }, [formContactId, fetchLeadsForContact]);

  const handleComplete = async (id: string) => {
    await supabase
      .from("activities" as any)
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      } as any)
      .eq("id", id);

    fetchActivities();
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formScheduledAt) return;
    setSubmitting(true);

    await supabase.from("activities" as any).insert({
      activity_type: formType,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      contact_id: formContactId || null,
      lead_id: formLeadId || null,
      scheduled_at: new Date(formScheduledAt).toISOString(),
      is_completed: false,
      is_ai_generated: false,
      created_by: "manual",
    } as any);

    setFormType("task");
    setFormTitle("");
    setFormDescription("");
    setFormContactId("");
    setFormLeadId("");
    setFormScheduledAt("");
    setSubmitting(false);
    setDialogOpen(false);
    fetchActivities();
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const renderActivityItem = (
    activity: Activity,
    variant: "upcoming" | "overdue" | "completed"
  ) => {
    const config =
      ACTIVITY_TYPE_CONFIG[activity.activity_type] || ACTIVITY_TYPE_CONFIG.task;
    const Icon = config.icon;

    const isOverdue = variant === "overdue";
    const isCompleted = variant === "completed";

    return (
      <div
        key={activity.id}
        className={`
          flex items-center gap-3 p-3 rounded-lg border-l-4 transition-all
          ${
            isOverdue
              ? "border-l-red-500 bg-red-950/20 border border-red-900/30"
              : isCompleted
              ? "opacity-60 border-l-gray-600 bg-gray-900/30 border border-gray-800/40"
              : `${config.borderColor} bg-gray-900/40 border border-gray-800/40`
          }
          hover:bg-gray-800/50
        `}
      >
        {/* Type icon */}
        <div
          className={`flex-shrink-0 p-2 rounded-lg bg-gray-800/60 ${
            isOverdue ? "text-red-400" : config.color
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-100 truncate">
              {activity.title}
            </span>
            {activity.is_ai_generated && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-cyan-700 text-cyan-400 bg-cyan-950/40 flex-shrink-0"
              >
                <Bot className="h-2.5 w-2.5 mr-0.5" />
                AI
              </Badge>
            )}
          </div>
          {activity.description && (
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {activity.description}
            </p>
          )}
          {activity.contact_id && contactMap[activity.contact_id] && (
            <p className="text-xs text-cyan-500/70 mt-0.5">
              {contactMap[activity.contact_id]}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="flex-shrink-0 text-right">
          <span
            className={`text-xs ${
              isOverdue ? "text-red-400 font-medium" : "text-gray-500"
            }`}
          >
            {formatRelativeTime(
              isCompleted ? activity.completed_at : activity.scheduled_at
            )}
          </span>
        </div>

        {/* Complete button */}
        {!isCompleted && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8 text-gray-500 hover:text-green-400 hover:bg-green-950/40 hover:shadow-[0_0_12px_rgba(34,197,94,0.2)] transition-all"
            onClick={() => handleComplete(activity.id)}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <Clock className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );

  return (
    <Card className="p-6 h-full flex flex-col bg-gray-950/60 border-gray-800/60 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Activities</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-cyan-800/50 text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-950 border-gray-800 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-100">
                New Activity
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-gray-300 text-xs">Type</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as ActivityType)}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="viewing">Viewing</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="status_change">Status Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Title</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Activity title"
                  className="bg-gray-900 border-gray-700 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Description</Label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 mt-1 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-700"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Contact</Label>
                <Select value={formContactId} onValueChange={setFormContactId}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 mt-1">
                    <SelectValue placeholder="Select contact..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 max-h-48">
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.phone ? ` (${c.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {leads.length > 0 && (
                <div>
                  <Label className="text-gray-300 text-xs">Lead</Label>
                  <Select value={formLeadId} onValueChange={setFormLeadId}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 mt-1">
                      <SelectValue placeholder="Select lead (optional)..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.property_interest || "Unnamed lead"} ({l.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-gray-300 text-xs">Scheduled At</Label>
                <Input
                  type="datetime-local"
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                  className="bg-gray-900 border-gray-700 mt-1"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!formTitle.trim() || !formScheduledAt || submitting}
                className="w-full bg-cyan-700 hover:bg-cyan-600 text-white"
              >
                {submitting ? "Creating..." : "Create Activity"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="bg-gray-900/60 border border-gray-800/50 mb-3">
          <TabsTrigger
            value="upcoming"
            className="data-[state=active]:bg-cyan-900/30 data-[state=active]:text-cyan-400 text-xs"
          >
            Upcoming
          </TabsTrigger>
          <TabsTrigger
            value="overdue"
            className="data-[state=active]:bg-red-900/30 data-[state=active]:text-red-400 text-xs gap-1.5"
          >
            Overdue
            {overdue.length > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px] bg-red-600 text-white hover:bg-red-600 ml-1">
                {overdue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="data-[state=active]:bg-gray-700/30 data-[state=active]:text-gray-300 text-xs"
          >
            Completed
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto max-h-[420px]">
          <TabsContent value="upcoming" className="mt-0 space-y-2">
            {upcoming.length === 0
              ? renderEmptyState("No upcoming activities")
              : upcoming.map((a) => renderActivityItem(a, "upcoming"))}
          </TabsContent>

          <TabsContent value="overdue" className="mt-0 space-y-2">
            {overdue.length === 0
              ? renderEmptyState("All caught up!")
              : overdue.map((a) => renderActivityItem(a, "overdue"))}
          </TabsContent>

          <TabsContent value="completed" className="mt-0 space-y-2">
            {completed.length === 0
              ? renderEmptyState("No completed activities")
              : completed.map((a) => renderActivityItem(a, "completed"))}
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
};

export default ActivitiesSection;
