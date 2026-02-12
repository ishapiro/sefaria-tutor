import type { NoteContext } from '~/composables/useNotes'

export interface VerseSection {
  displayNumber: string | number
  en: string
  he: string
  number?: number
}

/**
 * Build context for opening the note modal from a verse section and phrase index.
 * Uses splitIntoPhrases to get the Hebrew and English phrase at the given index.
 * bookTitle and bookPath are stored with the note for in-app navigation (same as word list).
 */
export function buildNoteContext (
  section: VerseSection,
  phraseIndex: number,
  bookTitle: string,
  bookPath: string | undefined,
  lastSefariaRef: string,
  splitIntoPhrases: (segment: string) => string[]
): NoteContext | null {
  const hePhrases = splitIntoPhrases(section.he)
  const enPhrases = splitIntoPhrases(section.en)
  const hePhrase = hePhrases[phraseIndex]?.trim() ?? ''
  const enPhrase = enPhrases[phraseIndex]?.trim() ?? ''
  if (!hePhrase) return null

  const refDisplay = bookTitle
    ? `${bookTitle} ${section.displayNumber}`
    : String(section.displayNumber)

  const displayNum = String(section.displayNumber)
  const sefariaRef = displayNum.includes(':')
    ? `${bookTitle.replace(/\s+/g, '_')}_${displayNum.replace(':', '.')}`
    : lastSefariaRef

  return {
    hePhrase,
    enPhrase,
    refDisplay,
    sefariaRef: sefariaRef || refDisplay.replace(/\s+/g, '_'),
    bookTitle: bookTitle || undefined,
    bookPath: bookPath || undefined
  }
}
