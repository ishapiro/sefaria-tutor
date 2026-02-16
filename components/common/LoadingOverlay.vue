<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 pointer-events-auto overflow-y-auto overscroll-contain min-h-screen loading-overlay-padding"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="bg-white rounded-xl shadow-xl p-4 sm:p-6 flex flex-col items-center gap-4 mx-0 sm:mx-4 max-w-lg sm:max-w-2xl w-full my-auto shrink-0">
      <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <span class="block w-full text-gray-700 text-sm sm:text-base font-medium whitespace-pre-line text-center">{{ message }}</span>
      <Transition name="fade-slide" mode="out-in">
        <span
          v-if="rotatingMessages?.length && currentRotatingIndex >= 0"
          :key="currentRotatingIndex"
          class="block w-full text-gray-500 text-xs sm:text-sm text-center min-h-[1.5em]"
        >
          {{ rotatingMessages[currentRotatingIndex] }}
        </span>
      </Transition>
      <!-- Progress bar: estimated 3 seconds per word, updates every second -->
      <div v-if="estimatedWordCount > 0" class="w-full">
        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-600 transition-all duration-1000 ease-linear"
            :style="{ width: `${Math.min(100, progressPercent)}%` }"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500 text-center">
          {{ Math.round(progressPercent) }}% · ~{{ estimatedTotalSeconds }}s estimated
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const SECONDS_PER_WORD = 3

const props = withDefaults(
  defineProps<{
    open: boolean
    message: string
    rotatingMessages?: string[]
    estimatedWordCount?: number
  }>(),
  { rotatingMessages: () => [], estimatedWordCount: 0 }
)

const currentRotatingIndex = ref(0)
const progressPercent = ref(0)
const startTime = ref(0)
let progressIntervalId: ReturnType<typeof setInterval> | null = null

const estimatedTotalSeconds = computed(() =>
  Math.max(1, (props.estimatedWordCount ?? 0) * SECONDS_PER_WORD)
)

function updateProgress () {
  if (props.estimatedWordCount <= 0) return
  const elapsed = (Date.now() - startTime.value) / 1000
  const total = estimatedTotalSeconds.value
  progressPercent.value = Math.min(100, (elapsed / total) * 100)
  // Space messages over progress bar duration; each message shown once
  const msgCount = props.rotatingMessages?.length ?? 0
  if (msgCount > 0) {
    const progressRatio = Math.min(1, elapsed / total)
    currentRotatingIndex.value = Math.min(
      Math.floor(progressRatio * msgCount),
      msgCount - 1
    )
  }
}

watch(
  () => [props.open, props.estimatedWordCount] as const,
  ([isOpen, wordCount]) => {
    if (progressIntervalId) {
      clearInterval(progressIntervalId)
      progressIntervalId = null
    }
    if (import.meta.client && isOpen && wordCount && wordCount > 0) {
      startTime.value = Date.now()
      progressPercent.value = 0
      currentRotatingIndex.value = 0
      updateProgress()
      progressIntervalId = setInterval(updateProgress, 1000)
    } else {
      progressPercent.value = 0
      currentRotatingIndex.value = 0
    }
  },
  { immediate: true }
)

watch(() => props.open, (isOpen) => {
  if (import.meta.client && typeof document !== 'undefined') {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }
}, { immediate: true })

onUnmounted(() => {
  if (progressIntervalId) clearInterval(progressIntervalId)
  if (import.meta.client && typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
  }
})
</script>

<style scoped>
.loading-overlay-padding {
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
}
@media (min-width: 640px) {
  .loading-overlay-padding {
    padding: max(1.5rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left));
  }
}
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
