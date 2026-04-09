## BECCA BRAIN — Full Session Handover (Updated 2026-04-08, Session 19)

### IMPORTANT FOR NEXT SESSION
When the user says "create the handover" at the end of a session, read this file first, understand the format, then append a new STAGE section documenting everything done in that session. Follow the same structure: what was done, what files were modified, what's working, what's NOT working, and the current state of all systems. Always update the KNOWN ISSUES, BUILD STATUS, and GIT STATUS sections.

### What This Project Is
A SaaS AI assistant platform (real estate niche, Nigeria-focused) that manages customer interactions across WhatsApp, Instagram, Facebook, Telegram, phone calls, and web chat — all with ONE brain, ONE memory, ONE personality. Every interaction feeds a CRM automatically. Voice cloning, AI personality, and a floating conversational AI ball are powered by ElevenLabs. Phone calls run on Telnyx AI Assistant with claude-haiku-4-5.

### The Vision
Build a white-label SaaS where real estate businesses in Nigeria can:
- Deploy an AI assistant that handles all customer channels (phone, WhatsApp, Instagram, Facebook, Telegram, web chat) with one personality
- Auto-build a CRM from every interaction (contacts, leads, activities, pipeline)
- Voice clone their own voice for the phone agent
- Manage property listings that the AI knows about and can present to callers
- Track all calls with transcripts, recordings, and caller history
- Customize their public hub page with AI-generated logos and backgrounds
- Eventually: multi-tenant (each business gets their own assistant, phone number, and data)

### What Was Done Across All Sessions

**Full backend migration from Supabase to Convex + VAPI to Telnyx, then full synergy + optimization + ElevenLabs integration + security hardening + call sync + Nigerian location awareness + personality sync + CRM improvements**

---

### STAGES 1-18: Previous Sessions (See original HANDOVER for full details)

All previous stages documented in detail. Key milestones: Supabase to Convex migration, Telnyx AI Assistant setup, ElevenLabs integration, security hardening, call sync system, Nigerian location intelligence, 20 Lagos test properties seeded.

---

### STAGE 19: Personality Sync Fix + Call Assistant Debugging + CRM Improvements + Natural Tone (Session 19 — 2026-04-08)

**This session focused on: fixing personality sync to Telnyx, debugging call assistant silence, improving AI natural tone, fixing call sync/transcript/CRM pipeline, and CRM tag improvements.**

---

#### 19.1: Personality Sync CORS Fix (CRITICAL FIX)

**Problem:** Saving AI personality from the dashboard never synced to Telnyx. The toast showed "Telnyx sync failed" but the error was swallowed silently.

**Root Cause:** CORS mismatch. Vite dev server runs on port **8080** (configured in vite.config.ts) but Convex `ALLOWED_ORIGIN` env var was set to `http://localhost:5173`. Every HTTP endpoint call from the dashboard was blocked by the browser.

**Fix:**
- Updated Convex env var: `ALLOWED_ORIGIN` = `http://localhost:8080`
- Added `syncRes.ok` check before parsing response in `AIPersonalitySection.tsx`
- Added detailed error info in sync endpoint error response

#### 19.2: Hardcoded Instructions Updated

**Problem:** The `/telnyx/sync-personality` endpoint appended hardcoded rules to the personality text, but these were missing Session 18's Nigerian context, location tool instructions, and caller identification fixes.

**Fix:** Updated the hardcoded instructions in `convex/http.ts` telnyxSyncPersonality handler with:
- Nigerian context (cities, Naira currency, lookup_location tool)
- Caller identification (don't ask phone number, don't re-ask name if known)
- Natural conversation style (fillers: "umm", "so", "actually", "Oh yeah!", natural reactions before information)
- Property search rules (valid property_type values, use "city" not "location", price in words)
- Appointment handling (book viewings directly, don't transfer to someone else)
- Price pronunciation (say "35 million Naira" not raw numbers)

**IMPORTANT NOTE:** The PATCH API to Telnyx creates new versions every time. The working version from Session 18 (version `20260406T181658140361`, 5146 chars) is the one that has all features working. Our sync endpoint ONLY sends `instructions` and `dynamic_variables_webhook_url` — it does NOT touch tools, voice, or other settings. However, we discovered that syncing sometimes caused the assistant to stop talking. The root cause was actually **ElevenLabs tokens running out** (not the sync), but we made many unnecessary changes trying to debug it.

#### 19.3: Call Assistant Silence Debugging

**Problem:** Assistant picked up calls but said nothing after greeting (or didn't greet at all).

**Root Cause Found:** ElevenLabs API tokens were exhausted. The voice provider couldn't generate speech, so the assistant was silent. This was NOT a code or configuration issue.

**What was changed during debugging (some may need review):**
- customer_lookup endpoint was stripped down then restored (currently returns full properties + memory — the working version)
- Multiple instruction versions were pushed via PATCH API
- Voice settings were changed in Telnyx portal (end-of-turn timeout, eager threshold, stability)
- A test-agent was created and deleted
- Phone number was reassigned test-agent then back to becca

**Current state:** Voice provider switched to **Telnyx local voice** (not ElevenLabs) for testing. Will switch back to ElevenLabs when tokens are replenished.

#### 19.4: Duplicate customer_lookup Tool Removed

**Problem:** Two `customer_lookup` webhook tools on the Telnyx assistant — one shared, one non-shared. Was confusing the model.

**Fix:** Deleted the duplicate via Telnyx portal. Now 6 tools: get_properties, save_customer, hangup, transfer, customer_lookup, lookup_location.

#### 19.5: Call Sync Improvements

**Problem 1:** Cron pageSize was 5, missing newer calls.
**Fix:** Increased to 20 in `convex/crons.ts`.

**Problem 2:** Calls synced mid-call had partial transcripts and no recordings.
**Fix:** Added 3-minute active-call guard in `syncCalls.ts` — skips conversations where last message was less than 3 minutes ago.

**Problem 3:** Calls synced mid-call never got updated with full transcript later (dedup by conversation_id returned "skipped").
**Fix:** Added update path in writeCall — if existing record has shorter transcript than new data, it patches the transcript, recording URL, and duration.

**Problem 4:** Call display order showed oldest first.
**Fix:** Added `sortByTime` in `PhoneCallSection.tsx` to sort by `timestamp` field descending.

#### 19.6: Price Formatting Fix

**Problem:** AI said "thousand thousand" instead of "million" because it received raw numbers like 35000000.

**Fix:** Added `formatPrice()` helper in `convex/http.ts` that converts numbers to human-readable strings:
- 35000000 -> "35 million Naira"
- 800000 -> "800 thousand Naira"
- 850000000 -> "850 million Naira"
Applied to both `telnyxGetProperties` and `telnyxCustomerLookup` responses.

#### 19.7: CRM Tag Fix (VIP -> Renter)

**Problem:** CRM contacts had "VIP" tag option but no "renter" option. User didn't understand what VIP meant in real estate context.

**Fix:** Replaced "VIP" with "renter" in:
- `ContactsSection.tsx` — TagFilter type, TAG_COLORS, ALL_TAGS array
- `ContactDetailSheet.tsx` — TAG_COLORS
- Color: teal (matching PipelineSection's renter color)

#### 19.8: Activities/Appointments Fix (NEEDS VERIFICATION)

**Problem:** Appointment activities weren't showing in CRM Activities section.

**Root Causes Found:**
1. syncCalls wrote `type: "appointment"` but ActivitiesSection reads `activity_type` field
2. syncCalls wrote `completed: true` but queries filter by `is_completed` field
3. Viewing activities had no `scheduled_at` field, so they were invisible to both listUpcoming (needs scheduled_at >= now) and listOverdue (needs scheduled_at < now)

**Fixes Applied:**
- syncCalls now writes BOTH `type` and `activity_type` fields
- syncCalls now writes BOTH `completed` and `is_completed` fields
- Viewing activities now include `scheduled_at` (24 hours from sync time), `is_completed: false`, `is_ai_generated: true`
- Changed appointment type from "appointment" to "viewing" (already in ACTIVITY_TYPE_CONFIG with purple Eye icon)
- `activities.ts` queries updated: listCompleted checks `is_completed OR completed`, listUpcoming/listOverdue check `is_completed !== true AND completed !== true`
- Added `listRecent` query (returns all activities regardless of status)
- Transcripts list default limit increased from 20 to 100

**STATUS: NOT YET VERIFIED** — These changes were deployed and data was re-synced but the user hasn't confirmed they work yet.

#### 19.9: Transcript Display Fix (NEEDS VERIFICATION)

**Problem:** Clicking a call in Phone Calls section showed "No transcript available" even though transcripts existed.

**Root Cause:** Previous syncs during mid-call captured calls with empty transcripts. The dedup logic skipped them on subsequent syncs. Even after we added the update path, the data needed to be cleared and re-synced.

**Fix:**
- writeCall now updates existing records if new transcript is longer (>50 chars)
- Cleared all synced data and re-synced fresh (19 calls synced)
- Transcript matching logic in PhoneCallSection.tsx was already correct (matches by conversation_id)

**STATUS: NOT YET VERIFIED** — User hasn't confirmed transcripts now display correctly.

#### 19.10: Recording Format Fix

**Problem:** User switched Telnyx recording to WAV format. Code was changed to prefer MP3.

**Fix:** syncCalls.ts now prefers WAV (`download_urls.wav`) with MP3 fallback.

---

### FILES MODIFIED IN SESSION 19

**Backend (Convex) — Modified:**
| File | Changes |
|------|---------|
| `convex/http.ts` | Added `formatPrice()` helper, updated telnyxSyncPersonality hardcoded instructions (natural tone, Naira/million, appointments, no-transfer), restored telnyxCustomerLookup to full properties+memory version, improved sync error responses |
| `convex/syncCalls.ts` | Added 3-min active-call guard, added update path for existing records (transcript refresh), fixed activity fields (activity_type + is_completed), changed appointment type to "viewing" with scheduled_at, WAV recording preference, lead categorization (buyer/seller/renter), dynamic contact tags |
| `convex/crons.ts` | Changed pageSize from 5 to 20 |
| `convex/activities.ts` | Fixed listCompleted/listUpcoming/listOverdue filters to check both is_completed and completed fields, added listRecent query |
| `convex/transcripts.ts` | Increased default list limit from 20 to 100 |

**Frontend — Modified:**
| File | Changes |
|------|---------|
| `src/components/dashboard/AIPersonalitySection.tsx` | Added syncRes.ok check before parsing JSON |
| `src/components/dashboard/PhoneCallSection.tsx` | Added sortByTime for newest-first call display |
| `src/components/dashboard/crm/ContactsSection.tsx` | Replaced VIP with renter in TagFilter, TAG_COLORS, ALL_TAGS |
| `src/components/dashboard/crm/ContactDetailSheet.tsx` | Replaced VIP with renter in TAG_COLORS |

---

### CONVEX ENV VARS (Updated Session 19)
- `ALLOWED_ORIGIN` = `http://localhost:8080` (was localhost:5173, fixed for Vite port)
- All other env vars unchanged from Session 18

### TELNYX ASSISTANT STATE (Current — 2026-04-08)
- **ID:** `assistant-6629c6e8-9de6-4130-af08-32f7f57c0bca`
- **Phone:** `+234-209-394-0544` (assigned to becca)
- **Model:** `anthropic/claude-haiku-4-5`
- **Voice:** Currently using **Telnyx local voice** (temporarily, until ElevenLabs tokens replenished). Was `ElevenLabs.mW1OZ3Jgy8FoeJtbPcSq` ("becca voice").
- **Instructions:** Working version (5146 chars) — includes Nigerian context, natural fillers, Naira/million pronunciation, appointment booking, property search with valid types
- **6 Tools:** get_properties, save_customer, hangup, transfer, customer_lookup, lookup_location (duplicate customer_lookup removed)
- **Transcription:** deepgram/flux, End-of-turn Timeout: 500ms, Eager End-of-turn Threshold: 0.3
- **Noise Suppression:** AICoustics, Voice Focus 2.0, level 0.8
- **test-agent** was created and deleted during debugging

### TELNYX VOICE CONFIG NOTE
When switching back to ElevenLabs:
1. Go to Telnyx portal > AI Assistants > becca > Voice tab
2. Change Provider back to "ElevenLabs"
3. Select API Key: "elevenlab"
4. Select Voice: "becca voice"
5. Set Stability ~0.33, Similarity Boost ~0.5, Style 0
6. Enable Speaker Boost
7. Save

### WHAT'S WORKING (Verified 2026-04-08)
| Feature | Status | Notes |
|---------|--------|-------|
| Personality sync to Telnyx | Working | CORS fixed, syncs via dashboard Save button |
| Call assistant responds | Working | With Telnyx local voice (ElevenLabs needs token refill) |
| Naira/million pronunciation | Working | formatPrice() converts raw numbers to words |
| Property knowledge | Working | AI searches properties correctly with valid types |
| Caller memory | Working | Remembers past conversations, greets by name |
| Natural conversation tone | Working | Fillers, reactions, short responses |
| Call recording in dashboard | Working | WAV format, shows in call log |
| Call log display order | Working | Newest calls first |
| CRM renter tag | Working | Replaced VIP with renter |

### WHAT NEEDS VERIFICATION (Not Yet Confirmed)
| Feature | Status | Notes |
|---------|--------|-------|
| Transcript display | UNVERIFIED | Fixed dedup + re-synced, but user hasn't confirmed transcripts show in dialog |
| Viewing appointments in CRM | UNVERIFIED | Fixed activity_type + is_completed + scheduled_at, but user hasn't confirmed they appear |
| Lead categorization (buyer/seller/renter) | UNVERIFIED | Added keyword detection in syncCalls, tags in contacts |
| Hot lead detection | UNVERIFIED | Interest keywords set temperature to "hot" |

### KNOWN ISSUES (Updated 2026-04-08)
1. **ElevenLabs tokens exhausted** — Voice currently on Telnyx local voice. Need to replenish ElevenLabs credits and switch voice back (see VOICE CONFIG NOTE above).
2. **Meta Business Verification blocked** — Same as Session 18.
3. **Recording URLs are time-limited** — Telnyx S3 URLs expire after 10 minutes. Need to download and store in Convex file storage for permanent access.
4. **Personality sync creates new Telnyx versions** — Each PATCH API call creates a new assistant version. Many versions accumulated. The PATCH only sends instructions + dynamic_variables_webhook_url — does NOT touch tools or voice settings.
5. **clearSyncedData wipes contacts/callers/leads** — When re-syncing, all CRM data from phone calls is deleted and recreated. This is disruptive — need a more surgical approach.
6. **Session 18 + 19 changes NOT pushed to GitHub** — All changes are local only. Need to commit and push when ready.
7. **Convex `ALLOWED_ORIGIN`** — Set to `http://localhost:8080` for dev. Must update to `https://www.becca.live` for production.
8. **Multi-tenancy not yet implemented** — Same as Session 18.
9. **Telnyx call-webhook still never fires** — Workaround: cron-based sync every 2 minutes.
10. **Telnyx Insight Group not applying** — Same as Session 18.
11. **channelHandler writes `type` not `activity_type`** — processInteraction in channelHandler.ts writes activities with `type` field only. Should also write `activity_type` for consistency with ActivitiesSection.tsx.

### BUILD STATUS (2026-04-08)
- **TypeScript:** passes (deployed successfully with `npx convex dev --once`)
- **Vite build:** dev server runs on port 8080
- **Convex:** deployed to `diligent-nightingale-429` (Development)
- **Cron job:** `sync-telnyx-calls` running every 2 minutes with pageSize 20
- **GitHub:** Changes NOT yet pushed
- **Vercel:** www.becca.live running Session 17 code (Sessions 18+19 not deployed)

### GIT STATUS (End of Session 19)
```
Modified (from Session 18 + 19):
  convex/http.ts — formatPrice helper, updated sync instructions, restored customer_lookup, improved error responses
  convex/syncCalls.ts — active-call guard, update path for transcripts, activity field fixes, WAV preference, lead categorization
  convex/crons.ts — pageSize 5 -> 20
  convex/activities.ts — fixed completion filters, added listRecent
  convex/transcripts.ts — limit 20 -> 100
  src/components/dashboard/AIPersonalitySection.tsx — syncRes.ok check
  src/components/dashboard/PhoneCallSection.tsx — sortByTime for call display
  src/components/dashboard/crm/ContactsSection.tsx — VIP -> renter
  src/components/dashboard/crm/ContactDetailSheet.tsx — VIP -> renter

New (from Session 18, untracked):
  convex/crons.ts — cron job for call sync
  convex/seedProperties.ts — 20 Lagos test properties
  convex/syncCalls.ts — Telnyx call sync system
```

### KEY LESSONS FROM SESSION 19
1. **Always check external service credits first** — The assistant silence was caused by ElevenLabs token exhaustion, not code bugs. We spent hours debugging code that was working fine.
2. **CORS port mismatch is silent** — The ALLOWED_ORIGIN must match the actual dev server port (8080, not 5173). Fetch errors from CORS are caught by try-catch and show as generic "sync failed".
3. **Telnyx PATCH API creates versions** — Every PATCH creates a new version. Be careful not to overwrite working tool/voice configs. Only send the fields you want to change.
4. **Convex field naming inconsistency** — The codebase has both `type`/`completed` (from channelHandler) and `activity_type`/`is_completed` (from ActivitiesSection). Both must be set when writing activities.
5. **clearSyncedData is destructive** — It wipes ALL synced CRM data. Use sparingly.
