export default defineEventHandler(async (event): Promise<unknown> => {
  const path = event.context.params?.path
  const pathStr = Array.isArray(path) ? path.join('/') : path || ''
  const query = getRequestURL(event).search
  const sefariaUrl = `https://www.sefaria.org/api/${pathStr}${query}`

  try {
    const response: unknown = await $fetch(sefariaUrl, {
      method: event.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    return response
  } catch (err: unknown) {
    const e = err as { statusCode?: number; data?: unknown; message?: string }
    const statusCode = typeof e?.statusCode === 'number' ? e.statusCode : 500
    const dataError = e?.data && typeof e.data === 'object' && 'error' in e.data ? (e.data as { error?: string }).error : undefined
    const message = dataError ?? e?.message ?? 'Unknown error'
    throw createError({
      statusCode,
      statusMessage: 'Sefaria proxy error',
      data: { error: String(message) },
    })
  }
})
