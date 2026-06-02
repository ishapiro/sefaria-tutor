import { TRANSLATION_PRIMARY_MODEL, TTS_PRIMARY_MODEL } from '~/server/utils/openai-models'

const KEY_DEFAULT_MODEL = 'translation_default_model'
const KEY_TTS_MODEL = 'tts_default_model'
const KEY_MS_PER_WORD = 'translation_ms_per_word'
const KEY_GRAMMAR_MS = 'grammar_ms_total'

/** Fallback when no benchmark has been run yet. */
export const DEFAULT_MS_PER_WORD = 3000
export const DEFAULT_GRAMMAR_MS = 15000

/** DB type from Cloudflare D1 binding */
type D1Database = {
  prepare: (query: string) => {
    bind: (...args: unknown[]) => { first: () => Promise<{ value?: string } | null> }
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
