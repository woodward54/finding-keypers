import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/**
 * List every keyper photo, newest first, with a resolved image URL.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db.query('photos').withIndex('by_created').order('desc').collect()

    return Promise.all(
      photos.map(async (photo) => ({
        id: photo._id,
        name: photo.name ?? 'Anonymous Keyper',
        createdAt: photo.createdAt,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    )
  },
})

/**
 * Generate a short-lived URL the browser can POST the raw image bytes to.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return ctx.storage.generateUploadUrl()
  },
})

/**
 * Delete a photo record and its underlying image file from storage.
 */
export const deletePhoto = mutation({
  args: {
    id: v.id('photos'),
  },
  handler: async (ctx, { id }) => {
    const photo = await ctx.db.get(id)
    if (!photo) return null
    await ctx.storage.delete(photo.storageId)
    await ctx.db.delete(id)
    return null
  },
})

/**
 * Persist a photo record once the bytes have been uploaded to storage.
 */
export const savePhoto = mutation({
  args: {
    storageId: v.id('_storage'),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, name }) => {
    return ctx.db.insert('photos', {
      storageId,
      name: name?.trim() ? name.trim() : undefined,
      createdAt: Date.now(),
    })
  },
})
