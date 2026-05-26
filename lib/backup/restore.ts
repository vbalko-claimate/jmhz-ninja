import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { decryptFile } from './crypto';
import { rawDb } from '@/lib/db/client';
import { db } from '@/lib/db/client';
import { backupSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const TMP_DIR = path.join(process.cwd(), 'tmp', 'restore');

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function getDriveClient() {
  const clientId = process.env.GDRIVE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('OAuth credentials missing');
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2 });
}

async function getFolderId(): Promise<string> {
  if (process.env.GDRIVE_FOLDER_ID) return process.env.GDRIVE_FOLDER_ID;
  const [row] = await db.select().from(backupSettings).where(eq(backupSettings.id, 1));
  if (!row?.gdriveFolderId) throw new Error('Google Drive folder not configured.');
  return row.gdriveFolderId;
}

export type DriveBackup = {
  id: string;
  name: string;
  size: number | null;
  createdTime: string;
  isEncrypted: boolean;
};

export async function listDriveBackups(): Promise<DriveBackup[]> {
  const drive = getDriveClient();
  const folderId = await getFolderId();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false and (name contains '.db' or name contains '.db.enc')`,
    orderBy: 'createdTime desc',
    pageSize: 50,
    fields: 'files(id,name,size,createdTime)',
  });
  return (res.data.files ?? [])
    .filter((f) => f.id && f.name)
    .map((f) => ({
      id: f.id!,
      name: f.name!,
      size: f.size ? Number(f.size) : null,
      createdTime: f.createdTime ?? '',
      isEncrypted: f.name!.endsWith('.enc'),
    }));
}

async function downloadFromDrive(fileId: string, dstPath: string): Promise<void> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  );
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(dstPath);
    res.data
      .on('error', reject)
      .pipe(stream)
      .on('finish', () => resolve())
      .on('error', reject);
  });
}

const SQLITE_MAGIC = 'SQLite format 3';

/**
 * Downloads a backup from Drive, decrypts if needed, swaps the live DB and
 * exits the process so Coolify restarts the container with the restored DB.
 *
 * Returns the file paths used so callers (UI) can show a summary BEFORE the
 * process actually exits.
 */
export async function restoreFromDrive(
  fileId: string,
  passphrase: string | null,
): Promise<{ safetySnapshot: string; restoredFrom: string; restoredBytes: number }> {
  ensureTmp();

  const drive = getDriveClient();
  const meta = await drive.files.get({ fileId, fields: 'name,size' });
  const fileName = meta.data.name ?? 'backup.db';
  const downloadPath = path.join(TMP_DIR, fileName);

  console.log(`[restore] downloading ${fileName} from Drive…`);
  await downloadFromDrive(fileId, downloadPath);

  const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'svj.db');

  // 1) Safety snapshot of the CURRENT DB before we touch anything.
  const safetyPath = `${DB_PATH}.pre-restore-${Date.now()}`;
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, safetyPath);
    console.log(`[restore] safety snapshot saved to ${safetyPath}`);
  }

  // 2) Decrypt if encrypted.
  let restoreSource = downloadPath;
  if (fileName.endsWith('.enc')) {
    if (!passphrase) throw new Error('Záloha je šifrovaná, ale heslo nebylo zadáno.');
    const decryptedPath = downloadPath.replace(/\.enc$/, '');
    await decryptFile(downloadPath, decryptedPath, passphrase);
    restoreSource = decryptedPath;
  }

  // 3) Validate magic header.
  const fd = fs.openSync(restoreSource, 'r');
  const header = Buffer.alloc(16);
  fs.readSync(fd, header, 0, 16, 0);
  fs.closeSync(fd);
  if (!header.toString('utf8').startsWith(SQLITE_MAGIC)) {
    throw new Error(
      'Soubor není validní SQLite databáze (špatné heslo nebo poškozená záloha).',
    );
  }

  const restoredBytes = fs.statSync(restoreSource).size;

  // 4) Close current DB so we don't hold a file handle.
  try {
    rawDb.close();
  } catch {
    // best effort; if already closed, ignore
  }

  // 5) Wipe WAL / SHM so SQLite reopens cleanly from the restored snapshot.
  for (const ext of ['-wal', '-shm', '-journal']) {
    try {
      fs.unlinkSync(DB_PATH + ext);
    } catch {}
  }

  // 6) Swap.
  fs.copyFileSync(restoreSource, DB_PATH);
  console.log(`[restore] DB swapped (${restoredBytes} bytes).`);

  // 7) Schedule process exit so Coolify restarts the container with fresh DB.
  setTimeout(() => {
    console.log('[restore] exiting process to trigger container restart…');
    process.exit(0);
  }, 1500);

  return { safetySnapshot: safetyPath, restoredFrom: fileName, restoredBytes };
}
