## BECCA BRAIN — Full Session Handover (Updated 2026-04-03, Session 16)

### What This Project Is
A SaaS AI assistant platform (real estate niche) that manages customer interactions across WhatsApp, Instagram, Facebook, Telegram, phone calls, and web chat — all with ONE brain, ONE memory, ONE personality. Every interaction feeds a CRM automatically. Voice cloning, AI personality, and a floating conversational AI ball are powered by ElevenLabs. Phone calls run on Telnyx AI Assistant.

### What Was Done Across All Sessions

**Full backend migration from Supabase → Convex + VAPI → Telnyx, then full synergy + optimization + ElevenLabs integration + security hardening**

---

### STAGES 1-12: Full Migration (Previous Sessions) ✅

- Created Convex project `becca-brain` (deployment: `diligent-nightingale-429`, US East)
- Migrated all 23 tables from Supabase to Convex with full schema
- Wrapped frontend in `ConvexProvider`, swapped all components to `useQuery`/`useMutation`
- Built unified customer identity (`callers` table — ONE table for ALL channels)
- Built `channelHandler.ts` — central brain connector (processInteraction + getCustomerContext)
- Built functional CRM: contacts, leads, deals, activities, properties with auto-lead detection
- Built `convex/ai.ts` — unified AI response engine (OpenAI GPT-4o-mini)
- Built `convex/http.ts` — HTTP endpoints replacing n8n for all channels
- Migrated VAPI → Telnyx AI Assistant (claude-haiku-4-5)
- Built ElevenLabs voice clone, AI logo/background generation, character creator
- Deleted all Supabase code, edge functions, migrations, packages
- Seeded database with config data

### STAGE 13: Data Seeding + Call Pipeline Setup ✅

- Fixed 9 TypeScript errors (`?? null` → `?? undefined`)
- Seeded all config tables (personality, toggles, customizations, connections)
- Configured Telnyx assistant (recording, transcription, webhooks, tools)
- Built call direction detection (incoming vs outgoing)
- Verified full call pipeline end-to-end with simulated calls

### STAGE 14: Audit, Synergy + Optimization ✅

**Codebase Audit & Fixes:**
- TypeScript + Vite build: clean (zero errors)
- Fixed `connections.ts` upsert() — added 9 missing channel token fields (whatsapp_access_token, instagram_access_token, etc.) that were silently dropped on first-time social connect
- Fixed `WebChatWidget.tsx` — changed from `VITE_SUPABASE_URL/functions/v1/web-chat` to `VITE_CONVEX_SITE_URL/web-chat`, removed Supabase Bearer auth header
- Fixed `ProductChat.tsx` — changed from `VITE_SUPABASE_URL/functions/v1/product-chat` to `VITE_CONVEX_SITE_URL/web-chat`
- Verified all deleted files have no dangling imports
- Verified all 27 Convex modules reference valid tables/indexes

**Voice Agent ↔ Dashboard Synergy:**
- Built `POST /telnyx/save-customer` endpoint — Telnyx can save caller names/preferences mid-call → feeds callers table + CRM contacts
- Built `POST /telnyx/get-properties` endpoint — Telnyx can search properties with filters (bedrooms, city, listing_type, property_type, max_price, min_price) → returns natural language summary
- Built `POST /telnyx/dynamic-variables` endpoint — fires at call start, returns `{ dynamic_variables: { caller_name: "John" } }` for greeting personalization
- Enhanced `POST /telnyx/customer-lookup` — now also returns all available properties in the context_prompt so assistant has inventory knowledge from call start
- Enhanced `convex/ai.ts` — text channels (WhatsApp, Instagram, Telegram, web) now also query properties table and inject listings into system prompt
- Enhanced `POST /telnyx/sync-personality` — now also sets `dynamic_variables_webhook_url` on the assistant via PATCH API

**Telnyx Portal Configuration (Optimized):**
- **Greeting** updated: `Hi {{caller_name}}! This is Becca from Becca Real Estate. How can I help you today?` with dynamic variable for returning callers
- **Instructions** updated: full rules for save_customer, get_properties, customer_lookup, name collection, property presentation
- **get_inventory tool → REPLACED with get_properties**: params: bedrooms (integer), city (string), listing_type (string), max_price (number), property_type (string)
- **save_customer tool → UPDATED**: added property_interest param, renamed summary → notes
- **customer_lookup tool → VERIFIED**: description updated to mention property listings
- **Duplicate Hang Up tool** — deleted (was 6 tools, now 5: get_properties, save_customer, hangup, transfer, customer_lookup)
- **Noise Suppression** — Enabled (AICoustics engine, Voice Focus 2.0, level 0.8)
- **User Idle Timeout** — Set to 30 seconds
- **Insight Group** updated: "Becca Real Estate CRM", 3 insights (Summary + Sentiment + Lead Score)
- **Data Retention** — ON (needed for Telnyx built-in memory)

### STAGE 15: ElevenLabs Integration + Voice-to-Telnyx Sync + Bug Fixes ✅

**ElevenLabs Connected End-to-End:**
- Set `ELEVENLABS_API_KEY` in Convex environment variables (server-side only, never in git)
- Confirmed ElevenLabs agent `agent_0101kmaw6sfpevetxpkaafszph90` ("BECCA Dashboard Guide") is live with "becca voice", Gemini 2.5 Flash LLM
- Confirmed `@elevenlabs/react@0.14.3` installed and working
- `VITE_ELEVENLABS_AGENT_ID` in `.env` — connects FloatingAssistant ball to agent
- Voice Management fetches 25 voices from ElevenLabs API, shows cloned voices at top
- Voice cloning (record/upload audio) works via `convex/voice.ts` actions
- Voice deletion works
- FloatingAssistant brain fluid ball renders on dashboard with B logo, cyan glow, draggable, click-to-talk

**Voice Selection → Telnyx Phone Agent Sync:**
- Built `POST /telnyx/sync-voice` HTTP endpoint in `convex/http.ts`
- When user selects or clones a voice in dashboard → automatically PATCHes Telnyx AI Assistant's `voice_settings.voice` to `"ElevenLabs.<voice_id>"`
- Uses existing Telnyx integration secret `api_key_ref: "elevenlab"` (ElevenLabs API key stored in Telnyx portal)
- `use_speaker_boost: true` preserved on every sync
- Extracted `syncVoiceToTelnyx()` helper in VoiceManagementSection with `useCallback`

**Bug Fixes (Session 15):**
- CopyableLinks infinite loop — removed redundant useState + useEffect, use useQuery directly
- ObjectURL memory leak in playRecording — added URL.revokeObjectURL()
- Stale closure in handleCloneVoice toast — captured nameForToast before async
- Removed stale .env vars (Supabase + VAPI)

### STAGE 16: Full Security Hardening ✅ (Current Session — 2026-04-03)

**Comprehensive security audit was run across entire codebase. Found 4 CRITICAL, 8 HIGH, 7 MEDIUM, 4 LOW issues. All CRITICAL and HIGH issues have been fixed.**

#### Phase 1: Dashboard Endpoint Authentication (CRITICAL FIX)

**Problem:** All dashboard-facing HTTP endpoints were completely unauthenticated. Anyone with the Convex site URL could make outbound phone calls, change the AI personality/voice, drain OpenAI credits, or look up customer PII.

**Fix — Added `validateDashboardAuth()` to `convex/http.ts`:**
- Reads `Authorization: Bearer <business_key>` header from request
- Validates against `business_keys` table using `api.businessKeys.getByKey`
- Returns 401 Unauthorized if invalid
- Applied to ALL 8 dashboard-facing endpoints:
  - `/telnyx/sync-personality`, `/telnyx/sync-voice`, `/telnyx/outbound-call`, `/telnyx/end-call`
  - `/generate-logo`, `/update-logo`, `/analyze`, `/create-character`
- `/web-chat` is intentionally unauthenticated (called from public pages too)

**Frontend auth utility created — `src/lib/auth-fetch.ts`:**
```typescript
export function getAuthHeaders(): Record<string, string> {
  const key = sessionStorage.getItem("becca_business_key");
  return key ? { Authorization: `Bearer ${key}` } : {};
}
```

**9 frontend files updated to send auth headers:**
- `AIPersonalitySection.tsx`, `VoiceManagementSection.tsx`, `PhoneCallSection.tsx`
- `AILogoGeneratorDialog.tsx`, `HubBackgroundGenerator.tsx`
- `AnalyzeConversationsDialog.tsx`, `AnalyzeCallTranscriptsDialog.tsx`
- `AICharacterCreatorDialog.tsx`, `BeccaChatDialog.tsx`
- Public chat components (`WebChat.tsx`, `WebChatWidget.tsx`) intentionally NOT updated — they need to work without auth

#### Phase 2: CORS Restriction (HIGH FIX)

**Problem:** All endpoints used `Access-Control-Allow-Origin: "*"` — any website could make cross-origin requests.

**Fix — Added `getCorsHeaders()` to `convex/http.ts`:**
- Reads `process.env.ALLOWED_ORIGIN` (defaults to `http://localhost:5173` for dev)
- Adds `Authorization` to `Access-Control-Allow-Headers` (required for auth to work)
- Adds `Access-Control-Allow-Credentials: "true"`
- Replaced all inline `corsHeaders` objects in every dashboard endpoint

#### Phase 3: Webhook Signature Verification (CRITICAL FIX)

**Problem:** Meta (WhatsApp/Instagram/Facebook) and Telnyx webhooks accepted any POST without verifying the sender.

**Fix — Meta webhook signature verification:**
- Added `verifyMetaSignature(request, rawBody)` function using HMAC-SHA256
- Uses `crypto.subtle.importKey` + `crypto.subtle.sign` with `FACEBOOK_APP_SECRET`
- Applied to both `/whatsapp` and `/instagram` webhook handlers
- WhatsApp/Instagram handlers now read body as text first (for HMAC), then `JSON.parse()`
- If `FACEBOOK_APP_SECRET` is set and signature doesn't match → 403 Forbidden

**Fix — Telnyx tool endpoint secret validation:**
- Added `validateTelnyxToolSecret(request)` function
- Checks `?secret=` query parameter against `process.env.TELNYX_TOOL_SECRET`
- Applied to ALL 4 Telnyx tool endpoints: `/telnyx/customer-lookup`, `/telnyx/save-customer`, `/telnyx/get-properties`, `/telnyx/dynamic-variables`
- Gracefully skips validation if `TELNYX_TOOL_SECRET` env var not set (backward compatible)

**Telnyx portal updated — all tool URLs now include `?secret=<value>`:**
- `customer_lookup` URL updated in AI Tools page
- `get_properties` URL updated in assistant tool dialog
- `save_customer` URL updated in assistant tool dialog
- `dynamic_variables` webhook URL updated on the assistant
- Assistant saved with all changes

#### Phase 4: Token Leak Prevention (HIGH FIX)

**Problem:** `connections.get()` returned raw API tokens (WhatsApp access token, Instagram token, Facebook token, Telegram bot token, Telnyx API key) directly to the browser via Convex reactive queries.

**Fix — Added `connections.getStatus()` query in `convex/connections.ts`:**
- Returns boolean flags instead of raw tokens: `whatsapp_connected`, `instagram_connected`, `facebook_connected`, `telegram_connected`, `telnyx_configured`
- Also returns safe non-secret fields: `phone_number`, `telnyx_phone_number`, page IDs, etc.
- Original `get()` kept for server-side use only (webhook handlers)

**Frontend updated to use `getStatus()`:**
- `ConnectionStatus.tsx` — switched from `api.connections.get` to `api.connections.getStatus`. Telnyx API key field is now write-only (placeholder shows "configured" status, user enters new value to change)
- `SocialConnectSection.tsx` — switched to `getStatus()`. `isConnected()` now checks boolean flags (`whatsapp_connected` etc.) instead of raw token presence. Token fields start empty on edit (no pre-fill with raw tokens)

#### Phase 5: Additional Security Fixes

**Hardcoded verify token fallback removed:**
- `convex/http.ts` line 35: changed `process.env.META_VERIFY_TOKEN || "becca-brain-verify"` to require the env var, returns 500 if not set
- `"becca-brain-verify"` was in source code and trivially guessable

**Instagram/Facebook access token moved from URL to header:**
- DM reply: `fetch(\`${apiUrl}?access_token=${token}\`)` → `Authorization: Bearer ${token}` in headers
- Instagram comment reply: same fix
- Tokens no longer appear in server logs, CDN logs, or referrer headers

**VoiceId validation added to `convex/voice.ts` `deleteVoice`:**
- Added `/^[a-zA-Z0-9_-]+$/` regex check (matching what `sync-voice` already had)
- Prevents path injection in ElevenLabs API URL

**Input validation added:**
- Message length cap (4000 chars) on `/web-chat` endpoint AND `convex/ai.ts generateResponse`
- Phone number E.164 validation (`/^\+[1-9]\d{1,14}$/`) on `/telnyx/outbound-call`
- Audio size cap (10MB base64) on `voice.cloneVoice`
- Voice name length validation (1-100 chars) on `voice.cloneVoice`

**Error message sanitization:**
- `voice.ts` clone/delete: raw ElevenLabs errors logged server-side, generic message to client
- `http.ts` outbound-call: removed `details: err` from response (was leaking raw Telnyx errors)
- `http.ts` generate-logo, analyze, create-character: changed `error: error.message` to generic messages

**Dynamic variables webhook URL made dynamic:**
- `convex/http.ts` sync-personality: the hardcoded `dynamic_variables_webhook_url` now appends `?secret=` from env var

#### Phase 6: Bug Fixes

**PipelineSection.tsx — `setLeads` crash fixed:**
- `handleDrop` called `setLeads()` which didn't exist (leads came from Convex reactive query, no local state setter)
- Fix: removed the broken optimistic update. Convex reactivity handles UI updates after mutation completes.
- File: `src/components/dashboard/crm/PipelineSection.tsx` ~line 235

**PublicHub.tsx — loading state stuck fixed:**
- `fetchData()` ran once in `useEffect([], [])` but depended on `convexCustomization` which was `undefined` at mount
- Fix: removed `fetchData` function and its `useEffect` entirely. Now uses Convex reactive queries directly: `const loading = customization === undefined`
- File: `src/pages/PublicHub.tsx`

---

### FILES MODIFIED IN SESSION 16 (18 files)

**Backend (Convex):**
| File | Changes |
|------|---------|
| `convex/http.ts` | Auth helper, CORS helper, Meta signature verification, Telnyx tool secret, verify token fix, Instagram token-in-URL fix, input validation, error sanitization, dynamic webhook URL |
| `convex/connections.ts` | Added `getStatus()` query (safe for frontend, no raw tokens) |
| `convex/voice.ts` | VoiceId validation on deleteVoice, audio size cap, voice name validation, error sanitization |
| `convex/ai.ts` | Message length validation (4000 char cap) |

**Frontend (New):**
| File | Purpose |
|------|---------|
| `src/lib/auth-fetch.ts` | Shared `getAuthHeaders()` utility for dashboard fetch calls |

**Frontend (Updated):**
| File | Change |
|------|--------|
| `src/components/dashboard/AIPersonalitySection.tsx` | Added auth header to sync-personality fetch |
| `src/components/dashboard/VoiceManagementSection.tsx` | Added auth header to sync-voice fetch |
| `src/components/dashboard/PhoneCallSection.tsx` | Added auth headers to outbound-call + end-call fetches |
| `src/components/dashboard/AILogoGeneratorDialog.tsx` | Added auth headers to generate-logo + update-logo fetches |
| `src/components/dashboard/HubBackgroundGenerator.tsx` | Added auth headers to generate-logo fetches |
| `src/components/dashboard/AnalyzeConversationsDialog.tsx` | Added auth header to analyze fetch |
| `src/components/dashboard/AnalyzeCallTranscriptsDialog.tsx` | Added auth header to analyze fetch |
| `src/components/dashboard/AICharacterCreatorDialog.tsx` | Added auth headers to create-character fetches (4 calls) |
| `src/components/chat/BeccaChatDialog.tsx` | Added auth header to web-chat fetch (dashboard instance) |
| `src/components/dashboard/ConnectionStatus.tsx` | Switched to `connections.getStatus()`, write-only API key field |
| `src/components/dashboard/SocialConnectSection.tsx` | Switched to `connections.getStatus()`, boolean flag checks |
| `src/components/dashboard/crm/PipelineSection.tsx` | Removed broken `setLeads()` optimistic update |
| `src/pages/PublicHub.tsx` | Removed broken fetchData/useEffect, uses reactive queries directly |

---

### FINAL SCHEMA (23 tables in Convex)
activities, bot_config, bot_personality, business_keys, call_history, **callers** (unified), connections, contacts, conversations, customer_interactions, customizations, deals, escalation_requests, lead_stage_history, leads, messages, products, properties, scheduled_calls, toggles, transcripts, user_onboarding, user_roles

### REMOVED TABLES
ai_agents, inventory, product_media, customers, customer_memory, sales, wallet

### CONVEX MODULES (27 files)
`ai.ts`, `aiTools.ts`, `activities.ts`, `botConfig.ts`, `botPersonality.ts`, `businessKeys.ts`, `callHistory.ts`, `callers.ts`, `channelHandler.ts`, `connections.ts`, `contacts.ts`, `conversations.ts`, `customerInteractions.ts`, `customizations.ts`, `deals.ts`, `escalationRequests.ts`, `http.ts`, `leads.ts`, `messages.ts`, `products.ts`, `properties.ts`, `scheduledCalls.ts`, `schema.ts`, `storage.ts`, `toggles.ts`, `transcripts.ts`, `voice.ts`

### CONVEX HTTP ENDPOINTS (19 logical endpoints)
| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /whatsapp` | Meta signature | WhatsApp Business API webhook |
| `GET /whatsapp` | META_VERIFY_TOKEN | Meta webhook verification |
| `POST /instagram` | Meta signature | Instagram + Facebook Messenger webhook |
| `GET /instagram` | META_VERIFY_TOKEN | Meta webhook verification |
| `POST /telegram` | None (external) | Telegram Bot webhook |
| `POST /web-chat` | Optional Bearer | Web chat (public + dashboard) |
| `POST /telnyx/dynamic-variables` | TELNYX_TOOL_SECRET | Dynamic variables for greeting personalization |
| `POST /telnyx/customer-lookup` | TELNYX_TOOL_SECRET | Caller context + properties during calls |
| `POST /telnyx/save-customer` | TELNYX_TOOL_SECRET | Save caller name/preferences mid-call |
| `POST /telnyx/get-properties` | TELNYX_TOOL_SECRET | Filtered property search for voice agent |
| `POST /telnyx/call-webhook` | None (Telnyx event) | Call-end → CRM logging + insights |
| `POST /telnyx/sync-personality` | **Bearer auth** | Dashboard → Telnyx assistant personality sync |
| `POST /telnyx/sync-voice` | **Bearer auth** | Dashboard → Telnyx assistant voice sync |
| `POST /telnyx/outbound-call` | **Bearer auth** | Initiate outbound calls (E.164 validated) |
| `POST /telnyx/end-call` | **Bearer auth** | End active calls |
| `POST /generate-logo` | **Bearer auth** | AI logo generation |
| `POST /update-logo` | **Bearer auth** | Update logo URL |
| `POST /analyze` | **Bearer auth** | Data analysis |
| `POST /create-character` | **Bearer auth** | AI character creator |

### SECURITY HELPERS IN `convex/http.ts`
| Function | Purpose |
|----------|---------|
| `getCorsHeaders()` | Returns CORS headers using `ALLOWED_ORIGIN` env var (not wildcard) |
| `validateDashboardAuth(ctx, request)` | Validates Bearer token against business_keys table |
| `unauthorizedResponse(corsHeaders)` | Returns 401 JSON response |
| `verifyMetaSignature(request, rawBody)` | HMAC-SHA256 verification using FACEBOOK_APP_SECRET |
| `validateTelnyxToolSecret(request)` | Checks `?secret=` query param against TELNYX_TOOL_SECRET |

### CONVEX ENV VARS SET (12 total)
`OPENAI_API_KEY`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `META_VERIFY_TOKEN`, `TELNYX_API_KEY`, `TELNYX_ASSISTANT_ID`, `TELNYX_PHONE_NUMBER`, `WHATSAPP_PHONE_NUMBER_ID`, `ELEVENLABS_API_KEY`, `ALLOWED_ORIGIN`, **`TELNYX_TOOL_SECRET`** (new)

### FRONTEND ENV VARS
| File | Variable | Value |
|------|----------|-------|
| `.env` | `VITE_ELEVENLABS_AGENT_ID` | `agent_0101kmaw6sfpevetxpkaafszph90` |
| `.env.local` | `CONVEX_DEPLOYMENT` | `dev:diligent-nightingale-429` |
| `.env.local` | `VITE_CONVEX_URL` | `https://diligent-nightingale-429.convex.cloud` |
| `.env.local` | `VITE_CONVEX_SITE_URL` | `https://diligent-nightingale-429.convex.site` |

### KEY ARCHITECTURE DECISIONS
1. **ONE brain, ONE memory, ONE personality** — `bot_personality` is single source, `callers` is unified identity, `channelHandler` is the central connector
2. **No n8n** — all channel handling native in Convex HTTP endpoints
3. **No VAPI** — phone calls via Telnyx AI Assistant (claude-haiku-4-5)
4. **No Supabase** — everything on Convex (package uninstalled, folder deleted)
5. **Real estate niche** — removed product_media, ai_agents, inventory; CRM is property-focused
6. **Auto-CRM** — every interaction auto-creates contacts + activities + leads
7. **SaaS multi-tenant** — business_keys auth, per-business data filtering (currently single-tenant in practice)
8. **Call direction detection** — webhook compares `from` number against Telnyx phone to determine incoming/outgoing
9. **Full voice ↔ dashboard synergy** — voice agent can read properties, save names, get caller history; text channels have same property awareness
10. **Dynamic greeting personalization** — returning callers get greeted by name via `{{caller_name}}` variable
11. **Post-call insights** — Telnyx generates Summary + Sentiment + Lead Score after every call, webhooks to Convex
12. **ElevenLabs dual integration** — (a) Conversational AI agent for floating dashboard ball, (b) Voice API for cloning/management + Telnyx voice sync
13. **Voice sync pipeline** — Dashboard voice selection → Convex customizations → Telnyx PATCH API → phone calls use new voice
14. **Security layered by endpoint type** — Dashboard endpoints require Bearer auth, webhooks use signature/secret verification, CORS restricted to ALLOWED_ORIGIN, tokens never sent to frontend

### ELEVENLABS DETAILS (CURRENT — Verified 2026-04-03)
- **Agent ID:** `agent_0101kmaw6sfpevetxpkaafszph90`
- **Agent Name:** "BECCA Dashboard Guide"
- **LLM:** Gemini 2.5 Flash
- **Voice:** "becca voice" (Primary)
- **First Message:** "Hello! I'm BECCA, what brilliant task are we starting on today?"
- **Status:** Live 100%
- **SDK:** `@elevenlabs/react@0.14.3` (useConversation hook)
- **Frontend Component:** `src/components/dashboard/FloatingAssistant.tsx`
- **Wake Word:** "Hey Becca" (Web Speech API, activates after first call)
- **API Key Name in ElevenLabs:** "becca-convex" (created Mar 25, ending in f6a5)
- **Telnyx Integration Secret Name:** `elevenlab` (stores ElevenLabs API key for voice TTS)

### TELNYX ASSISTANT DETAILS (CURRENT — Updated 2026-04-03)
- **ID:** `assistant-6629c6e8-9de6-4130-af08-32f7f57c0bca`
- **TeXML Application ID:** `2896958993299670569`
- **Outbound Voice Profile ID:** `2895242062699956077`
- **Phone:** `+234-209-394-0544`
- **Model:** `anthropic/claude-haiku-4-5`
- **Voice:** `ElevenLabs.mW1OZ3Jgy8FoeJtbPcSq` ("becca voice", cloned), Speaker Boost ON, api_key_ref: "elevenlab"
- **Transcription:** `deepgram/flux`
- **Greeting:** `Hi {{caller_name}}! This is Becca from Becca Real Estate. How can I help you today?`
- **Greeting Mode:** Assistant speaks first
- **Noise Suppression:** AICoustics, Voice Focus 2.0, level 0.8
- **Background Audio:** Office (predefined media, volume 0.3)
- **User Idle Timeout:** 30 seconds
- **Max Call Duration:** 1800 seconds (30 min)
- **Voicemail Detection:** Stop assistant
- **Interruptions:** Enabled
- **Data Retention:** ON
- **Dynamic Variables Webhook URL:** `https://diligent-nightingale-429.convex.site/telnyx/dynamic-variables?secret=<TELNYX_TOOL_SECRET>`
- **5 Tools:** get_properties, save_customer, customer_lookup, hangup, transfer
- **Call progress events URL:** `https://diligent-nightingale-429.convex.site/telnyx/call-webhook`
- **Insight Group:** `b9f828a3-0c72-48d6-8684-32997f680adc` — "Becca Real Estate CRM" (3 insights: Summary, Sentiment Analysis, Lead Score) with webhook to `/telnyx/call-webhook`

### TELNYX TOOL URLS (ALL UPDATED 2026-04-03 — now include secret)
| Tool | URL |
|------|-----|
| get_properties | `https://diligent-nightingale-429.convex.site/telnyx/get-properties?secret=<TELNYX_TOOL_SECRET>` |
| save_customer | `https://diligent-nightingale-429.convex.site/telnyx/save-customer?secret=<TELNYX_TOOL_SECRET>` |
| customer_lookup | `https://diligent-nightingale-429.convex.site/telnyx/customer-lookup?secret=<TELNYX_TOOL_SECRET>` |

(The actual secret value is stored in Convex env var `TELNYX_TOOL_SECRET` and appended as `?secret=<value>` in the Telnyx portal tool URLs)

### TELNYX VOICE CONFIG (from live API GET — verified 2026-04-03)
```json
"voice_settings": {
  "voice": "ElevenLabs.mW1OZ3Jgy8FoeJtbPcSq",
  "api_key_ref": "elevenlab",
  "voice_speed": 1.0,
  "temperature": 0.5,
  "similarity_boost": 0.5,
  "style": 0.0,
  "use_speaker_boost": true,
  "background_audio": { "type": "predefined_media", "value": "office", "volume": 0.3 }
}
```

### SEEDED DATA IN CONVEX
| Table | Records | Key Data |
|-------|---------|----------|
| business_keys | 2 | `beccaceo` / `rebecca4God001` + `HECTOR` / `BECCA-HECTOR-2024` |
| bot_personality | 1 | Becca real estate assistant personality |
| bot_config | 1 | GPT-4o-mini, bot active, friendly tone |
| toggles | 1 | Master ON, all channels ON |
| customizations | 1 | "Becca Real Estate", greeting, owner phone, custom_voices (3 cloned), voices (active selection) |
| connections | 1 | Telnyx phone +2342093940544 |

All other tables (CRM, calls, transcripts, etc.) are empty — they auto-populate from real interactions.

### FULL SYNERGY FLOW (How It All Works)
```
PHONE CALL:
  Caller dials → Telnyx fires dynamic-variables webhook (with secret) → returns caller_name
  → Greeting: "Hi John!" (or "Hi there!" for new callers)
  → customer_lookup auto-fires (with secret) → loads memory + properties into context
  → Caller asks about properties → get_properties (with secret, filtered search)
  → Becca learns name → save_customer (with secret, writes to callers + CRM contacts)
  → Call ends → call-webhook → processInteraction (auto-creates contact, activity, lead)
  → Telnyx generates insights → Summary + Sentiment + Lead Score → webhooks to Convex

TEXT CHANNELS (WhatsApp/Instagram/Telegram/Web):
  Message arrives → Meta signature verified (WhatsApp/Instagram)
  → ai.ts loads personality + customer context + properties
  → AI responds with property knowledge + memory of past conversations
  → processInteraction stores everything + feeds CRM
  → Same caller calls later → voice agent has full cross-channel memory

DASHBOARD ACTIONS (all require Bearer auth):
  Personality save → POST /telnyx/sync-personality (Bearer auth) → PATCHes Telnyx assistant
  Voice select/clone → POST /telnyx/sync-voice (Bearer auth) → PATCHes Telnyx voice_settings
  Make call → POST /telnyx/outbound-call (Bearer auth, E.164 validated)
  Generate logo → POST /generate-logo (Bearer auth) → OpenAI DALL-E
  Analyze data → POST /analyze (Bearer auth) → OpenAI GPT-4o-mini

VOICE MANAGEMENT (Dashboard):
  User selects/clones voice → saved to Convex customizations
  → POST /telnyx/sync-voice (with Bearer auth) → PATCHes Telnyx assistant voice_settings
  → Next phone call uses the new voice (both inbound + outbound)

FLOATING BALL (Dashboard):
  Click ball → ElevenLabs Conversational AI session starts
  → "Hey Becca" wake word detection after first call
  → Real-time voice conversation with BECCA Dashboard Guide agent
```

### DASHBOARD SECTIONS (ALL VERIFIED WORKING 2026-04-03)
| Section | Status | Notes |
|---------|--------|-------|
| Master Switch | Working | Toggle ON/OFF globally |
| Channels | Working | WhatsApp, Instagram, Facebook, Telegram toggles |
| Properties | Working | Real estate listings CRUD |
| CRM | Working | Contacts, Pipeline (drag-and-drop fixed), Activities, Analytics tabs |
| Conversations | Working | Cross-platform message history |
| Phone Calls | Working | Call history, outbound call UI (E.164 validated) |
| Voice Management | Working | 25 ElevenLabs voices, cloned first, clone/delete/preview, syncs to Telnyx (with auth) |
| AI Personality | Working | Personality editor (syncs to Telnyx with auth) |
| Hub Design | Working | Background/logo customization (with auth) |
| Shareable Links | Working | Public hub + product links |
| Floating Ball | Working | Brain fluid ball, ElevenLabs agent, draggable |

### WHAT'S LEFT / KNOWN ISSUES
1. **Meta Business Verification blocked** — old phone number `08075729862` locked on Drealhector portfolio. Recommended: create fresh Meta Business Account + fresh Meta App for the SaaS, apply for Business Verification with actual business documents. Once verified, businesses can OAuth connect WhatsApp/Instagram with one click.
2. **Business Auth page slow loading** — the 3D brain component (`@react-three/fiber` Canvas/NeuralBrain) causes the login page to hang on a spinner in some environments. Dashboard itself loads fine once authenticated.
3. **No old data migration** — Old Supabase/VAPI call logs were not migrated. Started fresh.
4. **No git commits made** — user explicitly said don't push to GitHub until they say so.
5. **Old VAPI Call Control Application** — still exists in Telnyx pointing to `https://api.vapi.ai/telnyx/inbound_call` (ID: 2896939858297620396). Can be deleted since we migrated to Telnyx AI Assistant.
6. **Insight Group rename** — portal shows "Default" instead of "Becca Real Estate CRM" (cosmetic — the 3 insights and webhook URL are correctly saved).
7. **Speaking Plan** — all pause values at 0s (user chose not to change, keeping fast responses).
8. **Telegram webhook — no signature verification** — Telegram does not send HMAC signatures. The `/telegram` endpoint has no auth. A shared secret approach (similar to Telnyx tools) could be added if needed.
9. **Telnyx call-webhook — no signature verification** — The `/telnyx/call-webhook` endpoint for call-end events has no secret validation. Telnyx sends ed25519 signatures but verification requires their public signing key. Low risk since this endpoint only writes CRM data (no credit-spending actions).
10. **Multi-tenancy not yet implemented** — `business_id` fields exist on most tables but queries often fall back to `.first()`. Per-business Telnyx assistant and ElevenLabs agent provisioning not built yet.
11. **Convex queries/mutations still public** — While HTTP endpoints are now secured, direct Convex SDK calls (useQuery/useMutation) have no server-side auth. The main risk was `connections.get()` returning raw tokens — this is now mitigated by `getStatus()`. Full Convex auth (e.g., custom session tokens validated in every query handler) is a future enhancement for multi-tenancy.
12. **sessionStorage auth** — Business key stored in plaintext in sessionStorage. Client-side only route protection. Acceptable for single-tenant but should be replaced with server-issued session tokens for multi-tenancy.
13. **Telnyx tool secret graceful fallback** — `validateTelnyxToolSecret()` returns `true` if `TELNYX_TOOL_SECRET` env var is not set, meaning all 4 Telnyx tool endpoints bypass validation if the env var is missing. Currently safe because the env var IS set, but should be enforced as required in production.

### MULTI-TENANCY PLAN (Discussed, Not Yet Built)
**Recommended approach: "Tenant Provisioning" model**
- Each new business gets: business_keys record, their own Telnyx AI Assistant (created via API), their own phone number (manually purchased), their own ElevenLabs agent (created via API), their own connections/customizations/personality records
- Webhook endpoints stay shared but route by phone number / page ID to identify business
- Phone + Web Chat + Telegram are programmatically provisionable per business
- WhatsApp + Instagram require Meta Business Verification of the SaaS app first, then businesses connect via OAuth
- Start with manual provisioning for first 3-5 clients, automate later
- Will need full Convex auth (session tokens) to protect queries/mutations per-business

### RESOLVED ISSUES (All Sessions)
- ~~connections.ts schema mismatch~~ — FIXED: upsert() now has all channel token fields matching schema.ts
- ~~Telnyx tools reference old business~~ — FIXED: get_inventory replaced with get_properties, save_customer URL updated to Convex
- ~~Telnyx greeting generic~~ — FIXED: now personalized with `{{caller_name}}` dynamic variable
- ~~WebChatWidget.tsx + ProductChat.tsx use Supabase URLs~~ — FIXED: now use VITE_CONVEX_SITE_URL
- ~~Duplicate Hang Up tool~~ — FIXED: deleted
- ~~No noise suppression~~ — FIXED: AICoustics enabled
- ~~No idle timeout~~ — FIXED: 30 seconds
- ~~Voice agent can't access properties~~ — FIXED: get_properties tool + customer_lookup includes properties
- ~~Voice agent can't save names~~ — FIXED: save_customer tool points to Convex
- ~~Text channels can't see properties~~ — FIXED: ai.ts injects property listings into system prompt
- ~~ElevenLabs API key not set~~ — FIXED: set as Convex env var
- ~~ElevenLabs not connected~~ — FIXED: FloatingAssistant ball + Voice Management both functional
- ~~Voice selection doesn't sync to phone agent~~ — FIXED: POST /telnyx/sync-voice endpoint
- ~~Cloned voices at bottom of list~~ — FIXED: cloned voices sorted first (custom → API cloned → library)
- ~~CopyableLinks infinite loop~~ — FIXED: removed redundant useState + useEffect, use useQuery directly
- ~~ObjectURL memory leak in playRecording~~ — FIXED: added URL.revokeObjectURL()
- ~~Stale .env vars~~ — FIXED: removed Supabase + VAPI vars
- ~~No voice_id validation on sync endpoint~~ — FIXED: alphanumeric regex check
- ~~Duplicated sync-voice fetch code~~ — FIXED: extracted syncVoiceToTelnyx() helper
- ~~**ALL HTTP endpoints unauthenticated**~~ — FIXED (Session 16): Bearer auth on dashboard endpoints, Meta signature verification on webhooks, Telnyx tool secret on tool endpoints
- ~~**CORS wildcard (*) on all endpoints**~~ — FIXED (Session 16): restricted to ALLOWED_ORIGIN env var
- ~~**Raw tokens leaked to frontend via connections.get()**~~ — FIXED (Session 16): added connections.getStatus() returning boolean flags
- ~~**Instagram/FB access token in URL query param**~~ — FIXED (Session 16): moved to Authorization header
- ~~**Hardcoded verify token fallback "becca-brain-verify"**~~ — FIXED (Session 16): env var now required
- ~~**PipelineSection.tsx setLeads crash**~~ — FIXED (Session 16): removed broken optimistic update
- ~~**PublicHub.tsx loading state stuck**~~ — FIXED (Session 16): uses Convex reactive queries directly
- ~~**No input validation on messages/phone/audio**~~ — FIXED (Session 16): 4000 char cap, E.164 phone, 10MB audio, voice name length
- ~~**Error messages leak internal API details**~~ — FIXED (Session 16): generic errors to client, raw errors to console.error only
- ~~**No voiceId validation on voice.deleteVoice**~~ — FIXED (Session 16): alphanumeric regex added
- ~~**AICharacterCreatorDialog.tsx broken fetch calls**~~ — FIXED (Session 17): all 4 create-character fetch calls had `body: { ... }` instead of `body: JSON.stringify({ ... })` and wrong destructuring `const { data, error } = await fetch(...)` instead of proper `response.json()` pattern

### BUILD STATUS (Verified 2026-04-04)
- **TypeScript:** 0 errors (`npx tsc --noEmit`)
- **Vite build:** passes clean (`npx vite build` — 31.68s, only Tailwind CSS warnings)
- **Bundle:** 2,524 KB (single chunk — code splitting recommended as future optimization)

### MEMORY FILES (in `.claude/projects/.../memory/`)
- `project_niche_decisions.md` — removed features, real estate focus
- `feedback_no_github_push.md` — don't push to GitHub until user says
- `project_n8n_channel_architecture.md` — how n8n worked, how Convex replaces it
- `project_unified_memory.md` — one brain architecture
- `feedback_scroll_pages.md` — always scroll full pages before concluding UI element missing
