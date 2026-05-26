import { requireRole } from '@/lib/auth';
import {
  createLegalParameters,
  deleteLegalParameters,
  listLegalParameters,
} from '@/lib/repos/legal-params';
import { formatCZK } from '@/lib/money';
import { revalidatePath } from 'next/cache';

export default async function LegalParamsPage() {
  await requireRole(['admin']);
  const rows = await listLegalParameters();

  async function createAction(formData: FormData) {
    'use server';
    await requireRole(['admin']);
    const get = (k: string) => String(formData.get(k) ?? '').trim();
    const effectiveFrom = get('effectiveFrom');
    if (!effectiveFrom) throw new Error('Datum platnosti je povinné.');
    await createLegalParameters({
      effectiveFrom,
      insuranceThreshold: get('insuranceThreshold'),
      taxRate: get('taxRate'),
      taxDiscountMonthly: get('taxDiscountMonthly'),
      note: get('note') || null,
    });
    revalidatePath('/settings/legal');
  }

  async function deleteAction(id: number) {
    'use server';
    await requireRole(['admin']);
    await deleteLegalParameters(id);
    revalidatePath('/settings/legal');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Zákonné parametry (verzované)</h1>
        <p className="text-sm text-slate-500">
          Při ukládání payrollu se použije nejnovější verze s <code>effective_from</code> &le;
          první den daného měsíce. Snapshot se zapíše do payroll záznamu, takže historie není
          ovlivněna pozdějšími změnami.
        </p>
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Platné od</th>
              <th className="px-3 py-2">Limit pojistného</th>
              <th className="px-3 py-2">Sazba daně</th>
              <th className="px-3 py-2">Měsíční sleva</th>
              <th className="px-3 py-2">Poznámka</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs">{r.effectiveFrom}</td>
                <td className="px-3 py-2">{formatCZK(r.insuranceThreshold)}</td>
                <td className="px-3 py-2">{(Number(r.taxRate) * 100).toFixed(1)} %</td>
                <td className="px-3 py-2">{formatCZK(r.taxDiscountMonthly)}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{r.note ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  {rows.length > 1 && (
                    <form
                      action={async () => {
                        'use server';
                        await deleteAction(r.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        Smazat
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">Přidat novou verzi</h2>
        <form action={createAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field name="effectiveFrom" label="Platné od (YYYY-MM-01)" placeholder="2027-01-01" required />
          <Field
            name="insuranceThreshold"
            label="Limit pojistného (Kč)"
            type="number"
            step="0.01"
            defaultValue="4499.00"
            required
          />
          <Field
            name="taxRate"
            label="Sazba daně (0.15 = 15 %)"
            type="number"
            step="0.0001"
            defaultValue="0.15"
            required
          />
          <Field
            name="taxDiscountMonthly"
            label="Měsíční sleva na poplatníka (Kč)"
            type="number"
            step="0.01"
            defaultValue="2570.00"
            required
          />
          <Field name="note" label="Poznámka" colSpan />
          <div className="col-span-full">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Uložit verzi
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
  step,
  defaultValue,
  placeholder,
  colSpan,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string;
  placeholder?: string;
  colSpan?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${colSpan ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-slate-300 px-3 py-1.5 focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
