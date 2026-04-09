import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List upcoming activities (not completed, scheduled in future)
export const listUpcoming = query({
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const all = await ctx.db
      .query("activities")
      .filter((q) => q.and(
        q.neq(q.field("is_completed"), true),
        q.neq(q.field("completed"), true)
      ))
      .order("asc")
      .collect();
    return all.filter((a) => a.scheduled_at && a.scheduled_at >= now);
  },
});

// List overdue activities (not completed, scheduled in past)
export const listOverdue = query({
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const all = await ctx.db
      .query("activities")
      .filter((q) => q.and(
        q.neq(q.field("is_completed"), true),
        q.neq(q.field("completed"), true)
      ))
      .order("desc")
      .collect();
    return all.filter((a) => a.scheduled_at && a.scheduled_at < now);
  },
});

// List completed activities
export const listCompleted = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const all = await ctx.db
      .query("activities")
      .filter((q) => q.or(
        q.eq(q.field("is_completed"), true),
        q.eq(q.field("completed"), true)
      ))
      .order("desc")
      .collect();
    return all.slice(0, limit);
  },
});

// List all recent activities (regardless of completion status)
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    return await ctx.db
      .query("activities")
      .order("desc")
      .take(limit);
  },
});

// List by contact
export const listByContact = query({
  args: { contact_id: v.id("contacts"), limit: v.optional(v.number()) },
  handler: async (ctx, { contact_id, limit = 10 }) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_contact_id", (q) => q.eq("contact_id", contact_id))
      .order("desc")
      .take(limit);
  },
});

// Create activity
export const create = mutation({
  args: {
    business_id: v.optional(v.id("business_keys")),
    contact_id: v.optional(v.id("contacts")),
    lead_id: v.optional(v.id("leads")),
    activity_type: v.optional(v.string()),
    type: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduled_at: v.optional(v.string()),
    is_completed: v.optional(v.boolean()),
    is_ai_generated: v.optional(v.boolean()),
    completed: v.optional(v.boolean()),
    created_by: v.optional(v.string()),
  },
  handler: async (ctx, fields) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("activities", {
      ...fields,
      is_completed: fields.is_completed ?? fields.completed ?? false,
      created_at: now,
      updated_at: now,
    });
  },
});

// Mark activity complete
export const markComplete = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, { id }) => {
    const now = new Date().toISOString();
    await ctx.db.patch(id, {
      is_completed: true,
      completed: true,
      completed_at: now,
      updated_at: now,
    });
  },
});

// Count overdue
export const countOverdue = query({
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const all = await ctx.db
      .query("activities")
      .filter((q) => q.and(
        q.neq(q.field("is_completed"), true),
        q.neq(q.field("completed"), true)
      ))
      .collect();
    return all.filter((a) => a.scheduled_at && a.scheduled_at < now).length;
  },
});
