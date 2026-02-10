import { normalizePhrase, computeHash } from './cache'

// Default max cache size: 500 MB (524,288,000 bytes)
export const DEFAULT_MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB

// Purge thresholds
export const PURGE_THRESHOLD_PERCENT = 0.90 // Start purging at 90% capacity
export const PURGE_TARGET_PERCENT = 0.70 // Purge down to 70% capacity

export interface PronunciationCacheEntry {
  text_hash: string
  normalized_text: string
  r2_key: string
  file_size_bytes: number
  created_at: number
  last_accessed_at: number
  access_count: number
}

export interface PronunciationCacheStats {
  total_size_bytes: number
  total_files: number
  hits: number
  misses: number
  last_purge_at: number | null
  updated_at: number
}

/**
 * Normalize text for pronunciation cache (same as translation cache)
 */
export function normalizePronunciationText(text: string): string {
  return normalizePhrase(text)
}

/**
 * Compute hash for pronunciation cache key
 */
export async function computePronunciationHash(normalizedText: string): Promise<string> {
  return computeHash(normalizedText)
}

/**
 * Get R2 key for a pronunciation file
 */
export function getR2Key(textHash: string): string {
  return `pronunciations/${textHash}.mp3`
}

/**
 * Get max cache size from environment or use default
 */
export function getMaxCacheSizeBytes(): number {
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const maxSize = env?.PRONUNCIATION_CACHE_MAX_SIZE_BYTES
  if (maxSize) {
    const parsed = parseInt(maxSize, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return DEFAULT_MAX_CACHE_SIZE_BYTES
}

/**
 * Check if cache needs purging and return entries to delete (LRU)
 */
export async function getEntriesToPurge(
  db: D1Database,
  currentSizeBytes: number,
  maxSizeBytes: number
): Promise<PronunciationCacheEntry[]> {
  const threshold = maxSizeBytes * PURGE_THRESHOLD_PERCENT
  const target = maxSizeBytes * PURGE_TARGET_PERCENT

  // Only purge if we're over the threshold
  if (currentSizeBytes < threshold) {
    return []
  }

  // Calculate how much we need to free
  const bytesToFree = currentSizeBytes - target

  // Get entries sorted by last_accessed_at (oldest first) until we have enough to free
  const entries: PronunciationCacheEntry[] = []
  let totalBytesToFree = 0

  const result = await db
    .prepare('SELECT * FROM pronunciation_cache ORDER BY last_accessed_at ASC')
    .all<PronunciationCacheEntry>()

  for (const entry of result.results || []) {
    entries.push(entry)
    totalBytesToFree += entry.file_size_bytes
    if (totalBytesToFree >= bytesToFree) {
      break
    }
  }

  return entries
}

/**
 * Purge old entries from cache (LRU strategy)
 */
export async function purgeCache(
  db: D1Database,
  r2Bucket: R2Bucket,
  maxSizeBytes: number
): Promise<{ deletedCount: number; freedBytes: number }> {
  const stats = await db
    .prepare('SELECT total_size_bytes FROM pronunciation_cache_stats WHERE id = 1')
    .first<{ total_size_bytes: number }>()

  if (!stats) {
    return { deletedCount: 0, freedBytes: 0 }
  }

  const entriesToDelete = await getEntriesToPurge(db, stats.total_size_bytes, maxSizeBytes)

  if (entriesToDelete.length === 0) {
    return { deletedCount: 0, freedBytes: 0 }
  }

  let deletedCount = 0
  let freedBytes = 0

  // Delete from R2 and D1
  for (const entry of entriesToDelete) {
    try {
      // Delete from R2
      await r2Bucket.delete(entry.r2_key)
      
      // Delete from D1
      await db.prepare('DELETE FROM pronunciation_cache WHERE text_hash = ?').bind(entry.text_hash).run()
      
      deletedCount++
      freedBytes += entry.file_size_bytes
    } catch (err) {
      console.error(`Error purging entry ${entry.text_hash}:`, err)
      // Continue with other entries even if one fails
    }
  }

  // Update stats
  const now = Math.floor(Date.now() / 1000)
  const newTotalSize = Math.max(0, stats.total_size_bytes - freedBytes)
  const newTotalFiles = await db
    .prepare('SELECT COUNT(*) as count FROM pronunciation_cache')
    .first<{ count: number }>()
    .then(r => (r?.count as number) || 0)

  await db
    .prepare(
      'UPDATE pronunciation_cache_stats SET total_size_bytes = ?, total_files = ?, last_purge_at = ?, updated_at = ? WHERE id = 1'
    )
    .bind(newTotalSize, newTotalFiles, now, now)
    .run()

  return { deletedCount, freedBytes }
}

/**
 * Update cache stats after a hit
 */
export async function recordCacheHit(db: D1Database, textHash: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  
  // Update access info
  await db
    .prepare('UPDATE pronunciation_cache SET last_accessed_at = ?, access_count = access_count + 1 WHERE text_hash = ?')
    .bind(now, textHash)
    .run()

  // Update stats
  await db
    .prepare('UPDATE pronunciation_cache_stats SET hits = hits + 1, updated_at = ? WHERE id = 1')
    .bind(now)
    .run()
}

/**
 * Update cache stats after a miss
 */
export async function recordCacheMiss(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare('UPDATE pronunciation_cache_stats SET misses = misses + 1, updated_at = ? WHERE id = 1')
    .bind(now)
    .run()
}

/**
 * Add new entry to cache
 */
export async function addToCache(
  db: D1Database,
  r2Bucket: R2Bucket,
  textHash: string,
  normalizedText: string,
  audioData: ArrayBuffer,
  maxSizeBytes: number
): Promise<void> {
  const fileSize = audioData.byteLength
  const r2Key = getR2Key(textHash)
  const now = Math.floor(Date.now() / 1000)

  // Check if we need to purge before adding
  const stats = await db
    .prepare('SELECT total_size_bytes FROM pronunciation_cache_stats WHERE id = 1')
    .first<{ total_size_bytes: number }>()

  const currentSize = (stats?.total_size_bytes || 0) + fileSize

  // Purge if needed (lazy purge on cache miss)
  if (currentSize > maxSizeBytes * PURGE_THRESHOLD_PERCENT) {
    await purgeCache(db, r2Bucket, maxSizeBytes)
  }

  // Store in R2
  await r2Bucket.put(r2Key, audioData, {
    httpMetadata: {
      contentType: 'audio/mpeg',
      cacheControl: 'public, max-age=31536000', // 1 year
    },
  })

  // Store metadata in D1
  await db
    .prepare(
      'INSERT OR REPLACE INTO pronunciation_cache (text_hash, normalized_text, r2_key, file_size_bytes, created_at, last_accessed_at, access_count) VALUES (?, ?, ?, ?, ?, ?, 1)'
    )
    .bind(textHash, normalizedText, r2Key, fileSize, now, now)
    .run()

  // Update stats
  const newStats = await db
    .prepare('SELECT total_size_bytes, total_files FROM pronunciation_cache_stats WHERE id = 1')
    .first<{ total_size_bytes: number; total_files: number }>()

  const newTotalSize = (newStats?.total_size_bytes || 0) + fileSize
  const newTotalFiles = (newStats?.total_files || 0) + 1

  await db
    .prepare(
      'UPDATE pronunciation_cache_stats SET total_size_bytes = ?, total_files = ?, updated_at = ? WHERE id = 1'
    )
    .bind(newTotalSize, newTotalFiles, now)
    .run()
}

/**
 * Get cache entry from D1
 */
export async function getCacheEntry(
  db: D1Database,
  textHash: string
): Promise<PronunciationCacheEntry | null> {
  const entry = await db
    .prepare('SELECT * FROM pronunciation_cache WHERE text_hash = ?')
    .bind(textHash)
    .first<PronunciationCacheEntry>()

  return entry || null
}

/**
 * Get cache stats
 */
export async function getCacheStats(db: D1Database): Promise<PronunciationCacheStats | null> {
  const stats = await db
    .prepare('SELECT * FROM pronunciation_cache_stats WHERE id = 1')
    .first<PronunciationCacheStats>()

  return stats || null
}
