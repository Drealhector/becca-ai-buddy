# Vapi Function Calling Setup Guide

## Overview
This guide shows you how to configure your Vapi assistant to fetch and display product media from your Supabase database using function calling.

## Architecture
```
Customer asks for media
    ↓
Vapi AI detects need for media
    ↓
Vapi calls get_product_media function
    ↓
Your Edge Function queries Supabase
    ↓
Returns media URLs + metadata
    ↓
Frontend displays images/videos
```

## Step 1: Function Endpoint Configuration

**Your Function Endpoint URL:**
```
https://rexjtzpuywmytxomlpwg.supabase.co/functions/v1/get-product-media
```

This edge function is already created and deployed. It queries your `product_media` table.

## Step 2: Configure Function in Vapi Dashboard

Go to your Vapi assistant settings and add a **Custom Function** with these exact settings:

### Function Definition

**Function Name:** `get_product_media`

**Description:**
```
Fetches product images and videos from the database. Use this when the customer asks to see product photos, videos, specific views (front, back, side), or any visual content. Always call this function when discussing product appearance or features.
```

**Server URL:**
```
https://rexjtzpuywmytxomlpwg.supabase.co/functions/v1/get-product-media
```

**HTTP Method:** `POST`

### Parameters Schema (JSON)

```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "string",
      "description": "The UUID of the product (you'll get this from the conversation context)"
    },
    "label": {
      "type": "string",
      "description": "Optional. Search for specific media labels like 'front view', 'back view', 'side view', 'demo', etc."
    },
    "media_type": {
      "type": "string",
      "enum": ["image", "video"],
      "description": "Optional. Filter by media type: 'image' or 'video'"
    }
  },
  "required": ["product_id"]
}
```

### Function Response Format

The function returns:
```json
{
  "success": true,
  "media": [
    {
      "url": "https://...",
      "type": "image",
      "label": "front view",
      "description": "Product front view showing..."
    }
  ],
  "count": 1
}
```

## Step 3: Update System Prompt

Add this to your Vapi assistant's system prompt:

```
## Product Media Access

You have access to product images and videos through the get_product_media function.

### When to Show Media:
- Customer asks to see the product
- Customer asks for specific views (front, back, side, etc.)
- Customer asks about product appearance or features
- Customer wants to see a demo or how it works
- During price negotiations (show value through visuals)

### How to Use:
1. Call get_product_media with the product_id from the conversation context
2. Optionally filter by label (e.g., "front view") or media_type ("image" or "video")
3. The media will automatically display in the customer's interface
4. Reference the media naturally: "Here's the front view showing..." or "Let me show you a video demo..."

### Best Practices:
- Proactively offer to show media during the conversation
- Use descriptive labels to find specific views
- Mention what's visible in each image/video
- Use media to support your sales points

Example:
Customer: "Do you have this in blue?"
You: "Let me show you! [calls get_product_media with label='blue'] Here's our blue version - you can see the vibrant color in this photo."
```

## Step 4: Pass Product Context

When starting a Vapi call from your ProductPage, you need to pass the product_id in the conversation context.

### Update Vapi Initialization:

In your `initializeVapi()` function, modify to:

```typescript
const initializeVapi = () => {
  if (!(window as any).Vapi || !agentId) return;

  const vapi = new (window as any).Vapi({
    apiKey: 'cb6d31db-2209-4ffa-ac27-794c02fcd8ec',
    assistant: {
      assistantId: agentId,
      assistantOverrides: {
        variableValues: {
          product_id: product?.id || '',
          product_name: product?.name || '',
          product_price: product?.price || 0
        }
      }
    }
  });

  // Listen for function calls
  vapi.on('function-call', (functionCall: any) => {
    if (functionCall.name === 'get_product_media' && functionCall.result) {
      const result = functionCall.result;
      if (result.success && result.media) {
        setDisplayedMedia(result.media);
      }
    }
  });

  vapi.start();
};
```

## Step 5: Test the Integration

### Test Prompts to Try:

1. **Simple request:**
   - "Show me the product"
   - "Do you have any photos?"

2. **Specific views:**
   - "Show me the front view"
   - "Can I see the back?"
   - "Do you have a side view?"

3. **Media type specific:**
   - "Show me a video"
   - "Do you have any demo videos?"

4. **During conversation:**
   - "What does it look like?"
   - "Show me what I'm buying"
   - "Can I see more angles?"

### Expected Behavior:

1. Customer asks for media
2. AI responds naturally (e.g., "Sure! Let me show you...")
3. AI calls `get_product_media` function
4. Media appears in the display section below the chat/voice interface
5. AI confirms (e.g., "Here's the front view showing the sleek design")

## Step 6: Advanced Features

### Negotiation with Media:

Update your system prompt to use media during negotiations:

```
When negotiating price:
1. Show product media to reinforce value
2. Reference specific features visible in the images
3. Use media to justify the price point

Example:
Customer: "Can you do $50?"
You: [calls get_product_media] "Let me show you why this is worth $80. [media displays] You can see the premium materials and craftsmanship in these photos. However, I can offer 10% off, bringing it to $72."
```

### Multiple Media Display:

The function returns all matching media. You can:
- Show all product angles at once
- Display before/after comparisons
- Show product in different colors/variations

## Troubleshooting

### Media Not Displaying:

1. **Check product has media:**
   ```sql
   SELECT * FROM product_media WHERE product_id = 'your-product-id';
   ```

2. **Check function response:**
   - Open browser console
   - Look for function call logs
   - Verify `functionCall.result` contains media array

3. **Check Vapi function configuration:**
   - Verify Server URL is correct
   - Ensure parameters match exactly
   - Check function is enabled in assistant

### Function Not Being Called:

1. **Update system prompt** - Make it more explicit about using the function
2. **Test with direct command** - "Call the get_product_media function"
3. **Check Vapi logs** - Look for function execution logs in Vapi dashboard

## Security Notes

- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to query the database
- No sensitive data is exposed to the frontend
- Product media is publicly accessible (stored in public bucket)
- Function validates all inputs before querying

## Next Steps

1. ✅ Edge function is deployed
2. ⏳ Configure function in Vapi dashboard (you need to do this)
3. ⏳ Update system prompt with media instructions
4. ⏳ Test with different media requests
5. ⏳ Add negotiation + media strategy

---

**Need Help?**
- Check Vapi dashboard for function call logs
- Check browser console for errors
- Check edge function logs in your Supabase dashboard
