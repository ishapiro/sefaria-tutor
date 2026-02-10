import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'
import { purgeCache, getMaxCacheSizeBytes } from '~/server/utils/pronunciation-cache'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  // @ts-ignore
  const r2Bucket = event.context.cloudflare?.env?.PRONUNCIATION_CACHE

  if (!db || !r2Bucket) {
    throw createError({
      statusCode: 500,
      message: 'Database or R2 bucket not available',
    })
  }

  try {
    const maxSizeBytes = getMaxCacheSizeBytes()
    const result = await purgeCache(db, r2Bucket, maxSizeBytes)

    return {
      success: true,
      deletedCount: result.deletedCount,
      freedBytes: result.freedBytes,
      message: `Purged ${result.deletedCount} entries, freed ${(result.freedBytes / 1024 / 1024).toFixed(2)} MB`,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to purge cache',
    })
  }
})
