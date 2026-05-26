import type { PayrollExport } from './data';

function csvEscape(s: string): string {
  if (s.includes('"') || s.includes(';') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function payrollToCsv(data: PayrollExport): string {
  const head = [
    'Příjmení',
    'Jméno',
    'RČ',
    'Účet',
    'Základní odměna',
    'Bonus',
    'Hrubá celkem',
    'Daň',
    'Čistá',
    'Prohlášení',
  ];
  const lines = [head.join(';')];
  for (const r of data.rows) {
    lines.push(
      [
        r.lastName,
        r.firstName,
        r.personalId,
        r.bankAccount,
        r.baseReward,
        r.extraReward,
        r.totalGross,
        r.taxAmount,
        r.netAmount,
        r.taxDeclarationAtTime ? 'ano' : 'ne',
      ]
        .map((v) => csvEscape(String(v)))
        .join(';'),
    );
  }
  // BOM for Excel UTF-8 detection
  return '﻿' + lines.join('\r\n') + '\r\n';
}
