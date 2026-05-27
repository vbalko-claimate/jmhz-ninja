'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Spinner } from '@/components/Spinner';

type Result =
  | null
  | { ok: true; durationMs: number; xmlSize: number }
  | { ok: false; durationMs?: number; errors: Array<{ kategorie: string; kod: string; popis: string; formularIdentifikace?: string }> }
  | { ok: false; missing: Array<{ name: string; errors: string[] }> };

export default function ValidateXmlButton({ year, month }: { year: number; month: number }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const router = useRouter();

  async function run() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/exports/xml/${year}/${String(month).padStart(2, '0')}/validate`,
        { method: 'POST' },
      );
      const data = await res.json();
      setResult(data);
      if (data.ok === true) {
        toast.success(`XML JMHZ pro ${month}/${year} prošlo validací (${data.durationMs} ms).`);
      } else if (data?.error === 'NO_RECORDS') {
        toast.warning(
          `Za ${month}/${year} nejsou uložené žádné odměny. Otevřete payroll, vyplňte a uložte, pak validujte.`,
        );
      } else if (data?.missing) {
        toast.warning(
          `Některým zaměstnancům chybí povinná pole pro JMHZ (${data.missing.length}).`,
        );
      } else if (Array.isArray(data?.errors) && data.errors.length > 0) {
        toast.error(`Validátor vrátil ${data.errors.length} chyb.`);
      } else if (data?.error || data?.detail) {
        toast.error(`Validace selhala: ${data.detail ?? data.error}`);
      } else if (!res.ok) {
        toast.error(`Validace selhala (HTTP ${res.status}).`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Validace selhala: ${msg}`);
      setResult({
        ok: false,
        errors: [{ kategorie: 'Network', kod: 'FETCH', popis: msg }],
      });
    } finally {
      setPending(false);
      router.refresh(); // pull the freshly-saved validation status into the badge
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
      >
        {pending && <Spinner className="h-3 w-3" />}
        {pending ? 'Validuji…' : 'Validovat ČSSZ'}
      </button>
      {result && 'ok' in result && result.ok && (
        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
          ✓ OK ({(result as { durationMs: number }).durationMs} ms)
        </span>
      )}
      {result && 'missing' in result && (
        <details className="rounded bg-amber-50 p-2 text-xs">
          <summary className="cursor-pointer font-medium text-amber-900">
            ✗ Chybí povinná pole ({result.missing.length})
          </summary>
          <ul className="mt-1 list-disc pl-4 text-amber-900">
            {result.missing.map((m, i) => (
              <li key={i}>
                <strong>{m.name}:</strong> {m.errors.join(', ')}
              </li>
            ))}
          </ul>
        </details>
      )}
      {result && 'ok' in result && !result.ok && 'errors' in result && (
        <details className="rounded bg-rose-50 p-2 text-xs" open>
          <summary className="cursor-pointer font-medium text-rose-900">
            ✗ Validátor vrátil {result.errors.length} chyb
          </summary>
          <ul className="mt-1 max-h-64 list-disc overflow-y-auto pl-4 text-rose-900">
            {result.errors.map((e, i) => (
              <li key={i} className="mt-1">
                <code>{e.kategorie}/{e.kod}</code> {e.formularIdentifikace && <span>({e.formularIdentifikace})</span>}
                <div>{e.popis}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
