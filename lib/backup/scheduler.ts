import cron from 'node-cron';
import { runBackupNow } from './gdrive';

let started = false;

export function startBackupScheduler() {
  if (started) return;
  started = true;
  cron.schedule(
    '0 2 * * *',
    async () => {
      try {
        const r = await runBackupNow();
        console.log('[backup] nightly OK', r.uploaded);
      } catch (e) {
        console.error('[backup] nightly FAILED', e);
      }
    },
    { timezone: 'Europe/Prague' },
  );
  console.log('[backup] scheduler armed for 02:00 Europe/Prague');
}
