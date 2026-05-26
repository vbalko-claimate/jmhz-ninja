import fs from 'node:fs';
import path from 'node:path';
import { ensureSubfolder, uploadFile } from '@/lib/backup/gdrive';
import { loadPayrollForExport } from './data';
import { payrollToCsv } from './csv';
import { payrollToTxt } from './txt';
import { payrollToPdfBuffer } from './pdf';
import { payrollToXlsxBuffer } from './xlsx';
import { buildJmhzXml } from './xml-jmhz';

const TMP_DIR = path.join(process.cwd(), 'tmp', 'archive');

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

async function getRootFolderId(): Promise<string> {
  if (process.env.GDRIVE_FOLDER_ID) return process.env.GDRIVE_FOLDER_ID;
  const { db } = await import('@/lib/db/client');
  const { backupSettings } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const [row] = await db.select().from(backupSettings).where(eq(backupSettings.id, 1));
  if (!row?.gdriveFolderId) throw new Error('Google Drive folder not configured.');
  return row.gdriveFolderId;
}

export async function archivePeriodToDrive(
  year: number,
  month: number,
): Promise<{ folderId: string; uploaded: string[] }> {
  const data = await loadPayrollForExport(year, month);
  if (!data) throw new Error('Period not found.');

  ensureTmp();
  const rootId = await getRootFolderId();
  const yearFolderId = await ensureSubfolder(`archive`, rootId);
  const yyFolderId = await ensureSubfolder(String(year), yearFolderId);
  const mmName = `${String(month).padStart(2, '0')}-submitted`;
  const periodFolderId = await ensureSubfolder(mmName, yyFolderId);

  const stem = `payroll-${year}-${String(month).padStart(2, '0')}`;
  const uploaded: string[] = [];

  // CSV
  const csvPath = path.join(TMP_DIR, `${stem}.csv`);
  fs.writeFileSync(csvPath, payrollToCsv(data));
  uploaded.push(`${stem}.csv`);
  await uploadFile(csvPath, `${stem}.csv`, periodFolderId, 'text/csv');

  // TXT
  const txtPath = path.join(TMP_DIR, `${stem}.txt`);
  fs.writeFileSync(txtPath, payrollToTxt(data));
  uploaded.push(`${stem}.txt`);
  await uploadFile(txtPath, `${stem}.txt`, periodFolderId, 'text/plain');

  // PDF
  const pdfPath = path.join(TMP_DIR, `${stem}.pdf`);
  fs.writeFileSync(pdfPath, await payrollToPdfBuffer(data));
  uploaded.push(`${stem}.pdf`);
  await uploadFile(pdfPath, `${stem}.pdf`, periodFolderId, 'application/pdf');

  // XLSX
  const xlsxPath = path.join(TMP_DIR, `${stem}.xlsx`);
  fs.writeFileSync(xlsxPath, await payrollToXlsxBuffer(data));
  uploaded.push(`${stem}.xlsx`);
  await uploadFile(
    xlsxPath,
    `${stem}.xlsx`,
    periodFolderId,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );

  // XML JMHZ
  const xmlPath = path.join(TMP_DIR, `${stem}-JMHZ.xml`);
  fs.writeFileSync(xmlPath, buildJmhzXml(data));
  uploaded.push(`${stem}-JMHZ.xml`);
  await uploadFile(xmlPath, `${stem}-JMHZ.xml`, periodFolderId, 'application/xml');

  // JSON snapshot
  const jsonPath = path.join(TMP_DIR, `${stem}-snapshot.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  uploaded.push(`${stem}-snapshot.json`);
  await uploadFile(jsonPath, `${stem}-snapshot.json`, periodFolderId, 'application/json');

  // Cleanup tmp
  for (const f of [csvPath, txtPath, pdfPath, xlsxPath, xmlPath, jsonPath]) {
    try {
      fs.unlinkSync(f);
    } catch {}
  }

  return { folderId: periodFolderId, uploaded };
}
