# Quick Vapi Setup - Copy & Paste Ready

## 🎯 What You Need to Configure in Vapi

### 1. Function Definition

Go to your Vapi assistant → Functions → Add Custom Function

**Copy these exactly:**

---

**Function Name:**
```
get_product_media
```

**Description:**
```
Fetches product images and videos. Call this when customer asks to see photos, videos, specific views, or any visual content about the product.
```

**Server URL:**
```
https://rexjtzpuywmytxomlpwg.supabase.co/functions/v1/get-product-media
```

**HTTP Method:**
```
POST
```

**Parameters (paste as JSON):**
```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "string",
      "description": "The UUID of the product"
    },
    "label": {
      "type": "string",
      "description": "Optional filter like 'front view', 'back view', 'demo'"
    },
    "media_type": {
      "type": "string",
      "enum": ["image", "video"],
      "description": "Optional: 'image' or 'video'"
    }
  },
  "required": ["product_id"]
}
```

---

### 2. System Prompt Addition

Add this to your assistant's system prompt:

```
You have access to product media through get_product_media function.

WHEN TO SHOW MEDIA:
- Customer asks "show me the product"
- Customer asks for specific views (front, back, side)
- Customer asks "what does it look like?"
- During price negotiations to show value
- Customer says "I want to see it"

HOW TO USE:
Call get_product_media with:
- product_id: {{product_id}} (from context)
- label: Optional, e.g. "front view" or "blue"
- media_type: Optional, "image" or "video"

BE PROACTIVE:
- Offer to show media early in conversation
- Use media to support your sales points
- Reference what's visible in each image

EXAMPLE:
Customer: "Show me this product"
You: "Absolutely! Let me pull up some photos for you."
[calls get_product_media]
You: "Here's the front view - you can see the sleek design and premium finish."
```

---

### 3. Variables Configuration

In Vapi assistant settings → Variables, add these:

| Variable Name | Type | Description |
|--------------|------|-------------|
| `product_id` | string | Product UUID |
| `product_name` | string | Product name |
| `product_price` | number | Product price |

These will be passed from your ProductPage automatically.

---

## 🧪 Quick Test

After setup, test with these prompts:

1. "Show me the product"
2. "Do you have photos?"
3. "Show me the front view"
4. "Can I see a demo video?"

**Expected:** AI responds, calls function, media displays below chat.

---

## ✅ Checklist

- [ ] Function added in Vapi dashboard
- [ ] Server URL points to your edge function
- [ ] Parameters schema matches exactly
- [ ] System prompt includes media instructions
- [ ] Variables configured (product_id, product_name, product_price)
- [ ] Tested with "show me the product"
- [ ] Media displays when function is called

---

## 🔧 If Something Doesn't Work

**Function not being called?**
- Make prompt more explicit: "Call get_product_media when customer says 'show'"
- Test directly: Tell AI "call the get_product_media function now"

**No media displaying?**
- Check browser console for errors
- Verify product has media in database
- Check Vapi function logs

**Wrong media showing?**
- Use label parameter to filter
- Example: `label: "front view"`

---

## 💡 Pro Tips

**E-commerce Negotiation Strategy:**
```
When negotiating:
1. Show media first (establish value)
2. Reference visible features
3. Use quality shown in photos to justify price
4. Offer discount only after showing value

Example:
"Let me show you why this is worth $100..."
[shows media]
"As you can see in these photos, the craftsmanship is exceptional. I can offer 10% off to $90."
```

**Media + Conversation Flow:**
```
1. Greeting → Show product immediately
2. Questions about features → Show relevant view
3. Color/variant questions → Show that variant
4. Negotiation → Show value through media
5. Demo requests → Show video
```
