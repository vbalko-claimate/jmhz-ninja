import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildJmhzZip } from '../lib/exports/zip';
import type { PayrollExport } from '../lib/exports/data';

function mockExport(): PayrollExport {
  return {
    year: 2026,
    month: 4,
    period: { id: 1, status: 'generated' },
    appConfig: {
      id: 1,
      svjName: 'Test SVJ',
      svjIco: '01414747',
      svjAddress: 'Pod Formankou 533/3, 149 00 Praha',
      taxOfficeAccount: '',
      csszVs: '4422074189',
      svjDatovaSchranka: '8dgwgw8',
      csszAccount: '21012-17925341/0710',
      osszCode: '442',
      osszName: 'Karlovy Vary',
      osszAddress: 'Krymská 2A',
      osszEmail: 'posta.kv@cssz.cz',
      osszDatovaSchranka: 'i2pac3f',
      workplaceObec: 'Praha',
      workplaceKodObce: '554782',
      workplaceKodStatu: 'CZ',
    },
    rows: [
      {
        employeeId: 1,
        firstName: 'Dana',
        lastName: 'Zdeňková',
        personalId: '725706/1691',
        bankAccount: '',
        csszOic: '1912989694',
        csszIdPpv: '4003134873918',
        baseReward: '2353.00',
        extraReward: '0',
        totalGross: '2353.00',
        taxAmount: '353',
        netAmount: '2000.00',
        taxDeclarationAtTime: false,
      },
    ],
  };
}

describe('buildJmhzZip — ePortál ČSSZ package', () => {
  it('produces a real ZIP container (PK signature)', () => {
    const buf = buildJmhzZip(mockExport());
    // Local file header magic number: PK\x03\x04
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });

  it('contains exactly one .xml entry holding the JMHZ podání', () => {
    const files = unzipSync(new Uint8Array(buildJmhzZip(mockExport())));
    const names = Object.keys(files);
    expect(names).toEqual(['JMHZ-2026-04.xml']);
    expect(strFromU8(files['JMHZ-2026-04.xml'])).toContain('<jmhz');
  });
});
