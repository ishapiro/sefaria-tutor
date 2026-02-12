/**
 * Pure text/phrase utilities (reusable across pages and composables).
 */

/** Returns true if phrase has more than one sentence. Splits on . ? ! : ; newline, sof pasuk ׃, paseq ׀. */
export function hasMultipleSentences (phrase: string): boolean {
  if (!phrase?.trim()) return false
  const sentences = phrase.split(/[.?!:;\n\u05C3\u05C0\uFF1A]+/).map(s => s.trim()).filter(Boolean)
  return sentences.length > 1
}

/** Returns the number of space-separated tokens in text. */
export function countWords (text: string): number {
  if (!text?.trim()) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}
