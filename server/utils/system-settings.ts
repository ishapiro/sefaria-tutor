import { TRANSLATION_PRIMARY_MODEL } from '~/server/utils/openai-models'

const KEY_DEFAULT_MODEL = 'translation_default_model'

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
