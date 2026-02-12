/** Context passed when opening the note modal for a phrase (Hebrew, English, reference). */
export interface NoteContext {
  hePhrase: string
  enPhrase: string
  refDisplay: string
  sefariaRef: string
  bookTitle?: string
  bookPath?: string
}

/** Note record as returned from the API. */
export interface UserNote {
  id: number
  hePhrase: string
  enPhrase: string
  refDisplay: string
  sefariaRef: string
  noteText: string
  createdAt: number
  bookTitle?: string
  bookPath?: string
}

function normalizePhrase (s: string) {
  return s.trim().replace(/\s+/g, ' ')
}

export function useNotes () {
  const noteModalOpen = useState('notes-modal-open', () => false)
  const noteContext = useState<NoteContext | null>('notes-context', () => null)
  const noteText = useState('notes-note-text', () => '')
  const existingNoteId = useState<number | null>('notes-existing-id', () => null)
  const saveLoading = useState('notes-save-loading', () => false)
  const saveError = useState<string | null>('notes-save-error', () => null)
  const openNoteLoading = useState('notes-open-loading', () => false)

  async function openNoteModal (context: NoteContext) {
    saveError.value = null
    existingNoteId.value = null
    noteContext.value = context
    noteText.value = ''
    openNoteLoading.value = true
    noteModalOpen.value = true
    try {
      const data = await $fetch<{ notes: UserNote[] }>('/api/notes')
      const notes = data.notes ?? []
      const heNorm = normalizePhrase(context.hePhrase)
      const refNorm = (context.sefariaRef || '').trim()
      const existing = notes.find(
        (n) =>
          normalizePhrase(n.hePhrase) === heNorm &&
          (n.sefariaRef || '').trim() === refNorm
      )
      if (existing) {
        existingNoteId.value = existing.id
        noteText.value = existing.noteText || ''
      }
    } catch {
      // Keep modal open with empty note (create new)
    } finally {
      openNoteLoading.value = false
    }
  }

  function closeNoteModal () {
    noteModalOpen.value = false
    noteContext.value = null
    noteText.value = ''
    existingNoteId.value = null
    saveError.value = null
  }

  async function saveNote () {
    const ctx = noteContext.value
    if (!ctx) return

    saveLoading.value = true
    saveError.value = null
    try {
      const id = existingNoteId.value
      if (id != null) {
        await $fetch(`/api/notes/${id}`, {
          method: 'PUT',
          body: { noteText: noteText.value }
        })
      } else {
        await $fetch('/api/notes/add', {
          method: 'POST',
          body: {
            hePhrase: ctx.hePhrase,
            enPhrase: ctx.enPhrase,
            refDisplay: ctx.refDisplay,
            sefariaRef: ctx.sefariaRef,
            bookTitle: ctx.bookTitle,
            bookPath: ctx.bookPath,
            noteText: noteText.value
          }
        })
      }
      closeNoteModal()
    } catch (err: any) {
      saveError.value = err.data?.message ?? err.message ?? 'Failed to save note'
    } finally {
      saveLoading.value = false
    }
  }

  return {
    noteModalOpen,
    noteContext,
    noteText,
    existingNoteId,
    saveLoading,
    saveError,
    openNoteLoading,
    openNoteModal,
    closeNoteModal,
    saveNote
  }
}
