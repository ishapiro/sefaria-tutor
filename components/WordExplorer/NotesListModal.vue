<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 overflow-hidden p-0 sm:p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white shadow-xl w-full max-w-6xl h-full sm:h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-none sm:rounded-lg">
      <!-- Page header -->
      <header class="shrink-0 border-b border-gray-200 px-4 py-3 bg-white">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div class="min-w-0">
            <h2 class="text-xl font-bold text-gray-900 tracking-tight">My Notes</h2>
            <p class="mt-1.5 text-sm text-gray-500 leading-snug hidden sm:block">
              Check the notes you want to print or copy, then use the buttons below.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0 pt-1 sm:pt-0 justify-end">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              aria-label="Close"
              @click="$emit('close')"
            >
              Close
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="selectedIds.length === 0"
              @click="printSelected"
            >
              🖨️ Print {{ selectedIds.length ? `(${selectedIds.length})` : '' }}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
              :class="copySuccess ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'"
              :disabled="selectedIds.length === 0"
              @click="copySelected"
            >
              <span v-if="copySuccess" class="text-green-600">✓ Copied</span>
              <template v-else>
                <span aria-hidden="true">📋</span>
                Copy{{ selectedIds.length ? ` (${selectedIds.length})` : '' }}
              </template>
            </button>
          </div>
        </div>
      </header>

      <div v-if="loading && notes.length === 0" class="flex-1 flex items-center justify-center text-gray-500">
        Loading your notes…
      </div>

      <div v-else-if="notes.length === 0" class="flex-1 flex items-center justify-center p-8">
        <p class="text-gray-600 text-center">
          You don't have any notes yet. Click the 📝 icon next to a phrase in the text to add a note.
        </p>
      </div>

      <div v-else class="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <!-- Left: note list (table of contents by book) -->
        <aside class="w-full md:w-72 lg:w-80 flex flex-col shrink-0 overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 min-h-0 md:min-h-[200px] md:max-h-none max-h-[20rem] md:max-h-none bg-gray-50 sm:bg-gray-50/50">
          <div class="shrink-0 px-3 md:px-3 py-2 md:py-2 border-b border-gray-200 bg-white sm:bg-transparent">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Note list</h3>
              <span class="text-xs text-gray-500 tabular-nums">
                {{ totalNotes }} note{{ totalNotes === 1 ? '' : 's' }}
                <span v-if="hasMore" class="text-gray-400"> · {{ notes.length }}</span>
              </span>
            </div>
            <div v-if="selectedIds.length > 0" class="mt-2 flex justify-end">
              <button
                type="button"
                class="text-xs font-medium text-gray-500 hover:text-gray-700 active:text-gray-900 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-end"
                @click="clearSelection"
              >
                Clear selection
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto min-h-0 overscroll-contain max-h-[14rem] md:max-h-none bg-white sm:bg-transparent border-t border-gray-100 sm:border-t-0">
            <div
              v-for="group in groupedToc"
              :key="group.bookKey"
              class="pt-2 md:pt-2 first:pt-1 md:first:pt-2"
            >
              <div class="px-3 md:px-3 py-1.5 md:py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-white sm:bg-gray-50/95 z-10 border-b border-gray-100 md:border-0">
                {{ group.bookTitle }}
              </div>
              <div
                v-for="note in group.notes"
                :key="note.id"
                class="flex items-stretch border-l-2 transition-colors min-h-[44px] md:min-h-[48px]"
                :class="selectedNote?.id === note.id
                  ? 'border-blue-500 bg-blue-50/70'
                  : 'border-transparent'"
              >
                <label class="flex items-center pl-3 md:pl-3 pr-2 md:pr-2 shrink-0 cursor-pointer touch-manipulation min-w-[44px] md:min-w-[44px] min-h-[44px] md:min-h-[48px]" @click.stop>
                  <input
                    v-model="selectedIds"
                    type="checkbox"
                    :value="note.id"
                    class="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 w-5 h-5"
                    @click.stop
                  />
                </label>
                <button
                  type="button"
                  class="flex-1 w-full min-w-0 px-3 md:px-3 py-2.5 md:py-3 text-left touch-manipulation rounded-r-sm md:rounded-none"
                  :class="selectedNote?.id === note.id
                    ? 'bg-blue-50/70 text-blue-900'
                    : 'text-gray-800 hover:bg-gray-50 active:bg-gray-100'"
                  @click="selectedNote = note"
                >
                  <span class="text-sm font-medium text-gray-800 block truncate">{{ note.refDisplay }}</span>
                  <span class="text-xs text-gray-500 block truncate mt-0.5" style="direction: rtl">{{ truncateHe(note.hePhrase, 35) }}</span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="hasMore" class="shrink-0 p-2 md:p-2 border-t border-gray-200 bg-white sm:bg-transparent">
            <button
              type="button"
              class="w-full min-h-[44px] py-2.5 md:py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg disabled:opacity-50 touch-manipulation"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        </aside>

        <!-- Right: note detail (view / edit) -->
        <main class="flex-1 flex flex-col min-w-0 overflow-hidden border-t md:border-t-0 md:border-l border-gray-200 min-h-0 bg-white">
          <div v-if="!selectedNote" class="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
            <p class="text-sm font-medium text-gray-400">Note detail</p>
            <p class="mt-2 text-sm text-center text-gray-500 max-w-[280px]">Select a note from the list above to view or edit it.</p>
          </div>
          <template v-else>
            <div class="shrink-0 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Note detail</h3>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wider">Hebrew phrase</label>
                <p class="text-lg sm:text-xl text-gray-900 rounded-lg bg-gray-50 p-3 text-right min-h-[2.5em] leading-relaxed" style="direction: rtl">
                  {{ selectedNote.hePhrase }}
                </p>
              </div>
              <div v-if="selectedNote.enPhrase" class="space-y-1.5">
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wider">English phrase</label>
                <p class="text-base sm:text-lg text-gray-700 rounded-lg bg-gray-50 p-3 leading-relaxed">{{ selectedNote.enPhrase }}</p>
              </div>
              <div class="space-y-1">
                <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</span>
                <button
                  type="button"
                  class="block text-sm text-blue-600 hover:underline font-medium min-h-[44px] py-2 -my-1 touch-manipulation text-left"
                  @click="$emit('navigate-to-reference', selectedNote)"
                >
                  {{ selectedNote.refDisplay }}
                </button>
              </div>
              <div class="space-y-1.5">
                <label for="detail-note-text" class="text-xs font-medium text-gray-500 uppercase tracking-wider">Note</label>
                <textarea
                  id="detail-note-text"
                  v-model="editingNoteText"
                  class="w-full min-h-[120px] max-h-[40vh] p-3 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base min-w-0 leading-relaxed"
                  placeholder="Your note…"
                  rows="4"
                />
              </div>
              <p v-if="detailError" class="text-sm text-red-600">{{ detailError }}</p>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50/80 shrink-0">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="deletingNoteId === selectedNote.id"
                @click="confirmDelete(selectedNote)"
              >
                {{ deletingNoteId === selectedNote.id ? 'Deleting…' : 'Delete' }}
              </button>
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
      class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4"
      @click.self="noteToDelete = null"
    >
      <div class="bg-white rounded-t-2xl sm:rounded-lg shadow-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete this note?</h3>
        <p class="text-gray-600 text-sm mb-6">
          This will permanently remove the note. This action cannot be undone.
        </p>
        <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="noteToDelete = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-all duration-150 whitespace-nowrap inline-flex items-center min-h-[36px] bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
import { copyToClipboard } from '~/utils/clipboard'

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
const selectedIds = ref<number[]>([])
const copySuccess = ref(false)

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

function clearSelection () {
  selectedIds.value = []
}

function buildSelectedNotesText (): string {
  const toCopy = notes.value.filter(n => selectedIds.value.includes(n.id))
  if (toCopy.length === 0) return ''
  return toCopy.map(n => {
    const parts = [
      `Reference: ${n.refDisplay}`,
      `Hebrew: ${n.hePhrase}`,
      ...(n.enPhrase ? [`English: ${n.enPhrase}`] : []),
      ...(n.noteText ? [`Note: ${n.noteText}`] : [])
    ]
    return parts.join('\n')
  }).join('\n\n---\n\n')
}

async function copySelected () {
  const text = buildSelectedNotesText()
  if (!text) return
  try {
    await copyToClipboard(text)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch {
    // ignore
  }
}

function printSelected () {
  const toPrint = notes.value.filter(n => selectedIds.value.includes(n.id))
  if (toPrint.length === 0) return
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My Notes</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 1in auto; padding: 0 1rem; color: #111; font-size: 12pt; }
    h1 { font-size: 18pt; margin-bottom: 1rem; }
    .note { break-inside: avoid; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
    .note:last-child { border-bottom: none; }
    .ref { font-weight: 600; color: #1a1a1a; margin-bottom: 0.25rem; }
    .he { font-size: 14pt; text-align: right; direction: rtl; margin: 0.25rem 0; }
    .en { color: #333; margin: 0.25rem 0; }
    .note-text { margin-top: 0.5rem; white-space: pre-wrap; font-size: 11pt; }
  </style>
</head>
<body>
  <h1>My Notes</h1>
  ${toPrint.map(n => `
  <div class="note">
    <div class="ref">${escapeHtml(n.refDisplay)}</div>
    <div class="he">${escapeHtml(n.hePhrase)}</div>
    ${n.enPhrase ? `<div class="en">${escapeHtml(n.enPhrase)}</div>` : ''}
    ${n.noteText ? `<div class="note-text">${escapeHtml(n.noteText)}</div>` : ''}
  </div>`).join('')}
</body>
</html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 250)
}

function escapeHtml (s: string): string {
  const el = document.createElement('div')
  el.textContent = s
  return el.innerHTML
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
    selectedIds.value = []
    noteToDelete.value = null
    fetchPage(0, false)
  }
})
</script>
