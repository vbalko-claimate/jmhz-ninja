#!/usr/bin/env node
// POST a JMHZ XML payload to the ČSSZ validation service (test env) and
// pretty-print the result.
//
// Usage:
//   node scripts/validate-jmhz.mjs <jmhz-xml-file>
//
// The argument should be the bare DV/XML (the <jmhz> element from our
// xml-jmhz builder, NOT a SOAP envelope). The script wraps it for you.

import fs from 'node:fs';
import crypto from 'node:crypto';

const SERVICE_URL = 'https://t-epodani.cssz.cz/ePodaniValidace.svc';
const SOAP_ACTION = 'ePodaniValidace';

const xmlPath = process.argv[2];
if (!xmlPath || !fs.existsSync(xmlPath)) {
  console.error('usage: node scripts/validate-jmhz.mjs <jmhz-xml-file>');
  process.exit(1);
}

const innerXml = fs.readFileSync(xmlPath, 'utf8').replace(/^﻿/, '').trim();
// Strip XML declaration so we can embed it inside a SOAP envelope
const innerWithoutDecl = innerXml.replace(/^<\?xml[^?]*\?>\s*/i, '');

const pozadavekId = crypto.randomUUID().toUpperCase();
const pozadavekCas = new Date().toISOString().replace(/Z$/, '');

const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:cz:isvs:cssz:schemas:ePodaniValidace:v1">
  <soapenv:Body>
    <urn:ValidujPodani>
      <urn:PozadavekId>${pozadavekId}</urn:PozadavekId>
      <urn:PozadavekCas>${pozadavekCas}</urn:PozadavekCas>
      ${innerWithoutDecl}
    </urn:ValidujPodani>
  </soapenv:Body>
</soapenv:Envelope>`;

console.log(`→ POST ${SERVICE_URL}`);
console.log(`  PozadavekId: ${pozadavekId}`);
console.log(`  payload size: ${envelope.length} bytes`);

const res = await fetch(SERVICE_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml; charset=utf-8',
    SOAPAction: `"${SOAP_ACTION}"`,
  },
  body: envelope,
});

const body = await res.text();
console.log(`\n← HTTP ${res.status} ${res.statusText}\n`);

// Extract result
const resultMatch = body.match(/<VysledekKod>([^<]+)<\/VysledekKod>/);
const result = resultMatch?.[1];

if (result === 'OK') {
  console.log('✓ Validation OK — XML je v pořádku.\n');
  console.log(body);
  process.exit(0);
}

if (result === 'CHYBA') {
  console.log('✗ Validation FAILED. Errors:\n');
  // Extract <Chyba> blocks
  const chybaRegex = /<Chyba>([\s\S]*?)<\/Chyba>/g;
  let i = 1;
  let m;
  while ((m = chybaRegex.exec(body)) !== null) {
    const block = m[1];
    const get = (tag) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1];
    console.log(`  [${i++}] ${get('Kategorie') ?? '?'} · kod ${get('Kod') ?? '?'} · ${get('FormularIdentifikace') ?? '-'}`);
    console.log(`      ${get('Popis')?.trim() ?? ''}`);
  }
  process.exit(1);
}

// SOAP fault or other
console.log('⚠ Nečekaná odpověď. Plný body:\n');
console.log(body);
process.exit(2);
