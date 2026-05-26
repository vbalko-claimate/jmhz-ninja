import { db } from '@/lib/db/client';
import { legalParameters, type LegalParameters, type NewEmployee } from '@/lib/db/schema';
import { desc, lte, sql } from 'drizzle-orm';

export async function listLegalParameters(): Promise<LegalParameters[]> {
  return db.select().from(legalParameters).orderBy(desc(legalParameters.effectiveFrom));
}

export async function getLegalParametersForPeriod(
  year: number,
  month: number,
): Promise<LegalParameters | undefined> {
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const [row] = await db
    .select()
    .from(legalParameters)
    .where(lte(legalParameters.effectiveFrom, periodStart))
    .orderBy(desc(legalParameters.effectiveFrom))
    .limit(1);
  return row;
}

export async function createLegalParameters(data: {
  effectiveFrom: string;
  insuranceThreshold: string;
  taxRate: string;
  taxDiscountMonthly: string;
  note?: string | null;
}): Promise<LegalParameters> {
  const [row] = await db.insert(legalParameters).values(data).returning();
  return row;
}

export async function deleteLegalParameters(id: number): Promise<void> {
  await db.delete(legalParameters).where(sql`id = ${id}`);
}
