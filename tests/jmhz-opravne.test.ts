import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildJmhzXml, parseJmhzGuids } from '../lib/exports/xml-jmhz';
import { buildJmhzZip } from '../lib/exports/zip';
import type { PayrollExport } from '../lib/exports/data';

function mockExport(): PayrollExport {
  return {
    year: 2026,
    month: 4,
    period: { id: 1, status: 'submitted' },
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
      {
        employeeId: 2,
        firstName: 'Petr',
        lastName: 'Novák',
        personalId: '800101/1234',
        bankAccount: '',
        csszOic: '1000000001',
        csszIdPpv: '4000000000001',
        baseReward: '1000.00',
        extraReward: '0',
        totalGross: '1000.00',
        taxAmount: '150',
        netAmount: '850.00',
        taxDeclarationAtTime: false,
      },
    ],
  };
}

describe('parseJmhzGuids + opravné round-trip', () => {
  it('extracts idPodani and per-employee idFormulare from a řádné XML', () => {
    const xml = buildJmhzXml(mockExport());
    const { idPodani, formGuids } = parseJmhzGuids(xml);

    expect(idPodani).toMatch(/[0-9a-fA-F-]{36}/);
    expect(formGuids['1912989694|4003134873918']).toMatch(/[0-9a-fA-F-]{36}/);
    expect(formGuids['1000000001|4000000000001']).toMatch(/[0-9a-fA-F-]{36}/);
    expect(Object.keys(formGuids)).toHaveLength(2);
  });

  it('reuses the original GUIDs and marks the submission as opravné (O)', () => {
    const original = buildJmhzXml(mockExport());
    const correction = parseJmhzGuids(original);

    const opravne = buildJmhzXml(mockExport(), correction);
    const reparsed = parseJmhzGuids(opravne);

    // idPodani + every idFormulare are preserved, not regenerated
    expect(reparsed.idPodani).toBe(correction.idPodani);
    expect(reparsed.formGuids).toEqual(correction.formGuids);

    // typPodani / typFormulare flipped to O
    expect(opravne).toContain('<typPodani>O</typPodani>');
    expect(opravne).toContain('<typFormulare>O</typFormulare>');
    expect(opravne).not.toContain('<typPodani>R</typPodani>');
  });

  it('řádné build is unchanged (no correction ⇒ R + fresh GUID)', () => {
    const a = parseJmhzGuids(buildJmhzXml(mockExport()));
    const b = parseJmhzGuids(buildJmhzXml(mockExport()));
    // fresh random GUIDs each build when there is no correction
    expect(a.idPodani).not.toBe(b.idPodani);
    expect(buildJmhzXml(mockExport())).toContain('<typPodani>R</typPodani>');
  });

  it('treats an employee absent from the original as a new řádný formulář (R)', () => {
    const original = buildJmhzXml(mockExport());
    const correction = parseJmhzGuids(original);

    // Drop one employee from the correction map → simulates a person added later
    delete correction.formGuids['1000000001|4000000000001'];

    const opravne = buildJmhzXml(mockExport(), correction);
    // opravné podání overall, but the new person's form is R (doplnění)
    expect(opravne).toContain('<typPodani>O</typPodani>');
    expect(opravne).toContain('<typFormulare>O</typFormulare>');
    expect(opravne).toContain('<typFormulare>R</typFormulare>');
  });

  it('rejects XML without idPodani', () => {
    expect(() => parseJmhzGuids('<?xml version="1.0"?><foo><bar>x</bar></foo>')).toThrow(
      /idPodani/,
    );
  });

  it('buildJmhzZip with a correction packages an opravné XML (the route path)', () => {
    const correction = parseJmhzGuids(buildJmhzXml(mockExport()));
    const files = unzipSync(new Uint8Array(buildJmhzZip(mockExport(), correction)));
    const names = Object.keys(files);

    expect(names).toEqual(['JMHZ-2026-04-opravne.xml']);
    const xml = strFromU8(files['JMHZ-2026-04-opravne.xml']);
    expect(xml).toContain('<typPodani>O</typPodani>');
    expect(parseJmhzGuids(xml).idPodani).toBe(correction.idPodani);
  });
});
