<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-h-[90vh] overflow-auto text-base">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Word-by-word translation</h2>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
      <div v-if="translationLoading" class="text-center py-8 text-gray-500 text-lg">Loading word-by-word translation from OpenAI…</div>
      <div v-else-if="translationError" class="text-center py-8 text-red-600 text-lg">{{ translationError }}</div>
      <div v-else-if="translationData && !translationLoading" class="space-y-6">
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px]"
            :class="copiedStatus === 'he' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
            @click="$emit('copy', translationData.originalPhrase || '', 'he')"
          >
            <span>{{ copiedStatus === 'he' ? '✅' : '📋' }}</span>
            {{ copiedStatus === 'he' ? 'Copied!' : 'Copy Hebrew' }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px]"
            :class="copiedStatus === 'en' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
            @click="$emit('copy', translationData.translatedPhrase || '', 'en')"
          >
            <span>{{ copiedStatus === 'en' ? '✅' : '📋' }}</span>
            {{ copiedStatus === 'en' ? 'Copied!' : 'Copy English' }}
          </button>
        </div>
        <div
          v-if="translationHasMultipleSentences"
          class="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm"
        >
          <strong>Multiple sentences detected.</strong> For best results, select individual sentences instead of the whole section.
        </div>
        <p class="text-xs text-gray-500 -mt-2 mb-1">
          Click the Hebrew phrase to listen to the whole phrase, or click any word in the table to hear its individual pronunciation.
          <span v-if="showAddToWordList">
            To save a word for later study, click the "⭐ Add" button next to any word entry below.
          </span>
          Note: The text-to-speech feature uses OpenAI and may sometimes contain mistakes or repeat words.
        </p>
        <div class="bg-gray-50 p-4 rounded-lg space-y-2">
          <div
            class="text-3xl text-right text-gray-900 cursor-pointer hover:bg-blue-100 hover:text-blue-700 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            style="direction: rtl"
            role="button"
            tabindex="0"
            title="Click to hear full sentence"
            @click="$emit('play-phrase-tts', translationData.originalPhrase)"
            @keydown.enter="$emit('play-phrase-tts', translationData.originalPhrase)"
            @keydown.space.prevent="$emit('play-phrase-tts', translationData.originalPhrase)"
          >{{ translationData.originalPhrase }}</div>
          <div class="text-2xl text-gray-900">{{ translationData.translatedPhrase }}</div>
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
                @click="$emit('play-word-tts', row.word)"
              >
                {{ row.word ?? '—' }}
              </div>
              <div class="text-xl font-semibold text-gray-900">
                {{ row.wordTranslation ?? '—' }}
              </div>
              <div v-if="row.wordRoot && row.wordRoot !== '—'" class="text-lg text-gray-600">
                <span class="text-xs text-gray-400 uppercase font-bold mr-1">Root:</span>
                {{ row.wordRoot }}<span v-if="row.wordRootTranslation" class="text-gray-500"> ({{ row.wordRootTranslation }})</span>
              </div>
              <div class="flex-grow"></div>
              <NuxtLink
                v-if="concordanceRootOrWord(row)"
                :to="rootExplorerLink(concordanceRootOrWord(row)!)"
                class="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors shrink-0"
                :aria-label="row.wordRoot && row.wordRoot !== '—' ? 'Open concordance for this root' : 'Open concordance for this word'"
                title="Concordance"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
                </svg>
              </NuxtLink>
              <div
                v-if="countWordInPhrase(translationData?.originalPhrase ?? '', row.word ?? '') > 1"
                class="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums"
              >
                {{ countWordInPhrase(translationData?.originalPhrase ?? '', row.word ?? '') }} occurrences
              </div>
              <button
                v-if="showAddToWordList"
                type="button"
                class="px-2 py-1 text-xs rounded transition-all duration-200 flex items-center gap-1 whitespace-nowrap"
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

            <!-- Line 4: Additional Examples with Same Root -->
            <div
              v-if="row.rootExamples && Array.isArray(row.rootExamples) && row.rootExamples.length > 0"
              class="mt-3 pt-3 border-t border-gray-100"
            >
              <div class="text-xs font-semibold text-gray-500 uppercase mb-2">Additional examples with the same root</div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="(example, idx) in row.rootExamples"
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
  </div>
</template>

<script setup lang="ts">
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
  translationHasMultipleSentences: boolean
  translationWordTableIncomplete: boolean
  copiedStatus: string | null
  wordListButtonStates: Record<number, 'default' | 'loading' | 'success' | 'in-list'>
  showAddToWordList: boolean
  countWordInPhrase: (phrase: string, word: string) => number
  getWordListButtonClass: (index: number) => string
  getWordListButtonText: (index: number) => string
}>()

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

defineEmits<{
  close: []
  copy: [text: string, key: string]
  'view-raw': []
  'play-phrase-tts': [text: string | undefined]
  'play-word-tts': [word: string | undefined]
  'add-word-to-list': [index: number]
}>()
</script>
