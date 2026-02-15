import type { TreeOccurrence } from './tree.get'
import { normalizeRootForSearch } from '~/server/utils/rootNormalize'

const SEFARIA_SEARCH_URL = 'https://www.sefaria.org/api/search-wrapper'
const USER_AGENT = 'SefariaTutor/0.1.0 (Cogitations; educational Torah study app; https://cogitations.com)'
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

interface SefariaHitSource {
  ref?: string
  path?: string
  categories?: string[]
  titleVariants?: string[]
  exact?: string
  naive_lemmatizer?: string
}

interface SefariaHit {
  _source?: SefariaHitSource
  highlight?: { naive_lemmatizer?: string[] }
}

interface SefariaSearchResponse {
  hits?: {
    total?: number
    hits?: SefariaHit[]
  }
}

function toDisplayRef (ref: string): string {
  if (!ref) return ref
  const parts = ref.split(/\s+/)
  if (parts.length >= 2) {
    const book = parts[0]
    const abbrev = book.length > 3 ? book.substring(0, 3) : book
    return `${abbrev} ${parts.slice(1).join(' ')}`
  }
  return ref
}

function toSefariaRefFormat (ref: string): string {
  if (!ref) return ref
  return ref.replace(/\s+/g, '_').replace(/:/g, '.')
}

export default defineEventHandler(async (event): Promise<{ occurrences: TreeOccurrence[]; total: number } | { error: string }> => {
  const query = getQuery(event)
  let rootParam = query.root as string | undefined
  if (rootParam != null && typeof rootParam === 'string' && rootParam.includes('%')) {
    try {
      rootParam = decodeURIComponent(rootParam)
    } catch {
      // leave as-is
    }
  }
  const bookPath = (query.book as string) || ''
  const offset = Math.max(0, parseInt(String(query.offset || 0), 10) || 0)
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(query.limit || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT))

  const normalizedLetters = normalizeRootForSearch(rootParam)
  if (!normalizedLetters) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or missing root',
      data: { error: 'Please provide a valid Hebrew root or word.' },
    })
  }

  const pathTrimmed = bookPath.trim()
  if (!pathTrimmed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or missing book',
      data: { error: 'Please provide a book path (e.g. Tanakh/Torah/Genesis).' },
    })
  }

  try {
    const body = {
      query: normalizedLetters,
      type: 'text',
      field: 'naive_lemmatizer',
      size: limit,
      start: offset,
      sort_method: 'score',
      filters: [pathTrimmed],
      filter_fields: ['path'],
      source_proj: true,
    }
    const response = await $fetch<SefariaSearchResponse>(SEFARIA_SEARCH_URL, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    })

    const hits = response?.hits?.hits ?? []
    const total = response?.hits?.total ?? 0

    const occurrences: TreeOccurrence[] = []
    for (const hit of hits) {
      const src = hit._source
      if (!src?.ref) continue
      const snippet = hit.highlight?.naive_lemmatizer?.[0] || src.exact || src.naive_lemmatizer
      const snippetTrim = typeof snippet === 'string' ? snippet.trim().slice(0, 120) : undefined
      occurrences.push({
        word: normalizedLetters,
        ref: toSefariaRefFormat(src.ref),
        displayRef: toDisplayRef(src.ref),
        snippet: snippetTrim,
      })
    }

    return { occurrences, total }
  } catch (err: unknown) {
    const e = err as { statusCode?: number; data?: { error?: string }; message?: string }
    console.error('[root-explorer/more] Sefaria search error:', e)
    throw createError({
      statusCode: e?.statusCode || 502,
      statusMessage: 'Load more failed',
      data: {
        error: (e?.data as { error?: string } | undefined)?.error || e?.message || 'Unable to load more. Please try again.',
      },
    })
  }
})
