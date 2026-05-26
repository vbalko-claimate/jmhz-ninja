// Plain ESM migration runner — runs with `node` directly (no tsx/esbuild needed).
// Used in the production Docker entrypoint and locally via `pnpm db:migrate`.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'svj.db');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);

console.log('[migrate] applying migrations to', DB_PATH);
migrate(db, { migrationsFolder: './drizzle' });
sqlite.close();
console.log('[migrate] done');
