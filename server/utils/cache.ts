// Increment this ONLY when the JSON structure of the OpenAI response changes 
// (e.g., adding/removing fields in the wordTable). 
// This triggers a "Hard Invalidation" of all cached entries.
export const CURRENT_CACHE_VERSION = 1

// Entries older than this will be refreshed to ensure content quality and 
// pick up prompt improvements over time.
export const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export function isValidTranslationStructure(fullResponse: any): boolean {
  if (!fullResponse || typeof fullResponse !== 'object') return false
  
  // Extract the inner content from OpenAI response structure
  // Based on chat.post.ts, the JSON is in output[0].content[0].text
  let content = ''
  try {
    const output = fullResponse.output?.[0]
    if (output?.type === 'message' && Array.isArray(output.content)) {
      content = output.content.find((c: any) => c.type === 'output_text')?.text || ''
    }
  } catch (e) {
    return false
  }

  if (!content) return false

  // Parse the inner JSON
  let data: any
  try {
    // Handle potential markdown code blocks in AI response
    let jsonStr = content.trim()
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/\{[\s\S]*\}/)
      if (match) jsonStr = match[0]
    }
    data = JSON.parse(jsonStr)
  } catch (e) {
    return false
  }

  // Now validate the actual translation fields
  if (typeof data.originalPhrase !== 'string') return false
  if (typeof data.translatedPhrase !== 'string') return false
  if (!Array.isArray(data.wordTable)) return false

  // Sample check on the first wordTable entry if it exists
  if (data.wordTable.length > 0) {
    const entry = data.wordTable[0]
    const requiredEntryFields = ['word', 'wordTranslation', 'hebrewAramaic']
    for (const field of requiredEntryFields) {
      if (!(field in entry)) return false
    }
  }

  return true
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
