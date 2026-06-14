import { requireRole } from '@/lib/auth';
import { getPeriod, markSubmitted } from '@/lib/repos/payroll';
import { archivePeriodToDrive } from '@/lib/exports/archive';
import { monthLabel } from '@/lib/utils';
import { notFound, redirect } from 'next/navigation';
import { reopenPeriodAction } from '../actions';
import { ConfirmSubmitForm, ReopenForm, type SubmitState } from './SubmitForms';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

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

  async function confirmSubmit(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
    'use server';
    await requireRole(['admin']);
    const reference = String(formData.get('reference') ?? '').trim();
    if (!reference) return { error: 'Reference z e-Podání je povinná.' };
    const cur = await getPeriod(year, month);
    if (!cur) return { error: 'Období neexistuje.' };

    // Archive first; a Drive failure must NOT lock the month, and the real
    // reason is surfaced to the admin instead of an opaque 500.
    let archive: Awaited<ReturnType<typeof archivePeriodToDrive>>;
    try {
      archive = await archivePeriodToDrive(year, month);
    } catch (e) {
      return {
        error: `Archivace bundle do Google Drive selhala — měsíc NEbyl zamčen. Detail: ${errMsg(e)}`,
      };
    }
    try {
      await markSubmitted(cur.id, reference, archive.folderId);
    } catch (e) {
      return { error: `Uzamčení období selhalo: ${errMsg(e)}` };
    }
    // redirect() throws NEXT_REDIRECT — must stay outside the try/catch above.
    redirect(`/payroll/${year}/${String(month).padStart(2, '0')}`);
  }

  async function reopenAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
    'use server';
    await requireRole(['admin']);
    const reason = String(formData.get('reason') ?? '').trim() || 'reopened by admin';
    try {
      await reopenPeriodAction(year, month, reason);
    } catch (e) {
      return { error: `Odemčení selhalo: ${errMsg(e)}` };
    }
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
        <ValidationCheck
          ok={period.lastValidationOk}
          at={period.lastValidatedAt}
          errorsCount={Array.isArray(period.lastValidationErrors) ? period.lastValidationErrors.length : 0}
          backHref={`/exports?year=${year}&month=${month}`}
        />
      )}

      {!isSubmitted && <ConfirmSubmitForm action={confirmSubmit} />}

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
            <ReopenForm action={reopenAction} />
          </details>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';

function ValidationCheck({
  ok,
  at,
  errorsCount,
  backHref,
}: {
  ok: boolean | null | undefined;
  at: Date | null | undefined;
  errorsCount: number;
  backHref: string;
}) {
  if (at == null || ok == null) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>⚠ XML JMHZ ještě nebylo validováno proti ČSSZ.</strong>
        <p className="mt-1 text-xs">
          Doporučujeme spustit validaci v{' '}
          <Link href={backHref} className="underline">
            Exporty
          </Link>
          {' '}před tím, než označíte měsíc jako odeslaný. Validátor odhalí chyby, které by jinak
          vedly k zamítnutí podání ze strany ČSSZ.
        </p>
      </div>
    );
  }
  if (!ok) {
    return (
      <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
        <strong>✗ Poslední validace selhala</strong> ({errorsCount} chyb,{' '}
        {new Date(at).toLocaleString('cs-CZ')}).
        <p className="mt-1 text-xs">
          Označovat měsíc jako odeslaný má smysl jen poté, co validátor vrátí OK. Vraťte se do{' '}
          <Link href={backHref} className="underline">
            Exporty
          </Link>
          , klikněte „Validovat ČSSZ&ldquo; a opravte chyby.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
      <strong>✓ Validace OK</strong> · ČSSZ test endpoint přijal XML{' '}
      {new Date(at).toLocaleString('cs-CZ')}. Můžete pokračovat v podání.
    </div>
  );
}
