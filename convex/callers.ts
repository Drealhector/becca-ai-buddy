import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * UNIFIED CUSTOMER IDENTITY
 *
 * This is the ONE table that tracks every customer across every channel.
 * Phone number or platform:userId is the key.
 * Memory, name, interaction count all live here.
 *
 * Replaces the old: customers, callers, customer_memory tables.
 */

// Lookup by phone number (exact match)
export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("callers")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
  },
});

// List all customers, most recent first
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    return await ctx.db
      .query("callers")
      .order("desc")
      .take(limit);
  },
});

// Search by name (for CRM/dashboard)
export const searchByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const all = await ctx.db.query("callers").collect();
    return all.filter(
      (c) => c.name && c.name.toLowerCase().includes(name.toLowerCase())
    );
  },
});

/**
 * UPSERT — the core "remember this person" function.
 * Called by channelHandler.processInteraction after EVERY interaction.
 *
 * Handles:
 * - First-time customer creation
 * - Returning customer recognition
 * - Memory accumulation across channels
 * - Interaction count tracking
 */
export const upsert = mutation({
  args: {
    phone: v.string(),                          // phone number or platform:userId
    name: v.optional(v.string()),               // customer name if known
    memory_summary: v.optional(v.string()),      // updated rolling memory
    call_summary: v.optional(v.string()),        // summary of THIS interaction
    channel: v.optional(v.string()),             // which channel: whatsapp, instagram, facebook, telegram, phone, web
  },
  handler: async (ctx, { phone, name, memory_summary, call_summary, channel }) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("callers")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();

    if (existing) {
      const updates: Record<string, any> = {
        last_call_at: now,
        updated_at: now,
        call_count: (existing.call_count ?? 0) + 1,
        last_channel: channel ?? existing.last_channel,
      };

      // Update name — but filter out placeholder names that aren't real
      const badNames = ["unknown", "there", "caller", "customer", "user", "anonymous"];
      const isNewNameReal = name && !badNames.includes(name.toLowerCase().trim());
      const hasRealName = existing.name && !badNames.includes(existing.name.toLowerCase().trim());
      // Only overwrite with a real name. If we have a real name, still allow updates (person might correct spelling)
      if (isNewNameReal) updates.name = name;

      // Append to memory summary (rolling, max 3000 chars)
      if (memory_summary) {
        updates.memory_summary = memory_summary.slice(-3000);
      } else if (call_summary) {
        const existingMemory = existing.memory_summary || "";
        const newEntry = `[${channel ?? "unknown"} ${now.split("T")[0]}] ${call_summary}`;
        updates.memory_summary = (existingMemory + "\n" + newEntry).slice(-3000);
      }

      // Append to interaction history
      if (call_summary) {
        const history = Array.isArray(existing.interaction_history)
          ? existing.interaction_history
          : [];
        updates.interaction_history = [
          ...history,
          { summary: call_summary, date: now, channel: channel ?? "unknown" },
        ].slice(-50); // keep last 50 interactions
      }

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // First time customer
    return await ctx.db.insert("callers", {
      phone,
      name: name ?? undefined,
      call_count: 1,
      memory_summary: call_summary
        ? `[${channel ?? "unknown"} ${now.split("T")[0]}] ${call_summary}`
        : undefined,
      interaction_history: call_summary
        ? [{ summary: call_summary, date: now, channel: channel ?? "unknown" }]
        : [],
      first_contacted_at: now,
      last_call_at: now,
      last_channel: channel ?? undefined,
      updated_at: now,
    });
  },
});

// Update just the memory (called by AI after generating a summary)
export const updateMemory = mutation({
  args: {
    id: v.id("callers"),
    memory_summary: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { id, memory_summary, name }) => {
    const updates: Record<string, any> = {
      memory_summary: memory_summary.slice(-3000),
      updated_at: new Date().toISOString(),
    };
    if (name) updates.name = name;
    await ctx.db.patch(id, updates);
  },
});
