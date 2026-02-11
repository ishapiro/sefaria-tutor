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
    <h1 class="text-xl font-bold mb-2">
      Word Explorer
      <span class="pl-2 text-base font-normal text-gray-600">(Using OpenAI Model: {{ openaiModel }})</span>
    </h1>
    <p class="text-sm text-gray-600 mb-4">
      (All source text provided by the <a href="https://www.sefaria.org/" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">Sefaria</a> Open Source Torah API)
    </p>

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
        <NuxtLink
          v-if="isAdmin"
          to="/admin"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 whitespace-nowrap inline-flex items-center"
        >
          Admin
        </NuxtLink>
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
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 text-center">
          <p class="font-semibold text-gray-800 mb-4">{{ errorMessage }}</p>
          <div class="flex gap-2 justify-center">
            <button
              v-if="errorDetails"
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
              @click="showErrorDebugDialog = true"
            >
              Debug Info
            </button>
            <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" @click="showErrorDialog = false">OK</button>
          </div>
        </div>
      </div>
      
      <!-- Error debug dialog -->
      <div
        v-if="showErrorDebugDialog"
        class="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 overflow-y-auto py-8"
        @click.self="showErrorDebugDialog = false"
      >
        <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-w-3xl max-h-[90vh] overflow-auto text-sm">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Error Debug Information</h2>
            <button type="button" class="text-gray-500 hover:text-gray-700 text-2xl leading-none" @click="showErrorDebugDialog = false">×</button>
          </div>
          <p class="text-gray-600 text-xs mb-4">This information can help diagnose browser-specific issues.</p>
          <pre class="bg-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-[70vh] overflow-y-auto">{{ JSON.stringify(errorDetails, null, 2) }}</pre>
          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="px-4 py-2 rounded transition-all duration-200"
              :class="copiedStatus === 'errorDebug' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'"
              @click="handleCopy(JSON.stringify(errorDetails, null, 2), 'errorDebug')"
            >
              {{ copiedStatus === 'errorDebug' ? '✅ Copied!' : 'Copy to clipboard' }}
            </button>
            <button type="button" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800" @click="showErrorDebugDialog = false">Close</button>
          </div>
        </div>
      </div>
      <!-- Help dialog -->
      <div
        v-if="showHelpDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
        @click.self="showHelpDialog = false"
      >
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-2xl mx-4 text-left max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">Cogitations Sefaria Tutor — Help</h2>

          <section class="mb-5">
            <h3 class="font-semibold text-gray-900 mb-2">Purpose</h3>
            <p class="text-gray-700 text-sm leading-relaxed">
              This application helps students understand classical Jewish texts word by word to build vocabulary and enhance access to these texts. It was developed by a Hebrew school graduate with limited Hebrew depth for personal study and is provided free of charge.
            </p>
          </section>

          <section class="mb-5">
            <h3 class="font-semibold text-gray-900 mb-2">Getting started</h3>
            <p class="text-gray-700 text-sm leading-relaxed">
              Choose a category (e.g. Tanakh, Talmud, Liturgy), then select a book. For books with multiple sections (e.g. Siddur, Kitzur Shulchan Arukh), pick a section from the list. Use the pagination to move between pages.
            </p>
          </section>

          <section class="mb-5">
            <h3 class="font-semibold text-gray-900 mb-2">Translation</h3>
            <ul class="list-disc list-inside text-gray-700 text-sm space-y-1.5 ml-1">
              <li><strong>Click phrase</strong> — Click on any Hebrew or English phrase to get a word-by-word translation with grammar notes. A phrase is any set of words up to any punctuation (comma, period, colon, etc.).</li>
            </ul>
          </section>

          <section class="mb-5">
            <h3 class="font-semibold text-gray-900 mb-2">Read aloud (text-to-speech)</h3>
            <ul class="list-disc list-inside text-gray-700 text-sm space-y-1.5 ml-1">
              <li><strong>Full sentence</strong> — In the translation dialog, click the Hebrew phrase at the top to hear it spoken.</li>
              <li><strong>Single word</strong> — Click any Hebrew word in the Word column of the translation table to hear its pronunciation.</li>
            </ul>
          </section>

          <section class="mb-5">
            <h3 class="font-semibold text-gray-900 mb-2">Translation table columns</h3>
            <dl class="text-gray-700 text-sm space-y-2">
              <div><dt class="font-medium text-gray-800">#</dt><dd>Number of times the word appears in the original text.</dd></div>
              <div><dt class="font-medium text-gray-800">Translation</dt><dd>English translation of the word.</dd></div>
              <div><dt class="font-medium text-gray-800">Word</dt><dd>Hebrew word (click to hear pronunciation).</dd></div>
              <div><dt class="font-medium text-gray-800">Language</dt><dd>Hebrew or Aramaic.</dd></div>
              <div><dt class="font-medium text-gray-800">Root</dt><dd>Lexical root (shoresh) of the word.</dd></div>
              <div><dt class="font-medium text-gray-800">Part of Speech</dt><dd>Noun, verb, adjective, etc.</dd></div>
              <div><dt class="font-medium text-gray-800">Gender</dt><dd>Masculine, feminine, or common.</dd></div>
              <div><dt class="font-medium text-gray-800">Tense</dt><dd>Past, present, future, imperative, or infinitive.</dd></div>
              <div><dt class="font-medium text-gray-800">Binyan</dt><dd>Verb conjugation pattern (e.g. Qal, Piel, Hiphil).</dd></div>
              <div><dt class="font-medium text-gray-800">Present (Hebrew)</dt><dd>Present-tense form of verbs in Hebrew.</dd></div>
              <div><dt class="font-medium text-gray-800">Grammar Notes</dt><dd>Extra grammatical or contextual notes.</dd></div>
            </dl>
          </section>

          <section class="mb-5">
            <h3 class="font-semibold text-gray-900 mb-2">Source</h3>
            <p class="text-gray-700 text-sm mb-2">
              Texts from <a href="https://www.sefaria.org/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Sefaria</a> (https://www.sefaria.org). Translation and analysis powered by OpenAI.
            </p>
            <p class="text-gray-700 text-sm">
              This application would not exist without the work of Sefaria. Please consider <a href="https://donate.sefaria.org/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">donating to Sefaria</a> to support their free access to Jewish texts.
            </p>
          </section>

          <section class="mb-5 pt-4 border-t border-gray-200">
            <h3 class="font-semibold text-gray-900 mb-2">About</h3>
            <p class="text-gray-700 text-sm mb-2">
              A product of <a href="https://cogitations.com" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Cogitations</a>.
            </p>
            <p class="text-gray-700 text-sm mb-2">
              Licensed under MIT. <a href="https://github.com/ishapiro/sefaria-tutor" target="_blank" rel="noopener" class="text-blue-600 hover:underline">GitHub repository</a>.
            </p>
            <p class="text-gray-700 text-sm">
              Suggestions for improvements are welcome: <a href="mailto:ishapiro@cogitations.com" class="text-blue-600 hover:underline">ishapiro@cogitations.com</a>
            </p>
          </section>

          <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium" @click="showHelpDialog = false">Close</button>
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
        <!-- Complex book: section list (when no section content loaded yet) – check before "not available" -->
        <div v-else-if="complexSections?.length && allVerseData.length === 0" class="space-y-4">
          <div class="flex items-center gap-2 mb-4 flex-wrap">
            <button v-if="sectionStack.length > 0" type="button" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm" @click="goBackSection">Back</button>
            <span class="font-semibold">Select a section:</span>
            <button
              type="button"
              class="ml-2 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
              @click="showSectionListDebugDialog = true"
            >
              Debug
            </button>
          </div>
          <ul class="space-y-2">
            <li
              v-for="section in complexSections"
              :key="section.ref"
              class="flex items-center"
            >
              <template v-if="isLeafNode(section)">
                <button type="button" class="text-blue-600 hover:underline font-medium text-left" @click="fetchBookContent(section.ref)">
                  {{ getSectionDisplayTitle(section) }}
                </button>
              </template>
              <template v-else>
                <span
                  class="text-gray-800 font-semibold text-sm md:text-base pl-1 border-l-2 border-gray-300"
                  aria-hidden="true"
                >
                  {{ section.title }}<span v-if="section.heTitle"> / {{ section.heTitle }}</span>
                </span>
              </template>
            </li>
          </ul>
        </div>
        <div v-else-if="bookLoadAttempted && !loading && currentPageText.length === 0 && !complexSections" class="text-center py-8 text-gray-500">
          <p class="mb-4">This book is not available via the API, or you need to select a section. Try another book or section.</p>
          <button
            type="button"
            class="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
            @click="showBookLoadDebugDialog = true"
          >
            Show debug info
          </button>
        </div>
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs text-gray-500">
              Click on any text to analyze it word by word with grammar explanations. Phrases are delimited by punctuation—clicking before a comma, period, or other punctuation will analyze from the start of the phrase up to that punctuation mark.
            </p>
            <button
              type="button"
              class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
              @click="showContentDebugDialog = true"
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
                  class="hover:bg-blue-50 cursor-pointer rounded px-0.5 transition-colors"
                  @click="translateWithOpenAI(phrase, true)"
                >{{ phrase }} </span>
              </div>
              <div class="text-right text-lg select-none" style="direction: rtl">
                <span class="text-gray-500 ml-2 text-sm pointer-events-none cursor-default">{{ section.displayNumber }}</span>
                <span
                  v-for="(phrase, pIdx) in splitIntoPhrases(section.he)"
                  :key="pIdx"
                  class="hover:bg-blue-50 cursor-pointer rounded px-0.5 transition-colors"
                  @click="translateWithOpenAI(phrase, true)"
                >{{ phrase }} </span>
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

    <!-- Content view debug dialog -->
    <div
      v-if="showContentDebugDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showContentDebugDialog = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-w-3xl max-h-[90vh] overflow-auto text-sm">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Content Debug</h2>
          <button type="button" class="text-gray-500 hover:text-gray-700 text-2xl leading-none" @click="showContentDebugDialog = false">×</button>
        </div>
        <p class="text-gray-600 text-xs mb-4">API response and parsed data for the currently displayed content.</p>
        <pre class="bg-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-[70vh] overflow-y-auto">{{ JSON.stringify(contentDebugInfo, null, 2) }}</pre>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded transition-all duration-200"
            :class="copiedStatus === 'debugContent' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'"
            @click="handleCopy(JSON.stringify(contentDebugInfo, null, 2), 'debugContent')"
          >
            {{ copiedStatus === 'debugContent' ? '✅ Copied!' : 'Copy to clipboard' }}
          </button>
          <button type="button" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800" @click="showContentDebugDialog = false">Close</button>
        </div>
      </div>
    </div>

    <!-- Section list debug dialog -->
    <div
      v-if="showSectionListDebugDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showSectionListDebugDialog = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-w-2xl max-h-[90vh] overflow-auto text-sm">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Section List Debug</h2>
          <button type="button" class="text-gray-500 hover:text-gray-700 text-2xl leading-none" @click="showSectionListDebugDialog = false">×</button>
        </div>
        <p class="text-gray-600 text-xs mb-4">Refs that would be sent when clicking each section (first 10 leaf sections shown).</p>
        <pre class="bg-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">{{ JSON.stringify(sectionListDebugInfo, null, 2) }}</pre>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded transition-all duration-200"
            :class="copiedStatus === 'debugSection' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'"
            @click="handleCopy(JSON.stringify(sectionListDebugInfo, null, 2), 'debugSection')"
          >
            {{ copiedStatus === 'debugSection' ? '✅ Copied!' : 'Copy to clipboard' }}
          </button>
          <button type="button" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800" @click="showSectionListDebugDialog = false">Close</button>
        </div>
      </div>
    </div>

    <!-- Book load debug dialog -->
    <div
      v-if="showBookLoadDebugDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showBookLoadDebugDialog = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 w-[90vw] max-w-2xl max-h-[90vh] overflow-auto text-sm">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Book Load Debug Info</h2>
          <button type="button" class="text-gray-500 hover:text-gray-700 text-2xl leading-none" @click="showBookLoadDebugDialog = false">×</button>
        </div>
        <p class="text-gray-600 text-xs mb-4">Context for debugging when a book fails to load.</p>
        <pre class="bg-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">{{ JSON.stringify(bookLoadDebugInfo, null, 2) }}</pre>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded transition-all duration-200"
            :class="copiedStatus === 'debugBookLoad' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'"
            @click="handleCopy(JSON.stringify(bookLoadDebugInfo, null, 2), 'debugBookLoad')"
          >
            {{ copiedStatus === 'debugBookLoad' ? '✅ Copied!' : 'Copy to clipboard' }}
          </button>
          <button type="button" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800" @click="showBookLoadDebugDialog = false">Close</button>
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
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-800"
            @click="showTranslationDialog = false"
          >
            Close
          </button>
        </div>
        <div v-if="translationLoading" class="text-center py-8 text-gray-500 text-lg">Loading translation…</div>
        <div v-else-if="translationError" class="text-center py-8 text-red-600 text-lg">{{ translationError }}</div>
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
            <strong>Multiple sentences detected.</strong> For best results, select individual sentences instead of the whole section.
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
            >{{ translationData.originalPhrase }}</div>
            <div class="text-2xl text-gray-900">{{ translationData.translatedPhrase }}</div>
          </div>
          <div class="flex justify-end mb-2">
            <button type="button" class="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-base" @click="showRawData = true">View Raw Data</button>
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

          <!-- Bottom close button -->
          <div class="mt-6 flex justify-end">
            <button
              type="button"
              class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-800"
              @click="showTranslationDialog = false"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

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

    <!-- Raw translation data dialog -->
    <div
      v-if="showRawData"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 overflow-y-auto py-8"
      @click.self="showRawData = false"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-[80vw] max-h-[80vh] overflow-auto space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">Raw Translation Data</h2>
          <button type="button" class="text-gray-500 hover:text-gray-700 text-2xl leading-none" @click="showRawData = false">×</button>
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
const { isAdmin, fetch: fetchSession, user, loggedIn } = useAuth()
const openaiModel = ref('gpt-4o')

// Debug logging for admin status
watch([user, isAdmin, loggedIn], ([userVal, adminVal, loggedInVal]) => {
  console.log('[Auth Debug]', {
    loggedIn: loggedInVal,
    user: userVal ? {
      id: userVal.id,
      email: userVal.email,
      role: userVal.role,
      isVerified: userVal.isVerified
    } : null,
    isAdmin: adminVal
  })
}, { immediate: true })
const modelLoading = ref(false)
const ttsLoading = ref(false)
const copiedStatus = ref<string | null>(null)

const openaiLoading = computed(() =>
  translationLoading.value || ttsLoading.value
  // Note: modelLoading is excluded - model retrieval is a background operation that shouldn't show loading overlay
)

const apiLoading = computed(() => loading.value || openaiLoading.value)

const apiLoadingMessage = computed(() => {
  if (loading.value) return 'Calling Sefaria…'
  if (ttsLoading.value) return 'Generating audio pronunciation…'
  if (translationLoading.value) return 'Analyzing phrase with OpenAI. Processing takes approximately 3 seconds per word—please be patient.'
  return 'Loading…'
})

/** True if the wordTable has notably fewer entries than words in the original phrase (model truncation). */
const translationWordTableIncomplete = computed(() => {
  const data = translationData.value
  if (!data?.originalPhrase || !data?.wordTable?.length) return false
  const tokens = data.originalPhrase.split(/\s+/).filter(Boolean)
  const rows = data.wordTable.length
  return tokens.length > rows + 5
})

/** Returns true if phrase has more than one sentence. Splits on . ? ! : ; newline, sof pasuk ׃, paseq ׀. */
function hasMultipleSentences (phrase: string): boolean {
  if (!phrase?.trim()) return false
  const sentences = phrase.split(/[.?!:;\n\u05C3\u05C0\uFF1A]+/).map(s => s.trim()).filter(Boolean)
  return sentences.length > 1
}

const translationHasMultipleSentences = computed(() =>
  hasMultipleSentences(lastTranslatedInputText.value || translationData.value?.originalPhrase || '')
)

/** Extract flat string[] from Sefaria text/he which may be array, string, or nested object. */
function extractTextArray (val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string')
  if (typeof val === 'string') return [val]
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>
    const keys = Object.keys(obj).sort((a, b) => {
      const na = Number(a)
      const nb = Number(b)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return String(a).localeCompare(String(b))
    })
    const out: string[] = []
    for (const k of keys) {
      const v = obj[k]
      if (typeof v === 'string') out.push(v)
      else if (Array.isArray(v)) out.push(...v.filter((x): x is string => typeof x === 'string'))
      else if (v && typeof v === 'object') out.push(...extractTextArray(v))
    }
    return out
  }
  return []
}

async function copyToClipboard (text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback for older browsers
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

async function handleCopy (text: string, id: string) {
  await copyToClipboard(text)
  copiedStatus.value = id
  setTimeout(() => {
    if (copiedStatus.value === id) {
      copiedStatus.value = null
    }
  }, 2000)
}

function getSectionDisplayTitle (section: { ref: string; title: string; heTitle?: string }): string {
  const refTitle = buildSefariaRefForSection(section.ref)
  if (/^Siman \d+$/.test(section.title)) return refTitle
  return section.heTitle ? `${section.title} / ${section.heTitle}` : section.title
}

function buildSefariaRefForSection (sectionRef: string): string {
  if (!selectedBook.value) return sectionRef
  const bookTitle = String(selectedBook.value.title ?? '')
  const parts = sectionRef
    .split('/')
    .map(p => p.replace(/\s*\([^)]*\)/, '').trim())
    .map(p => p.replace(/'([A-Za-z])/g, (_, c) => 'e' + c.toLowerCase()))
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

function onCategoryExpand (category: CategoryNode) {
  if (category.loaded || !category.contents) return
  category.children = category.contents.map((child: Record<string, unknown>) =>
    processNode(child, category.path)
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
    } else if (indexData.schema.lengths?.[0] && indexData.schema.lengths[0] > 0) {
      const totalChapters = indexData.schema.lengths[0]
      complexSections.value = Array.from({ length: totalChapters }, (_, i) => {
        const n = i + 1
        return { ref: String(n), title: `Siman ${n}`, heTitle: `סימן ${n}` }
      })
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

async function fetchBookContent (refOverride?: string | null) {
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
  
  loading.value = true
  const bookTitle = String(selectedBook.value.title ?? '')
  const isTalmud = selectedBook.value.categories?.includes('Talmud')
  let chapter: number | string | null = refOverride ? null : 1
  currentChapter.value = refOverride ?? chapter ?? 1
  let sefariaRef: string
  if (refOverride) {
    if (isComplexBookFlag.value) {
      const parts = refOverride
        .split('/')
        .map(p => p.replace(/\s*\([^)]*\)/, '').trim())
      if (parts.length === 1 && /^\d+$/.test(parts[0])) {
        sefariaRef = `${bookTitle} ${parts[0]}`.replace(/\s+/g, '_')
      } else {
        sefariaRef = `${bookTitle}, ${parts.join(', ')}`
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
    nextSectionRef.value = response.next ?? response.firstAvailableSectionRef ?? null
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
      textData = heArr.map((he, idx) => ({
        number: idx + 1,
        displayNumber: (Array.isArray(response.sections) && response.sections[idx] != null)
          ? String(response.sections[idx])
          : `${idx + 1}`,
        en: enArr[idx] ?? '',
        he: he ?? ''
      }))
    } else if (enArr.length || heArr.length) {
      const enVerses = response.verses ?? enArr.map((_, i) => i + 1)
      const heVerses = response.he_verses ?? enVerses
      let allNums = [...new Set([...enVerses, ...heVerses])].sort((a, b) => a - b)
      if (allNums.length === 0 && (enArr.length || heArr.length)) {
        const len = Math.max(enArr.length, heArr.length)
        allNums = Array.from({ length: len }, (_, i) => i + 1)
      }
      const enMap: Record<number, string> = {}
      enArr.forEach((t, i) => { enMap[enVerses[i] ?? i + 1] = t })
      const heMap: Record<number, string> = {}
      heArr.forEach((t, i) => { heMap[heVerses[i] ?? i + 1] = t })
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
  bookLoadAttempted.value = false // Reset flag before starting load
  const isComplex = await isComplexBook(data)
  isComplexBookFlag.value = isComplex
  if (isComplex) {
    await fetchComplexBookToc(data)
  } else {
    await fetchBookContent()
  }
  bookLoadAttempted.value = true // Mark that we've attempted to load
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

function getPlainTextFromHtml (html: string): string {
  if (!html) return ''
  const temp = document.createElement('div')
  temp.innerHTML = html
  return (temp.textContent ?? temp.innerText ?? html).trim()
}

/** Split text into phrases by comma, period, or colon (English and Hebrew). */
function splitIntoPhrases (text: string): string[] {
  if (!text) return []
  // Strip HTML for phrase splitting logic to avoid breaking tags
  const plainText = getPlainTextFromHtml(text)
  // Split by any punctuation. We keep the punctuation with the preceding phrase.
  // Using a regex that captures the content up to and including the delimiter.
  // We include common English and Hebrew punctuation as separators.
  const regex = /[^,.׃:;!?\u05C3\u05C0]+[.,׃:;!?\u05C3\u05C0]*/g
  const matches = plainText.match(regex)
  return matches ? matches.map(m => m.trim()).filter(Boolean) : [plainText]
}

/** Count how many times a word appears in the phrase (space-separated tokens). */
function countWordInPhrase (phrase: string, word: string): number {
  if (!phrase || !word) return 0
  const plain = phrase.replace(/<[^>]+>/g, '').trim()
  const tokens = plain.split(/\s+/).filter(Boolean)
  return tokens.filter(t => t === word).length
}

async function doTranslateApiCall (plainText: string, fullSentence: boolean) {
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

function cancelMultiSentenceConfirm () {
  showMultiSentenceConfirmDialog.value = false
  pendingTranslation.value = null
}

function confirmMultiSentenceContinue () {
  const pending = pendingTranslation.value
  if (!pending) {
    showMultiSentenceConfirmDialog.value = false
    return
  }
  showMultiSentenceConfirmDialog.value = false
  pendingTranslation.value = null
  doTranslateApiCall(pending.plainText, pending.fullSentence)
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

  if (hasMultipleSentences(plainText)) {
    pendingTranslation.value = { plainText, fullSentence }
    showMultiSentenceConfirmDialog.value = true
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
  
  // Expose debug helper to window for console access
  if (import.meta.client) {
    ;(window as { getCategoryLoadError?: () => string | undefined }).getCategoryLoadError = () => {
      return (window as { categoryLoadError?: string }).categoryLoadError
    }
    console.log('[Categories] Debug helper available: window.getCategoryLoadError()')
  }
})
</script>
