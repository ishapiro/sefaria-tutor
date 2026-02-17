// Increment this ONLY when the JSON structure of the OpenAI response changes 
// (e.g., adding/removing fields in the wordTable). 
// This triggers a "Hard Invalidation" of all cached entries.
export const CURRENT_CACHE_VERSION = 2

// Entries older than this will be refreshed to ensure content quality and 
// pick up prompt improvements over time.
export const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export function isValidTranslationStructure(fullResponse: any): boolean {
  // This is intentionally very permissive. The client already parses and
  // validates the inner JSON structure. Here we only want to detect truly
  // corrupted rows (e.g. missing the expected OpenAI "output" envelope).
  if (!fullResponse || typeof fullResponse !== 'object') return false
  if (!Array.isArray(fullResponse.output) || fullResponse.output.length === 0) return false
  const first = fullResponse.output[0]
  if (!first || typeof first !== 'object') return false
  // As long as we have at least one output_text chunk, treat it as structurally OK.
  try {
    if (Array.isArray(first.content)) {
      const hasText = first.content.some((c: any) => c && c.type === 'output_text' && typeof c.text === 'string' && c.text.trim().length > 0)
      return hasText
    }
  } catch {
    return false
  }
  return false
}

export function normalizePhrase(phrase: string): string {
  return phrase
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
}

export async function computePhraseHash(normalizedPhrase: string): Promise<string> {
  return computeHash(normalizedPhrase)
}

export async function computeHash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
