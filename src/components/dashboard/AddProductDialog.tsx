import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MediaItem {
  file: File;
  preview: string;
  label: string;
  description: string;
}

export const AddProductDialog = ({ onProductAdded }: { onProductAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salesInstructions, setSalesInstructions] = useState("");
  const [linkSlug, setLinkSlug] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [stock, setStock] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [currentMediaLabel, setCurrentMediaLabel] = useState("");
  const [currentMediaDescription, setCurrentMediaDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const removeMedia = (index: number) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !linkSlug || !imageFile) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Upload main product image
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Create product record
      const { data: productData, error: insertError } = await supabase
        .from('products')
        .insert({
          name,
          description,
          sales_instructions: salesInstructions,
          image_url: publicUrl,
          link_slug: linkSlug.toLowerCase().replace(/\s+/g, '-'),
          price: price ? parseFloat(price) : null,
          currency,
          category: category || null,
          features: features ? features.split(',').map(f => f.trim()) : null,
          stock: stock ? parseInt(stock) : 0
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update master assistant with new product
      const { data: agentData } = await supabase.functions.invoke('create-product-agent', {
        body: {
          productId: productData.id
        }
      });

      console.log('Master assistant updated:', agentData);

      // Upload additional media if any
      if (mediaItems.length > 0 && agentData?.agentId) {
        for (const media of mediaItems) {
          const mediaExt = media.file.name.split('.').pop();
          const mediaFileName = `${Math.random()}.${mediaExt}`;
          const { error: mediaUploadError } = await supabase.storage
            .from('product-images')
            .upload(mediaFileName, media.file);

          if (mediaUploadError) throw mediaUploadError;

          const { data: { publicUrl: mediaUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(mediaFileName);

          // Auto-prefix label with product name
          const fullLabel = `${name} - ${media.label}`;

          await supabase.functions.invoke('upload-product-media', {
            body: {
              assistantId: agentData.agentId,
              productId: productData.id,
              mediaUrl,
              mediaType: media.file.type.startsWith('image/') ? 'image' : 'video',
              label: fullLabel,
              description: media.description
            }
          });
        }
      }

      toast.success("Product and AI agent created successfully!");
      setOpen(false);
      setName("");
      setDescription("");
      setSalesInstructions("");
      setLinkSlug("");
      setPrice("");
      setCurrency("USD");
      setCategory("");
      setFeatures("");
      setStock("");
      setImageFile(null);
      setImagePreview("");
      setMediaItems([]);
      onProductAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Product Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="NGN">Naira (₦)</SelectItem>
                  <SelectItem value="GHS">Cedis (₵)</SelectItem>
                  <SelectItem value="GBP">Pounds (£)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Electronics, Clothing"
            />
          </div>

          <div>
            <Label htmlFor="features">Features (comma-separated)</Label>
            <Input
              id="features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="e.g., Wireless, Bluetooth, USB-C"
            />
          </div>

          <div>
            <Label htmlFor="sales">Sales Instructions for AI</Label>
            <Textarea
              id="sales"
              value={salesInstructions}
              onChange={(e) => setSalesInstructions(e.target.value)}
              placeholder="Explain to the AI how to sell this product"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="slug">Link Name *</Label>
            <Input
              id="slug"
              value={linkSlug}
              onChange={(e) => setLinkSlug(e.target.value)}
              placeholder="e.g., my-product"
              required
            />
          </div>

          <div>
            <Label htmlFor="image">Main Product Image *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {imageFile ? imageFile.name : "Upload Image"}
              </Button>
            </div>
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded" />
            )}
          </div>

          <div className="border-t pt-4">
            <Label>Additional Media (for AI agent)</Label>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Label (e.g., 'front view', 'demo video')"
                value={currentMediaLabel}
                onChange={(e) => setCurrentMediaLabel(e.target.value)}
              />
              <Input
                placeholder="Description (optional)"
                value={currentMediaDescription}
                onChange={(e) => setCurrentMediaDescription(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Input
                  id="media"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('media') as HTMLInputElement;
                    const file = input?.files?.[0];
                    if (file && currentMediaLabel) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setMediaItems([...mediaItems, {
                          file,
                          preview: reader.result as string,
                          label: currentMediaLabel,
                          description: currentMediaDescription
                        }]);
                        setCurrentMediaLabel("");
                        setCurrentMediaDescription("");
                        input.value = "";
                      };
                      reader.readAsDataURL(file);
                    } else if (!file) {
                      input?.click();
                    } else {
                      toast.error("Please add a label");
                    }
                  }}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Media
                </Button>
              </div>
            </div>

            {mediaItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {mediaItems.map((media, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <img src={media.preview} alt={media.label} className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{media.label}</p>
                      {media.description && <p className="text-xs text-muted-foreground">{media.description}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Product Link"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
