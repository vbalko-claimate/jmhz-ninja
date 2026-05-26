'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from './Spinner';

const MONTHS = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
];

export default function PeriodPicker({
  defaultYear,
  defaultMonth,
  basePath = '/payroll',
  label = 'Otevřít měsíc',
}: {
  defaultYear: number;
  defaultMonth: number;
  basePath?: string;
  label?: string;
}) {
  const router = useRouter();
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [pending, setPending] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  // Allow ± 5 years from now
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  function open(y: number, m: number) {
    setPending(true);
    router.push(`${basePath}/${y}/${String(m).padStart(2, '0')}`);
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 backdrop-blur">
      <select
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
      >
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => open(year, month)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 px-3 py-1 text-xs font-medium text-white shadow-sm shadow-indigo-600/20 transition-all duration-150 ease-out hover:from-indigo-500 hover:to-indigo-600 hover:shadow-md hover:shadow-indigo-500/30 active:scale-[0.97] disabled:from-slate-400 disabled:to-slate-400"
      >
        {pending && <Spinner className="h-3 w-3" />}
        {label}
      </button>
    </div>
  );
}

export function PeriodNav({
  year,
  month,
  basePath = '/payroll',
}: {
  year: number;
  month: number;
  basePath?: string;
}) {
  const router = useRouter();

  function step(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    router.push(`${basePath}/${y}/${String(m).padStart(2, '0')}`);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 backdrop-blur">
      <button
        onClick={() => step(-1)}
        title="Předchozí měsíc"
        className="rounded-l-lg px-2 py-1 text-sm text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
      >
        ‹
      </button>
      <span className="px-2 py-1 text-xs font-medium text-slate-700">
        {month}/{year}
      </span>
      <button
        onClick={() => step(1)}
        title="Další měsíc"
        className="rounded-r-lg px-2 py-1 text-sm text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
      >
        ›
      </button>
    </div>
  );
}
