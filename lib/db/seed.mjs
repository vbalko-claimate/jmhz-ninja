// Plain ESM idempotent seeder — runs with `node` directly. Inserts singleton
// rows (app_config, backup_settings) and the initial 2026 legal_parameters
// row if missing. Safe to re-run on every container start.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'svj.db');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

function count(table) {
  return sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
}

if (count('app_config') === 0) {
  sqlite.prepare('INSERT INTO app_config (id) VALUES (1)').run();
  console.log('[seed] app_config singleton created');
}

if (count('backup_settings') === 0) {
  sqlite.prepare('INSERT INTO backup_settings (id) VALUES (1)').run();
  console.log('[seed] backup_settings singleton created');
}

if (count('legal_parameters') === 0) {
  sqlite
    .prepare(
      `INSERT INTO legal_parameters
         (effective_from, insurance_threshold, tax_rate, tax_discount_monthly, note)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      '2026-01-01',
      '4499.00',
      '0.15',
      '2570.00',
      'Initial 2026 defaults (limit pojistného 4 500 Kč, srážková daň 15 %, sleva na poplatníka 2 570 Kč/měs).',
    );
  console.log('[seed] legal_parameters seeded with 2026 defaults');
}

sqlite.close();
console.log('[seed] done');
