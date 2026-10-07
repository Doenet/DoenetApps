#!/usr/bin/env bash
# Load the legacy.doenet.org mysqldump into a scratch database next to the
# local dev DB, so the extract stage can query it with plain SQL.
#
# Usage (from apps/api):
#   scripts/legacy-migration/00-load-scratch.sh [path/to/legacy-data.sql]
#
# Assumes the repo's docker-compose mysql service is running (root password
# "root", host port ${DATABASE_PORT:-3307}). Re-running drops and reloads the
# scratch database.
set -euo pipefail

DUMP="${1:-$HOME/legacy-migration/input/legacy-data.sql}"
HOST="${LEGACY_SCRATCH_DB_HOST:-127.0.0.1}"
PORT="${LEGACY_SCRATCH_DB_PORT:-3307}"
DB="${LEGACY_SCRATCH_DB_NAME:-legacy_migration}"
ROOT_PW="${LEGACY_SCRATCH_DB_ROOT_PASSWORD:-root}"

if [ ! -f "$DUMP" ]; then
  echo "Dump not found: $DUMP" >&2
  exit 1
fi

MYSQL=(mysql --host="$HOST" --port="$PORT" --user=root --password="$ROOT_PW" \
  --default-character-set=utf8mb4)

echo "Recreating database $DB on $HOST:$PORT ..."
"${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`$DB\`; CREATE DATABASE \`$DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"

echo "Loading $DUMP ..."
"${MYSQL[@]}" "$DB" < "$DUMP"

echo "Row counts:"
"${MYSQL[@]}" "$DB" -e "
  SELECT 'user' AS tbl, COUNT(*) AS rows_ FROM user
  UNION ALL SELECT 'course', COUNT(*) FROM course
  UNION ALL SELECT 'course_role', COUNT(*) FROM course_role
  UNION ALL SELECT 'course_user', COUNT(*) FROM course_user
  UNION ALL SELECT 'course_content', COUNT(*) FROM course_content
  UNION ALL SELECT 'pages', COUNT(*) FROM pages
  UNION ALL SELECT 'link_pages', COUNT(*) FROM link_pages
  UNION ALL SELECT 'support_files', COUNT(*) FROM support_files;"

echo "Done."
