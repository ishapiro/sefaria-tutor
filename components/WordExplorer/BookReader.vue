<template>
  <div class="border border-gray-200 rounded-lg bg-white overflow-hidden">
    <div class="border-b border-gray-200 bg-gray-50">
      <!-- Mobile: Stacked layout (compact) -->
      <div class="flex flex-col sm:hidden p-2 gap-1.5">
        <div class="flex items-center justify-between gap-1.5 flex-wrap">
          <span class="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0 order-1">{{ selectedBookTitle }}{{ currentChapter ? ` (${currentChapter})` : '' }}</span>
          <div class="flex items-center gap-1 shrink-0 order-2">
            <button
              type="button"
              class="px-2 py-1 text-xs font-medium border border-green-500 rounded-md transition-all duration-150 inline-flex items-center gap-1 min-h-[32px] bg-white text-gray-700 hover:bg-green-50 hover:border-green-600"
              title="Usage"
              @click="showUsageModal = true"
            >
              Usage
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs font-medium border border-gray-300 rounded-md transition-all duration-150 inline-flex items-center gap-1 min-h-[32px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              :title="showEnglishColumn ? 'Hide English translation' : 'Show English translation'"
              aria-label="Toggle English column"
              @click="showEnglishColumn = !showEnglishColumn"
            >
              <span class="text-sm leading-none" aria-hidden="true">🔤</span>
              <span>{{ showEnglishColumn ? 'Hide EN' : 'Show EN' }}</span>
            </button>
            <button
              v-if="showReturnButton"
              type="button"
              class="px-2 py-1 text-xs font-medium border border-blue-500 rounded-md transition-all duration-150 inline-flex items-center gap-1 min-h-[32px] bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-600 max-w-[120px]"
              :title="returnToRefShort ? `Return to ${returnToRefShort}` : 'Return to original verse'"
              @click="$emit('return-to-origin')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span class="truncate text-[10px] leading-tight" :title="returnToRefShort ?? ''">{{ returnToRefShort ?? '…' }}</span>
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs font-medium border border-gray-300 rounded-md transition-all duration-150 inline-flex items-center min-h-[32px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              @click="$emit('close-book')"
            >
              ← Back
            </button>
          </div>
        </div>
        <div v-if="loggedIn" class="flex items-center gap-1.5">
          <button
            type="button"
            class="flex-1 px-2 py-1 text-xs font-medium border rounded-md transition-all duration-150 inline-flex items-center justify-center gap-1 min-h-[32px]"
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
            class="flex-1 px-2 py-1 text-xs font-medium border rounded-md transition-all duration-150 inline-flex items-center justify-center gap-1 min-h-[32px]"
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
            type="button"
            class="px-4 py-2 text-sm font-medium border border-green-500 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px] bg-white text-gray-700 hover:bg-green-50 hover:border-green-600"
            title="Usage"
            @click="showUsageModal = true"
          >
            Usage
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            :title="showEnglishColumn ? 'Hide English translation' : 'Show English translation'"
            @click="showEnglishColumn = !showEnglishColumn"
          >
            <span class="text-base leading-none" aria-hidden="true">🔤</span>
            <span>{{ showEnglishColumn ? 'Hide English' : 'Show English' }}</span>
          </button>
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
            v-if="showReturnButton"
            type="button"
            class="px-3 py-2 text-sm font-medium border border-blue-500 rounded-lg transition-all duration-150 inline-flex items-center gap-1.5 min-h-[36px] bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-600 max-w-[140px]"
            :title="returnToRefShort ? `Return to ${returnToRefShort}` : 'Return to original verse'"
            @click="$emit('return-to-origin')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span class="truncate text-xs leading-tight" :title="returnToRefShort ?? ''">{{ returnToRefShort ?? '…' }}</span>
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
    <div class="p-3 sm:p-4">
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
              class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 md:gap-2"
            >
              <button
                v-for="section in group.items"
                :key="section.ref"
                type="button"
                class="px-2 py-1 md:px-2.5 md:py-1.5 rounded-md border text-[11px] md:text-xs lg:text-sm font-medium
                       bg-white text-blue-700 border-blue-100 shadow-sm text-center leading-tight break-words
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
      <div
        v-else
        class="space-y-4 touch-pan-y"
        @touchstart.passive="onSwipeStart"
        @touchend="onSwipeEnd"
      >
        <div class="flex items-center gap-2 flex-wrap -mt-0.5">
          <button
            type="button"
            class="px-2 py-1 text-xs font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="$emit('open-content-debug')"
          >
            Debug
          </button>
        </div>
        <!-- Original verse (Torah/Tanakh only) when viewing a commentary; desktop/tablet only, not mobile -->
        <div
          v-if="showOriginVerse && (originVerseHe || originVerseEn)"
          class="hidden sm:grid gap-2 sm:gap-4 border-b border-gray-200 pb-4 mb-1 bg-amber-50/50 rounded-lg px-3 py-3"
          :class="showEnglishColumn ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'"
        >
          <p class="col-span-full text-xs font-semibold text-amber-800 mb-1">Original verse</p>
          <div
            class="text-right text-lg select-none verse-hebrew-column order-1 md:order-2"
            style="direction: rtl"
          >
            <span v-if="originVerseHe" class="text-gray-800">{{ originVerseHe }}</span>
          </div>
          <div
            v-if="showEnglishColumn && originVerseEn"
            class="select-none verse-english-column order-2 md:order-1"
          >
            <span
              class="cursor-default text-gray-700 verse-english-html text-sm"
              v-html="sanitizeSefariaVerseHtml(originVerseEn)"
            />
          </div>
        </div>
        <template v-for="(section, index) in currentPageText" :key="'v-' + index">
          <div
            class="grid gap-2 sm:gap-4 border-b border-gray-100 pb-4 last:border-0"
            :class="showEnglishColumn ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'"
          >
<div
            class="text-right text-lg select-none verse-hebrew-column order-1 md:order-2"
            style="direction: rtl"
          >
              <span class="text-gray-500 ml-2 text-sm pointer-events-none cursor-default">{{ section.displayNumber }}</span>
              <button
                type="button"
                class="shrink-0 mr-1 p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors align-middle inline-flex touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 items-center justify-center"
                title="Commentaries & links"
                aria-label="View commentaries and links for this verse"
                @click.stop="$emit('open-commentaries', index)"
                @touchstart.passive.stop
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              <span
                v-for="(phrase, pIdx) in splitIntoPhrases(section.he)"
                :key="pIdx"
                class="inline-flex items-center gap-0.5 align-baseline"
              >
                <span
                  :class="[
                    'phrase-token cursor-pointer rounded px-0.5 transition-colors',
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
            <div
              v-if="showEnglishColumn"
              class="select-none verse-english-column order-2 md:order-1"
            >
              <span class="text-gray-500 mr-2 pointer-events-none cursor-default hidden md:inline">{{ section.displayNumber }}</span>
              <span
                class="cursor-default text-gray-700 verse-english-html"
                v-html="sanitizeSefariaVerseHtml(section.en)"
              />
            </div>
          </div>
        </template>
        <!-- Pagination (multiple pages): mobile = 2 lines (Prev+Next, then range); desktop = 1 row -->
        <div v-if="totalRecords > rowsPerPage" class="pt-4 border-t border-gray-200">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <!-- Line 1 (mobile) / left (desktop): Prev and Next on same row -->
            <div class="flex items-center justify-between sm:contents">
              <div class="flex items-center gap-2">
                <button
                  v-if="first === 0 && prevSectionRef"
                  type="button"
                  class="px-3 py-1 text-sm font-medium border border-blue-300 rounded-lg transition-all duration-150 inline-flex items-center bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-400 shrink-0 whitespace-nowrap"
                  :title="prevSectionTitle ? `Go to ${prevSectionTitle}` : 'Go to previous section'"
                  @click="$emit('select-section', prevSectionRef, prevSectionTitle ?? '', true)"
                >
                  <span class="lg:hidden">Prev {{ lastSegment(prevSectionTitle) }}</span>
                  <span v-if="prevSectionTitle" class="hidden lg:inline">
                    Prev Chapter
                    <span class="ml-1 inline-block min-w-0 max-w-[min(140px,calc(100vw-14rem))] truncate align-middle max-w-none" :title="prevSectionTitle">({{ prevSectionTitle }})</span>
                  </span>
                  <span v-else class="hidden lg:inline">Prev Chapter</span>
                </button>
                <button
                  v-else
                  type="button"
                  class="px-3 py-1 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
                  :disabled="first === 0"
                  @click="$emit('update:first', Math.max(0, first - rowsPerPage))"
                >
                  Prev
                </button>
              </div>
              <div class="flex items-center justify-end gap-2 sm:order-3">
                <button
                  v-if="isOnLastPage && nextSectionRef"
                  type="button"
                  class="px-3 py-1 text-sm font-medium border border-blue-300 rounded-lg transition-all duration-150 inline-flex items-center bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-400 shrink-0 whitespace-nowrap"
                  :title="nextSectionTitle ? `Go to ${nextSectionTitle}` : 'Go to next chapter'"
                  @click="$emit('select-section', nextSectionRef, nextSectionTitle ?? '', false)"
                >
                  <span class="lg:hidden">Next {{ lastSegment(nextSectionTitle) }}</span>
                  <span v-if="nextSectionTitle" class="hidden lg:inline">
                    Next Chapter
                    <span class="ml-1 inline-block min-w-0 max-w-[min(140px,calc(100vw-14rem))] truncate align-middle max-w-none" :title="nextSectionTitle">({{ nextSectionTitle }})</span>
                  </span>
                  <span v-else class="hidden lg:inline">Next Chapter</span>
                </button>
                <button
                  v-else
                  type="button"
                  class="px-3 py-1 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
                  :disabled="first + rowsPerPage >= totalRecords"
                  @click="$emit('update:first', Math.min(first + rowsPerPage, totalRecords - 1))"
                >
                  Next
                </button>
              </div>
            </div>
            <!-- Line 2 (mobile) / center (desktop): page range -->
            <div class="text-sm text-gray-600 text-center whitespace-nowrap sm:order-2">
              {{ first + 1 }}–{{ Math.min(first + rowsPerPage, totalRecords) }} of {{ totalRecords }}
            </div>
          </div>
        </div>

        <!-- Single page: show Prev/Next Section buttons when there are adjacent sections -->
        <div
          v-else-if="totalRecords > 0 && (prevSectionRef || nextSectionRef)"
          class="pt-4 border-t border-gray-200"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2">
              <button
                v-if="prevSectionRef"
                type="button"
                class="px-3 py-1 text-sm font-medium border border-blue-300 rounded-lg transition-all duration-150 inline-flex items-center bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-400 shrink-0 whitespace-nowrap"
                :title="prevSectionTitle ? `Go to ${prevSectionTitle}` : 'Go to previous section'"
                @click="$emit('select-section', prevSectionRef, prevSectionTitle ?? '', true)"
              >
                <span class="lg:hidden">Prev {{ lastSegment(prevSectionTitle) }}</span>
                <span v-if="prevSectionTitle" class="hidden lg:inline">
                  Prev Section
                  <span class="ml-1 inline-block min-w-0 max-w-[min(140px,calc(100vw-14rem))] truncate align-middle max-w-none" :title="prevSectionTitle">({{ prevSectionTitle }})</span>
                </span>
                <span v-else class="hidden lg:inline">Prev Section</span>
              </button>
            </div>
            <div class="flex items-center justify-end gap-2">
              <button
                v-if="nextSectionRef"
                type="button"
                class="px-3 py-1 text-sm font-medium border border-blue-300 rounded-lg transition-all duration-150 inline-flex items-center bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-400 shrink-0 whitespace-nowrap"
                :title="nextSectionTitle ? `Go to ${nextSectionTitle}` : 'Go to next section'"
                @click="$emit('select-section', nextSectionRef, nextSectionTitle ?? '', false)"
              >
                <span class="lg:hidden">Next {{ lastSegment(nextSectionTitle) }}</span>
                <span v-if="nextSectionTitle" class="hidden lg:inline">
                  Next Section
                  <span class="ml-1 inline-block min-w-0 max-w-[min(140px,calc(100vw-14rem))] truncate align-middle max-w-none" :title="nextSectionTitle">({{ nextSectionTitle }})</span>
                </span>
                <span v-else class="hidden lg:inline">Next Section</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Usage modal -->
    <div
      v-if="showUsageModal"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
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
            <strong>How to get word-by-word translations:</strong> Tap or click any Hebrew or Aramaic phrase in the text. The app sends that phrase to OpenAI and shows you a breakdown with each word’s meaning, root, part of speech, and grammar notes.
          </p>
          <p>
            <strong>What counts as a phrase?</strong> Phrases are split by punctuation. Everything from the start of the segment up to the next comma, period, semicolon, or similar mark is treated as one phrase. So clicking right before a comma translates from the beginning of that line or verse up to that comma.
          </p>
          <p>
            <strong>Commentaries and links:</strong> Next to each verse you’ll see a
            <span class="inline-flex align-middle mx-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </span>
            link icon. Click it to open a list of related commentaries and links from Sefaria. Choose one to jump to that text; you can then use the return button in the header to go back to your original verse.
          </p>
          <p>
            <strong>Return button:</strong> When you’ve opened a commentary from a verse, a
            <span class="inline-flex align-middle mx-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </span>
            <span class="text-xs text-gray-500">23:1</span> button appears in the header. It shows the verse you came from (e.g. 23:1 or 14b). Click it to go back to that verse in the original book.
          </p>
          <p>
            <strong>Tips:</strong> Use “Hide English” to focus on the Hebrew only. Use the 📝 button next to a phrase to add a personal note (when signed in). From “My Word List” you can study saved words with flashcards.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'
import { sanitizeSefariaVerseHtml } from '~/utils/text'

const STORAGE_KEY_SHOW_ENGLISH = 'book-reader-show-english'
/** Default: show both English and Hebrew columns. Only hide English when user has chosen to. */
const DEFAULT_SHOW_ENGLISH = true

function getStoredShowEnglish (): boolean {
  if (typeof window === 'undefined') return DEFAULT_SHOW_ENGLISH
  try {
    const v = localStorage.getItem(STORAGE_KEY_SHOW_ENGLISH)
    if (v === null) return DEFAULT_SHOW_ENGLISH
    return v === '1' || v === 'true'
  } catch {
    return DEFAULT_SHOW_ENGLISH
  }
}

function setStoredShowEnglish (value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY_SHOW_ENGLISH, value ? '1' : '0')
  } catch {
    // ignore
  }
}

const showEnglishColumn = ref(typeof window !== 'undefined' ? getStoredShowEnglish() : DEFAULT_SHOW_ENGLISH)
watch(showEnglishColumn, (v) => setStoredShowEnglish(v))

const showUsageModal = ref(false)

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

const props = defineProps<{
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
  nextSectionRef: string | null
  nextSectionTitle: string | null
  prevSectionRef: string | null
  prevSectionTitle: string | null
  wordToHighlight: string | null
  loggedIn: boolean
  showWordListModal: boolean
  showNotesListModal: boolean
  splitIntoPhrases: (segment: string) => string[]
  phraseContainsWord: (phrase: string, word: string) => boolean
  getSectionDisplayTitle: (section: SectionRef) => string
  getVerseSefariaRef: (sectionIndex: number) => string | null
  showReturnButton: boolean
  /** Short label for the return button (e.g. "23:1", "14b"). */
  returnToRefShort: string | null
  /** When viewing a Torah/Tanakh commentary, show the original verse at top. */
  showOriginVerse: boolean
  originVerseHe: string | null
  originVerseEn: string | null
}>()

const isOnLastPage = computed(() =>
  props.first + props.rowsPerPage >= props.totalRecords
)

/** For mobile only: show just the last segment of a section title (e.g. "Berakhot, 14b" → "14b"). Display only. */
function lastSegment (title: string | null | undefined): string {
  if (!title) return ''
  const parts = title.split(/[,;/]/).map(s => s.trim()).filter(Boolean)
  return parts.length ? parts[parts.length - 1]! : title
}

/**
 * Swipe navigation (mobile): horizontal swipe changes page/section.
 * We do not use .passive on touchend so we can preventDefault() only when we treat
 * the gesture as a swipe; that way a tap (minimal movement) still fires the click
 * on the phrase and tap-to-translate works.
 */
const swipeStart = ref<{ x: number; y: number } | null>(null)
const SWIPE_MIN_PX = 50

function onSwipeStart (e: TouchEvent) {
  if (e.touches.length === 0) return
  swipeStart.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
}

function onSwipeEnd (e: TouchEvent) {
  const start = swipeStart.value
  swipeStart.value = null
  if (!start || !e.changedTouches?.length) return
  const end = e.changedTouches[0]
  const deltaX = end.clientX - start.x
  const deltaY = end.clientY - start.y
  if (Math.abs(deltaX) < SWIPE_MIN_PX) return
  if (Math.abs(deltaY) >= Math.abs(deltaX)) return
  e.preventDefault()
  if (deltaX > 0) {
    goPrev()
  } else {
    goNext()
  }
}

const emit = defineEmits<{
  'close-book': []
  'open-word-list': []
  'open-notes-list': []
  'select-section': [ref: string, title: string, isPrevSection?: boolean]
  'go-back-section': []
  'open-section-list-debug': []
  'open-book-load-debug': []
  'open-content-debug': []
  'phrase-click': [phrase: string, fromHebrew: boolean]
  'open-note': [rowIndex: number, phraseIndex: number]
  'open-commentaries': [sectionIndex: number]
  'return-to-origin': []
  'update:first': [value: number]
}>()

/** Navigate to previous page or previous section (same logic as Prev button). */
function goPrev () {
  if (props.totalRecords > props.rowsPerPage) {
    if (props.first === 0 && props.prevSectionRef) {
      emit('select-section', props.prevSectionRef, props.prevSectionTitle ?? '', true)
    } else if (props.first > 0) {
      emit('update:first', Math.max(0, props.first - props.rowsPerPage))
    }
  } else if (props.prevSectionRef) {
    emit('select-section', props.prevSectionRef, props.prevSectionTitle ?? '', true)
  }
}

/** Navigate to next page or next section (same logic as Next button). */
function goNext () {
  if (props.totalRecords > props.rowsPerPage) {
    if (isOnLastPage.value && props.nextSectionRef) {
      emit('select-section', props.nextSectionRef, props.nextSectionTitle ?? '', false)
    } else if (!isOnLastPage.value) {
      emit('update:first', Math.min(props.first + props.rowsPerPage, props.totalRecords - 1))
    }
  } else if (props.nextSectionRef) {
    emit('select-section', props.nextSectionRef, props.nextSectionTitle ?? '', false)
  }
}

const { setSupportView, clearSupportView } = useSupportPageContext()
onMounted(() => setSupportView(SUPPORT_VIEW_NAMES.BOOK_READER))
onUnmounted(() => clearSupportView())
</script>

<style scoped>
.verse-english-column {
  font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
  font-size: 0.9375rem;
  line-height: 1.2;
  letter-spacing: 0.01em;
}
.verse-hebrew-column {
  line-height: 1.6;
}

/* Desktop / pointer devices: only show hover highlight when a real mouse/trackpad exists */
@media (hover: hover) and (pointer: fine) {
  .phrase-token:hover {
    background-color: #eff6ff; /* Tailwind bg-blue-50 */
  }
}

/* Phone: make verses more compact while staying readable */
@media (max-width: 639px) {
  .verse-english-column {
    font-size: 0.875rem;
    line-height: 1.35;
  }
  .verse-hebrew-column {
    font-size: 1rem;
    line-height: 1.5;
  }
}

/* iPad‑mini–sized tablets in portrait: use desktop layout but slightly tighter text */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .verse-english-column {
    font-size: 0.9rem;
  }
  .verse-hebrew-column {
    font-size: 1.05rem;
  }
}
.verse-english-html :deep(sup) {
  font-size: 0.75em;
  vertical-align: super;
}
.verse-english-html :deep(sup.footnote-marker) {
  font-size: 0.7em;
  vertical-align: super;
  font-weight: 600;
}
.verse-english-html :deep(b) {
  font-weight: 600;
}
.verse-english-html :deep(small) {
  font-size: 0.85em;
  font-variant: small-caps;
}
.verse-english-html :deep(i.footnote) {
  font-size: 0.9em;
  font-style: italic;
  color: #555;
}
.verse-english-html :deep(span.poetry) {
  display: block;
  padding-left: 1.5em;
  text-indent: -1.5em;
  line-height: 1.15;
  margin: 0;
}
.verse-english-html :deep(span.poetry.indentAll) {
  padding-left: 1.5em;
  text-indent: -1.5em;
  line-height: 1.15;
  margin: 0;
}
.verse-english-html :deep(a.refLink) {
  color: #2563eb;
  text-decoration: underline;
}
.verse-english-html :deep(a.refLink:hover) {
  color: #1d4ed8;
}
</style>
