<template>
  <div class="container mx-auto p-4 max-w-2xl">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold text-gray-800">About Shoresh</h1>
      <NuxtLink to="/" class="text-blue-600 hover:underline flex items-center gap-1 text-sm">
        ← Back
      </NuxtLink>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt class="font-semibold text-gray-800">Author</dt>
        <dd class="text-gray-700">Irv Shapiro</dd>
        <dt class="font-semibold text-gray-800">Sponsor</dt>
        <dd class="text-gray-700">
          <a href="https://cogitations.com" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Cogitations, LLC</a>
        </dd>
        <dt class="font-semibold text-gray-800">Version</dt>
        <dd class="text-gray-700 font-mono">{{ version }}</dd>
        <dt class="font-semibold text-gray-800">GitHub</dt>
        <dd class="text-gray-700">
          <a href="https://github.com/ishapiro/sefaria-tutor" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">github.com/ishapiro/sefaria-tutor</a>
        </dd>
        <dt class="font-semibold text-gray-800">License</dt>
        <dd class="text-gray-700">
          Licensed under <strong>Business Source License 1.1 (BSL 1.1)</strong>. Non‑commercial use and production use for entities with less than $1M in revenue are permitted without a commercial license. Each released version converts to <strong>Common Public Attribution License (CPAL) 1.0</strong> three years after the last modification to that version by the original author.
        </dd>
      </dl>

      <section class="mt-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-2">Release notes</h2>
        <div class="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p class="text-gray-700 text-sm mb-4 leading-relaxed">
            Shoresh is different from other AI-supported Jewish text resources: it focuses on <strong>text-skills building word by word</strong>, in both Hebrew and Aramaic. The app is designed to help you move from basic reading toward independent textual mastery by providing a word-by-word bridge to the original sources—with grammar, roots, and pronunciation—rather than only full-phrase translation. <strong>Shoresh is provided free of charge.</strong>
          </p>
          <h3 class="font-semibold text-gray-900 mb-2">Version 1.0.0 — Initial release</h3>
          <ul class="list-disc list-inside space-y-1.5 text-gray-700 text-sm">
            <li>Browse and read Jewish texts from the Sefaria library (Hebrew and English)</li>
            <li>Word-by-word AI translation: select text to see definitions, roots, and grammar</li>
            <li>Text-to-speech (TTS) for Hebrew words and phrases</li>
            <li>My Word List: save words from translations and review them later</li>
            <li>My Notes: attach notes to specific references in texts</li>
            <li>Study / Flashcards: study your saved words with Hebrew→English cards, “Know it” / “Need practice,” and session summary</li>
            <li>User settings: repeat correct words, words per session, max cards per session, long phrase threshold</li>
            <li>Archive and restore words; reset study stats per word</li>
            <li>Settings page with study results and preferences</li>
            <li>Support ticket system for feedback and help</li>
            <li>Concordance / Word Explorer: view word trees and concordance from word cards</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const version = computed(() => (config.public as { version?: string }).version ?? '1.0.0')
</script>
