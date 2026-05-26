import { requireRole } from '@/lib/auth';
import { listPeriods } from '@/lib/repos/payroll';
import { monthLabel } from '@/lib/utils';
import Link from 'next/link';
import ValidateXmlButton from './ValidateXmlButton';

export default async function ExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requireRole(['admin', 'user', 'viewer']);
  const periods = await listPeriods();
  const sp = await searchParams;
  const focusedYear = sp.year ? Number(sp.year) : null;
  const focusedMonth = sp.month ? Number(sp.month) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Exporty a reporty</h1>
        <p className="text-sm text-slate-500">
          Pro každý uložený měsíc můžete stáhnout CSV/TXT/PDF přehled a vygenerovat XML JMHZ pro
          ČSSZ.
        </p>
      </div>

      {periods.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Zatím žádné uložené měsíce. Otevřete payroll v dashboardu a uložte první měsíc.
        </div>
      )}

      <div className="space-y-3">
        {periods.map((p) => {
          const highlight = p.year === focusedYear && p.month === focusedMonth;
          const yy = p.year;
          const mm = String(p.month).padStart(2, '0');
          return (
            <div
              key={p.id}
              className={`group rounded-xl border bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                highlight
                  ? 'border-indigo-300 ring-2 ring-indigo-200 shadow-md shadow-indigo-100'
                  : 'border-slate-200 hover:border-indigo-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {monthLabel(p.month)} {p.year}
                    <ValidationBadge
                      ok={p.lastValidationOk}
                      at={p.lastValidatedAt}
                      errorsCount={Array.isArray(p.lastValidationErrors) ? p.lastValidationErrors.length : 0}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    Stav: <strong>{p.status}</strong>
                    {p.submissionReference && (
                      <>
                        {' '}
                        · ref: <span className="font-mono">{p.submissionReference}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DownloadBtn href={`/api/exports/csv/${yy}/${mm}`} label="CSV" />
                  <DownloadBtn href={`/api/exports/txt/${yy}/${mm}`} label="TXT" />
                  <DownloadBtn href={`/api/exports/pdf/${yy}/${mm}`} label="PDF" />
                  <DownloadBtn
                    href={`/api/exports/xml/${yy}/${mm}`}
                    label="XML JMHZ"
                    primary
                  />
                  <ValidateXmlButton year={p.year} month={p.month} />
                  <Link
                    href={`/payroll/${yy}/${mm}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
                  >
                    Otevřít payroll →
                  </Link>
                  {p.status === 'generated' && (
                    <Link
                      href={`/payroll/${yy}/${mm}/submit`}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                    >
                      Označit jako odeslané
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ValidationBadge({
  ok,
  at,
  errorsCount,
}: {
  ok: boolean | null | undefined;
  at: Date | null | undefined;
  errorsCount: number;
}) {
  if (at == null || ok == null) {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
        nevalidováno
      </span>
    );
  }
  const time = new Date(at).toLocaleString('cs-CZ');
  if (ok) {
    return (
      <span
        title={`Validace OK · ${time}`}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700"
      >
        ✓ validní
      </span>
    );
  }
  return (
    <span
      title={`Validace selhala · ${time}`}
      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700"
    >
      ✗ {errorsCount} chyb
    </span>
  );
}

function DownloadBtn({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.97] ${
        primary
          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-600 hover:shadow-md hover:shadow-indigo-500/30'
          : 'border border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
      }`}
    >
      {label}
    </a>
  );
}
