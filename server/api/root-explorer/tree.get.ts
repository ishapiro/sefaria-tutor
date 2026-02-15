import { normalizeRootForSearch, toDisplayRoot } from '~/server/utils/rootNormalize'

const SEFARIA_SEARCH_URL = 'https://www.sefaria.org/api/search-wrapper'
/** Max hits requested from Sefaria — concordance-style; filter by path so results are in-scope. */
const SEARCH_SIZE = 500
/** Max branches (books/genres) returned — prevents unbounded list. */
const MAX_BRANCHES = 40
/** Max occurrences per branch (books) — prevents one book from dominating. */
const MAX_OCCURRENCES_PER_BRANCH = 50
/** When comparing by genres we have few branches (e.g. 3); use a higher cap so we show all hits. */
const MAX_OCCURRENCES_PER_BRANCH_GENRES = 200
const USER_AGENT = 'SefariaTutor/0.1.0 (Cogitations; educational Torah study app; https://cogitations.com)'

export interface TreeOccurrence {
  word: string
  translation?: string
  partOfSpeech?: string
  binyan?: string | null
  ref: string
  displayRef: string
  snippet?: string
}

export interface WordTreeBranch {
  key: string
  title: string
  heTitle?: string
  /** Sefaria path for this branch (e.g. Tanakh/Torah/Genesis). Set when scope is books; used for Load more. */
  bookPath?: string
  occurrences: TreeOccurrence[]
}

export interface WordTreeResponse {
  root: string
  rootMeaning?: string
  scope: 'books' | 'genres'
  branches: WordTreeBranch[]
}

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

/**
 * Filter a path (e.g. "Tanakh/Torah/Genesis") by scopeValue.
 * scopeValue is the corpus/category to include: "Tanakh", "Torah", "Nevi'im", "Ketuvim", "Talmud".
 * (Compare by books vs genres only affects grouping, not which paths we include.)
 */
function pathMatchesScopeValue (path: string, scopeValue: string): boolean {
  if (!path) return false
  const top = path.split('/')[0] || ''
  if (scopeValue === 'Tanakh') return top === 'Tanakh'
  if (scopeValue === 'Torah') return path.startsWith('Tanakh/Torah')
  if (scopeValue === "Nevi'im" || scopeValue === 'Neviim') return path.startsWith('Tanakh/Prophets')
  if (scopeValue === 'Ketuvim') return path.startsWith('Tanakh/Writings')
  if (scopeValue === 'Talmud') return top === 'Talmud'
  return top === scopeValue
}

/**
 * Derive short display ref (e.g. "Lev 19:2") from Sefaria ref (e.g. "Leviticus 19:2").
 */
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

/**
 * Convert Sefaria ref to format app expects for navigation (e.g. "Leviticus_19.2").
 */
function toSefariaRefFormat (ref: string): string {
  if (!ref) return ref
  return ref.replace(/\s+/g, '_').replace(/:/g, '.')
}

/**
 * Path prefix(es) for Sefaria search-wrapper filters (path field).
 * Restricts results to the selected corpus so we get concordance-style hits, not mixed commentary/dictionary.
 * Sefaria path filters match documents whose path starts with the filter string (e.g. "Tanakh/Torah" matches Genesis, Exodus, …).
 * When bookPath is provided (e.g. "Tanakh/Torah/Genesis"), returns a single filter for that book.
 */
function pathFiltersForScope (scopeValue: string, bookPath?: string | null): string[] {
  if (bookPath && bookPath.trim()) return [bookPath.trim()]
  if (!scopeValue) return ['Tanakh/Torah', 'Tanakh/Prophets', 'Tanakh/Writings']
  if (scopeValue === 'Tanakh') return ['Tanakh/Torah', 'Tanakh/Prophets', 'Tanakh/Writings']
  if (scopeValue === 'Torah') return ['Tanakh/Torah']
  if (scopeValue === "Nevi'im" || scopeValue === 'Neviim') return ['Tanakh/Prophets']
  if (scopeValue === 'Ketuvim') return ['Tanakh/Writings']
  if (scopeValue === 'Talmud') return ['Talmud']
  return [scopeValue]
}

export default defineEventHandler(async (event): Promise<WordTreeResponse | { error: string }> => {
  const query = getQuery(event)
  let rootParam = query.root as string | undefined
  if (rootParam != null && typeof rootParam === 'string' && rootParam.includes('%')) {
    try {
      rootParam = decodeURIComponent(rootParam)
    } catch {
      // leave as-is
    }
  }
  const scope = (query.scope as string) || 'genres'
  const scopeValue = (query.scopeValue as string) || 'Tanakh'
  const bookPath = (query.book as string) || undefined

  const normalizedLetters = normalizeRootForSearch(rootParam)
  if (!normalizedLetters) {
    console.warn('[root-explorer] Invalid or missing root:', {
      rootParamType: typeof rootParam,
      rootParamLength: rootParam?.length ?? 0,
      rootParamSample: rootParam != null ? JSON.stringify(rootParam.slice(0, 20)) : null,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or missing root',
      data: {
        error: 'Please provide a valid Hebrew root (shoresh). Roots are 2–4 letters and apply to both verbs and nouns (e.g. ק־ד־שׁ or K-D-Sh).',
      },
    })
  }

  const displayRoot = toDisplayRoot(normalizedLetters)
  const scopeType: 'books' | 'genres' = scope === 'books' ? 'books' : 'genres'
  const scopeValues = Array.isArray(query.scopeValue)
    ? (query.scopeValue as string[])
    : scopeValue
      ? [scopeValue]
      : ['Tanakh']

  try {
    const pathFilters = pathFiltersForScope(scopeValue, bookPath)
    const body = {
      query: normalizedLetters,
      type: 'text',
      field: 'naive_lemmatizer',
      size: SEARCH_SIZE,
      sort_method: 'score',
      // Restrict to scope (e.g. Tanakh) so we get concordance-style results, not commentary/dictionary.
      // See Sefaria Search API v2: for type "text", filters apply to the path field.
      filters: pathFilters,
      filter_fields: pathFilters.map(() => 'path' as const),
      // Required: by default the wrapper does NOT return _source (path, ref, categories).
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
    const debug = (query.debug as string) === '1' || (query.debug as string) === 'true'
    const branchMap = new Map<string, TreeOccurrence[]>()
    const branchTitles = new Map<string, { title: string; heTitle?: string }>()
    const branchPaths = new Map<string, string>()

    /** Build path from categories when _source.path is missing (e.g. some Sefaria indices). */
    function getPath (src: SefariaHitSource): string | null {
      if (src.path) return src.path
      const cats = src.categories
      if (Array.isArray(cats) && cats.length > 0) return cats.join('/')
      return null
    }

    const totalHitsFromSefaria = response?.hits?.total ?? hits.length
    const debugPathsMatched: string[] = []
    const debugPathsSkipped: string[] = []
    for (const hit of hits) {
      const src = hit._source
      if (!src?.ref) continue
      const path = getPath(src)
      if (!path) continue
      const matchesScope = scopeValues.some(sv => pathMatchesScopeValue(path, sv))
      if (debug) {
        if (matchesScope) {
          if (!debugPathsMatched.includes(path)) debugPathsMatched.push(path)
        } else {
          if (debugPathsSkipped.length < 30 && !debugPathsSkipped.includes(path)) debugPathsSkipped.push(path)
        }
      }
      if (!matchesScope) continue

      let branchKey: string
      if (scopeType === 'genres') {
        const segments = path.split('/')
        if (scopeValue === 'Tanakh' && segments[0] === 'Tanakh') {
          branchKey = segments[1] || 'Tanakh'
          if (branchKey === 'Torah') branchKey = 'Torah'
          else if (branchKey === 'Prophets') branchKey = "Nevi'im"
          else if (branchKey === 'Writings') branchKey = 'Ketuvim'
        } else {
          branchKey = segments[segments.length - 1] || path
        }
      } else {
        branchKey = path.split('/').pop() || path
      }

      const titleVariants = src.titleVariants || []
      const title = scopeType === 'genres' ? branchKey : (titleVariants[0] || branchKey)
      if (!branchTitles.has(branchKey)) {
        branchTitles.set(branchKey, { title })
      }
      if (!branchPaths.has(branchKey)) {
        branchPaths.set(branchKey, path)
      }
      const snippet = hit.highlight?.naive_lemmatizer?.[0] || src.exact || src.naive_lemmatizer
      const snippetTrim = typeof snippet === 'string' ? snippet.trim().slice(0, 120) : undefined
      const occurrence: TreeOccurrence = {
        word: normalizedLetters,
        ref: toSefariaRefFormat(src.ref),
        displayRef: toDisplayRef(src.ref),
        snippet: snippetTrim,
      }
      const list = branchMap.get(branchKey) || []
      list.push(occurrence)
      branchMap.set(branchKey, list)
    }

    const branches: WordTreeBranch[] = []
    const entries = Array.from(branchMap.entries())
    const cappedEntries = entries.slice(0, MAX_BRANCHES)
    const perBranchCap = scopeType === 'genres' ? MAX_OCCURRENCES_PER_BRANCH_GENRES : MAX_OCCURRENCES_PER_BRANCH
    for (const [key, occurrences] of cappedEntries) {
      const meta = branchTitles.get(key) || { title: key }
      branches.push({
        key,
        title: meta.title,
        heTitle: meta.heTitle,
        bookPath: scopeType === 'books' ? (branchPaths.get(key) ?? undefined) : undefined,
        occurrences: occurrences.slice(0, perBranchCap),
      })
    }
    branches.sort((a, b) => a.title.localeCompare(b.title))

    const payload: WordTreeResponse & { _debug?: Record<string, unknown> } = {
      root: displayRoot,
      scope: scopeType,
      branches,
    }
    if (debug) {
      const first = hits[0]?._source
      const allPaths = [...new Set(hits.map(h => getPath(h._source || {})).filter(Boolean))]
      payload._debug = {
        normalizedRoot: normalizedLetters,
        scopeValue,
        scopeType,
        pathFiltersSent: pathFilters,
        sefariaTotalHits: totalHitsFromSefaria,
        sefariaHitsReturned: hits.length,
        scopeFilterNote: 'Search is restricted by path filters (concordance-style). pathsSeen = paths in this result set.',
        pathsSeen: allPaths.slice(0, 25),
        pathsMatchingScope: debugPathsMatched,
        pathsSkippedByScopeSample: debugPathsSkipped.slice(0, 15),
        branchesCount: branches.length,
        totalOccurrences: branches.reduce((sum, b) => sum + b.occurrences.length, 0),
        firstHitKeys: first ? Object.keys(first) : [],
        firstHitPath: first?.path ?? null,
        firstHitCategories: first?.categories ?? null,
        firstHitRef: first?.ref ?? null,
      }
    }
    console.log('[root-explorer]', {
      root: normalizedLetters,
      scopeValue,
      scopeType,
      sefariaTotal: totalHitsFromSefaria,
      hitsAfterFilter: branches.reduce((s, b) => s + b.occurrences.length, 0),
      branchesCount: branches.length,
    })
    return payload
  } catch (err: unknown) {
    const e = err as { statusCode?: number; data?: { error?: string }; message?: string }
    console.error('[root-explorer] Sefaria search error:', e)
    throw createError({
      statusCode: e?.statusCode || 502,
      statusMessage: 'Search failed',
      data: {
        error: (e?.data as { error?: string } | undefined)?.error || e?.message || 'Unable to load word tree. Please try again.',
      },
    })
  }
})
