<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-w-3xl max-h-[90vh] overflow-auto">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 class="text-2xl font-bold">My Word List</h2>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-green-500 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-green-50 hover:border-green-600 touch-manipulation"
            @click="showUsageModal = true"
          >
            Usage
          </button>
          <button
            type="button"
            class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
      </div>

      <!-- Active / Archived tabs -->
      <div class="flex gap-1 p-1 mb-4 rounded-lg bg-gray-100 border border-gray-200">
        <button
          type="button"
          class="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium rounded-md touch-manipulation transition-colors"
          :class="viewMode === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          @click="$emit('update:viewMode', 'active')"
        >
          Active
        </button>
        <button
          type="button"
          class="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium rounded-md touch-manipulation transition-colors"
          :class="viewMode === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          @click="$emit('update:viewMode', 'archived')"
        >
          Archived
        </button>
      </div>

      <!-- Search input -->
      <div class="mb-4">
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
          <input
            :value="searchQuery"
            type="text"
            placeholder="Search words..."
            class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
            aria-label="Clear search"
            @click="$emit('update:searchQuery', '')"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Word count + Study (only when Active) -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="text-sm text-gray-600">
          <span v-if="searchQuery">
            Showing {{ filteredWordList.length }} of {{ wordListLength }} words
          </span>
          <span v-else>
            {{ wordListTotal }} word{{ wordListTotal === 1 ? '' : 's' }}
            <span v-if="viewMode === 'active' && hasMore" class="text-gray-400"> · showing {{ wordListLength }}</span>
          </span>
        </span>
        <button
          v-if="viewMode === 'active'"
          type="button"
          class="min-h-[44px] px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm touch-manipulation"
          :disabled="wordListTotal === 0 || !!searchQuery"
          :title="wordListTotal === 0 ? 'Add words to your list to study' : searchQuery ? 'Clear search to study' : 'Study first 20 words'"
          @click="$emit('start-study')"
        >
          Study
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="wordListLoading" class="text-center py-8 text-gray-500">
        Loading your word list...
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredWordList.length === 0" class="text-center py-8">
        <p v-if="searchQuery" class="text-gray-600">
          No words found matching "{{ searchQuery }}"
        </p>
        <p v-else-if="viewMode === 'archived'" class="text-gray-600">
          No archived words. Archive words from your active list to see them here.
        </p>
        <p v-else class="text-gray-600">
          You haven't saved any words yet. Use the "Add" button in the translation dialog to start building your collection.
        </p>
      </div>

      <!-- Word list -->
      <div v-else class="space-y-3">
        <div class="overflow-y-auto max-h-[60vh] pr-1">
          <div class="space-y-3">
            <div
              v-for="word in filteredWordList"
              :key="word.id"
              class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:border-blue-200 transition-colors relative"
            >
          <!-- Source text reference (clickable) -->
          <div v-if="word.wordData.sourceText || word.wordData.bookTitle" class="mb-2 text-xs text-blue-600 font-medium border-b border-gray-100 pb-2 pr-8 sm:pr-0 sm:flex sm:justify-between sm:items-center">
            <button
              v-if="word.wordData.sourceText || word.wordData.bookTitle"
              type="button"
              class="hover:underline cursor-pointer text-left"
              @click="$emit('navigate-to-word', word)"
            >
              <span v-if="word.wordData.sourceText">
                {{ word.wordData.sourceText }}
                <span v-if="word.wordData.bookPath" class="text-gray-500 font-normal">({{ word.wordData.bookPath }})</span>
              </span>
              <span v-else-if="word.wordData.bookTitle">
                {{ word.wordData.bookTitle }}
                <span v-if="word.wordData.bookPath" class="text-gray-500 font-normal">({{ word.wordData.bookPath }})</span>
              </span>
            </button>
            <div class="hidden sm:block text-xs text-gray-500 font-normal">
              Saved: {{ formatDate(word.createdAt) }}
            </div>
          </div>
          <!-- Saved date row (when no source text reference) -->
          <div v-else class="mb-2 hidden sm:flex sm:justify-end border-b border-gray-100 pb-2">
            <div class="text-xs text-gray-500 font-normal">
              Saved: {{ formatDate(word.createdAt) }}
            </div>
          </div>

          <!-- Archive / Restore / Reset - Mobile: top-right absolute -->
          <div class="sm:hidden absolute top-4 right-4 flex flex-wrap gap-1 justify-end">
            <template v-if="viewMode === 'active'">
              <button
                v-if="word.progress && (word.progress.timesShown > 0 || word.progress.timesCorrect > 0)"
                type="button"
                class="px-2 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 text-gray-700 shrink-0"
                :disabled="resettingProgressWordId === word.id"
                @click="$emit('reset-stats', word.id)"
              >
                <span v-if="resettingProgressWordId === word.id" class="animate-pulse">…</span>
                <span v-else>Reset stats</span>
              </button>
              <button
                type="button"
                class="px-2 py-1.5 text-sm border border-gray-300 rounded hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors shrink-0"
                :disabled="deletingWordId === word.id"
                @click="$emit('confirm-delete-word', word.id)"
              >
                <span v-if="deletingWordId === word.id" class="animate-pulse">…</span>
                <span v-else aria-label="Archive">Archive</span>
              </button>
            </template>
            <button
              v-else
              type="button"
              class="px-2 py-1.5 text-sm border border-green-300 rounded hover:bg-green-50 hover:text-green-700 shrink-0"
              :disabled="restoringWordId === word.id"
              @click="$emit('restore-word', word.id)"
            >
              <span v-if="restoringWordId === word.id" class="animate-pulse">…</span>
              <span v-else>Restore</span>
            </button>
          </div>

          <!-- Context phrase (smaller, at top) -->
          <div v-if="word.wordData.originalPhrase || word.wordData.translatedPhrase" class="mb-2 text-xs text-gray-500 border-b border-gray-100 pb-2 pr-8 sm:pr-0">
            <div v-if="word.wordData.originalPhrase" class="text-right" style="direction: rtl">
              {{ word.wordData.originalPhrase }}
            </div>
            <div v-if="word.wordData.translatedPhrase" class="text-gray-600">
              {{ word.wordData.translatedPhrase }}
            </div>
          </div>

          <!-- Word entry -->
          <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div
              v-if="word.wordData.wordEntry?.word"
              class="text-2xl font-bold text-blue-700"
              style="direction: rtl"
            >
              {{ word.wordData.wordEntry.word }}
            </div>
            <div v-if="word.wordData.wordEntry?.wordTranslation" class="text-xl font-semibold text-gray-900">
              {{ word.wordData.wordEntry.wordTranslation }}
            </div>
            <div v-if="word.wordData.wordEntry?.wordRoot && word.wordData.wordEntry.wordRoot !== '—'" class="text-lg text-gray-600">
              <span class="text-xs text-gray-400 uppercase font-bold mr-1">Root:</span>
              {{ word.wordData.wordEntry.wordRoot }}<span v-if="word.wordData.wordEntry.wordRootTranslation" class="text-gray-500"> ({{ word.wordData.wordEntry.wordRootTranslation }})</span>
            </div>
            <NuxtLink
              v-if="concordanceRootOrWord(word)"
              :to="rootExplorerLink(concordanceRootOrWord(word)!)"
              class="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors shrink-0"
              :aria-label="word.wordData.wordEntry?.wordRoot && word.wordData.wordEntry.wordRoot !== '—' ? 'Open concordance for this root' : 'Open concordance for this word'"
              title="Concordance"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
              </svg>
            </NuxtLink>
          </div>

          <!-- Archive / Restore / Reset (desktop) -->
          <div class="mt-2 hidden sm:flex sm:flex-wrap sm:justify-end sm:gap-2">
            <template v-if="viewMode === 'active'">
              <button
                v-if="word.progress && (word.progress.timesShown > 0 || word.progress.timesCorrect > 0)"
                type="button"
                class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 text-gray-700 shrink-0"
                :disabled="resettingProgressWordId === word.id"
                @click="$emit('reset-stats', word.id)"
              >
                <span v-if="resettingProgressWordId === word.id" class="animate-pulse">…</span>
                <span v-else>Reset stats</span>
              </button>
              <button
                type="button"
                class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors shrink-0"
                :disabled="deletingWordId === word.id"
                @click="$emit('confirm-delete-word', word.id)"
              >
                <span v-if="deletingWordId === word.id" class="animate-pulse">…</span>
                <span v-else aria-label="Archive">Archive</span>
              </button>
            </template>
            <button
              v-else
              type="button"
              class="px-3 py-1 text-sm border border-green-300 rounded hover:bg-green-50 hover:text-green-700 shrink-0"
              :disabled="restoringWordId === word.id"
              @click="$emit('restore-word', word.id)"
            >
              <span v-if="restoringWordId === word.id" class="animate-pulse">…</span>
              <span v-else>Restore</span>
            </button>
          </div>

          <!-- Metadata -->
          <div v-if="word.wordData.wordEntry?.wordPartOfSpeech || word.wordData.wordEntry?.wordGender || word.wordData.wordEntry?.wordTense || word.wordData.wordEntry?.wordBinyan" class="mt-1.5 flex flex-wrap gap-x-3 text-sm text-gray-500 font-medium">
            <span v-if="word.wordData.wordEntry.wordPartOfSpeech && word.wordData.wordEntry.wordPartOfSpeech !== '—'">{{ word.wordData.wordEntry.wordPartOfSpeech }}</span>
            <span v-if="word.wordData.wordEntry.wordGender && word.wordData.wordEntry.wordGender !== '—'">{{ word.wordData.wordEntry.wordGender }}</span>
            <span v-if="word.wordData.wordEntry.wordTense && word.wordData.wordEntry.wordTense !== '—'">{{ word.wordData.wordEntry.wordTense }}</span>
            <span v-if="word.wordData.wordEntry.wordBinyan && word.wordData.wordEntry.wordBinyan !== '—'">{{ word.wordData.wordEntry.wordBinyan }}</span>
          </div>

          <!-- Grammar notes -->
          <div
            v-if="word.wordData.wordEntry?.grammarNotes && word.wordData.wordEntry.grammarNotes !== '—'"
            class="mt-2 text-gray-700 text-sm border-t border-gray-50 pt-2 italic leading-relaxed"
          >
            {{ word.wordData.wordEntry.grammarNotes }}
          </div>

          <!-- Example words with the same root -->
          <div
            v-if="word.wordData.wordEntry?.rootExamples && Array.isArray(word.wordData.wordEntry.rootExamples) && word.wordData.wordEntry.rootExamples.length > 0"
            class="mt-3 pt-3 border-t border-gray-100"
          >
            <div class="text-xs font-semibold text-gray-500 uppercase mb-2">Additional examples with the same root</div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(example, idx) in word.wordData.wordEntry.rootExamples"
                :key="idx"
                class="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm"
              >
                <span class="text-base font-medium text-blue-900" style="direction: rtl">{{ example.word }}</span>
                <span class="text-gray-600">—</span>
                <span class="text-gray-700">{{ example.translation }}</span>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
        <div v-if="viewMode === 'active' && hasMore && !searchQuery" class="pt-2 border-t border-gray-200">
          <button
            type="button"
            class="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
            :disabled="wordListLoadingMore"
            @click="$emit('load-more')"
          >
            {{ wordListLoadingMore ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      </div>

      <!-- Close button -->
      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Usage modal (My Word List) -->
    <div
      v-if="showUsageModal"
      class="absolute inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 rounded-lg"
      @click.self="showUsageModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-sm font-semibold text-gray-900">Usage</h3>
          <button
            type="button"
            class="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
            @click="showUsageModal = false"
          >
            <span class="text-lg leading-none">×</span>
          </button>
        </div>
        <div class="p-4 overflow-y-auto text-sm text-gray-600 space-y-3">
          <p>
            <strong>Add button:</strong> To add words to this list, open a book in the Word Explorer and tap a Hebrew phrase. In the word-by-word translation dialog that opens, click the <strong>“⭐ Add”</strong> button next to any word to save it here. You can add many words over time and then study them with flashcards.
          </p>
          <p>
            <strong>Study:</strong> When you have words in your list, click <strong>Study</strong> to start a flashcard session. Cards show the Hebrew word; tap to reveal the translation, then choose “Need practice” or “Know it.” You can archive words you’ve mastered and restore them later from the Archived tab.
          </p>
          <p>
            <strong>Concordance icon</strong>
            <span class="inline-flex items-center justify-center w-6 h-6 align-middle mx-0.5 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
              </svg>
            </span>
            (looks like a lollipop): Next to a word’s root, this icon opens the Concordance Word Explorer so you can see every occurrence of that root or word across the texts.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { substantiveWord } from '~/utils/text'
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

const showUsageModal = ref(false)

export interface WordListEntry {
  id: number
  wordData: {
    originalPhrase?: string
    translatedPhrase?: string
    sourceText?: string
    bookTitle?: string
    bookPath?: string
    sefariaRef?: string
    wordEntry: {
      word?: string
      wordTranslation?: string
      rootExamples?: Array<{ word: string; translation: string }>
      [key: string]: unknown
    }
  }
  createdAt: number
  progress?: { timesShown: number; timesCorrect: number; attemptsUntilFirstCorrect: number | null }
}

const props = withDefaults(
  defineProps<{
    open: boolean
    viewMode?: 'active' | 'archived'
    searchQuery: string
    filteredWordList: WordListEntry[]
    wordListLength: number
    wordListTotal: number
    wordListLoading: boolean
    wordListLoadingMore: boolean
    deletingWordId: number | null
    restoringWordId?: number | null
    resettingProgressWordId?: number | null
  }>(),
  { viewMode: 'active', restoringWordId: null, resettingProgressWordId: null }
)

const { setSupportView, clearSupportView } = useSupportPageContext()
watch(() => props.open, (isOpen) => {
  if (isOpen) setSupportView(SUPPORT_VIEW_NAMES.MY_WORD_LIST)
  else clearSupportView()
}, { immediate: true })

defineEmits<{
  close: []
  'update:viewMode': [mode: 'active' | 'archived']
  'update:searchQuery': [value: string]
  'navigate-to-word': [word: WordListEntry]
  'confirm-delete-word': [wordId: number]
  'restore-word': [wordId: number]
  'reset-stats': [wordId: number]
  'load-more': []
  'start-study': []
}>()

const hasMore = computed(() => props.wordListLength < props.wordListTotal)

function formatDate (unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString()
}

/** Use root when present and not "—", otherwise the substantive word (after maqaf, leading vav stripped; e.g. אֶל־מֹשֶׁה or וּמֹשֶׁה → מֹשֶׁה). */
function concordanceRootOrWord (word: WordListEntry): string | null {
  const entry = word.wordData?.wordEntry
  if (!entry) return null
  if (entry.wordRoot && String(entry.wordRoot).trim() && entry.wordRoot !== '—') return String(entry.wordRoot).trim()
  if (entry.word?.trim()) {
    const w = String(entry.word).trim()
    return (substantiveWord(w) || w).trim()
  }
  return null
}

function rootExplorerLink (rootOrWord: string) {
  return {
    path: '/root-explorer',
    query: { root: rootOrWord },
  }
}
</script>
