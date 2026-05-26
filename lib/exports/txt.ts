import type { PayrollExport } from './data';
import { monthLabel } from '@/lib/utils';

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function padLeft(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

export function payrollToTxt(data: PayrollExport): string {
  const header = [
    `${data.appConfig.svjName || '(SVJ)'} — Payroll ${monthLabel(data.month)} ${data.year}`,
    `IČO: ${data.appConfig.svjIco || '-'}`,
    `Stav: ${data.period.status}`,
    '',
    pad('Zaměstnanec', 32) +
      padLeft('Základ', 10) +
      padLeft('Bonus', 10) +
      padLeft('Hrubá', 12) +
      padLeft('Daň', 10) +
      padLeft('Čistá', 12),
    '-'.repeat(86),
  ];
  let sumGross = 0,
    sumTax = 0,
    sumNet = 0;
  for (const r of data.rows) {
    sumGross += Number(r.totalGross);
    sumTax += Number(r.taxAmount);
    sumNet += Number(r.netAmount);
    header.push(
      pad(`${r.lastName} ${r.firstName}`, 32) +
        padLeft(r.baseReward, 10) +
        padLeft(r.extraReward, 10) +
        padLeft(r.totalGross, 12) +
        padLeft(r.taxAmount, 10) +
        padLeft(r.netAmount, 12),
    );
  }
  header.push('-'.repeat(86));
  header.push(
    pad('CELKEM', 32) +
      padLeft('', 10) +
      padLeft('', 10) +
      padLeft(sumGross.toFixed(2), 12) +
      padLeft(sumTax.toFixed(2), 10) +
      padLeft(sumNet.toFixed(2), 12),
  );
  return header.join('\n') + '\n';
}
