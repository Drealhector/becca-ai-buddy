import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Plus, Trash2, Edit, Phone } from "lucide-react";

type BusinessType = "gadgets" | "real_estate" | "restaurant";

interface InventoryItem {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  quantity: number;
  colors: string[];
  specs: Record<string, string>;
  location: string | null;
  description: string | null;
  business_type: string;
  is_available: boolean;
  created_at: string;
}

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  gadgets: "Gadgets / Electronics",
  real_estate: "Real Estate",
  restaurant: "Restaurant / Food",
};

export const InventorySection = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [businessType, setBusinessType] = useState<BusinessType>("gadgets");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formColors, setFormColors] = useState("");
  const [formSpecs, setFormSpecs] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    fetchInventory();
    fetchOwnerPhone();

    const channel = supabase
      .channel("inventory-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessType]);

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("business_type", businessType)
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching inventory:", error);
      return;
    }
    setItems((data as any[]) || []);
  };

  const fetchOwnerPhone = async () => {
    const { data } = await supabase
      .from("customizations")
      .select("owner_phone")
      .limit(1)
      .maybeSingle();
    setOwnerPhone((data as any)?.owner_phone || "");
  };

  const handleSaveOwnerPhone = async () => {
    setSavingPhone(true);
    try {
      const trimmedPhone = ownerPhone?.trim() || null;
      
      const { data: existing } = await supabase
        .from("customizations")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("customizations")
          .update({ owner_phone: trimmedPhone } as any)
          .eq("id", existing.id);
        if (error) throw error;
      }

      // Also update the Vapi transferCall tool destination
      if (trimmedPhone) {
        const { error: fnError } = await supabase.functions.invoke("update-transfer-number", {
          body: { phoneNumber: trimmedPhone },
        });
        if (fnError) {
          console.error("Error updating Vapi transfer tool:", fnError);
          toast.error("Number saved but transfer tool sync failed. Transfer may use old number.");
        } else {
          toast.success("Human support number saved & transfer updated");
        }
      } else {
        toast.success("Human support number saved");
      }
    } catch (error) {
      console.error("Error saving owner phone:", error);
      toast.error("Failed to save number");
    } finally {
      setSavingPhone(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormPrice("");
    setFormCurrency("USD");
    setFormQuantity("1");
    setFormColors("");
    setFormSpecs("");
    setFormLocation("");
    setFormDescription("");
    setEditingItem(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(item.price?.toString() || "");
    setFormCurrency(item.currency || "USD");
    setFormQuantity(item.quantity?.toString() || "1");
    setFormColors(item.colors?.join(", ") || "");
    setFormSpecs(
      item.specs && typeof item.specs === "object"
        ? Object.entries(item.specs).map(([k, v]) => `${k}: ${v}`).join("\n")
        : ""
    );
    setFormLocation(item.location || "");
    setFormDescription(item.description || "");
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);

    const colorsArray = formColors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const specsObj: Record<string, string> = {};
    formSpecs.split("\n").forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (key?.trim() && rest.length) {
        specsObj[key.trim()] = rest.join(":").trim();
      }
    });

    const record: any = {
      name: formName.trim(),
      price: formPrice ? parseFloat(formPrice) : null,
      currency: formCurrency,
      quantity: parseInt(formQuantity) || 1,
      colors: colorsArray,
      specs: specsObj,
      location: formLocation || null,
      description: formDescription || null,
      business_type: businessType,
      is_available: true,
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from("inventory")
          .update(record)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Item updated");
      } else {
        const { error } = await supabase.from("inventory").insert(record);
        if (error) throw error;
        toast.success("Item added to inventory");
      }
      setShowAddDialog(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving inventory:", error);
      toast.error("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
      toast.success("Item removed from inventory");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete item");
    }
  };

  const renderFormFields = () => {
    switch (businessType) {
      case "gadgets":
        return (
          <>
            <div>
              <Label>Colors (comma separated)</Label>
              <Input value={formColors} onChange={(e) => setFormColors(e.target.value)} placeholder="Black, Silver, Gold" />
            </div>
            <div>
              <Label>Specs (one per line, key: value)</Label>
              <Textarea value={formSpecs} onChange={(e) => setFormSpecs(e.target.value)} placeholder={"RAM: 8GB\nStorage: 256GB\nBattery: 5000mAh"} className="min-h-[80px]" />
            </div>
          </>
        );
      case "real_estate":
        return (
          <>
            <div>
              <Label>Location</Label>
              <Input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="123 Main St, City, State" />
            </div>
            <div>
              <Label>Quantity Available</Label>
              <Input type="number" value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} placeholder="1" />
            </div>
          </>
        );
      case "restaurant":
        return null; // Restaurant only needs name + price
      default:
        return null;
    }
  };

  const renderItemDetails = (item: InventoryItem) => {
    switch (businessType) {
      case "gadgets":
        return (
          <div className="space-y-1">
            {item.colors?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {item.colors.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            )}
            {item.specs && Object.keys(item.specs).length > 0 && (
              <div className="text-xs text-muted-foreground">
                {Object.entries(item.specs).map(([k, v]) => (
                  <span key={k} className="mr-2">{k}: {v}</span>
                ))}
              </div>
            )}
          </div>
        );
      case "real_estate":
        return (
          <div className="space-y-1">
            {item.location && <p className="text-xs text-muted-foreground">📍 {item.location}</p>}
            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
          </div>
        );
      case "restaurant":
        return null;
      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Inventory</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={businessType} onValueChange={(v) => setBusinessType(v as BusinessType)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BUSINESS_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openAddDialog} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Your AI Brain uses this inventory to answer availability questions.
      </p>

      <ScrollArea className="max-h-[400px]">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No items yet. Add your first inventory item.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {item.price != null && (
                      <Badge variant="outline">{item.currency} {item.price}</Badge>
                    )}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  {renderItemDetails(item)}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Item name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price</Label>
                <Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" />
            </div>
            {renderFormFields()}
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Human Support Section */}
      <div className="mt-6 p-4 border border-border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Phone className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">Human Support</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          When a caller asks for something not in inventory but relevant to your business, BECCA will call this number to check availability.
        </p>
        <div className="flex gap-2">
          <Input
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="+1234567890 (with country code)"
            className="flex-1"
          />
          <Button onClick={handleSaveOwnerPhone} disabled={savingPhone} size="sm">
            {savingPhone ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
