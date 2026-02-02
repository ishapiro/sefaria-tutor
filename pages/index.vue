<template>
  <div class="container mx-auto p-4 relative">
    <!-- API loading spinner overlay -->
    <div
      v-if="apiLoading"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 pointer-events-auto"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <span class="text-gray-700 font-medium">{{ apiLoadingMessage }}</span>
      </div>
    </div>
    <h1 class="text-2xl font-bold mb-4">
      Safaria Word Explorer provided by Cogitations
      <span class="pl-2 text-base font-normal text-gray-600">(Using OpenAI Model: {{ openaiModel }})</span>
    </h1>

    <!-- Loading index -->
    <div v-if="loading && (!categories || categories.length === 0)" class="flex justify-center items-center py-12">
      <span class="text-gray-500">Loading categories…</span>
    </div>

    <!-- Book list -->
    <div v-else-if="!selectedBook" class="mb-4">
      <div class="flex items-center gap-4 mb-4 flex-wrap">
        <span class="relative flex-grow min-w-[200px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search books..."
            class="w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </span>
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 whitespace-nowrap"
          :disabled="loading"
          @click="refreshIndex"
        >
          Refresh Index
        </button>
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 whitespace-nowrap"
          @click="showHelpDialog = true"
        >
          Help
        </button>
      </div>
      <CategoryAccordion
        :categories="filteredCategories"
        :loading="loading"
        @book-select="(e) => onBookSelect({ data: e.data as CategoryNode })"
        @tab-open="(cat) => onCategoryExpand(cat as CategoryNode)"
      />
      <!-- Category error: please select a book -->
      <div
        v-if="showCategoryDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showCategoryDialog = false"
      >
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
          <p class="font-semibold text-gray-800 mb-2">Please select a book, not a category.</p>
          <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" @click="showCategoryDialog = false">OK</button>
        </div>
      </div>
      <!-- API error -->
      <div
        v-if="showErrorDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showErrorDialog = false"
      >
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
          <p class="font-semibold text-gray-800 mb-2">{{ errorMessage }}</p>
          <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" @click="showErrorDialog = false">OK</button>
        </div>
      </div>
      <!-- Help dialog -->
      <div
        v-if="showHelpDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
        @click.self="showHelpDialog = false"
      >
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-lg mx-4 text-left">
          <h2 class="text-xl font-bold mb-4">Cogitations Sefaria Tutor Help</h2>
          <p class="mb-4">Choose a category (e.g. Tanakh), then select a book. Select Hebrew text in the reader to get word-by-word translation and grammar notes.</p>
          <p class="text-gray-600 text-sm">Source texts: <a href="https://www.sefaria.org/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Sefaria</a>.</p>
          <button type="button" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" @click="showHelpDialog = false">Close</button>
        </div>
      </div>
    </div>

    <!-- Book reader (Step 3: minimal – Step 4 will add pagination and complex books) -->
    <div v-else class="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div class="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
        <span class="font-semibold">{{ selectedBook?.title }}{{ totalRecords > 0 && currentChapter ? ` (${currentChapter})` : '' }}</span>
        <button type="button" class="text-blue-600 hover:underline" @click="handleCloseBook">← Back</button>
      </div>
      <div class="p-4">
        <div v-if="loading" class="text-center py-8 text-gray-500">Loading…</div>
        <div v-else-if="currentPageText.length === 0" class="text-center py-8 text-gray-500">
          This book is not available via the API, or you need to select a section. Try another book or section.
        </div>
        <!-- Complex book: section list (when no section content loaded yet) -->
        <div v-else-if="complexSections?.length && allVerseData.length === 0" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <button v-if="sectionStack.length > 0" type="button" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm" @click="goBackSection">Back</button>
            <span class="font-semibold">Select a section:</span>
          </div>
          <ul class="space-y-2">
            <li v-for="section in complexSections" :key="section.ref" class="flex items-center">
              <template v-if="isLeafNode(section)">
                <button type="button" class="text-blue-600 hover:underline font-medium text-left" @click="fetchBookContent(section.ref)">
                  {{ section.title }}<span v-if="section.heTitle"> / {{ section.heTitle }}</span>
                </button>
              </template>
              <template v-else>
                <span class="text-gray-500 font-medium">{{ section.title }}<span v-if="section.heTitle"> / {{ section.heTitle }}</span></span>
              </template>
            </li>
          </ul>
        </div>
        <div v-else class="space-y-4">
          <p class="text-xs text-gray-500 mb-1">
            Select Hebrew text to translate, or click a verse number to translate the whole sentence.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="font-medium text-gray-500">English</div>
            <div class="font-medium text-gray-500 text-right" style="direction: rtl">Hebrew</div>
          </div>
          <template v-for="(section, index) in currentPageText" :key="'v-' + index">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-4 last:border-0">
              <div><span class="text-gray-500 mr-2">{{ section.displayNumber }}</span><span v-html="section.en" /></div>
              <div class="text-right text-lg" style="direction: rtl" @mouseup="handleTextSelection">
                <span
                  class="text-gray-500 ml-2 text-sm cursor-pointer hover:text-blue-600 hover:underline"
                  role="button"
                  tabindex="0"
                  @click="handleVerseNumberClick(section.he)"
                  @keydown.enter="handleVerseNumberClick(section.he)"
                  @keydown.space.prevent="handleVerseNumberClick(section.he)"
                >{{ section.displayNumber }}</span><span v-html="section.he" />
              </div>
            </div>
          </template>
          <!-- Pagination -->
          <div v-if="totalRecords > rowsPerPage" class="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              class="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              :disabled="first === 0"
              @click="first = Math.max(0, first - rowsPerPage)"
            >
              Prev
            </button>
            <span class="text-sm text-gray-600">
              {{ first + 1 }}–{{ Math.min(first + rowsPerPage, totalRecords) }} of {{ totalRecords }}
            </span>
            <button
              type="button"
              class="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              :disabled="first + rowsPerPage >= totalRecords"
              @click="first = Math.min(first + rowsPerPage, totalRecords - 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Translation dialog -->
    <div
      v-if="showTranslationDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showTranslationDialog = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-h-[90vh] overflow-auto text-base">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">Translation</h2>
          <button type="button" class="text-gray-500 hover:text-gray-700 text-2xl leading-none" @click="showTranslationDialog = false">×</button>
        </div>
        <div v-if="translationLoading" class="text-center py-8 text-gray-500 text-lg">Loading translation…</div>
        <div v-else-if="translationError" class="text-center py-8 text-red-600 text-lg">{{ translationError }}</div>
        <div v-else-if="translationData" class="space-y-6">
          <p class="text-xs text-gray-500 -mt-2 mb-1">
            Click the Hebrew phrase to hear it spoken. Click any word in the table to hear its pronunciation.
          </p>
          <div class="bg-gray-50 p-4 rounded-lg space-y-2">
            <div
              class="text-3xl text-right text-gray-900 cursor-pointer hover:bg-blue-100 hover:text-blue-700 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
              style="direction: rtl"
              role="button"
              tabindex="0"
              title="Click to hear full sentence"
              @click="playWordTts(translationData.originalPhrase)"
              @keydown.enter="playWordTts(translationData.originalPhrase)"
              @keydown.space.prevent="playWordTts(translationData.originalPhrase)"
            >{{ translationData.originalPhrase }}</div>
            <div class="text-2xl text-gray-900">{{ translationData.translatedPhrase }}</div>
          </div>
          <div class="flex justify-end mb-2">
            <button type="button" class="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-base" @click="showRawData = true">View Raw Data</button>
          </div>
          <h3 class="text-xl font-semibold text-gray-800">Word Analysis</h3>
          <div class="overflow-x-auto border border-slate-300 rounded-lg">
            <table class="w-full text-base border-collapse">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700">Translation</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700">Word</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700">Language</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-[140px]">Root</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700">Part of Speech</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700">Gender</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700">Tense</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700">Binyan</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700">Present (Hebrew)</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-[200px]">Grammar Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in (translationData.wordTable ?? [])" :key="i" class="border-t-2 border-slate-300 hover:bg-slate-50 first:border-t-0">
                  <td class="px-3 py-3 text-gray-700 align-top whitespace-normal break-words max-w-[12rem]">{{ row.wordTranslation ?? '—' }}</td>
                  <td
                    class="px-3 py-3 text-right font-medium align-top whitespace-normal break-words"
                    :class="{ 'cursor-pointer hover:bg-blue-100 hover:text-blue-700 rounded': row.word && row.word !== '—' }"
                    style="direction: rtl"
                    :role="row.word && row.word !== '—' ? 'button' : undefined"
                    :tabindex="row.word && row.word !== '—' ? 0 : undefined"
                    :title="row.word && row.word !== '—' ? 'Click to hear pronunciation' : undefined"
                    @click="playWordTts(row.word)"
                    @keydown.enter="playWordTts(row.word)"
                    @keydown.space.prevent="playWordTts(row.word)"
                  >{{ row.word ?? '—' }}</td>
                  <td class="px-3 py-3 text-gray-700 align-top whitespace-normal break-words">{{ row.hebrewAramaic ?? '—' }}</td>
                  <td class="px-3 py-3 text-gray-700 align-top whitespace-normal break-words min-w-[140px] pl-4">{{ row.wordRoot ?? '—' }}</td>
                  <td class="px-3 py-3 text-gray-700 align-top whitespace-normal break-words pl-4">{{ row.wordPartOfSpeech ?? '—' }}</td>
                  <td class="px-3 py-3 text-gray-700 align-top whitespace-normal break-words pl-4">{{ row.wordGender ?? '—' }}</td>
                  <td class="px-3 py-3 text-gray-700 align-top whitespace-normal break-words pl-4">{{ row.wordTense ?? '—' }}</td>
                  <td class="px-3 py-3 text-gray-700 align-top whitespace-normal break-words pl-4">{{ row.wordBinyan ?? '—' }}</td>
                  <td class="px-3 py-3 text-right font-medium align-top whitespace-normal break-words pl-4" style="direction: rtl">{{ row.presentTenseHebrew ?? '—' }}</td>
                  <td class="px-3 py-3 text-gray-700 align-top whitespace-normal break-words min-w-[200px] pl-4">{{ row.grammarNotes ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Raw translation data dialog -->
    <div
      v-if="showRawData"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showRawData = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-[80vw] max-h-[80vh] overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Raw Translation Data</h2>
          <button type="button" class="text-gray-500 hover:text-gray-700 text-2xl leading-none" @click="showRawData = false">×</button>
        </div>
        <pre class="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">{{ JSON.stringify(rawTranslationData, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'

interface CategoryNode {
  type: string
  path: string
  loaded?: boolean
  children?: CategoryNode[]
  contents?: CategoryNode[]
  category?: string
  heCategory?: string
  title?: string
  categories?: string[]
  [key: string]: unknown
}

interface VerseSection {
  displayNumber: string | number
  en: string
  he: string
  number?: number
}

const loading = ref(false)
const fullIndex = ref<unknown[] | null>(null)
const categories = ref<CategoryNode[]>([])
const searchQuery = ref('')
const selectedBook = ref<CategoryNode | null>(null)
const allVerseData = ref<VerseSection[]>([])
const first = ref(0)
const rowsPerPage = 5
const totalRecords = ref(0)
const currentChapter = ref<string | number | null>(null)
const showCategoryDialog = ref(false)
const showErrorDialog = ref(false)
const errorMessage = ref('')
const showHelpDialog = ref(false)
const isComplexBookFlag = ref(false)
const complexSections = ref<Array<{ ref: string; title: string; heTitle?: string }> | null>(null)
const sectionStack = ref<unknown[]>([])
const nextSectionRef = ref<string | null>(null)
const showTranslationDialog = ref(false)
const translationLoading = ref(false)
const translationData = ref<{
  originalPhrase?: string
  translatedPhrase?: string
  wordTable?: Array<{
    word?: string
    wordTranslation?: string
    hebrewAramaic?: string
    wordRoot?: string
    wordPartOfSpeech?: string
    wordGender?: string | null
    wordTense?: string | null
    wordBinyan?: string | null
    presentTenseHebrew?: string | null
    grammarNotes?: string
  }>
} | null>(null)
const translationError = ref<string | null>(null)
const showRawData = ref(false)
const rawTranslationData = ref<unknown>(null)
const openaiModel = ref('gpt-4o')
const modelLoading = ref(false)
const ttsLoading = ref(false)

const openaiLoading = computed(() =>
  translationLoading.value || modelLoading.value || ttsLoading.value
)

const apiLoading = computed(() => loading.value || openaiLoading.value)

const apiLoadingMessage = computed(() =>
  loading.value ? 'Calling Sefaria…' : 'Calling OpenAI…'
)

const currentPageText = computed(() => {
  const start = first.value
  const end = Math.min(start + rowsPerPage, allVerseData.value.length)
  return allVerseData.value.slice(start, end)
})

const filteredCategories = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return categories.value
  function filter (cats: CategoryNode[]): CategoryNode[] {
    return cats
      .map((cat) => {
        if (cat.children?.length) {
          const filtered = filter(cat.children as CategoryNode[])
          if (filtered.length) return { ...cat, children: filtered }
        }
        if ((cat.category || '').toLowerCase().includes(q) || (cat.title || '').toLowerCase().includes(q)) return cat
        return null
      })
      .filter(Boolean) as CategoryNode[]
  }
  return filter(categories.value)
})

function processNode (node: Record<string, unknown>, parentPath: string): CategoryNode {
  const isCategory = !!(node.contents || node.category)
  return {
    ...node,
    type: isCategory ? 'category' : 'book',
    path: parentPath + '/' + (String(node.category || node.title || '')),
    loaded: false,
    children: []
  } as CategoryNode
}

async function fetchAndCacheFullIndex () {
  if (import.meta.client) {
    const cached = localStorage.getItem('sefariaIndex')
    const cachedTs = localStorage.getItem('sefariaIndexTimestamp')
    if (cached && cachedTs) {
      try {
        fullIndex.value = JSON.parse(cached)
        categories.value = (fullIndex.value as CategoryNode[]).map(cat => ({
          ...cat,
          type: 'category',
          path: String(cat.category || cat.title),
          loaded: false,
          children: []
        }))
        return
      } catch {
        // ignore
      }
    }
  }
  loading.value = true
  try {
    const data = await $fetch<unknown[]>('/api/sefaria/index')
    fullIndex.value = data
    categories.value = (data as CategoryNode[]).map(cat => ({
      ...cat,
      type: 'category',
      path: String(cat.category || cat.title),
      loaded: false,
      children: []
    }))
    if (import.meta.client) {
      localStorage.setItem('sefariaIndex', JSON.stringify(data))
      localStorage.setItem('sefariaIndexTimestamp', new Date().toISOString())
    }
  } catch {
    errorMessage.value = 'Failed to load categories.'
    showErrorDialog.value = true
  } finally {
    loading.value = false
  }
}

function refreshIndex () {
  if (import.meta.client) {
    localStorage.removeItem('sefariaIndex')
    localStorage.removeItem('sefariaIndexTimestamp')
  }
  fullIndex.value = null
  categories.value = []
  selectedBook.value = null
  fetchAndCacheFullIndex()
}

function onCategoryExpand (category: CategoryNode) {
  if (category.loaded || !category.contents) return
  category.children = category.contents.map((child: Record<string, unknown>) =>
    processNode(child, category.path)
  )
  category.loaded = true
}

async function isComplexBook (book: CategoryNode): Promise<boolean> {
  if (book.categories?.includes('Talmud')) return true
  try {
    const ref = String(book.title).replace(/\s+/g, '_')
    await $fetch(`/api/sefaria/texts/${encodeURIComponent(ref)}`)
    return false
  } catch (err: unknown) {
    const data = (err as { data?: { error?: string } })?.data
    const msg = data?.error ?? ''
    return !!msg.includes('complex') && !!msg.includes('book-level ref')
  }
}

function processSchemaNodes (nodes: unknown[], parentPath = ''): Array<{ ref: string; title: string; heTitle?: string }> {
  if (!Array.isArray(nodes)) return []
  let sections: Array<{ ref: string; title: string; heTitle?: string }> = []
  for (const node of nodes as Array<{ titles?: Array<{ lang: string; text: string }>; title?: string; heTitle?: string; key?: string; nodes?: unknown[] }>) {
    if (node.titles?.length) {
      const enTitle = node.titles.find(t => t.lang === 'en')?.text ?? node.title ?? ''
      const heTitle = node.titles.find(t => t.lang === 'he')?.text ?? node.heTitle
      const cleanKey = (node.key ?? node.title ?? '').toString().replace(/\s*\([^)]*\)/g, '').trim()
      const fullPath = parentPath ? `${parentPath}/${cleanKey}` : cleanKey
      sections.push({ ref: fullPath, title: enTitle, heTitle })
    }
    if (node.nodes?.length) {
      const cleanKey = (node.key ?? node.title ?? '').toString().replace(/\s*\([^)]*\)/g, '').trim()
      const childPath = parentPath ? `${parentPath}/${cleanKey}` : cleanKey
      sections = sections.concat(processSchemaNodes(node.nodes, childPath))
    }
  }
  return sections
}

async function fetchComplexBookToc (book: CategoryNode) {
  loading.value = true
  try {
    const isTalmud = book.categories?.includes('Talmud')
    const ref = String(book.title ?? '').replace(/\s+/g, '_')
    const indexData = await $fetch<{ schema?: { lengths?: number[]; nodes?: unknown[] } }>(`/api/sefaria/index/${encodeURIComponent(ref)}`)
    if (!indexData?.schema) {
      throw new Error('No schema found')
    }
    if (isTalmud && indexData.schema.lengths?.[0]) {
      const totalDafim = indexData.schema.lengths[0]
      const sections: Array<{ ref: string; title: string; heTitle?: string }> = []
      for (let daf = 1; daf <= totalDafim; daf++) {
        sections.push({ ref: `${book.title} ${daf}a`, title: `${daf}a`, heTitle: `${daf}א` })
        sections.push({ ref: `${book.title} ${daf}b`, title: `${daf}b`, heTitle: `${daf}ב` })
      }
      complexSections.value = sections
    } else {
      complexSections.value = processSchemaNodes(indexData.schema.nodes ?? [])
    }
    allVerseData.value = []
    totalRecords.value = 0
    first.value = 0
  } catch {
    errorMessage.value = 'Failed to load table of contents for this book.'
    showErrorDialog.value = true
    complexSections.value = null
  } finally {
    loading.value = false
  }
}

function isLeafNode (section: { ref: string }): boolean {
  const list = complexSections.value ?? []
  const idx = list.findIndex(s => s.ref === section.ref)
  if (idx === -1 || idx === list.length - 1) return true
  const next = list[idx + 1]
  return !next.ref.startsWith(section.ref + '/')
}

function goBackSection () {
  if (allVerseData.value.length > 0) {
    allVerseData.value = []
    totalRecords.value = 0
    first.value = 0
    nextSectionRef.value = null
  } else {
    complexSections.value = null
    sectionStack.value = []
  }
}

async function fetchBookContent (refOverride?: string | null) {
  if (!selectedBook.value) return
  loading.value = true
  const bookTitle = String(selectedBook.value.title ?? '')
  const isTalmud = selectedBook.value.categories?.includes('Talmud')
  let chapter: number | string | null = refOverride ? null : 1
  currentChapter.value = refOverride ?? chapter ?? 1
  let sefariaRef: string
  if (refOverride) {
    if (isComplexBookFlag.value) {
      const parts = refOverride.split('/').map(p => p.replace(/\s*\([^)]*\)/, '').trim())
      sefariaRef = `${bookTitle}, ${parts.join(', ')}`.replace(/\s+/g, '_').replace(/'([A-Za-z])/g, (_m, l: string) => 'e' + l.toLowerCase())
    } else {
      sefariaRef = refOverride.replace(/\s+/g, '_').replace(/;/g, '_')
    }
  } else {
    if (isTalmud) {
      const daf = Math.floor((first.value / rowsPerPage) / 2) + 1
      const side = (first.value / rowsPerPage) % 2 === 0 ? 'a' : 'b'
      sefariaRef = `${bookTitle} ${daf}${side}`.replace(/\s+/g, '_')
      currentChapter.value = `${daf}${side}`
    } else {
      chapter = Math.floor(first.value / rowsPerPage) + 1
      currentChapter.value = chapter
      sefariaRef = `${bookTitle} ${chapter}`.replace(/\s+/g, '_')
    }
  }
  try {
    const response = await $fetch<{
      error?: string
      text?: string | string[]
      he?: string | string[]
      verses?: number[]
      he_verses?: number[]
      next?: string
      firstAvailableSectionRef?: string
      ref?: string
      sectionRef?: string
      sections?: string[]
    }>(`/api/sefaria/texts/${encodeURIComponent(sefariaRef)}`)
    nextSectionRef.value = response.next ?? response.firstAvailableSectionRef ?? null
    if (response.error) {
      errorMessage.value = `API Error: ${response.error}`
      showErrorDialog.value = true
      allVerseData.value = []
      totalRecords.value = 0
      loading.value = false
      return
    }
    let textData: VerseSection[] = []
    const enArr = Array.isArray(response.text) ? response.text : response.text ? [response.text] : []
    const heArr = Array.isArray(response.he) ? response.he : response.he ? [response.he] : []
    if (isTalmud && (enArr.length || heArr.length)) {
      textData = heArr.map((he, idx) => ({
        number: idx + 1,
        displayNumber: `${idx + 1}`,
        en: enArr[idx] ?? '',
        he: he ?? ''
      }))
      if (textData.length === 0 && response.next) {
        await fetchBookContent(response.next)
        return
      }
    } else if (isComplexBookFlag.value && heArr.length) {
      textData = heArr.map((he, idx) => ({
        number: idx + 1,
        displayNumber: (response.sections?.[idx] ?? response.sectionRef ?? `${idx + 1}`).toString(),
        en: enArr[idx] ?? '',
        he: he ?? ''
      }))
    } else if (enArr.length || heArr.length) {
      const enVerses = response.verses ?? enArr.map((_, i) => i + 1)
      const heVerses = response.he_verses ?? enVerses
      const allNums = [...new Set([...enVerses, ...heVerses])].sort((a, b) => a - b)
      const enMap: Record<number, string> = {}
      enArr.forEach((t, i) => { enMap[enVerses[i]] = t })
      const heMap: Record<number, string> = {}
      heArr.forEach((t, i) => { heMap[heVerses[i]] = t })
      const isTanakh = selectedBook.value.categories?.includes('Tanakh')
      textData = allNums.map((num, idx) => ({
        number: num,
        displayNumber: isTanakh ? `${currentChapter.value}:${idx + 1}` : String(num),
        en: enMap[num] ?? '',
        he: heMap[num] ?? ''
      }))
    }
    if (textData.length === 0 && response.next && !refOverride) {
      await fetchBookContent(response.next)
      return
    }
    totalRecords.value = textData.length
    allVerseData.value = textData
    first.value = 0
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Request failed'
    errorMessage.value = msg
    showErrorDialog.value = true
    allVerseData.value = []
    totalRecords.value = 0
    complexSections.value = null
    nextSectionRef.value = null
  } finally {
    loading.value = false
  }
}

async function onBookSelect (event: { data: CategoryNode }) {
  const data = event.data
  if (data.type === 'category') {
    showCategoryDialog.value = true
    return
  }
  selectedBook.value = data
  allVerseData.value = []
  totalRecords.value = 0
  first.value = 0
  complexSections.value = null
  sectionStack.value = []
  nextSectionRef.value = null
  const isComplex = await isComplexBook(data)
  isComplexBookFlag.value = isComplex
  if (isComplex) {
    await fetchComplexBookToc(data)
  } else {
    await fetchBookContent()
  }
}

function handleCloseBook () {
  if (isComplexBookFlag.value) {
    if (allVerseData.value.length > 0) {
      allVerseData.value = []
      totalRecords.value = 0
      first.value = 0
      nextSectionRef.value = null
      complexSections.value = complexSections.value ? [...complexSections.value] : null
    } else {
      allVerseData.value = []
      totalRecords.value = 0
      complexSections.value = null
      sectionStack.value = []
      isComplexBookFlag.value = false
      selectedBook.value = null
    }
  } else {
    selectedBook.value = null
    allVerseData.value = []
    totalRecords.value = 0
    first.value = 0
    currentChapter.value = null
    complexSections.value = null
  }
}

function getCleanSelectionText (): string {
  if (import.meta.server) return ''
  const sel = window.getSelection()
  const raw = sel?.toString().trim() ?? ''
  if (!raw) return ''
  const temp = document.createElement('div')
  temp.innerHTML = raw
  return (temp.textContent ?? temp.innerText ?? raw).trim()
}

function getPlainTextFromHtml (html: string): string {
  if (!html) return ''
  const temp = document.createElement('div')
  temp.innerHTML = html
  return (temp.textContent ?? temp.innerText ?? html).trim()
}

async function translateWithOpenAI (text: string, fullSentence = false) {
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  if (!token) {
    errorMessage.value = 'API auth token not configured. Set NUXT_PUBLIC_API_AUTH_TOKEN in .env.'
    showErrorDialog.value = true
    return
  }
  const plainText = import.meta.client ? getPlainTextFromHtml(text) : text.replace(/<[^>]+>/g, '')
  if (!plainText) return
  showTranslationDialog.value = true
  translationLoading.value = true
  translationData.value = null
  translationError.value = null
  rawTranslationData.value = null
  try {
    const response = await $fetch<{
      output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
    }>('/api/openai/chat', {
      method: 'POST',
      body: { prompt: `Translate this phrase to English: ${plainText}`, model: openaiModel.value, fullSentence },
      headers: { Authorization: `Bearer ${token}` },
    })
    rawTranslationData.value = response
    const content = extractOutputText(response)?.trim()
    if (!content) throw new Error('No translation in response')
    let jsonStr = content
    if (!jsonStr.startsWith('{')) {
      const match = jsonStr.match(/\{[\s\S]*\}/)
      if (match) jsonStr = match[0]
    }
    type WordRow = {
      word?: string
      wordTranslation?: string
      hebrewAramaic?: string
      wordRoot?: string
      wordPartOfSpeech?: string
      wordGender?: string | null
      wordTense?: string | null
      wordBinyan?: string | null
      presentTenseHebrew?: string | null
      grammarNotes?: string
    }
    const parsed = JSON.parse(jsonStr) as { originalPhrase?: string; translatedPhrase?: string; wordTable?: WordRow[] }
    if (!parsed.originalPhrase || !parsed.translatedPhrase || !parsed.wordTable) throw new Error('Missing required fields')
    translationData.value = parsed
    if (import.meta.client) window.getSelection()?.removeAllRanges()
  } catch (err: unknown) {
    translationError.value = err instanceof Error ? err.message : 'Translation failed'
  } finally {
    translationLoading.value = false
  }
}

function handleTextSelection () {
  const text = getCleanSelectionText()
  if (!text) return
  translateWithOpenAI(text, false)
}

function handleVerseNumberClick (hebrewHtml: string) {
  if (import.meta.server) return
  const plainText = getPlainTextFromHtml(hebrewHtml)
  if (!plainText) return
  translateWithOpenAI(plainText, true)
}

async function playWordTts (word: string | undefined) {
  if (import.meta.server || !word || word === '—') return
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  if (!token) return
  ttsLoading.value = true
  try {
    const res = await fetch('/api/openai/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: word }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('[TTS]', res.status, errText)
      return
    }
    const blob = await res.blob()
    if (blob.size === 0) {
      console.error('[TTS] Empty audio response')
      return
    }
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => URL.revokeObjectURL(url)
    audio.onerror = (e) => {
      console.error('[TTS] Playback error:', e)
      URL.revokeObjectURL(url)
    }
    await audio.play()
  } catch (err) {
    console.error('[TTS]', err)
  } finally {
    ttsLoading.value = false
  }
}

/** Extract text from Responses API output array (output_text items in message content) */
function extractOutputText (response: { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }): string {
  const output = response?.output ?? []
  const parts: string[] = []
  for (const item of output) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue
    for (const c of item.content) {
      if (c.type === 'output_text' && typeof c.text === 'string') parts.push(c.text)
    }
  }
  return parts.join('').trim()
}

async function fetchLatestModel () {
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  if (!token) return
  modelLoading.value = true
  try {
    const res = await $fetch<{ model?: string }>('/api/openai/model', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res?.model) openaiModel.value = res.model
  } catch {
    // Keep default gpt-4o if model fetch fails
  } finally {
    modelLoading.value = false
  }
}

onMounted(() => {
  fetchAndCacheFullIndex()
  fetchLatestModel()
})
</script>
