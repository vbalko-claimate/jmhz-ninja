import { create, convert } from 'xmlbuilder2';
import { randomUUID } from 'node:crypto';
import type { PayrollExport } from './data';

/**
 * Reference na původní řádné podání pro sestavení opravného hlášení. GUIDy se
 * podle pravidel ČSSZ nesmí generovat nové — opravné použije `idPodani`
 * původního řádného a u opravovaných osob i jejich `idFormulare`.
 */
export interface JmhzCorrection {
  /** idPodani z původního řádného podání (zůstává zachované). */
  idPodani: string;
  /** `${ikMpsv}|${idPpv}` → idFormulare z původního řádného podání. */
  formGuids: Record<string, string>;
}

function formKey(ikMpsv: string, idPpv: string): string {
  return `${ikMpsv}|${idPpv}`;
}

/**
 * JMHZ podání builder dle XSD 1.4.3.4 (formCinnostKS pro pod-limitní odměny
 * členů kolektivních orgánů SVJ, Q kategorie).
 *
 * Validováno přes https://t-epodani.cssz.cz/ePodaniValidace.svc — ověřeno
 * scripts/jmhz-prototype.mjs.
 *
 * Struktura:
 *   <jmhz>
 *     <hlavicka>            … idPodani, typPodani=R, VS, měsíc, rok, …
 *     <so:souhrn>           … daňové údaje za měsíc
 *     <pvpoj:PVPOJ>         … přehled o výši pojistného (vše 0 pro pod-limit)
 *     <formulareOsob>
 *       <formularOsoby>     … N× (jeden per zaměstnanec)
 *         <hlavicka>        … idFormulare, typFormulare=R, primarniPpv=true
 *         <form:cinnostKS>  … identifikace, souhrnDataZec (srážková daň),
 *                              pojisteni, vykonavanaPozice, prijem
 */
export function buildJmhzXml(data: PayrollExport, correction?: JmhzCorrection): string {
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

  // ---------- Hlavička podání ----------
  const h = jmhz.ele('hlavicka');
  h.ele('idPodani').txt(correction?.idPodani ?? randomUUID().toUpperCase()).up();
  h.ele('typPodani').txt(correction ? 'O' : 'R').up();
  h.ele('variabilniSymbol').txt(data.appConfig.csszVs || '').up();
  h.ele('mesic').txt(String(period.month)).up();
  h.ele('rok').txt(String(period.year)).up();
  h.ele('datumVyplneni').txt(nowIso()).up();
  h.ele('balikPoradi').txt('1').up();
  h.ele('balikyPocet').txt('1').up();
  // souhrn + PVPOJ + N formulářů
  h.ele('formularePocetVBaliku').txt(String(data.rows.length + 2)).up();
  h.ele('formularePocetCelkem').txt(String(data.rows.length + 2)).up();
  h.up();

  // ---------- Souhrnná vrstva ----------
  const souhrn = jmhz.ele('so:souhrn');
  const danMesic = souhrn.ele('so:danUdajeMesic');
  // U pod-limitních ČOM se zálohová daň neaplikuje (jde přes zvláštní sazbu) → 0
  danMesic.ele('so:danZalohaPoSleve').txt('0').up();
  danMesic.up();
  souhrn.up();

  // ---------- PVPOJ vrstva (vše 0 pro pod-limit) ----------
  const pvpoj = jmhz.ele('pvpoj:PVPOJ');
  const pojistne = pvpoj.ele('pvpoj:pojistne');
  pojistne.ele('pvpoj:zakladZamestnavateleA').txt('0').up();
  pojistne.ele('pvpoj:pojistneZamestnavateleA').txt('0').up();
  pojistne.ele('pvpoj:zakladZamestnavateleB').txt('0').up();
  pojistne.ele('pvpoj:pojistneZamestnavateleB').txt('0').up();
  pojistne.ele('pvpoj:zakladZamestnavateleC').txt('0').up();
  pojistne.ele('pvpoj:pojistneZamestnavateleC').txt('0').up();
  pojistne.ele('pvpoj:pojistneZamestnavateleCelkem').txt('0').up();
  pojistne.ele('pvpoj:pojistneZamestnance').txt('0').up();
  pojistne.ele('pvpoj:pojistneCelkem').txt('0').up();
  pojistne.up();
  pvpoj.ele('pvpoj:pojistneUhrada').txt('0').up();
  pvpoj.up();

  // ---------- Formuláře osob ----------
  const formulareOsob = jmhz.ele('formulareOsob');
  for (const r of data.rows) {
    const formularOsoby = formulareOsob.ele('formularOsoby');

    const fh = formularOsoby.ele('hlavicka');
    const reusedFormGuid = correction?.formGuids[formKey(r.csszOic ?? '', r.csszIdPpv ?? '')];
    fh.ele('idFormulare').txt(reusedFormGuid ?? randomUUID().toUpperCase()).up();
    // O = oprava existující součásti; osoba, která v původním řádném nebyla,
    // jde v opravném hlášení jako R (doplnění).
    fh.ele('typFormulare').txt(reusedFormGuid ? 'O' : 'R').up();
    fh.ele('primarniPpv').txt('true').up();
    fh.up();

    const c = formularOsoby.ele('form:cinnostKS');

    // Identifikace
    const ident = c.ele('form:identifikace');
    ident.ele('form:ikMpsv').txt(r.csszOic ?? '').up();
    ident.ele('form:idPpv').txt(r.csszIdPpv ?? '').up();
    ident.up();

    // Souhrnná data zaměstnance — srážková daň přes zvlastniSazbaDane
    const sdz = c.ele('form:souhrnDataZec');
    const prijmy = sdz.ele('form:prijmy');
    prijmy.ele('form:zuctovanoCelkem').txt(intCZK(r.totalGross)).up();
    prijmy.up();
    const zvlSazba = sdz.ele('form:zvlastniSazbaDane');
    zvlSazba.ele('form:zakladDane').txt(intCZK(r.totalGross)).up();
    zvlSazba.ele('form:srazenaDan').txt(intCZK(r.taxAmount)).up();
    zvlSazba.up();
    sdz.ele('form:prohlaseniPoplatnika').txt(String(r.taxDeclarationAtTime)).up();
    const zdravZam = sdz.ele('form:zdravPojZamestnanec');
    zdravZam.ele('form:zdravotniPojisteni').txt('0').up();
    zdravZam.up();
    sdz.up();

    // Pojištění (pod-limit ZMR = ELDP s pocetDnu=0, žádný kod)
    const pojisteniEl = c.ele('form:pojisteni');
    const trvani = pojisteniEl.ele('form:trvani');
    trvani.ele('form:pojisteniOd').txt(start).up();
    trvani.ele('form:pojisteniDo').txt(end).up();
    trvani.up();
    const eldpSeznam = pojisteniEl.ele('form:eldpSeznam');
    const eldp = eldpSeznam.ele('form:eldp');
    eldp.ele('form:pocetDnu').txt('0').up();
    eldp.up();
    eldpSeznam.up();
    pojisteniEl.up();

    // Vykonávaná pozice
    const vp = c.ele('form:vykonavanaPozice');
    const mvp = vp.ele('form:mistoVykonuPrace');
    mvp.ele('form:obec').txt(data.appConfig.workplaceObec || 'Praha').up();
    mvp.ele('form:kodObce').txt(data.appConfig.workplaceKodObce || '554782').up();
    mvp.ele('form:kodStatu').txt(data.appConfig.workplaceKodStatu || 'CZ').up();
    mvp.up();
    vp.ele('form:uplatnujiPrispevekApz').txt('false').up();
    vp.ele('form:funkcniPozitky').txt('false').up();
    vp.ele('form:docasnePrideleniEvidovano').txt('false').up();
    const fond = vp.ele('form:fondPracovniDoby');
    // Pro ČOM bez pevné pracovní doby — vše 0
    fond.ele('form:stanovenyFond').txt('0').up();
    fond.ele('form:sjednanyFond').txt('0').up();
    fond.ele('form:stanovenaTydenniDoba').txt('0').up();
    fond.up();
    vp.up();

    // Příjem v daném měsíci — daň základ 0 (srážková jde přes zvlastniSazbaDane)
    const prijem = c.ele('form:prijem');
    const dan = prijem.ele('form:dan');
    dan.ele('form:zakladDane').txt('0').up();
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

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, '');
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

interface ParsedForm {
  hlavicka?: { idFormulare?: string };
  'form:cinnostKS'?: {
    'form:identifikace'?: { 'form:ikMpsv'?: string; 'form:idPpv'?: string };
  };
}
interface ParsedJmhz {
  jmhz?: {
    hlavicka?: { idPodani?: string };
    formulareOsob?: { formularOsoby?: ParsedForm | ParsedForm[] };
  };
}

/**
 * Vytáhne z původního řádného JMHZ XML identifikátory potřebné pro opravné
 * podání: `idPodani` a mapu osob (`ikMpsv|idPpv`) → `idFormulare`. Osoby se
 * párují přes stabilní ikMpsv (OIC) + idPpv, ne přes pořadí.
 */
export function parseJmhzGuids(xml: string): JmhzCorrection {
  const parsed = convert(xml, { format: 'object' }) as unknown as ParsedJmhz;
  const idPodani = parsed.jmhz?.hlavicka?.idPodani;
  if (!idPodani) {
    throw new Error('V nahraném XML chybí jmhz/hlavicka/idPodani — není to platné JMHZ podání.');
  }

  const raw = parsed.jmhz?.formulareOsob?.formularOsoby;
  const forms = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const formGuids: Record<string, string> = {};
  for (const f of forms) {
    const idFormulare = f.hlavicka?.idFormulare;
    const ident = f['form:cinnostKS']?.['form:identifikace'];
    const ikMpsv = ident?.['form:ikMpsv'];
    const idPpv = ident?.['form:idPpv'];
    if (idFormulare && ikMpsv && idPpv) {
      formGuids[formKey(ikMpsv, idPpv)] = idFormulare;
    }
  }

  return { idPodani, formGuids };
}
