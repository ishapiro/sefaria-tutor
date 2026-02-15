<template>
  <div class="container mx-auto p-4 max-w-4xl">
    <div class="mb-6">
      <NuxtLink
        to="/"
        class="text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        ← Back to Word Explorer
      </NuxtLink>
    </div>
    <h1 class="text-2xl font-bold text-gray-900 mb-2">
      Concordance Word Explorer
    </h1>
    <p class="text-gray-600 text-sm mb-6">
      See every occurrence of a Hebrew root (shoresh) in the text—like a concordance—across books or genres. Roots apply to both verbs and nouns (e.g. ק־ד־שׁ or K-D-Sh). Enter a root and choose scope.
    </p>

    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <label for="root-input" class="text-sm font-medium text-gray-700">Root (shoresh):</label>
        <input
          id="root-input"
          v-model="rootInput"
          type="text"
          class="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg text-lg"
          style="direction: rtl"
          placeholder="ק־ד־שׁ or K-D-Sh"
          @keydown.enter="buildTree"
        />
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          :disabled="!rootInput.trim() || loading"
          @click="buildTree"
        >
          {{ loading ? 'Loading…' : 'Build Tree' }}
        </button>
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          :disabled="!rootInput.trim() || loading"
          title="Build tree and include debug info (for pasting here)"
          @click="buildTreeWithDebug"
        >
          Debug
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <span class="font-medium text-gray-700">Compare by:</span>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input v-model="scope" type="radio" value="genres" class="rounded" />
          Genres
        </label>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input v-model="scope" type="radio" value="books" class="rounded" />
          Books
        </label>
        <label class="inline-flex items-center gap-2">
          <span class="text-gray-600">Scope:</span>
          <select
            v-model="scopeValue"
            class="px-2 py-1 border border-gray-300 rounded"
          >
            <option value="Tanakh">Tanakh</option>
            <option value="Torah">Torah</option>
            <option value="Nevi'im">Nevi'im</option>
            <option value="Ketuvim">Ketuvim</option>
            <option value="Talmud">Talmud</option>
          </select>
        </label>
        <label v-if="scope === 'books'" class="inline-flex items-center gap-2">
          <span class="text-gray-600">Book:</span>
          <select
            v-model="selectedBookPath"
            class="px-2 py-1 border border-gray-300 rounded min-w-[140px]"
          >
            <option value="">All books</option>
            <option
              v-for="b in scopeBooks"
              :key="b.path"
              :value="b.path"
            >
              {{ b.title }}
            </option>
          </select>
        </label>
        <label class="inline-flex items-center gap-2 text-gray-500">
          <input v-model="showDebug" type="checkbox" class="rounded" />
          Include debug
        </label>
      </div>
    </div>

    <div v-if="error" class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
      {{ error }}
    </div>
    <div v-if="emptyMessage" class="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
      {{ emptyMessage }}
    </div>

    <div v-if="tree" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <span class="text-xl font-semibold" style="direction: rtl">{{ tree.root }}</span>
        <span v-if="rootMeaningFetched" class="text-gray-600 ml-2">({{ rootMeaningFetched }})</span>
        <span v-else-if="rootMeaningLoading" class="text-gray-400 ml-2 text-sm">(loading meaning…)</span>
      </div>
      <div class="divide-y divide-gray-100">
        <div
          v-for="branch in tree.branches"
          :key="branch.key"
          class=""
        >
          <button
            type="button"
            class="w-full px-4 py-3 flex items-center justify-between text-left font-medium text-gray-900 hover:bg-gray-50"
            @click="toggleBranch(branch.key)"
          >
            <span>{{ branch.title }}</span>
            <span class="text-gray-500 text-sm">{{ branch.occurrences.length }} occurrence{{ branch.occurrences.length === 1 ? '' : 's' }}</span>
            <span class="text-gray-400">{{ expandedBranches.has(branch.key) ? '▼' : '▶' }}</span>
          </button>
          <div v-show="expandedBranches.has(branch.key)" class="px-4 pb-3">
            <ul class="space-y-2">
              <li
                v-for="(occ, idx) in visibleOccurrences(branch)"
                :key="idx"
                class="flex flex-wrap items-baseline gap-2 text-sm"
              >
                <span v-if="occ.word" class="font-medium" style="direction: rtl">{{ occ.word }}</span>
                <NuxtLink
                  :to="openInTextLink(occ)"
                  class="text-blue-600 hover:underline"
                >
                  {{ occ.displayRef }}
                </NuxtLink>
                <span
                  v-if="occ.snippet"
                  class="text-gray-500 truncate max-w-[200px] sm:max-w-none inline"
                  :title="stripSnippetHtml(occ.snippet)"
                  v-html="sanitizeSnippetHtml(occ.snippet)"
                ></span>
              </li>
            </ul>
            <div v-if="hiddenCount(branch) > 0" class="mt-2">
              <button
                type="button"
                class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                @click="showMoreForBranch(branch.key)"
              >
                More ({{ hiddenCount(branch) }} more)
              </button>
            </div>
            <div v-else-if="canLoadMoreForBranch(branch)" class="mt-2">
              <button
                type="button"
                class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                :disabled="loadMoreBranchKey === branch.key"
                @click="loadMoreForBranch(branch)"
              >
                {{ loadMoreBranchKey === branch.key ? 'Loading…' : 'Load more' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Debug info (when ?debug=1 or "Include debug" or Debug button used) -->
    <div
      v-if="tree?._debug"
      class="mt-6 p-4 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono overflow-auto"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="font-semibold text-gray-700">Debug info</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium border border-gray-400 rounded bg-white hover:bg-gray-200 text-gray-700"
            @click="copyDebugInfo"
          >
            {{ copyDebugStatus === 'copied' ? 'Copied!' : 'Copy debug' }}
          </button>
          <button
            type="button"
            class="text-xs text-blue-600 hover:underline"
            @click="showDebugInfo = !showDebugInfo"
          >
            {{ showDebugInfo ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      <pre v-show="showDebugInfo" class="whitespace-pre-wrap break-words">{{ debugJson }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TreeOccurrence {
  word: string
  translation?: string
  ref: string
  displayRef: string
  snippet?: string
}
interface WordTreeBranch {
  key: string
  title: string
  heTitle?: string
  bookPath?: string
  occurrences: TreeOccurrence[]
}
interface WordTreeResponse {
  root: string
  rootMeaning?: string
  scope: 'books' | 'genres'
  branches: WordTreeBranch[]
  _debug?: {
    normalizedRoot?: string
    scopeValue?: string
    scopeType?: string
    sefariaTotalHits?: number
    sefariaHitsReturned?: number
    pathsSeen?: string[]
    branchesCount?: number
    totalOccurrences?: number
  }
}

/** Max occurrences shown per branch in the UI — keeps the tree from growing forever. */
const MAX_OCCURRENCES_DISPLAY = 20

/** Books per scope for sub-filter when Compare by: Books. Paths match Sefaria index (e.g. Tanakh/Torah/Genesis). */
const SCOPE_BOOKS: Record<string, Array<{ title: string; path: string }>> = {
  Tanakh: [
    { title: 'Genesis', path: 'Tanakh/Torah/Genesis' },
    { title: 'Exodus', path: 'Tanakh/Torah/Exodus' },
    { title: 'Leviticus', path: 'Tanakh/Torah/Leviticus' },
    { title: 'Numbers', path: 'Tanakh/Torah/Numbers' },
    { title: 'Deuteronomy', path: 'Tanakh/Torah/Deuteronomy' },
    { title: 'Joshua', path: 'Tanakh/Prophets/Joshua' },
    { title: 'Judges', path: 'Tanakh/Prophets/Judges' },
    { title: 'I Samuel', path: 'Tanakh/Prophets/I Samuel' },
    { title: 'II Samuel', path: 'Tanakh/Prophets/II Samuel' },
    { title: 'I Kings', path: 'Tanakh/Prophets/I Kings' },
    { title: 'II Kings', path: 'Tanakh/Prophets/II Kings' },
    { title: 'Isaiah', path: 'Tanakh/Prophets/Isaiah' },
    { title: 'Jeremiah', path: 'Tanakh/Prophets/Jeremiah' },
    { title: 'Ezekiel', path: 'Tanakh/Prophets/Ezekiel' },
    { title: 'Hosea', path: 'Tanakh/Prophets/Hosea' },
    { title: 'Joel', path: 'Tanakh/Prophets/Joel' },
    { title: 'Amos', path: 'Tanakh/Prophets/Amos' },
    { title: 'Obadiah', path: 'Tanakh/Prophets/Obadiah' },
    { title: 'Jonah', path: 'Tanakh/Prophets/Jonah' },
    { title: 'Micah', path: 'Tanakh/Prophets/Micah' },
    { title: 'Nahum', path: 'Tanakh/Prophets/Nahum' },
    { title: 'Habakkuk', path: 'Tanakh/Prophets/Habakkuk' },
    { title: 'Zephaniah', path: 'Tanakh/Prophets/Zephaniah' },
    { title: 'Haggai', path: 'Tanakh/Prophets/Haggai' },
    { title: 'Zechariah', path: 'Tanakh/Prophets/Zechariah' },
    { title: 'Malachi', path: 'Tanakh/Prophets/Malachi' },
    { title: 'Psalms', path: 'Tanakh/Writings/Psalms' },
    { title: 'Proverbs', path: 'Tanakh/Writings/Proverbs' },
    { title: 'Job', path: 'Tanakh/Writings/Job' },
    { title: 'Song of Songs', path: 'Tanakh/Writings/Song of Songs' },
    { title: 'Ruth', path: 'Tanakh/Writings/Ruth' },
    { title: 'Lamentations', path: 'Tanakh/Writings/Lamentations' },
    { title: 'Ecclesiastes', path: 'Tanakh/Writings/Ecclesiastes' },
    { title: 'Esther', path: 'Tanakh/Writings/Esther' },
    { title: 'Daniel', path: 'Tanakh/Writings/Daniel' },
    { title: 'Ezra', path: 'Tanakh/Writings/Ezra' },
    { title: 'Nehemiah', path: 'Tanakh/Writings/Nehemiah' },
    { title: 'I Chronicles', path: 'Tanakh/Writings/I Chronicles' },
    { title: 'II Chronicles', path: 'Tanakh/Writings/II Chronicles' },
  ],
  Torah: [
    { title: 'Genesis', path: 'Tanakh/Torah/Genesis' },
    { title: 'Exodus', path: 'Tanakh/Torah/Exodus' },
    { title: 'Leviticus', path: 'Tanakh/Torah/Leviticus' },
    { title: 'Numbers', path: 'Tanakh/Torah/Numbers' },
    { title: 'Deuteronomy', path: 'Tanakh/Torah/Deuteronomy' },
  ],
  "Nevi'im": [
    { title: 'Joshua', path: 'Tanakh/Prophets/Joshua' },
    { title: 'Judges', path: 'Tanakh/Prophets/Judges' },
    { title: 'I Samuel', path: 'Tanakh/Prophets/I Samuel' },
    { title: 'II Samuel', path: 'Tanakh/Prophets/II Samuel' },
    { title: 'I Kings', path: 'Tanakh/Prophets/I Kings' },
    { title: 'II Kings', path: 'Tanakh/Prophets/II Kings' },
    { title: 'Isaiah', path: 'Tanakh/Prophets/Isaiah' },
    { title: 'Jeremiah', path: 'Tanakh/Prophets/Jeremiah' },
    { title: 'Ezekiel', path: 'Tanakh/Prophets/Ezekiel' },
    { title: 'Hosea', path: 'Tanakh/Prophets/Hosea' },
    { title: 'Joel', path: 'Tanakh/Prophets/Joel' },
    { title: 'Amos', path: 'Tanakh/Prophets/Amos' },
    { title: 'Obadiah', path: 'Tanakh/Prophets/Obadiah' },
    { title: 'Jonah', path: 'Tanakh/Prophets/Jonah' },
    { title: 'Micah', path: 'Tanakh/Prophets/Micah' },
    { title: 'Nahum', path: 'Tanakh/Prophets/Nahum' },
    { title: 'Habakkuk', path: 'Tanakh/Prophets/Habakkuk' },
    { title: 'Zephaniah', path: 'Tanakh/Prophets/Zephaniah' },
    { title: 'Haggai', path: 'Tanakh/Prophets/Haggai' },
    { title: 'Zechariah', path: 'Tanakh/Prophets/Zechariah' },
    { title: 'Malachi', path: 'Tanakh/Prophets/Malachi' },
  ],
  Ketuvim: [
    { title: 'Psalms', path: 'Tanakh/Writings/Psalms' },
    { title: 'Proverbs', path: 'Tanakh/Writings/Proverbs' },
    { title: 'Job', path: 'Tanakh/Writings/Job' },
    { title: 'Song of Songs', path: 'Tanakh/Writings/Song of Songs' },
    { title: 'Ruth', path: 'Tanakh/Writings/Ruth' },
    { title: 'Lamentations', path: 'Tanakh/Writings/Lamentations' },
    { title: 'Ecclesiastes', path: 'Tanakh/Writings/Ecclesiastes' },
    { title: 'Esther', path: 'Tanakh/Writings/Esther' },
    { title: 'Daniel', path: 'Tanakh/Writings/Daniel' },
    { title: 'Ezra', path: 'Tanakh/Writings/Ezra' },
    { title: 'Nehemiah', path: 'Tanakh/Writings/Nehemiah' },
    { title: 'I Chronicles', path: 'Tanakh/Writings/I Chronicles' },
    { title: 'II Chronicles', path: 'Tanakh/Writings/II Chronicles' },
  ],
  Talmud: [], // Book sub-filter not populated for Talmud; user can use scope only.
}

const route = useRoute()
const rootInput = ref('')
const scope = ref<'books' | 'genres'>('genres')
const scopeValue = ref('Tanakh')
const selectedBookPath = ref('')

const scopeBooks = computed(() => SCOPE_BOOKS[scopeValue.value] ?? [])

watch(scopeValue, () => { selectedBookPath.value = '' })
const loading = ref(false)
const tree = ref<WordTreeResponse | null>(null)
const error = ref('')
const emptyMessage = ref('')
const expandedBranches = ref<Set<string>>(new Set())
/** Per-branch: how many occurrences to show (default MAX_OCCURRENCES_DISPLAY). "More" increases this. */
const branchDisplayLimit = ref<Record<string, number>>({})
/** Per-branch: total count from API (set when Load more returns). Used to show/hide Load more. */
const branchTotal = ref<Record<string, number>>({})
/** Branch key currently loading more (for Loading… state). */
const loadMoreBranchKey = ref<string | null>(null)
const rootMeaningFetched = ref<string | null>(null)
const rootMeaningLoading = ref(false)
const showDebug = ref(false)
const showDebugInfo = ref(true)
const copyDebugStatus = ref<'idle' | 'copied'>('idle')

function getDisplayLimit (branchKey: string): number {
  const n = branchDisplayLimit.value[branchKey]
  return n != null ? n : MAX_OCCURRENCES_DISPLAY
}

function visibleOccurrences (branch: WordTreeBranch): TreeOccurrence[] {
  const limit = getDisplayLimit(branch.key)
  return branch.occurrences.slice(0, limit)
}

function hiddenCount (branch: WordTreeBranch): number {
  const limit = getDisplayLimit(branch.key)
  return Math.max(0, branch.occurrences.length - limit)
}

function showMoreForBranch (branchKey: string) {
  const branch = tree.value?.branches.find(b => b.key === branchKey)
  if (!branch) return
  branchDisplayLimit.value = { ...branchDisplayLimit.value, [branchKey]: branch.occurrences.length }
}

/** True when this branch has bookPath and we have (or might have) more on the server. */
function canLoadMoreForBranch (branch: WordTreeBranch): boolean {
  if (!branch.bookPath) return false
  const total = branchTotal.value[branch.key]
  if (total != null) return branch.occurrences.length < total
  return branch.occurrences.length >= 50
}

async function loadMoreForBranch (branch: WordTreeBranch) {
  if (!branch.bookPath || !tree.value?.root) return
  loadMoreBranchKey.value = branch.key
  try {
    const q = new URLSearchParams({
      root: tree.value.root,
      book: branch.bookPath,
      offset: String(branch.occurrences.length),
      limit: '50',
    })
    const data = await $fetch<{ occurrences: TreeOccurrence[]; total: number } | { error: string }>(`/api/root-explorer/more?${q}`)
    if (data && 'error' in data) return
    const res = data as { occurrences: TreeOccurrence[]; total: number }
    branchTotal.value = { ...branchTotal.value, [branch.key]: res.total }
    branch.occurrences.push(...res.occurrences)
    branchDisplayLimit.value = { ...branchDisplayLimit.value, [branch.key]: branch.occurrences.length }
  } finally {
    loadMoreBranchKey.value = null
  }
}

function toggleBranch (key: string) {
  const next = new Set(expandedBranches.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedBranches.value = next
}

function openInTextLink (occ: TreeOccurrence): { path: string; query: { navigateRef?: string; highlightWord?: string } } {
  const query: { navigateRef: string; highlightWord?: string } = { navigateRef: occ.ref }
  if (occ.word?.trim()) query.highlightWord = occ.word.trim()
  return {
    path: '/',
    query,
  }
}

/** Strip all HTML from snippet for title/plain text. */
function stripSnippetHtml (s: string): string {
  return s.replace(/<b\/>/gi, '').replace(/<[^>]*>/g, '').trim()
}

/** Allow only Sefaria highlight tags (<b>, </b>, <b/>) so v-html renders bold; remove any other tags. */
function sanitizeSnippetHtml (s: string): string {
  return s
    .replace(/<b\/>/gi, '</b>')
    .replace(/<(?!\/?b\s*>)[^>]*>/gi, '')
}

const debugJson = computed(() =>
  tree.value?._debug ? JSON.stringify(tree.value._debug, null, 2) : ''
)

async function copyDebugInfo () {
  if (!debugJson.value) return
  try {
    await navigator.clipboard.writeText(debugJson.value)
    copyDebugStatus.value = 'copied'
    setTimeout(() => { copyDebugStatus.value = 'idle' }, 2000)
  } catch {
    copyDebugStatus.value = 'idle'
  }
}

async function fetchRootMeaning (root: string) {
  if (!root?.trim()) return
  rootMeaningLoading.value = true
  try {
    const q = new URLSearchParams({ root: root.trim() })
    const data = await $fetch<{ meaning?: string; error?: string }>(`/api/root-explorer/meaning?${q}`)
    if (data?.meaning) rootMeaningFetched.value = data.meaning
  } catch {
    // Leave rootMeaningFetched null; user still has the tree
  } finally {
    rootMeaningLoading.value = false
  }
}

function buildTreeWithDebug () {
  showDebug.value = true
  buildTree()
}

async function buildTree () {
  const root = rootInput.value.trim()
  if (!root) {
    error.value = 'Enter a root (shoresh) first. Roots work for both verbs and nouns.'
    return
  }
  loading.value = true
  error.value = ''
  emptyMessage.value = ''
  tree.value = null
  rootMeaningFetched.value = null
  branchDisplayLimit.value = {}
  branchTotal.value = {}
  try {
    const q = new URLSearchParams({
      root,
      scope: scope.value,
      scopeValue: scopeValue.value,
    })
    if (scope.value === 'books' && selectedBookPath.value?.trim()) {
      q.set('book', selectedBookPath.value.trim())
    }
    if (showDebug.value) q.set('debug', '1')
    const data = await $fetch<WordTreeResponse | { error: string }>(`/api/root-explorer/tree?${q}`)
    if (data && 'error' in data) {
      error.value = data.error
      return
    }
    tree.value = data as WordTreeResponse
    if (tree.value.branches.length === 0) {
      emptyMessage.value = 'No occurrences found for this root in the selected scope. Try a different root or scope.'
    } else {
      expandedBranches.value = new Set(tree.value.branches.slice(0, 5).map(b => b.key))
    }
    fetchRootMeaning(tree.value.root)
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string }
    error.value = err?.data?.error || err?.message || 'Failed to load concordance.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const rootFromQuery = route.query.root as string | undefined
  if (rootFromQuery) {
    rootInput.value = decodeURIComponent(rootFromQuery)
  }
  const debugParam = route.query.debug as string | undefined
  if (debugParam === '1' || debugParam === 'true') {
    showDebug.value = true
  }
  if (rootInput.value.trim()) {
    buildTree()
  }
})
</script>
