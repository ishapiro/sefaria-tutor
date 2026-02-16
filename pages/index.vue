<template>
  <div class="container mx-auto p-3 sm:p-4 relative">
    <!-- API loading spinner overlay -->
    <CommonLoadingOverlay
      :open="apiLoading"
      :message="apiLoadingMessage"
      :rotating-messages="translationLoading ? translationLoadingRotatingMessages : undefined"
      :estimated-word-count="translationLoading ? translationInProgressWordCount : 0"
    />
    <div class="mb-3 sm:mb-4">
      <h1 class="text-lg sm:text-xl font-bold mb-1 sm:mb-2">
        Word Explorer
        <span class="pl-2 text-sm sm:text-base font-normal text-gray-600 hidden sm:inline">(Using OpenAI Model: {{ openaiModel }})</span>
      </h1>
      <p class="text-xs sm:text-sm text-gray-600 leading-tight">
        Source text from <a href="https://www.sefaria.org/" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">Sefaria</a> API; translation by <a href="https://openai.com/" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">OpenAI</a>
      </p>
    </div>

    <!-- Loading index -->
    <div v-if="loading && (!categories || categories.length === 0)" class="flex justify-center items-center py-12">
      <span class="text-gray-500">Loading categories…</span>
    </div>

    <!-- Book list -->
    <WordExplorerBookBrowser
      v-else-if="!selectedBook"
      :search-query="searchQuery"
      :loading="loading"
      :filtered-categories="filteredCategories"
      :show-category-dialog="showCategoryDialog"
      :show-error-dialog="showErrorDialog"
      :error-message="errorMessage"
      :error-details="errorDetails"
      :show-error-debug-dialog="showErrorDebugDialog"
      :show-help-dialog="showHelpDialog"
      :show-word-list-modal="showWordListModal"
      :show-notes-list-modal="showNotesListModal"
      :logged-in="loggedIn"
      :is-admin="isAdmin"
      :copied-status="copiedStatus"
      @update:search-query="searchQuery = $event"
      @refresh-index="refreshIndex"
      @open-help="showHelpDialog = true"
      @open-word-list="showWordListModal = true"
      @open-notes-list="showNotesListModal = true"
      @book-select="onBookSelectFromBrowser"
      @tab-open="onTabOpen"
      @close-category-dialog="showCategoryDialog = false"
      @close-error-dialog="showErrorDialog = false"
      @open-error-debug="showErrorDebugDialog = true"
      @close-error-debug-dialog="showErrorDebugDialog = false"
      @close-help="showHelpDialog = false"
      @copy-debug="onDebugCopy"
    />

    <!-- Book reader -->
    <WordExplorerBookReader
      v-else
      :selected-book-title="selectedBookTitle"
      :current-chapter="currentChapter"
      :loading="loading"
      :show-section-list="showSectionList"
      :show-book-not-available="showBookNotAvailable"
      :section-stack-length="sectionStack.length"
      :complex-section-groups="complexSectionGroups"
      :current-page-text="currentPageText"
      :total-records="totalRecords"
      :rows-per-page="rowsPerPage"
      :first="first"
      :next-section-ref="nextSectionRef"
      :next-section-title="nextSectionDisplayTitle"
      :word-to-highlight="wordToHighlight"
      :logged-in="loggedIn"
      :show-word-list-modal="showWordListModal"
      :show-notes-list-modal="showNotesListModal"
      :split-into-phrases="splitIntoPhrases"
      :phrase-contains-word="phraseContainsWord"
      :get-section-display-title="getSectionDisplayTitle"
      @close-book="handleCloseBook"
      @open-word-list="showWordListModal = true"
      @open-notes-list="showNotesListModal = true"
      @select-section="onSelectSection"
      @go-back-section="goBackSection"
      @open-section-list-debug="showSectionListDebugDialog = true"
      @open-book-load-debug="showBookLoadDebugDialog = true"
      @open-content-debug="showContentDebugDialog = true"
      @phrase-click="onPhraseClick"
      @open-note="onOpenNote"
      @update:first="first = $event"
    />

    <!-- Content view debug dialog -->
    <CommonDebugDialog
      :open="showContentDebugDialog"
      title="Content Debug"
      description="API response and parsed data for the currently displayed content."
      :payload="contentDebugInfo"
      copy-key="debugContent"
      :copied-status="copiedStatus"
      @close="showContentDebugDialog = false"
      @copy="onDebugCopy"
    />

    <!-- Section list debug dialog -->
    <CommonDebugDialog
      :open="showSectionListDebugDialog"
      title="Section List Debug"
      description="Refs that would be sent when clicking each section (first 10 leaf sections shown)."
      :payload="sectionListDebugInfo"
      copy-key="debugSection"
      :copied-status="copiedStatus"
      @close="showSectionListDebugDialog = false"
      @copy="onDebugCopy"
    />

    <!-- Book load debug dialog -->
    <CommonDebugDialog
      :open="showBookLoadDebugDialog"
      title="Book Load Debug Info"
      description="Context for debugging when a book fails to load."
      :payload="bookLoadDebugInfo"
      copy-key="debugBookLoad"
      :copied-status="copiedStatus"
      @close="showBookLoadDebugDialog = false"
      @copy="onDebugCopy"
    />

    <!-- Translation dialog -->
    <WordExplorerTranslationDialog
      :open="showTranslationDialog"
      :translation-loading="translationLoading"
      :translation-error="translationError"
      :translation-data="translationData"
      :translation-metadata="translationMetadata"
      :translation-has-multiple-sentences="translationHasMultipleSentences"
      :translation-word-table-incomplete="translationWordTableIncomplete"
      :copied-status="copiedStatus"
      :word-list-button-states="wordListButtonStates"
      :show-add-to-word-list="showAddToWordList"
      :count-word-in-phrase="countWordInPhrase"
      :get-word-list-button-class="getWordListButtonClass"
      :get-word-list-button-text="getWordListButtonText"
      @close="showTranslationDialog = false"
      @copy="onTranslationCopy"
      @view-raw="showRawData = true"
      @play-phrase-tts="playWordTts($event)"
      @play-word-tts="playWordTts($event)"
      @add-word-to-list="addWordToList($event)"
    />

    <!-- My Note Modal (logged-in users) -->
    <WordExplorerNotesModal />

    <!-- My Notes List Modal -->
    <WordExplorerNotesListModal
      :open="showNotesListModal"
      @close="showNotesListModal = false"
      @navigate-to-reference="navigateToNoteReference($event)"
    />

    <!-- Word List Modal -->
    <WordExplorerWordListModal
      :open="showWordListModal"
      :view-mode="wordListViewMode"
      :search-query="wordListSearchQuery"
      :filtered-word-list="wordListViewMode === 'active' ? filteredWordList : filteredArchivedWordList"
      :word-list-length="wordListViewMode === 'active' ? wordList.length : archivedWordList.length"
      :word-list-total="wordListViewMode === 'active' ? wordListTotal : archivedWordListTotal"
      :word-list-loading="wordListViewMode === 'active' ? wordListLoading : archivedWordListLoading"
      :word-list-loading-more="wordListLoadingMore"
      :deleting-word-id="deletingWordId"
      :restoring-word-id="restoringWordId"
      :resetting-progress-word-id="resettingProgressWordId"
      @close="wordListViewMode = 'active'; showWordListModal = false"
      @update:view-mode="onWordListViewModeChange"
      @update:search-query="wordListSearchQuery = $event"
      @navigate-to-word="navigateToWordReference($event)"
      @confirm-delete-word="confirmDeleteWord($event)"
      @restore-word="restoreWord($event)"
      @reset-stats="resetWordProgress($event)"
      @load-more="loadMoreWordList"
      @start-study="startStudy"
    />

    <!-- Study Session Modal -->
    <WordExplorerStudySessionModal
      :open="showStudySession"
      :deck="studyDeck"
      :correct-repetitions="studyCorrectRepetitions"
      :max-cards="studyMaxCards"
      :on-record-show="recordStudyShow"
      :on-record-correct="recordStudyCorrect"
      :on-play-tts="playWordTts"
      @close="showStudySession = false"
    />

    <!-- Archive confirmation dialog -->
    <CommonConfirmDialog
      :open="showDeleteConfirm"
      title="Archive word?"
      message="Archive this word? It will be removed from your list and study deck. You can restore it later from Archived."
      confirm-label="Archive"
      cancel-label="Cancel"
      :loading="deletingWordId !== null"
      @confirm="wordToDelete && archiveWord(wordToDelete)"
      @cancel="cancelDeleteWord"
    />

    <!-- Multi-sentence confirmation (before sending to OpenAI) -->
    <div
      v-if="showMultiSentenceConfirmDialog"
      class="fixed inset-0 z-[55] flex items-center justify-center bg-black/50"
      @click.self="showMultiSentenceConfirmDialog = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Multiple sentences selected</h3>
        <p class="text-gray-700 mb-4">
          Your selection contains more than one sentence. Translating multiple sentences at once will be <strong>slow and unreliable</strong>. For best results, select individual sentences instead.
        </p>
        <p class="text-sm text-gray-600 mb-4">Do you want to continue anyway?</p>
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            @click="cancelMultiSentenceConfirm"
          >Cancel</button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            @click="confirmMultiSentenceContinue"
          >Continue</button>
        </div>
      </div>
    </div>

    <!-- Long phrase: select words to translate -->
    <div
      v-if="showLongPhraseSelectionDialog"
      class="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="closeLongPhraseSelectionDialog"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-2xl mx-4 w-full max-h-[90vh] overflow-auto">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Select words to translate</h3>
        <p class="text-sm text-gray-600 mb-4">
          This phrase contains <strong>{{ longPhraseWords.length }}</strong> words. Selecting more words will result in a longer translation time.
          For best results—especially for vocalization—try to select consecutive words when possible.
        </p>
        <div class="flex flex-wrap gap-2 mb-6" style="direction: rtl">
          <button
            v-for="(word, i) in longPhraseWords"
            :key="i"
            type="button"
            class="px-3 py-1.5 rounded-lg border transition-colors text-base"
            :class="longPhraseWordSelected[i] ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'"
            @click="toggleLongPhraseWord(i)"
          >{{ word }}</button>
        </div>
        <div class="flex gap-3 justify-end flex-wrap">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            @click="closeLongPhraseSelectionDialog"
          >Cancel</button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            :class="longPhraseSelectedCount ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'"
            :disabled="!longPhraseSelectedCount"
            @click="translateLongPhraseSelection"
          >Translate selection{{ longPhraseSelectedCount ? ` (${longPhraseSelectedCount})` : '' }}</button>
          <button
            type="button"
            class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            @click="translateLongPhraseAll"
          >Translate all</button>
        </div>
      </div>
    </div>

    <!-- Raw translation data dialog -->
    <div
      v-if="showRawData"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showRawData = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-[80vw] max-h-[80vh] overflow-auto space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">Raw Translation Data</h2>
          <button type="button" class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400" @click="showRawData = false">Close</button>
        </div>
        <pre class="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">{{ JSON.stringify(rawTranslationData, null, 2) }}</pre>
        <div v-if="translationData" class="border-t border-gray-200 pt-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Parsed JSON output</h3>
          <pre class="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">{{ JSON.stringify(translationData, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import type { CategoryNode } from '~/components/WordExplorer/BookBrowser.vue'
import { hasMultipleSentences, countWords, getPlainTextFromHtml, splitIntoPhrases, countWordInPhrase, phraseContainsWord } from '~/utils/text'
import { parseStartChapterFromRef, buildTanakhDisplayNumbers, parseRangeFromRef, extractTextArray, extractTextAndSections } from '~/utils/sefaria'
import { buildNoteContext } from '~/utils/notes'
import { useClipboard } from '~/composables/useClipboard'
import { useNotes } from '~/composables/useNotes'
import { useSupportPageContext } from '~/composables/useSupportPageContext'

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
const selectedBookTitle = computed(() => selectedBook.value?.title ?? '')
const allVerseData = ref<VerseSection[]>([])
const first = ref(0)
const rowsPerPage = 5
const totalRecords = ref(0)
const currentChapter = ref<string | number | null>(null)
const showCategoryDialog = ref(false)
const showErrorDialog = ref(false)
const errorMessage = ref('')
const errorDetails = ref<Record<string, unknown> | null>(null)
const showErrorDebugDialog = ref(false)
const showHelpDialog = ref(false)
const isComplexBookFlag = ref(false)
const complexSections = ref<Array<{ ref: string; title: string; heTitle?: string; isContainer?: boolean }> | null>(null)
const bookLoadAttempted = ref(false)
const sectionStack = ref<unknown[]>([])
const nextSectionRef = ref<string | null>(null)
const showBookLoadDebugDialog = ref(false)
const showSectionListDebugDialog = ref(false)
const showContentDebugDialog = ref(false)
const lastSefariaRefAttempted = ref<string | null>(null)
const lastSefariaResponse = ref<unknown>(null)
const lastSefariaError = ref<string | null>(null)
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
    wordRootTranslation?: string
    rootExamples?: Array<{ word: string; translation: string }>
    wordPartOfSpeech?: string
    wordGender?: string | null
    wordTense?: string | null
    wordBinyan?: string | null
    presentTenseHebrew?: string | null
    grammarNotes?: string
  }>
} | null>(null)
const translationError = ref<string | null>(null)
const translationMetadata = ref<{ model?: string; durationMs?: number; fromCache?: boolean } | null>(null)
/** Word count of phrase being translated; used for progress bar estimate (3 sec/word) */
const translationInProgressWordCount = ref(0)
const lastTranslatedInputText = ref<string>('')
const showMultiSentenceConfirmDialog = ref(false)
const pendingTranslation = ref<{ plainText: string; fullSentence: boolean } | null>(null)
/** Long phrase threshold: when selection has more than this many words, show word-picker. Loaded from user settings; default 8. */
const longPhraseWordLimit = ref(8)
const showLongPhraseSelectionDialog = ref(false)
const pendingLongPhrase = ref<{ plainText: string; fullSentence: boolean } | null>(null)
/** Sefaria ref captured when long phrase or multi-sentence dialog is shown; used when translation is performed so add-to-word-list has the correct reference. */
const pendingTranslationSefariaRef = ref<string | null>(null)
/** Sefaria ref for the translation currently shown in the dialog; used by addWordToList so reference is preserved when user came via long-phrase selection. */
const translationSefariaRef = ref<string | null>(null)
const longPhraseWords = ref<string[]>([])
const longPhraseWordSelected = ref<boolean[]>([])
const showRawData = ref(false)
const rawTranslationData = ref<unknown>(null)
const { isAdmin, fetch: fetchSession, user, loggedIn } = useAuth()
const route = useRoute()
const router = useRouter()
const openaiModel = ref('gpt-5.1-chat-latest')

// Word List state
const showWordListModal = ref(false)
const showNotesListModal = ref(false)
type WordListWord = {
  id: number
  wordData: {
    originalPhrase?: string
    translatedPhrase?: string
    sourceText?: string
    bookTitle?: string
    bookPath?: string
    sefariaRef?: string
    wordEntry: { word?: string; wordTranslation?: string; [key: string]: any }
  }
  createdAt: number
  progress?: { timesShown: number; timesCorrect: number; attemptsUntilFirstCorrect: number | null }
}
const wordList = ref<WordListWord[]>([])
const wordListTotal = ref(0)
const wordListLoading = ref(false)
const wordListLoadingMore = ref(false)
const wordListSearchQuery = ref('')
const wordListButtonStates = ref<Record<number, 'default' | 'loading' | 'success' | 'in-list'>>({})
const deletingWordId = ref<number | null>(null)
const showDeleteConfirm = ref(false)
const wordToDelete = ref<number | null>(null)
const wordListViewMode = ref<'active' | 'archived'>('active')
const archivedWordList = ref<WordListWord[]>([])
const archivedWordListTotal = ref(0)
const archivedWordListLoading = ref(false)
const restoringWordId = ref<number | null>(null)
const resettingProgressWordId = ref<number | null>(null)
const wordToHighlight = ref<string | null>(null) // Hebrew word to highlight after navigation

// Study session (flashcards)
const showStudySession = ref(false)
const studyDeck = ref<Array<{ id: number; wordData: { wordEntry: Record<string, unknown>; [key: string]: unknown }; createdAt?: number }>>([])
const studyCorrectRepetitions = ref(2)
const studyMaxCards = ref<number | null>(null)

const showAddToWordList = computed(() => {
  if (!loggedIn.value) return false
  const u = user.value as SessionUser | null
  return !!(u?.role && ['general', 'team', 'admin'].includes(String(u.role)))
})

// Debug logging for admin status
type SessionUser = { id?: string; email?: string; role?: string; isVerified?: boolean }
watch([user, isAdmin, loggedIn], ([userVal, adminVal, loggedInVal]) => {
  const u = userVal as SessionUser | null
  console.log('[Auth Debug]', {
    loggedIn: loggedInVal,
    user: u ? {
      id: u.id,
      email: u.email,
      role: u.role,
      isVerified: u.isVerified
    } : null,
    isAdmin: adminVal
  })
}, { immediate: true })
const modelLoading = ref(false)
const ttsLoading = ref(false)
const { copiedStatus, copy: copyToClipboardWithFeedback } = useClipboard()
const { openNoteModal } = useNotes()

const openaiLoading = computed(() =>
  translationLoading.value || ttsLoading.value
  // Note: modelLoading is excluded - model retrieval is a background operation that shouldn't show loading overlay
)

const apiLoading = computed(() => loading.value || openaiLoading.value)

const apiLoadingMessage = computed(() => {
  if (loading.value) return 'Calling Sefaria…'
  if (ttsLoading.value) return 'Generating audio pronunciation…'
  if (translationLoading.value) {
    return 'Getting word-by-word translation from OpenAI.\n\nProcessing takes approximately 3 seconds per word—please be patient.\n\nResults are saved so future translations will be faster.'
  }
  return 'Loading…'
})

/** Rotating messages shown during translation—reflect what the AI prompt is doing */
const translationLoadingRotatingMessages = [
  'Translating the full phrase…',
  'Analyzing each word…',
  'Identifying roots (shorashim)…',
  'Looking up root meanings…',
  'Determining part of speech and binyan…',
  'Explaining prefixes, suffixes, and conjugations…',
  'Finding related words with the same root…',
]

/** True if the wordTable has notably fewer entries than words in the original phrase (model truncation). */
const translationWordTableIncomplete = computed(() => {
  const data = translationData.value
  if (!data?.originalPhrase || !data?.wordTable?.length) return false
  const tokens = data.originalPhrase.split(/\s+/).filter(Boolean)
  const rows = data.wordTable.length
  return tokens.length > rows + 5
})

const translationHasMultipleSentences = computed(() =>
  hasMultipleSentences(lastTranslatedInputText.value || translationData.value?.originalPhrase || '')
)

const longPhraseSelectedCount = computed(() =>
  longPhraseWordSelected.value.filter(Boolean).length
)
const longPhraseSelectedText = computed(() => {
  const words = longPhraseWords.value
  const selected = longPhraseWordSelected.value
  return words.filter((_, i) => selected[i]).join(' ')
})

function onDebugCopy (text: string, key: string) {
  copyToClipboardWithFeedback(text, key)
}

function onTranslationCopy (text: string, key: string) {
  copyToClipboardWithFeedback(text, key)
}

function getSectionDisplayTitle (section: { ref: string; title: string; heTitle?: string }): string {
  const refTitle = buildSefariaRefForSection(section.ref)
  if (/^Siman \d+$/.test(section.title)) return refTitle
  return section.heTitle ? `${section.title} / ${section.heTitle}` : section.title
}

function buildSefariaRefForSection (sectionRef: string): string {
  if (!selectedBook.value) return sectionRef
  const bookTitle = String(selectedBook.value.title ?? '')
  const isTalmud = selectedBook.value.categories?.includes('Talmud')
  const parts = sectionRef
    .split('/')
    .map(p => p.replace(/\s*\([^)]*\)/, '').trim())
    .map(p => p.replace(/'([A-Za-z])/g, (_, c) => 'e' + c.toLowerCase()))

  // For Talmud, our section refs are simple daf strings like "2a" / "2b".
  // Debug output should mirror Sefaria's style, e.g. "Berakhot 2a".
  if (isTalmud) {
    const last = parts[parts.length - 1] || ''
    return `${bookTitle} ${last}`.trim()
  }

  // For non‑Talmud complex books, keep the hierarchical "Book, Section" style.
  return `${bookTitle}, ${parts.join(', ')}`
}

const sectionListDebugInfo = computed(() => {
  const list = complexSections.value ?? []
  const leafSections = list.filter(s => isLeafNode(s)).slice(0, 10)
  const raw = lastSefariaResponse.value
  let lastResponseSummary: unknown = null
  if (raw && typeof raw === 'object' && !(raw instanceof Error)) {
    const r = raw as Record<string, unknown>
    lastResponseSummary = {
      textType: Array.isArray(r.text) ? 'array' : typeof r.text,
      heType: Array.isArray(r.he) ? 'array' : typeof r.he,
      textKeys: r.text && typeof r.text === 'object' && !Array.isArray(r.text) ? Object.keys(r.text).slice(0, 5) : undefined,
      heKeys: r.he && typeof r.he === 'object' && !Array.isArray(r.he) ? Object.keys(r.he).slice(0, 5) : undefined,
    }
  }
  return {
    selectedBook: selectedBook.value ? { title: selectedBook.value.title } : null,
    leafSectionsSample: leafSections.map(s => ({
      ref: s.ref,
      title: s.title,
      sefariaRefWouldSend: buildSefariaRefForSection(s.ref),
    })),
    lastSefariaRefAttempted: lastSefariaRefAttempted.value,
    lastSefariaError: lastSefariaError.value,
    lastResponseSummary,
  }
})

function summarizeForDebug (val: unknown): unknown {
  if (Array.isArray(val)) {
    return { _type: 'array', length: val.length, sample: val.slice(0, 5) }
  }
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>
    const keys = Object.keys(obj)
    return { _type: 'object', keys, keyCount: keys.length, sample: Object.fromEntries(keys.slice(0, 5).map(k => [k, summarizeForDebug(obj[k])])) }
  }
  return val
}

const contentDebugInfo = computed(() => {
  const raw = lastSefariaResponse.value
  let responseSummary: unknown = null
  if (raw && typeof raw === 'object' && !(raw instanceof Error)) {
    const r = raw as Record<string, unknown>
    responseSummary = {
      ref: r.ref,
      next: r.next,
      firstAvailableSectionRef: r.firstAvailableSectionRef,
      sectionRef: r.sectionRef,
      error: r.error,
      textSummary: summarizeForDebug(r.text),
      heSummary: summarizeForDebug(r.he),
      verses: r.verses,
      he_verses: r.he_verses,
      sections: r.sections,
    }
  }
  return {
    selectedBook: selectedBook.value ? { title: selectedBook.value.title } : null,
    lastSefariaRefAttempted: lastSefariaRefAttempted.value,
    lastSefariaError: lastSefariaError.value,
    totalRecords: totalRecords.value,
    allVerseDataLength: allVerseData.value.length,
    currentChapter: currentChapter.value,
    paginationFirst: first.value,
    apiResponse: responseSummary,
    parsedVerseDisplayNumbers: allVerseData.value.slice(0, 20).map(v => v.displayNumber),
  }
})

const bookLoadDebugInfo = computed(() => {
  const raw = lastSefariaResponse.value
  let safeResponse: unknown = raw
  if (raw && typeof raw === 'object' && !(raw instanceof Error)) {
    const r = raw as Record<string, unknown>
    safeResponse = {
      error: r.error,
      ref: r.ref,
      next: r.next,
      firstAvailableSectionRef: r.firstAvailableSectionRef,
      textLength: Array.isArray(r.text) ? r.text.length : r.text ? 1 : 0,
      heLength: Array.isArray(r.he) ? r.he.length : r.he ? 1 : 0,
      verses: r.verses,
      sectionRef: r.sectionRef,
      sectionsCount: Array.isArray(r.sections) ? r.sections.length : 0,
    }
  }
  return {
    selectedBook: selectedBook.value ? { title: selectedBook.value.title, path: selectedBook.value.path, categories: selectedBook.value.categories } : null,
    isComplexBook: isComplexBookFlag.value,
    complexSectionsCount: complexSections.value?.length ?? 0,
    complexSectionsSample: complexSections.value?.slice(0, 3).map(s => ({ ref: s.ref, title: s.title })) ?? [],
    allVerseDataLength: allVerseData.value.length,
    totalRecords: totalRecords.value,
    sectionStackLength: sectionStack.value?.length ?? 0,
    nextSectionRef: nextSectionRef.value,
    lastSefariaRefAttempted: lastSefariaRefAttempted.value,
    lastSefariaError: lastSefariaError.value,
    lastSefariaResponseSummary: safeResponse,
  }
})

/** Group complex sections into Sefaria-style headings plus their child links.
 * For Talmud, this means chapter headings (e.g. "Chapter 1; MeEimatai") with
 * daf buttons underneath. For other complex books without explicit containers,
 * this simply returns a single group of all sections. */
const complexSectionGroups = computed(() => {
  const sections = complexSections.value ?? []
  const groups: Array<{ header: { ref: string; title: string; heTitle?: string } | null; items: Array<{ ref: string; title: string; heTitle?: string }> }> = []
  let current: { header: { ref: string; title: string; heTitle?: string } | null; items: Array<{ ref: string; title: string; heTitle?: string }> } | null = null

  for (const section of sections) {
    if (section.isContainer || !current) {
      // Start a new group when we see a container (chapter) or when this is the first item.
      current = {
        header: section.isContainer ? { ref: section.ref, title: section.title, heTitle: section.heTitle } : null,
        items: [],
      }
      groups.push(current)
      if (!section.isContainer) {
        current.items.push({ ref: section.ref, title: section.title, heTitle: section.heTitle })
      }
    } else {
      current.items.push({ ref: section.ref, title: section.title, heTitle: section.heTitle })
    }
  }

  // If there were no explicit containers, ensure at least one group containing all sections.
  if (groups.length === 0 && sections.length > 0) {
    groups.push({
      header: null,
      items: sections.map(s => ({ ref: s.ref, title: s.title, heTitle: s.heTitle })),
    })
  }

  return groups
})

const currentPageText = computed(() => {
  const start = first.value
  const end = Math.min(start + rowsPerPage, allVerseData.value.length)
  return allVerseData.value.slice(start, end)
})

const showSectionList = computed(() => (complexSections.value?.length ?? 0) > 0 && allVerseData.value.length === 0)
const showBookNotAvailable = computed(() => bookLoadAttempted.value && !loading.value && currentPageText.value.length === 0 && !complexSections.value)

/** Remove duplicate segments from a comma-separated section title (e.g. "Siddur Ashkenaz, Siddur Ashkenaz, Weekday" -> "Siddur Ashkenaz, Weekday"). */
function deduplicateTitleSegments (title: string): string {
  const segments = title.split(',').map(s => s.trim()).filter(Boolean)
  const seen = new Set<string>()
  const kept: string[] = []
  for (const seg of segments) {
    if (!seen.has(seg)) {
      seen.add(seg)
      kept.push(seg)
    }
  }
  return kept.join(', ')
}

/** Display title for the next chapter/section (for "Next Chapter" button). */
const nextSectionDisplayTitle = computed(() => {
  const ref = nextSectionRef.value
  if (!ref) return null
  const section = complexSections.value?.find(s => s.ref === ref)
  const raw = section?.title ?? buildSefariaRefForSection(ref)
  return deduplicateTitleSegments(raw)
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

/** Strip down a node to only the fields we actually need for display and navigation.
 * This significantly reduces localStorage size by removing unused metadata from Sefaria API.
 */
function minimizeNode (node: Record<string, unknown>): Record<string, unknown> {
  const minimized: Record<string, unknown> = {}
  
  // Always include these if present (these are the only fields we actually use)
  if (node.category !== undefined) minimized.category = node.category
  if (node.heCategory !== undefined) minimized.heCategory = node.heCategory
  if (node.title !== undefined) minimized.title = node.title
  if (node.heTitle !== undefined) minimized.heTitle = node.heTitle
  if (node.categories !== undefined) minimized.categories = node.categories
  if (node.enShortDesc !== undefined) minimized.enShortDesc = node.enShortDesc
  
  // For categories, include contents for lazy loading (but minimize those recursively too)
  if (node.contents && Array.isArray(node.contents)) {
    minimized.contents = (node.contents as Record<string, unknown>[]).map(child => minimizeNode(child))
  }
  
  return minimized
}

/** Compress data using lz-string if available, otherwise return as-is */
function compressData (data: string): { compressed: string; method: 'lz-string' | 'none' } {
  if (import.meta.client && typeof window !== 'undefined') {
    // Try to use lz-string if available
    try {
      // @ts-expect-error - lz-string may not be installed yet
      const LZString = window.LZString
      if (LZString && typeof LZString.compress === 'function') {
        const compressed = LZString.compress(data)
        return { compressed, method: 'lz-string' }
      }
    } catch {
      // lz-string not available, fall through to uncompressed
    }
  }
  return { compressed: data, method: 'none' }
}

/** Decompress data using lz-string if it was compressed, otherwise return as-is */
function decompressData (data: string, method: 'lz-string' | 'none' = 'none'): string {
  if (method === 'lz-string' && import.meta.client && typeof window !== 'undefined') {
    try {
      // @ts-expect-error - lz-string may not be installed yet
      const LZString = window.LZString
      if (LZString && typeof LZString.decompress === 'function') {
        return LZString.decompress(data) || data
      }
    } catch {
      // If decompression fails, return original data
      console.warn('[Categories] Failed to decompress, using original data')
    }
  }
  return data
}

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
    try {
      const cached = localStorage.getItem('sefariaIndex')
      const cachedTs = localStorage.getItem('sefariaIndexTimestamp')
      const cachedMethod = localStorage.getItem('sefariaIndexMethod') as 'lz-string' | 'none' | null
      if (cached && cachedTs) {
        try {
          // Decompress if needed
          const decompressed = decompressData(cached, cachedMethod || 'none')
          const cachedData = JSON.parse(decompressed)
          // Restore from minimized cache - we need to reconstruct the structure
          fullIndex.value = cachedData
          categories.value = (cachedData as CategoryNode[]).map(cat => ({
            ...cat,
            type: 'category',
            path: String(cat.category || cat.title),
            loaded: false,
            children: []
          }))
          const method = cachedMethod || 'none'
          const cachedSize = new Blob([cached]).size
          const decompressedSize = new Blob([decompressed]).size
          const ratio = method !== 'none' ? ((1 - cachedSize / decompressedSize) * 100).toFixed(1) : '0'
          console.log(`[Categories] Loaded from cache (${method}, ${(cachedSize / 1024).toFixed(1)} KB → ${(decompressedSize / 1024).toFixed(1)} KB, ${ratio}% compression)`)
          return
        } catch (err) {
          console.warn('[Categories] Failed to parse cached index:', err)
          // Clear corrupted cache
          try {
            localStorage.removeItem('sefariaIndex')
            localStorage.removeItem('sefariaIndexTimestamp')
          } catch {
            // ignore cleanup errors
          }
          // Continue to fetch from API
        }
      }
    } catch (storageErr) {
      // localStorage might be disabled or inaccessible
      console.warn('[Categories] Cannot access localStorage:', storageErr)
      // Continue to fetch from API
    }
  }
  loading.value = true
  
  // Log browser information for debugging
  if (import.meta.client) {
    const userAgent = navigator.userAgent
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
    const isChrome = /chrome/i.test(userAgent) && !/edg/i.test(userAgent)
    console.log('[Categories] Browser info:', {
      userAgent,
      isSafari,
      isChrome,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      localStorageAvailable: typeof Storage !== 'undefined',
    })
  }
  
  try {
    console.log('[Categories] Fetching index from API...')
    const startTime = Date.now()
    const data = await $fetch<unknown[]>('/api/sefaria/index')
    const duration = Date.now() - startTime
    console.log(`[Categories] Successfully loaded ${Array.isArray(data) ? data.length : 'unknown'} categories in ${duration}ms`)
    
    // Minimize the data before storing to reduce size
    const minimizedData = (data as Record<string, unknown>[]).map(node => minimizeNode(node))
    
    // Log size comparison
    if (import.meta.client) {
      const fullSize = new Blob([JSON.stringify(data)]).size
      const minimizedSize = new Blob([JSON.stringify(minimizedData)]).size
      const reduction = ((1 - minimizedSize / fullSize) * 100).toFixed(1)
      console.log(`[Categories] Size reduction: ${(fullSize / (1024 * 1024)).toFixed(2)} MB → ${(minimizedSize / (1024 * 1024)).toFixed(2)} MB (${reduction}% smaller)`)
    }
    
    fullIndex.value = data // Keep full data in memory for processing
    categories.value = (data as CategoryNode[]).map(cat => ({
      ...cat,
      type: 'category',
      path: String(cat.category || cat.title),
      loaded: false,
      children: []
    }))
    
    // Cache to localStorage with compression and quota handling - use minimized data
    if (import.meta.client) {
      try {
        const jsonData = JSON.stringify(minimizedData)
        const uncompressedSize = new Blob([jsonData]).size
        
        // Try to compress the data
        const { compressed, method } = compressData(jsonData)
        const compressedSize = new Blob([compressed]).size
        const compressionRatio = method !== 'none' ? ((1 - compressedSize / uncompressedSize) * 100).toFixed(1) : '0'
        
        const dataSizeMB = (compressedSize / (1024 * 1024)).toFixed(2)
        const uncompressedMB = (uncompressedSize / (1024 * 1024)).toFixed(2)
        
        if (method !== 'none') {
          console.log(`[Categories] Compression: ${uncompressedMB} MB → ${dataSizeMB} MB (${compressionRatio}% reduction)`)
        } else {
          console.log(`[Categories] Cached data size: ${dataSizeMB} MB (uncompressed - install lz-string for compression)`)
        }
        
        // Check if data is too large (Safari typically has ~5MB limit, Chrome ~10MB)
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        const maxSize = isSafari ? 4 * 1024 * 1024 : 9 * 1024 * 1024 // Leave some headroom
        
        if (compressedSize > maxSize) {
          console.warn(`[Categories] Data too large (${dataSizeMB} MB) for localStorage. Skipping cache.`)
          // Try to clear old cache and retry
          try {
            localStorage.removeItem('sefariaIndex')
            localStorage.removeItem('sefariaIndexTimestamp')
            localStorage.removeItem('sefariaIndexMethod')
            // Clear other potentially large items
            const keysToCheck = ['sefariaIndex', 'sefariaIndexTimestamp', 'sefariaIndexMethod']
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key && !keysToCheck.includes(key)) {
                // Keep other items, just log
                console.log(`[Categories] Other localStorage key: ${key}`)
              }
            }
            // Try again after clearing
            if (compressedSize <= maxSize * 1.2) { // Allow slightly larger if we cleared space
              localStorage.setItem('sefariaIndex', compressed)
              localStorage.setItem('sefariaIndexTimestamp', new Date().toISOString())
              localStorage.setItem('sefariaIndexMethod', method)
              console.log(`[Categories] Cached to localStorage after cleanup (${method})`)
            }
          } catch (retryErr) {
            console.warn('[Categories] Retry after cleanup also failed:', retryErr)
          }
        } else {
          localStorage.setItem('sefariaIndex', compressed)
          localStorage.setItem('sefariaIndexTimestamp', new Date().toISOString())
          localStorage.setItem('sefariaIndexMethod', method)
          console.log(`[Categories] Cached to localStorage (${method})`)
        }
      } catch (storageErr: unknown) {
        const err = storageErr as { name?: string; message?: string; code?: number }
        const isQuotaError = err.name === 'QuotaExceededError' || 
                            err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                            err.code === 22
        
        if (isQuotaError) {
          console.warn('[Categories] localStorage quota exceeded. Attempting to free space...')
          try {
            // Clear old cache
            localStorage.removeItem('sefariaIndex')
            localStorage.removeItem('sefariaIndexTimestamp')
            localStorage.removeItem('sefariaIndexMethod')
            
            // Try to estimate and clear other items if needed
            let totalSize = 0
            const items: Array<{ key: string; size: number }> = []
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key) {
                const value = localStorage.getItem(key) || ''
                const size = new Blob([value]).size
                totalSize += size
                items.push({ key, size })
              }
            }
            console.log(`[Categories] Current localStorage usage: ${(totalSize / (1024 * 1024)).toFixed(2)} MB across ${items.length} items`)
            
            // Try one more time with compression
            const jsonData = JSON.stringify(minimizedData)
            const { compressed, method } = compressData(jsonData)
            localStorage.setItem('sefariaIndex', compressed)
            localStorage.setItem('sefariaIndexTimestamp', new Date().toISOString())
            localStorage.setItem('sefariaIndexMethod', method)
            console.log(`[Categories] Successfully cached after quota cleanup (${method})`)
          } catch (cleanupErr) {
            console.error('[Categories] Failed to cache even after cleanup. Categories will load from API each time.', cleanupErr)
            // This is not a fatal error - the app can work without cache
          }
        } else {
          console.error('[Categories] Failed to cache to localStorage (non-quota error):', storageErr)
        }
      }
    }
  } catch (err: unknown) {
    // Enhanced error logging
    const errorDetails: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
      errorType: err instanceof Error ? err.constructor.name : typeof err,
    }
    
    if (import.meta.client) {
      errorDetails.browser = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        localStorageAvailable: typeof Storage !== 'undefined',
      }
      
      // Check if it's a fetch error
      if (err && typeof err === 'object') {
        const fetchErr = err as { statusCode?: number; status?: number; statusText?: string; data?: unknown; response?: unknown }
        errorDetails.statusCode = fetchErr.statusCode ?? fetchErr.status
        errorDetails.statusText = fetchErr.statusText
        errorDetails.responseData = fetchErr.data
        errorDetails.response = fetchErr.response
      }
      
      if (err instanceof Error) {
        errorDetails.stack = err.stack
      }
    }
    
    console.error('[Categories] Failed to load categories:', errorDetails)
    
    // Only show error if we don't have any categories loaded
    if (!categories.value || categories.value.length === 0) {
      // Store error details for debugging
      if (import.meta.client) {
        const debugInfo = JSON.stringify(errorDetails, null, 2)
        console.error('[Categories] Full error details:', debugInfo)
        // Store in a ref for potential display in UI
        ;(window as { categoryLoadError?: string }).categoryLoadError = debugInfo
      }
      
      errorMessage.value = 'Sefaria Index Caching Issue: Unable to cache the category index. The program will still work but may be slightly slower.'
      errorDetails.value = errorDetails
      showErrorDialog.value = true
    } else {
      console.warn('[Categories] Error occurred but categories were already loaded. Not showing error dialog.')
    }
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

function onBookSelectFromBrowser (e: { data: CategoryNode }) {
  onBookSelect(e)
}

function onTabOpen (cat: CategoryNode) {
  onCategoryExpand(cat)
}

function onSelectSection (ref: string, title: string) {
  fetchBookContent(ref, title)
}

function onPhraseClick (phrase: string) {
  translateWithOpenAI(phrase, true)
}

function onOpenNote (rowIndex: number, phraseIndex: number) {
  const section = currentPageText.value[rowIndex]
  if (!section) return
  const bookTitle = String(selectedBook.value?.title ?? '')
  const bookPath = selectedBook.value?.path
  const ctx = buildNoteContext(
    section,
    phraseIndex,
    bookTitle,
    bookPath,
    lastSefariaRefAttempted.value ?? '',
    splitIntoPhrases
  )
  if (ctx) openNoteModal(ctx)
}

function onCategoryExpand (category: CategoryNode) {
  if (category.loaded || !category.contents) return
  category.children = category.contents.map((child: Record<string, unknown>) =>
    processNode(child, category.path ?? '')
  )
  category.loaded = true
}

/** Detect if a book needs section selection (TOC) by checking the Sefaria index API. */
async function isComplexBook (book: CategoryNode): Promise<boolean> {
  const ref = String(book.title ?? '').replace(/\s+/g, '_')
  try {
    const indexData = await $fetch<{ schema?: { lengths?: number[]; nodes?: unknown[] } }>(`/api/sefaria/index/${encodeURIComponent(ref)}`)
    if (!indexData?.schema) return false
    const schema = indexData.schema
    if (book.categories?.includes('Talmud') && schema.lengths?.[0] && schema.lengths[0] > 0) return true
    if (schema.lengths?.[0] && schema.lengths[0] > 1) return true
    const sections = processSchemaNodes(schema.nodes ?? [])
    if (sections.length > 0) return true
  } catch {
    // Index not found or failed – fall back to texts API
  }
  try {
    await $fetch(`/api/sefaria/texts/${encodeURIComponent(ref)}`)
    return false
  } catch (err: unknown) {
    const data = (err as { data?: { error?: string } })?.data
    const msg = String(data?.error ?? '')
    return msg.includes('complex') || msg.includes('book-level ref')
  }
}

/** When schema only has Introduction, discover numbered sections by probing the API. */
async function discoverNumberedSectionsFromApi (
  book: { title?: string },
  existingSections: Array<{ ref: string }>,
): Promise<Array<{ ref: string; title: string; heTitle?: string }>> {
  if (existingSections.some(s => s.ref === '1')) return []
  try {
    const introRef = `${book.title}, Introduction`.replace(/\s+/g, '_')
    const intro = await $fetch<{ next?: string; error?: string }>(
      `/api/sefaria/texts/${encodeURIComponent(introRef)}`,
      { method: 'GET' },
    )
    if (intro?.error || !intro?.next) return []
    const nextMatch = intro.next.match(/\s(\d+)$/)
    if (!nextMatch) return []
    const maxSimanim = 60
    return Array.from({ length: maxSimanim }, (_, i) => ({
      ref: String(i + 1),
      title: `Siman ${i + 1}`,
      heTitle: `סימן ${i + 1}`,
    }))
  } catch {
    return []
  }
}

/** Recursively find first lengths array in schema (for numbered simanim/chapters). */
function findSchemaLengths (obj: unknown): number[] | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  if (Array.isArray(o.lengths) && o.lengths.length > 0 && typeof o.lengths[0] === 'number') {
    return o.lengths as number[]
  }
  if (Array.isArray(o.nodes)) {
    for (const n of o.nodes) {
      const found = findSchemaLengths(n)
      if (found) return found
    }
  }
  return null
}

function processSchemaNodes (nodes: unknown[], parentPath = ''): Array<{ ref: string; title: string; heTitle?: string; isContainer?: boolean }> {
  if (!Array.isArray(nodes)) return []
  let sections: Array<{ ref: string; title: string; heTitle?: string; isContainer?: boolean }> = []
  for (const node of nodes as Array<{ titles?: Array<{ lang: string; text: string }>; title?: string; heTitle?: string; key?: string; nodes?: unknown[]; lengths?: number[] }>) {
    const hasText = !!(node.lengths?.[0] && node.lengths[0] > 0)
    const hasChildren = !!(node.nodes && node.nodes.length > 0)
    const isContainer = hasChildren && !hasText
    
    // Add nodes that have titles - either as clickable sections (if they have text or no children)
    // or as container headers (if they have children but no direct text)
    if (node.titles?.length) {
      const enTitle = node.titles.find(t => t.lang === 'en')?.text ?? node.title ?? ''
      const heTitle = node.titles.find(t => t.lang === 'he')?.text ?? node.heTitle
      const baseLabel = enTitle || node.title || node.key || ''
      const cleanKey = baseLabel.toString().replace(/\s*\([^)]*\)/g, '').trim()
      const fullPath = parentPath ? `${parentPath}/${cleanKey}` : cleanKey
      
      // Always add nodes with titles - mark containers as non-clickable
      sections.push({
        ref: fullPath,
        title: enTitle,
        heTitle,
        isContainer: isContainer,
      })
    }
    
    // Handle numbered sections (like Simanim)
    if (node.lengths?.[0] && node.lengths[0] > 0 && !node.nodes?.length) {
      const totalChapters = node.lengths[0]
      for (let n = 1; n <= totalChapters; n++) {
        sections.push({ ref: String(n), title: `Siman ${n}`, heTitle: `סימן ${n}` })
      }
    }
    
    // Recursively process child nodes
    if (node.nodes?.length) {
      const enTitle = node.titles?.find(t => t.lang === 'en')?.text ?? node.title ?? ''
      const baseLabel = enTitle || node.title || node.key || ''
      const cleanKey = baseLabel.toString().replace(/\s*\([^)]*\)/g, '').trim()
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
    const indexData = await $fetch<{ schema?: { lengths?: number[]; nodes?: unknown[]; heSectionNames?: string[] }; alts?: Record<string, unknown> }>(`/api/sefaria/index/${encodeURIComponent(ref)}`)
    if (!indexData?.schema) {
      throw new Error('No schema found')
    }
    if (isTalmud && indexData.schema.lengths?.[0]) {
      // Talmud tractates have an alternate chapter structure that Sefaria
      // uses for the Contents tab (e.g. "Chapter 1; MeEimatai" with a range
      // of dapim under it). This lives in index.alts.Chapters.
      const chaptersAlt = (indexData.alts?.Chapters as { nodes?: Array<Record<string, unknown>> } | undefined)?.nodes

      if (Array.isArray(chaptersAlt) && chaptersAlt.length > 0) {
        const sections: Array<{ ref: string; title: string; heTitle?: string; isContainer?: boolean }> = []

        for (const chapterNode of chaptersAlt) {
          const titles = (chapterNode.titles as Array<{ lang?: string; text?: string; primary?: boolean }> | undefined) ?? []
          const enTitle = titles.find(t => t.lang === 'en' && t.text)?.text ?? 'Chapter'
          const heTitle = titles.find(t => t.lang === 'he' && t.text)?.text
          const chapterLabel = enTitle

          // Add a non-clickable container row for the chapter heading.
          sections.push({
            ref: chapterLabel,
            title: enTitle,
            heTitle,
            isContainer: true,
          })

          // Under each chapter, add the daf refs it covers as clickable leaf nodes.
          // chapterNode.refs is a jagged array of refs; flatten and extract the daf part.
          const rawRefs = chapterNode.refs as unknown
          const flatRefs: string[] = []
          if (Array.isArray(rawRefs)) {
            for (const item of rawRefs) {
              if (Array.isArray(item)) {
                for (const r of item) {
                  if (typeof r === 'string') flatRefs.push(r)
                }
              } else if (typeof item === 'string') {
                flatRefs.push(item)
              }
            }
          }

          for (const r of flatRefs) {
            // Examples: "Berakhot 2a", "Berakhot 7b:1-5", etc.
            const match = r.match(/(\d+[ab])\b/i)
            if (!match) continue
            const daf = match[1]
            sections.push({
              ref: `${chapterLabel}/${daf}`,
              title: `${daf}`,
              heTitle: undefined,
            })
          }
        }

        complexSections.value = sections
      } else {
        // Fallback: no chapter alt-structure; generate a flat daf list.
        const totalAmudim = indexData.schema.lengths[0]
        const sections: Array<{ ref: string; title: string; heTitle?: string }> = []
        const lastDaf = Math.ceil(totalAmudim / 2)
        for (let daf = 2; daf <= lastDaf; daf++) {
          sections.push({ ref: `${daf}a`, title: `${daf}a`, heTitle: `${daf}א` })
          sections.push({ ref: `${daf}b`, title: `${daf}b`, heTitle: `${daf}ב` })
        }
        complexSections.value = sections
      }
    } else if (indexData.schema.lengths?.[0] && indexData.schema.lengths[0] > 0) {
      const isTanakh = book.categories?.includes('Tanakh')
      const topLevelCount = indexData.schema.lengths[0]

      if (isTanakh) {
        const sections: Array<{ ref: string; title: string; heTitle?: string; isContainer?: boolean }> = []

        // Primary chapter list, like Sefaria's "Chapters" grid.
        sections.push({
          ref: '__chapters__',
          title: 'Chapters',
          heTitle: indexData.schema.heSectionNames?.[0] as string | undefined,
          isContainer: true,
        })
        for (let n = 1; n <= topLevelCount; n++) {
          sections.push({
            ref: String(n),
            title: String(n),
          })
        }

        // Torah portions (Parasha alt structure), when available.
        const parashaAlt = (indexData.alts?.Parasha as { nodes?: Array<Record<string, unknown>> } | undefined)?.nodes
        if (Array.isArray(parashaAlt) && parashaAlt.length > 0) {
          sections.push({
            ref: '__parasha__',
            title: 'Torah Portions',
            heTitle: 'פרשיות התורה',
            isContainer: true,
          })

          for (const node of parashaAlt) {
            const wholeRef = typeof node.wholeRef === 'string' ? node.wholeRef : null
            if (!wholeRef) continue
            const titles = (node.titles as Array<{ lang?: string; text?: string; primary?: boolean }> | undefined) ?? []
            const enTitle = titles.find(t => t.lang === 'en' && t.text)?.text ?? (node.title as string | undefined) ?? ''
            const heTitle = titles.find(t => t.lang === 'he' && t.text)?.text ?? (node.heTitle as string | undefined)

            sections.push({
              ref: wholeRef,
              title: enTitle,
              heTitle,
            })
          }
        }

        complexSections.value = sections
      } else {
        // Non‑Tanakh complex book with a simple length array: treat as numbered simanim.
        complexSections.value = Array.from({ length: topLevelCount }, (_, i) => {
          const n = i + 1
          return { ref: String(n), title: `Siman ${n}`, heTitle: `סימן ${n}` }
        })
      }
    } else {
      let sections = processSchemaNodes(indexData.schema.nodes ?? [])
      const lengths = findSchemaLengths(indexData.schema)
      if (sections.length <= 2 && lengths?.[0] && lengths[0] > 1) {
        const numbered = Array.from({ length: lengths[0] }, (_, i) => ({
          ref: String(i + 1),
          title: `Siman ${i + 1}`,
          heTitle: `סימן ${i + 1}`,
        }))
        const existingRefs = new Set(sections.map(s => s.ref))
        const needsNumbered = numbered.some(s => !existingRefs.has(s.ref))
        if (needsNumbered) sections = sections.concat(numbered)
      }
      if (sections.length <= 2) {
        const extra = await discoverNumberedSectionsFromApi(book, sections)
        if (extra.length) sections = sections.concat(extra)
      }
      complexSections.value = sections
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

function isLeafNode (section: { ref: string; isContainer?: boolean }): boolean {
  if (section.isContainer) return false
  const list = complexSections.value ?? []
  const idx = list.findIndex(s => s.ref === section.ref)
  if (idx === -1 || idx === list.length - 1) return true
  const next = list[idx + 1] as { ref: string }
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

async function fetchBookContent (refOverride?: string | null, displayLabel?: string) {
  if (!selectedBook.value) return
  
  // Safety check: don't fetch container nodes (schema-only headers)
  if (refOverride && isComplexBookFlag.value && Array.isArray(complexSections.value)) {
    const section = complexSections.value.find(s => s.ref === refOverride)
    if (section?.isContainer) {
      errorMessage.value = 'This entry is a structural header and has no direct text. Please choose one of the sub-sections instead.'
      showErrorDialog.value = true
      return
    }
  }
  
  // Ensure selectedBook has a path - if not, find it in the index
  const bookWithPath = await ensureBookPath(selectedBook.value)
  if (bookWithPath && bookWithPath.path) {
    selectedBook.value = bookWithPath
  }
  
  loading.value = true
  const bookTitle = String(selectedBook.value.title ?? '')
  const isTalmud = selectedBook.value.categories?.includes('Talmud')
  let chapter: number | string | null = refOverride ? null : 1
  currentChapter.value = null
  let sefariaRef: string
  if (refOverride) {
    const cleanOverride = refOverride.replace(/\s*\([^)]*\)/, '').trim()
    if (isTalmud) {
      // Expect refs like "2a" / "2b" (from our Talmud TOC) or a full ref
      // like "Berakhot 2a". Normalize to a "Book dafSide" shape and then
      // to Sefaria's Berakhot_2a style for the API.
      const match = cleanOverride.match(/(\d+[ab])$/i)
      const dafSide = (match ? match[1] : cleanOverride).toLowerCase()
      sefariaRef = `${bookTitle} ${dafSide}`.replace(/\s+/g, '_')
      currentChapter.value = dafSide
    } else if (isComplexBookFlag.value) {
      // For complex non‑Talmud books we support:
      // - Simple numbered sections (chapters / simanim), where refOverride is
      //   something like "1" or "Chapters/1".
      // - Alternate-structure ranges (e.g. Parasha wholeRefs) where the
      //   refOverride already includes the book name and a verse range,
      //   like "Genesis 1:1-6:8". In that case, use the range as-is.
      if (cleanOverride.includes(':') && cleanOverride.includes(' ')) {
        // Looks like a full Sefaria ref with a range; don't prepend the book title.
        sefariaRef = cleanOverride.replace(/\s+/g, '_')
        // For Torah portions and similar ranges, show both the portion name
        // and the underlying range in the header so users know exactly what
        // they're viewing, e.g. "Lech Lecha – Genesis 12:1-17:27".
        currentChapter.value = displayLabel
          ? `${displayLabel} – ${cleanOverride}`
          : cleanOverride
      } else {
        // refOverride can be: a path (e.g. "Weekday/Shacharit/..."), a full comma-separated ref from API,
        // or "BookTitle ChapterNum" (e.g. "Genesis 23" from response.next for Tanakh). For Tanakh single-chapter
        // refs we must use "Genesis_23" not "Genesis,_Genesis_23" or the API may return a different structure (TOC).
        const bookTitleThenChapter = cleanOverride.match(/^(.+?) (\d+)$/)
        const isSingleChapterRef = bookTitleThenChapter && bookTitleThenChapter[1].trim() === bookTitle
        if (isSingleChapterRef) {
          sefariaRef = `${bookTitle} ${bookTitleThenChapter![2]}`.replace(/\s+/g, '_')
          currentChapter.value = displayLabel ?? bookTitleThenChapter![2]
        } else {
          const commaParts = cleanOverride.split(',').map(p => p.trim()).filter(Boolean)
          const isFullSefariaRef = commaParts.length > 1 && commaParts[0] === bookTitle
          if (isFullSefariaRef) {
            // Already a full ref (e.g. from response.next); deduplicate and use as-is so we don't double the book title.
            sefariaRef = deduplicateTitleSegments(cleanOverride).replace(/\s+/g, '_').replace(/;/g, '_')
            currentChapter.value = displayLabel ?? commaParts.slice(1).join(', ')
          } else {
            const parts = refOverride
              .split('/')
              .map(p => p.replace(/\s*\([^)]*\)/, '').trim())
            if (parts.length === 1 && /^\d+$/.test(parts[0])) {
              sefariaRef = `${bookTitle} ${parts[0]}`.replace(/\s+/g, '_')
              currentChapter.value = displayLabel ?? parts[0]
            } else {
              sefariaRef = `${bookTitle}, ${parts.join(', ')}`.replace(/\s+/g, '_')
              currentChapter.value = displayLabel ?? parts.join(' ')
            }
          }
        }
      }
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

  // Hard guard for known schema-only siddur nodes that Sefaria rejects, e.g. Kaddish Yatom / Chatzi Kaddish.
  // If we detect these refs, treat them as structural headers instead of calling the texts API.
  const sefariaRefLower = sefariaRef.toLowerCase()
  if (
    isComplexBookFlag.value &&
    selectedBook.value?.title === 'Siddur Ashkenaz' &&
    (
      sefariaRefLower.includes('kaddish_yatom') ||
      sefariaRefLower.includes('kaddish yatom') ||
      sefariaRefLower.includes('chatzi_kaddish') ||
      sefariaRefLower.includes('chatzi kaddish')
    ) &&
    refOverride &&
    Array.isArray(complexSections.value)
  ) {
    complexSections.value = complexSections.value.map(section =>
      section.ref === refOverride
        ? { ...section, isContainer: true }
        : section,
    )
    errorMessage.value = 'This entry is a structural header in the siddur and has no direct text. Please choose one of the sub‑sections instead.'
    showErrorDialog.value = true
    loading.value = false
    return
  }
  lastSefariaRefAttempted.value = sefariaRef
  lastSefariaResponse.value = null
  lastSefariaError.value = null
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
    const rawNext = response.next ?? response.firstAvailableSectionRef ?? null
    nextSectionRef.value = rawNext ? deduplicateTitleSegments(rawNext) : null
    lastSefariaResponse.value = response
    if (response.error) {
      errorMessage.value = `API Error: ${response.error}`
      showErrorDialog.value = true
      allVerseData.value = []
      totalRecords.value = 0
      loading.value = false
      return
    }
    let textData: VerseSection[] = []
    const enArr = extractTextArray(response.text)
    const heArr = extractTextArray(response.he)
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
      const isTanakh = selectedBook.value.categories?.includes('Tanakh')
      let displayNumbers: string[]
      let verseNums: number[]
      let useEnArr = enArr
      let useHeArr = heArr
      if (isTanakh) {
        const extractedHe = extractTextAndSections(response.he, sefariaRef)
        const extractedEn = response.text ? extractTextAndSections(response.text, sefariaRef) : null
        const extracted = extractedHe ?? extractedEn
        if (extracted && extracted.sections.length === extracted.texts.length && extracted.texts.length > 0) {
          displayNumbers = extracted.sections
          verseNums = extracted.sections.map(s => {
            const v = s.split(':')[1]
            return v ? parseInt(v, 10) : 1
          })
          useHeArr = extractedHe ? extractedHe.texts : heArr
          useEnArr = extractedEn ? extractedEn.texts : enArr
          if (useEnArr.length !== useHeArr.length) useEnArr = enArr
        } else {
          const rawVerses = (response.verses ?? response.he_verses) as number[] | undefined
          verseNums = (rawVerses != null && rawVerses.length === heArr.length)
            ? rawVerses
            : Array.from({ length: heArr.length }, (_, i) => i + 1)
          displayNumbers = (Array.isArray(response.sections) && response.sections.length === heArr.length && response.sections.every((s): s is string => typeof s === 'string' && /^\d+:\d+$/.test(s)))
            ? (response.sections as string[])
            : buildTanakhDisplayNumbers(sefariaRef, verseNums)
        }
      } else {
        const rawVerses = (response.verses ?? response.he_verses) as number[] | undefined
        verseNums = (rawVerses != null && rawVerses.length === heArr.length)
          ? rawVerses
          : Array.from({ length: heArr.length }, (_, i) => i + 1)
        displayNumbers = heArr.map((_, idx) =>
          (Array.isArray(response.sections) && response.sections[idx] != null)
            ? String(response.sections[idx])
            : String(idx + 1)
        )
      }
      textData = useHeArr.map((he, idx) => ({
        number: verseNums[idx] ?? idx + 1,
        displayNumber: displayNumbers[idx] ?? String(idx + 1),
        en: useEnArr[idx] ?? '',
        he: he ?? ''
      }))
    } else if (enArr.length || heArr.length) {
      const len = Math.max(enArr.length, heArr.length)
      const isTanakh = selectedBook.value.categories?.includes('Tanakh')
      let displayNumbers: string[]
      let verseNums: number[]
      if (isTanakh) {
        const extracted = extractTextAndSections(response.he ?? response.text, sefariaRef)
        if (extracted && extracted.sections.length === extracted.texts.length && extracted.texts.length === len) {
          displayNumbers = extracted.sections
          verseNums = extracted.sections.map(s => parseInt(s.split(':')[1] ?? '1', 10))
        } else {
          const enVerses = response.verses ?? enArr.map((_, i) => i + 1)
          const heVerses = response.he_verses ?? enVerses
          verseNums = Array.from({ length: len }, (_, i) => enVerses[i] ?? heVerses[i] ?? i + 1)
          displayNumbers = buildTanakhDisplayNumbers(sefariaRef, verseNums)
        }
      } else {
        const enVerses = response.verses ?? enArr.map((_, i) => i + 1)
        const heVerses = response.he_verses ?? enVerses
        verseNums = Array.from({ length: len }, (_, i) => enVerses[i] ?? heVerses[i] ?? i + 1)
        displayNumbers = verseNums.map(String)
      }
      textData = Array.from({ length: len }, (_, i) => ({
        number: verseNums[i],
        displayNumber: displayNumbers[i] ?? String(verseNums[i]),
        en: enArr[i] ?? '',
        he: heArr[i] ?? ''
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
    const httpErr = err as { data?: { error?: string }; message?: string }
    const dataError = httpErr?.data?.error ?? ''
    const msg = dataError || httpErr.message || 'Request failed'
    lastSefariaError.value = msg
    lastSefariaResponse.value = err

    // If Sefaria reports that this ref is actually a schema node (no direct text),
    // mark the corresponding section as a non-clickable container so future clicks
    // treat it as a header instead of attempting another texts API call.
    if (
      typeof dataError === 'string' &&
      dataError.includes('schema node ref') &&
      refOverride &&
      isComplexBookFlag.value &&
      Array.isArray(complexSections.value)
    ) {
      complexSections.value = complexSections.value.map(section =>
        section.ref === refOverride
          ? { ...section, isContainer: true }
          : section,
      )
      errorMessage.value = 'This entry is a structural header in the siddur and has no direct text. Please choose one of the sub‑sections instead.'
    } else {
      errorMessage.value = msg
    }

    showErrorDialog.value = true
    allVerseData.value = []
    totalRecords.value = 0
    nextSectionRef.value = null
  } finally {
    loading.value = false
  }
}

/**
 * Ensure selectedBook has a path by looking it up in the index if needed
 */
async function ensureBookPath(book: CategoryNode | null): Promise<CategoryNode | null> {
  if (!book || !book.title) return book
  
  // If path already exists, return as-is
  if (book.path) return book
  
  // Ensure the full index is loaded
  if (!fullIndex.value || (Array.isArray(fullIndex.value) && fullIndex.value.length === 0)) {
    await fetchAndCacheFullIndex()
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Find the book in the index to get its path
  const bookInIndex = findBookByTitle(fullIndex.value as CategoryNode[] | null, book.title)
  if (bookInIndex && bookInIndex.path) {
    // Return book with path from index
    return { ...book, path: bookInIndex.path }
  }
  
  // If not found, return original book (path might be set elsewhere)
  return book
}

async function onBookSelect (event: { data: CategoryNode }) {
  const data = event.data
  if (data.type === 'category') {
    showCategoryDialog.value = true
    return
  }
  
  // Ensure the book has a path before setting it
  const bookWithPath = await ensureBookPath(data)
  selectedBook.value = bookWithPath
  
  allVerseData.value = []
  totalRecords.value = 0
  first.value = 0
  complexSections.value = null
  sectionStack.value = []
  nextSectionRef.value = null
  bookLoadAttempted.value = false // Reset flag before starting load
  const isComplex = await isComplexBook(bookWithPath || data)
  isComplexBookFlag.value = isComplex
  if (isComplex) {
    await fetchComplexBookToc(bookWithPath || data)
  } else {
    await fetchBookContent()
  }
  bookLoadAttempted.value = true // Mark that we've attempted to load
}

/**
 * Close the book view. By default, for complex books (e.g. Tanakh) this may only pop one level
 * (clear current chapter). Pass forceCloseToBookList: true to always return to the main book list
 * (e.g. when the user clicks the Home nav link).
 */
function handleCloseBook (options?: { forceCloseToBookList?: boolean }) {
  const goHome = options?.forceCloseToBookList === true
  showWordListModal.value = false
  showNotesListModal.value = false
  if (goHome) {
    selectedBook.value = null
    allVerseData.value = []
    totalRecords.value = 0
    first.value = 0
    currentChapter.value = null
    complexSections.value = null
    sectionStack.value = []
    isComplexBookFlag.value = false
    bookLoadAttempted.value = false
    return
  }
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
      bookLoadAttempted.value = false
    }
  } else {
    selectedBook.value = null
    allVerseData.value = []
    totalRecords.value = 0
    first.value = 0
    currentChapter.value = null
    complexSections.value = null
    bookLoadAttempted.value = false
  }
}

async function doTranslateApiCall (plainText: string, fullSentence: boolean, sefariaRefOverride?: string | null) {
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  if (!token) return
  translationSefariaRef.value = sefariaRefOverride ?? lastSefariaRefAttempted.value
  translationLoading.value = true
  translationInProgressWordCount.value = Math.max(1, plainText.trim().split(/\s+/).filter(Boolean).length)
  translationData.value = null
  translationError.value = null
  translationMetadata.value = null
  rawTranslationData.value = null
  lastTranslatedInputText.value = plainText
  const startTime = Date.now()
  try {
    const response = await $fetch<{
      model?: string
      output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
    }>('/api/openai/chat', {
      method: 'POST',
      body: { prompt: plainText, model: openaiModel.value, fullSentence },
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
      wordRootTranslation?: string
      rootExamples?: Array<{ word: string; translation: string }>
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
    const durationMs = Date.now() - startTime
    const model = (response as { model?: string })?.model
    const fromCache = (response as { fromCache?: boolean })?.fromCache
    translationMetadata.value = { model, durationMs, fromCache }
    if (import.meta.client) window.getSelection()?.removeAllRanges()
  } catch (err: unknown) {
    translationError.value = err instanceof Error ? err.message : 'Translation failed'
  } finally {
    translationLoading.value = false
    translationInProgressWordCount.value = 0
    showTranslationDialog.value = true
  }
}

function cancelMultiSentenceConfirm () {
  showMultiSentenceConfirmDialog.value = false
  pendingTranslation.value = null
  pendingTranslationSefariaRef.value = null
}

function confirmMultiSentenceContinue () {
  const pending = pendingTranslation.value
  const refToUse = pendingTranslationSefariaRef.value
  if (!pending) {
    showMultiSentenceConfirmDialog.value = false
    return
  }
  showMultiSentenceConfirmDialog.value = false
  pendingTranslation.value = null
  pendingTranslationSefariaRef.value = null
  doTranslateApiCall(pending.plainText, pending.fullSentence, refToUse)
}

function closeLongPhraseSelectionDialog () {
  showLongPhraseSelectionDialog.value = false
  pendingLongPhrase.value = null
  pendingTranslationSefariaRef.value = null
  longPhraseWords.value = []
  longPhraseWordSelected.value = []
}

function toggleLongPhraseWord (index: number) {
  const next = [...longPhraseWordSelected.value]
  next[index] = !next[index]
  longPhraseWordSelected.value = next
}

function translateLongPhraseSelection () {
  const pending = pendingLongPhrase.value
  const text = longPhraseSelectedText.value
  const refToUse = pendingTranslationSefariaRef.value
  if (!pending || !text.trim()) return
  closeLongPhraseSelectionDialog()
  doTranslateApiCall(text.trim(), pending.fullSentence, refToUse)
}

function translateLongPhraseAll () {
  const pending = pendingLongPhrase.value
  const refToUse = pendingTranslationSefariaRef.value
  if (!pending) return
  closeLongPhraseSelectionDialog()
  doTranslateApiCall(pending.plainText, pending.fullSentence, refToUse)
}

async function translateWithOpenAI (text: string, fullSentence = false) {
  const config = useRuntimeConfig()
  const token = config.public.apiAuthToken as string
  if (!token) {
    errorMessage.value = 'API auth token not configured. Set NUXT_PUBLIC_API_AUTH_TOKEN in .env.'
    showErrorDialog.value = true
    return
  }
  const plainText = getPlainTextFromHtml(text)
  if (!plainText) return

  if (hasMultipleSentences(plainText)) {
    pendingTranslationSefariaRef.value = lastSefariaRefAttempted.value
    pendingTranslation.value = { plainText, fullSentence }
    showMultiSentenceConfirmDialog.value = true
    return
  }

  if (countWords(plainText) > longPhraseWordLimit.value) {
    pendingTranslationSefariaRef.value = lastSefariaRefAttempted.value
    pendingLongPhrase.value = { plainText, fullSentence }
    longPhraseWords.value = plainText.trim().split(/\s+/).filter(Boolean)
    longPhraseWordSelected.value = longPhraseWords.value.map(() => false)
    showLongPhraseSelectionDialog.value = true
    return
  }

  await doTranslateApiCall(plainText, fullSentence)
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

// Word List functions
function getWordListButtonClass(index: number): string {
  const state = wordListButtonStates.value[index] || 'default'
  switch (state) {
    case 'loading':
      return 'bg-gray-300 text-gray-600 cursor-wait'
    case 'success':
      return 'bg-green-600 text-white'
    case 'in-list':
      return 'bg-gray-200 text-gray-600 cursor-not-allowed'
    default:
      return 'bg-blue-600 text-white hover:bg-blue-700'
  }
}

function getWordListButtonText(index: number): string {
  const state = wordListButtonStates.value[index] || 'default'
  switch (state) {
    case 'loading':
      return 'Adding...'
    case 'success':
      return 'Added'
    case 'in-list':
      return 'In List'
    default:
      return 'Add'
  }
}

async function addWordToList(index: number) {
  if (!translationData.value || !translationData.value.wordTable || !translationData.value.wordTable[index]) {
    return
  }

  const wordEntry = translationData.value.wordTable[index]
  if (!wordEntry) return

  // Set loading state
  wordListButtonStates.value[index] = 'loading'

  try {
    // Ensure we have a selected book (this should always be true if we're viewing content)
    if (!selectedBook.value) {
      throw new Error('No book selected. Please select a book first.')
    }

    // Ensure selectedBook has a path before saving
    const bookWithPath = await ensureBookPath(selectedBook.value)
    if (bookWithPath) {
      selectedBook.value = bookWithPath
    }
    
    // Get book information from the currently selected book (which came from the index)
    const bookTitle = selectedBook.value.title || ''
    const bookPath = selectedBook.value.path || ''
    
    if (!bookTitle) {
      throw new Error('Book title is missing. Cannot save word.')
    }

    // Build source text reference (use ref tied to this translation when coming from long-phrase/multi-sentence flow)
    const sefariaRefForWord = translationSefariaRef.value ?? lastSefariaRefAttempted.value
    let sourceText = ''
    
    if (selectedBook.value && sefariaRefForWord) {
      // Use the buildSefariaRefForSection function to format the reference properly
      sourceText = buildSefariaRefForSection(sefariaRefForWord)
    } else if (selectedBook.value) {
      // Fallback: just book title and chapter if available
      const parts: string[] = [bookTitle]
      if (currentChapter.value) {
        parts.push(String(currentChapter.value))
      }
      sourceText = parts.filter(Boolean).join(' - ')
    }

    // Store the word data with reliable references
    // We store both bookTitle (for display) and bookPath (for reliable lookup)
    // The sefariaRef is the exact reference used to fetch the content
    const wordData = {
      originalPhrase: translationData.value.originalPhrase,
      translatedPhrase: translationData.value.translatedPhrase,
      wordEntry: wordEntry,
      sourceText: sourceText || undefined,
      bookTitle: bookTitle || undefined, // Title from selectedBook (matches index exactly)
      bookPath: bookPath || undefined,   // Path for more reliable lookup
      sefariaRef: sefariaRefForWord || undefined // Exact Sefaria API reference (preserved from long-phrase selection when applicable)
    }

    await $fetch('/api/word-list/add', {
      method: 'POST',
      body: { wordData }
    })

    // Success state
    wordListButtonStates.value[index] = 'success'

    // After 2-3 seconds, change to "in-list" state
    setTimeout(() => {
      wordListButtonStates.value[index] = 'in-list'
    }, 2500)

    // Refresh word list if modal is open
    if (showWordListModal.value) {
      await fetchWordList()
    }
  } catch (err: any) {
    console.error('Failed to add word to list:', err)
    // Reset to default on error
    wordListButtonStates.value[index] = 'default'
    // Show error message - handle both Error objects and API error responses
    const errorMessage = err?.message || err?.data?.message || 'Failed to add word to list. Please try again.'
    alert(errorMessage)
  }
}

const WORD_LIST_PAGE_SIZE = 100

async function fetchWordList(offset = 0, append = false, archived = false) {
  if (!loggedIn.value) return

  const isArchived = archived
  if (isArchived) {
    archivedWordListLoading.value = true
  } else if (append) {
    wordListLoadingMore.value = true
  } else {
    wordListLoading.value = true
  }
  try {
    const params: { limit: number; offset: number; archived?: string } = {
      limit: WORD_LIST_PAGE_SIZE,
      offset
    }
    if (isArchived) params.archived = '1'

    const response = await $fetch<{
      words: WordListWord[]
      total: number
      limit: number
      offset: number
    }>('/api/word-list', { params })

    const words = response.words || []
    const total = response.total ?? 0

    if (isArchived) {
      archivedWordList.value = words
      archivedWordListTotal.value = total
    } else {
      wordListTotal.value = total
      if (append) {
        wordList.value = [...wordList.value, ...words]
      } else {
        wordList.value = words
      }

      if (!append && translationData.value?.wordTable) {
        translationData.value.wordTable.forEach((row, index) => {
          const isInList = wordList.value.some(w => {
            const entry = w.wordData.wordEntry
            if (!entry?.word || !row.word) return false
            return entry.word.trim() === row.word.trim()
          })
          if (isInList && wordListButtonStates.value[index] !== 'success') {
            wordListButtonStates.value[index] = 'in-list'
          } else if (!isInList && wordListButtonStates.value[index] === 'in-list') {
            wordListButtonStates.value[index] = 'default'
          }
        })
      }
    }
  } catch (err: any) {
    console.error('Failed to fetch word list:', err)
    if (!append && !isArchived) alert('Failed to load word list. Please try again.')
  } finally {
    if (!isArchived) {
      wordListLoading.value = false
      wordListLoadingMore.value = false
    } else {
      archivedWordListLoading.value = false
    }
  }
}

function fetchArchivedWordList() {
  fetchWordList(0, false, true)
}

function loadMoreWordList() {
  fetchWordList(wordList.value.length, true)
}

async function archiveWord(wordId: number) {
  deletingWordId.value = wordId
  try {
    await $fetch(`/api/word-list/${wordId}`, {
      method: 'PATCH',
      body: { archived: true }
    })

    wordList.value = wordList.value.filter(w => w.id !== wordId)
    wordListTotal.value = Math.max(0, wordListTotal.value - 1)

    // Update button states in translation dialog
    if (translationData.value?.wordTable) {
      translationData.value.wordTable.forEach((row, index) => {
        const isInList = wordList.value.some(w => {
          const entry = w.wordData.wordEntry
          if (!entry?.word || !row.word) return false
          return entry.word.trim() === row.word.trim()
        })
        if (!isInList && wordListButtonStates.value[index] === 'in-list') {
          wordListButtonStates.value[index] = 'default'
        }
      })
    }
  } catch (err: any) {
    console.error('Failed to archive word:', err)
    alert(err.data?.message || 'Failed to archive word. Please try again.')
  } finally {
    deletingWordId.value = null
    showDeleteConfirm.value = false
    wordToDelete.value = null
  }
}

async function restoreWord(wordId: number) {
  restoringWordId.value = wordId
  try {
    await $fetch(`/api/word-list/${wordId}`, {
      method: 'PATCH',
      body: { archived: false }
    })
    archivedWordList.value = archivedWordList.value.filter(w => w.id !== wordId)
    archivedWordListTotal.value = Math.max(0, archivedWordListTotal.value - 1)
    await fetchWordList(0, false)
  } catch (err: any) {
    console.error('Failed to restore word:', err)
    alert(err?.data?.message || 'Failed to restore word. Please try again.')
  } finally {
    restoringWordId.value = null
  }
}

async function resetWordProgress(wordId: number) {
  resettingProgressWordId.value = wordId
  try {
    await $fetch(`/api/word-list/${wordId}/progress`, { method: 'DELETE' })
    const w = wordList.value.find(x => x.id === wordId)
    if (w && w.progress) {
      w.progress = undefined
    }
    await fetchWordList(0, false)
  } catch (err: any) {
    console.error('Failed to reset stats:', err)
    alert(err?.data?.message || 'Failed to reset stats. Please try again.')
  } finally {
    resettingProgressWordId.value = null
  }
}

function onWordListViewModeChange(mode: 'active' | 'archived') {
  wordListViewMode.value = mode
  if (mode === 'archived') fetchArchivedWordList()
}

function confirmDeleteWord(wordId: number) {
  wordToDelete.value = wordId
  showDeleteConfirm.value = true
}

function cancelDeleteWord() {
  showDeleteConfirm.value = false
  wordToDelete.value = null
}

async function startStudy() {
  if (wordList.value.length === 0) return
  let sessionSize = 20
  let cardMultiplier = 2
  try {
    const settings = await $fetch<Record<string, string>>('/api/user/settings').catch(() => ({}))
    const n = parseInt(settings?.flashcard_correct_repetitions ?? '2', 10)
    studyCorrectRepetitions.value = Number.isFinite(n) && n >= 0 ? n : 2
    const size = parseInt(settings?.flashcard_session_size ?? '20', 10)
    sessionSize = Number.isFinite(size) && size >= 1 && size <= 200 ? size : 20
    const mult = parseInt(settings?.flashcard_session_card_multiplier ?? '2', 10)
    cardMultiplier = Number.isFinite(mult) && mult >= 1 && mult <= 5 ? mult : 2
  } catch {
    studyCorrectRepetitions.value = 2
  }
  const active = wordList.value.slice(0, sessionSize)
  if (active.length === 0) return
  studyDeck.value = active
  studyMaxCards.value = sessionSize * cardMultiplier
  showWordListModal.value = false
  showStudySession.value = true
}

async function recordStudyShow(wordListId: number) {
  try {
    await $fetch('/api/word-list/progress', {
      method: 'POST',
      body: { wordListId, action: 'show' }
    })
  } catch (e) {
    console.error('Failed to record study show:', e)
  }
}

async function recordStudyCorrect(wordListId: number) {
  try {
    await $fetch('/api/word-list/progress', {
      method: 'POST',
      body: { wordListId, action: 'correct' }
    })
  } catch (e) {
    console.error('Failed to record study correct:', e)
  }
}

/**
 * Recursively find a book by title in the category tree
 * Handles case-insensitive matching and variations
 */
function findBookByTitle(nodes: CategoryNode[] | null | undefined, title: string): CategoryNode | null {
  if (!nodes) return null
  
  // Normalize the search title (trim, lowercase for comparison)
  const normalizedTitle = title.trim().toLowerCase()
  
  for (const node of nodes) {
    // Check if this node matches
    // A book is identified by: type === 'book' OR (has title and no children/contents indicating it's a leaf)
    const isBook = node.type === 'book' || (node.title && !node.children?.length && !node.contents?.length)
    
    if (isBook && node.title) {
      // Case-insensitive comparison
      const nodeTitleNormalized = String(node.title).trim().toLowerCase()
      if (nodeTitleNormalized === normalizedTitle) {
        return node
      }
    }
    
    // Recursively search children/contents
    if (node.children && Array.isArray(node.children)) {
      const found = findBookByTitle(node.children as CategoryNode[], title)
      if (found) return found
    }
    if (node.contents && Array.isArray(node.contents)) {
      const found = findBookByTitle(node.contents as CategoryNode[], title)
      if (found) return found
    }
  }
  return null
}

/**
 * Recursively find a book by path in the category tree
 */
function findBookByPath(nodes: CategoryNode[] | null | undefined, path: string): CategoryNode | null {
  if (!nodes) return null
  
  const normalizedPath = path.trim().toLowerCase()
  
  for (const node of nodes) {
    if (node.path && String(node.path).trim().toLowerCase() === normalizedPath) {
      return node
    }
    
    // Recursively search children/contents
    if (node.children && Array.isArray(node.children)) {
      const found = findBookByPath(node.children as CategoryNode[], path)
      if (found) return found
    }
    if (node.contents && Array.isArray(node.contents)) {
      const found = findBookByPath(node.contents as CategoryNode[], path)
      if (found) return found
    }
  }
  return null
}

/** Derive book title from sefariaRef for legacy notes that don't have bookTitle stored. */
function deriveBookTitleFromSefariaRef (sefariaRef: string): string {
  const commaIdx = sefariaRef.indexOf(',')
  if (commaIdx > 0) return sefariaRef.substring(0, commaIdx).trim().replace(/_/g, ' ')
  const underIdx = sefariaRef.indexOf('_')
  if (underIdx > 0) return sefariaRef.substring(0, underIdx).trim().replace(/_/g, ' ')
  return sefariaRef.replace(/_/g, ' ')
}

/**
 * Shared navigation to a book/section reference. Used by both My Word List and My Notes.
 */
async function navigateToReference (params: {
  bookTitle?: string
  bookPath?: string
  sefariaRef?: string
  highlightWord?: string
}) {
  const bookTitle = params.bookTitle || (params.sefariaRef ? deriveBookTitleFromSefariaRef(params.sefariaRef) : null)
  const bookPath = params.bookPath
  const sefariaRef = params.sefariaRef

  if (!bookTitle && !sefariaRef) {
    console.warn('Cannot navigate: missing bookTitle and sefariaRef')
    return
  }
  if (!bookTitle) {
    console.warn('Cannot navigate: missing bookTitle')
    return
  }

  showWordListModal.value = false
  showNotesListModal.value = false

  if (!fullIndex.value || (Array.isArray(fullIndex.value) && fullIndex.value.length === 0)) {
    await fetchAndCacheFullIndex()
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  let book: CategoryNode | null = null
  if (bookPath) {
    book = findBookByPath(fullIndex.value as CategoryNode[] | null, bookPath)
  }
  if (!book && bookTitle) {
    book = findBookByTitle(fullIndex.value as CategoryNode[] | null, bookTitle)
  }
  if (!book) {
    const similarTitles: string[] = []
    function collectBookTitles(nodes: CategoryNode[] | null | undefined, depth = 0) {
      if (!nodes || depth > 5) return
      for (const node of nodes) {
        const isBook = node.type === 'book' || (node.title && !node.children?.length && !node.contents?.length)
        if (isBook && node.title) similarTitles.push(String(node.title))
        if (node.children) collectBookTitles(node.children as CategoryNode[], depth + 1)
        if (node.contents) collectBookTitles(node.contents as CategoryNode[], depth + 1)
      }
    }
    collectBookTitles(fullIndex.value as CategoryNode[] | null)
    const suggestions = similarTitles
      .filter(t => t.toLowerCase().includes(bookTitle.toLowerCase().substring(0, 3)))
      .slice(0, 5)
    const errorMsg = suggestions.length > 0
      ? `Could not find book "${bookTitle}" in the index. Did you mean: ${suggestions.join(', ')}?`
      : `Could not find book "${bookTitle}" in the index. Please try selecting it manually.`
    alert(errorMsg)
    return
  }

  let refOverride: string | null = null
  if (sefariaRef) {
    const bookTitleLower = bookTitle.toLowerCase()
    const bookTitleNormalized = bookTitle.replace(/\s+/g, '_')
    const bookTitleEscaped = bookTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const bookTitleNormalizedEscaped = bookTitleNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    let match = sefariaRef.match(new RegExp(`^${bookTitleNormalizedEscaped}_(.+)`, 'i'))
    if (match) {
      refOverride = match[1]
    } else {
      match = sefariaRef.match(new RegExp(`^${bookTitleEscaped}\\s+(.+)`, 'i'))
      if (match) refOverride = match[1]
      else {
        const commaIndex = sefariaRef.indexOf(',')
        if (commaIndex > 0) {
          const beforeComma = sefariaRef.substring(0, commaIndex).trim()
          if (beforeComma.toLowerCase() === bookTitleLower || beforeComma.toLowerCase() === bookTitleNormalized.toLowerCase()) {
            refOverride = sefariaRef.substring(commaIndex + 1).trim()
          }
        }
      }
    }
    if (!refOverride && sefariaRef.toLowerCase().startsWith(bookTitleLower)) {
      refOverride = sefariaRef.substring(bookTitle.length).replace(/^[_ ,]+/, '').trim() || null
    }
  }

  const bookWithPath = await ensureBookPath(book)
  await onBookSelect({ data: bookWithPath || book })
  await nextTick()
  const maxWait = 5000
  const startTime = Date.now()
  while (loading.value && (Date.now() - startTime) < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  if (params.highlightWord) {
    wordToHighlight.value = params.highlightWord.trim()
  }
  if (refOverride) {
    await fetchBookContent(refOverride)
  } else {
    await fetchBookContent()
  }
  if (params.highlightWord) {
    const hebrewWord = params.highlightWord.trim()
    await nextTick()
    setTimeout(() => {
      scrollToHighlightedWord(hebrewWord)
      setTimeout(() => { wordToHighlight.value = null }, 5000)
    }, 300)
  }
}

async function navigateToWordReference(word: {
  wordData: {
    bookTitle?: string
    bookPath?: string
    sefariaRef?: string
    sourceText?: string
    wordEntry?: { word?: string }
  }
}) {
  await navigateToReference({
    bookTitle: word.wordData.bookTitle,
    bookPath: word.wordData.bookPath,
    sefariaRef: word.wordData.sefariaRef,
    highlightWord: word.wordData.wordEntry?.word
  })
}

async function navigateToNoteReference(note: {
  bookTitle?: string
  bookPath?: string
  sefariaRef: string
}) {
  await navigateToReference({
    bookTitle: note.bookTitle,
    bookPath: note.bookPath,
    sefariaRef: note.sefariaRef
  })
}

/**
 * Scroll to the highlighted Hebrew word in the displayed text
 */
function scrollToHighlightedWord(hebrewWord: string) {
  if (!hebrewWord) return
  
  // Find all Hebrew text elements (phrases)
  const hebrewElements = document.querySelectorAll('[style*="direction: rtl"] span.cursor-pointer')
  
  for (const element of hebrewElements) {
    const text = element.textContent || ''
    if (phraseContainsWord(text, hebrewWord)) {
      // Scroll to this element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      break
    }
  }
}

const filteredArchivedWordList = computed(() => {
  const query = wordListSearchQuery.value.toLowerCase().trim()
  if (!query) return archivedWordList.value
  return archivedWordList.value.filter(w => {
    const entry = w.wordData?.wordEntry
    const word = (entry?.word ?? '').toLowerCase()
    const trans = (entry?.wordTranslation ?? '').toLowerCase()
    return word.includes(query) || trans.includes(query)
  })
})

const filteredWordList = computed(() => {
  const query = wordListSearchQuery.value.toLowerCase().trim()
  if (!query) return wordList.value

  return wordList.value.filter(word => {
    const data = word.wordData
    const entry = data.wordEntry || {}

    // Only search Hebrew word and English translation
    // Check Hebrew word
    if (entry.word?.toLowerCase().includes(query)) return true
    // Check English translation
    if (entry.wordTranslation?.toLowerCase().includes(query)) return true

    return false
  })
})

// Watch for translation dialog opening to check which words are already in list
watch(showTranslationDialog, async (isOpen) => {
  if (isOpen && loggedIn.value) {
    await fetchWordList()
  }
})

// Watch for word list modal opening to fetch words
watch(showWordListModal, async (isOpen) => {
  if (isOpen && loggedIn.value) {
    await fetchWordList()
  }
})

// Load user settings when logged in (e.g. long phrase threshold for translation)
watch(loggedIn, async (isLoggedIn) => {
  if (!isLoggedIn) {
    longPhraseWordLimit.value = 8
    return
  }
  try {
    const settings = await $fetch<Record<string, string>>('/api/user/settings').catch(() => ({}))
    const n = parseInt(settings?.long_phrase_word_limit ?? '8', 10)
    const allowed = [5, 8, 10, 15, 20, 50]
    longPhraseWordLimit.value = Number.isFinite(n) && allowed.includes(n) ? n : 8
  } catch {
    longPhraseWordLimit.value = 8
  }
}, { immediate: true })

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

const { updateSupportRefs, clearSupportView } = useSupportPageContext()
watch([lastSefariaRefAttempted, selectedBook], () => {
  const sefariaRef = lastSefariaRefAttempted.value
  const book = selectedBook.value
  if (sefariaRef && book) {
    updateSupportRefs({
      sefariaRef,
      bookTitle: book.title ?? null,
      bookPath: book.path ?? null
    })
  } else {
    updateSupportRefs({ sefariaRef: null, bookTitle: null, bookPath: null })
  }
}, { immediate: true })

// When Home nav is clicked (/?home=1) while already on main page, return to book list and clean URL
watch(() => ({ path: route.path, home: route.query.home }), async ({ path, home }) => {
  if (path !== '/' || home !== '1') return
  handleCloseBook({ forceCloseToBookList: true })
  const q = { ...route.query }
  delete q.home
  await router.replace({ path: '/', query: Object.keys(q).length ? q : undefined })
}, { immediate: false })

onUnmounted(() => {
  clearSupportView()
})

onMounted(async () => {
  // Fetch user session to ensure isAdmin is properly computed
  console.log('[Auth Debug] Fetching session...')
  try {
    await fetchSession()
    console.log('[Auth Debug] Session fetched. User:', user.value, 'isAdmin:', isAdmin.value)
  } catch (err) {
    console.error('[Auth Debug] Error fetching session:', err)
  }
  
  // Load lz-string compression library if available
  if (import.meta.client && typeof window !== 'undefined') {
    try {
      // Try to dynamically import lz-string
      const LZString = await import('lz-string').then(m => m.default || m)
      // @ts-expect-error - adding to window for global access
      window.LZString = LZString
      console.log('[Categories] Compression library loaded (lz-string)')
    } catch (err) {
      // lz-string not installed or failed to load - compression will be disabled
      console.log('[Categories] Compression library not available. Install lz-string for better cache compression: npm install lz-string')
    }
  }
  
  fetchAndCacheFullIndex()
  fetchLatestModel()

  // Support navigation from Concordance Word Explorer "Open in text" link (/?navigateRef=...&highlightWord=...)
  const navigateRef = route.query.navigateRef as string | undefined
  const highlightWord = route.query.highlightWord as string | undefined
  if (navigateRef && typeof navigateRef === 'string') {
    await navigateToReference({
      sefariaRef: navigateRef,
      highlightWord: highlightWord && typeof highlightWord === 'string' ? highlightWord : undefined,
    })
    if (import.meta.client && typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.delete('navigateRef')
      url.searchParams.delete('highlightWord')
      window.history.replaceState({}, '', url.pathname + (url.search || ''))
    }
  }

  // Support "Home" nav link (/?home=1): return to book list and clean URL
  if (route.path === '/' && route.query.home === '1') {
    handleCloseBook({ forceCloseToBookList: true })
    const q = { ...route.query }
    delete q.home
    await router.replace({ path: '/', query: Object.keys(q).length ? q : undefined })
  }

  // Expose debug helper to window for console access
  if (import.meta.client) {
    ;(window as { getCategoryLoadError?: () => string | undefined }).getCategoryLoadError = () => {
      return (window as { categoryLoadError?: string }).categoryLoadError
    }
    console.log('[Categories] Debug helper available: window.getCategoryLoadError()')
  }
})
</script>
