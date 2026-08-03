import { TRANSLATION_PRIMARY_MODEL, TTS_PRIMARY_MODEL } from '~/server/utils/openai-models'

const KEY_DEFAULT_MODEL = 'translation_default_model'
const KEY_RECOMMENDED_MODEL = 'translation_recommended_model'
const KEY_RECOMMENDED_SIGNATURE = 'translation_recommended_signature'
const KEY_TTS_MODEL = 'tts_default_model'
const KEY_MS_PER_WORD = 'translation_ms_per_word'
const KEY_GRAMMAR_MS = 'grammar_ms_total'

/** Fallback when no benchmark has been run yet. */
export const DEFAULT_MS_PER_WORD = 3000
export const DEFAULT_GRAMMAR_MS = 15000

/** DB type from Cloudflare D1 binding */
type D1Database = {
  prepare: (query: string) => {
    bind: (...args: unknown[]) => {
      first: () => Promise<{ value?: string } | null>
      run: () => Promise<unknown>
    }
  }
}

/**
 * Returns the configured default translation model, or the code default if not set.
 * Used when DB is available (e.g. Cloudflare Workers with D1).
 */
export async function getDefaultTranslationModel (db: D1Database | null | undefined): Promise<string> {
  if (!db) return TRANSLATION_PRIMARY_MODEL
  try {
    const row = await db.prepare('SELECT value FROM system_settings WHERE key = ?')
      .bind(KEY_DEFAULT_MODEL)
      .first()
    const value = (row as { value?: string } | null)?.value?.trim()
    if (value) return value
  } catch (_) {
    // Table may not exist yet (migration not run)
  }
  return TRANSLATION_PRIMARY_MODEL
}

/** Stores the translation default model. */
export async function saveDefaultTranslationModel (db: D1Database | null | undefined, model: string): Promise<void> {
  if (!db) return
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(
    'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  ).bind(KEY_DEFAULT_MODEL, model, now).run()
}

/**
 * Returns the model OpenAI recommended for Biblical Hebrew translation, along
 * with the signature of the candidate list it was chosen from. The caller
 * re-asks only when that signature no longer matches the available models.
 */
export async function getRecommendedTranslationModel (
  db: D1Database | null | undefined,
): Promise<{ model: string; signature: string } | null> {
  if (!db) return null
  try {
    const read = async (key: string) => {
      const row = await db.prepare('SELECT value FROM system_settings WHERE key = ?').bind(key).first()
      return (row as { value?: string } | null)?.value?.trim() ?? ''
    }
    const model = await read(KEY_RECOMMENDED_MODEL)
    const signature = await read(KEY_RECOMMENDED_SIGNATURE)
    if (model && signature) return { model, signature }
  } catch (_) {
    // Table may not exist yet (migration not run)
  }
  return null
}

/** Stores the recommended model and the candidate signature it was chosen from. */
export async function saveRecommendedTranslationModel (
  db: D1Database | null | undefined,
  model: string,
  signature: string,
): Promise<void> {
  if (!db) return
  const now = Math.floor(Date.now() / 1000)
  const write = (key: string, value: string) => db.prepare(
    'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  ).bind(key, value, now).run()
  await write(KEY_RECOMMENDED_MODEL, model)
  await write(KEY_RECOMMENDED_SIGNATURE, signature)
}

/**
 * Returns the configured default TTS model, or the code default if not set.
 */
export async function getDefaultTtsModel (db: D1Database | null | undefined): Promise<string> {
  if (!db) return TTS_PRIMARY_MODEL
  try {
    const row = await db.prepare('SELECT value FROM system_settings WHERE key = ?')
      .bind(KEY_TTS_MODEL)
      .first()
    const value = (row as { value?: string } | null)?.value?.trim()
    if (value) return value
  } catch (_) {
    // Table may not exist yet
  }
  return TTS_PRIMARY_MODEL
}

/**
 * Returns the stored ms-per-word benchmark for the active translation model,
 * or DEFAULT_MS_PER_WORD if no benchmark has been run yet.
 */
export async function getMsPerWord (db: D1Database | null | undefined): Promise<number> {
  if (!db) return DEFAULT_MS_PER_WORD
  try {
    const row = await db.prepare('SELECT value FROM system_settings WHERE key = ?')
      .bind(KEY_MS_PER_WORD)
      .first()
    const v = parseInt((row as { value?: string } | null)?.value ?? '', 10)
    if (Number.isFinite(v) && v > 0) return v
  } catch (_) {}
  return DEFAULT_MS_PER_WORD
}

/** Stores the ms-per-word benchmark result. */
export async function saveMsPerWord (db: D1Database | null | undefined, msPerWord: number): Promise<void> {
  if (!db) return
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(
    'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).bind(KEY_MS_PER_WORD, String(Math.round(msPerWord)), now).run()
}

/**
 * Returns the stored total-ms benchmark for a grammar explanation,
 * or DEFAULT_GRAMMAR_MS if no benchmark has been run yet.
 */
export async function getGrammarMs (db: D1Database | null | undefined): Promise<number> {
  if (!db) return DEFAULT_GRAMMAR_MS
  try {
    const row = await db.prepare('SELECT value FROM system_settings WHERE key = ?')
      .bind(KEY_GRAMMAR_MS)
      .first()
    const v = parseInt((row as { value?: string } | null)?.value ?? '', 10)
    if (Number.isFinite(v) && v > 0) return v
  } catch (_) {}
  return DEFAULT_GRAMMAR_MS
}

/** Stores the grammar total-ms benchmark result. */
export async function saveGrammarMs (db: D1Database | null | undefined, ms: number): Promise<void> {
  if (!db) return
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(
    'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).bind(KEY_GRAMMAR_MS, String(Math.round(ms)), now).run()
}
