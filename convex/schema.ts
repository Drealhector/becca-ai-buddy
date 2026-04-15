import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── AUTH & BUSINESS ────────────────────────────────────────
  business_keys: defineTable({
    business_key: v.string(),
    business_name: v.string(),
    is_active: v.boolean(),
    created_at: v.string(),
  })
    .index("by_business_key", ["business_key"])
    .index("by_business_name", ["business_name"])
    .index("by_key_and_name", ["business_key", "business_name"]),

  user_onboarding: defineTable({
    user_id: v.string(),
    business_key: v.optional(v.string()),
    onboarding_completed: v.optional(v.boolean()),
    completed_at: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_user_id", ["user_id"]),

  user_roles: defineTable({
    user_id: v.string(),
    business_id: v.id("business_keys"),
    role: v.string(), // "admin" | "member" | "viewer"
    created_at: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_business_id", ["business_id"]),

  // ─── BOT CONFIG & PERSONALITY ──────────────────────────────
  bot_config: defineTable({
    bot_active: v.optional(v.boolean()),
    character: v.optional(v.string()),
    is_enabled: v.optional(v.boolean()),
    model: v.optional(v.string()),
    personality: v.optional(v.string()),
    system_prompt: v.optional(v.string()),
    tone: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }),

  bot_personality: defineTable({
    personality_text: v.string(),
    updated_at: v.optional(v.string()),
  }),

  // ─── TOGGLES & CONNECTIONS ─────────────────────────────────
  toggles: defineTable({
    business_id: v.optional(v.id("business_keys")),
    master_switch: v.optional(v.boolean()),
    whatsapp_on: v.optional(v.boolean()),
    instagram_on: v.optional(v.boolean()),
    facebook_on: v.optional(v.boolean()),
    telegram_on: v.optional(v.boolean()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_business_id", ["business_id"]),

  connections: defineTable({
    business_id: v.optional(v.id("business_keys")),
    phone_number: v.optional(v.string()),
    // Channel tokens (per-business, set when user connects their socials)
    whatsapp_access_token: v.optional(v.string()),
    whatsapp_phone_number_id: v.optional(v.string()),
    whatsapp_business_account_id: v.optional(v.string()),
    instagram_access_token: v.optional(v.string()),
    instagram_page_id: v.optional(v.string()),
    facebook_access_token: v.optional(v.string()),
    facebook_page_id: v.optional(v.string()),
    telegram_bot_token: v.optional(v.string()),
    telegram_chat_id: v.optional(v.string()),
    // Legacy n8n webhook URLs (will be removed after full migration)
    whatsapp_n8n_webhook_url: v.optional(v.string()),
    instagram_n8n_webhook_url: v.optional(v.string()),
    facebook_n8n_webhook_url: v.optional(v.string()),
    telegram_n8n_webhook_url: v.optional(v.string()),
    // Telnyx fields (replacing VAPI)
    telnyx_api_key: v.optional(v.string()),
    telnyx_connection_id: v.optional(v.string()),
    telnyx_phone_number: v.optional(v.string()),
    telnyx_sip_uri: v.optional(v.string()),
    telnyx_app_id: v.optional(v.string()),
    telnyx_whatsapp_number: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_business_id", ["business_id"]),

  // ─── CUSTOMIZATIONS ────────────────────────────────────────
  customizations: defineTable({
    business_id: v.optional(v.id("business_keys")),
    business_name: v.optional(v.string()),
    business_description: v.optional(v.string()),
    business_industry: v.optional(v.string()),
    business_hours: v.optional(v.string()),
    tone: v.optional(v.string()),
    greeting: v.optional(v.string()),
    faqs: v.optional(v.any()), // JSON array
    logo_url: v.optional(v.string()),
    chat_logo_url: v.optional(v.string()),
    background_image_url: v.optional(v.string()),
    hub_bg_desktop_url: v.optional(v.string()),
    hub_bg_phone_url: v.optional(v.string()),
    hub_bg_tablet_url: v.optional(v.string()),
    owner_phone: v.optional(v.string()),
    assistant_personality: v.optional(v.string()),
    key_services: v.optional(v.string()),
    target_audience: v.optional(v.string()),
    special_instructions: v.optional(v.string()),
    setup_strength: v.optional(v.string()),
    custom_voices: v.optional(v.any()), // JSON
    voices: v.optional(v.any()), // JSON
    instagram_username: v.optional(v.string()),
    facebook_username: v.optional(v.string()),
    telegram_username: v.optional(v.string()),
    whatsapp_username: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_business_id", ["business_id"]),

  // ─── PRODUCTS (kept for legacy product pages, link slugs) ──
  products: defineTable({
    business_id: v.optional(v.id("business_keys")),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    category: v.optional(v.string()),
    image_url: v.optional(v.string()),
    link_slug: v.string(),
    features: v.optional(v.array(v.string())),
    sales_instructions: v.optional(v.string()),
    stock: v.optional(v.number()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_link_slug", ["link_slug"]),

  // ─── UNIFIED CUSTOMER IDENTITY ──────────────────────────────
  // ONE table for ALL customer data across ALL channels.
  // Phone number OR platform ID is the key. Memory carries across channels.
  callers: defineTable({
    phone: v.string(),                          // primary identifier (phone number or platform:userId)
    name: v.optional(v.string()),               // customer name (learned across any channel)
    call_count: v.optional(v.number()),          // total interactions across all channels
    memory_summary: v.optional(v.string()),      // rolling AI memory (max 3000 chars, cross-channel)
    interaction_history: v.optional(v.any()),    // JSON array: [{summary, date, channel}]
    first_contacted_at: v.optional(v.string()),  // first ever interaction
    last_call_at: v.optional(v.string()),        // last interaction timestamp
    last_channel: v.optional(v.string()),        // which channel they last used
    updated_at: v.optional(v.string()),
  })
    .index("by_phone", ["phone"])
    .index("by_last_call", ["last_call_at"]),

  customer_interactions: defineTable({
    business_id: v.optional(v.id("business_keys")),
    assistant_id: v.string(),
    call_id: v.string(),
    duration: v.optional(v.number()),
    outcome: v.optional(v.string()),
    transcript: v.optional(v.string()),
    timestamp: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_call_id", ["call_id"]),

  // ─── CONVERSATIONS & MESSAGES ──────────────────────────────
  conversations: defineTable({
    business_id: v.optional(v.id("business_keys")),
    platform: v.optional(v.string()),
    start_time: v.optional(v.string()),
    end_time: v.optional(v.string()),
    summary: v.optional(v.string()),
  }).index("by_business_id", ["business_id"]),

  messages: defineTable({
    business_id: v.optional(v.id("business_keys")),
    conversation_id: v.optional(v.id("conversations")),
    content: v.optional(v.string()),
    role: v.optional(v.string()),
    sender_name: v.optional(v.string()),
    platform: v.optional(v.string()),
    timestamp: v.optional(v.string()),
  })
    .index("by_conversation_id", ["conversation_id"])
    .index("by_business_id", ["business_id"]),

  // ─── CALLS & TRANSCRIPTS ───────────────────────────────────
  call_history: defineTable({
    business_id: v.optional(v.id("business_keys")),
    conversation_id: v.optional(v.string()),
    type: v.optional(v.string()), // "incoming" | "outgoing"
    number: v.optional(v.string()),
    topic: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    recording_url: v.optional(v.string()),
    timestamp: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_timestamp", ["timestamp"]),

  transcripts: defineTable({
    business_id: v.optional(v.id("business_keys")),
    conversation_id: v.optional(v.string()),
    transcript_text: v.optional(v.string()),
    caller_info: v.optional(v.string()),
    sales_flagged: v.optional(v.boolean()),
    timestamp: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_conversation_id", ["conversation_id"]),

  scheduled_calls: defineTable({
    business_id: v.optional(v.id("business_keys")),
    phone_number: v.string(),
    purpose: v.string(),
    scheduled_at: v.string(),
    status: v.optional(v.string()), // "pending" | "executing" | "completed" | "failed"
    executed_at: v.optional(v.string()),
    created_at: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_status", ["status"]),

  // ─── ESCALATION ────────────────────────────────────────────
  escalation_requests: defineTable({
    parent_call_id: v.string(),
    escalation_call_id: v.optional(v.string()),
    control_url: v.string(),
    status: v.optional(v.string()),
    item_requested: v.optional(v.string()),
    human_response: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  }).index("by_parent_call_id", ["parent_call_id"]),

  // ─── CRM ───────────────────────────────────────────────────
  contacts: defineTable({
    business_id: v.optional(v.id("business_keys")),
    full_name: v.optional(v.string()),
    name: v.optional(v.string()), // alias for channelHandler compatibility
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    temperature: v.optional(v.string()), // "hot" | "warm" | "cold"
    lead_score: v.optional(v.number()), // 0-100
    lead_temperature: v.optional(v.string()),
    budget_min: v.optional(v.number()),
    budget_max: v.optional(v.number()),
    preferred_locations: v.optional(v.array(v.string())),
    property_type_interests: v.optional(v.array(v.string())),
    memory_summary: v.optional(v.string()),
    last_contact_date: v.optional(v.string()),
    active_leads_count: v.optional(v.number()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_email", ["email"])
    .index("by_phone", ["phone"]),

  leads: defineTable({
    business_id: v.optional(v.id("business_keys")),
    contact_id: v.optional(v.id("contacts")),
    title: v.optional(v.string()),
    status: v.optional(v.string()), // "new" | "contacted" | "qualified" | "viewing_scheduled" | "offer_made" | "negotiating" | "closed_won" | "closed_lost"
    priority: v.optional(v.string()), // "low" | "medium" | "high"
    lead_type: v.optional(v.string()), // "buyer" | "seller" | "renter" | "investor"
    source: v.optional(v.string()),
    property_interest: v.optional(v.string()),
    deal_value: v.optional(v.number()),
    notes: v.optional(v.string()),
    assigned_to: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_status", ["status"])
    .index("by_contact_id", ["contact_id"]),

  deals: defineTable({
    business_id: v.optional(v.id("business_keys")),
    lead_id: v.optional(v.id("leads")),
    title: v.optional(v.string()),
    deal_value: v.optional(v.number()),
    stage: v.optional(v.string()), // matches lead status stages
    status: v.optional(v.string()),
    expected_close: v.optional(v.string()),
    actual_close_date: v.optional(v.string()),
    notes: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_stage", ["stage"])
    .index("by_lead_id", ["lead_id"]),

  activities: defineTable({
    business_id: v.optional(v.id("business_keys")),
    contact_id: v.optional(v.id("contacts")),
    lead_id: v.optional(v.id("leads")),
    activity_type: v.optional(v.string()), // "call" | "email" | "meeting" | "note" | "viewing" | "follow_up" | "message"
    type: v.optional(v.string()), // alias for channelHandler compatibility
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduled_at: v.optional(v.string()),
    completed_at: v.optional(v.string()),
    is_completed: v.optional(v.boolean()),
    is_ai_generated: v.optional(v.boolean()),
    completed: v.optional(v.boolean()), // alias for channelHandler
    created_by: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_contact_id", ["contact_id"])
    .index("by_lead_id", ["lead_id"])
    .index("by_is_completed", ["is_completed"]),

  properties: defineTable({
    business_id: v.optional(v.id("business_keys")),
    title: v.optional(v.string()),
    property_type: v.optional(v.string()), // "house" | "apartment" | "condo" | "land" | "commercial"
    listing_type: v.optional(v.string()), // "sale" | "rent" | "lease"
    status: v.optional(v.string()), // "available" | "pending" | "sold" | "rented"
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    price_period: v.optional(v.string()), // "monthly" | "yearly" | "one-time"
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    sqft: v.optional(v.number()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    description: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    features: v.optional(v.array(v.string())),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
  })
    .index("by_business_id", ["business_id"])
    .index("by_status", ["status"]),

  lead_stage_history: defineTable({
    lead_id: v.optional(v.id("leads")),
    from_stage: v.optional(v.string()),
    to_stage: v.optional(v.string()),
    changed_at: v.optional(v.string()),
    changed_by: v.optional(v.string()),
  }).index("by_lead_id", ["lead_id"]),

  // Temporary mapping: Telnyx call → real caller phone
  // Written by dynamic_variables webhook (which gets the real phone from Telnyx)
  // Read by customer_lookup and save_customer webhooks (which DON'T get the real phone)
  active_calls: defineTable({
    telnyx_call_id: v.string(),
    caller_phone: v.string(),
    created_at: v.string(),
  }).index("by_call_id", ["telnyx_call_id"]),
});
