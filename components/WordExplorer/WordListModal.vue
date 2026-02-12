<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-w-3xl max-h-[90vh] overflow-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">My Word List</h2>
        <button
          type="button"
          class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
          @click="$emit('close')"
        >
          Close
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

      <!-- Word count -->
      <div class="mb-4 text-sm text-gray-600">
        <span v-if="searchQuery">
          Showing {{ filteredWordList.length }} of {{ wordListLength }} words
        </span>
        <span v-else>
          {{ wordListTotal }} word{{ wordListTotal === 1 ? '' : 's' }}
          <span v-if="hasMore" class="text-gray-400"> · showing {{ wordListLength }}</span>
        </span>
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
              class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:border-blue-200 transition-colors"
            >
          <!-- Source text reference (clickable) -->
          <div v-if="word.wordData.sourceText || word.wordData.bookTitle" class="mb-2 text-xs text-blue-600 font-medium border-b border-gray-100 pb-2">
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
          </div>

          <!-- Context phrase (smaller, at top) -->
          <div v-if="word.wordData.originalPhrase || word.wordData.translatedPhrase" class="mb-2 text-xs text-gray-500 border-b border-gray-100 pb-2">
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
              {{ word.wordData.wordEntry.wordRoot }}
            </div>
            <div class="flex-grow"></div>
            <div class="text-xs text-gray-500">
              Saved: {{ formatDate(word.createdAt) }}
            </div>
            <button
              type="button"
              class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
              :disabled="deletingWordId === word.id"
              @click="$emit('confirm-delete-word', word.id)"
            >
              <span v-if="deletingWordId === word.id">Deleting...</span>
              <span v-else>🗑️ Delete</span>
            </button>
          </div>

          <!-- Metadata -->
          <div v-if="word.wordData.wordEntry?.wordPartOfSpeech || word.wordData.wordEntry?.wordGender || word.wordData.wordEntry?.wordTense || word.wordData.wordEntry?.wordBinyan" class="ml-4 mt-1.5 flex flex-wrap gap-x-3 text-sm text-gray-500 font-medium">
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
            </div>
          </div>
        </div>
        <div v-if="hasMore && !searchQuery" class="pt-2 border-t border-gray-200">
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
          class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
      [key: string]: unknown
    }
  }
  createdAt: number
}

const props = defineProps<{
  open: boolean
  searchQuery: string
  filteredWordList: WordListEntry[]
  wordListLength: number
  wordListTotal: number
  wordListLoading: boolean
  wordListLoadingMore: boolean
  deletingWordId: number | null
}>()

defineEmits<{
  close: []
  'update:searchQuery': [value: string]
  'navigate-to-word': [word: WordListEntry]
  'confirm-delete-word': [wordId: number]
  'load-more': []
}>()

const hasMore = computed(() => props.wordListLength < props.wordListTotal)

function formatDate (unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString()
}
</script>
