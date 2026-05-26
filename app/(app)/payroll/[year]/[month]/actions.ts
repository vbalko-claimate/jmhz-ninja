'use server';

import { requireRole } from '@/lib/auth';
import { listActiveEmployeesForPayroll, getEmployee } from '@/lib/repos/employees';
import { getLegalParametersForPeriod } from '@/lib/repos/legal-params';
import { ensurePeriod, getPeriod, upsertRecord } from '@/lib/repos/payroll';
import { calculatePayroll } from '@/lib/payroll';
import { D, toDb } from '@/lib/money';
import { db } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';

export type SavePayload = {
  year: number;
  month: number;
  rows: Array<{
    employeeId: number;
    baseReward: string;
    extraReward: string;
  }>;
};

export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'LOCKED' | 'NO_PARAMS' | 'THRESHOLD_EXCEEDED';
      detail?: string;
      offenders?: Array<{ employeeName: string; totalGross: string; threshold: string }>;
    };

export async function savePayroll(payload: SavePayload): Promise<SaveResult> {
  await requireRole(['admin', 'user']);

  const period = await ensurePeriod(payload.year, payload.month);
  if (period.status === 'submitted') {
    return { ok: false, reason: 'LOCKED', detail: `Měsíc ${payload.month}/${payload.year} je zamčen.` };
  }

  const params = await getLegalParametersForPeriod(payload.year, payload.month);
  if (!params) {
    return {
      ok: false,
      reason: 'NO_PARAMS',
      detail: 'Pro toto období neexistují platné zákonné parametry.',
    };
  }

  const offenders: NonNullable<Extract<SaveResult, { ok: false }>['offenders']> = [];
  const computed: Array<{
    employeeId: number;
    baseReward: string;
    extraReward: string;
    totalGross: string;
    taxAmount: string;
    netAmount: string;
    taxDeclarationAtTime: boolean;
  }> = [];

  for (const row of payload.rows) {
    const emp = await getEmployee(row.employeeId);
    if (!emp) continue;

    const result = calculatePayroll(
      {
        baseReward: row.baseReward || '0',
        extraReward: row.extraReward || '0',
        isTaxDeclarationSigned: emp.isTaxDeclarationSigned,
      },
      params,
    );

    if (!result.ok) {
      offenders.push({
        employeeName: `${emp.lastName} ${emp.firstName}`,
        totalGross: result.totalGross.toFixed(2),
        threshold: result.threshold.toFixed(2),
      });
      continue;
    }

    computed.push({
      employeeId: emp.id,
      baseReward: toDb(D(row.baseReward || '0')),
      extraReward: toDb(D(row.extraReward || '0')),
      totalGross: toDb(result.totalGross),
      taxAmount: toDb(result.taxAmount),
      netAmount: toDb(result.netAmount),
      taxDeclarationAtTime: emp.isTaxDeclarationSigned,
    });
  }

  if (offenders.length > 0) {
    return { ok: false, reason: 'THRESHOLD_EXCEEDED', offenders };
  }

  const snapshot = {
    effectiveFrom: params.effectiveFrom,
    insuranceThreshold: params.insuranceThreshold,
    taxRate: params.taxRate,
    taxDiscountMonthly: params.taxDiscountMonthly,
  };

  // better-sqlite3 transactions require a synchronous callback. Our
  // upsertRecord uses async Drizzle helpers, so we upsert sequentially
  // outside a wrapping transaction. For 4–6 employees per period the lack
  // of atomicity is acceptable — failure surfaces as a partial save that
  // the user can retry.
  for (const c of computed) {
    await upsertRecord({
      periodId: period.id,
      employeeId: c.employeeId,
      baseReward: c.baseReward,
      extraReward: c.extraReward,
      totalGross: c.totalGross,
      taxAmount: c.taxAmount,
      netAmount: c.netAmount,
      taxDeclarationAtTime: c.taxDeclarationAtTime,
      paramsSnapshot: snapshot,
    });
  }

  revalidatePath(`/payroll/${payload.year}/${String(payload.month).padStart(2, '0')}`);
  return { ok: true };
}

export async function reopenPeriodAction(year: number, month: number, reason: string) {
  await requireRole(['admin']);
  const period = await getPeriod(year, month);
  if (!period) return;
  const { reopenPeriod } = await import('@/lib/repos/payroll');
  await reopenPeriod(period.id, reason);
  revalidatePath(`/payroll/${year}/${String(month).padStart(2, '0')}`);
}
