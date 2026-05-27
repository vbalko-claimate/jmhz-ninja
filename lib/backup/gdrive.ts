import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { db, rawDb } from '@/lib/db/client';
import { backupSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encryptFile } from './crypto';

const execFileAsync = promisify(execFile);
const TMP_DIR = path.join(process.cwd(), 'tmp');
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'svj.db');
const DOCS_DIR = process.env.DOCUMENTS_DIR ?? path.join(path.dirname(DB_PATH), 'documents');

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function getDriveClient() {
  const clientId = process.env.GDRIVE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'OAuth credentials missing — set GDRIVE_OAUTH_CLIENT_ID, GDRIVE_OAUTH_CLIENT_SECRET and GDRIVE_REFRESH_TOKEN.',
    );
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

async function snapshotDb(targetPath: string): Promise<void> {
  rawDb.exec(`VACUUM INTO '${targetPath.replace(/'/g, "''")}'`);
}

/** Vytvoří tar.gz složky documents. Vrátí null, pokud složka neexistuje nebo je prázdná. */
async function archiveDocuments(targetPath: string): Promise<string | null> {
  if (!fs.existsSync(DOCS_DIR)) return null;
  const files = fs.readdirSync(DOCS_DIR).filter((f) => !f.startsWith('.'));
  if (files.length === 0) return null;
  // -C <parent> documents → archiv obsahuje cestu "documents/<soubor>"
  await execFileAsync('tar', ['-czf', targetPath, '-C', path.dirname(DOCS_DIR), path.basename(DOCS_DIR)]);
  return targetPath;
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

  // Dokumenty → tar.gz (volitelně šifrované)
  const docsTarPath = path.join(TMP_DIR, `documents-${date}.tar.gz`);
  let docsUploadPath: string | null = null;
  let docsUploadName = `documents-${date}.tar.gz`;
  const createdTar = await archiveDocuments(docsTarPath).catch(() => null);
  if (createdTar) {
    if (encrypt) {
      const enc = `${docsTarPath}.enc`;
      await encryptFile(docsTarPath, enc, process.env.BACKUP_PASSPHRASE!);
      docsUploadPath = enc;
      docsUploadName = `documents-${date}.tar.gz.enc`;
    } else {
      docsUploadPath = docsTarPath;
    }
  }

  const uploaded: string[] = [];
  const cleanup: string[] = [snapshotPath, docsTarPath];
  if (uploadPath !== snapshotPath) cleanup.push(uploadPath);
  if (docsUploadPath && docsUploadPath !== docsTarPath) cleanup.push(docsUploadPath);

  try {
    const id = await uploadFile(uploadPath, uploadName, folderId);
    uploaded.push(`${uploadName} (${id})`);

    if (docsUploadPath) {
      const docId = await uploadFile(docsUploadPath, docsUploadName, folderId);
      uploaded.push(`${docsUploadName} (${docId})`);
    }

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
    for (const f of cleanup) {
      try {
        fs.unlinkSync(f);
      } catch {}
    }
  }

  return { uploaded, folderId };
}
