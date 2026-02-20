<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col my-4">
      <div class="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <h3 class="text-base sm:text-lg font-semibold text-gray-900">Modern Hebrew Sentences</h3>
        <button
          type="button"
          class="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close"
          @click="$emit('close')"
        >
          <span class="text-xl leading-none">×</span>
        </button>
      </div>
      <div class="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 text-sm text-gray-800">
        <p v-if="loading" class="text-gray-500">Loading modern Hebrew examples…</p>
        <p v-else-if="error" class="text-red-600">{{ error }}</p>
        <div v-else-if="explanation" class="leading-normal">
          {{ explanation }}
        </div>
        <div v-else-if="examples && examples.length > 0" class="space-y-4">
          <p class="text-gray-600 mb-3">Here are 3 example sentences in modern Hebrew that use this word:</p>
          <div
            v-for="(ex, idx) in examples"
            :key="idx"
            class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 space-y-1.5"
          >
            <div
              class="text-base text-right text-slate-800 break-words leading-relaxed"
              style="direction: rtl; word-break: break-word;"
            >
              {{ ex.sentence }}
            </div>
            <div class="text-sm text-gray-700">
              {{ ex.translation }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface ModernHebrewExampleItem {
  sentence: string
  translation: string
}

defineProps<{
  open: boolean
  loading: boolean
  error: string | null
  examples: ModernHebrewExampleItem[] | null
  explanation: string | null
}>()

defineEmits<{
  close: []
}>()
</script>
