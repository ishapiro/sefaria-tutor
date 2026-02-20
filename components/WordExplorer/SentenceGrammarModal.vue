<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col my-4">
      <div class="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <h3 class="text-base sm:text-lg font-semibold text-gray-900">Sentence grammar</h3>
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
        <p v-if="loading" class="text-gray-500">Loading grammar explanation…</p>
        <p v-else-if="error" class="text-red-600">{{ error }}</p>
        <div
          v-else-if="explanationHtml"
          class="grammar-explanation w-full leading-normal [&>p]:mt-0 [&>p]:mb-6 [&>p:last-child]:mb-0 [&>ul]:mt-4 [&>ul]:mb-6 [&>ul]:pl-6 [&>li]:my-1.5 [&>strong]:font-semibold [&>strong]:text-gray-900"
          v-html="explanationHtml"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import { sanitizeMarkdownHtml } from '~/utils/text'

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string | null
  explanation: string | null
}>()

defineEmits<{
  close: []
}>()

const explanationHtml = computed(() => {
  const raw = props.explanation
  if (!raw) return ''
  try {
    const html = marked(raw, { async: false })
    return sanitizeMarkdownHtml(String(html ?? ''))
  } catch {
    return sanitizeMarkdownHtml(raw.replace(/\n/g, '<br>'))
  }
})
</script>
