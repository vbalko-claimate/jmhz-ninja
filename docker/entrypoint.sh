#!/usr/bin/env sh
set -e

echo "[entrypoint] applying drizzle migrations -> $DB_PATH"
node lib/db/migrate.mjs || {
  echo "[entrypoint] migration failed" >&2
  exit 1
}

echo "[entrypoint] seeding singletons (idempotent)"
node lib/db/seed.mjs || true

echo "[entrypoint] starting JMHZ Ninja"
exec "$@"
