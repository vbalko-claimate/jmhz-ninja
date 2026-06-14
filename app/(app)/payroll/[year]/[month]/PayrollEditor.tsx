'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { savePayroll, type SaveResult, type SaveRow } from './actions';
import type { Employee } from '@/lib/db/schema';
import { calculatePayroll, grossFromNet, type LegalParams } from '@/lib/payroll';
import { D, formatCZK } from '@/lib/money';
import { Spinner } from '@/components/Spinner';

type Mode = 'gross' | 'net';

type Row = {
  employeeId: number;
  mode: Mode;
  baseReward: string;
  extraReward: string;
  netReward: string;
};

export default function PayrollEditor({
  year,
  month,
  employees,
  initialRows,
  params,
  locked,
}: {
  year: number;
  month: number;
  employees: Employee[];
  initialRows: Record<number, { employeeId: number; baseReward: string; extraReward: string }>;
  params: LegalParams;
  locked: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<number, Row>>(() => {
    const r: Record<number, Row> = {};
    for (const e of employees) {
      const stored = initialRows[e.id];
      r[e.id] = {
        employeeId: e.id,
        mode: 'gross',
        baseReward: stored?.baseReward ?? e.defaultGrossReward,
        extraReward: stored?.extraReward ?? '0',
        netReward: '',
      };
    }
    return r;
  });
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, startTransition] = useTransition();

  function update(id: number, patch: Partial<Row>) {
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  }

  // Live breakdown for a row, computed with the same statutory logic the
  // server uses on save (gross → net, or net → grossed-up).
  function calcFor(emp: Employee, row: Row) {
    return row.mode === 'net'
      ? grossFromNet(
          { netReward: row.netReward || '0', isTaxDeclarationSigned: emp.isTaxDeclarationSigned },
          params,
        )
      : calculatePayroll(
          {
            baseReward: row.baseReward || '0',
            extraReward: row.extraReward || '0',
            isTaxDeclarationSigned: emp.isTaxDeclarationSigned,
          },
          params,
        );
  }

  function toggleMode(emp: Employee, row: Row, next: Mode) {
    if (next === row.mode) return;
    const calc = calcFor(emp, row);
    if (next === 'net') {
      // Carry the currently computed net into the net field.
      update(emp.id, { mode: 'net', netReward: calc.ok ? calc.netAmount.toFixed(2) : '' });
    } else {
      // Carry the grossed-up amount into the base field, drop the bonus.
      update(emp.id, {
        mode: 'gross',
        baseReward: calc.ok ? calc.totalGross.toFixed(2) : '',
        extraReward: '0',
      });
    }
  }

  function onSave() {
    startTransition(async () => {
      const payloadRows: SaveRow[] = Object.values(rows).map((row) =>
        row.mode === 'net'
          ? { employeeId: row.employeeId, mode: 'net', netReward: row.netReward || '0' }
          : {
              employeeId: row.employeeId,
              mode: 'gross',
              baseReward: row.baseReward || '0',
              extraReward: row.extraReward || '0',
            },
      );
      const res = await savePayroll({ year, month, rows: payloadRows });
      setResult(res);
      if (res.ok) {
        toast.success(`Payroll ${month}/${year} uložen.`);
        router.refresh();
      } else if (res.reason === 'THRESHOLD_EXCEEDED') {
        toast.error('Limit pojistného překročen — viz detail níže.');
      } else {
        toast.error(res.detail ?? res.reason);
      }
    });
  }

  // Column totals across all rows (only rows that compute cleanly).
  const totals = employees.reduce(
    (acc, e) => {
      const calc = calcFor(e, rows[e.id]);
      if (calc.ok) {
        acc.gross = acc.gross.plus(calc.totalGross);
        acc.tax = acc.tax.plus(calc.taxAmount);
        acc.net = acc.net.plus(calc.netAmount);
      } else {
        acc.anyExceeded = true;
      }
      return acc;
    },
    { gross: D(0), tax: D(0), net: D(0), anyExceeded: false },
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Zaměstnanec</th>
              <th className="px-3 py-2">Prohlášení</th>
              <th className="px-3 py-2">Zadávám</th>
              <th className="px-3 py-2 text-right">Základní odměna (Kč)</th>
              <th className="px-3 py-2 text-right">Bonus (Kč)</th>
              <th className="px-3 py-2 text-right">Čistá odměna (Kč)</th>
              <th className="px-3 py-2 text-right">Daň</th>
              <th className="px-3 py-2 text-right">Hrubá celkem</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const row = rows[e.id];
              const isNet = row.mode === 'net';
              const calc = calcFor(e, row);
              const exceeded = !calc.ok;
              return (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">
                    {e.lastName} {e.firstName}
                  </td>
                  <td className="px-3 py-2">
                    {e.isTaxDeclarationSigned ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        podepsáno
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        bez prohlášení
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <ModeToggle
                      mode={row.mode}
                      disabled={locked}
                      onChange={(m) => toggleMode(e, row, m)}
                    />
                  </td>
                  {/* Základní odměna: editable in gross mode, computed gross in net mode */}
                  <td className="px-3 py-2 text-right">
                    {isNet ? (
                      <span className="font-mono text-slate-700">
                        {calc.ok ? calc.totalGross.toFixed(2) : '—'}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        disabled={locked}
                        value={row.baseReward}
                        onChange={(ev) => update(e.id, { baseReward: ev.target.value })}
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                      />
                    )}
                  </td>
                  {/* Bonus: editable in gross mode only */}
                  <td className="px-3 py-2 text-right">
                    {isNet ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        disabled={locked}
                        value={row.extraReward}
                        onChange={(ev) => update(e.id, { extraReward: ev.target.value })}
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                      />
                    )}
                  </td>
                  {/* Čistá odměna: editable in net mode, computed in gross mode */}
                  <td className="px-3 py-2 text-right">
                    {isNet ? (
                      <input
                        type="number"
                        step="0.01"
                        disabled={locked}
                        value={row.netReward}
                        onChange={(ev) => update(e.id, { netReward: ev.target.value })}
                        className="w-32 rounded-md border border-indigo-300 px-2 py-1 text-right disabled:bg-slate-100"
                      />
                    ) : (
                      <span className="font-mono text-slate-700">
                        {calc.ok ? calc.netAmount.toFixed(2) : '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">
                    {calc.ok ? calc.taxAmount.toFixed(2) : '—'}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${
                      exceeded ? 'font-semibold text-rose-600' : ''
                    }`}
                  >
                    {calc.ok ? calc.totalGross.toFixed(2) : `${calc.totalGross.toFixed(2)} ⚠`}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
              <td className="px-3 py-2" colSpan={5}>
                Celkem {totals.anyExceeded && <span className="text-rose-600">(bez překročených)</span>}
              </td>
              <td className="px-3 py-2 text-right font-mono">{totals.net.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-mono">{totals.tax.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-mono">{totals.gross.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Limit pojistného: {formatCZK(params.insuranceThreshold)} / měsíc. Při zadání čisté částky se
        hrubá dopočítá podle zákonné srážkové daně.
      </p>

      {result && !result.ok && result.reason === 'THRESHOLD_EXCEEDED' && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <strong>LIMIT POJISTNÉHO PŘEKROČEN.</strong> Aplikace neumí zpracovat odměny, ze kterých
          se odvádí sociální/zdravotní pojištění. Snižte částku nebo upravte limit v zákonných
          parametrech.
          <ul className="mt-2 list-disc pl-5">
            {result.offenders?.map((o, i) => (
              <li key={i}>
                <strong>{o.employeeName}</strong>: hrubá {o.totalGross} Kč &gt; limit {o.threshold} Kč
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && !result.ok && result.reason !== 'THRESHOLD_EXCEEDED' && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          {result.detail ?? result.reason}
        </div>
      )}

      {result?.ok && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          Uloženo.
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={pending || locked}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
        >
          {pending && <Spinner className="h-3 w-3" />}
          {pending ? 'Ukládám…' : 'Uložit payroll'}
        </button>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  disabled,
  onChange,
}: {
  mode: Mode;
  disabled: boolean;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs">
      {(['gross', 'net'] as const).map((m) => (
        <button
          key={m}
          type="button"
          disabled={disabled}
          onClick={() => onChange(m)}
          className={`px-2 py-1 transition ${
            mode === m
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 disabled:hover:bg-white'
          }`}
        >
          {m === 'gross' ? 'Hrubá' : 'Čistá'}
        </button>
      ))}
    </div>
  );
}
