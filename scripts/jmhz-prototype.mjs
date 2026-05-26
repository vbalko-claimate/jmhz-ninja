// Prototype JMHZ XML builder using real schema (jmhzPodani.xsd 1.4.3.4 +
// formCinnostKS.xsd). Reads our prod data (well, the seed data), builds a
// proper <jmhz> structure and POSTs it to the ČSSZ validator.
//
// Run: node scripts/jmhz-prototype.mjs

import { create } from 'xmlbuilder2';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SERVICE_URL = 'https://t-epodani.cssz.cz/ePodaniValidace.svc';

// ---------- Mock SVJ data (same as our prod seed) ----------
const svj = {
  name: 'Společenství vlastníků jednotek Formanská č.p. 533',
  ico: '01414747',
  variabilniSymbol: '4422074189',
  mistoVykonuPrace: {
    obec: 'Praha',
    kodObce: '554782', // Hlavní město Praha (ČSÚ kód obce)
    kodStatu: 'CZ',
  },
};

// JMHZ se podává za uzavřený měsíc (běžící měsíc validátor odmítá).
const period = { year: 2026, month: 4 };

// June-effective gross rewards we set in DB. Tax = ceil(gross * 0.15)
// for sub-limit Q-category committee members, no insurance withheld.
const employees = [
  {
    firstName: 'Dana',
    lastName: 'Zdeňková',
    ikMpsv: '1912989694', // = OIC z ČSSZ dopisu
    idPpv: '4003134873918',
    gross: 2353,
    tax: 353,
  },
  {
    firstName: 'Isabel Alexandra',
    lastName: 'García Montesová',
    ikMpsv: '1505668692',
    idPpv: '4003134873935',
    gross: 1883,
    tax: 283,
  },
  {
    firstName: 'Radka',
    lastName: 'Jílková',
    ikMpsv: '1555463790',
    idPpv: '4003134873936',
    gross: 2883,
    tax: 433,
  },
  {
    firstName: 'Světlana',
    lastName: 'Balková Sychrová',
    ikMpsv: '1832286632',
    idPpv: '4003134873937',
    gross: 3412,
    tax: 512,
  },
];

function buildPeriodDates(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d+Z$/, '');
}

// ---------- Build the <jmhz> document ----------
const idPodani = randomUUID().toUpperCase();
const { start, end } = buildPeriodDates(period.year, period.month);

const doc = create({ version: '1.0', encoding: 'UTF-8' });
const jmhz = doc.ele('jmhz', {
  xmlns: 'http://schemas.cssz.cz/JMHZ/podani/1.0',
  'xmlns:form': 'http://schemas.cssz.cz/JMHZ/form/1.0',
  'xmlns:so': 'http://schemas.cssz.cz/JMHZ/souhrn/1.0',
  'xmlns:pvpoj': 'http://schemas.cssz.cz/JMHZ/PVPOJ/1.0',
  verze: '1.4.3.4',
});

const totalTax = employees.reduce((s, e) => s + e.tax, 0);

// Header
const h = jmhz.ele('hlavicka');
h.ele('idPodani').txt(idPodani).up();
h.ele('typPodani').txt('R').up();
h.ele('variabilniSymbol').txt(svj.variabilniSymbol).up();
h.ele('mesic').txt(String(period.month)).up();
h.ele('rok').txt(String(period.year)).up();
h.ele('datumVyplneni').txt(nowIso()).up();
h.ele('balikPoradi').txt('1').up();
h.ele('balikyPocet').txt('1').up();
// 1 souhrn + 1 PVPOJ + N formulářů osob
h.ele('formularePocetVBaliku').txt(String(employees.length + 2)).up();
h.ele('formularePocetCelkem').txt(String(employees.length + 2)).up();
h.up();

// Souhrnná vrstva — daňové údaje za měsíc
const souhrn = jmhz.ele('so:souhrn');
const danMesic = souhrn.ele('so:danUdajeMesic');
// Pro pod-limit jen srážková daň, žádné zálohové → 0
danMesic.ele('so:danZalohaPoSleve').txt('0').up();
danMesic.up();
souhrn.up();

// PVPOJ vrstva — pro pod-limit zaměstnance bez pojistného → samé 0
const pvpoj = jmhz.ele('pvpoj:PVPOJ');
const pojistne = pvpoj.ele('pvpoj:pojistne');
// Vyplnit všechny tři vyměřovací základy + pojistné jako 0 (kontrola ID 162)
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

// Formulare osob
const formulareOsob = jmhz.ele('formulareOsob');
for (const e of employees) {
  const formularOsoby = formulareOsob.ele('formularOsoby');
  const fh = formularOsoby.ele('hlavicka');
  fh.ele('idFormulare').txt(randomUUID().toUpperCase()).up();
  fh.ele('typFormulare').txt('R').up(); // R = řádný, O = opravný, S = storno
  fh.ele('primarniPpv').txt('true').up();
  fh.up();

  const c = formularOsoby.ele('form:cinnostKS');

  const ident = c.ele('form:identifikace');
  ident.ele('form:ikMpsv').txt(e.ikMpsv).up();
  ident.ele('form:idPpv').txt(e.idPpv).up();
  ident.up();

  const sdz = c.ele('form:souhrnDataZec');
  const prijmy = sdz.ele('form:prijmy');
  prijmy.ele('form:zuctovanoCelkem').txt(String(e.gross)).up();
  prijmy.up();
  // Srážková daň podle § 36 ZDP — nepoužívá se zalohaNaDan, nýbrž zvlastniSazbaDane.
  const zvlSazba = sdz.ele('form:zvlastniSazbaDane');
  zvlSazba.ele('form:zakladDane').txt(String(e.gross)).up();
  zvlSazba.ele('form:srazenaDan').txt(String(e.tax)).up();
  zvlSazba.up();
  sdz.ele('form:prohlaseniPoplatnika').txt('false').up();
  const zdravZam = sdz.ele('form:zdravPojZamestnanec');
  zdravZam.ele('form:zdravotniPojisteni').txt('0').up();
  zdravZam.up();
  sdz.up();

  const pojisteni = c.ele('form:pojisteni');
  const trvani = pojisteni.ele('form:trvani');
  trvani.ele('form:pojisteniOd').txt(start).up();
  trvani.ele('form:pojisteniDo').txt(end).up();
  trvani.up();
  // vymerovaciZaklad: pro pod-limit ZMR = 0 / vynecháme (minOccurs=0)
  const eldpSeznam = pojisteni.ele('form:eldpSeznam');
  const eldp = eldpSeznam.ele('form:eldp');
  // Pro nepojistění (pod-limit ZMR) viz pokyny MH 1.4.12 (str. 6086):
  // pouze pocetDnu=0, ostatní pole eldp se nevyplňují.
  eldp.ele('form:pocetDnu').txt('0').up();
  eldp.up();
  eldpSeznam.up();
  pojisteni.up();

  const vp = c.ele('form:vykonavanaPozice');
  const mvp = vp.ele('form:mistoVykonuPrace');
  mvp.ele('form:obec').txt(svj.mistoVykonuPrace.obec).up();
  mvp.ele('form:kodObce').txt(svj.mistoVykonuPrace.kodObce).up();
  mvp.ele('form:kodStatu').txt(svj.mistoVykonuPrace.kodStatu).up();
  mvp.up();
  vp.ele('form:uplatnujiPrispevekApz').txt('false').up();
  vp.ele('form:funkcniPozitky').txt('false').up();
  vp.ele('form:docasnePrideleniEvidovano').txt('false').up();
  const fond = vp.ele('form:fondPracovniDoby');
  // Pro člena výboru SVJ (bez pevné pracovní doby) zkusíme 0 / 0 / 0
  fond.ele('form:stanovenyFond').txt('0').up();
  fond.ele('form:sjednanyFond').txt('0').up();
  fond.ele('form:stanovenaTydenniDoba').txt('0').up();
  fond.up();
  vp.up();

  const prijem = c.ele('form:prijem');
  const dan = prijem.ele('form:dan');
  // Pro pod-limit srážkovou daň je základ pro výpočet zálohové daně 0
  // (zálohová daň se neaplikuje; daň jde přes zvlastniSazbaDane).
  dan.ele('form:zakladDane').txt('0').up();
  dan.up();
  prijem.up();

  c.up();
  formularOsoby.up();
}
formulareOsob.up();
jmhz.up();

const xml = doc.end({ prettyPrint: true });
const xmlPath = '/tmp/jmhz-prototype.xml';
fs.writeFileSync(xmlPath, xml);
console.log(`→ wrote ${xmlPath} (${xml.length} bytes)\n`);
console.log(xml.split('\n').slice(0, 25).join('\n'));
console.log('...\n');

// ---------- POST to validator ----------
const pozadavekId = randomUUID().toUpperCase();
const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:cz:isvs:cssz:schemas:ePodaniValidace:v1">
  <soapenv:Body>
    <urn:ValidujPodani>
      <urn:PozadavekId>${pozadavekId}</urn:PozadavekId>
      <urn:PozadavekCas>${nowIso()}</urn:PozadavekCas>
      ${xml.replace(/^<\?xml[^?]*\?>\s*/i, '')}
    </urn:ValidujPodani>
  </soapenv:Body>
</soapenv:Envelope>`;

console.log(`→ POST ${SERVICE_URL}`);
const res = await fetch(SERVICE_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'ePodaniValidace' },
  body: envelope,
});
const body = await res.text();
console.log(`← HTTP ${res.status}\n`);

const result = body.match(/<VysledekKod>([^<]+)<\/VysledekKod>/)?.[1];
if (result === 'OK') {
  console.log('✓ Validation OK!\n');
  process.exit(0);
}
if (result === 'CHYBA') {
  console.log('✗ CHYBA. Errors:\n');
  const chybaRe = /<Chyba>([\s\S]*?)<\/Chyba>/g;
  let m, i = 1;
  while ((m = chybaRe.exec(body)) !== null) {
    const block = m[1];
    const get = (tag) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1];
    console.log(`  [${i++}] ${get('Kategorie') ?? '?'} · ${get('Kod') ?? '?'} · ${get('FormularIdentifikace') ?? '-'}`);
    console.log(`      ${(get('Popis') ?? '').trim()}`);
  }
  process.exit(1);
}
console.log('⚠ Unexpected response:\n', body);
process.exit(2);
