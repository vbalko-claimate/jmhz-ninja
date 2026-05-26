import { db, rawDb } from './client';
import { appConfig, backupSettings, legalParameters } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  const existingCfg = await db.select().from(appConfig).where(eq(appConfig.id, 1));
  if (existingCfg.length === 0) {
    await db.insert(appConfig).values({ id: 1 });
    console.log('[seed] app_config singleton created');
  }

  const existingBackup = await db.select().from(backupSettings).where(eq(backupSettings.id, 1));
  if (existingBackup.length === 0) {
    await db.insert(backupSettings).values({ id: 1 });
    console.log('[seed] backup_settings singleton created');
  }

  const existingParams = await db.select().from(legalParameters);
  if (existingParams.length === 0) {
    // Czech statutory parameters effective for 2026 — adjust in admin UI when laws change.
    await db.insert(legalParameters).values({
      effectiveFrom: '2026-01-01',
      insuranceThreshold: '4499.00',
      taxRate: '0.15',
      taxDiscountMonthly: '2570.00',
      note: 'Initial 2026 defaults (limit pojistného 4 500 Kč, srážková daň 15 %, sleva na poplatníka 2 570 Kč/měs).',
    });
    console.log('[seed] legal_parameters seeded with 2026 defaults');
  }

  rawDb.close();
  console.log('[seed] done');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
