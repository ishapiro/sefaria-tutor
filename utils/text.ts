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

const NBSP = '\u00A0' // non-breaking space

/**
 * Normalize English text that has missing spaces after punctuation.
 * Sefaria API responses sometimes have formatting issues (e.g. "assemble,and", "Lit."utter.").
 * Matches standard and Unicode/smart punctuation, and any Unicode letter.
 */
export function normalizeEnglishSpacing (text: string): string {
  if (!text || typeof text !== 'string') return text
  // Add space after punctuation when immediately followed by a letter (any script).
  // Punctuation: . , : ; ! ? ) ] } " ' and curly/smart quotes " " ' ' (U+201C U+201D U+2018 U+2019)
  return text.replace(/([.,:;!?)\]\}\u0022\u0027\u201C\u201D\u2018\u2019])(\p{L})/gu, '$1 $2')
}

/**
 * Like normalizeEnglishSpacing but for HTML mode: use non-breaking space, and only add space
 * after double-quote when it is the trailing (closing) quote. Explicitly adds space after : and ;.
 */
export function normalizeEnglishSpacingForHtml (text: string): string {
  if (!text || typeof text !== 'string') return text
  // Punctuation that gets non-breaking space after when followed by letter. Exclude straight " (handled below).
  const punctNoQuote = /([.,:;!?)\]\}\u0027\u201C\u201D\u2018\u2019])(\p{L})/gu
  let out = text.replace(punctNoQuote, `$1${NBSP}$2`)
  // Only add space after " when it is the trailing (closing) quote: letter/digit + " + letter
  out = out.replace(/([\p{L}0-9])(\u0022)(\p{L})/gu, `$1"${NBSP}$3`)
  return out
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

/** Tags allowed in Sefaria verse text. */
const SEFARIA_ALLOWED_TAGS = new Set(['b', 'i', 'sup', 'sub', 'span', 'small', 'br', 'a', 'strong', 'em', 'ref', 'note'])

/** Safe href: refs like Genesis.2.7, paths, or sefaria.org. No javascript:, data:, etc. */
function isSafeHref (href: string): boolean {
  if (!href || typeof href !== 'string') return false
  const h = href.trim()
  if (h.startsWith('javascript:') || h.startsWith('data:') || h.startsWith('vbscript:')) return false
  if (h.startsWith('/') || h.startsWith('#')) return true
  if (/^https?:\/\/(www\.)?sefaria\.org\//i.test(h)) return true
  return /^[a-zA-Z0-9._\-:]+$/.test(h)
}

/** Sanitize a single attribute value for class (alphanumeric, spaces, hyphens). */
function isSafeClass (cls: string): boolean {
  return /^[a-zA-Z0-9\s\-_]+$/.test(cls ?? '')
}

/**
 * Sanitize HTML from Sefaria API for safe use with v-html.
 * Preserves: b, i, sup, sub, span, small, br, a, strong, em.
 * Keeps class on span/sup/i for poetry, footnotes. Keeps safe href on a.
 */
export function sanitizeSefariaVerseHtml (html: string): string {
  if (!html || typeof html !== 'string') return ''
  return html.replace(/<\/?([a-z][a-z0-9]*)(\s+[^>]*)?\/?>/gi, (match, tagName: string, attrs: string) => {
    const name = tagName.toLowerCase()
    if (!SEFARIA_ALLOWED_TAGS.has(name)) return ''

    if (match.startsWith('</')) return `</${name}>`

    if (name === 'br') return '<br>'

    if (name === 'a' && attrs) {
      const hrefM = attrs.match(/href\s*=\s*["']([^"']+)["']/i)
      const dataRefM = attrs.match(/data-ref\s*=\s*["']([^"']+)["']/i)
      let href = hrefM?.[1] ?? dataRefM?.[1]?.replace(/\s+/g, '.')
      if (href && isSafeHref(href)) {
        if (!href.startsWith('/') && !href.startsWith('#') && !/^https?:\/\//i.test(href)) {
          href = `https://www.sefaria.org/${href}`
        }
        const escaped = href.replace(/"/g, '&quot;')
        return `<a href="${escaped}" class="refLink" target="_blank" rel="noopener noreferrer">`
      }
      return '<a target="_blank" rel="noopener noreferrer">' // fallback: no valid href
    }

    if ((name === 'span' || name === 'sup' || name === 'i') && attrs) {
      const classM = attrs.match(/class\s*=\s*["']([^"']+)["']/i)
      const cls = classM?.[1]
      if (cls && isSafeClass(cls)) {
        const escaped = cls.replace(/"/g, '&quot;')
        return `<${name} class="${escaped}">`
      }
    }

    return `<${name}>`
  })
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
