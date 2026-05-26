import { requireRole } from '@/lib/auth';
import { listActiveEmployeesForPayroll } from '@/lib/repos/employees';
import { ensurePeriod, listRecordsForPeriod } from '@/lib/repos/payroll';
import { getLegalParametersForPeriod } from '@/lib/repos/legal-params';
import { monthLabel } from '@/lib/utils';
import { formatCZK } from '@/lib/money';
import PayrollEditor from './PayrollEditor';
import Link from 'next/link';

export default async function PayrollPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const me = await requireRole(['admin', 'user', 'viewer']);
  const { year: yearStr, month: monthStr } = await params;
  const year = Number(yearStr);
  const month = Number(monthStr);

  const [period, employees, paramsRow] = await Promise.all([
    ensurePeriod(year, month),
    listActiveEmployeesForPayroll(),
    getLegalParametersForPeriod(year, month),
  ]);

  const records = await listRecordsForPeriod(period.id);
  const initialRows = Object.fromEntries(
    records.map((r) => [
      r.employeeId,
      {
        employeeId: r.employeeId,
        baseReward: r.baseReward,
        extraReward: r.extraReward,
      },
    ]),
  );

  const canEdit =
    (me.role === 'admin' || me.role === 'user') && period.status !== 'submitted';
  const locked = period.status === 'submitted';

  const periodIso = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Payroll {monthLabel(month)} {year}
          </h1>
          <p className="text-sm text-slate-500">
            Stav: <StatusBadge status={period.status} />
            {period.submissionReference && (
              <span className="ml-2 text-xs">
                (ref: <span className="font-mono">{period.submissionReference}</span>)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/exports?year=${year}&month=${month}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
          >
            Exporty / XML JMHZ
          </Link>
        </div>
      </div>

      {paramsRow ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          <strong>Aktivní zákonné parametry</strong> (effective {paramsRow.effectiveFrom}): limit{' '}
          {formatCZK(paramsRow.insuranceThreshold)}, daň{' '}
          {(Number(paramsRow.taxRate) * 100).toFixed(1)} %, měsíční sleva{' '}
          {formatCZK(paramsRow.taxDiscountMonthly)}
        </div>
      ) : (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          Pro období {periodIso} neexistují zákonné parametry. Doplňte je v{' '}
          <Link href="/settings/legal" className="underline">
            Nastavení &gt; Zákonné parametry
          </Link>
          .
        </div>
      )}

      {employees.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Žádní aktivní zaměstnanci. Přidejte je v{' '}
          <Link href="/settings/employees" className="underline">
            Nastavení &gt; Zaměstnanci
          </Link>
          .
        </div>
      )}

      {employees.length > 0 && paramsRow && (
        <PayrollEditor
          year={year}
          month={month}
          employees={employees}
          initialRows={initialRows}
          locked={!canEdit || locked}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-200 text-slate-700',
    generated: 'bg-amber-200 text-amber-900',
    submitted: 'bg-emerald-200 text-emerald-900',
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase ${
        map[status] ?? 'bg-slate-200 text-slate-700'
      }`}
    >
      {status}
    </span>
  );
}
