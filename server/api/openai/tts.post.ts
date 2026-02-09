import { createError, defineEventHandler, getHeader, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'

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

  // Replace יהוה (Tetragrammaton) with אדוני (Adonai) for correct pronunciation
  // This is transparent to the user - display text remains unchanged
  // Match Tetragrammaton with any Hebrew diacritics (niqqud) - Unicode range \u0591-\u05C7
  // Pattern: י (yod) + optional diacritics + ה (he) + optional diacritics + ו (vav) + optional diacritics + ה (he) + optional diacritics
  let textForTts = text.replace(/י[\u0591-\u05C7]*ה[\u0591-\u05C7]*ו[\u0591-\u05C7]*ה[\u0591-\u05C7]*/g, 'אדוני')
  
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
        voice: 'alloy',
        input: textForTts,
        instructions: 'Pronounce this word in Hebrew. Speak clearly and naturally.',
      },
      responseType: 'arrayBuffer',
    })

    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
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
