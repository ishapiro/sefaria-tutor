<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-8 pt-8 pb-4">
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">How to Use Shoresh</h2>
        <p class="text-gray-500 text-sm mt-1">Learn classical Jewish texts word by word</p>
      </div>

      <!-- Content -->
      <div class="px-8 pb-8 overflow-y-auto flex-1 space-y-6">
        <section class="rounded-xl bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">What This App Does</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            <strong class="text-slate-900">Shoresh is provided free of charge.</strong> It helps you build vocabulary and deepen your understanding of classical Jewish texts by exploring them word by word. Created by a learner for learners.
          </p>
        </section>

        <section>
          <h3 class="font-semibold text-slate-900 mb-3 text-base">Getting Started</h3>
          <ol class="space-y-2 text-slate-600 text-sm">
            <li class="flex gap-3"><span class="font-semibold text-slate-400 shrink-0">1.</span> Choose a category (Tanakh, Talmud, Liturgy, etc.).</li>
            <li class="flex gap-3"><span class="font-semibold text-slate-400 shrink-0">2.</span> Select a book.</li>
            <li class="flex gap-3"><span class="font-semibold text-slate-400 shrink-0">3.</span> For multi-section books (e.g., Siddur, Kitzur Shulchan Arukh), pick a section from the list.</li>
            <li class="flex gap-3"><span class="font-semibold text-slate-400 shrink-0">4.</span> Use pagination to move between pages.</li>
          </ol>
        </section>

        <section class="rounded-xl bg-blue-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Word-by-Word Translation</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-3">
            Click any Hebrew or Aramaic phrase—a segment up to the next punctuation mark—to see a word-by-word breakdown with grammar notes, powered by OpenAI.
          </p>
        </section>

        <section>
          <h3 class="font-semibold text-slate-900 mb-3 text-base">Listen & Learn (Text-to-Speech)</h3>
          <ul class="space-y-2 text-slate-600 text-sm">
            <li class="flex gap-2"><span class="font-medium text-slate-700">Phrase:</span> In the translation popup, click the Hebrew phrase at the top to hear it spoken aloud.</li>
            <li class="flex gap-2"><span class="font-medium text-slate-700">Word:</span> Click any Hebrew word in a word-analysis card to hear its pronunciation.</li>
          </ul>
        </section>

        <section>
          <h3 class="font-semibold text-slate-900 mb-3 text-base">Word Analysis Cards</h3>
          <p class="text-slate-600 text-sm mb-3">Each word appears in its own card. Here's what each field means:</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse">
              <tbody class="divide-y divide-slate-200">
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5 w-28">Word</td><td class="text-slate-600 px-2 py-1.5">Hebrew form (click to hear pronunciation)</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Translation</td><td class="text-slate-600 px-2 py-1.5">English meaning</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Root</td><td class="text-slate-600 px-2 py-1.5">Lexical root (shoresh)</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Occurrences</td><td class="text-slate-600 px-2 py-1.5">Shown when the word appears more than once</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Part of Speech</td><td class="text-slate-600 px-2 py-1.5">Noun, verb, adjective, etc.</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Gender</td><td class="text-slate-600 px-2 py-1.5">Masculine, feminine, or common</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Tense</td><td class="text-slate-600 px-2 py-1.5">Past, present, future, etc.</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Binyan</td><td class="text-slate-600 px-2 py-1.5">Verb pattern (Qal, Piel, Hiphil…)</td></tr>
                <tr class="bg-slate-50"><td class="font-medium text-slate-700 px-2 py-1.5">Language</td><td class="text-slate-600 px-2 py-1.5">Hebrew or Aramaic</td></tr>
                <tr><td class="font-medium text-slate-700 px-2 py-1.5">Grammar Notes</td><td class="text-slate-600 px-2 py-1.5">Additional context or explanation</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-xl bg-green-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">My Word List</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Requires a free account.</strong> Build your personal vocabulary by saving words from translations. Click the "Add to My Word List" button in any translation dialog to save words for later review.
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li>Access your saved words from the "My Word List" button at the top of any book</li>
            <li>Search through your words to quickly find what you're looking for</li>
            <li>Click any word to navigate back to its source text</li>
            <li>Archive words you no longer need (or restore archived words from the Archived tab)</li>
            <li>Reset study stats for a word to start fresh</li>
          </ul>
        </section>

        <section class="rounded-xl bg-amber-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Study / Flashcards</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Requires a free account.</strong> From My Word List, click <strong>Study</strong> to start a flashcard session with your saved words (Hebrew → English). Cards show the word; tap "Show translation" to reveal the meaning, then choose "Need practice" or "Know it."
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li>Words you mark "Know it" are shown a few more times in the session (configurable in Settings)</li>
            <li>Use the <strong>Play</strong> button to hear pronunciation; <strong>Copy to clipboard</strong> to copy the word or word → translation</li>
            <li>Session size and max cards per session are set in Settings</li>
            <li>View your study results (words studied, total shown, correct) on the Settings page</li>
          </ul>
        </section>

        <section class="rounded-xl bg-teal-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Concordance / Word Explorer</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            From a word card in the translation dialog or in My Word List, click the <strong>concordance icon</strong>
            <span class="inline-flex items-center justify-center w-5 h-5 align-middle mx-0.5 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20V12M12 12V8M12 8c-2 0-3.5-1.5-3.5-3.5S10 1 12 1s3.5 1.5 3.5 3.5S14 8 12 8zM8 5l2 3M16 5l-2 3" />
              </svg>
            </span>
            (looks like a lollipop) to open the Concordance Word Explorer. You can see how a root or word appears across Tanakh, Talmud, and other texts—with links to open each occurrence in the main reader.
          </p>
        </section>

        <section class="rounded-xl bg-slate-100/80 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Settings &amp; personalization</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Requires a free account.</strong> Click <strong>Settings</strong> in the header (when logged in) to customize your experience:
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside">
            <li><strong>Flashcards:</strong> How many times to repeat a word after "Know it," words per study session, and max cards per session</li>
            <li><strong>Translation:</strong> Long phrase threshold—how many words trigger the word-picker instead of translating the whole selection</li>
            <li><strong>Your study results:</strong> All-time stats and a paginated list of words you’ve studied (shown, correct, archived)</li>
          </ul>
        </section>

        <section class="rounded-xl bg-purple-50/60 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">My Notes</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-2">
            <strong class="text-slate-900">Requires a free account.</strong> Add personal notes to verses or numbered entries as you study. Click the 📝 icon next to a numbered entry to add or edit a note for the full verse/segment with your thoughts, questions, or insights.
          </p>
          <ul class="space-y-1.5 text-slate-600 text-sm list-disc list-inside mb-0">
            <li>View all your notes organized by book in the "My Notes" page</li>
            <li>Edit or delete notes anytime</li>
            <li>Select multiple notes to print or copy to your clipboard</li>
            <li>Click reference links to navigate back to the source text</li>
            <li>Notes are private to your account and sync across devices</li>
          </ul>
        </section>

        <section class="rounded-xl border-2 border-blue-200 bg-blue-50/80 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">Free Account Required</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            <strong class="text-slate-900">Shoresh is free of charge—no credit card or payment required.</strong> Create a free account to use My Word List, My Notes, Study (flashcards), and Settings. Your data is private and syncs across all your devices. Click "Login" in the header to get started.
          </p>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
          <h3 class="font-semibold text-slate-900 mb-3 text-base">About This Project</h3>
          <p class="text-slate-600 text-sm leading-relaxed mb-3">
            Independently developed by <a href="https://cogitations.com" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700 hover:underline font-medium">Cogitations</a>. Not affiliated with, endorsed by, or operated by Sefaria.org.
          </p>
          <ul class="space-y-2 text-slate-600 text-sm">
            <li><strong class="text-slate-700">Texts:</strong> Hebrew and English sources come from the <a href="https://developers.sefaria.org/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Sefaria API</a>. We display them; Sefaria provides them.</li>
            <li><strong class="text-slate-700">Translations:</strong> Word-by-word analysis uses <a href="https://openai.com/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">OpenAI</a>'s GPT models—not Sefaria. Text-to-speech is also from OpenAI and may occasionally be inaccurate.</li>
          </ul>
          <p class="text-slate-600 text-sm mt-3 leading-relaxed">
            This app wouldn't exist without Sefaria. Please consider <a href="https://donate.sefaria.org/" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium">donating to Sefaria</a> to support free access to Jewish texts.
          </p>
        </section>

        <section class="pt-4 border-t border-slate-200">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">License & Feedback</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Licensed under the <strong>Business Source License 1.1 (BSL 1.1)</strong>. Non‑commercial use and production use for entities with less than $1M in revenue are permitted without a commercial license. Each version automatically converts to <strong>Common Public Attribution License (CPAL) 1.0</strong> three years after the last update by the original author. © 2025–2026 Irv Shapiro / Cogitations, LLC. <a href="https://github.com/ishapiro/sefaria-tutor" target="_blank" rel="noopener" class="text-blue-600 hover:underline">View on GitHub</a>. Suggestions welcome: <a href="mailto:ishapiro@cogitations.com" class="text-blue-600 hover:underline">ishapiro@cogitations.com</a>
          </p>
        </section>
      </div>

      <!-- Footer -->
      <div class="px-8 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
        <button type="button" class="w-full sm:w-auto px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center justify-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400" @click="$emit('close')">Got it</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSupportPageContext } from '~/composables/useSupportPageContext'
import { SUPPORT_VIEW_NAMES } from '~/constants/supportViewNames'

const props = defineProps<{
  open: boolean
}>()

const { setSupportView, clearSupportView } = useSupportPageContext()
watch(() => props.open, (isOpen) => {
  if (isOpen) setSupportView(SUPPORT_VIEW_NAMES.HELP)
  else clearSupportView()
}, { immediate: true })

defineEmits<{
  close: []
}>()
</script>
