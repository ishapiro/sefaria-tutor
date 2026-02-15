<template>
  <div class="container mx-auto p-3 sm:p-4 max-w-2xl">
    <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-800">Settings</h1>
      <NuxtLink to="/" class="text-blue-600 hover:underline flex items-center gap-1 shrink-0 min-h-[44px] items-center">
        ← Back to Explorer
      </NuxtLink>
    </div>

    <div v-if="!loggedIn" class="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
      <p class="font-semibold">Sign in to manage settings</p>
      <p class="mt-1 text-sm">Your preferences (e.g. flashcard options) are saved per account.</p>
      <NuxtLink to="/login" class="inline-flex items-center justify-center min-h-[44px] mt-4 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 touch-manipulation">
        Log in
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 class="text-lg sm:text-xl font-semibold text-gray-800 mb-1">Flashcards / Study</h2>
        <p class="text-sm text-gray-600 mb-4">
          When you mark a word as “Know it” during a study session, you can have it shown a few more times before it’s retired for that session.
        </p>
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <label for="flashcard-repetitions" class="text-sm font-medium text-gray-700">
              Repeat correct words (times):
            </label>
            <select
              id="flashcard-repetitions"
              v-model.number="flashcardCorrectRepetitions"
              :disabled="saving"
              class="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              @change="saveSettings"
            >
              <option :value="0">0 (retire immediately)</option>
              <option :value="1">1</option>
              <option :value="2">2 (default)</option>
              <option :value="3">3</option>
            </select>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label for="flashcard-session-size" class="text-sm font-medium text-gray-700">
              Words per study session:
            </label>
            <select
              id="flashcard-session-size"
              v-model.number="flashcardSessionSize"
              :disabled="saving"
              class="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              @change="saveSettings"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20 (default)</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label for="flashcard-card-multiplier" class="text-sm font-medium text-gray-700">
              Max cards per session:
            </label>
            <select
              id="flashcard-card-multiplier"
              v-model.number="flashcardSessionCardMultiplier"
              :disabled="saving"
              class="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              @change="saveSettings"
            >
              <option v-for="m in cardMultiplierOptions" :key="m.multiplier" :value="m.multiplier">
                {{ m.cards }} cards ({{ m.multiplier }}× words)
              </option>
            </select>
            <span class="text-xs text-gray-500">Session ends after this many card views (each time a word is shown counts as one).</span>
          </div>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <span v-if="saving" class="text-sm text-gray-500">Saving…</span>
          <span v-else-if="saveMessage" class="text-sm" :class="saveMessageType === 'success' ? 'text-green-600' : 'text-red-600'">
            {{ saveMessage }}
          </span>
        </div>
      </section>

      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 class="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Translation: long phrase threshold</h2>
        <p class="text-sm text-gray-600 mb-4">
          If your selection has <strong>more than</strong> this many words, the app shows a word picker so you can choose which words to translate; otherwise it translates the whole selection. Each word takes about 5 seconds, so a higher number means longer wait times.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <label for="long-phrase-limit" class="text-sm font-medium text-gray-700">
            Show word picker when selection has more than:
          </label>
            <select
              id="long-phrase-limit"
              v-model.number="longPhraseWordLimit"
              :disabled="saving"
              class="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              @change="saveSettings"
            >
            <option :value="5">5 words</option>
            <option :value="10">10 words (default)</option>
            <option :value="15">15 words</option>
            <option :value="20">20 words</option>
            <option :value="50">50 words</option>
          </select>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <span v-if="saving" class="text-sm text-gray-500">Saving…</span>
          <span v-else-if="saveMessage" class="text-sm" :class="saveMessageType === 'success' ? 'text-green-600' : 'text-red-600'">
            {{ saveMessage }}
          </span>
        </div>
      </section>

      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 class="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Your study results</h2>
        <p class="text-sm text-gray-600 mb-4">
          All-time stats for words you’ve studied at least once (including words you’ve since archived).
        </p>
        <div v-if="studyStatsLoading" class="text-center py-6 text-gray-500">Loading…</div>
        <div v-else-if="studyStatsError" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{{ studyStatsError }}</div>
        <div v-else class="space-y-4">
          <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <dt class="text-xs font-medium text-gray-500 uppercase">Words studied</dt>
              <dd class="text-lg font-semibold text-gray-900">{{ studyStats.summary.wordsStudied }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 uppercase">Total shown</dt>
              <dd class="text-lg font-semibold text-gray-900">{{ studyStats.summary.totalShown }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 uppercase">Total correct</dt>
              <dd class="text-lg font-semibold text-gray-900">{{ studyStats.summary.totalCorrect }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 uppercase">Percent correct</dt>
              <dd class="text-lg font-semibold text-gray-900">{{ studyStatsPercentCorrect }}</dd>
            </div>
          </dl>
          <div v-if="studyStats.studiedWords.length > 0" class="space-y-3">
            <!-- Desktop: table -->
            <div class="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
              <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg text-sm">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Word</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Translation</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Shown</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Correct</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">First correct at</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Archived</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="w in paginatedStudiedWords" :key="w.wordListId" class="hover:bg-gray-50">
                    <td class="px-4 py-2" style="direction: rtl">{{ wordEntryWord(w.wordData) }}</td>
                    <td class="px-4 py-2 text-gray-700">{{ wordEntryTranslation(w.wordData) }}</td>
                    <td class="px-4 py-2 text-gray-700">{{ w.timesShown }}</td>
                    <td class="px-4 py-2 text-gray-700">{{ w.timesCorrect }}</td>
                    <td class="px-4 py-2 text-gray-600">{{ w.attemptsUntilFirstCorrect ?? '—' }}</td>
                    <td class="px-4 py-2">{{ w.archivedAt ? 'Yes' : 'No' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Mobile: cards -->
            <div class="sm:hidden space-y-3">
              <div
                v-for="w in paginatedStudiedWords"
                :key="w.wordListId"
                class="border border-gray-200 rounded-lg p-3 bg-white text-sm"
              >
                <div class="flex items-baseline gap-2 flex-wrap" style="direction: rtl">
                  <span class="text-base font-semibold text-blue-700">{{ wordEntryWord(w.wordData) }}</span>
                  <span class="text-gray-500">→</span>
                  <span class="text-gray-800">{{ wordEntryTranslation(w.wordData) }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-3 text-gray-600">
                  <span>Shown: {{ w.timesShown }}</span>
                  <span>Correct: {{ w.timesCorrect }}</span>
                  <span>First correct: {{ w.attemptsUntilFirstCorrect ?? '—' }}</span>
                  <span>{{ w.archivedAt ? 'Archived' : 'Active' }}</span>
                </div>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span class="text-gray-600">
                Showing {{ studyResultsFrom }}–{{ studyResultsTo }} of {{ studyStats.studiedWords.length }}
              </span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  :disabled="studyResultsPage <= 0"
                  @click="studyResultsPage = Math.max(0, studyResultsPage - 1)"
                >
                  Previous
                </button>
                <button
                  type="button"
                  class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  :disabled="studyResultsPage >= studyResultsTotalPages - 1"
                  @click="studyResultsPage = Math.min(studyResultsTotalPages - 1, studyResultsPage + 1)"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <p v-else class="text-gray-500 text-sm">No studied words yet. Use Study from My Word List to start.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const { loggedIn } = useAuth()

const flashcardCorrectRepetitions = ref(2)
const flashcardSessionSize = ref(20)
const flashcardSessionCardMultiplier = ref(2)
const longPhraseWordLimit = ref(10)
const saving = ref(false)
const saveMessage = ref('')
const saveMessageType = ref<'success' | 'error'>('success')

type StudyStats = {
  summary: { wordsStudied: number; totalShown: number; totalCorrect: number }
  studiedWords: Array<{
    wordListId: number
    wordData: unknown
    archivedAt: number | null
    timesShown: number
    timesCorrect: number
    attemptsUntilFirstCorrect: number | null
  }>
}
const studyStats = ref<StudyStats>({
  summary: { wordsStudied: 0, totalShown: 0, totalCorrect: 0 },
  studiedWords: []
})
const studyStatsLoading = ref(false)
const studyStatsError = ref('')

const STUDY_RESULTS_PAGE_SIZE = 25
const studyResultsPage = ref(0)
const studyResultsTotalPages = computed(() =>
  Math.max(1, Math.ceil(studyStats.value.studiedWords.length / STUDY_RESULTS_PAGE_SIZE))
)
const paginatedStudiedWords = computed(() => {
  const list = studyStats.value.studiedWords
  const start = studyResultsPage.value * STUDY_RESULTS_PAGE_SIZE
  return list.slice(start, start + STUDY_RESULTS_PAGE_SIZE)
})
const studyResultsFrom = computed(() => {
  const total = studyStats.value.studiedWords.length
  if (total === 0) return 0
  return studyResultsPage.value * STUDY_RESULTS_PAGE_SIZE + 1
})
const studyResultsTo = computed(() => {
  const total = studyStats.value.studiedWords.length
  const end = (studyResultsPage.value + 1) * STUDY_RESULTS_PAGE_SIZE
  return Math.min(end, total)
})

const studyStatsPercentCorrect = computed(() => {
  const shown = studyStats.value.summary.totalShown
  const correct = studyStats.value.summary.totalCorrect
  if (shown <= 0) return '—'
  return `${Math.round((correct / shown) * 100)}%`
})

function wordEntryWord (wd: unknown): string {
  if (wd && typeof wd === 'object' && wd !== null && 'wordEntry' in wd) {
    const we = (wd as { wordEntry?: { word?: string } }).wordEntry
    if (we && typeof we === 'object' && typeof we.word === 'string') return we.word
  }
  return '—'
}

function wordEntryTranslation (wd: unknown): string {
  if (wd && typeof wd === 'object' && wd !== null && 'wordEntry' in wd) {
    const we = (wd as { wordEntry?: { wordTranslation?: string } }).wordEntry
    if (we && typeof we === 'object' && typeof we.wordTranslation === 'string') return we.wordTranslation
  }
  return '—'
}

async function loadStudyStats () {
  if (!loggedIn.value) return
  studyStatsLoading.value = true
  studyStatsError.value = ''
  try {
    const res = await $fetch<StudyStats>('/api/user/study/stats')
    studyStats.value = res
    studyResultsPage.value = 0
  } catch (e: any) {
    studyStatsError.value = e.data?.message || 'Failed to load study stats'
    studyStats.value = { summary: { wordsStudied: 0, totalShown: 0, totalCorrect: 0 }, studiedWords: [] }
  } finally {
    studyStatsLoading.value = false
  }
}

async function loadSettings () {
  if (!loggedIn.value) return
  try {
    const data = await $fetch<Record<string, string>>('/api/user/settings')
    const n = parseInt(data?.flashcard_correct_repetitions ?? '2', 10)
    flashcardCorrectRepetitions.value = Number.isFinite(n) && n >= 0 && n <= 3 ? n : 2
    const size = parseInt(data?.flashcard_session_size ?? '20', 10)
    const allowed = [5, 10, 20, 50, 100]
    flashcardSessionSize.value = Number.isFinite(size) && allowed.includes(size) ? size : 20
    const mult = parseInt(data?.flashcard_session_card_multiplier ?? '2', 10)
    flashcardSessionCardMultiplier.value = Number.isFinite(mult) && mult >= 1 && mult <= 5 ? mult : 2
    const limit = parseInt(data?.long_phrase_word_limit ?? '10', 10)
    const limitAllowed = [5, 10, 15, 20, 50]
    longPhraseWordLimit.value = Number.isFinite(limit) && limitAllowed.includes(limit) ? limit : 10
  } catch {
    flashcardCorrectRepetitions.value = 2
    flashcardSessionSize.value = 20
    flashcardSessionCardMultiplier.value = 2
    longPhraseWordLimit.value = 10
  }
}

const cardMultiplierOptions = computed(() => {
  const words = flashcardSessionSize.value
  return [1, 2, 3, 4, 5].map((multiplier) => ({
    multiplier,
    cards: words * multiplier
  }))
})

async function saveSettings () {
  if (!loggedIn.value) return
  saving.value = true
  saveMessage.value = ''
  try {
    await $fetch('/api/user/settings', {
      method: 'PATCH',
      body: {
        flashcard_correct_repetitions: String(flashcardCorrectRepetitions.value),
        flashcard_session_size: String(flashcardSessionSize.value),
        flashcard_session_card_multiplier: String(flashcardSessionCardMultiplier.value),
        long_phrase_word_limit: String(longPhraseWordLimit.value)
      }
    })
    saveMessage.value = 'Saved'
    saveMessageType.value = 'success'
    setTimeout(() => { saveMessage.value = '' }, 2000)
  } catch (e: any) {
    saveMessage.value = e.data?.message || 'Failed to save'
    saveMessageType.value = 'error'
  } finally {
    saving.value = false
  }
}

watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    loadSettings()
    loadStudyStats()
  }
}, { immediate: true })
</script>
