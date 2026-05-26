// Hand-builds an XML using our current generator's structure (mock data).
import { create } from 'xmlbuilder2';

const data = {
  year: 2026,
  month: 5,
  appConfig: {
    svjName: 'Společenství vlastníků jednotek Formanská č.p. 533',
    svjIco: '01414747',
    svjAddress: 'Pod Formankou 533/3, Újezd u Průhonic, 149 00 Praha',
    csszVs: '4422074189',
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

const doc = create({ version: '1.0', encoding: 'UTF-8' });
const root = doc.ele('JMHZ_PODANI', {
  'xsi:schemaLocation': 'http://schemas.cssz.cz/JMHZ JMHZ_podani.xsd',
  'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
  verze: '1.4.3.4',
});

const hlavicka = root.ele('Hlavicka');
hlavicka.ele('Mesic').txt(String(data.month)).up();
hlavicka.ele('Rok').txt(String(data.year)).up();
hlavicka.ele('TypPodani').txt('R').up();
hlavicka.up();

const zam = root.ele('Zamestnavatel');
zam.ele('ICO').txt(data.appConfig.svjIco).up();
zam.ele('Nazev').txt(data.appConfig.svjName).up();
zam.ele('Adresa').txt(data.appConfig.svjAddress).up();
zam.ele('VS_CSSZ').txt(data.appConfig.csszVs).up();
zam.up();

const seznam = root.ele('Zamestnanci');
for (const r of data.rows) {
  const z = seznam.ele('Zamestnanec');
  z.ele('OIC').txt(r.csszOic).up();
  z.ele('ID_PPV').txt(r.csszIdPpv).up();
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

console.log(doc.end({ prettyPrint: true }));
