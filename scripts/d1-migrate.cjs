// Wrapper around Wrangler D1 migrations that adds schema checks.
// Usage:
//   node scripts/d1-migrate.cjs           # local D1
//   node scripts/d1-migrate.cjs --remote  # remote D1

const { execSync } = require('node:child_process');

const DB_NAME = 'sefaria-tutor-db';

/**
 * Run a shell command.
 * @param {string} cmd
 * @param {object} [options]
 * @param {boolean} [options.inherit]
 * @returns {string}
 */
function run(cmd, options = {}) {
  const stdio = options.inherit ? 'inherit' : 'pipe';
  return execSync(cmd, { stdio }).toString();
}

/**
 * Execute a SQL command against D1 via Wrangler.
 * @param {string} sql
 * @param {string[]} flags e.g. ['--remote']
 * @returns {any}
 */
function d1Execute(sql, flags) {
  const parts = [
    'npx',
    'wrangler',
    'd1',
    'execute',
    DB_NAME,
    ...(flags || []),
    '--command',
    JSON.stringify(sql),
    '--json',
  ];
  const cmd = parts.join(' ');
  const out = run(cmd);
  return JSON.parse(out);
}

/**
 * Assert that a table exists.
 * @param {string} table
 * @param {string[]} flags
 */
function assertTable(table, flags) {
  const res = d1Execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${table}';`,
    flags,
  );
  if (!res.results || res.results.length === 0) {
    throw new Error(`Missing table ${table} in D1 schema`);
  }
}

/**
 * Assert that a column exists on a table.
 * @param {string} table
 * @param {string} column
 * @param {string[]} flags
 */
function assertColumn(table, column, flags) {
  const res = d1Execute(`PRAGMA table_info(${table});`, flags);
  const has = Array.isArray(res.results)
    && res.results.some((row) => row.name === column);
  if (!has) {
    throw new Error(`Missing column ${table}.${column} in D1 schema`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const wranglerFlags = args.includes('--remote') ? ['--remote'] : [];

  // 1) Run migrations via Wrangler (source of truth).
  const migrateCmd = [
    'npx',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    DB_NAME,
    ...wranglerFlags,
  ].join(' ');

  console.log(`Running D1 migrations with: ${migrateCmd}\n`);
  try {
    run(migrateCmd, { inherit: true });
  } catch (err) {
    // If migrations themselves fail, surface that and stop.
    console.error('\nWrangler migrations failed.');
    throw err;
  }

  // 2) Post-migration schema checks for robustness.
  console.log('\nVerifying D1 schema after migrations...\n');

  // Core translation cache schema
  assertTable('translation_cache', wranglerFlags);
  assertColumn('translation_cache', 'phrase_hash', wranglerFlags);
  assertColumn('translation_cache', 'phrase', wranglerFlags);
  assertColumn('translation_cache', 'response', wranglerFlags);
  assertColumn('translation_cache', 'created_at', wranglerFlags);
  assertColumn('translation_cache', 'version', wranglerFlags);
  assertColumn('translation_cache', 'prompt_hash', wranglerFlags);

  // Cache stats, including malformed_hits
  assertTable('cache_stats', wranglerFlags);
  assertColumn('cache_stats', 'hits', wranglerFlags);
  assertColumn('cache_stats', 'misses', wranglerFlags);
  assertColumn('cache_stats', 'malformed_hits', wranglerFlags);
  assertColumn('cache_stats', 'updated_at', wranglerFlags);

  // Auth / users soft-delete
  assertTable('users', wranglerFlags);
  assertColumn('users', 'id', wranglerFlags);
  assertColumn('users', 'email', wranglerFlags);
  assertColumn('users', 'deleted_at', wranglerFlags);

  // User notes (including navigation helpers)
  assertTable('user_notes', wranglerFlags);
  assertColumn('user_notes', 'id', wranglerFlags);
  assertColumn('user_notes', 'user_id', wranglerFlags);
  assertColumn('user_notes', 'he_phrase', wranglerFlags);
  assertColumn('user_notes', 'en_phrase', wranglerFlags);
  assertColumn('user_notes', 'ref_display', wranglerFlags);
  assertColumn('user_notes', 'sefaria_ref', wranglerFlags);
  assertColumn('user_notes', 'note_text', wranglerFlags);
  assertColumn('user_notes', 'created_at', wranglerFlags);
  assertColumn('user_notes', 'book_title', wranglerFlags);
  assertColumn('user_notes', 'book_path', wranglerFlags);

  // Sentence grammar cache
  assertTable('sentence_grammar_cache', wranglerFlags);
  assertColumn('sentence_grammar_cache', 'phrase_hash', wranglerFlags);
  assertColumn('sentence_grammar_cache', 'phrase', wranglerFlags);
  assertColumn('sentence_grammar_cache', 'explanation', wranglerFlags);
  assertColumn('sentence_grammar_cache', 'created_at', wranglerFlags);
  assertColumn('sentence_grammar_cache', 'version', wranglerFlags);
  assertColumn('sentence_grammar_cache', 'prompt_hash', wranglerFlags);

  console.log('D1 schema verification succeeded.\n');
}

main();

