import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { backupSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

async function getBackupSettings() {
  const [row] = await db.select().from(backupSettings).where(eq(backupSettings.id, 1));
  if (row) return row;
  const [inserted] = await db.insert(backupSettings).values({ id: 1 }).returning();
  return inserted;
}

export default async function BackupSettingsPage() {
  await requireRole(['admin']);
  const s = await getBackupSettings();
  const passphraseConfigured = Boolean(process.env.BACKUP_PASSPHRASE);
  const gdriveConfigured = Boolean(process.env.GDRIVE_SA_KEY_JSON && process.env.GDRIVE_FOLDER_ID);

  async function save(formData: FormData) {
    'use server';
    await requireRole(['admin']);
    await db
      .update(backupSettings)
      .set({
        encryptionEnabled: formData.get('encryptionEnabled') === 'on',
        gdriveFolderId: String(formData.get('gdriveFolderId') ?? '').trim() || null,
      })
      .where(eq(backupSettings.id, 1));
    revalidatePath('/settings/backup');
  }

  async function runNow() {
    'use server';
    await requireRole(['admin']);
    const { runBackupNow } = await import('@/lib/backup/gdrive');
    await runBackupNow();
    revalidatePath('/settings/backup');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Zálohy do Google Drive</h1>
        <p className="text-sm text-slate-500">
          Noční snapshot SQLite DB v 02:00 (Europe/Prague). Šifrování AES-256-GCM (volitelné,
          klíč odvozen scrypt z <code>BACKUP_PASSPHRASE</code>).
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">Stav</h2>
        <ul className="space-y-1 text-sm">
          <li>
            Google Drive service account:{' '}
            <Badge ok={gdriveConfigured}>{gdriveConfigured ? 'nastaveno' : 'nenastaveno (ENV)'}</Badge>
          </li>
          <li>
            Šifrovací heslo:{' '}
            <Badge ok={passphraseConfigured}>
              {passphraseConfigured ? 'nastaveno' : 'nenastaveno (ENV)'}
            </Badge>
          </li>
          <li>
            Poslední záloha:{' '}
            <span className="font-mono text-xs">
              {s.lastBackupAt
                ? `${new Date(s.lastBackupAt).toLocaleString('cs-CZ')} — ${s.lastBackupStatus ?? '?'}`
                : '—'}
            </span>
          </li>
        </ul>
      </section>

      <form
        action={save}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-lg font-medium">Nastavení</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="encryptionEnabled"
            defaultChecked={s.encryptionEnabled}
            disabled={!passphraseConfigured}
            className="rounded"
          />
          Šifrovat zálohy (AES-256-GCM)
          {!passphraseConfigured && (
            <span className="text-xs text-rose-600">— vyžaduje BACKUP_PASSPHRASE v ENV</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-slate-600">Google Drive Folder ID</span>
          <input
            name="gdriveFolderId"
            defaultValue={s.gdriveFolderId ?? ''}
            placeholder="1AbC..."
            className="rounded-md border border-slate-300 px-3 py-1.5 font-mono text-sm focus:border-slate-500 focus:outline-none"
          />
          <span className="text-xs text-slate-500">
            ID složky ze sdílení se service account e-mailem. Lze přebít přes ENV{' '}
            <code>GDRIVE_FOLDER_ID</code>.
          </span>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Uložit
        </button>
      </form>

      <form
        action={runNow}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-3 text-lg font-medium">Manuální spuštění</h2>
        <p className="mb-3 text-sm text-slate-500">
          Spustí stejný proces jako noční cron — snapshot DB, volitelné šifrování, upload.
        </p>
        <button
          type="submit"
          disabled={!gdriveConfigured}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:bg-slate-300"
        >
          Spustit zálohu nyní
        </button>
      </form>
    </div>
  );
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${
        ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
    >
      {children}
    </span>
  );
}
