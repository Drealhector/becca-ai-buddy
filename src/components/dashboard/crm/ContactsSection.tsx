import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Users,
  Flame,
  Thermometer,
  Snowflake,
  UserCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ContactDetailSheet } from "./ContactDetailSheet";

type TemperatureFilter = "all" | "hot" | "warm" | "cold";
type TagFilter = "buyer" | "seller" | "investor" | "VIP";

const TEMPERATURE_CONFIG: Record<string, { label: string; color: string; glow: string; icon: React.ReactNode }> = {
  hot: {
    label: "Hot",
    color: "bg-red-500/20 text-red-400 border-red-500/40",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.4)]",
    icon: <Flame className="h-3 w-3" />,
  },
  warm: {
    label: "Warm",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    glow: "shadow-[0_0_8px_rgba(249,115,22,0.3)]",
    icon: <Thermometer className="h-3 w-3" />,
  },
  cold: {
    label: "Cold",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.3)]",
    icon: <Snowflake className="h-3 w-3" />,
  },
};

const TAG_COLORS: Record<string, string> = {
  buyer: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  seller: "bg-violet-500/20 text-violet-400 border-violet-500/40",
  investor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  VIP: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
};

const ALL_TAGS: TagFilter[] = ["buyer", "seller", "investor", "VIP"];

const ContactsSection = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tempFilter, setTempFilter] = useState<TemperatureFilter>("all");
  const [tagFilters, setTagFilters] = useState<TagFilter[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Add form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formSource, setFormSource] = useState("manual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContacts();

    const channel = supabase
      .channel("contacts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contacts:", error);
        return;
      }
      setContacts((data as any[]) || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const toggleTag = (tag: TagFilter) => {
    setTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleFormTag = (tag: string) => {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      (c.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search);

    const matchesTemp =
      tempFilter === "all" || c.temperature === tempFilter;

    const matchesTags =
      tagFilters.length === 0 ||
      tagFilters.some((tag) => (c.tags || []).includes(tag));

    return matchesSearch && matchesTemp && matchesTags;
  });

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormTags([]);
    setFormSource("manual");
  };

  const handleAddContact = async () => {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const record: any = {
        full_name: formName.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        tags: formTags,
        source: formSource,
        temperature: "warm",
        lead_score: 50,
      };
      const { error } = await supabase.from("contacts" as any).insert(record);
      if (error) throw error;
      toast.success("Contact added");
      setShowAddDialog(false);
      resetForm();
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const openContactDetail = (contact: any) => {
    setSelectedContact(contact);
    setSheetOpen(true);
  };

  return (
    <>
      <Card className="p-6 h-full flex flex-col bg-black/40 backdrop-blur-xl border-cyan-500/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">Contacts</h2>
            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
              {contacts.length}
            </Badge>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            size="sm"
            className="gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="h-4 w-4" /> Add Contact
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="pl-9 bg-white/5 border-white/10 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Temperature Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(["all", "hot", "warm", "cold"] as TemperatureFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTempFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                tempFilter === t
                  ? t === "all"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : TEMPERATURE_CONFIG[t].color
                  : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
              }`}
            >
              {t === "all" ? "All" : TEMPERATURE_CONFIG[t].label}
            </button>
          ))}
        </div>

        {/* Tag Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                tagFilters.includes(tag)
                  ? TAG_COLORS[tag]
                  : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Contact List */}
        <ScrollArea className="flex-1 max-h-[500px]">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCircle className="h-12 w-12 text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">No contacts yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Add your first contact to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => {
                const temp = TEMPERATURE_CONFIG[contact.temperature] || TEMPERATURE_CONFIG.warm;
                return (
                  <div
                    key={contact.id}
                    onClick={() => openContactDetail(contact)}
                    className="p-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-cyan-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white truncate">
                            {contact.full_name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${temp.color} ${temp.glow}`}
                          >
                            {temp.icon}
                            {temp.label}
                          </Badge>
                        </div>
                        {contact.phone && (
                          <p className="text-xs text-gray-400">{contact.phone}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        {contact.last_contact_date && (
                          <p className="text-[10px] text-gray-500">
                            {formatDistanceToNow(new Date(contact.last_contact_date), {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                        {contact.active_leads_count != null && contact.active_leads_count > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] mt-1 bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                          >
                            {contact.active_leads_count} lead{contact.active_leads_count !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* Tags */}
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contact.tags.map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${TAG_COLORS[tag] || "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-gray-950 border-cyan-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label className="text-gray-300">Phone</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+1234567890"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label className="text-gray-300">Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFormTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      formTags.includes(tag)
                        ? TAG_COLORS[tag]
                        : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Source</Label>
              <Select value={formSource} onValueChange={setFormSource}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-950 border-white/10">
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="open_house">Open House</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddContact}
              disabled={saving}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {saving ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Sheet */}
      {selectedContact && (
        <ContactDetailSheet
          contact={selectedContact}
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setSelectedContact(null);
          }}
        />
      )}
    </>
  );
};

export default ContactsSection;
