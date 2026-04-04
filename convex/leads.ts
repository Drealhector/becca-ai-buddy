import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all leads
export const list = query({
  args: { business_id: v.optional(v.id("business_keys")) },
  handler: async (ctx, { business_id }) => {
    if (business_id) {
      return await ctx.db
        .query("leads")
        .withIndex("by_business_id", (q) => q.eq("business_id", business_id))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("leads").order("desc").collect();
  },
});

// List leads by contact
export const listByContact = query({
  args: { contact_id: v.id("contacts") },
  handler: async (ctx, { contact_id }) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_contact_id", (q) => q.eq("contact_id", contact_id))
      .order("desc")
      .collect();
  },
});

// Create lead
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    contact_id: v.optional(v.id("contacts")),
    title: v.optional(v.string()),
    lead_type: v.optional(v.string()),
    priority: v.optional(v.string()),
    source: v.optional(v.string()),
    property_interest: v.optional(v.string()),
    deal_value: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    const now = new Date().toISOString();
    const leadId = await ctx.db.insert("leads", {
      ...fields,
      status: "new",
      created_at: now,
      updated_at: now,
    });

    // Update contact's active_leads_count
    if (fields.contact_id) {
      const contact = await ctx.db.get(fields.contact_id);
      if (contact) {
        await ctx.db.patch(fields.contact_id, {
          active_leads_count: (contact.active_leads_count ?? 0) + 1,
          updated_at: now,
        });
      }
    }

    return leadId;
  },
});

// Update lead status (for pipeline drag-and-drop)
export const updateStatus = mutation({
  args: {
    id: v.id("leads"),
    status: v.string(),
    changed_by: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, changed_by }) => {
    const lead = await ctx.db.get(id);
    if (!lead) return;

    const now = new Date().toISOString();
    const fromStage = lead.status;

    await ctx.db.patch(id, { status, updated_at: now });

    // Record stage history
    await ctx.db.insert("lead_stage_history", {
      lead_id: id,
      from_stage: fromStage,
      to_stage: status,
      changed_at: now,
      changed_by: changed_by || "manual",
    });
  },
});

// Update lead
export const update = mutation({
  args: {
    id: v.id("leads"),
    title: v.optional(v.string()),
    priority: v.optional(v.string()),
    lead_type: v.optional(v.string()),
    property_interest: v.optional(v.string()),
    deal_value: v.optional(v.number()),
    notes: v.optional(v.string()),
    assigned_to: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// Count leads by status (for analytics)
export const countByStatus = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("leads").collect();
    const counts: Record<string, number> = {};
    for (const lead of all) {
      const status = lead.status || "new";
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  },
});

// Count active leads
export const countActive = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("leads").collect();
    return all.filter((l) => l.status !== "closed_won" && l.status !== "closed_lost").length;
  },
});
