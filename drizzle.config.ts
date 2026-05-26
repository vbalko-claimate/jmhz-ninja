import type { Config } from 'drizzle-kit';
import path from 'node:path';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'svj.db'),
  },
  strict: true,
  verbose: true,
} satisfies Config;
