## BECCA BRAIN — Full Session Handover (Updated 2026-04-08, Session 20)

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

**Full backend migration from Supabase to Convex + VAPI to Telnyx, then full synergy + optimization + ElevenLabs integration + security hardening + call sync + Nigerian location awareness + personality sync + CRM overhaul + caller identity fix**

---

### STAGES 1-19: Previous Sessions (See original HANDOVER for full details)

All previous stages documented in detail. Key milestones: Supabase to Convex migration, Telnyx AI Assistant setup, ElevenLabs integration, security hardening, call sync system, Nigerian location intelligence, 20 Lagos test properties seeded, personality sync CORS fix, natural tone improvements, CRM tag fixes.

---

### STAGE 20: CRM Pipeline Fix + Analytics + Caller Identity Fix + Debug Pipeline Skill (Session 20 — 2026-04-08)

**This session focused on: fixing CRM activities/pipeline/analytics not showing data, fixing caller name mix-ups, fixing transcript pagination, and creating a reusable debug-pipeline skill.**

---

#### 20.1: CRM Activities Fix (CRITICAL — Multiple Root Causes)

**Problem:** CRM Activities section showed nothing — no appointments, no call activities.

**Root Causes Found (5 bugs working together):**
1. **`_id` vs `id` mismatch** — Frontend `Activity` interface used `id` but Convex returns `_id`. `activity.id` was always `undefined` → broken React keys, broken "mark complete" button.
2. **`activity_type` not normalized** — channelHandler only wrote `type` field, frontend read `activity_type`. Activities showed wrong icon/config.
3. **Telnyx API pagination broken** — Sync code used `page[size]=200` which Telnyx rejects when combined with `page[number]`. Only page 1 was fetched → transcripts were always empty → appointment keyword detection never fired.
4. **Update path didn't re-run appointment detection** — If a call was first synced mid-call (empty transcript), the update path only refreshed the transcript text but never re-ran the appointment keyword regex or extracted save_customer tool call data.
5. **save_customer notes not extracted** — The AI saves structured appointment data via `save_customer` tool calls (e.g., "Viewing scheduled for April 28th at 7 PM"), but sync code never extracted this data.

**Fixes Applied:**
- Changed `Activity` interface and all usages to `_id`
- Added `activity_type || type || "task"` fallback in frontend rendering
- Fixed Telnyx pagination: use default page size on first request, then `page[number]=N&page[size]=20`
- Update path now runs full appointment detection (keyword matching + save_customer notes)
- Sync now extracts `save_customer` tool call notes for appointment descriptions
- Added "All" tab to ActivitiesSection showing all activities regardless of status
- channelHandler now writes both `type` + `activity_type` and `completed` + `is_completed`

**Result:** 7 viewing appointments + 19 call activities now showing correctly.

#### 20.2: CRM Pipeline Fix

**Problem:** Pipeline section showed empty columns — no leads in any stage.

**Root Cause:** syncCalls wrote `status: "interested"` but STAGES config only has: new, contacted, qualified, viewing_scheduled, offer_made, negotiating, closed_won, closed_lost. "interested" is NOT a valid pipeline stage → lead fell into no column.

**Additional Issues:**
- `lead_type` field not set by syncCalls (pipeline needs it for type badge)
- `priority` field not set (auto-created leads had no priority)

**Fixes Applied:**
- Changed lead status from `"interested"` to `"qualified"` (valid pipeline stage)
- Added `lead_type` from caller category (buyer/seller/renter)
- Added `priority`: "high" for interested callers, "medium" for others

#### 20.3: CRM Analytics Fix

**Problem:** Analytics section showed mostly zeros — no call data, wrong lead source chart.

**Root Causes:**
1. **No call metrics** — Analytics had ZERO queries for call_history table. All call data was invisible.
2. **Lead source mismatch** — LEAD_SOURCES config used key `"phone_call"` but syncCalls writes `source: "phone"`. Also `"website"` vs `"web"`.
3. **Deal metrics always zero** — "Deals This Month" and "Revenue This Month" require manual deal creation (no auto-deals from calls).

**Fixes Applied:**
- Added `callHistory.stats` query (totalCalls, incoming, outgoing, avgDuration, totalDuration)
- Fixed LEAD_SOURCES keys: `"phone_call"` → `"phone"`, `"website"` → `"web"`
- Replaced "Deals This Month" with "Total Calls" (19) and "Revenue This Month" with "Avg Call Duration" (1.2 min)
- Added Phone icon import for the Total Calls metric card

#### 20.4: Caller Name Greeting Fix

**Problem:** Assistant stopped greeting callers by name. Said "Hi there!" even for known callers.

**Root Cause:** `clearSyncedData` deleted the `callers` table — the persistent memory that stores caller names. The dynamic-variables webhook looks up names from this table. After every re-sync, names were wiped → greeting defaulted to "Hi there!".

**Fix:** `clearSyncedData` no longer deletes callers. They persist across re-syncs as permanent memory.

#### 20.5: "Hi Unknown!" Fix

**Problem:** Assistant greeted callers as "Hi Unknown!" instead of "Hi there!" for callers without names.

**Root Cause:** Dynamic variables webhook returned whatever was stored — including "Unknown" as a name. The assistant saw "Unknown" as a real name and used it.

**Fixes Applied (4 layers):**
- **Dynamic variables webhook** — filters out "unknown", "there", "caller", "customer", "user", "anonymous" → returns "there" instead
- **customer_lookup response** — same filter + adds "(you don't know their name yet — ask for it!)" when name is invalid
- **save_customer webhook** — strips invalid names before saving (AI sometimes saves "Unknown")
- **callers.upsert** — won't save invalid names, won't overwrite real name with invalid one

#### 20.6: Caller Identity Mix-Up Fix (CRITICAL)

**Problem:** Assistant called the user "Peter" when they were calling from a completely different phone number. The AI was mixing up contacts and names across different callers.

**Root Cause (traced from actual Telnyx transcript):**
1. User called from +2347034640951 (the "Kingsley" number)
2. Greeting correctly said "Hi Kingsley!" (from dynamic variables)
3. Assistant then called `customer_lookup` with `phone_number: "+2348034567890"` (Peter's number!) — **the LLM hallucinated the wrong phone number**
4. customer_lookup returned Peter's data → assistant started calling user "Peter"
5. `save_customer` then saved conversation notes under Peter's record

**The LLM was picking up phone numbers from conversation memory/context and using THOSE instead of the actual caller's phone.**

**Fixes Applied:**
- **customer_lookup webhook** — Now extracts REAL caller phone from `telnyx_end_user_target` in Telnyx payload metadata, IGNORING whatever phone the LLM sends
- **save_customer webhook** — Same fix. Always uses real phone from Telnyx metadata
- **Updated instructions** — Told assistant to pass `"+234"` as placeholder phone number. Added: "NEVER type in a phone number you heard in conversation or saw in memory — it may belong to a different person."
- Added console.log in both webhooks to track real vs LLM-provided phone numbers for debugging

#### 20.7: save_customer Contact Creation Fix

**Problem:** Names given during calls didn't appear in CRM contacts.

**Root Cause:** `save_customer` webhook only UPDATED existing contacts, never CREATED new ones. When a first-time caller gave their name, it was saved to the callers table but no CRM contact was created. The contact was only created later by the cron sync — which might not extract the name correctly.

**Fix:** save_customer now CREATES a new CRM contact if one doesn't exist for that phone number. Names appear in the CRM instantly during the call.

#### 20.8: syncCalls Name Fallback

**Problem:** syncCalls created contacts without names even when the callers table had the name.

**Fix:** Added `resolvedName` fallback: uses `args.caller_name` first, then checks the callers table for a previously saved name. Also sets `full_name` field alongside `name`.

#### 20.9: Debug Pipeline Skill Created

Created `.claude/skills/debug-pipeline/SKILL.md` — a reusable debugging methodology for data pipeline issues. The skill captures the systematic approach used in this session:
1. Parallel research with agents (map write/read layers simultaneously)
2. Fetch raw data from source (never trust the app's representation)
3. Trace the pipeline step by step (API → sync → mutation → query → frontend)
4. Check field name mismatches, pagination, update paths
5. Clear, re-sync, verify via CLI then visually

---

### FILES MODIFIED IN SESSION 20

**Backend (Convex) — Modified:**
| File | Changes |
|------|---------|
| `convex/http.ts` | customer_lookup + save_customer use Telnyx metadata phone (not LLM-provided), save_customer creates contacts (not just updates), updated CALLER HANDLING instructions (pass "+234", never guess phone), invalid name filtering in dynamic variables + customer_lookup, console.log for phone debugging |
| `convex/syncCalls.ts` | Fixed pagination (page[number] format), appointment detection extracts save_customer notes, update path re-runs CRM logic, lead status "interested"→"qualified", added lead_type + priority, resolvedName fallback from callers table, clearSyncedData preserves callers table |
| `convex/activities.ts` | Already fixed in Session 19, verified working |
| `convex/callHistory.ts` | Added `stats` query (totalCalls, incoming, outgoing, avgDuration) |
| `convex/callers.ts` | Invalid name filter in upsert (won't save "Unknown", "there", etc.) |
| `convex/channelHandler.ts` | Now writes both `type` + `activity_type` and `completed` + `is_completed` |

**Frontend — Modified:**
| File | Changes |
|------|---------|
| `src/components/dashboard/crm/ActivitiesSection.tsx` | Changed interface to `_id`, added `activity_type \|\| type \|\| "task"` fallback, added "All" tab with listRecent query, fixed handleComplete to use `_id` |
| `src/components/dashboard/crm/AnalyticsSection.tsx` | Added callHistory.stats query, replaced Deals/Revenue metrics with Total Calls/Avg Duration, fixed LEAD_SOURCES keys ("phone", "web"), added Phone icon |
| `src/components/dashboard/crm/ContactDetailSheet.tsx` | Changed to `_id`, added activity_type fallback |
| `src/components/dashboard/crm/ContactsSection.tsx` | VIP → renter (from Session 19) |

**New Files:**
| File | Purpose |
|------|---------|
| `.claude/skills/debug-pipeline/SKILL.md` | Reusable debugging methodology for data pipeline issues |

---

### TELNYX ASSISTANT STATE (Current — 2026-04-08)
- **ID:** `assistant-6629c6e8-9de6-4130-af08-32f7f57c0bca`
- **Phone:** `+234-209-394-0544` (assigned to becca)
- **Model:** `anthropic/claude-haiku-4-5`
- **Voice:** Currently using **Telnyx local voice** (temporarily, until ElevenLabs tokens replenished)
- **Instructions:** Updated in Session 20 — includes caller phone safety rules ("pass +234, never guess phone numbers"), stronger customer_lookup-first directive, name-asking rules
- **6 Tools:** get_properties, save_customer, hangup, transfer, customer_lookup, lookup_location
- **Webhooks now use Telnyx metadata phone** — customer_lookup and save_customer extract `telnyx_end_user_target` from payload, ignoring LLM-provided phone

### WHAT'S WORKING (Verified 2026-04-08)
| Feature | Status | Notes |
|---------|--------|-------|
| CRM Activities | **Working** | 7 viewing appointments (upcoming) + 19 call activities (completed) + "All" tab |
| CRM Pipeline | **Working** | Lead in "Qualified" column with lead_type and priority |
| CRM Analytics | **Working** | Total Contacts, Active Leads, Hot Leads, Total Calls (19), Avg Duration (1.2 min), Overdue Follow-ups, Pipeline Funnel chart, Lead Sources chart |
| CRM Contacts | **Working** | Contact with name, phone, temperature, tags |
| Transcript sync | **Working** | Full transcripts with proper pagination (all pages fetched) |
| Appointment detection | **Working** | Detects from transcript keywords AND save_customer notes |
| Personality sync to Telnyx | **Working** | CORS fixed, syncs via dashboard Save button |
| Call assistant responds | **Working** | With Telnyx local voice |
| Caller memory | **Working** | Remembers past conversations |
| save_customer creates contacts | **Working** | Names appear in CRM instantly during call |
| Dynamic variable greeting | **Working** | Filters out "Unknown" — says "Hi there!" for unknown callers |
| Caller phone identity | **Working** | Webhooks use Telnyx metadata phone, not LLM-provided |

### WHAT NEEDS VERIFICATION (Not Yet Confirmed)
| Feature | Status | Notes |
|---------|--------|-------|
| Greeting by name for KNOWN callers | NEEDS TESTING | Fixed dynamic variables + instructions, but user tested with "Unknown" caller. Need test with known caller (e.g., call from Kingsley's number) |
| Name asking for new callers | NEEDS TESTING | Updated instructions say "ask within first 2 exchanges". Need test call from new number |
| Phone identity fix | NEEDS TESTING | Webhooks now use telnyx_end_user_target. Need call to verify no more name mix-ups |

### KNOWN ISSUES (Updated 2026-04-08)
1. **ElevenLabs tokens exhausted** — Voice currently on Telnyx local voice. Need to replenish ElevenLabs credits and switch voice back (see Session 19 VOICE CONFIG NOTE).
2. **Meta Business Verification blocked** — Same as Session 18.
3. **Recording URLs are time-limited** — Telnyx S3 URLs expire after 10 minutes. Need to download and store in Convex file storage for permanent access.
4. **Personality sync creates new Telnyx versions** — Each PATCH API call creates a new assistant version. Many versions accumulated.
5. **Convex `ALLOWED_ORIGIN`** — Set to `http://localhost:8080` for dev. Must update to `https://www.becca.live` for production.
6. **Multi-tenancy not yet implemented** — Same as Session 18.
7. **Telnyx call-webhook still never fires** — Workaround: cron-based sync every 2 minutes. The webhook handler exists and handles call.hangup events, but Telnyx never sends them.
8. **Telnyx Insight Group not applying** — Same as Session 18.
9. **Peter's calls too old for sync** — Peter (phone +2348034567890) exists in callers table but his calls are older than the 20-conversation sync window. His CRM contact will be created on his next call (save_customer now creates contacts).
10. **Currency format shows $** — Analytics formatCurrency() uses $ symbol. Should use ₦ for Naira.

### BUILD STATUS (2026-04-08)
- **TypeScript:** passes (deployed successfully with `npx convex dev --once`)
- **Vite build:** dev server runs on port 8080
- **Convex:** deployed to `diligent-nightingale-429` (Development)
- **Cron job:** `sync-telnyx-calls` running every 2 minutes with pageSize 20
- **GitHub:** ✅ Pushed — commit `2edb0e2` on `main`
- **Vercel:** ✅ Deployed — `dpl_BdZSBCEYmwvGwPdtucPC3bmc5YFx` READY on production (www.becca.live)

### GIT STATUS (End of Session 20)
```
All changes committed and pushed to main.
Commit: 2edb0e2 — "Fix CRM pipeline: activities, pipeline, analytics, caller identity"
Vercel auto-deployed from git push — production READY.

Files in commit:
  convex/http.ts — customer_lookup/save_customer use Telnyx metadata phone, save_customer creates contacts, updated instructions, invalid name filtering
  convex/syncCalls.ts — fixed pagination, appointment from save_customer notes, lead status/type/priority, resolvedName fallback, clearSyncedData preserves callers
  convex/callHistory.ts — added stats query
  convex/callers.ts — invalid name filter in upsert
  convex/channelHandler.ts — writes both type+activity_type, completed+is_completed
  convex/activities.ts — fixed filters, added listRecent
  convex/transcripts.ts — limit 100
  convex/crons.ts — cron job for call sync (NEW)
  convex/seedProperties.ts — 20 Lagos test properties (NEW)
  convex/syncCalls.ts — full Telnyx call sync system (NEW)
  convex/_generated/api.d.ts — updated generated types
  src/components/dashboard/crm/ActivitiesSection.tsx — _id fix, activity_type fallback, "All" tab
  src/components/dashboard/crm/AnalyticsSection.tsx — call stats, fixed source keys, Phone icon
  src/components/dashboard/crm/ContactDetailSheet.tsx — _id fix, activity_type fallback
  src/components/dashboard/crm/ContactsSection.tsx — VIP→renter
  src/components/dashboard/AIPersonalitySection.tsx — syncRes.ok check
  src/components/dashboard/PhoneCallSection.tsx — sortByTime
  HANDOVER.md — updated
```

### KEY LESSONS FROM SESSION 20
1. **Always start from the SOURCE** — Don't guess where data drops off. Fetch raw data from the external API (Telnyx), trace it through every transformation step, and verify at each stage.
2. **LLMs hallucinate phone numbers** — The assistant picked up phone numbers from conversation memory and used them in tool calls instead of the actual caller's phone. Server-side webhooks must extract the real phone from Telnyx metadata (`telnyx_end_user_target`), never trust what the LLM sends.
3. **Pagination formats differ per API** — Telnyx messages endpoint uses `page[number]` + `page[size]=20` (not `page[size]=200`). Testing the EXACT URL the code constructs is critical.
4. **The update path must re-run ALL business logic** — When data is synced via polling, the first sync may capture incomplete data. The update path must re-run appointment detection, name extraction, and CRM analysis — not just patch raw fields.
5. **Filter "Unknown" as a name everywhere** — The AI sometimes saves placeholder names. Every layer that reads or writes names must filter out invalid values: dynamic variables, customer_lookup, save_customer, callers.upsert.
6. **save_customer must CREATE contacts, not just update** — The webhook was only updating existing contacts. First-time callers' names were lost because no contact existed yet.
7. **Use a reusable skill for debugging** — The debug-pipeline skill (`.claude/skills/debug-pipeline/SKILL.md`) captures the systematic methodology. Use it whenever data isn't flowing correctly.
