<template>
  <div
    v-if="open"
    class="when-to-use-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center py-0 sm:py-8 px-3 sm:px-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="when-to-use-card bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col mt-3 sm:my-auto">
      <div class="px-4 sm:px-8 pt-4 sm:pt-8 pb-2 sm:pb-4 shrink-0">
        <h2 class="text-base sm:text-xl font-bold text-gray-900 tracking-tight leading-snug">When to use Shoresh vs Sefaria</h2>
      </div>
      <div class="px-4 sm:px-8 pb-4 sm:pb-8 overflow-y-auto flex-1 min-h-0 overscroll-contain">
        <p class="text-gray-700 text-sm leading-relaxed break-words">
          We obtain our Hebrew and Aramaic texts from <a href="https://www.sefaria.org/" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Sefaria</a>. <strong>Shoresh</strong> is for vocabulary and reading skills: tap any phrase for AI breakdowns (meaning, root, grammar, pronunciation), save words to My Word List, and study with flashcards.
          <br /><br />
          Word-by-word translations here are from AI (OpenAI) for vocabulary—not Sefaria’s published translations.
          <br /><br />
          Use <strong>Sefaria.org</strong> for the full library: commentaries (Rashi, Ramban, etc.), study tracks (Daf Yomi, 929), source sheets, and offline.
          <br /><br />
          <strong>In short:</strong> Sefaria = depth and commentary; Shoresh = vocabulary and reading confidence.
        </p>
      </div>
      <div class="px-4 sm:px-8 pb-5 sm:pb-8 pt-2 shrink-0 safe-area-buttons">
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

<style scoped>
/* Fit within safe area on notched devices (e.g. iPhone X) */
.when-to-use-overlay {
  padding-top: max(0.75rem, env(safe-area-inset-top));
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  padding-left: max(0.75rem, env(safe-area-inset-left));
  padding-right: max(0.75rem, env(safe-area-inset-right));
}
.safe-area-buttons {
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
}
.when-to-use-card {
  max-height: min(85vh, calc(100dvh - 1rem));
}
@media (min-width: 640px) {
  .when-to-use-card {
    max-height: min(90vh, calc(100dvh - 2rem));
  }
}
</style>
