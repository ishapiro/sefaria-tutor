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
        <div v-if="loading" class="space-y-2">
          <p class="text-gray-500">Loading grammar explanation from OpenAI…</p>
          <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-[width] duration-200"
              :style="{ width: progressPercent + '%' }"
            />
          </div>
          <p class="text-xs text-gray-500">~15 seconds (cached for future requests)</p>
        </div>
        <p v-else-if="error" class="text-red-600">{{ error }}</p>
        <div v-else-if="explanationHtml" class="space-y-4">
          <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-1.5">
            <div class="flex items-baseline justify-between gap-3">
              <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sentence</div>
              <div v-if="reference" class="text-[11px] font-medium text-gray-500 truncate">
                {{ reference }}
              </div>
            </div>
            <div
              class="text-base text-right text-gray-900 leading-relaxed"
              style="direction: rtl; word-break: break-word;"
            >
              {{ originalPhrase || '—' }}
            </div>
            <div class="text-sm text-gray-800 leading-relaxed break-words">
              {{ translatedPhrase || '—' }}
            </div>
          </div>
          <div
            class="grammar-explanation w-full leading-normal [&>p]:mt-2 [&>p]:mb-6 [&>p:last-child]:mb-0 [&>ul]:mt-4 [&>ul]:mb-6 [&>ul]:pl-6 [&>ol]:mt-4 [&>ol]:mb-6 [&>ol]:pl-6 [&_li]:my-4 [&_li>p]:mb-2 [&_li>p:last-child]:mb-0 [&>strong]:font-semibold [&>strong]:text-gray-900"
            v-html="explanationHtml"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { marked } from 'marked'
import { sanitizeMarkdownHtml } from '~/utils/text'

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string | null
  explanation: string | null
  originalPhrase?: string | null
  translatedPhrase?: string | null
  reference?: string | null
}>()

defineEmits<{
  close: []
}>()

const progress = ref(0)
const progressPercent = computed(() => Math.max(0, Math.min(100, progress.value)))

const TOTAL_MS = 15000
const TICK_MS = 250
const MAX_BEFORE_DONE = 95
const STEP = (100 * TICK_MS) / TOTAL_MS

let timer: ReturnType<typeof setInterval> | null = null

watch(
  () => props.loading,
  (isLoading) => {
    if (isLoading) {
      progress.value = 0
      if (timer) clearInterval(timer)
      timer = setInterval(() => {
        if (progress.value < MAX_BEFORE_DONE) {
          progress.value = Math.min(MAX_BEFORE_DONE, progress.value + STEP)
        }
      }, TICK_MS)
    } else {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      progress.value = 100
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

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
