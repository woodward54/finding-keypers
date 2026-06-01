import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  photos: defineTable({
    storageId: v.id('_storage'),
    // Optional display name / caption supplied by the keyper
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_created', ['createdAt']),
});
