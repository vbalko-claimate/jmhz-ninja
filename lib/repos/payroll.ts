import { db } from '@/lib/db/client';
import {
  payrollPeriods,
  payrollRecords,
  type PayrollPeriod,
  type PayrollRecord,
} from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';

export async function getPeriod(year: number, month: number): Promise<PayrollPeriod | undefined> {
  const [row] = await db
    .select()
    .from(payrollPeriods)
    .where(and(eq(payrollPeriods.year, year), eq(payrollPeriods.month, month)));
  return row;
}

export async function ensurePeriod(year: number, month: number): Promise<PayrollPeriod> {
  const existing = await getPeriod(year, month);
  if (existing) return existing;
  const [row] = await db.insert(payrollPeriods).values({ year, month }).returning();
  return row;
}

export async function listPeriods(): Promise<PayrollPeriod[]> {
  return db
    .select()
    .from(payrollPeriods)
    .orderBy(desc(payrollPeriods.year), desc(payrollPeriods.month));
}

export async function listRecordsForPeriod(periodId: number): Promise<PayrollRecord[]> {
  return db.select().from(payrollRecords).where(eq(payrollRecords.periodId, periodId));
}

export async function upsertRecord(
  data: Omit<PayrollRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  const existing = await db
    .select()
    .from(payrollRecords)
    .where(
      and(eq(payrollRecords.periodId, data.periodId), eq(payrollRecords.employeeId, data.employeeId)),
    );
  if (existing.length > 0) {
    await db
      .update(payrollRecords)
      .set({
        baseReward: data.baseReward,
        extraReward: data.extraReward,
        totalGross: data.totalGross,
        taxAmount: data.taxAmount,
        netAmount: data.netAmount,
        taxDeclarationAtTime: data.taxDeclarationAtTime,
        paramsSnapshot: data.paramsSnapshot,
        updatedAt: new Date(),
      })
      .where(eq(payrollRecords.id, existing[0].id));
  } else {
    await db.insert(payrollRecords).values(data);
  }
}

export async function recordValidation(
  periodId: number,
  ok: boolean,
  errors: unknown,
): Promise<void> {
  await db
    .update(payrollPeriods)
    .set({
      lastValidatedAt: new Date(),
      lastValidationOk: ok,
      lastValidationErrors: errors as never,
      updatedAt: new Date(),
    })
    .where(eq(payrollPeriods.id, periodId));
}

export async function markGenerated(periodId: number): Promise<void> {
  await db
    .update(payrollPeriods)
    .set({ status: 'generated', xmlGeneratedAt: new Date(), updatedAt: new Date() })
    .where(eq(payrollPeriods.id, periodId));
}

export async function markSubmitted(
  periodId: number,
  submissionReference: string,
  archiveFolderId: string,
): Promise<void> {
  await db
    .update(payrollPeriods)
    .set({
      status: 'submitted',
      submittedAt: new Date(),
      submissionReference,
      archiveFolderId,
      updatedAt: new Date(),
    })
    .where(eq(payrollPeriods.id, periodId));
}

export async function reopenPeriod(periodId: number, reason: string): Promise<void> {
  await db
    .update(payrollPeriods)
    .set({
      status: 'draft',
      submittedAt: null,
      submissionReference: null,
      xmlGeneratedAt: null,
      notes: reason,
      updatedAt: new Date(),
    })
    .where(eq(payrollPeriods.id, periodId));
}
