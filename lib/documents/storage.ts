import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'svj.db');
const DOCS_DIR = process.env.DOCUMENTS_DIR ?? path.join(path.dirname(DB_PATH), 'documents');

export const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.ms-excel',
  'application/msword',
  'application/xml',
  'text/xml',
  'text/plain',
  'text/csv',
]);

function ensureDir() {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
}

export function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

export async function saveBuffer(filename: string, buf: Buffer): Promise<string> {
  ensureDir();
  const storedName = `${randomUUID()}${safeExt(filename)}`;
  await fs.promises.writeFile(path.join(DOCS_DIR, storedName), buf);
  return storedName;
}

export function getStoredPath(storedName: string): string {
  // Guard against path traversal — storedName must be a bare filename.
  const base = path.basename(storedName);
  return path.join(DOCS_DIR, base);
}

export async function readStored(storedName: string): Promise<Buffer> {
  return fs.promises.readFile(getStoredPath(storedName));
}

export async function deleteStored(storedName: string): Promise<void> {
  try {
    await fs.promises.unlink(getStoredPath(storedName));
  } catch {
    // already gone — fine
  }
}

export function storedExists(storedName: string): boolean {
  return fs.existsSync(getStoredPath(storedName));
}
