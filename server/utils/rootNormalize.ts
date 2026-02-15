/**
 * Normalize a Hebrew root (shoresh) for display and API use.
 * Accepts Hebrew with or without maqaf (e.g. ק־ד־שׁ, קדש) or Latin transliteration (e.g. K-D-Sh, KDSH).
 */

const TRANSLITERATION_MAP: Record<string, string> = {
  A: 'א', B: 'ב', C: 'כ', D: 'ד', E: 'ה', F: 'פ', G: 'ג', H: 'ה', I: 'י', J: 'י',
  K: 'כ', L: 'ל', M: 'מ', N: 'נ', O: 'ו', P: 'פ', Q: 'ק', R: 'ר', S: 'ש', T: 'ת',
  V: 'ו', W: 'ו', X: 'ח', Y: 'י', Z: 'ז',
  a: 'א', b: 'ב', c: 'כ', d: 'ד', e: 'ה', f: 'פ', g: 'ג', h: 'ה', i: 'י', j: 'י',
  k: 'כ', l: 'ל', m: 'מ', n: 'נ', o: 'ו', p: 'פ', q: 'ק', r: 'ר', s: 'ש', t: 'ת',
  v: 'ו', w: 'ו', x: 'ח', y: 'י', z: 'ז',
  ch: 'ח', kh: 'ח', sh: 'ש', ts: 'צ', tz: 'צ',
}

const MAQAF = '\u05BE' // Hebrew maqaf

/**
 * Check if a character is a Hebrew letter (excluding maqaf and similar).
 */
function isHebrewLetter (c: string): boolean {
  const code = c.charCodeAt(0)
  return (code >= 0x05D0 && code <= 0x05EA) || (code >= 0xFB1D && code <= 0xFB4F)
}

const VAV = '\u05D5'
const HEBREW_NIQQUD = /[\u0591-\u05BD\u05BF-\u05C7]/

/**
 * If input is "prefix־word" (exactly two segments, e.g. אֶל־מֹשֶׁה), return the word after the maqaf (מֹשֶׁה).
 * Do not apply for roots written with maqafs (e.g. ר־ע־ש has three segments; we keep the full root).
 */
function takeWordAfterMaqaf (input: string): string {
  const parts = input.split(MAQAF).map(s => s.trim()).filter(Boolean)
  if (parts.length === 2) return parts[1]!
  if (parts.length > 2) return input
  if (input.includes('-') || input.includes('־')) {
    const byHyphen = input.split(/-|־/).map(s => s.trim()).filter(Boolean)
    if (byHyphen.length === 2) return byHyphen[1]!
  }
  return input
}

/**
 * Strip leading vav (ו) and its niqqud (e.g. וּמֹשֶׁה → מֹשֶׁה) so we search the proper name without "and".
 */
function stripLeadingVav (input: string): string {
  const trimmed = input.trim()
  if (trimmed.charAt(0) !== VAV) return trimmed
  let i = 1
  while (i < trimmed.length && HEBREW_NIQQUD.test(trimmed.charAt(i))) i++
  return trimmed.slice(i).trim() || trimmed
}

/**
 * Normalize root input to letters-only Hebrew for search/API.
 * Uses the substantive word: after maqaf (אֶל־מֹשֶׁה → מֹשֶׁה), then strip leading vav (וּמֹשֶׁה → מֹשֶׁה).
 * Returns null if input is empty or invalid.
 */
export function normalizeRootForSearch (input: string | null | undefined): string | null {
  if (input == null || typeof input !== 'string') return null
  let trimmed = input.trim()
  if (!trimmed) return null
  trimmed = takeWordAfterMaqaf(trimmed)
  trimmed = stripLeadingVav(trimmed)

  let out = ''
  let i = 0
  const s = trimmed

  while (i < s.length) {
    const c = s[i]
    if (isHebrewLetter(c)) {
      out += c
      i += 1
      continue
    }
    if (c === MAQAF || c === '-' || c === '־') {
      i += 1
      continue
    }
    // Transliteration: try two-char then one-char
    const two = s.slice(i, i + 2).toLowerCase()
    if (two === 'ch' || two === 'kh' || two === 'sh' || two === 'ts' || two === 'tz') {
      const mapped = TRANSLITERATION_MAP[two]
      if (mapped) {
        out += mapped
        i += 2
        continue
      }
    }
    const one = c.toUpperCase()
    if (TRANSLITERATION_MAP[one] !== undefined) {
      out += TRANSLITERATION_MAP[one]
      i += 1
      continue
    }
    if (TRANSLITERATION_MAP[c] !== undefined) {
      out += TRANSLITERATION_MAP[c]
      i += 1
      continue
    }
    // Skip spaces and other separators
    if (/\s|-|־|\.|,/.test(c)) {
      i += 1
      continue
    }
    i += 1
  }

  // Roots are 2–4 letters; names/words may be longer — allow up to 15 for concordance search.
  return out.length >= 2 && out.length <= 15 ? out : null
}

/**
 * Format normalized Hebrew letters for display: roots (2–4 letters) with maqaf (e.g. ק־ד־שׁ); longer strings (e.g. names) as-is.
 */
export function toDisplayRoot (normalizedLetters: string): string {
  if (!normalizedLetters) return ''
  if (normalizedLetters.length >= 2 && normalizedLetters.length <= 4) {
    return Array.from(normalizedLetters).join(MAQAF)
  }
  return normalizedLetters
}
