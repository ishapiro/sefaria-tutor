export default defineEventHandler(async (event) => {
  const path = event.context.params?.path
  const pathStr = Array.isArray(path) ? path.join('/') : path || ''
  const query = getRequestURL(event).search
  const sefariaUrl = `https://www.sefaria.org/api/${pathStr}${query}`

  try {
    const response = await $fetch<unknown>(sefariaUrl, {
      method: event.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: 'Sefaria proxy error',
      data: { error: message },
    })
  }
})
