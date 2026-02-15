/**
 * Pure text/phrase utilities (reusable across pages and composables).
 */

/** Hebrew maqaf (hyphen that connects prefix to word, e.g. אֶל־מֹשֶׁה = to-Moses). */
const MAQAF = '\u05BE'
/** Hebrew vav (ו). Leading vav on a proper name (e.g. וּמֹשֶׁה = and Moses) is stripped for concordance. */
const VAV = '\u05D5'
/** Hebrew niqqud/combining marks (used to skip vav's vowel when stripping leading vav). */
const HEBREW_NIQQUD = /[\u0591-\u05BD\u05BF-\u05C7]/

/**
 * Strip a leading vav (ו) and any niqqud on it from a Hebrew word (e.g. וּמֹשֶׁה → מֹשֶׁה).
 * Use for proper names so the concordance searches for the name without "and".
 */
export function stripLeadingVav (token: string): string {
  if (!token?.trim()) return token || ''
  const trimmed = token.trim()
  if (trimmed.charAt(0) !== VAV) return trimmed
  let i = 1
  while (i < trimmed.length && HEBREW_NIQQUD.test(trimmed.charAt(i))) i++
  return trimmed.slice(i).trim() || trimmed
}

/**
 * For a token that is "prefix־main" (exactly two segments, e.g. אֶל־מֹשֶׁה), return the main word after the maqaf (מֹשֶׁה).
 * Do not apply for roots with maqafs between letters (e.g. ר־ע־ש); returns trimmed token unchanged in that case.
 */
export function wordAfterMaqaf (token: string): string {
  if (!token?.trim()) return token || ''
  const trimmed = token.trim()
  const parts = trimmed.split(MAQAF).map(s => s.trim()).filter(Boolean)
  if (parts.length === 2) return parts[1]!
  if (parts.length > 2) return trimmed
  if (trimmed.includes('-') || trimmed.includes('־')) {
    const byHyphen = trimmed.split(/-|־/).map(s => s.trim()).filter(Boolean)
    if (byHyphen.length === 2) return byHyphen[1]!
  }
  return trimmed
}

/**
 * Return the substantive word for concordance/lookup: after maqaf (אֶל־מֹשֶׁה → מֹשֶׁה), then strip leading vav (וּמֹשֶׁה → מֹשֶׁה).
 */
export function substantiveWord (token: string): string {
  return stripLeadingVav(wordAfterMaqaf(token))
}

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

/** Strip Hebrew niqqud (vowel points) so consonant-only root matches voweled text. */
export function stripHebrewNiqqud (text: string): string {
  if (!text) return ''
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '')
}

/** Returns true if phrase contains the word (e.g. for Hebrew with prefixes/suffixes). Uses consonant-only match so root (e.g. רעה) matches voweled form (רֹעֶה). */
export function phraseContainsWord (phrase: string, word: string): boolean {
  if (!phrase || !word) return false
  const normalizedPhrase = phrase.trim()
  const normalizedWord = word.trim()
  if (normalizedPhrase.includes(normalizedWord)) return true
  const phraseConsonants = stripHebrewNiqqud(normalizedPhrase)
  const wordConsonants = stripHebrewNiqqud(normalizedWord)
  return phraseConsonants.includes(wordConsonants)
}
