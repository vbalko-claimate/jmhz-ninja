import { db } from '@/lib/db/client';
import { appConfig, type AppConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function getAppConfig(): Promise<AppConfig> {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.id, 1));
  if (row) return row;
  const [inserted] = await db.insert(appConfig).values({ id: 1 }).returning();
  return inserted;
}

export async function updateAppConfig(
  data: Partial<Omit<AppConfig, 'id'>>,
): Promise<AppConfig> {
  const [row] = await db
    .update(appConfig)
    .set(data)
    .where(eq(appConfig.id, 1))
    .returning();
  return row;
}
