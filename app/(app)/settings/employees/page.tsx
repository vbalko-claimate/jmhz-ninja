import { requireRole } from '@/lib/auth';
import { listEmployees } from '@/lib/repos/employees';
import Link from 'next/link';
import {
  createEmployeeAction,
  deleteEmployeeAction,
  reactivateEmployeeAction,
} from './actions';
import { formatCZK } from '@/lib/money';

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
                        <button
                          type="submit"
                          className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          Deaktivovat
                        </button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          'use server';
                          await reactivateEmployeeAction(e.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                        >
                          Obnovit
                        </button>
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
        <h2 className="mb-3 text-lg font-medium">Přidat zaměstnance</h2>
        <form action={createEmployeeAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field name="firstName" label="Jméno" required />
          <Field name="lastName" label="Příjmení" required />
          <Field name="personalId" label="Rodné číslo" placeholder="800101/1234" required />
          <Field
            name="defaultGrossReward"
            label="Výchozí měsíční odměna (Kč)"
            type="number"
            step="0.01"
            placeholder="3000.00"
            required
          />
          <Field name="bankAccount" label="Bankovní účet" placeholder="123456789/0100" />
          <Field name="csszOic" label="OIC (ČSSZ)" />
          <Field name="csszIdPpv" label="ID PPV (ČSSZ)" />
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="isTaxDeclarationSigned" className="rounded" />
            Podepsané prohlášení k dani
          </label>
          <div className="col-span-full">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Uložit
            </button>
          </div>
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        step={step}
        defaultValue={defaultValue}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
