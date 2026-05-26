import { db } from '@/lib/db/client';
import { employees, payrollPeriods, payrollRecords } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAppConfig } from '@/lib/repos/app-config';

export type PayrollRow = {
  employeeId: number;
  firstName: string;
  lastName: string;
  personalId: string;
  bankAccount: string;
  csszOic: string | null;
  csszIdPpv: string | null;
  baseReward: string;
  extraReward: string;
  totalGross: string;
  taxAmount: string;
  netAmount: string;
  taxDeclarationAtTime: boolean;
};

export type PayrollExport = {
  year: number;
  month: number;
  appConfig: Awaited<ReturnType<typeof getAppConfig>>;
  rows: PayrollRow[];
  period: { id: number; status: string };
};

export async function loadPayrollForExport(year: number, month: number): Promise<PayrollExport | null> {
  const [period] = await db
    .select()
    .from(payrollPeriods)
    .where(and(eq(payrollPeriods.year, year), eq(payrollPeriods.month, month)));
  if (!period) return null;

  const rows = await db
    .select({
      employeeId: payrollRecords.employeeId,
      firstName: employees.firstName,
      lastName: employees.lastName,
      personalId: employees.personalId,
      bankAccount: employees.bankAccount,
      csszOic: employees.csszOic,
      csszIdPpv: employees.csszIdPpv,
      baseReward: payrollRecords.baseReward,
      extraReward: payrollRecords.extraReward,
      totalGross: payrollRecords.totalGross,
      taxAmount: payrollRecords.taxAmount,
      netAmount: payrollRecords.netAmount,
      taxDeclarationAtTime: payrollRecords.taxDeclarationAtTime,
    })
    .from(payrollRecords)
    .innerJoin(employees, eq(employees.id, payrollRecords.employeeId))
    .where(eq(payrollRecords.periodId, period.id))
    .orderBy(employees.lastName);

  const appConfig = await getAppConfig();
  return { year, month, period: { id: period.id, status: period.status }, appConfig, rows };
}
