import { requireRole } from '@/lib/auth';
import { listDriveBackups, type DriveBackup } from '@/lib/backup/restore';
import Link from 'next/link';
import { restoreAction } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

function fmtSize(bytes: number | null): string {
  if (bytes == null) return '?';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtTime(iso: string): string {
  if (!iso) return '?';
  try {
    return new Date(iso).toLocaleString('cs-CZ');
  } catch {
    return iso;
  }
}

export default async function RestorePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; from?: string }>;
}) {
  await requireRole(['admin']);
  const sp = await searchParams;

  let backups: DriveBackup[] = [];
  let listError: string | null = null;
  try {
    backups = await listDriveBackups();
  } catch (e) {
    listError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Obnovení ze zálohy</h1>
        <Link
          href="/settings/backup"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← zpět na zálohy
        </Link>
      </div>

      <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
        <strong>⚠ Pozor — destruktivní operace.</strong>
        <ul className="mt-2 list-disc pl-5 text-xs">
          <li>Obnova <strong>úplně přepíše</strong> stávající databázi obsahem zvolené zálohy.</li>
          <li>Před přepsáním aplikace automaticky uloží snapshot současné DB jako{' '}
            <code>svj.db.pre-restore-&lt;timestamp&gt;</code> ve volume <code>/app/data/</code>.</li>
          <li>Po dokončení se kontejner sám restartuje (~10 sekund downtime). Po restartu se znovu spustí migrace nad obnovenou DB.</li>
          <li>Pokud je záloha šifrovaná (<code>.enc</code>), zadejte správné <code>BACKUP_PASSPHRASE</code>.</li>
        </ul>
      </div>

      {sp.ok && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          ✓ Obnova zahájena ze zálohy <strong>{sp.from}</strong>. Kontejner se nyní
          restartuje. Po obnovení znovu načtěte stránku.
        </div>
      )}

      {sp.error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          ✗ Obnova selhala: {sp.error}
        </div>
      )}

      {listError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nelze načíst seznam záloh z Google Drive: {listError}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-lg font-medium">Zálohy v Google Drive</h2>
          <p className="text-xs text-slate-500">
            Načteno z nakonfigurované Drive složky (<code>GDRIVE_FOLDER_ID</code>).
          </p>
        </div>

        {backups.length === 0 && !listError && (
          <div className="p-8 text-center text-sm text-slate-400">
            Žádné zálohy nejsou k dispozici. Spusťte jednu manuálně v{' '}
            <Link href="/settings/backup" className="underline">
              Settings &gt; Zálohy
            </Link>
            .
          </div>
        )}

        {backups.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {backups.map((b) => (
              <li key={b.id} className="p-4">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between text-sm">
                    <div>
                      <div className="font-mono font-medium">{b.name}</div>
                      <div className="text-xs text-slate-500">
                        {fmtTime(b.createdTime)} · {fmtSize(b.size)} ·{' '}
                        {b.isEncrypted ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                            šifrovaná
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                            plaintext
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">Klikněte pro obnovu →</span>
                  </summary>

                  <form action={restoreAction} className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    <input type="hidden" name="fileId" value={b.id} />
                    <input type="hidden" name="fileName" value={b.name} />

                    {b.isEncrypted && (
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">
                          BACKUP_PASSPHRASE
                        </span>
                        <input
                          type="password"
                          name="passphrase"
                          required
                          placeholder="heslo pro dešifrování"
                          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-1.5 font-mono text-sm focus:border-slate-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500">
                          Stejné heslo, které jste použil při vytvoření zálohy. App ho
                          nikam neukládá — používá ho jen jednorázově pro dešifrování.
                        </span>
                      </label>
                    )}

                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="confirm" required className="rounded" />
                      <span>
                        Rozumím, že tato akce <strong>nevratně přepíše</strong> současnou
                        databázi a kontejner se restartuje.
                      </span>
                    </label>

                    <ConfirmSubmitButton
                      confirm={`Obnovit DB ze zálohy ${b.name}? Kontejner se restartuje. Tato akce je nevratná.`}
                      variant="danger"
                      size="md"
                      pendingLabel="Obnovuji DB… (cca 10 s)"
                      className="bg-rose-700 text-white hover:bg-rose-800"
                    >
                      Obnovit z této zálohy
                    </ConfirmSubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
