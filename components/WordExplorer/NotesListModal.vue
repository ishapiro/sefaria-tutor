<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-hidden p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
      <div class="flex justify-between items-center px-4 py-3 border-b border-gray-200 shrink-0">
        <h2 class="text-xl font-bold">My Notes</h2>
        <button
          type="button"
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          aria-label="Close"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <div v-if="loading && notes.length === 0" class="flex-1 flex items-center justify-center text-gray-500">
        Loading your notes…
      </div>

      <div v-else-if="notes.length === 0" class="flex-1 flex items-center justify-center p-8">
        <p class="text-gray-600 text-center">
          You don't have any notes yet. Click the 📝 icon next to a phrase in the text to add a note.
        </p>
      </div>

      <div v-else class="flex-1 flex min-h-0">
        <!-- Table of contents (left): grouped by book -->
        <aside class="w-72 sm:w-80 border-r border-gray-200 flex flex-col shrink-0 bg-gray-50/50 overflow-hidden">
          <div class="px-3 py-2 text-sm text-gray-600 border-b border-gray-200">
            {{ totalNotes }} note{{ totalNotes === 1 ? '' : 's' }}
            <span v-if="hasMore" class="text-gray-400"> · showing {{ notes.length }}</span>
          </div>
          <div class="flex-1 overflow-y-auto min-h-0">
            <div
              v-for="group in groupedToc"
              :key="group.bookKey"
              class="py-2"
            >
              <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0 bg-gray-50/95">
                {{ group.bookTitle }}
              </div>
              <button
                v-for="note in group.notes"
                :key="note.id"
                type="button"
                class="w-full px-3 py-2 text-left text-sm border-l-2 transition-colors"
                :class="selectedNote?.id === note.id
                  ? 'border-blue-500 bg-blue-50/80 text-blue-900'
                  : 'border-transparent hover:bg-gray-100 text-gray-800'"
                @click="selectedNote = note"
              >
                <span class="font-medium text-gray-700 block truncate">{{ note.refDisplay }}</span>
                <span class="text-xs text-gray-500 block truncate mt-0.5" style="direction: rtl">{{ truncateHe(note.hePhrase, 35) }}</span>
              </button>
            </div>
          </div>
          <div v-if="hasMore" class="p-2 border-t border-gray-200">
            <button
              type="button"
              class="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        </aside>

        <!-- Detail (right): view / edit selected note -->
        <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div v-if="!selectedNote" class="flex-1 flex items-center justify-center text-gray-500 p-8">
            Select a note from the list
          </div>
          <template v-else>
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Hebrew phrase</label>
                <p class="text-xl text-gray-900 rounded-lg bg-gray-50 p-3 text-right" style="direction: rtl">
                  {{ selectedNote.hePhrase }}
                </p>
              </div>
              <div v-if="selectedNote.enPhrase" class="space-y-1">
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">English phrase</label>
                <p class="text-gray-700 rounded-lg bg-gray-50 p-3">{{ selectedNote.enPhrase }}</p>
              </div>
              <div class="text-sm">
                <span class="font-medium text-gray-500">Reference </span>
                <button
                  type="button"
                  class="text-blue-600 hover:underline font-medium"
                  @click="$emit('navigate-to-reference', selectedNote)"
                >
                  {{ selectedNote.refDisplay }}
                </button>
              </div>
              <div class="space-y-1">
                <label for="detail-note-text" class="text-xs font-medium text-gray-500 uppercase tracking-wide">Note</label>
                <textarea
                  id="detail-note-text"
                  v-model="editingNoteText"
                  class="w-full min-h-[120px] max-h-[40vh] p-3 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your note…"
                  rows="4"
                />
              </div>
              <p v-if="detailError" class="text-sm text-red-600">{{ detailError }}</p>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
              <button
                type="button"
                class="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                :disabled="deletingNoteId === selectedNote.id"
                @click="confirmDelete(selectedNote)"
              >
                {{ deletingNoteId === selectedNote.id ? 'Deleting…' : 'Delete' }}
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                :disabled="saveLoading"
                @click="saveNote"
              >
                {{ saveLoading ? 'Saving…' : 'Update note' }}
              </button>
            </div>
          </template>
        </main>
      </div>
    </div>

    <!-- Delete confirmation -->
    <div
      v-if="noteToDelete"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      @click.self="noteToDelete = null"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete this note?</h3>
        <p class="text-gray-600 text-sm mb-4">
          This will permanently remove the note. This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            @click="noteToDelete = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            :disabled="deletingNoteId !== null"
            @click="doDeleteNote"
          >
            {{ deletingNoteId !== null ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserNote } from '~/composables/useNotes'

const props = defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
  'navigate-to-reference': [note: UserNote]
}>()

const PAGE_SIZE = 100
const notes = ref<UserNote[]>([])
const totalNotes = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const selectedNote = ref<UserNote | null>(null)
const editingNoteText = ref('')
const saveLoading = ref(false)
const detailError = ref<string | null>(null)
const deletingNoteId = ref<number | null>(null)
const noteToDelete = ref<UserNote | null>(null)

function truncateHe (text: string, max: number): string {
  if (!text || text.length <= max) return text
  return text.trim().slice(0, max) + '…'
}

function bookKey (note: UserNote): string {
  return (note.bookTitle || note.refDisplay.split(/\s+/)[0] || note.sefariaRef.split(/[_,]/)[0] || 'Other').trim()
}

const groupedToc = computed(() => {
  const byBook = new Map<string, { bookTitle: string; notes: UserNote[] }>()
  for (const note of notes.value) {
    const key = bookKey(note)
    const title = note.bookTitle || key.replace(/_/g, ' ')
    if (!byBook.has(key)) byBook.set(key, { bookTitle: title, notes: [] })
    byBook.get(key)!.notes.push(note)
  }
  return Array.from(byBook.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bookKey, { bookTitle, notes: list }]) => ({ bookKey, bookTitle, notes: list }))
})

const hasMore = computed(() => notes.value.length < totalNotes.value)

watch(selectedNote, (n) => {
  editingNoteText.value = n?.noteText ?? ''
  detailError.value = null
}, { immediate: true })

async function fetchPage (offset: number, append: boolean) {
  const isAppend = append && notes.value.length > 0
  if (!isAppend) loading.value = true
  else loadingMore.value = true
  try {
    const data = await $fetch<{ notes: UserNote[]; total: number }>('/api/notes', {
      params: { limit: PAGE_SIZE, offset }
    })
    const list = data.notes ?? []
    totalNotes.value = data.total ?? 0
    if (isAppend) notes.value = [...notes.value, ...list]
    else {
      notes.value = list
      if (list.length > 0 && !selectedNote.value) selectedNote.value = list[0]
      else if (list.length === 0) selectedNote.value = null
    }
  } catch {
    if (!isAppend) notes.value = []
    totalNotes.value = 0
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore () {
  fetchPage(notes.value.length, true)
}

async function saveNote () {
  const note = selectedNote.value
  if (!note) return
  saveLoading.value = true
  detailError.value = null
  try {
    await $fetch(`/api/notes/${note.id}`, {
      method: 'PUT',
      body: { noteText: editingNoteText.value }
    })
    const idx = notes.value.findIndex(n => n.id === note.id)
    if (idx >= 0) {
      notes.value = notes.value.slice()
      notes.value[idx] = { ...note, noteText: editingNoteText.value }
    }
  } catch (err: any) {
    detailError.value = err.data?.message ?? err.message ?? 'Failed to update note'
  } finally {
    saveLoading.value = false
  }
}

function confirmDelete (note: UserNote) {
  noteToDelete.value = note
}

async function doDeleteNote () {
  const note = noteToDelete.value
  if (!note) return
  deletingNoteId.value = note.id
  try {
    await $fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
    notes.value = notes.value.filter(n => n.id !== note.id)
    totalNotes.value = Math.max(0, totalNotes.value - 1)
    if (selectedNote.value?.id === note.id) {
      selectedNote.value = notes.value[0] ?? null
    }
    noteToDelete.value = null
  } catch {
    // keep dialog open
  } finally {
    deletingNoteId.value = null
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    notes.value = []
    totalNotes.value = 0
    selectedNote.value = null
    noteToDelete.value = null
    fetchPage(0, false)
  }
})
</script>
