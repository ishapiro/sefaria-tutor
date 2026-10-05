<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col my-4">
      <div class="flex items-center justify-between gap-3 p-4 border-b border-gray-200 shrink-0">
        <div class="min-w-0">
          <h3 class="text-base sm:text-lg font-semibold text-gray-900 truncate">Translation: {{ title }}</h3>
          <p class="text-xs text-gray-500">
            <template v-if="allDone">{{ paragraphs.length }} paragraphs translated</template>
            <template v-else>Translated {{ doneCount }} / {{ paragraphs.length }}…</template>
          </p>
        </div>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          aria-label="Close"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
      <div v-if="!allDone" class="w-full h-1 bg-gray-200 shrink-0">
        <div
          class="h-full bg-blue-500 transition-[width] duration-200"
          :style="{ width: (paragraphs.length ? (100 * doneCount) / paragraphs.length : 0) + '%' }"
        />
      </div>
      <div class="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
        <div
          v-for="(p, i) in paragraphs"
          :key="i"
          class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 border-b border-gray-100 pb-4 last:border-0"
        >
          <div class="text-right text-lg text-gray-900 leading-relaxed md:order-2" style="direction: rtl">
            <span class="text-gray-500 text-sm font-bold ml-2">{{ p.label }}</span>{{ p.he }}
          </div>
          <div class="text-sm text-gray-800 leading-relaxed md:order-1">
            <template v-if="translations[i] != null">{{ translations[i] }}</template>
            <div v-else-if="chunkErrors[chunkIndexOf(i)]" class="text-red-600">
              <span>{{ chunkErrors[chunkIndexOf(i)] }}</span>
              <button
                v-if="isFirstInChunk(i)"
                type="button"
                class="ml-2 px-2 py-0.5 text-xs font-medium border border-red-300 rounded bg-white text-red-700 hover:bg-red-50"
                @click="loadChunk(chunkIndexOf(i))"
              >
                Retry
              </button>
            </div>
            <div v-else class="space-y-1.5 animate-pulse" aria-label="Loading translation">
              <div class="h-3 bg-gray-200 rounded w-full" />
              <div class="h-3 bg-gray-200 rounded w-4/5" />
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 p-3 sm:p-4 border-t border-gray-200 shrink-0">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 inline-flex items-center gap-2 min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!allDone"
          @click="onCopy"
        >
          <span aria-hidden="true">📋</span>
          <span>{{ copiedStatus === 'chapter-translation' ? 'Copied ✓' : 'Copy' }}</span>
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border border-blue-500 rounded-lg transition-all duration-150 inline-flex items-center gap-2 min-h-[36px] bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!allDone"
          @click="onShare"
        >
          <span aria-hidden="true">📤</span>
          <span>{{ canShare ? 'Share' : (copiedStatus === 'chapter-share' ? 'Copied ✓' : 'Share (copy)') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import { getApiErrorMessage } from '~/utils/api-errors'
import { useClipboard } from '~/composables/useClipboard'

export interface ChapterParagraph {
  /** Paragraph label (verse number, segment number). */
  label: string
  /** Sefaria-style ref for copy/share output (e.g. "Genesis 1:3"). */
  ref: string
  /** Plain Hebrew/Aramaic text (no HTML). */
  he: string
}

/** Per-request limits; keep under the server's caps (10 paragraphs / 12000 chars). */
const CHUNK_MAX_PARAGRAPHS = 8
const CHUNK_MAX_CHARS = 6000
const MAX_CONCURRENT = 2

/** Session-wide cache: Hebrew text → translation. D1 is the persistent cache on the server. */
const sessionCache = new Map<string, string>()

const props = defineProps<{
  open: boolean
  title: string
  paragraphs: ChapterParagraph[]
}>()

defineEmits<{
  close: []
}>()

const config = useRuntimeConfig()
const { copiedStatus, copy } = useClipboard()

const translations = ref<Array<string | null>>([])
const chunkErrors = ref<Record<number, string | null>>({})
/** Paragraph indexes per request chunk, and the chunk each paragraph belongs to. */
const chunks = ref<number[][]>([])
const chunkOfParagraph = ref<number[]>([])
/** Incremented on each (re)load so stale responses from a previous chapter are ignored. */
let loadGeneration = 0

const doneCount = computed(() => translations.value.filter(t => t != null).length)
const allDone = computed(() => props.paragraphs.length > 0 && doneCount.value === props.paragraphs.length)
const canShare = computed(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function')

function chunkIndexOf (i: number): number {
  return chunkOfParagraph.value[i] ?? 0
}

/** Group paragraphs into requests bounded by count and total characters. */
function buildChunks () {
  const result: number[][] = []
  let current: number[] = []
  let chars = 0
  props.paragraphs.forEach((p, i) => {
    const len = p.he.length
    if (current.length > 0 && (current.length >= CHUNK_MAX_PARAGRAPHS || chars + len > CHUNK_MAX_CHARS)) {
      result.push(current)
      current = []
      chars = 0
    }
    current.push(i)
    chars += len
  })
  if (current.length > 0) result.push(current)
  chunks.value = result
  const map: number[] = []
  result.forEach((idxs, c) => idxs.forEach(i => { map[i] = c }))
  chunkOfParagraph.value = map
}

/** True for the first still-untranslated paragraph in its chunk (where the Retry button goes). */
function isFirstInChunk (i: number): boolean {
  const first = (chunks.value[chunkIndexOf(i)] ?? []).find(j => translations.value[j] == null)
  return first === i
}

async function loadChunk (chunk: number, generation = loadGeneration) {
  const indexes = (chunks.value[chunk] ?? []).filter(i => translations.value[i] == null)
  if (indexes.length === 0) return
  chunkErrors.value[chunk] = null

  const token = config.public?.apiAuthToken as string | undefined
  if (!token) {
    chunkErrors.value[chunk] = 'The app is missing API authentication settings. Please contact support.'
    return
  }
  try {
    const res = await $fetch<{ translations: string[] }>('/api/openai/translate-paragraphs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { paragraphs: indexes.map(i => props.paragraphs[i]!.he) },
    })
    if (generation !== loadGeneration) return
    indexes.forEach((idx, n) => {
      const t = res?.translations?.[n] ?? ''
      translations.value[idx] = t
      sessionCache.set(props.paragraphs[idx]!.he, t)
    })
  } catch (e: unknown) {
    if (generation !== loadGeneration) return
    chunkErrors.value[chunk] = getApiErrorMessage(e, 'Could not translate these paragraphs.')
  }
}

async function loadAll () {
  const generation = ++loadGeneration
  translations.value = props.paragraphs.map(p => (p.he.trim() ? (sessionCache.get(p.he) ?? null) : ''))
  chunkErrors.value = {}
  buildChunks()
  const chunkCount = chunks.value.length
  let next = 0
  async function worker () {
    while (next < chunkCount && generation === loadGeneration) {
      const chunk = next++
      await loadChunk(chunk, generation)
    }
  }
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, chunkCount) }, worker))
}

watch(
  () => [props.open, props.paragraphs] as const,
  ([isOpen]) => {
    if (isOpen) loadAll()
    else loadGeneration++
  },
  { immediate: true },
)

function buildPlainText (): string {
  const lines: string[] = [props.title, '']
  props.paragraphs.forEach((p, i) => {
    lines.push(p.ref || p.label)
    lines.push(p.he)
    lines.push(translations.value[i] ?? '')
    lines.push('')
  })
  return lines.join('\n').trim()
}

function onCopy () {
  copy(buildPlainText(), 'chapter-translation')
}

async function onShare () {
  const text = buildPlainText()
  if (!canShare.value) {
    copy(text, 'chapter-share')
    return
  }
  try {
    await navigator.share({ title: props.title, text })
  } catch (e) {
    if ((e as { name?: string })?.name !== 'AbortError') copy(text, 'chapter-share')
  }
}
</script>
