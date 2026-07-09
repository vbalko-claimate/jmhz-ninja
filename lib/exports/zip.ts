import { zipSync, strToU8 } from 'fflate';
import { buildJmhzXml } from './xml-jmhz';
import type { PayrollExport } from './data';

/**
 * ePortál ČSSZ přijímá JMHZ pouze jako ZIP — holé XML služba „Podání nahráním
 * dat z účetního systému" odmítne. V jednom ZIP smí být max 100 XML; my
 * generujeme jeden formulář na období, takže balíme přesně jeden XML.
 */
export function zipSingleXml(xmlFilename: string, xml: string): Buffer {
  const zipped = zipSync({ [xmlFilename]: strToU8(xml) });
  return Buffer.from(zipped);
}

/** Postaví JMHZ XML a zabalí ho do ZIP připraveného k nahrání na ePortál ČSSZ. */
export function buildJmhzZip(data: PayrollExport): Buffer {
  const mm = String(data.month).padStart(2, '0');
  const xmlFilename = `JMHZ-${data.year}-${mm}.xml`;
  return zipSingleXml(xmlFilename, buildJmhzXml(data));
}
