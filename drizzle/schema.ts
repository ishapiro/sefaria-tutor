import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Translation cache and stats

export const translationCache = sqliteTable('translation_cache', {
  phraseHash: text('phrase_hash').primaryKey(),
  phrase: text('phrase').notNull(),
  response: text('response').notNull(),
  createdAt: integer('created_at').notNull(),
  version: integer('version').default(1),
  promptHash: text('prompt_hash'),
})

export const cacheStats = sqliteTable('cache_stats', {
  id: integer('id').primaryKey(),
  hits: integer('hits').default(0),
  misses: integer('misses').default(0),
  malformedHits: integer('malformed_hits').default(0),
  updatedAt: integer('updated_at').notNull(),
})

// Pronunciation cache

export const pronunciationCache = sqliteTable('pronunciation_cache', {
  textHash: text('text_hash').primaryKey(),
  normalizedText: text('normalized_text').notNull(),
  r2Key: text('r2_key').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  createdAt: integer('created_at').notNull(),
  lastAccessedAt: integer('last_accessed_at').notNull(),
  accessCount: integer('access_count').default(0),
})

export const pronunciationCacheStats = sqliteTable('pronunciation_cache_stats', {
  id: integer('id').primaryKey(),
  totalSizeBytes: integer('total_size_bytes').default(0),
  totalFiles: integer('total_files').default(0),
  hits: integer('hits').default(0),
  misses: integer('misses').default(0),
  lastPurgeAt: integer('last_purge_at'),
  updatedAt: integer('updated_at').notNull(),
})

// Auth: users and teams

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(), // UNIQUE in SQL
  name: text('name'),
  role: text('role').default('general'),
  passwordHash: text('password_hash'),
  isVerified: integer('is_verified').default(0), // BOOLEAN in SQLite
  verificationToken: text('verification_token'),
  tokenExpiresAt: integer('token_expires_at'),
  teamId: text('team_id'),
  deletedAt: integer('deleted_at'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpiresAt: integer('password_reset_expires_at'),
  createdAt: integer('created_at').default(0),
})

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  leaderId: text('leader_id').notNull(),
  inviteCode: text('invite_code'),
  createdAt: integer('created_at').default(0),
})

// User word list and flashcard-related tables

export const userWordList = sqliteTable('user_word_list', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  wordData: text('word_data').notNull(),
  createdAt: integer('created_at').notNull(),
  archivedAt: integer('archived_at'),
})

export const wordListProgress = sqliteTable('word_list_progress', {
  userId: text('user_id').notNull(),
  wordListId: integer('word_list_id').notNull(),
  timesShown: integer('times_shown').notNull().default(0),
  timesCorrect: integer('times_correct').notNull().default(0),
  attemptsUntilFirstCorrect: integer('attempts_until_first_correct'),
  updatedAt: integer('updated_at').notNull(),
})

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
})

// User notes

export const userNotes = sqliteTable('user_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  hePhrase: text('he_phrase').notNull(),
  enPhrase: text('en_phrase').notNull(),
  refDisplay: text('ref_display').notNull(),
  sefariaRef: text('sefaria_ref').notNull(),
  noteText: text('note_text').notNull(),
  createdAt: integer('created_at').notNull(),
  bookTitle: text('book_title'),
  bookPath: text('book_path'),
})

// Support tickets

export const supportTickets = sqliteTable('support_tickets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  pageUrl: text('page_url'),
  typeBug: integer('type_bug').notNull().default(0),
  typeSuggestion: integer('type_suggestion').notNull().default(0),
  typeHelp: integer('type_help').notNull().default(0),
  description: text('description').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  reference: text('reference'),
})

export const supportTicketReplies = sqliteTable('support_ticket_replies', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull(),
  authorType: text('author_type').notNull(),
  authorId: text('author_id'),
  message: text('message').notNull(),
  createdAt: integer('created_at').notNull(),
})

// Root translation cache

export const rootTranslationCache = sqliteTable('root_translation_cache', {
  rootNormalized: text('root_normalized').primaryKey(),
  meaning: text('meaning').notNull(),
  createdAt: integer('created_at').notNull(),
})

// System settings

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// Sentence grammar cache

export const sentenceGrammarCache = sqliteTable('sentence_grammar_cache', {
  phraseHash: text('phrase_hash').primaryKey(),
  phrase: text('phrase').notNull(),
  explanation: text('explanation').notNull(),
  createdAt: integer('created_at').notNull(),
  version: integer('version').notNull(),
  promptHash: text('prompt_hash').notNull(),
})

