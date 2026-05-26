import { describe, it, expect } from 'vitest';
import { buildJmhzXml, validateEmployeeForJmhz } from '../lib/exports/xml-jmhz';
import { validateJmhzXml } from '../lib/exports/jmhz-validator';
import type { PayrollExport } from '../lib/exports/data';

function mockExport(overrides?: Partial<PayrollExport>): PayrollExport {
  const base: PayrollExport = {
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
  return { ...base, ...overrides };
}

describe('buildJmhzXml — structure', () => {
  it('produces a <jmhz> root with correct namespace', () => {
    const xml = buildJmhzXml(mockExport());
    expect(xml).toMatch(/<jmhz[^>]*xmlns="http:\/\/schemas\.cssz\.cz\/JMHZ\/podani\/1\.0"/);
    expect(xml).toContain('verze="1.4.3.4"');
  });

  it('includes hlavicka, souhrn, PVPOJ and formulareOsob', () => {
    const xml = buildJmhzXml(mockExport());
    expect(xml).toContain('<hlavicka>');
    expect(xml).toContain('<so:souhrn>');
    expect(xml).toContain('<pvpoj:PVPOJ>');
    expect(xml).toContain('<formulareOsob>');
    expect(xml).toContain('<form:cinnostKS>');
  });

  it('uses zvlastniSazbaDane for withholding tax, not zalohaNaDan', () => {
    const xml = buildJmhzXml(mockExport());
    expect(xml).toContain('<form:zvlastniSazbaDane>');
    expect(xml).not.toContain('<form:zalohaNaDan>');
  });

  it('writes ELDP with only pocetDnu=0 for sub-limit ZMR', () => {
    const xml = buildJmhzXml(mockExport());
    expect(xml).toMatch(/<form:eldp>\s*<form:pocetDnu>0<\/form:pocetDnu>\s*<\/form:eldp>/);
  });
});

describe('validateEmployeeForJmhz', () => {
  it('flags missing OIC + ID PPV + RČ', () => {
    expect(
      validateEmployeeForJmhz({ csszOic: null, csszIdPpv: null, personalId: '' }),
    ).toHaveLength(3);
  });

  it('passes when all three are present', () => {
    expect(
      validateEmployeeForJmhz({
        csszOic: '1912989694',
        csszIdPpv: '4003134873918',
        personalId: '725706/1691',
      }),
    ).toEqual([]);
  });
});

describe('end-to-end validation against ČSSZ test endpoint', () => {
  it(
    'produces XML that the ČSSZ test validator accepts',
    async () => {
      const xml = buildJmhzXml(mockExport());
      const result = await validateJmhzXml(xml, { env: 'test' });
      if (!result.ok) {
        // Print errors for easy debugging when this test fails
        console.error('Validator errors:', JSON.stringify(result.errors, null, 2));
      }
      expect(result.ok).toBe(true);
    },
    30_000,
  );
});
