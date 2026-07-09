import { create } from 'xmlbuilder2';
import { randomUUID } from 'node:crypto';
import type { PayrollExport } from './data';

/**
 * JMHZ podání builder dle XSD 1.4.3.4 (formCinnostKS pro pod-limitní odměny
 * členů kolektivních orgánů SVJ, Q kategorie).
 *
 * Struktura vychází z referenčního XML, které předchozí účetní úspěšně
 * podávala přes Money S3 — účetní XML prochází ČSSZ test validátorem OK.
 *
 * Struktura:
 *   <jmhz>
 *     <VENDOR> <SENDER>       … informativní hlavička
 *     <hlavicka>               … idPodani, typPodani=R, VS, měsíc, rok, …
 *     <so:souhrn>              … daňové údaje za měsíc (vše 0 pro srážkovou daň)
 *     <pvpoj:PVPOJ>            … přehled o výši pojistného (vše 0 pro pod-limit)
 *     <formulareOsob>
 *       <formularOsoby>        … N× (jeden per zaměstnanec)
 *         <hlavicka>           … idFormulare, typFormulare=R, primarniPpv=1
 *         <form:cinnostKS>     … identifikace + souhrnDataZec + pojisteni +
 *                                 vykonavanaPozice + prijem
 */
export const VENDOR_NAME = 'JMHZ Ninja';
export const VENDOR_VERSION = '0.2.0';

export function buildJmhzXml(data: PayrollExport): string {
  const period = { year: data.year, month: data.month };
  const { start, end } = buildPeriodDates(period.year, period.month);

  const doc = create({ version: '1.0', encoding: 'UTF-8' });
  const jmhz = doc.ele('jmhz', {
    xmlns: 'http://schemas.cssz.cz/JMHZ/podani/1.0',
    'xmlns:form': 'http://schemas.cssz.cz/JMHZ/form/1.0',
    'xmlns:so': 'http://schemas.cssz.cz/JMHZ/souhrn/1.0',
    'xmlns:pvpoj': 'http://schemas.cssz.cz/JMHZ/PVPOJ/1.0',
    verze: '1.4.3.4',
  });

  // VENDOR / SENDER — informativní, ale u produkčních XML běžné
  jmhz.ele('VENDOR', { productName: VENDOR_NAME, productVersion: VENDOR_VERSION }).up();
  const notifyEmail = data.appConfig.osszEmail || '';
  if (notifyEmail) {
    jmhz.ele('SENDER', { EmailNotifikace: notifyEmail }).up();
  }

  // ---------- Hlavička podání ----------
  const h = jmhz.ele('hlavicka');
  h.ele('idPodani').txt(randomUUID()).up();
  h.ele('typPodani').txt('R').up();
  h.ele('variabilniSymbol').txt(data.appConfig.csszVs || '').up();
  h.ele('mesic').txt(String(period.month)).up();
  h.ele('rok').txt(String(period.year)).up();
  h.ele('datumVyplneni').txt(nowIsoZ()).up();
  h.ele('balikPoradi').txt('1').up();
  h.ele('balikyPocet').txt('1').up();
  // souhrn + PVPOJ + N formulářů
  h.ele('formularePocetVBaliku').txt(String(data.rows.length + 2)).up();
  h.ele('formularePocetCelkem').txt(String(data.rows.length + 2)).up();
  h.up();

  // ---------- Souhrnná vrstva ----------
  const souhrn = jmhz.ele('so:souhrn');
  const danMesic = souhrn.ele('so:danUdajeMesic');
  danMesic.ele('so:danZalohaPoSleve').txt('0').up();
  danMesic.up();
  souhrn.up();

  // ---------- PVPOJ vrstva (vše 0 pro pod-limit) ----------
  const pvpoj = jmhz.ele('pvpoj:PVPOJ');
  const pojistneEl = pvpoj.ele('pvpoj:pojistne');
  pojistneEl.ele('pvpoj:zakladZamestnavateleA').txt('0').up();
  pojistneEl.ele('pvpoj:pojistneZamestnavateleA').txt('0').up();
  pojistneEl.ele('pvpoj:zakladZamestnavateleB').txt('0').up();
  pojistneEl.ele('pvpoj:pojistneZamestnavateleB').txt('0').up();
  pojistneEl.ele('pvpoj:zakladZamestnavateleC').txt('0').up();
  pojistneEl.ele('pvpoj:pojistneZamestnavateleC').txt('0').up();
  pojistneEl.ele('pvpoj:pojistneZamestnavateleCelkem').txt('0').up();
  pojistneEl.ele('pvpoj:pojistneZamestnance').txt('0').up();
  pojistneEl.ele('pvpoj:pojistneCelkem').txt('0').up();
  pojistneEl.up();
  pvpoj.ele('pvpoj:pojistneUhrada').txt('0').up();
  pvpoj.up();

  // ---------- Formuláře osob ----------
  const formulareOsob = jmhz.ele('formulareOsob');
  for (const r of data.rows) {
    const grossInt = intCZK(r.totalGross);
    const taxInt = intCZK(r.taxAmount);
    const formularOsoby = formulareOsob.ele('formularOsoby');

    const fh = formularOsoby.ele('hlavicka');
    fh.ele('idFormulare').txt(randomUUID()).up();
    fh.ele('typFormulare').txt('R').up();
    // Účetní XML používá 1/0 pro xs:boolean, sjednocujeme.
    fh.ele('primarniPpv').txt('1').up();
    fh.up();

    const c = formularOsoby.ele('form:cinnostKS');

    // Identifikace
    const ident = c.ele('form:identifikace');
    ident.ele('form:ikMpsv').txt(r.csszOic ?? '').up();
    ident.ele('form:idPpv').txt(r.csszIdPpv ?? '').up();
    ident.up();

    // Souhrnná data zaměstnance
    const sdz = c.ele('form:souhrnDataZec');
    const prijmy = sdz.ele('form:prijmy');
    prijmy.ele('form:zuctovanoCelkem').txt(grossInt).up();
    prijmy.ele('form:osvobozenoCelkem').txt('0').up();
    prijmy.ele('form:odmenyNerezident').txt('0').up();
    const prispevek = prijmy.ele('form:prispevekZamestnavatele');
    prispevek.ele('form:prispevekZelSporeniOsvob').txt('0').up();
    prispevek.ele('form:prispevekZelPojDlPece').txt('0').up();
    prispevek.ele('form:prispevekPenzPripoj').txt('0').up();
    prispevek.ele('form:prispevekDoplnPenzPripoj').txt('0').up();
    prispevek.ele('form:prispevekPenzPoj').txt('0').up();
    prispevek.ele('form:prispevekZivotPoj').txt('0').up();
    prispevek.ele('form:prispevekDip').txt('0').up();
    prispevek.up();
    prijmy.up();

    // Srážková daň
    const zvlSazba = sdz.ele('form:zvlastniSazbaDane');
    zvlSazba.ele('form:zakladDane').txt(grossInt).up();
    zvlSazba.ele('form:srazenaDan').txt(taxInt).up();
    // Pro rezidenty vždy 0 — v účetní referenci vyplněno.
    zvlSazba.ele('form:srazenaDanNerezident').txt('0').up();
    zvlSazba.up();

    sdz.ele('form:prohlaseniPoplatnika').txt(r.taxDeclarationAtTime ? '1' : '0').up();
    const zdravZam = sdz.ele('form:zdravPojZamestnanec');
    zdravZam.ele('form:zdravotniPojisteni').txt('0').up();
    zdravZam.up();
    sdz.up();

    // Pojištění (pod-limit ZMR)
    const pojisteniEl = c.ele('form:pojisteni');
    const trvani = pojisteniEl.ele('form:trvani');
    trvani.ele('form:pojisteniOd').txt(start).up();
    trvani.ele('form:pojisteniDo').txt(end).up();
    trvani.up();
    // Vyměřovací základ: 0 na pojistném, celý gross jako příjem z nepojistěné činnosti
    const vz = pojisteniEl.ele('form:vymerovaciZaklad');
    vz.ele('form:castkaOdvodPojistneho').txt('0').up();
    vz.ele('form:prijemNepojistenaCinnost').txt(grossInt).up();
    vz.up();
    // ELDP: pro nepojistění pouze pocetDnu=0
    const eldpSeznam = pojisteniEl.ele('form:eldpSeznam');
    const eldp = eldpSeznam.ele('form:eldp');
    eldp.ele('form:pocetDnu').txt('0').up();
    eldp.up();
    eldpSeznam.up();
    const pojZec = pojisteniEl.ele('form:pojisteniZamestnanec');
    pojZec.ele('form:socialniPojisteni').txt('0').up();
    pojZec.up();
    const pojZav = pojisteniEl.ele('form:pojisteniZamestnavatel');
    pojZav.ele('form:socialniPojisteni').txt('0').up();
    pojZav.up();
    const sleva = pojisteniEl.ele('form:slevaZamestnance');
    sleva.ele('form:slevaZamestnanceEvidovana').txt('0').up();
    sleva.ele('form:slevaZamestnanceOvoZelEvidovana').txt('0').up();
    sleva.up();
    pojisteniEl.up();

    // Vykonávaná pozice
    const vp = c.ele('form:vykonavanaPozice');
    const mvp = vp.ele('form:mistoVykonuPrace');
    mvp.ele('form:obec').txt(data.appConfig.workplaceObec || 'Praha').up();
    mvp.ele('form:kodObce').txt(data.appConfig.workplaceKodObce || '554782').up();
    mvp.ele('form:kodStatu').txt(data.appConfig.workplaceKodStatu || 'CZ').up();
    mvp.up();
    vp.ele('form:uplatnujiPrispevekApz').txt('0').up();
    vp.ele('form:funkcniPozitky').txt('0').up();
    vp.ele('form:docasnePrideleniEvidovano').txt('0').up();
    const fond = vp.ele('form:fondPracovniDoby');
    fond.ele('form:stanovenyFond').txt('0').up();
    fond.ele('form:sjednanyFond').txt('0').up();
    // 99 = sentinel pro ČOM bez pevné pracovní doby (§79 ZP nedopadá)
    fond.ele('form:stanovenaTydenniDoba').txt('99').up();
    fond.up();
    vp.up();

    // Příjem v daném měsíci
    const prijem = c.ele('form:prijem');
    const dan = prijem.ele('form:dan');
    dan.ele('form:zakladDane').txt(grossInt).up();
    dan.up();
    prijem.up();

    c.up();
    formularOsoby.up();
  }
  formulareOsob.up();
  jmhz.up();

  return doc.end({ prettyPrint: true });
}

function buildPeriodDates(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(year, month, 0).getDate();
  const m = String(month).padStart(2, '0');
  return {
    start: `${year}-${m}-01`,
    end: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  };
}

function nowIsoZ(): string {
  // xs:dateTime v UTC s "Z" suffixem — účetní XML používá stejný formát.
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

/**
 * JMHZ účtuje v celých korunách — částky z DB (decimal.js text) ořežeme.
 */
function intCZK(decimalString: string): string {
  const n = Math.round(Number(decimalString));
  return String(Math.max(0, n));
}

/**
 * Validační check před generováním — zaměstnanec musí mít OIC + ID PPV + RČ.
 */
export function validateEmployeeForJmhz(employee: {
  csszOic: string | null;
  csszIdPpv: string | null;
  personalId: string;
}): string[] {
  const errs: string[] = [];
  if (!employee.csszOic) errs.push('chybí OIC / ikMpsv');
  if (!employee.csszIdPpv) errs.push('chybí ID PPV');
  if (!employee.personalId) errs.push('chybí rodné číslo');
  return errs;
}
