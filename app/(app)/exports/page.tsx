import { requireRole } from '@/lib/auth';
import { listPeriods } from '@/lib/repos/payroll';
import { monthLabel } from '@/lib/utils';
import Link from 'next/link';

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
              className={`rounded-xl border bg-white p-5 ${
                highlight ? 'border-slate-900 ring-2 ring-slate-200' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {monthLabel(p.month)} {p.year}
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
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
        primary
          ? 'bg-slate-900 text-white hover:bg-slate-800'
          : 'border border-slate-300 hover:bg-slate-100'
      }`}
    >
      {label}
    </a>
  );
}
