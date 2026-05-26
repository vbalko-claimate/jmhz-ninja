import ExcelJS from 'exceljs';
import type { PayrollExport } from './data';
import { monthLabel } from '@/lib/utils';

export async function payrollToXlsxBuffer(data: PayrollExport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`${data.month}-${data.year}`);
  ws.columns = [
    { header: 'Příjmení', key: 'lastName', width: 16 },
    { header: 'Jméno', key: 'firstName', width: 14 },
    { header: 'RČ', key: 'personalId', width: 14 },
    { header: 'Účet', key: 'bankAccount', width: 18 },
    { header: 'Základ', key: 'baseReward', width: 12 },
    { header: 'Bonus', key: 'extraReward', width: 10 },
    { header: 'Hrubá', key: 'totalGross', width: 12 },
    { header: 'Daň', key: 'taxAmount', width: 10 },
    { header: 'Čistá', key: 'netAmount', width: 12 },
    { header: 'Prohlášení', key: 'taxDeclarationAtTime', width: 12 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of data.rows) {
    ws.addRow({
      ...r,
      taxDeclarationAtTime: r.taxDeclarationAtTime ? 'ano' : 'ne',
      baseReward: Number(r.baseReward),
      extraReward: Number(r.extraReward),
      totalGross: Number(r.totalGross),
      taxAmount: Number(r.taxAmount),
      netAmount: Number(r.netAmount),
    });
  }
  ws.addRow({});
  ws.addRow({
    lastName: `${data.appConfig.svjName || ''} — ${monthLabel(data.month)} ${data.year}`,
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
