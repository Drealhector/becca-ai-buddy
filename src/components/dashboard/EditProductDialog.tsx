import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MediaItem {
  id?: string;
  file?: File;
  preview: string;
  label: string;
  description: string;
  media_url?: string;
}

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onProductUpdated: () => void;
}

export const EditProductDialog = ({ open, onOpenChange, product, onProductUpdated }: EditProductDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salesInstructions, setSalesInstructions] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [stock, setStock] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [currentMediaLabel, setCurrentMediaLabel] = useState("");
  const [currentMediaDescription, setCurrentMediaDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentId, setAgentId] = useState("");

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setDescription(product.description || "");
      setSalesInstructions(product.sales_instructions || "");
      setPrice(product.price?.toString() || "");
      setCurrency(product.currency || "USD");
      setCategory(product.category || "");
      setFeatures(product.features?.join(', ') || "");
      setStock(product.stock?.toString() || "");
      
      // Fetch agent and media
      fetchProductData();
    }
  }, [product]);

  const fetchProductData = async () => {
    if (!product?.id) return;

    // Fetch agent
    const { data: agentData } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('product_id', product.id)
      .single();
    
    if (agentData) {
      setAgentId(agentData.assistant_id);
    }

    // Fetch media
    const { data: mediaData } = await supabase
      .from('product_media')
      .select('*')
      .eq('product_id', product.id);
    
    if (mediaData) {
      setMediaItems(mediaData.map(m => ({
        id: m.id,
        preview: m.media_url,
        label: m.label,
        description: m.description || "",
        media_url: m.media_url
      })));
    }
  };


  const removeMedia = async (index: number) => {
    const media = mediaItems[index];
    
    // If it's an existing media item, delete from database
    if (media.id) {
      const { error } = await supabase
        .from('product_media')
        .delete()
        .eq('id', media.id);
      
      if (error) {
        toast.error("Failed to delete media");
        return;
      }
    }
    
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-product-agent', {
        body: {
          productId: product.id,
          assistantId: agentId
        }
      });

      if (error) throw error;

      toast.success("Product deleted successfully!");
      onOpenChange(false);
      onProductUpdated();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Update product
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name,
          description,
          sales_instructions: salesInstructions,
          price: price ? parseFloat(price) : null,
          currency,
          category: category || null,
          features: features ? features.split(',').map(f => f.trim()) : null,
          stock: stock ? parseInt(stock) : 0
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      // Upload new media
      for (const media of mediaItems) {
        if (media.file) {
          const mediaExt = media.file.name.split('.').pop();
          const mediaFileName = `${Math.random()}.${mediaExt}`;
          const { error: mediaUploadError } = await supabase.storage
            .from('product-images')
            .upload(mediaFileName, media.file);

          if (mediaUploadError) throw mediaUploadError;

          const { data: { publicUrl: mediaUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(mediaFileName);

          await supabase.functions.invoke('upload-product-media', {
            body: {
              assistantId: agentId,
              productId: product.id,
              mediaUrl,
              mediaType: media.file.type.startsWith('image/') ? 'image' : 'video',
              label: media.label,
              description: media.description
            }
          });
        }
      }

      toast.success("Product updated successfully!");
      onOpenChange(false);
      onProductUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="features">Features (comma-separated)</Label>
            <Input
              id="features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="sales">Sales Instructions for AI</Label>
            <Textarea
              id="sales"
              value={salesInstructions}
              onChange={(e) => setSalesInstructions(e.target.value)}
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <Label>Additional Media</Label>
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

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Updating..." : "Update Product"}
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
