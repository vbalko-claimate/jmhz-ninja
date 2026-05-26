import { requireRole } from '@/lib/auth';
import { getEmployee } from '@/lib/repos/employees';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { updateEmployeeAction } from '../actions';

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['admin']);
  const { id } = await params;
  const employee = await getEmployee(Number(id));
  if (!employee) notFound();

  const action = updateEmployeeAction.bind(null, employee.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Upravit: {employee.lastName} {employee.firstName}
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
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
      >
        <Field name="firstName" label="Jméno" defaultValue={employee.firstName} required />
        <Field name="lastName" label="Příjmení" defaultValue={employee.lastName} required />
        <Field name="personalId" label="Rodné číslo" defaultValue={employee.personalId} required />
        <Field
          name="defaultGrossReward"
          label="Výchozí měsíční odměna (Kč)"
          type="number"
          step="0.01"
          defaultValue={employee.defaultGrossReward}
          required
        />
        <Field name="bankAccount" label="Bankovní účet" defaultValue={employee.bankAccount} />
        <Field name="csszOic" label="OIC (ČSSZ)" defaultValue={employee.csszOic ?? ''} />
        <Field name="csszIdPpv" label="ID PPV (ČSSZ)" defaultValue={employee.csszIdPpv ?? ''} />
        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            name="isTaxDeclarationSigned"
            defaultChecked={employee.isTaxDeclarationSigned}
            className="rounded"
          />
          Podepsané prohlášení k dani
        </label>
        <div className="col-span-full">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Uložit změny
          </button>
        </div>
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
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
        step={step}
        defaultValue={defaultValue}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
