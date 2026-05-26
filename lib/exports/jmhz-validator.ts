// Klient pro ePodaniValidace.svc — validace JMHZ XML proti SOAP službě ČSSZ.
// Test env: t-epodani.cssz.cz (anonymní, SOAP 1.1).
import { randomUUID } from 'node:crypto';

const TEST_URL = 'https://t-epodani.cssz.cz/ePodaniValidace.svc';
const PROD_URL = 'https://epodani.cssz.cz/ePodaniValidace.svc';

export type ValidationError = {
  kategorie: 'Podani' | 'Formular' | string;
  kod: string;
  popis: string;
  formularIdentifikace?: string;
};

export type ValidationResult =
  | { ok: true; durationMs: number }
  | { ok: false; errors: ValidationError[]; durationMs: number };

export async function validateJmhzXml(
  innerXml: string,
  opts: { env?: 'test' | 'prod'; timeoutMs?: number } = {},
): Promise<ValidationResult> {
  const url = opts.env === 'prod' ? PROD_URL : TEST_URL;
  const t0 = Date.now();

  // Strip XML declaration so we can embed inside SOAP envelope.
  const inner = innerXml.replace(/^<\?xml[^?]*\?>\s*/i, '').trim();
  const pozadavekId = randomUUID().toUpperCase();
  const pozadavekCas = new Date().toISOString().replace(/\.\d+Z$/, '');

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:cz:isvs:cssz:schemas:ePodaniValidace:v1">
  <soapenv:Body>
    <urn:ValidujPodani>
      <urn:PozadavekId>${pozadavekId}</urn:PozadavekId>
      <urn:PozadavekCas>${pozadavekCas}</urn:PozadavekCas>
      ${inner}
    </urn:ValidujPodani>
  </soapenv:Body>
</soapenv:Envelope>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);

  let body: string;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'ePodaniValidace' },
      body: envelope,
      signal: controller.signal,
    });
    body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        errors: [{ kategorie: 'Podani', kod: 'HTTP_' + res.status, popis: `HTTP ${res.status} ${res.statusText}` }],
        durationMs: Date.now() - t0,
      };
    }
  } finally {
    clearTimeout(timer);
  }

  const result = body.match(/<VysledekKod>([^<]+)<\/VysledekKod>/)?.[1];
  if (result === 'OK') return { ok: true, durationMs: Date.now() - t0 };
  if (result !== 'CHYBA') {
    return {
      ok: false,
      errors: [{ kategorie: 'Podani', kod: 'BAD_RESPONSE', popis: `Validátor vrátil neočekávanou odpověď: ${body.slice(0, 200)}` }],
      durationMs: Date.now() - t0,
    };
  }

  const errors: ValidationError[] = [];
  const chybaRe = /<Chyba>([\s\S]*?)<\/Chyba>/g;
  let m: RegExpExecArray | null;
  while ((m = chybaRe.exec(body)) !== null) {
    const block = m[1];
    const get = (tag: string) =>
      block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim();
    errors.push({
      kategorie: (get('Kategorie') as ValidationError['kategorie']) ?? '?',
      kod: get('Kod') ?? '?',
      popis: get('Popis') ?? '',
      formularIdentifikace: get('FormularIdentifikace'),
    });
  }

  return { ok: false, errors, durationMs: Date.now() - t0 };
}
