import { requireRole } from '@/lib/auth';
import { getAppConfig, updateAppConfig } from '@/lib/repos/app-config';
import { revalidatePath } from 'next/cache';

export default async function AppConfigPage() {
  await requireRole(['admin']);
  const cfg = await getAppConfig();

  async function save(formData: FormData) {
    'use server';
    await requireRole(['admin']);
    const get = (k: string) => String(formData.get(k) ?? '').trim();
    await updateAppConfig({
      svjName: get('svjName'),
      svjIco: get('svjIco'),
      svjAddress: get('svjAddress'),
      taxOfficeAccount: get('taxOfficeAccount'),
      csszVs: get('csszVs'),
    });
    revalidatePath('/settings/app');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nastavení SVJ</h1>
        <p className="text-sm text-slate-500">
          Identifikační údaje SVJ pro XML JMHZ a další reporty.
        </p>
      </div>

      <form
        action={save}
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
      >
        <Field name="svjName" label="Název SVJ" defaultValue={cfg.svjName} required />
        <Field name="svjIco" label="IČO" defaultValue={cfg.svjIco} required />
        <Field
          name="svjAddress"
          label="Adresa SVJ"
          defaultValue={cfg.svjAddress}
          colSpan
          required
        />
        <Field
          name="taxOfficeAccount"
          label="Účet finančního úřadu"
          defaultValue={cfg.taxOfficeAccount}
          placeholder="7720-XXXXXX/0710"
        />
        <Field
          name="csszVs"
          label="Variabilní symbol ČSSZ"
          defaultValue={cfg.csszVs}
          placeholder="VS pro pojistné"
        />
        <div className="col-span-full">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Uložit
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  placeholder,
  colSpan,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  colSpan?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${colSpan ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="rounded-md border border-slate-300 px-3 py-1.5 focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
