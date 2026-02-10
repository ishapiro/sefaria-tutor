import { createError, defineEventHandler, getHeader, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import {
  normalizePronunciationText,
  computePronunciationHash,
  getCacheEntry,
  recordCacheHit,
  recordCacheMiss,
  addToCache,
  getMaxCacheSizeBytes,
  getR2Key,
} from '~/server/utils/pronunciation-cache'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const apiAuthToken = config.apiAuthToken || env?.API_AUTH_TOKEN || ''
  const openaiApiKey = config.openaiApiKey || env?.OPENAI_API_KEY || ''

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing or invalid Authorization header',
    })
  }
  const token = authHeader.slice(7)
  if (apiAuthToken && token !== apiAuthToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid token',
    })
  }

  if (!openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error',
      message: 'OpenAI API key not configured',
    })
  }

  const body = await readBody<{ text?: string }>(event)
  const text = body?.text?.trim()
  if (!text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing text in body',
    })
  }

  // Normalize text for cache lookup
  const normalizedText = normalizePronunciationText(text)
  const textHash = await computePronunciationHash(normalizedText)

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  // @ts-ignore
  const r2Bucket = event.context.cloudflare?.env?.PRONUNCIATION_CACHE

  // Try cache first if DB and R2 are available
  if (db && r2Bucket) {
    try {
      const cacheEntry = await getCacheEntry(db, textHash)

      if (cacheEntry && cacheEntry.normalized_text === normalizedText) {
        // Cache hit - fetch from R2
        try {
          const audioObject = await r2Bucket.get(getR2Key(textHash))
          if (audioObject) {
            const audioData = await audioObject.arrayBuffer()

            // Update access stats
            await recordCacheHit(db, textHash)

            return new Response(audioData, {
              headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=31536000', // 1 year
              },
            })
          }
        } catch (r2Err) {
          console.error('Error fetching from R2 cache:', r2Err)
          // R2 fetch failed, but D1 entry exists - treat as miss and delete stale entry
          await db.prepare('DELETE FROM pronunciation_cache WHERE text_hash = ?').bind(textHash).run()
        }
      }
    } catch (dbErr) {
      console.error('Cache lookup error:', dbErr)
      // Continue to OpenAI on cache error
    }
  }

  // Cache miss - generate new audio
  // Replace יהוה (Tetragrammaton) with אדוני (Adonai) for correct pronunciation
  // This is transparent to the user - display text remains unchanged
  // Match Tetragrammaton with any Hebrew diacritics (niqqud) - Unicode range \u0591-\u05C7
  // Pattern: י (yod) + optional diacritics + ה (he) + optional diacritics + ו (vav) + optional diacritics + ה (he) + optional diacritics
  let textForTts = normalizedText.replace(/י[\u0591-\u05C7]*ה[\u0591-\u05C7]*ו[\u0591-\u05C7]*ה[\u0591-\u05C7]*/g, 'אדוני')
  
  // Replace אדוני with English transliteration "Adonai" for proper TTS pronunciation
  // This ensures the TTS pronounces it correctly as "Adonai" rather than phonetically reading the Hebrew
  textForTts = textForTts.replace(/אדוני/g, 'Adonai')

  try {
    const audio = await $fetch<ArrayBuffer>('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: {
        model: 'gpt-4o-mini-tts',
        // Use a deeper, more masculine voice for all pronunciations
        voice: 'onyx',
        input: textForTts,
        instructions:
          'Read the entire text in Hebrew as natural, fluent speech in a male-sounding voice. Do not skip, shorten, or summarize any words—pronounce every word in order. Use a slightly faster than normal conversational pace while remaining clear.',
      },
      responseType: 'arrayBuffer',
    })

    // Store in cache if DB and R2 are available
    if (db && r2Bucket) {
      try {
        const maxSizeBytes = getMaxCacheSizeBytes()
        await addToCache(db, r2Bucket, textHash, normalizedText, audio, maxSizeBytes)
        await recordCacheMiss(db)
      } catch (cacheErr) {
        console.error('Error storing in cache:', cacheErr)
        // Continue even if cache storage fails
      }
    }

    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000', // 1 year
      },
    })
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode ?? 500
    const data = (err as { data?: { error?: { message?: string } } })?.data
    const message = data?.error?.message ?? (err instanceof Error ? err.message : 'OpenAI TTS request failed')
    throw createError({
      statusCode: status >= 400 && status < 500 ? status : 502,
      statusMessage: status === 400 ? 'Bad Request' : 'Bad Gateway',
      message,
    })
  }
})
