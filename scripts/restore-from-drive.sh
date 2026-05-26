#!/usr/bin/env bash
# Restore JMHZ Ninja DB from a backup file (plaintext or AES-encrypted) into
# the running Coolify container's volume.
#
# Usage:
#   scripts/restore-from-drive.sh <local-backup-file> [coolify-resource-uuid]
#
#   <local-backup-file>     Path to svj-YYYY-MM-DD.db or svj-...db.enc (download
#                           from Google Drive first via the web UI).
#   [coolify-resource-uuid] Optional. Defaults to w5vt1rwi87zvybw3dl2sm5p7.
#
# Requires SSH key at ../azurevm/connection/coolify-vm.

set -euo pipefail

BACKUP="${1:-}"
RESOURCE_UUID="${2:-w5vt1rwi87zvybw3dl2sm5p7}"

if [ -z "$BACKUP" ] || [ ! -f "$BACKUP" ]; then
  echo "usage: $0 <local-backup-file> [coolify-resource-uuid]" >&2
  echo
  echo "  Download a backup from Google Drive (svj-YYYY-MM-DD.db or .db.enc)" >&2
  echo "  and pass its local path as the first argument." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH_KEY="${SSH_KEY:-$REPO_ROOT/../azurevm/connection/coolify-vm}"
SSH_USER="${SSH_USER:-vm-claimate-coolify}"
SSH_HOST="${SSH_HOST:-172.201.24.5}"

if [ ! -f "$SSH_KEY" ]; then
  echo "✗ SSH key not found at $SSH_KEY (set SSH_KEY env to override)." >&2
  exit 1
fi

ssh_cmd() { ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "$@"; }

# 1) Decrypt locally if needed.
if [[ "$BACKUP" == *.enc ]]; then
  echo "→ Encrypted backup detected, decrypting locally…"
  DECRYPTED="${BACKUP%.enc}.restored.db"
  cd "$REPO_ROOT" && pnpm restore-backup "$BACKUP" "$DECRYPTED"
  PLAIN="$DECRYPTED"
else
  PLAIN="$BACKUP"
fi

# 2) Validate it's a real SQLite DB.
MAGIC=$(head -c 16 "$PLAIN" | tr -d '\0')
if [[ "$MAGIC" != SQLite\ format\ 3* ]]; then
  echo "✗ $PLAIN is not a valid SQLite database (bad magic header)." >&2
  exit 1
fi

echo "→ Locating running container…"
CONT=$(ssh_cmd "docker ps --filter 'name=$RESOURCE_UUID' -q | head -1")
if [ -z "$CONT" ]; then
  echo "✗ No running container found for resource $RESOURCE_UUID." >&2
  exit 1
fi
echo "  container: $CONT"

# 3) Take a safety snapshot of the current DB BEFORE we touch anything.
SAFETY_NAME="svj.db.pre-restore-$(date +%s)"
echo "→ Saving safety snapshot of current DB to /app/data/$SAFETY_NAME…"
ssh_cmd "docker exec $CONT cp -p /app/data/svj.db /app/data/$SAFETY_NAME || true"

# 4) Copy plaintext DB to the VM tmp.
echo "→ Uploading restored DB to VM…"
scp -i "$SSH_KEY" "$PLAIN" "$SSH_USER@$SSH_HOST:/tmp/svj.db.restore"

# 5) Stop container (SQLite holds WAL while running).
echo "→ Stopping container (so SQLite releases WAL)…"
ssh_cmd "docker stop $CONT"

# 6) Copy DB into volume + clean WAL/SHM.
echo "→ Swapping DB inside volume…"
ssh_cmd "docker cp /tmp/svj.db.restore $CONT:/app/data/svj.db"
ssh_cmd "docker exec --user root $CONT sh -c 'rm -f /app/data/svj.db-wal /app/data/svj.db-shm /app/data/svj.db-journal || true'" || true

# 7) Restart container — entrypoint will reapply migrations against the
#    restored DB (no-op if already up to date) and start the server.
echo "→ Restarting container…"
ssh_cmd "docker start $CONT"

# 8) Cleanup VM tmp.
ssh_cmd "rm -f /tmp/svj.db.restore" || true

echo
echo "✓ Restore done."
echo "  Safety snapshot:   /app/data/$SAFETY_NAME (inside container volume)"
echo "  Restored from:     $(basename "$BACKUP")"
echo
echo "  Container is restarting; wait ~30s and reload the web UI."
