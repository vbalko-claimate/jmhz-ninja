'use server';

import { requireRole } from '@/lib/auth';
import { restoreFromDrive } from '@/lib/backup/restore';
import { redirect } from 'next/navigation';

export async function restoreAction(formData: FormData) {
  await requireRole(['admin']);

  const fileId = String(formData.get('fileId') ?? '').trim();
  const fileName = String(formData.get('fileName') ?? '').trim();
  const passphrase = String(formData.get('passphrase') ?? '').trim() || null;
  const confirm = formData.get('confirm') === 'on';

  if (!confirm) {
    redirect(
      `/settings/backup/restore?error=${encodeURIComponent('Musíte potvrdit, že rozumíte následkům.')}`,
    );
  }
  if (!fileId) {
    redirect(`/settings/backup/restore?error=${encodeURIComponent('Chybí fileId zálohy.')}`);
  }

  try {
    // restoreFromDrive schedules process.exit(0) after ~1.5s — we want to
    // redirect the user before that so they see the success message.
    await restoreFromDrive(fileId, passphrase);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    redirect(`/settings/backup/restore?error=${encodeURIComponent(msg)}`);
  }

  redirect(`/settings/backup/restore?ok=1&from=${encodeURIComponent(fileName)}`);
}
