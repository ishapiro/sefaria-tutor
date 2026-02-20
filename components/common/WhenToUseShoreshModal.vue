<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-4 sm:py-8 px-3 sm:px-4 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col my-auto">
      <div class="px-4 sm:px-8 pt-5 sm:pt-8 pb-3 sm:pb-4 shrink-0">
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">When to use Shoresh vs Sefaria</h2>
      </div>
      <div class="px-4 sm:px-8 pb-4 sm:pb-8 overflow-y-auto flex-1 min-h-0">
        <p class="text-gray-700 text-sm leading-relaxed">
          Shoresh’s texts come from <a href="https://www.sefaria.org/" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Sefaria.org</a>. Use <strong>Shoresh</strong> for vocabulary acquisition and foundational text skills: tap any phrase for AI breakdowns (meaning, root, grammar, pronunciation), save words to My Word List, and study with flashcards.
          <br /><br />
          Use <strong>Sefaria.org</strong> for the full library—commentaries (Rashi, Ramban, etc.), study calendars (Daf Yomi, 929), source sheets, and offline.
          <br /><br />
          <strong>Sefaria</strong> = breadth and commentary; <strong>Shoresh</strong> = vocabulary acquisition and foundational skills.
        </p>
      </div>
      <div class="px-4 sm:px-8 pb-5 sm:pb-8 pt-2 shrink-0">
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
