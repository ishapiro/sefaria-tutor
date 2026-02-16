/** Sefaria-related helpers that are reusable across components. */

/** Parse starting chapter from Sefaria ref (e.g. "Genesis_6.20-7.2" -> 6, "Genesis_6" -> 6, "Genesis_6:9-11:32" -> 6). */
export function parseStartChapterFromRef (sefariaRef: string): number {
  const m = sefariaRef.match(/[._](\d+)(?:[.:\-]|$)/)
  return m ? parseInt(m[1], 10) : 1
}

/** Build chapter:verse display numbers for Tanakh, preserving order. Verse numbers reset per chapter (Sefaria style). */
export function buildTanakhDisplayNumbers (sefariaRef: string, verseNums: number[]): string[] {
  if (verseNums.length === 0) return []
  const startChapter = parseStartChapterFromRef(sefariaRef)
  const result: string[] = []
  let chapter = startChapter
  for (let i = 0; i < verseNums.length; i++) {
    const v = verseNums[i]
    if (i > 0 && v < (verseNums[i - 1] ?? 0)) chapter += 1
    result.push(`${chapter}:${v}`)
  }
  return result
}

/** Parse range from Sefaria ref (e.g. "Genesis_25:19-28:9" -> {startCh:25, startV:19, endCh:28, endV:9}). */
export function parseRangeFromRef (sefariaRef: string): { startCh: number; startV: number; endCh: number; endV: number } | null {
  const m = sefariaRef.match(/(\d+)[.:](\d+)\s*-\s*(\d+)[.:](\d+)/)
  if (!m) return null
  return {
    startCh: parseInt(m[1], 10),
    startV: parseInt(m[2], 10),
    endCh: parseInt(m[3], 10),
    endV: parseInt(m[4], 10)
  }
}

/** Extract flat string[] from Sefaria text/he which may be array, string, or nested object. */
export function extractTextArray (val: unknown): string[] {
  // Most Sefaria responses use arrays of strings, but some (like large
  // ranges or alternate structures) return jagged arrays or nested
  // objects of strings. Flatten everything into a simple string[].
  if (Array.isArray(val)) {
    const out: string[] = []
    for (const item of val) {
      if (typeof item === 'string') out.push(item)
      else if (item != null) out.push(...extractTextArray(item))
    }
    return out
  }
  if (typeof val === 'string') return [val]
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>
    const keys = Object.keys(obj).sort((a, b) => {
      const na = Number(a)
      const nb = Number(b)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return String(a).localeCompare(String(b))
    })
    const out: string[] = []
    for (const k of keys) {
      const v = obj[k]
      if (typeof v === 'string') out.push(v)
      else if (Array.isArray(v)) out.push(...extractTextArray(v))
      else if (v && typeof v === 'object') out.push(...extractTextArray(v))
    }
    return out
  }
  return []
}

/** Extract flat string[] and section refs (chapter:verse) from nested Tanakh data. Returns null if not nested. */
export function extractTextAndSections (val: unknown, sefariaRef: string): { texts: string[]; sections: string[] } | null {
  const range = parseRangeFromRef(sefariaRef)
  const numericKeys = (obj: Record<string, unknown>) => {
    const keys = Object.keys(obj).filter(k => /^\d+$/.test(k))
    keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    return keys
  }
  const collectFromObject = (obj: Record<string, unknown>): { texts: string[]; sections: string[] } | null => {
    const keys = numericKeys(obj)
    if (keys.length === 0) return null
    const texts: string[] = []
    const sections: string[] = []
    for (let chIdx = 0; chIdx < keys.length; chIdx++) {
      const chNum = parseInt(keys[chIdx], 10)
      const chVal = obj[keys[chIdx]]
      let verseStart = 1
      let verseEnd = 999
      if (range && keys.length > 0) {
        if (chIdx === 0) verseStart = range.startCh === chNum ? range.startV : 1
        if (chIdx === keys.length - 1) verseEnd = range.endCh === chNum ? range.endV : 999
      }
      if (Array.isArray(chVal)) {
        for (let i = 0; i < chVal.length; i++) {
          const s = chVal[i]
          if (typeof s === 'string') {
            texts.push(s)
            const v = verseStart + i
            sections.push(`${chNum}:${v}`)
          }
        }
      } else if (chVal && typeof chVal === 'object') {
        const nested = collectFromObject(chVal as Record<string, unknown>)
        if (nested) {
          texts.push(...nested.texts)
          sections.push(...nested.sections)
        }
      }
    }
    return { texts, sections }
  }
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>
    if (numericKeys(obj).length > 0) return collectFromObject(obj)
  }
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0]
    if (Array.isArray(first) || (first && typeof first === 'object' && !Array.isArray(first))) {
      const texts: string[] = []
      const sections: string[] = []
      for (let chIdx = 0; chIdx < val.length; chIdx++) {
        const chNum = (range ? range.startCh + chIdx : chIdx + 1)
        const chVal = val[chIdx]
        let verseStart = 1
        let verseEnd = 999
        if (range) {
          if (chIdx === 0) verseStart = range.startV
          if (chIdx === val.length - 1) verseEnd = range.endV
        }
        if (Array.isArray(chVal)) {
          for (let i = 0; i < chVal.length; i++) {
            const s = chVal[i]
            if (typeof s === 'string') {
              texts.push(s)
              sections.push(`${chNum}:${verseStart + i}`)
            }
          }
        } else if (chVal != null) {
          const flat = extractTextArray(chVal)
          flat.forEach((t, i) => {
            texts.push(t)
            sections.push(`${chNum}:${verseStart + i}`)
          })
        }
      }
      return { texts, sections }
    }
  }
  return null
}
