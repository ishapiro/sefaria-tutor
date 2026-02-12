<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-8 pt-8 pb-4">
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">How to Use Sefaria Tutor</h2>
        <p class="text-gray-500 text-sm mt-1">Learn classical Jewish texts word by word</p>
      </div>

      <!-- Content -->
      <div class="px-8 pb-8 overflow-y-auto flex-1 space-y-6">
        <section class="rounded-xl bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900 mb-2 text-base">What This App Does</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Sefaria Tutor helps you build vocabulary and deepen your understanding of classical Jewish texts by exploring them word by word. Created by a learner for learners—free to use.
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
          <div class="grid gap-2 text-sm sm:grid-cols-2">
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Word</span><span class="text-slate-600">Hebrew form (click to hear pronunciation)</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Translation</span><span class="text-slate-600">English meaning</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Root</span><span class="text-slate-600">Lexical root (shoresh)</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Occurrences</span><span class="text-slate-600">Shown when the word appears more than once in the phrase</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Part of Speech</span><span class="text-slate-600">Noun, verb, adjective, etc.</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Gender</span><span class="text-slate-600">Masculine, feminine, or common</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Tense</span><span class="text-slate-600">Past, present, future, etc.</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Binyan</span><span class="text-slate-600">Verb pattern (Qal, Piel, Hiphil…)</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2"><span class="font-medium text-slate-700 shrink-0">Language</span><span class="text-slate-600">Hebrew or Aramaic</span></div>
            <div class="flex gap-2 rounded-lg bg-slate-50 px-3 py-2 sm:col-span-2"><span class="font-medium text-slate-700 shrink-0">Grammar Notes</span><span class="text-slate-600">Additional context or explanation</span></div>
          </div>
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
            Open source under <strong>GNU GPL v3.0</strong>. <a href="https://github.com/ishapiro/sefaria-tutor" target="_blank" rel="noopener" class="text-blue-600 hover:underline">View on GitHub</a>. Suggestions welcome: <a href="mailto:ishapiro@cogitations.com" class="text-blue-600 hover:underline">ishapiro@cogitations.com</a>
          </p>
        </section>
      </div>

      <!-- Footer -->
      <div class="px-8 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
        <button type="button" class="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-medium transition-colors" @click="$emit('close')">Got it</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
}>()
</script>
