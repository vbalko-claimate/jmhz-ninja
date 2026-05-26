import { requireRole } from '@/lib/auth';
import { listEmployees } from '@/lib/repos/employees';
import Link from 'next/link';
import {
  createEmployeeAction,
  deleteEmployeeAction,
  reactivateEmployeeAction,
} from './actions';
import { formatCZK } from '@/lib/money';
import SubmitButton from '@/components/SubmitButton';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function EmployeesPage() {
  await requireRole(['admin']);
  const rows = await listEmployees({ includeInactive: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Zaměstnanci</h1>
        <p className="text-sm text-slate-500">
          Členové výboru. Smazání je soft (`isActive=false`) — historie payroll zůstává kvůli
          účetní retenci.
        </p>
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Příjmení a jméno</th>
              <th className="px-3 py-2">RČ</th>
              <th className="px-3 py-2">Výchozí odměna</th>
              <th className="px-3 py-2">Prohlášení</th>
              <th className="px-3 py-2">OIC / ID PPV</th>
              <th className="px-3 py-2">Účet</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                  Žádný zaměstnanec — přidejte níže.
                </td>
              </tr>
            )}
            {rows.map((e) => (
              <tr
                key={e.id}
                className={`border-t border-slate-100 ${e.isActive ? '' : 'opacity-50'}`}
              >
                <td className="px-3 py-2 font-medium">
                  {e.lastName} {e.firstName}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{e.personalId}</td>
                <td className="px-3 py-2">{formatCZK(e.defaultGrossReward)}</td>
                <td className="px-3 py-2">
                  {e.isTaxDeclarationSigned ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                      ano
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      ne
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {e.csszOic ?? '—'} / {e.csszIdPpv ?? '—'}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{e.bankAccount}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      href={`/settings/employees/${e.id}`}
                    >
                      Upravit
                    </Link>
                    {e.isActive ? (
                      <form
                        action={async () => {
                          'use server';
                          await deleteEmployeeAction(e.id);
                        }}
                      >
                        <ConfirmSubmitButton
                          confirm={`Deaktivovat ${e.lastName} ${e.firstName}? Historický payroll zůstane zachován.`}
                          pendingLabel="…"
                        >
                          Deaktivovat
                        </ConfirmSubmitButton>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          'use server';
                          await reactivateEmployeeAction(e.id);
                        }}
                      >
                        <SubmitButton
                          variant="secondary"
                          size="sm"
                          pendingLabel="…"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          Obnovit
                        </SubmitButton>
                      </form>
                    )}
                    <form
                      action={`/api/employees/${e.id}/gdpr-export`}
                      method="get"
                      target="_blank"
                    >
                      <button
                        type="submit"
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        GDPR JSON
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-lg font-medium">Přidat zaměstnance</h2>
        <p className="mb-4 text-xs text-slate-500">
          OIC a ID PPV získáte z odpovědi ČSSZ po podání ONZ. Detail viz{' '}
          <a href="/help" className="underline">
            Nápověda
          </a>
          .
        </p>
        <form action={createEmployeeAction} className="space-y-4">
          <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <legend className="text-xs font-semibold uppercase text-slate-500">Osobní údaje</legend>
            <Field name="firstName" label="Jméno" required />
            <Field name="lastName" label="Příjmení" required />
            <Field
              name="nativeSurname"
              label="Rodné příjmení"
              gdpr="Citlivý GDPR údaj. Vyplňujte pouze pokud máte právní důvod (např. JMHZ vyžaduje u některých cizinců)."
            />
            <Field
              name="personalId"
              label="Rodné číslo"
              placeholder="800101/1234"
              required
              gdpr="Vysoce citlivý údaj. Pro JMHZ je RČ povinné u občanů ČR — nutné vyplnit. Pro cizince stačí OIC/EČP."
            />
            <Field
              name="birthDate"
              label="Datum narození"
              type="date"
              gdpr="Citlivý údaj. JMHZ vyžaduje pouze u cizinců bez RČ. Pro občany ČR lze vynechat."
            />
            <Field
              name="birthPlace"
              label="Místo narození"
              gdpr="Citlivý údaj. JMHZ vyžaduje pouze u cizinců. Pro občany ČR lze vynechat."
            />
            <Field name="citizenship" label="Občanství" defaultValue="CZ" />
            <Field
              name="healthInsurance"
              label="Zdravotní pojišťovna"
              placeholder="VZP (111)"
              gdpr="Informativní — pro JMHZ není povinné. Slouží jen interně, pokud byste řešili kontakt se ZP."
            />
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <legend className="text-xs font-semibold uppercase text-slate-500">Pracovněprávní vztah</legend>
            <Field name="functionTitle" label="Funkce" placeholder="předseda / místopředseda / člen / úklid" />
            <Field name="employmentStartDate" label="Datum nástupu" type="date" />
            <Field name="csszOic" label="OIC (ČSSZ)" placeholder="10místné číslo" />
            <Field name="csszIdPpv" label="ID PPV (ČSSZ)" placeholder="13místné číslo" />
            <Field
              name="employmentCategory"
              label="Druh činnosti (JMHZ)"
              defaultValue="Q"
              placeholder="Q = členové kolektivních orgánů"
            />
            <Field
              name="bankAccount"
              label="Bankovní účet"
              placeholder="123456789/0100"
              gdpr="Finanční údaj. Vyplňte jen pokud aplikace bude generovat platební příkazy. Pro samotné JMHZ není potřeba."
            />
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <legend className="text-xs font-semibold uppercase text-slate-500">Odměna</legend>
            <Field
              name="defaultGrossReward"
              label="Výchozí měsíční hrubá odměna (Kč)"
              type="number"
              step="0.01"
              placeholder="3000.00"
              required
            />
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" name="isTaxDeclarationSigned" className="rounded" />
              Podepsané prohlášení k dani
            </label>
          </fieldset>

          <Field name="notes" label="Poznámky" colSpan placeholder="vnitřní poznámka, např. změna od kdy, role apod." />

          <SubmitButton pendingLabel="Ukládám…">Uložit</SubmitButton>
        </form>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  placeholder,
  step,
  defaultValue,
  colSpan,
  gdpr,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  defaultValue?: string;
  colSpan?: boolean;
  gdpr?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${colSpan ? 'sm:col-span-2' : ''}`}>
      <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
        {label}
        {gdpr && (
          <span
            title={gdpr}
            aria-label={gdpr}
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700"
          >
            !
          </span>
        )}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        step={step}
        defaultValue={defaultValue}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
      {gdpr && <span className="text-[10px] text-amber-700">{gdpr}</span>}
    </label>
  );
}
