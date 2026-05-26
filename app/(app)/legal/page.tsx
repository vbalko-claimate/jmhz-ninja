export default function LegalNoticePage() {
  return (
    <article className="prose prose-slate max-w-3xl">
      <h1 className="text-xl font-semibold">Ochrana osobních údajů a retence</h1>

      <p className="mt-4 text-sm text-slate-600">
        Aplikace zpracovává osobní údaje členů výboru SVJ (jméno, rodné číslo, OIC, ID PPV,
        bankovní účet) v rozsahu nezbytném pro výpočet odměn, srážky daně a zákonem požadovaná
        hlášení (JMHZ pro ČSSZ).
      </p>

      <h2 className="mt-6 text-lg font-medium">Právní základ</h2>
      <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
        <li>
          čl. 6 odst. 1 písm. c) GDPR — splnění právní povinnosti (daňová a sociální legislativa
          ČR).
        </li>
        <li>
          čl. 6 odst. 1 písm. f) GDPR — oprávněný zájem správce (vedení účetnictví).
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-medium">Retence</h2>
      <p className="mt-2 text-sm text-slate-700">
        Účetní záznamy včetně payroll dat jsou uchovávány dle § 31 zákona o účetnictví po dobu{' '}
        <strong>až 10 let</strong>. Hard delete payroll záznamů aplikace neumožňuje.
      </p>
      <p className="mt-2 text-sm text-slate-700">
        Zaměstnance lze v aplikaci <em>deaktivovat</em> (soft delete) — historické záznamy
        zůstávají dostupné pro účetní účely, ale v běžných seznamech jsou skryté.
      </p>

      <h2 className="mt-6 text-lg font-medium">Práva subjektu údajů (čl. 15 GDPR)</h2>
      <p className="mt-2 text-sm text-slate-700">
        V detailu zaměstnance je tlačítko <strong>GDPR JSON</strong>, které exportuje veškeré
        uchovávané údaje subjektu včetně payroll historie. Tento export pokrývá právo na přístup
        dle čl. 15 GDPR.
      </p>

      <h2 className="mt-6 text-lg font-medium">Zabezpečení (čl. 32 GDPR)</h2>
      <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
        <li>Aplikace běží na šifrovaném disku VM, přístup pouze přes HTTPS.</li>
        <li>Autentizace přes Google OAuth, autorizace dle rolí (admin/user/viewer).</li>
        <li>
          Zálohy do Google Drive lze volitelně šifrovat AES-256-GCM s passphrase odvozeným scrypt.
        </li>
      </ul>
    </article>
  );
}
