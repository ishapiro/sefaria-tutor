<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      <div class="px-8 pt-8 pb-4">
        <h2 class="text-xl font-bold text-gray-900 tracking-tight">When to use Shoresh vs Sefaria</h2>
      </div>
      <div class="px-8 pb-8 overflow-y-auto flex-1">
        <p class="text-gray-700 text-sm leading-relaxed">
          All of the texts in Shoresh come from <a href="https://www.sefaria.org/" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Sefaria.org</a>. Shoresh (at shoresh.cogitations.com) and Sefaria both give you access to Jewish texts, but they serve different goals. Use <strong>Shoresh</strong> when you want to build vocabulary and read word by word: tap any phrase to get an AI breakdown of each word (meaning, root, grammar, pronunciation), save words to My Word List, and study with flashcards. Use <strong>Sefaria</strong> when you want the full library with multiple commentaries (Rashi, Ramban, and many others), study calendars (Daf Yomi, 929, Parashat HaShavua), source sheets, and offline access. In short—Sefaria for breadth and traditional commentary; Shoresh for word-level learning and vocabulary building on the same texts.
        </p>
      </div>
      <div class="px-8 pb-8 pt-2">
        <button
          type="button"
          class="w-full sm:w-auto px-6 py-2.5 text-sm font-medium rounded-lg bg-[#003c71] text-white hover:bg-[#002a52] transition-colors"
          @click="$emit('close')"
        >
          Got it
        </button>
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
