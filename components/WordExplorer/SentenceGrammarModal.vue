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
          class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          aria-label="Close"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
      <div class="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 text-sm text-gray-800">
        <p v-if="loading" class="text-gray-500">Loading grammar explanation…</p>
        <p v-else-if="error" class="text-red-600">{{ error }}</p>
        <div
          v-else-if="explanationHtml"
          class="grammar-explanation w-full leading-normal [&>p]:mt-2 [&>p]:mb-6 [&>p:last-child]:mb-0 [&>ul]:mt-4 [&>ul]:mb-6 [&>ul]:pl-6 [&>ol]:mt-4 [&>ol]:mb-6 [&>ol]:pl-6 [&_li]:my-4 [&_li>p]:mb-2 [&_li>p:last-child]:mb-0 [&>strong]:font-semibold [&>strong]:text-gray-900"
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
