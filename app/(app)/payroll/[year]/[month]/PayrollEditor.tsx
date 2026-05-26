'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { savePayroll, type SaveResult } from './actions';
import type { Employee } from '@/lib/db/schema';

type Row = {
  employeeId: number;
  baseReward: string;
  extraReward: string;
};

export default function PayrollEditor({
  year,
  month,
  employees,
  initialRows,
  locked,
}: {
  year: number;
  month: number;
  employees: Employee[];
  initialRows: Record<number, Row>;
  locked: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<number, Row>>(() => {
    const r: Record<number, Row> = {};
    for (const e of employees) {
      r[e.id] = initialRows[e.id] ?? {
        employeeId: e.id,
        baseReward: e.defaultGrossReward,
        extraReward: '0',
      };
    }
    return r;
  });
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, startTransition] = useTransition();

  function update(id: number, field: 'baseReward' | 'extraReward', value: string) {
    setRows((r) => ({ ...r, [id]: { ...r[id], [field]: value } }));
  }

  function onSave() {
    startTransition(async () => {
      const payload = {
        year,
        month,
        rows: Object.values(rows),
      };
      const res = await savePayroll(payload);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Zaměstnanec</th>
              <th className="px-3 py-2">Prohlášení</th>
              <th className="px-3 py-2 text-right">Základní odměna (Kč)</th>
              <th className="px-3 py-2 text-right">Bonus (Kč)</th>
              <th className="px-3 py-2 text-right">Hrubá celkem</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const row = rows[e.id];
              const total = (
                Number(row?.baseReward || 0) + Number(row?.extraReward || 0)
              ).toFixed(2);
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
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={locked}
                      value={row?.baseReward ?? ''}
                      onChange={(ev) => update(e.id, 'baseReward', ev.target.value)}
                      className="w-32 rounded-md border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={locked}
                      value={row?.extraReward ?? ''}
                      onChange={(ev) => update(e.id, 'extraReward', ev.target.value)}
                      className="w-32 rounded-md border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
        >
          {pending ? 'Ukládám…' : 'Uložit payroll'}
        </button>
      </div>
    </div>
  );
}
