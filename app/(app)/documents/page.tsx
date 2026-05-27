import { requireRole } from '@/lib/auth';
import { listDocuments } from '@/lib/repos/documents';
import UploadForm from './UploadForm';
import { deleteDocumentAction } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { monthLabel } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  podklady: 'Podklady',
  oic: 'OIČ',
  vs: 'VS / ČSSZ',
  'mzdove-listy': 'Mzdové listy',
  'jmhz-podani': 'JMHZ podání',
  protokol: 'Protokol',
  smlouva: 'Smlouva',
  jine: 'Jiné',
};

const CATEGORY_COLOR: Record<string, string> = {
  podklady: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  oic: 'bg-violet-50 text-violet-700 border-violet-200',
  vs: 'bg-sky-50 text-sky-700 border-sky-200',
  'mzdove-listy': 'bg-amber-50 text-amber-700 border-amber-200',
  'jmhz-podani': 'bg-teal-50 text-teal-700 border-teal-200',
  protokol: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  smlouva: 'bg-rose-50 text-rose-700 border-rose-200',
  jine: 'bg-slate-100 text-slate-600 border-slate-200',
};

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(mime: string): string {
  if (mime === 'application/pdf') return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv') return '📊';
  if (mime.includes('word')) return '📝';
  if (mime.includes('xml')) return '🧾';
  return '📎';
}

export default async function DocumentsPage() {
  const me = await requireRole(['admin', 'user', 'viewer']);
  const docs = await listDocuments();
  const canManage = me.role === 'admin' || me.role === 'user';
  const canDelete = me.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="bg-gradient-to-r from-slate-900 to-indigo-700 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          Dokumenty
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Úložiště podkladů souvisejících s JMHZ — sdělení ČSSZ (OIČ, VS), mzdové listy, smlouvy,
          protokoly z e-Podání. Soubory leží v persistentním volume vedle databáze.
        </p>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Soubor</th>
              <th className="px-3 py-2">Kategorie</th>
              <th className="px-3 py-2">Období</th>
              <th className="px-3 py-2">Velikost</th>
              <th className="px-3 py-2">Nahráno</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  Zatím žádné dokumenty. Nahrajte první níže.
                </td>
              </tr>
            )}
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{fileIcon(d.mimeType)}</span>
                    <div className="min-w-0">
                      <a
                        href={`/api/documents/${d.id}/download?inline=1`}
                        target="_blank"
                        className="font-medium text-indigo-700 hover:underline"
                      >
                        {d.filename}
                      </a>
                      {d.description && (
                        <div className="text-xs text-slate-500">{d.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      CATEGORY_COLOR[d.category] ?? CATEGORY_COLOR.jine
                    }`}
                  >
                    {CATEGORY_LABELS[d.category] ?? d.category}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {d.periodMonth && d.periodYear
                    ? `${monthLabel(d.periodMonth)} ${d.periodYear}`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{fmtSize(d.sizeBytes)}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {new Date(d.createdAt).toLocaleDateString('cs-CZ')}
                  {d.uploadedByEmail && (
                    <div className="text-[10px] text-slate-400">{d.uploadedByEmail}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <a
                      href={`/api/documents/${d.id}/download`}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                    >
                      Stáhnout
                    </a>
                    {canDelete && (
                      <form
                        action={async () => {
                          'use server';
                          await deleteDocumentAction(d.id);
                        }}
                      >
                        <ConfirmSubmitButton confirm={`Smazat dokument ${d.filename}?`}>
                          Smazat
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {canManage && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Nahrát dokument</h2>
          <UploadForm />
        </section>
      )}
    </div>
  );
}
