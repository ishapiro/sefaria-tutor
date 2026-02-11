export default defineEventHandler(async (event): Promise<unknown> => {
  const path = event.context.params?.path
  const pathStr = Array.isArray(path) ? path.join('/') : path || ''
  const query = getRequestURL(event).search
  const sefariaUrl = `https://www.sefaria.org/api/${pathStr}${query}`

  // Log request details for debugging
  const userAgent = getHeader(event, 'user-agent') || 'unknown'
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
  const isChrome = /chrome/i.test(userAgent) && !/edg/i.test(userAgent)
  
  const requestInfo = {
    path: pathStr,
    method: event.method,
    url: sefariaUrl,
    userAgent,
    isSafari,
    isChrome,
    timestamp: new Date().toISOString(),
    headers: {
      'accept': getHeader(event, 'accept'),
      'accept-language': getHeader(event, 'accept-language'),
      'referer': getHeader(event, 'referer'),
    },
  }
  
  console.log('[Sefaria API] Request:', requestInfo)

  try {
    const startTime = Date.now()
    const sefariaUserAgent = 'SefariaTutor/0.1.0 (Cogitations; educational Torah study app; https://cogitations.com)'
    const response: unknown = await $fetch(sefariaUrl, {
      method: event.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': sefariaUserAgent, // Descriptive User-Agent per Sefaria's request for usage tracking
      },
    })
    const duration = Date.now() - startTime
    console.log(`[Sefaria API] Success: ${pathStr} (${duration}ms)`)
    return response
  } catch (err: unknown) {
    const e = err as { statusCode?: number; status?: number; statusText?: string; data?: unknown; message?: string; cause?: unknown }
    const statusCode = typeof e?.statusCode === 'number' ? e.statusCode : (typeof e?.status === 'number' ? e.status : 500)
    const dataError = e?.data && typeof e.data === 'object' && 'error' in e.data ? (e.data as { error?: string }).error : undefined
    const message = dataError ?? e?.message ?? 'Unknown error'
    
    // Enhanced error logging
    const errorLog = {
      ...requestInfo,
      error: {
        statusCode,
        statusText: e?.statusText,
        message: String(message),
        data: e?.data,
        cause: e?.cause,
        stack: err instanceof Error ? err.stack : undefined,
      },
    }
    console.error('[Sefaria API] Error:', errorLog)
    
    throw createError({
      statusCode,
      statusMessage: 'Sefaria proxy error',
      data: { error: String(message) },
    })
  }
})
