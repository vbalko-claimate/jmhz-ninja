import { create } from 'xmlbuilder2';
import type { PayrollExport } from './data';

/**
 * JMHZ (Jednotné měsíční hlášení o zaměstnancích) XML builder.
 *
 * Cílový formát: XSD 1.4.3.4 (platný od 1. 4. 2026) — viz README a scripts/fetch-jmhz.sh.
 *
 * POZNÁMKA: Tato implementace odpovídá obecné struktuře JMHZ podle datového slovníku
 * 1.4.1.5. Před produkčním nasazením je nutné validovat proti aktuálnímu XSD
 * (`pnpm fetch-jmhz` stáhne XSD + ukázky do vendor/jmhz/).
 *
 * Klíčová mapování:
 * - employer (zaměstnavatel) ← appConfig.svjIco, svjName, svjAddress
 * - employee.OIC ← employees.csszOic (identifikátor občana ČSSZ)
 * - employee.ID_PPV ← employees.csszIdPpv (identifikátor pracovněprávního vztahu)
 * - vyměřovací základ ← totalGross (i když u DPP/odměn orgánů obvykle 0 do limitu)
 */
export function buildJmhzXml(data: PayrollExport): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' });
  const root = doc.ele('JMHZ_PODANI', {
    'xsi:schemaLocation': 'http://schemas.cssz.cz/JMHZ JMHZ_podani.xsd',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    verze: '1.4.3.4',
  });

  // Hlavička
  const hlavicka = root.ele('Hlavicka');
  hlavicka.ele('Mesic').txt(String(data.month)).up();
  hlavicka.ele('Rok').txt(String(data.year)).up();
  hlavicka.ele('TypPodani').txt('R').up(); // R = řádné
  hlavicka.up();

  // Zaměstnavatel
  const zam = root.ele('Zamestnavatel');
  zam.ele('ICO').txt(data.appConfig.svjIco).up();
  zam.ele('Nazev').txt(data.appConfig.svjName).up();
  zam.ele('Adresa').txt(data.appConfig.svjAddress).up();
  if (data.appConfig.csszVs) zam.ele('VS_CSSZ').txt(data.appConfig.csszVs).up();
  zam.up();

  // Zaměstnanci
  const seznam = root.ele('Zamestnanci');
  for (const r of data.rows) {
    const z = seznam.ele('Zamestnanec');
    if (r.csszOic) z.ele('OIC').txt(r.csszOic).up();
    if (r.csszIdPpv) z.ele('ID_PPV').txt(r.csszIdPpv).up();
    z.ele('Prijmeni').txt(r.lastName).up();
    z.ele('Jmeno').txt(r.firstName).up();
    z.ele('RodneCislo').txt(r.personalId.replace(/\D/g, '')).up();

    const odm = z.ele('Odmena');
    odm.ele('HrubaOdmena').txt(r.totalGross).up();
    odm.ele('Dan').txt(r.taxAmount).up();
    odm.ele('Cista').txt(r.netAmount).up();
    odm.ele('ProhlaseniDan').txt(r.taxDeclarationAtTime ? 'A' : 'N').up();
    odm.up();
    z.up();
  }
  seznam.up();

  return doc.end({ prettyPrint: true });
}

export function validateEmployeeForJmhz(employee: {
  csszOic: string | null;
  csszIdPpv: string | null;
  personalId: string;
}): string[] {
  const errs: string[] = [];
  if (!employee.csszOic) errs.push('chybí OIC (ČSSZ identifikátor občana)');
  if (!employee.csszIdPpv) errs.push('chybí ID PPV (identifikátor PPV)');
  if (!employee.personalId) errs.push('chybí rodné číslo');
  return errs;
}
