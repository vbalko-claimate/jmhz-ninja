import { requireRole } from '@/lib/auth';
import { getEmployee } from '@/lib/repos/employees';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { updateEmployeeAction } from '../actions';
import SubmitButton from '@/components/SubmitButton';

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['admin']);
  const { id } = await params;
  const e = await getEmployee(Number(id));
  if (!e) notFound();

  const action = updateEmployeeAction.bind(null, e.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Upravit: {e.lastName} {e.firstName}
        </h1>
        <Link
          href="/settings/employees"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← zpět
        </Link>
      </div>

      <form
        action={action}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
      >
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="text-xs font-semibold uppercase text-slate-500">Osobní údaje</legend>
          <Field name="firstName" label="Jméno" defaultValue={e.firstName} required />
          <Field name="lastName" label="Příjmení" defaultValue={e.lastName} required />
          <Field
            name="nativeSurname"
            label="Rodné příjmení"
            defaultValue={e.nativeSurname ?? ''}
            gdpr="Citlivý GDPR údaj. Vyplňujte pouze pokud máte právní důvod (JMHZ vyžaduje u některých cizinců)."
          />
          <Field
            name="personalId"
            label="Rodné číslo"
            defaultValue={e.personalId}
            required
            gdpr="Vysoce citlivý údaj. Pro JMHZ je RČ povinné u občanů ČR."
          />
          <Field
            name="birthDate"
            label="Datum narození"
            type="date"
            defaultValue={e.birthDate ?? ''}
            gdpr="Citlivý údaj. JMHZ vyžaduje pouze u cizinců bez RČ."
          />
          <Field
            name="birthPlace"
            label="Místo narození"
            defaultValue={e.birthPlace ?? ''}
            gdpr="Citlivý údaj. JMHZ vyžaduje pouze u cizinců."
          />
          <Field name="citizenship" label="Občanství" defaultValue={e.citizenship ?? 'CZ'} />
          <Field
            name="healthInsurance"
            label="Zdravotní pojišťovna"
            defaultValue={e.healthInsurance ?? ''}
            placeholder="VZP (111)"
            gdpr="Pro JMHZ není povinné, jen interní info."
          />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="text-xs font-semibold uppercase text-slate-500">Pracovněprávní vztah</legend>
          <Field name="functionTitle" label="Funkce" defaultValue={e.functionTitle ?? ''} placeholder="předseda / místopředseda / člen / úklid" />
          <Field name="employmentStartDate" label="Datum nástupu" type="date" defaultValue={e.employmentStartDate ?? ''} />
          <Field name="csszOic" label="OIC (ČSSZ)" defaultValue={e.csszOic ?? ''} />
          <Field name="csszIdPpv" label="ID PPV (ČSSZ)" defaultValue={e.csszIdPpv ?? ''} />
          <Field name="employmentCategory" label="Druh činnosti (JMHZ)" defaultValue={e.employmentCategory ?? 'Q'} placeholder="Q = členové kolektivních orgánů" />
          <Field
            name="bankAccount"
            label="Bankovní účet"
            defaultValue={e.bankAccount}
            placeholder="123456789/0100"
            gdpr="Finanční údaj. Pro JMHZ není potřeba, jen pro platební příkazy."
          />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="text-xs font-semibold uppercase text-slate-500">Odměna</legend>
          <Field
            name="defaultGrossReward"
            label="Výchozí měsíční hrubá odměna (Kč)"
            type="number"
            step="0.01"
            defaultValue={e.defaultGrossReward}
            required
          />
          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              name="isTaxDeclarationSigned"
              defaultChecked={e.isTaxDeclarationSigned}
              className="rounded"
            />
            Podepsané prohlášení k dani
          </label>
        </fieldset>

        <Field name="notes" label="Poznámky" defaultValue={e.notes ?? ''} colSpan placeholder="vnitřní poznámka" />

        <SubmitButton pendingLabel="Ukládám…">Uložit změny</SubmitButton>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  step,
  defaultValue,
  placeholder,
  colSpan,
  gdpr,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string;
  placeholder?: string;
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
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
      {gdpr && <span className="text-[10px] text-amber-700">{gdpr}</span>}
    </label>
  );
}
