#!/usr/bin/env sh
set -e

echo "[entrypoint] applying drizzle migrations -> $DB_PATH"
node ./node_modules/.bin/tsx lib/db/migrate.ts || {
  echo "[entrypoint] migration failed" >&2
  exit 1
}

echo "[entrypoint] seeding singletons (idempotent)"
node ./node_modules/.bin/tsx lib/db/seed.ts || true

echo "[entrypoint] starting JMHZ Ninja"
exec "$@"
