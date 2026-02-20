<template>
  <div
    v-if="open && (deck.length > 0 || sessionEnded)"
    class="fixed inset-0 z-[60] flex flex-col bg-white"
  >
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 border-b border-gray-200 bg-gray-50 shrink-0">
      <h2 class="text-lg sm:text-xl font-semibold text-gray-800">Study: My Words</h2>
      <div class="flex items-center gap-2 sm:gap-3">
        <span class="text-sm text-gray-600">
          {{ queueLength }} card{{ queueLength === 1 ? '' : 's' }} left
        </span>
        <button
          type="button"
          class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
          @click="endSession"
        >
          End session
        </button>
      </div>
    </div>

    <!-- Summary (after session ends) -->
    <div
      v-if="sessionEnded"
      class="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-auto"
    >
      <h3 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">Session complete</h3>
      <p class="text-gray-600 mb-6 text-center">
        You reviewed <strong>{{ totalShown }}</strong> card{{ totalShown === 1 ? '' : 's' }}.
        <span v-if="totalCorrect > 0">
          {{ totalCorrect }} marked correct.
        </span>
        <span v-if="totalShown > 0"> ({{ sessionPercentCorrect }}% correct)</span>
      </p>
      <button
        type="button"
        class="min-h-[44px] px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 touch-manipulation"
        @click="$emit('close')"
      >
        Close
      </button>
    </div>

    <!-- Card (during session) -->
    <div
      v-else
      class="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 max-w-2xl mx-auto w-full min-h-0 overflow-auto"
    >
      <div
        class="w-full rounded-xl border-2 border-gray-200 bg-white shadow-lg p-4 sm:p-8 text-center"
      >
        <div v-if="!revealed" class="space-y-4 sm:space-y-6">
          <p
            class="text-3xl sm:text-4xl font-bold text-blue-700 min-h-[3rem] flex items-center justify-center break-words"
            style="direction: rtl"
          >
            {{ currentWord?.wordData?.wordEntry?.word ?? '—' }}
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              v-if="onPlayTts && currentWord?.wordData?.wordEntry?.word"
              type="button"
              class="min-h-[44px] px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 font-medium inline-flex items-center gap-2 touch-manipulation"
              aria-label="Play pronunciation"
              @click="onPlayTts(currentWord.wordData.wordEntry.word!)"
            >
              Play
            </button>
            <button
              type="button"
              class="min-h-[44px] px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 font-medium inline-flex items-center gap-2 touch-manipulation"
              aria-label="Copy to clipboard"
              @click="copyCardToClipboard"
            >
              Copy to clipboard
            </button>
            <button
              type="button"
              class="min-h-[44px] px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 touch-manipulation"
              @click="reveal"
            >
              Show translation
            </button>
          </div>
        </div>
        <div v-else class="space-y-4 text-left">
          <div class="flex items-baseline gap-2 sm:gap-3 justify-center flex-wrap break-words" style="direction: rtl">
            <span class="text-2xl sm:text-3xl font-bold text-blue-700">{{ currentWord?.wordData?.wordEntry?.word ?? '—' }}</span>
            <span class="text-xl sm:text-2xl text-gray-800">→</span>
            <span class="text-xl sm:text-2xl font-semibold text-gray-900">{{ currentWord?.wordData?.wordEntry?.wordTranslation ?? '—' }}</span>
          </div>
          <div class="flex justify-center">
            <button
              type="button"
              class="min-h-[44px] px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 font-medium inline-flex items-center gap-2 touch-manipulation text-sm"
              aria-label="Copy to clipboard"
              @click="copyCardToClipboard"
            >
              Copy to clipboard
            </button>
          </div>
          <div
            v-if="currentWord?.wordData?.wordEntry?.wordRoot && currentWord.wordData.wordEntry.wordRoot !== '—'"
            class="text-sm sm:text-base text-gray-600"
          >
            Root: {{ currentWord.wordData.wordEntry.wordRoot }}
            <span v-if="currentWord.wordData.wordEntry.wordRootTranslation" class="text-gray-500">({{ currentWord.wordData.wordEntry.wordRootTranslation }})</span>
          </div>
          <!-- Modern Hebrew Example (included on mobile and desktop) -->
          <div
            v-if="currentWord?.wordData?.wordEntry?.modernHebrewExample?.sentence && currentWord?.wordData?.wordEntry?.modernHebrewExample?.translation"
            class="block w-full flex-shrink-0 mt-3 pt-3 border-t border-gray-100 text-left"
          >
            <div class="text-xs font-semibold text-gray-500 uppercase mb-2">Modern Hebrew Example</div>
            <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 space-y-1">
              <div class="text-sm text-right text-slate-800 break-words" style="direction: rtl; word-break: break-word;">
                {{ currentWord.wordData.wordEntry.modernHebrewExample.sentence }}
              </div>
              <div class="text-sm text-gray-700">
                {{ currentWord.wordData.wordEntry.modernHebrewExample.translation }}
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 justify-center pt-4">
            <button
              type="button"
              class="min-h-[44px] px-4 py-2.5 border border-amber-300 rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 font-medium touch-manipulation"
              @click="rate('need-practice')"
            >
              Need practice
            </button>
            <button
              type="button"
              class="min-h-[44px] px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 font-medium touch-manipulation"
              @click="rate('know-it')"
            >
              Know it
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface StudyWord {
  id: number
  wordData: {
    wordEntry: {
      word?: string
      wordTranslation?: string
      wordRoot?: string
      wordRootTranslation?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  createdAt?: number
}

const props = withDefaults(
  defineProps<{
    open: boolean
    deck: StudyWord[]
    correctRepetitions?: number
    maxCards?: number | null
    onRecordShow: (wordListId: number) => Promise<void>
    onRecordCorrect: (wordListId: number) => Promise<void>
    onPlayTts?: (word: string) => void
  }>(),
  { correctRepetitions: 2, maxCards: null }
)

const emit = defineEmits<{
  close: []
}>()

const queue = ref<StudyWord[]>([])
const revealed = ref(false)
const sessionEnded = ref(false)
const totalShown = ref(0)
const totalCorrect = ref(0)

const currentWord = computed(() => queue.value[0] ?? null)
const queueLength = computed(() => queue.value.length)
const sessionPercentCorrect = computed(() => {
  const shown = totalShown.value
  if (shown <= 0) return 0
  return Math.round((totalCorrect.value / shown) * 100)
})

// Record "show" when we display a card; end session if max cards reached
watch(
  () => currentWord.value,
  async (word) => {
    if (word && props.open && !sessionEnded.value) {
      totalShown.value += 1
      await props.onRecordShow(word.id)
      const max = props.maxCards ?? 0
      if (max > 0 && totalShown.value >= max) {
        sessionEnded.value = true
      }
    }
  },
  { immediate: true }
)

async function copyCardToClipboard () {
  const word = currentWord.value?.wordData?.wordEntry
  if (!word?.word) return
  const translation = word.wordTranslation ?? ''
  const text = translation ? `${word.word} → ${translation}` : word.word
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // fallback for older browsers or insecure context
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    } catch {
      // ignore
    }
  }
}

async function reveal () {
  if (revealed.value || !currentWord.value) return
  revealed.value = true
}

async function rate (action: 'need-practice' | 'know-it') {
  const word = currentWord.value
  if (!word) return
  if (action === 'know-it') {
    totalCorrect.value += 1
    await props.onRecordCorrect(word.id)
  }
  const rest = queue.value.slice(1)
  if (action === 'need-practice') {
    queue.value = [...rest, word]
  } else {
    const N = Math.max(0, props.correctRepetitions)
    const repeated = Array.from({ length: N }, () => word)
    // Put the word at the end so you see all other words before it appears again.
    queue.value = [...rest, ...repeated]
  }
  revealed.value = false
  if (queue.value.length === 0) {
    sessionEnded.value = true
  }
}

function endSession () {
  sessionEnded.value = true
}

watch(() => [props.open, props.deck], ([open, deck]) => {
  if (open && Array.isArray(deck) && deck.length > 0) {
    queue.value = [...deck]
    revealed.value = false
    sessionEnded.value = false
    totalShown.value = 0
    totalCorrect.value = 0
  }
}, { immediate: true })
</script>
