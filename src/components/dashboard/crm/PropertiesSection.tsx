import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Trash2,
  Edit,
  BedDouble,
  Bath,
  Maximize,
  MapPin,
} from "lucide-react";

// --- Types ---

interface Property {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  status: string;
  price: number | null;
  currency: string;
  price_period: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  features: string[];
  images: string[];
  created_at: string;
}

// --- Constants ---

const PROPERTY_TYPES = ["Apartment", "House", "Land", "Commercial", "Duplex"];
const LISTING_TYPES = ["Sale", "Rent", "Lease", "Short Let"];
const STATUSES = ["Available", "Under Offer", "Sold", "Rented", "Off Market"];
const CURRENCIES = ["NGN", "USD", "EUR", "GBP"];
const PRICE_PERIODS = [
  { value: "none", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "\u20A6",
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
};

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Under Offer": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Sold: "bg-red-500/20 text-red-400 border-red-500/30",
  Rented: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Off Market": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

// --- Helpers ---

function formatPrice(
  price: number | null,
  currency: string,
  pricePeriod: string | null
): string {
  if (price == null) return "Price on request";
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = price.toLocaleString();
  const suffix =
    pricePeriod === "monthly"
      ? "/mo"
      : pricePeriod === "yearly"
      ? "/yr"
      : "";
  return `${symbol}${formatted}${suffix}`;
}

// --- Component ---

const PropertiesSection = () => {
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterListing, setFilterListing] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formPropertyType, setFormPropertyType] = useState("Apartment");
  const [formListingType, setFormListingType] = useState("Sale");
  const [formStatus, setFormStatus] = useState("Available");
  const [formPrice, setFormPrice] = useState("");
  const [formCurrency, setFormCurrency] = useState("NGN");
  const [formPricePeriod, setFormPricePeriod] = useState("none");
  const [formBedrooms, setFormBedrooms] = useState("");
  const [formBathrooms, setFormBathrooms] = useState("");
  const [formSqft, setFormSqft] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const [formImages, setFormImages] = useState("");

  // --- Convex reactive data ---
  const properties = useQuery(api.properties.list, {}) ?? [];
  const createProperty = useMutation(api.properties.create);
  const updateProperty = useMutation(api.properties.update);
  const deleteProperty = useMutation(api.properties.remove);

  // --- Filtered data ---

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (filterType !== "all" && p.property_type !== filterType) return false;
      if (filterListing !== "all" && p.listing_type !== filterListing)
        return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    });
  }, [properties, filterType, filterListing, filterStatus]);

  // --- Form helpers ---

  const resetForm = () => {
    setFormTitle("");
    setFormPropertyType("Apartment");
    setFormListingType("Sale");
    setFormStatus("Available");
    setFormPrice("");
    setFormCurrency("NGN");
    setFormPricePeriod("none");
    setFormBedrooms("");
    setFormBathrooms("");
    setFormSqft("");
    setFormAddress("");
    setFormCity("");
    setFormState("");
    setFormDescription("");
    setFormFeatures("");
    setFormImages("");
    setEditingProperty(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (property: Property) => {
    setEditingProperty(property);
    setFormTitle(property.title);
    setFormPropertyType(property.property_type || "Apartment");
    setFormListingType(property.listing_type || "Sale");
    setFormStatus(property.status || "Available");
    setFormPrice(property.price?.toString() || "");
    setFormCurrency(property.currency || "NGN");
    setFormPricePeriod(property.price_period || "none");
    setFormBedrooms(property.bedrooms?.toString() || "");
    setFormBathrooms(property.bathrooms?.toString() || "");
    setFormSqft(property.sqft?.toString() || "");
    setFormAddress(property.address || "");
    setFormCity(property.city || "");
    setFormState(property.state || "");
    setFormDescription(property.description || "");
    setFormFeatures(property.features?.join(", ") || "");
    setFormImages(property.images?.join(", ") || "");
    setShowAddDialog(true);
  };

  // --- CRUD ---

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);

    const featuresArray = formFeatures
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const imagesArray = formImages
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    const record: any = {
      title: formTitle.trim(),
      property_type: formPropertyType,
      listing_type: formListingType,
      status: formStatus,
      price: formPrice ? parseFloat(formPrice) : null,
      currency: formCurrency,
      price_period: formPricePeriod === "none" ? null : formPricePeriod,
      bedrooms: formBedrooms ? parseInt(formBedrooms) : null,
      bathrooms: formBathrooms ? parseInt(formBathrooms) : null,
      sqft: formSqft ? parseInt(formSqft) : null,
      address: formAddress || null,
      city: formCity || null,
      state: formState || null,
      description: formDescription || null,
      features: featuresArray,
      images: imagesArray,
    };

    try {
      if (editingProperty) {
        await updateProperty({ id: editingProperty._id || editingProperty.id, ...record } as any);
        toast.success("Property updated");
      } else {
        await createProperty(record as any);
        toast.success("Property added");
      }
      setShowAddDialog(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving property:", error);
      toast.error("Failed to save property");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteProperty({ id: deletingId as any });
      toast.success("Property deleted");
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    } finally {
      setDeletingId(null);
    }
  };

  // --- Render ---

  return (
    <Card className="p-6 h-full flex flex-col bg-black/40 backdrop-blur-xl border-cyan-500/10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">
            Property Listings
          </h2>
        </div>
        <Button
          onClick={openAddDialog}
          size="sm"
          className="gap-1 bg-cyan-600 hover:bg-cyan-500 text-white"
        >
          <Plus className="h-4 w-4" /> Add Property
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROPERTY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterListing} onValueChange={setFilterListing}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Listing Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Listings</SelectItem>
            {LISTING_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Properties Grid */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-sm text-white/40">
              No properties listed yet
            </p>
            <p className="text-xs text-white/25 mt-1">
              Click "Add Property" to create your first listing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEdit={() => openEditDialog(property)}
                onDelete={() => setDeletingId(property.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add / Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border-cyan-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProperty ? "Edit Property" : "Add Property"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label className="text-white/70">Title *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="3 Bedroom Apartment in Lekki"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Type / Listing / Status row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-white/70">Property Type</Label>
                <Select
                  value={formPropertyType}
                  onValueChange={setFormPropertyType}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Listing Type</Label>
                <Select
                  value={formListingType}
                  onValueChange={setFormListingType}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-white/70">Price</Label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="45000000"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Currency</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Price Period</Label>
                <Select
                  value={formPricePeriod}
                  onValueChange={setFormPricePeriod}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_PERIODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Specs row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-white/70">Bedrooms</Label>
                <Input
                  type="number"
                  value={formBedrooms}
                  onChange={(e) => setFormBedrooms(e.target.value)}
                  placeholder="3"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Bathrooms</Label>
                <Input
                  type="number"
                  value={formBathrooms}
                  onChange={(e) => setFormBathrooms(e.target.value)}
                  placeholder="2"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Sqft</Label>
                <Input
                  type="number"
                  value={formSqft}
                  onChange={(e) => setFormSqft(e.target.value)}
                  placeholder="1500"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-white/70">Address</Label>
                <Input
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">City</Label>
                <Input
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="Lagos"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">State</Label>
                <Input
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  placeholder="Lagos"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-white/70">Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe the property..."
                className="min-h-[80px] bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Features */}
            <div>
              <Label className="text-white/70">
                Features (comma separated)
              </Label>
              <Input
                value={formFeatures}
                onChange={(e) => setFormFeatures(e.target.value)}
                placeholder="Swimming Pool, Gym, 24hr Power, Security"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Images */}
            <div>
              <Label className="text-white/70">
                Image URLs (comma separated)
              </Label>
              <Input
                value={formImages}
                onChange={(e) => setFormImages(e.target.value)}
                placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {loading
                ? "Saving..."
                : editingProperty
                ? "Update Property"
                : "Add Property"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent className="bg-gray-950 border-red-500/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Property
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete this property? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

// --- Property Card Sub-component ---

function PropertyCard({
  property,
  onEdit,
  onDelete,
}: {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasImage = property.images && property.images.length > 0;

  return (
    <div className="group relative rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.06)]">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {hasImage ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-900/40 via-gray-900 to-purple-900/30 flex items-center justify-center">
            <Building2 className="h-10 w-10 text-white/15" />
          </div>
        )}

        {/* Edit / Delete buttons overlay */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            className="h-7 w-7 bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="h-7 w-7 bg-black/60 backdrop-blur-sm hover:bg-red-900/80 text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <Badge
            className={`text-[10px] font-medium border ${
              STATUS_COLORS[property.status] || STATUS_COLORS["Off Market"]
            }`}
          >
            {property.status}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title + Price */}
        <div>
          <h3 className="font-semibold text-white text-sm leading-tight truncate">
            {property.title}
          </h3>
          <p className="text-cyan-400 font-bold text-base mt-0.5">
            {formatPrice(
              property.price,
              property.currency,
              property.price_period
            )}
          </p>
        </div>

        {/* Stats row */}
        {(property.bedrooms || property.bathrooms || property.sqft) && (
          <div className="flex items-center gap-3 text-xs text-white/50">
            {property.bedrooms != null && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {property.bathrooms}
              </span>
            )}
            {property.sqft != null && (
              <span className="flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5" />
                {property.sqft.toLocaleString()} sqft
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {(property.city || property.state) && (
          <p className="flex items-center gap-1 text-xs text-white/40">
            <MapPin className="h-3 w-3" />
            {[property.city, property.state].filter(Boolean).join(", ")}
          </p>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge
            variant="outline"
            className="text-[10px] border-cyan-500/20 text-cyan-300/70"
          >
            {property.property_type}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] border-white/10 text-white/50"
          >
            {property.listing_type}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default PropertiesSection;
