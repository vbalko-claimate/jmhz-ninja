import { describe, it, expect } from 'vitest';
import { payrollToPdfBuffer } from '../lib/exports/pdf';
import type { PayrollExport } from '../lib/exports/data';

const sample: PayrollExport = {
  year: 2026,
  month: 5,
  appConfig: {
    svjName: 'Společenství vlastníků jednotek Formanská č.p. 533',
    svjIco: '01414747',
  } as unknown as PayrollExport['appConfig'],
  period: { id: 1, status: 'submitted' },
  rows: [
    {
      employeeId: 1,
      firstName: 'Světlana',
      lastName: 'Balková Sychrová',
      personalId: '000000/0000',
      bankAccount: '0/0000',
      csszOic: null,
      csszIdPpv: null,
      baseReward: '870.00',
      extraReward: '0.00',
      totalGross: '870.00',
      taxAmount: '130.00',
      netAmount: '740.00',
      taxDeclarationAtTime: false,
    },
    {
      employeeId: 2,
      firstName: 'Dana',
      lastName: 'Zdeňková',
      personalId: '000000/0000',
      bankAccount: '0/0000',
      csszOic: null,
      csszIdPpv: null,
      baseReward: '1242.00',
      extraReward: '0.00',
      totalGross: '1242.00',
      taxAmount: '186.00',
      netAmount: '1056.00',
      taxDeclarationAtTime: false,
    },
  ],
};

describe('payrollToPdfBuffer — Czech diacritics', () => {
  it('renders a valid PDF that embeds the DejaVu font (not the Latin-1 fallback)', async () => {
    const buf = await payrollToPdfBuffer(sample);
    const bytes = buf.toString('latin1');

    // Valid PDF container.
    expect(bytes.startsWith('%PDF')).toBe(true);
    // The Unicode font is embedded — proves Czech caron glyphs (Daň, Čistá,
    // Společenství, Světlana, Zdeňková) won't be dropped as with Helvetica.
    expect(bytes).toContain('DejaVuSans');
  });
});
