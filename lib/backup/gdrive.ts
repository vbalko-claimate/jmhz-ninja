import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { db, rawDb } from '@/lib/db/client';
import { backupSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encryptFile } from './crypto';

const TMP_DIR = path.join(process.cwd(), 'tmp');

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function getDriveClient() {
  const raw = process.env.GDRIVE_SA_KEY_JSON;
  if (!raw) throw new Error('GDRIVE_SA_KEY_JSON not set');
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

async function getFolderId(): Promise<string> {
  if (process.env.GDRIVE_FOLDER_ID) return process.env.GDRIVE_FOLDER_ID;
  const [row] = await db.select().from(backupSettings).where(eq(backupSettings.id, 1));
  if (!row?.gdriveFolderId) throw new Error('Google Drive folder not configured.');
  return row.gdriveFolderId;
}

async function snapshotDb(targetPath: string): Promise<void> {
  rawDb.exec(`VACUUM INTO '${targetPath.replace(/'/g, "''")}'`);
}

export async function uploadFile(
  localPath: string,
  remoteName: string,
  parentFolderId: string,
  mimeType = 'application/octet-stream',
): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: remoteName, parents: [parentFolderId] },
    media: { mimeType, body: fs.createReadStream(localPath) },
    fields: 'id',
  });
  if (!res.data.id) throw new Error('Drive upload returned no id.');
  return res.data.id;
}

export async function ensureSubfolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient();
  const escaped = name.replace(/'/g, "\\'");
  const list = await drive.files.list({
    q: `name='${escaped}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1,
  });
  if (list.data.files && list.data.files.length > 0 && list.data.files[0].id) {
    return list.data.files[0].id;
  }
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  if (!res.data.id) throw new Error('Failed to create Drive folder.');
  return res.data.id;
}

export async function runBackupNow(): Promise<{ uploaded: string[]; folderId: string }> {
  ensureTmp();
  const folderId = await getFolderId();

  const [settings] = await db.select().from(backupSettings).where(eq(backupSettings.id, 1));
  const encrypt =
    Boolean(settings?.encryptionEnabled) && Boolean(process.env.BACKUP_PASSPHRASE);

  const date = new Date().toISOString().slice(0, 10);
  const snapshotPath = path.join(TMP_DIR, `svj-${date}.db`);
  await snapshotDb(snapshotPath);

  let uploadPath = snapshotPath;
  let uploadName = `svj-${date}.db`;
  if (encrypt) {
    const encPath = `${snapshotPath}.enc`;
    await encryptFile(snapshotPath, encPath, process.env.BACKUP_PASSPHRASE!);
    uploadPath = encPath;
    uploadName = `svj-${date}.db.enc`;
  }

  const uploaded: string[] = [];
  try {
    const id = await uploadFile(uploadPath, uploadName, folderId);
    uploaded.push(`${uploadName} (${id})`);
    await db
      .update(backupSettings)
      .set({ lastBackupAt: new Date(), lastBackupStatus: 'OK' })
      .where(eq(backupSettings.id, 1));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(backupSettings)
      .set({ lastBackupAt: new Date(), lastBackupStatus: `ERR: ${msg}` })
      .where(eq(backupSettings.id, 1));
    throw e;
  } finally {
    try {
      fs.unlinkSync(snapshotPath);
    } catch {}
    if (uploadPath !== snapshotPath) {
      try {
        fs.unlinkSync(uploadPath);
      } catch {}
    }
  }

  return { uploaded, folderId };
}
