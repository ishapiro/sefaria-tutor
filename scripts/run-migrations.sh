#!/usr/bin/env bash
# Run D1 migrations (local or remote). Tracks applied migrations so only pending ones run.
# Safe to run every time you start dev on a new machine or pull new migrations.
#
# Usage:
#   ./scripts/run-migrations.sh             # local (default), only pending
#   ./scripts/run-migrations.sh --local     # same
#   ./scripts/run-migrations.sh --remote    # production, only pending (--yes for non-interactive)
#   ./scripts/run-migrations.sh --reset-local  # delete local D1 state, then run all (fixes bad state)
#
# Requires: jq (for migration tracking). On WSL: sudo apt-get install jq
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/migrations"
WRANGLER_D1_STATE="$ROOT_DIR/.wrangler/state/v3/d1"
DB_NAME="sefaria-tutor-db"
TRACKING_TABLE="schema_migrations"

cd "$ROOT_DIR"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

REMOTE=false
RESET_LOCAL=false
if [[ "${1:-}" == "--remote" ]]; then
  REMOTE=true
  EXTRA_ARGS="--remote --yes"
elif [[ "${1:-}" == "--reset-local" ]]; then
  RESET_LOCAL=true
  EXTRA_ARGS="--local"
elif [[ "${1:-}" == "--local" ]] || [[ -z "${1:-}" ]]; then
  EXTRA_ARGS="--local"
else
  echo "Usage: $0 [--local|--remote|--reset-local]"
  exit 1
fi

# --- Reset local: remove state, run all migrations, then record them so next migrate:local skips them ---
if [[ "$RESET_LOCAL" == true ]]; then
  if [[ -d "$WRANGLER_D1_STATE" ]]; then
    echo "Removing local D1 state: $WRANGLER_D1_STATE"
    rm -rf "$WRANGLER_D1_STATE"
    echo "Done."
  fi
  echo "Running all migrations..."
  echo ""
  for f in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$f" ]] || continue
    name="$(basename "$f")"
    echo "  Applying $name ..."
    npx wrangler d1 execute "$DB_NAME" $EXTRA_ARGS --file="$f"
    echo "  OK"
  done
  echo "Recording applied migrations so next run skips them..."
  npx wrangler d1 execute "$DB_NAME" $EXTRA_ARGS --command "CREATE TABLE IF NOT EXISTS $TRACKING_TABLE (filename TEXT PRIMARY KEY)" >/dev/null 2>&1 || true
  for f in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$f" ]] || continue
    name="$(basename "$f")"
    npx wrangler d1 execute "$DB_NAME" $EXTRA_ARGS --command "INSERT OR REPLACE INTO $TRACKING_TABLE (filename) VALUES ('$name')" >/dev/null 2>&1 || true
  done
  echo ""
  echo "All migrations completed. Next 'npm run dev' will skip them."
  exit 0
fi

# --- Ensure tracking table exists ---
npx wrangler d1 execute "$DB_NAME" $EXTRA_ARGS --command "CREATE TABLE IF NOT EXISTS $TRACKING_TABLE (filename TEXT PRIMARY KEY)" >/dev/null 2>&1 || true

# --- Get list of already-applied migrations (requires jq) ---
if ! command -v jq &>/dev/null; then
  echo "jq is required for migration tracking. Install it (e.g. sudo apt-get install jq) or use --reset-local to run all."
  exit 1
fi

APPLIED_JSON=$(npx wrangler d1 execute "$DB_NAME" $EXTRA_ARGS --json --command "SELECT filename FROM $TRACKING_TABLE" 2>/dev/null || echo '[]')
APPLIED_LIST=$(echo "$APPLIED_JSON" | jq -r '.[0].results[]?.filename // empty' 2>/dev/null || true)

# --- Run only pending migrations ---
echo "D1 migrations for $DB_NAME ($([ "$REMOTE" = true ] && echo 'remote' || echo 'local')) — running pending only."
echo ""

RUN_COUNT=0
for f in "$MIGRATIONS_DIR"/*.sql; do
  [[ -f "$f" ]] || continue
  name="$(basename "$f")"
  if echo "$APPLIED_LIST" | grep -Fxq "$name" 2>/dev/null; then
    echo "  Skip (already applied): $name"
    continue
  fi
  echo "  Applying $name ..."
  npx wrangler d1 execute "$DB_NAME" $EXTRA_ARGS --file="$f"
  npx wrangler d1 execute "$DB_NAME" $EXTRA_ARGS --command "INSERT OR REPLACE INTO $TRACKING_TABLE (filename) VALUES ('$name')" >/dev/null 2>&1
  echo "  OK"
  ((RUN_COUNT++)) || true
done

echo ""
if [[ $RUN_COUNT -eq 0 ]]; then
  echo "No pending migrations. DB is up to date."
else
  echo "Applied $RUN_COUNT migration(s). DB is up to date."
fi
