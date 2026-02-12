<template>
  <div
    v-if="noteModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8"
    @click.self="closeNoteModal"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-[90vw] max-w-2xl max-h-[90vh] flex flex-col my-8 mx-4"
      role="dialog"
      aria-labelledby="notes-modal-title"
    >
      <div class="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
        <h2 id="notes-modal-title" class="text-xl font-bold text-gray-900">
          {{ existingNoteId ? 'Edit note' : 'My Note' }}
        </h2>
        <button
          type="button"
          class="min-h-[44px] px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
          aria-label="Close"
          @click="closeNoteModal"
        >
          Close
        </button>
      </div>

      <div class="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
        <div v-if="openNoteLoading" class="text-center py-6 text-gray-500">
          Checking for existing note…
        </div>
        <template v-else-if="noteContext">
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Hebrew phrase</label>
            <p
              class="text-2xl text-gray-900 rounded-lg bg-gray-50 p-3 text-right"
              style="direction: rtl"
            >
              {{ noteContext.hePhrase }}
            </p>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">English phrase</label>
            <p class="text-lg text-gray-700 rounded-lg bg-gray-50 p-3">
              {{ noteContext.enPhrase || '—' }}
            </p>
          </div>
          <div class="text-sm">
            <span class="font-medium text-gray-500">Reference </span>
            <a
              :href="sefariaLink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
            >
              {{ noteContext.refDisplay }}
            </a>
          </div>
          <div class="space-y-1">
            <label for="note-textarea" class="text-xs font-medium text-gray-500 uppercase tracking-wide">Note</label>
            <textarea
              id="note-textarea"
              v-model="noteText"
              class="w-full min-h-[120px] max-h-[40vh] p-3 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
              placeholder="Type your note here…"
              rows="5"
            />
          </div>
          <p v-if="saveError" class="text-sm text-red-600">
            {{ saveError }}
          </p>
        </template>
      </div>

      <div class="flex justify-end gap-3 p-4 border-t border-gray-200 shrink-0 bg-gray-50 rounded-b-lg">
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          @click="closeNoteModal"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="saveLoading"
          @click="saveNote"
        >
          {{ saveLoading ? 'Saving…' : (existingNoteId ? 'Update note' : 'Save note') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NoteContext } from '~/composables/useNotes'
import { useNotes } from '~/composables/useNotes'

const {
  noteModalOpen,
  noteContext,
  noteText,
  existingNoteId,
  saveLoading,
  saveError,
  openNoteLoading,
  closeNoteModal,
  saveNote
} = useNotes()

const sefariaLink = computed(() => {
  const ctx = noteContext.value as NoteContext | null
  if (!ctx?.sefariaRef) return '#'
  const path = ctx.sefariaRef.replace(/_/g, '.')
  return `https://www.sefaria.org/${path}`
})
</script>
