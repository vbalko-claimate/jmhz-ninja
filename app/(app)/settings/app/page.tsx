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
      svjDatovaSchranka: get('svjDatovaSchranka'),
      taxOfficeAccount: get('taxOfficeAccount'),
      csszVs: get('csszVs'),
      csszAccount: get('csszAccount'),
      osszCode: get('osszCode'),
      osszName: get('osszName'),
      osszAddress: get('osszAddress'),
      osszEmail: get('osszEmail'),
      osszDatovaSchranka: get('osszDatovaSchranka'),
      workplaceObec: get('workplaceObec'),
      workplaceKodObce: get('workplaceKodObce'),
      workplaceKodStatu: get('workplaceKodStatu') || 'CZ',
    });
    revalidatePath('/settings/app');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nastavení SVJ</h1>
        <p className="text-sm text-slate-500">
          Identifikační údaje SVJ pro XML JMHZ a další reporty. Doplňkové údaje OSSZ pro
          komunikaci s místně příslušnou Okresní správou sociálního zabezpečení.
        </p>
      </div>

      <form action={save} className="space-y-5">
        <fieldset className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <legend className="px-2 text-xs font-semibold uppercase text-slate-500">SVJ</legend>
          <Field name="svjName" label="Název SVJ" defaultValue={cfg.svjName} required />
          <Field name="svjIco" label="IČO" defaultValue={cfg.svjIco} required />
          <Field name="svjAddress" label="Adresa SVJ" defaultValue={cfg.svjAddress} colSpan required />
          <Field
            name="svjDatovaSchranka"
            label="ID datové schránky SVJ"
            defaultValue={cfg.svjDatovaSchranka ?? ''}
            placeholder="např. 8dgwgw8"
          />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <legend className="px-2 text-xs font-semibold uppercase text-slate-500">Finanční úřad</legend>
          <Field
            name="taxOfficeAccount"
            label="Účet FÚ pro srážkovou daň"
            defaultValue={cfg.taxOfficeAccount}
            placeholder="7720-XXXXXX/0710"
            colSpan
          />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <legend className="px-2 text-xs font-semibold uppercase text-slate-500">
            Místo výkonu práce (JMHZ)
          </legend>
          <Field
            name="workplaceObec"
            label="Obec"
            defaultValue={cfg.workplaceObec ?? 'Praha'}
            placeholder="např. Praha"
          />
          <Field
            name="workplaceKodObce"
            label="Kód obce (ČSÚ, 6 číslic)"
            defaultValue={cfg.workplaceKodObce ?? '554782'}
            placeholder="554782 = Hlavní město Praha"
          />
          <Field
            name="workplaceKodStatu"
            label="Kód státu (ISO 2)"
            defaultValue={cfg.workplaceKodStatu ?? 'CZ'}
          />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <legend className="px-2 text-xs font-semibold uppercase text-slate-500">ČSSZ a OSSZ</legend>
          <Field
            name="csszVs"
            label="Variabilní symbol ČSSZ"
            defaultValue={cfg.csszVs}
            placeholder="přidělí ČSSZ"
          />
          <Field
            name="csszAccount"
            label="Účet pro pojistné ČSSZ"
            defaultValue={cfg.csszAccount ?? ''}
            placeholder="např. 21012-17925341/0710"
          />
          <Field
            name="osszName"
            label="Místně příslušná OSSZ"
            defaultValue={cfg.osszName ?? ''}
            placeholder="např. Karlovy Vary"
          />
          <Field
            name="osszCode"
            label="Kód OSSZ"
            defaultValue={cfg.osszCode ?? ''}
            placeholder="např. 442"
          />
          <Field
            name="osszAddress"
            label="Adresa OSSZ"
            defaultValue={cfg.osszAddress ?? ''}
            placeholder="Krymská 2A, 360 01 Karlovy Vary"
            colSpan
          />
          <Field
            name="osszEmail"
            label="E-podatelna OSSZ"
            type="email"
            defaultValue={cfg.osszEmail ?? ''}
            placeholder="posta.kv@cssz.cz"
          />
          <Field
            name="osszDatovaSchranka"
            label="ID datové schránky OSSZ"
            defaultValue={cfg.osszDatovaSchranka ?? ''}
            placeholder="např. i2pac3f"
          />
        </fieldset>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Uložit
        </button>
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
  type = 'text',
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  colSpan?: boolean;
  type?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${colSpan ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="rounded-md border border-slate-300 px-3 py-1.5 focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
