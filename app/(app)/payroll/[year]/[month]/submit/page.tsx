import { requireRole } from '@/lib/auth';
import { getPeriod, markSubmitted } from '@/lib/repos/payroll';
import { archivePeriodToDrive } from '@/lib/exports/archive';
import { monthLabel } from '@/lib/utils';
import { notFound, redirect } from 'next/navigation';
import { reopenPeriodAction } from '../actions';
import SubmitButton from '@/components/SubmitButton';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  await requireRole(['admin']);
  const { year: yearStr, month: monthStr } = await params;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const period = await getPeriod(year, month);
  if (!period) notFound();

  const isSubmitted = period.status === 'submitted';

  async function confirmSubmit(formData: FormData) {
    'use server';
    await requireRole(['admin']);
    const reference = String(formData.get('reference') ?? '').trim();
    if (!reference) throw new Error('Reference z e-Podání je povinná.');
    const cur = await getPeriod(year, month);
    if (!cur) throw new Error('Období neexistuje.');

    const archive = await archivePeriodToDrive(year, month);
    await markSubmitted(cur.id, reference, archive.folderId);
    redirect(`/payroll/${year}/${String(month).padStart(2, '0')}`);
  }

  async function reopenAction(formData: FormData) {
    'use server';
    await requireRole(['admin']);
    const reason = String(formData.get('reason') ?? '').trim() || 'reopened by admin';
    await reopenPeriodAction(year, month, reason);
    redirect(`/payroll/${year}/${String(month).padStart(2, '0')}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Potvrzení odeslání — {monthLabel(month)} {year}
        </h1>
        <p className="text-sm text-slate-500">
          Po potvrzení se měsíc zamkne, kompletní bundle (CSV, TXT, PDF, XLSX, XML, JSON snapshot)
          se nahraje do Google Drive archivu pod{' '}
          <code>archive/{year}/{String(month).padStart(2, '0')}-submitted/</code>.
        </p>
      </div>

      {!isSubmitted && (
        <form action={confirmSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">
              Reference / číslo potvrzení z e-Podání ČSSZ
            </span>
            <input
              name="reference"
              required
              placeholder="např. 2026-04-15/0001234"
              className="rounded-md border border-slate-300 px-3 py-1.5 font-mono text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <SubmitButton
            variant="success"
            pendingLabel="Archivuji do Drive a zamykám…"
          >
            Potvrdit odeslání a zamknout
          </SubmitButton>
        </form>
      )}

      {isSubmitted && (
        <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
          <div className="text-sm">
            Měsíc byl označen jako odeslán{' '}
            {period.submittedAt && new Date(period.submittedAt).toLocaleString('cs-CZ')}.
          </div>
          <div className="text-xs">
            Reference:{' '}
            <span className="font-mono">{period.submissionReference ?? '—'}</span>
          </div>
          {period.archiveFolderId && (
            <div className="text-xs">
              Drive folder:{' '}
              <a
                className="underline"
                target="_blank"
                href={`https://drive.google.com/drive/folders/${period.archiveFolderId}`}
              >
                {period.archiveFolderId}
              </a>
            </div>
          )}

          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-600">
              Otevřít znovu (admin only — vyžaduje důvod)
            </summary>
            <form action={reopenAction} className="mt-2 flex gap-2">
              <input
                name="reason"
                required
                placeholder="Důvod (audit log)"
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              <ConfirmSubmitButton
                confirm="Skutečně odemknout zamčený měsíc? Bude vyžadováno nové generování XML a opětovné odeslání."
                pendingLabel="Odemykám…"
              >
                Odemknout
              </ConfirmSubmitButton>
            </form>
          </details>
        </div>
      )}
    </div>
  );
}
