<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-2">
        <span class="text-blue-600">📖</span> Translation Dictionary
      </h1>
      <NuxtLink to="/" class="text-blue-600 hover:underline flex items-center gap-1">
        ← Back to Explorer
      </NuxtLink>
    </div>

    <!-- Stats Card -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Cache Performance</h2>
      <div v-if="statsLoading" class="animate-pulse flex gap-8">
        <div class="h-16 w-32 bg-gray-100 rounded-lg"></div>
        <div class="h-16 w-32 bg-gray-100 rounded-lg"></div>
        <div class="h-16 w-32 bg-gray-100 rounded-lg"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div class="flex flex-col">
          <span class="text-3xl font-bold text-gray-900">{{ stats.hits }}</span>
          <span class="text-sm text-gray-500">Total Hits</span>
        </div>
        <div class="flex flex-col">
          <span class="text-3xl font-bold text-gray-900">{{ stats.misses }}</span>
          <span class="text-sm text-gray-500">Total Misses</span>
        </div>
        <div class="flex flex-col">
          <span class="text-3xl font-bold" :class="stats.malformed_hits > 0 ? 'text-red-600' : 'text-gray-900'">{{ stats.malformed_hits || 0 }}</span>
          <span class="text-sm text-gray-500">Malformed</span>
        </div>
        <div class="flex flex-col">
          <span class="text-3xl font-bold text-blue-600">{{ hitRate }}%</span>
          <span class="text-sm text-gray-500">Hit Rate</span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-medium text-gray-700">{{ lastUpdated }}</span>
          <span class="text-sm text-gray-500">Last Updated</span>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="relative flex-grow">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          v-model="search"
          type="text"
          placeholder="Search phrases or hash..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          @input="onSearch"
        />
      </div>
      <button 
        @click="refresh"
        class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        :disabled="loading"
      >
        <span :class="{ 'animate-spin': loading }">🔄</span> Refresh
      </button>
    </div>

    <!-- Entries Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div v-if="loading && !entries.length" class="p-12 text-center text-gray-500">
        Loading dictionary entries...
      </div>
      <div v-else-if="!entries.length" class="p-12 text-center text-gray-500">
        No translations found.
      </div>
      <div v-else>
        <p class="px-6 py-2 text-sm text-gray-500 border-b border-gray-100">
          Click any phrase to see the translation and grammar.
        </p>
        <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phrase</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Translation Snippet</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">v / Age</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Added</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="entry in entries"
              :key="entry.phrase_hash"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="text-sm font-medium text-gray-900 max-w-md truncate text-right md:text-left hover:text-blue-700"
                    :title="entry.phrase"
                    style="direction: rtl"
                    @click="translatePhrase(entry.phrase)"
                  >
                    {{ entry.phrase }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    title="View details"
                    @click="showDetail(entry)"
                  >
                    Details
                  </button>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-600 max-w-md truncate">
                  {{ entry.translationSnippet }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-gray-500">v{{ entry.version }}</span>
                  <span class="text-xs" :class="getAgeColor(entry.created_at)">
                    {{ getAgeDays(entry.created_at) }}d old
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 text-right">
                {{ formatDate(entry.created_at) }}
              </td>
              <td class="px-6 py-4 text-right">
                <button 
                  @click.stop="confirmDelete(entry)"
                  class="text-gray-400 hover:text-red-600 transition-colors p-1"
                  title="Delete entry"
                >
                  <span class="text-lg">🗑️</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="total > limit" class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div class="text-sm text-gray-600">
          Showing <span class="font-medium">{{ offset + 1 }}</span> to <span class="font-medium">{{ Math.min(offset + limit, total) }}</span> of <span class="font-medium">{{ total }}</span> results
        </div>
        <div class="flex gap-2">
          <button 
            @click="prevPage" 
            :disabled="offset === 0"
            class="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button 
            @click="nextPage" 
            :disabled="offset + limit >= total"
            class="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="selectedEntry"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="selectedEntry = null"
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 class="text-xl font-bold text-gray-800">Entry Details</h2>
          <button @click="selectedEntry = null" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div class="p-6 overflow-y-auto space-y-6">
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Original Phrase</h3>
            <div class="p-4 bg-gray-50 rounded-xl text-2xl text-right leading-relaxed" style="direction: rtl">
              {{ selectedEntry.phrase }}
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Translation</h3>
            <div class="p-4 bg-blue-50 text-blue-900 rounded-xl text-xl">
              {{ selectedEntry.translationSnippet }}
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Metadata</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="block text-gray-500 mb-1">Hash</span>
                <span class="font-mono break-all">{{ selectedEntry.phrase_hash }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="block text-gray-500 mb-1">Created At</span>
                <span>{{ new Date(selectedEntry.created_at * 1000).toLocaleString() }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="block text-gray-500 mb-1">Version</span>
                <span>v{{ selectedEntry.version }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg col-span-2">
                <span class="block text-gray-500 mb-1">Prompt Hash</span>
                <span class="font-mono break-all text-xs text-gray-400">
                  {{ selectedEntry.prompt_hash || 'None' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            @click="selectedEntry = null"
            class="px-6 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Translation dialog -->
    <div
      v-if="showTranslationDialog"
      class="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showTranslationDialog = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-h-[90vh] overflow-auto text-base">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">Translation</h2>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            @click="showTranslationDialog = false"
          >
            ×
          </button>
        </div>
        <div v-if="translationLoading" class="text-center py-8 text-gray-500 text-lg">
          Loading translation…
        </div>
        <div v-else-if="translationError" class="text-center py-8 text-red-600 text-lg">
          {{ translationError }}
        </div>
        <div v-else-if="translationData" class="space-y-6">
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 shadow-sm"
              :class="copiedStatus === 'he' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'"
              @click="handleCopy(translationData.originalPhrase || '', 'he')"
            >
              <span>{{ copiedStatus === 'he' ? '✅' : '📋' }}</span>
              {{ copiedStatus === 'he' ? 'Copied!' : 'Copy Hebrew' }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 shadow-sm"
              :class="copiedStatus === 'en' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'"
              @click="handleCopy(translationData.translatedPhrase || '', 'en')"
            >
              <span>{{ copiedStatus === 'en' ? '✅' : '📋' }}</span>
              {{ copiedStatus === 'en' ? 'Copied!' : 'Copy English' }}
            </button>
          </div>
          <div
            v-if="translationHasMultipleSentences"
            class="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm"
          >
            <strong>Multiple sentences detected.</strong>
            For best results, select individual sentences instead of the whole passage.
          </div>
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
            >
              {{ translationData.originalPhrase }}
            </div>
            <div class="text-2xl text-gray-900">
              {{ translationData.translatedPhrase }}
            </div>
          </div>
          <div class="flex justify-end mb-2">
            <button
              type="button"
              class="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-base"
              @click="showRawData = true"
            >
              View Raw Data
            </button>
          </div>
          <div
            v-if="translationWordTableIncomplete"
            class="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm"
          >
            <strong>Incomplete word table.</strong>
            The AI returned only {{ (translationData.wordTable ?? []).length }} entries for
            {{ (translationData.originalPhrase ?? '').split(/\s+/).filter(Boolean).length }} words. For long texts,
            try selecting a shorter passage.
          </div>
          <h3 class="text-xl font-semibold text-gray-800">Word Analysis</h3>
          <div class="space-y-3">
            <div
              v-for="(row, i) in (translationData.wordTable ?? [])"
              :key="i"
              class="border border-slate-200 rounded-lg p-4 bg-white shadow-sm hover:border-blue-200 transition-colors"
            >
              <!-- Line 1: Word, Translation, Root -->
              <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <div
                  class="text-2xl font-bold text-blue-700 cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 transition-colors"
                  style="direction: rtl"
                  title="Click to hear pronunciation"
                  @click="playWordTts(row.word)"
                >
                  {{ row.word ?? '—' }}
                </div>
                <div class="text-xl font-semibold text-gray-900">
                  {{ row.wordTranslation ?? '—' }}
                </div>
                <div v-if="row.wordRoot && row.wordRoot !== '—'" class="text-lg text-gray-600">
                  <span class="text-xs text-gray-400 uppercase font-bold mr-1">Root:</span>
                  {{ row.wordRoot }}
                </div>
                <div class="flex-grow"></div>
                <div
                  v-if="countWordInPhrase(translationData?.originalPhrase ?? '', row.word ?? '') > 1"
                  class="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums"
                >
                  {{ countWordInPhrase(translationData?.originalPhrase ?? '', row.word ?? '') }} occurrences
                </div>
              </div>

              <!-- Line 2: Part of Speech, Gender, Tense, Binyan -->
              <div class="ml-4 mt-1.5 flex flex-wrap gap-x-3 text-sm text-gray-500 font-medium">
                <span v-if="row.wordPartOfSpeech && row.wordPartOfSpeech !== '—'">{{ row.wordPartOfSpeech }}</span>
                <span v-if="row.wordGender && row.wordGender !== '—'">{{ row.wordGender }}</span>
                <span v-if="row.wordTense && row.wordTense !== '—'">{{ row.wordTense }}</span>
                <span v-if="row.wordBinyan && row.wordBinyan !== '—'">{{ row.wordBinyan }}</span>
                <span v-if="row.hebrewAramaic && row.hebrewAramaic !== '—'" class="italic text-gray-400">({{ row.hebrewAramaic }})</span>
              </div>

              <!-- Line 3: Grammar Notes -->
              <div
                v-if="row.grammarNotes && row.grammarNotes !== '—'"
                class="mt-2 text-gray-700 text-sm border-t border-gray-50 pt-2 italic leading-relaxed"
              >
                {{ row.grammarNotes }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Multi-sentence confirmation (before sending to OpenAI) -->
    <div
      v-if="showMultiSentenceConfirmDialog"
      class="fixed inset-0 z-[56] flex items-center justify-center bg-black/50"
      @click.self="cancelMultiSentenceConfirm"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Multiple sentences selected</h3>
        <p class="text-gray-700 mb-4">
          Your selection contains more than one sentence. Translating multiple sentences at once will be
          <strong>slow and unreliable</strong>. For best results, select individual sentences instead.
        </p>
        <p class="text-sm text-gray-600 mb-4">Do you want to continue anyway?</p>
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            @click="cancelMultiSentenceConfirm"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            @click="confirmMultiSentenceContinue"
          >
            Continue
          </button>
        </div>
      </div>
    </div>

    <!-- Raw translation data dialog -->
    <div
      v-if="showRawData"
      class="fixed inset-0 z-[57] flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showRawData = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-[80vw] max-h-[80vh] overflow-auto space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">Raw Translation Data</h2>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            @click="showRawData = false"
          >
            ×
          </button>
        </div>
        <pre class="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
{{ JSON.stringify(rawTranslationData, null, 2) }}</pre>
        <div v-if="translationData" class="border-t border-gray-200 pt-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Parsed JSON output</h3>
          <pre class="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
{{ JSON.stringify(translationData, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="entryToDelete" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" @click.self="entryToDelete = null">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-2">Delete Entry?</h3>
        <p class="text-gray-600 mb-6 text-sm">
          Are you sure you want to delete this translation from the cache? This cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <button 
            @click="entryToDelete = null" 
            class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="deleteEntry" 
            class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const entries = ref<any[]>([])
const stats = ref({ hits: 0, misses: 0, malformed_hits: 0, updated_at: 0 })
const loading = ref(false)
const statsLoading = ref(false)
const search = ref('')
const limit = 20
const offset = ref(0)
const total = ref(0)
const selectedEntry = ref<any>(null)
const entryToDelete = ref<any>(null)

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
const lastTranslatedInputText = ref<string>('')
const showMultiSentenceConfirmDialog = ref(false)
const pendingTranslation = ref<{ plainText: string; fullSentence: boolean } | null>(null)
const showRawData = ref(false)
const rawTranslationData = ref<unknown>(null)
const ttsLoading = ref(false)
const copiedStatus = ref<string | null>(null)

const hitRate = computed(() => {
  const totalCalls = stats.value.hits + stats.value.misses
  if (totalCalls === 0) return '0.0'
  return ((stats.value.hits / totalCalls) * 100).toFixed(1)
})

const lastUpdated = computed(() => {
  if (!stats.value.updated_at) return 'Never'
  return new Date(stats.value.updated_at * 1000).toLocaleTimeString()
})

const translationWordTableIncomplete = computed(() => {
  const data = translationData.value
  if (!data?.originalPhrase || !data?.wordTable?.length) return false
  const tokens = data.originalPhrase.split(/\s+/).filter(Boolean)
  const rows = data.wordTable.length
  return tokens.length > rows + 5
})

function hasMultipleSentences(phrase: string): boolean {
  if (!phrase?.trim()) return false
  const sentences = phrase
    .split(/[.?!:;\n\u05C3\u05C0\uFF1A]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return sentences.length > 1
}

const translationHasMultipleSentences = computed(() =>
  hasMultipleSentences(lastTranslatedInputText.value || translationData.value?.originalPhrase || '')
)

async function fetchStats() {
  statsLoading.value = true
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  try {
    stats.value = await $fetch('/api/cache/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (err) {
    console.error('Failed to fetch stats:', err)
  } finally {
    statsLoading.value = false
  }
}

async function fetchEntries() {
  loading.value = true
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  try {
    const data = await $fetch('/api/cache/entries', {
      params: {
        limit,
        offset: offset.value,
        search: search.value || undefined
      },
      headers: { Authorization: `Bearer ${token}` }
    })
    entries.value = data.entries
    total.value = data.total
  } catch (err) {
    console.error('Failed to fetch entries:', err)
  } finally {
    loading.value = false
  }
}

function refresh() {
  fetchStats()
  fetchEntries()
}

let searchTimeout: any = null
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    offset.value = 0
    fetchEntries()
  }, 300)
}

function prevPage() {
  if (offset.value > 0) {
    offset.value -= limit
    fetchEntries()
  }
}

function nextPage() {
  if (offset.value + limit < total.value) {
    offset.value += limit
    fetchEntries()
  }
}

function showDetail(entry: any) {
  selectedEntry.value = entry
}

function confirmDelete(entry: any) {
  entryToDelete.value = entry
}

async function deleteEntry() {
  if (!entryToDelete.value) return
  
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  
  try {
    await $fetch('/api/cache/entries', {
      method: 'DELETE',
      params: { hash: entryToDelete.value.phrase_hash },
      headers: { Authorization: `Bearer ${token}` }
    })
    entryToDelete.value = null
    fetchEntries() // Refresh the list
  } catch (err) {
    console.error('Failed to delete entry:', err)
    alert('Failed to delete entry. Check console for details.')
  }
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString()
}

function getAgeDays(timestamp: number) {
  const diff = Date.now() - (timestamp * 1000)
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getAgeColor(timestamp: number) {
  const days = getAgeDays(timestamp)
  if (days > 25) return 'text-red-500'
  if (days > 15) return 'text-amber-500'
  return 'text-green-500'
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

async function handleCopy(text: string, id: string) {
  await copyToClipboard(text)
  copiedStatus.value = id
  setTimeout(() => {
    if (copiedStatus.value === id) {
      copiedStatus.value = null
    }
  }, 2000)
}

function getPlainTextFromHtml(html: string): string {
  if (!html) return ''
  const temp = document.createElement('div')
  temp.innerHTML = html
  return (temp.textContent ?? temp.innerText ?? html).trim()
}

function countWordInPhrase(phrase: string, word: string): number {
  if (!phrase || !word) return 0
  const plain = phrase.replace(/<[^>]+>/g, '').trim()
  const tokens = plain.split(/\s+/).filter(Boolean)
  return tokens.filter((t) => t === word).length
}

function extractOutputText(response: {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
}): string {
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

async function doTranslateApiCall(plainText: string, fullSentence: boolean) {
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  if (!token) return

  showTranslationDialog.value = true
  translationLoading.value = true
  translationData.value = null
  translationError.value = null
  rawTranslationData.value = null
  lastTranslatedInputText.value = plainText

  try {
    const response = await $fetch<{
      output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
    }>('/api/openai/chat', {
      method: 'POST',
      body: { prompt: plainText, fullSentence },
      headers: { Authorization: `Bearer ${token}` }
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

    const parsed = JSON.parse(jsonStr) as {
      originalPhrase?: string
      translatedPhrase?: string
      wordTable?: WordRow[]
    }

    if (!parsed.originalPhrase || !parsed.translatedPhrase || !parsed.wordTable) {
      throw new Error('Missing required fields')
    }

    translationData.value = parsed
    if (import.meta.client) window.getSelection()?.removeAllRanges()
  } catch (err: unknown) {
    translationError.value = err instanceof Error ? err.message : 'Translation failed'
  } finally {
    translationLoading.value = false
  }
}

function cancelMultiSentenceConfirm() {
  showMultiSentenceConfirmDialog.value = false
  pendingTranslation.value = null
}

function confirmMultiSentenceContinue() {
  const pending = pendingTranslation.value
  if (!pending) {
    showMultiSentenceConfirmDialog.value = false
    return
  }
  showMultiSentenceConfirmDialog.value = false
  pendingTranslation.value = null
  doTranslateApiCall(pending.plainText, pending.fullSentence)
}

async function translateWithOpenAI(text: string, fullSentence = false) {
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  if (!token) {
    console.error('API auth token not configured. Set NUXT_PUBLIC_API_AUTH_TOKEN in .env.')
    return
  }

  const plainText = import.meta.client ? getPlainTextFromHtml(text) : text.replace(/<[^>]+>/g, '')
  if (!plainText) return

  if (hasMultipleSentences(plainText)) {
    pendingTranslation.value = { plainText, fullSentence }
    showMultiSentenceConfirmDialog.value = true
    return
  }

  await doTranslateApiCall(plainText, fullSentence)
}

async function playWordTts(word: string | undefined) {
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
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text: word })
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

function translatePhrase(text: string) {
  translateWithOpenAI(text, true)
}

onMounted(() => {
  refresh()
})
</script>
