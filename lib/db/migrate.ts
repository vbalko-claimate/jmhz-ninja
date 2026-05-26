import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, rawDb } from './client';

const migrationsFolder = './drizzle';

console.log('[migrate] applying migrations from', migrationsFolder);
migrate(db, { migrationsFolder });
rawDb.close();
console.log('[migrate] done');
