<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl p-3 sm:p-6 w-[95vw] sm:w-[90vw] max-h-[90vh] overflow-auto text-sm sm:text-base">
      <!-- Single row on all screen sizes: compact on mobile so all 4 fit -->
      <div class="flex items-center justify-between gap-1 sm:gap-2 mb-3 sm:mb-4 flex-nowrap overflow-hidden min-w-0">
        <div class="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0 overflow-hidden">
          <button
            type="button"
            class="px-2 py-1 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-medium border border-green-500 rounded-md sm:rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[28px] sm:min-h-[36px] bg-white text-gray-700 hover:bg-green-50 hover:border-green-600 shrink-0"
            @click="showUsageModal = true"
          >
            Usage
          </button>
          <button
            type="button"
            class="px-2 py-1 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-medium border rounded-md sm:rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-2 min-h-[28px] sm:min-h-[36px] shrink-0"
            :class="canCopy ? (copiedStatus === 'he' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400') : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'"
            :disabled="!canCopy"
            @click="copyHebrew"
          >
            <span class="leading-none" aria-hidden="true">{{ copiedStatus === 'he' ? '✅' : '📋' }}</span>
            <span>Hebrew</span>
          </button>
          <button
            type="button"
            class="px-2 py-1 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-medium border rounded-md sm:rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-2 min-h-[28px] sm:min-h-[36px] shrink-0"
            :class="canCopy ? (copiedStatus === 'en' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400') : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'"
            :disabled="!canCopy"
            @click="copyEnglish"
          >
            <span class="leading-none" aria-hidden="true">{{ copiedStatus === 'en' ? '✅' : '📋' }}</span>
            <span>English</span>
          </button>
        </div>
        <button
          type="button"
          class="px-2 py-1 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-medium border border-gray-300 rounded-md sm:rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[28px] sm:min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 shrink-0 ml-1 sm:ml-2"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
      <div v-if="translationLoading" class="text-center py-8 text-gray-500 text-lg">Loading word-by-word translation from OpenAI…</div>
      <div v-else-if="translationError" class="text-center py-8 text-red-600 text-lg">{{ translationError }}</div>
      <div v-else-if="translationData && !translationLoading" class="space-y-4 sm:space-y-6">
        <div
          v-if="translationHasMultipleSentences"
          class="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm"
        >
          <strong>Multiple sentences detected.</strong> For best results, select individual sentences instead of the whole section.
        </div>
        <div class="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2">
          <div
            class="text-base sm:text-3xl text-right text-gray-900 cursor-pointer hover:bg-blue-100 hover:text-blue-700 rounded px-2 py-1 -mx-2 -my-1 transition-colors break-words overflow-wrap-anywhere"
            style="direction: rtl; word-break: break-word;"
            role="button"
            tabindex="0"
            title="Click to hear full sentence"
            @click="$emit('play-phrase-tts', translationData.originalPhrase)"
            @keydown.enter="$emit('play-phrase-tts', translationData.originalPhrase)"
            @keydown.space.prevent="$emit('play-phrase-tts', translationData.originalPhrase)"
          >{{ translationData.originalPhrase }}</div>
          <div class="text-sm sm:text-2xl text-gray-900 break-words overflow-wrap-anywhere" style="word-break: break-word;">{{ translationData.translatedPhrase }}</div>
        </div>
        <div class="flex justify-end mb-2">
          <button type="button" class="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400" @click="$emit('view-raw')">View Raw Data</button>
        </div>
        <div
          v-if="translationWordTableIncomplete"
          class="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm"
        >
          <strong>Incomplete word table.</strong> The AI returned only {{ (translationData.wordTable ?? []).length }} entries for {{ (translationData.originalPhrase ?? '').split(/\s+/).filter(Boolean).length }} words. For long texts, try selecting a shorter passage.
        </div>
        <h3 class="text-lg sm:text-xl font-semibold text-gray-800">Word Analysis</h3>
        <div class="space-y-2 sm:space-y-3">
          <div
            v-for="(row, i) in (translationData.wordTable ?? [])"
            :key="i"
            class="border border-slate-200 rounded-lg p-3 sm:p-4 bg-white shadow-sm hover:border-blue-200 transition-colors"
          >
            <!-- Line 1: Word, Translation, Root -->
            <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-baseline gap-2 sm:gap-x-4 sm:gap-y-1">
              <div class="flex items-baseline gap-2 flex-wrap">
                <div
                  class="text-lg sm:text-2xl font-bold text-blue-700 cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 transition-colors break-words"
                  style="direction: rtl; word-break: break-word;"
                  title="Click to hear pronunciation"
                  @click="$emit('play-word-tts', row.word)"
                >
                  {{ row.word ?? '—' }}
                </div>
                <div class="text-base sm:text-xl font-semibold text-gray-900 break-words" style="word-break: break-word;">
                  {{ row.wordTranslation ?? '—' }}
                </div>
              </div>
              <div v-if="row.wordRoot && row.wordRoot !== '—'" class="text-sm sm:text-lg text-gray-600 break-words" style="word-break: break-word;">
                <span class="text-xs text-gray-400 uppercase font-bold mr-1">Root:</span>
                {{ row.wordRoot }}<span v-if="row.wordRootTranslation" class="text-gray-500"> ({{ row.wordRootTranslation }})</span>
              </div>
              <div class="flex-grow hidden sm:block"></div>
              <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <NuxtLink
                  v-if="concordanceRootOrWord(row)"
                  :to="rootExplorerLink(concordanceRootOrWord(row)!)"
                  class="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors shrink-0"
                  :aria-label="row.wordRoot && row.wordRoot !== '—' ? 'Open concordance for this root' : 'Open concordance for this word'"
                  title="Concordance"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
                  </svg>
                </NuxtLink>
                <div
                  v-if="countWordInPhrase(translationData?.originalPhrase ?? '', row.word ?? '') > 1"
                  class="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums shrink-0"
                >
                  {{ countWordInPhrase(translationData?.originalPhrase ?? '', row.word ?? '') }}×
                </div>
                <button
                  v-if="showAddToWordList"
                  type="button"
                  class="px-2 py-1 text-xs rounded transition-all duration-200 flex items-center gap-1 whitespace-nowrap shrink-0"
                  :class="getWordListButtonClass(i)"
                  :disabled="wordListButtonStates[i] === 'loading' || wordListButtonStates[i] === 'in-list'"
                  @click="$emit('add-word-to-list', i)"
                >
                  <span v-if="wordListButtonStates[i] === 'loading'">⏳</span>
                  <span v-else-if="wordListButtonStates[i] === 'success' || wordListButtonStates[i] === 'in-list'">✅</span>
                  <span v-else>⭐</span>
                  <span>{{ getWordListButtonText(i) }}</span>
                </button>
              </div>
            </div>

            <!-- Line 2: Part of Speech, Gender, Tense, Binyan -->
            <div class="ml-0 sm:ml-4 mt-1.5 flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500 font-medium">
              <span v-if="row.wordPartOfSpeech && row.wordPartOfSpeech !== '—'">{{ row.wordPartOfSpeech }}</span>
              <span v-if="row.wordGender && row.wordGender !== '—'">{{ row.wordGender }}</span>
              <span v-if="row.wordTense && row.wordTense !== '—'">{{ row.wordTense }}</span>
              <span v-if="row.wordBinyan && row.wordBinyan !== '—'">{{ row.wordBinyan }}</span>
              <span v-if="row.hebrewAramaic && row.hebrewAramaic !== '—'" class="italic text-gray-400">({{ row.hebrewAramaic }})</span>
            </div>

            <!-- Line 3: Grammar Notes -->
            <div
              v-if="row.grammarNotes && row.grammarNotes !== '—'"
              class="mt-2 text-gray-700 text-xs sm:text-sm border-t border-gray-50 pt-2 italic leading-relaxed break-words"
              style="word-break: break-word;"
            >
              {{ row.grammarNotes }}
            </div>

            <!-- Line 4: Additional Examples with Same Root -->
            <div
              v-if="row.rootExamples && Array.isArray(row.rootExamples) && row.rootExamples.length > 0"
              class="mt-3 pt-3 border-t border-gray-100"
            >
              <div class="text-xs font-semibold text-gray-500 uppercase mb-2">Additional examples with the same root</div>
              <div class="flex flex-wrap gap-1.5 sm:gap-2">
                <div
                  v-for="(example, idx) in row.rootExamples"
                  :key="idx"
                  class="inline-flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 border border-blue-200 rounded text-xs sm:text-sm"
                >
                  <span class="text-xs sm:text-base font-medium text-blue-900" style="direction: rtl">{{ example.word }}</span>
                  <span class="text-gray-600">—</span>
                  <span class="text-gray-700">{{ example.translation }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Translation stats -->
        <div
          v-if="translationMetadata"
          class="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500"
        >
          <span v-if="translationMetadata.fromCache" class="text-gray-600">Translation from cache</span>
          <span v-else-if="translationMetadata.model || translationMetadata.durationMs != null" class="flex flex-wrap gap-x-4 gap-y-1">
            <span v-if="translationMetadata.model">Model: <span class="font-mono font-medium text-gray-700">{{ translationMetadata.model }}</span></span>
            <span v-if="(translationData?.wordTable ?? []).length > 0">Words: <span class="font-medium text-gray-700">{{ (translationData?.wordTable ?? []).length }}</span></span>
            <span v-if="translationMetadata.durationMs != null">Total time: <span class="font-medium text-gray-700">{{ translationMetadata.durationMs }} ms</span></span>
            <span
              v-if="translationMetadata.durationMs != null && (translationData?.wordTable ?? []).length > 0"
            >
              Per word: <span class="font-medium text-gray-700">{{ Math.round(translationMetadata.durationMs / (translationData?.wordTable ?? []).length) }} ms</span>
            </span>
          </span>
        </div>

        <!-- Bottom close button -->
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
    </div>

    <!-- Usage modal (translation dialog) -->
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
            <strong>Concordance icon</strong>
            <span class="inline-flex items-center justify-center w-6 h-6 align-middle mx-0.5 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
              </svg>
            </span>
            (looks like a lollipop): Next to each word’s root you’ll see this icon. Click it to open the Concordance Word Explorer, where you can see every occurrence of that root (or word) across Tanakh, Talmud, and other texts—with links to open each occurrence in the main reader.
          </p>
          <p>
            <strong>Add button (⭐ Add):</strong> When you’re signed in, the “Add” button next to a word saves that word to My Word List. You can then study saved words with flashcards from the Word List’s Study button.
          </p>
          <p>
            <strong>Other tips:</strong> Click the Hebrew phrase at the top to hear it spoken; click any word in the table to hear its pronunciation. Use Copy Hebrew / Copy English to copy the phrase.
          </p>
          <p>All text-to-speech is generated by OpenAI and may sometimes contain mistakes or repeat words.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { substantiveWord } from '~/utils/text'
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

export interface RootExample {
  word: string
  translation: string
}

export interface TranslationWordRow {
  word?: string
  wordTranslation?: string
  hebrewAramaic?: string
  wordRoot?: string
  wordRootTranslation?: string
  rootExamples?: RootExample[]
  wordPartOfSpeech?: string
  wordGender?: string | null
  wordTense?: string | null
  wordBinyan?: string | null
  presentTenseHebrew?: string | null
  grammarNotes?: string
}

export interface TranslationData {
  originalPhrase?: string
  translatedPhrase?: string
  wordTable?: TranslationWordRow[]
}

const props = defineProps<{
  open: boolean
  translationLoading: boolean
  translationError: string | null
  translationData: TranslationData | null
  translationMetadata?: { model?: string; durationMs?: number; fromCache?: boolean } | null
  translationHasMultipleSentences: boolean
  translationWordTableIncomplete: boolean
  copiedStatus: string | null
  wordListButtonStates: Record<number, 'default' | 'loading' | 'success' | 'in-list'>
  showAddToWordList: boolean
  countWordInPhrase: (phrase: string, word: string) => number
  getWordListButtonClass: (index: number) => string
  getWordListButtonText: (index: number) => string
}>()

const canCopy = computed(() => !props.translationLoading && !!props.translationData)

const showUsageModal = ref(false)
const { setSupportView, clearSupportView } = useSupportPageContext()
watch(() => props.open, (isOpen) => {
  if (isOpen) setSupportView(SUPPORT_VIEW_NAMES.TRANSLATION)
  else clearSupportView()
}, { immediate: true })

/** Use root when present and not "—", otherwise the substantive word (after maqaf, leading vav stripped; e.g. אֶל־מֹשֶׁה or וּמֹשֶׁה → מֹשֶׁה). */
function concordanceRootOrWord (row: TranslationWordRow): string | null {
  if (row.wordRoot && row.wordRoot.trim() && row.wordRoot !== '—') return row.wordRoot.trim()
  if (row.word?.trim()) return substantiveWord(row.word).trim() || row.word.trim()
  return null
}

function rootExplorerLink (rootOrWord: string) {
  return {
    path: '/root-explorer',
    query: { root: rootOrWord },
  }
}

const emit = defineEmits<{
  close: []
  copy: [text: string, key: string]
  'view-raw': []
  'play-phrase-tts': [text: string | undefined]
  'play-word-tts': [word: string | undefined]
  'add-word-to-list': [index: number]
}>()

function copyHebrew () {
  if (props.translationData) emit('copy', props.translationData.originalPhrase ?? '', 'he')
}

function copyEnglish () {
  if (props.translationData) emit('copy', props.translationData.translatedPhrase ?? '', 'en')
}
</script>
