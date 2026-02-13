<template>
  <div class="border border-gray-200 rounded-lg bg-white overflow-hidden">
    <div class="border-b border-gray-200 bg-gray-50">
      <!-- Mobile: Stacked layout -->
      <div class="flex flex-col sm:hidden p-3 gap-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0">{{ selectedBookTitle }}{{ currentChapter ? ` (${currentChapter})` : '' }}</span>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg transition-all duration-150 shrink-0 inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="$emit('close-book')"
          >
            ← Back
          </button>
        </div>
        <div v-if="loggedIn" class="flex items-center gap-2">
          <button
            type="button"
            class="flex-1 px-2 py-1.5 text-xs font-medium border rounded-lg transition-all duration-150 inline-flex items-center justify-center gap-1 min-h-[36px]"
            :class="showWordListModal
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
            @click="$emit('open-word-list')"
          >
            <span class="text-sm leading-none">📚</span>
            <span>Word List</span>
          </button>
          <button
            type="button"
            class="flex-1 px-2 py-1.5 text-xs font-medium border rounded-lg transition-all duration-150 inline-flex items-center justify-center gap-1 min-h-[36px]"
            :class="showNotesListModal
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
            @click="$emit('open-notes-list')"
          >
            <span class="text-sm leading-none">📝</span>
            <span>Notes</span>
          </button>
        </div>
      </div>
      <!-- Desktop: Horizontal layout -->
      <div class="hidden sm:flex justify-between items-center p-4">
        <span class="font-semibold text-gray-900">{{ selectedBookTitle }}{{ currentChapter ? ` (${currentChapter})` : '' }}</span>
        <div class="flex items-center gap-3">
          <button
            v-if="loggedIn"
            type="button"
            class="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px]"
            :class="showWordListModal
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
            @click="$emit('open-word-list')"
          >
            <span class="text-base leading-none">📚</span>
            <span>My Word List</span>
          </button>
          <button
            v-if="loggedIn"
            type="button"
            class="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px]"
            :class="showNotesListModal
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
            @click="$emit('open-notes-list')"
          >
            <span class="text-base leading-none">📝</span>
            <span>My Notes</span>
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="$emit('close-book')"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
    <div class="p-4">
      <div v-if="loading" class="text-center py-8 text-gray-500">Loading…</div>
      <!-- Complex book: section list -->
      <div v-else-if="showSectionList" class="space-y-6">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <button
            v-if="sectionStackLength > 0"
            type="button"
            class="px-2 py-1 text-xs font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="$emit('go-back-section')"
          >
            ← Back
          </button>
          <span class="font-semibold text-sm text-gray-800">Select a section:</span>
          <button
            type="button"
            class="ml-2 px-2 py-1 text-xs font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="$emit('open-section-list-debug')"
          >
            Debug
          </button>
        </div>

        <div class="space-y-6">
          <div
            v-for="group in complexSectionGroups"
            :key="group.header?.ref || (group.items[0]?.ref ?? 'group')"
            class="border border-gray-100 rounded-lg bg-gray-50/60 p-3 md:p-4 shadow-sm"
          >
            <div
              v-if="group.header"
              class="flex items-baseline justify-between gap-2 mb-2"
            >
              <div class="text-sm md:text-base font-semibold text-gray-900">
                {{ group.header.title }}
                <span v-if="group.header.heTitle" class="text-gray-600 font-normal">
                  / {{ group.header.heTitle }}
                </span>
              </div>
            </div>

            <div
              class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5 md:gap-2"
            >
              <button
                v-for="section in group.items"
                :key="section.ref"
                type="button"
                class="px-2 py-1 md:px-2.5 md:py-1.5 rounded-md border text-xs md:text-sm font-medium
                       bg-white text-blue-700 border-blue-100 shadow-sm
                       hover:bg-blue-50 hover:border-blue-400 hover:text-blue-900
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                @click="$emit('select-section', section.ref, section.title)"
              >
                {{ getSectionDisplayTitle(section) }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="showBookNotAvailable" class="text-center py-8 text-gray-500">
        <p class="mb-4">This book is not available via the API, or you need to select a section. Try another book or section.</p>
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          @click="$emit('open-book-load-debug')"
        >
          Show debug info
        </button>
      </div>
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs text-gray-500">
            Click on any Hebrew phrase to get a word-by-word translation from OpenAI with grammar explanations. Phrases are delimited by punctuation—clicking before a comma, period, or other punctuation will translate the phrase from the start up to that punctuation mark.
          </p>
          <button
            type="button"
            class="px-2 py-1 text-xs font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="$emit('open-content-debug')"
          >
            Debug
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div class="font-medium text-gray-500">English</div>
          <div class="font-medium text-gray-500 text-right" style="direction: rtl">Hebrew</div>
        </div>
        <template v-for="(section, index) in currentPageText" :key="'v-' + index">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-4 last:border-0">
            <div class="select-none">
              <span class="text-gray-500 mr-2 pointer-events-none cursor-default">{{ section.displayNumber }}</span>
              <span
                v-for="(phrase, pIdx) in splitIntoPhrases(section.en)"
                :key="pIdx"
                class="cursor-default text-gray-700"
              >{{ phrase }} </span>
            </div>
            <div class="text-right text-lg select-none" style="direction: rtl">
              <span class="text-gray-500 ml-2 text-sm pointer-events-none cursor-default">{{ section.displayNumber }}</span>
              <span
                v-for="(phrase, pIdx) in splitIntoPhrases(section.he)"
                :key="pIdx"
                class="inline-flex items-center gap-0.5 align-baseline"
              >
                <span
                  :class="[
                    'hover:bg-blue-50 cursor-pointer rounded px-0.5 transition-colors',
                    wordToHighlight && phraseContainsWord(phrase, wordToHighlight) ? 'bg-yellow-300 font-semibold' : ''
                  ]"
                  @click="$emit('phrase-click', phrase, true)"
                >{{ phrase }} </span>
                <button
                  v-if="loggedIn"
                  type="button"
                  class="shrink-0 p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors align-middle"
                  title="Add note"
                  aria-label="Add note for this phrase"
                  @click.stop="$emit('open-note', index, pIdx)"
                >
                  <span class="text-sm" aria-hidden="true">📝</span>
                </button>
              </span>
            </div>
          </div>
        </template>
        <!-- Pagination -->
        <div v-if="totalRecords > rowsPerPage" class="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            class="px-3 py-1 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="first === 0"
            @click="$emit('update:first', Math.max(0, first - rowsPerPage))"
          >
            Prev
          </button>
          <span class="text-sm text-gray-600">
            {{ first + 1 }}–{{ Math.min(first + rowsPerPage, totalRecords) }} of {{ totalRecords }}
          </span>
          <button
            type="button"
            class="px-3 py-1 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="first + rowsPerPage >= totalRecords"
            @click="$emit('update:first', Math.min(first + rowsPerPage, totalRecords - 1))"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

export interface VerseSection {
  displayNumber: string | number
  en: string
  he: string
  number?: number
}

export interface SectionRef {
  ref: string
  title: string
  heTitle?: string
}

export interface ComplexSectionGroup {
  header: SectionRef | null
  items: SectionRef[]
}

defineProps<{
  selectedBookTitle: string
  currentChapter: string | number | null
  loading: boolean
  showSectionList: boolean
  showBookNotAvailable: boolean
  sectionStackLength: number
  complexSectionGroups: ComplexSectionGroup[]
  currentPageText: VerseSection[]
  totalRecords: number
  rowsPerPage: number
  first: number
  wordToHighlight: string | null
  loggedIn: boolean
  showWordListModal: boolean
  showNotesListModal: boolean
  splitIntoPhrases: (segment: string) => string[]
  phraseContainsWord: (phrase: string, word: string) => boolean
  getSectionDisplayTitle: (section: SectionRef) => string
}>()

const { setSupportView, clearSupportView } = useSupportPageContext()
onMounted(() => setSupportView(SUPPORT_VIEW_NAMES.BOOK_READER))
onUnmounted(() => clearSupportView())

defineEmits<{
  'close-book': []
  'open-word-list': []
  'open-notes-list': []
  'select-section': [ref: string, title: string]
  'go-back-section': []
  'open-section-list-debug': []
  'open-book-load-debug': []
  'open-content-debug': []
  'phrase-click': [phrase: string, fromHebrew: boolean]
  'open-note': [rowIndex: number, phraseIndex: number]
  'update:first': [value: number]
}>()
</script>
