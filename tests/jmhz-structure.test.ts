import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildJmhzXml } from '../lib/exports/xml-jmhz';
import type { PayrollExport } from '../lib/exports/data';

// Golden reference — anonymized copy of a real accountant submission that
// ČSSZ accepted. All ikMpsv/idPpv/VS/emails/GUIDs replaced with fakes; the
// element structure is byte-for-byte identical to the accountant's XML.
const GOLDEN_PATH = path.join(__dirname, 'fixtures', 'jmhz-accountant.golden.xml');

function tagsUnderPrefix(xml: string, prefix: string): string[] {
  const re = new RegExp(`<${prefix}:([a-zA-Z]+)`, 'g');
  const set = new Set<string>();
  for (const m of xml.matchAll(re)) set.add(m[1]);
  return [...set].sort();
}

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
      csszVs: '1234567890',
      svjDatovaSchranka: '',
      csszAccount: '',
      osszCode: '',
      osszName: '',
      osszAddress: '',
      osszEmail: 'anon@example.org',
      osszDatovaSchranka: '',
      workplaceObec: 'Praha',
      workplaceKodObce: '554782',
      workplaceKodStatu: 'CZ',
    },
    rows: [
      {
        employeeId: 1,
        firstName: 'Test',
        lastName: 'Person',
        personalId: '999999/9999',
        bankAccount: '',
        csszOic: '9990000001',
        csszIdPpv: '9990000000001',
        baseReward: '1242.00',
        extraReward: '0',
        totalGross: '1242.00',
        taxAmount: '186',
        netAmount: '1056.00',
        taxDeclarationAtTime: false,
      },
    ],
  };
}

describe('buildJmhzXml — parity with accountant reference', () => {
  const golden = fs.readFileSync(GOLDEN_PATH, 'utf8');
  const generated = buildJmhzXml(mockExport());

  it('produces the same set of <form:*> element names as the accountant XML', () => {
    const goldenTags = tagsUnderPrefix(golden, 'form');
    const ourTags = tagsUnderPrefix(generated, 'form');
    const missing = goldenTags.filter((t) => !ourTags.includes(t));
    expect(missing, `Chybí tagy vs. reference: ${missing.join(', ')}`).toEqual([]);
  });

  it('produces the same set of <pvpoj:*> element names', () => {
    const g = tagsUnderPrefix(golden, 'pvpoj');
    const ours = tagsUnderPrefix(generated, 'pvpoj');
    expect(ours).toEqual(g);
  });

  it('produces the same set of <so:*> element names', () => {
    const g = tagsUnderPrefix(golden, 'so');
    const ours = tagsUnderPrefix(generated, 'so');
    expect(ours).toEqual(g);
  });

  it('emits VENDOR + hlavička with UTC "Z" datumVyplneni', () => {
    expect(generated).toMatch(/<VENDOR[^>]+productName="JMHZ Ninja"/);
    expect(generated).toMatch(/<datumVyplneni>[^<]+Z<\/datumVyplneni>/);
  });

  it('stanovenaTydenniDoba is 99 (ČOM sentinel, matches accountant)', () => {
    expect(generated).toMatch(/<form:stanovenaTydenniDoba>99<\/form:stanovenaTydenniDoba>/);
  });

  it('prijemNepojistenaCinnost carries the gross amount', () => {
    expect(generated).toMatch(/<form:prijemNepojistenaCinnost>1242<\/form:prijemNepojistenaCinnost>/);
  });

  it('booleans use 1/0 not true/false', () => {
    expect(generated).toContain('<primarniPpv>1</primarniPpv>');
    expect(generated).toContain('<form:prohlaseniPoplatnika>0</form:prohlaseniPoplatnika>');
    expect(generated).toContain('<form:uplatnujiPrispevekApz>0</form:uplatnujiPrispevekApz>');
    expect(generated).not.toContain('>true<');
    expect(generated).not.toContain('>false<');
  });
});
