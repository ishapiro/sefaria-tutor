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

/** Strip HTML tags to plain text. Safe for SSR (uses regex when document is unavailable). */
export function getPlainTextFromHtml (html: string): string {
  if (!html) return ''
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return (temp.textContent ?? temp.innerText ?? html).trim()
  }
  return html.replace(/<[^>]+>/g, '').trim()
}

/** Split text into phrases by comma, period, or colon (English and Hebrew). */
export function splitIntoPhrases (text: string): string[] {
  if (!text) return []
  const plainText = getPlainTextFromHtml(text)
  const regex = /[^,.׃:;!?\u05C3\u05C0]+[.,׃:;!?\u05C3\u05C0]*/g
  const matches = plainText.match(regex)
  return matches ? matches.map(m => m.trim()).filter(Boolean) : [plainText]
}

/** Count how many times a word appears in the phrase (space-separated tokens). */
export function countWordInPhrase (phrase: string, word: string): number {
  if (!phrase || !word) return 0
  const plain = phrase.replace(/<[^>]+>/g, '').trim()
  const tokens = plain.split(/\s+/).filter(Boolean)
  return tokens.filter(t => t === word).length
}

/** Returns true if phrase contains the word (e.g. for Hebrew with prefixes/suffixes). */
export function phraseContainsWord (phrase: string, word: string): boolean {
  if (!phrase || !word) return false
  const normalizedPhrase = phrase.trim()
  const normalizedWord = word.trim()
  return normalizedPhrase.includes(normalizedWord)
}
