<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 pointer-events-auto"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="bg-white rounded-xl shadow-xl p-6 flex flex-col items-center gap-4 mx-4 max-w-lg sm:max-w-2xl w-full">
      <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <span class="block w-full text-gray-700 text-sm sm:text-base font-medium whitespace-pre-line text-center">{{ message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  message: string
}>()
</script>
