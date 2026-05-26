import Link from 'next/link';

export default function HelpPage() {
  return (
    <article className="prose prose-slate max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Nápověda — JMHZ Ninja</h1>
      <p className="mt-2 text-sm text-slate-600">
        Stručný průvodce pro práci s aplikací: vysvětlení identifikátorů ČSSZ, postup při
        registraci nového člena výboru, GDPR opatření a workflow měsíčního hlášení.
      </p>

      <Toc />

      <H2 id="identifikatory">Identifikátory zaměstnance a SVJ</H2>
      <Table>
        <thead>
          <tr>
            <th>Pojem</th>
            <th>Co to je</th>
            <th>Kde získat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>RČ</strong></td>
            <td>Rodné číslo</td>
            <td>Občanský průkaz zaměstnance.</td>
          </tr>
          <tr>
            <td><strong>OIC</strong></td>
            <td>
              Osobní identifikační číslo ČSSZ — pseudonymní 10místný identifikátor osoby v
              systémech ČSSZ. Jeden člověk má jedno OIC napříč všemi zaměstnáními.
            </td>
            <td>
              Přidělí ČSSZ při prvním kontaktu (např. po podání ONZ). Lze najít na ePortálu ČSSZ
              ve výpise záznamu pojištěnce nebo v dopise od ČSSZ.
            </td>
          </tr>
          <tr>
            <td><strong>ID PPV</strong></td>
            <td>
              Identifikátor konkrétního pracovněprávního vztahu (zaměstnání). Každý vztah téhož
              člověka má své vlastní 13místné ID.
            </td>
            <td>
              Vrátí ČSSZ jako reakci na podání ONZ (Oznámení o nástupu do zaměstnání) přes ePortál
              / e-podání.
            </td>
          </tr>
          <tr>
            <td><strong>VS ČSSZ</strong></td>
            <td>
              Variabilní symbol — identifikátor zaměstnavatele (SVJ) při komunikaci s ČSSZ.
            </td>
            <td>Přidělí místně příslušná OSSZ usnesením po přihlášení do registru zaměstnavatelů.</td>
          </tr>
          <tr>
            <td><strong>IČO</strong></td>
            <td>Identifikační číslo SVJ jako právnické osoby.</td>
            <td>Z výpisu z rejstříku společenství vlastníků jednotek.</td>
          </tr>
        </tbody>
      </Table>

      <H2 id="workflow">Workflow při nástupu nového člena výboru</H2>
      <ol className="ml-5 list-decimal space-y-2 text-sm">
        <li>Zvolení do výboru / podpis smlouvy.</li>
        <li>
          SVJ podá elektronicky <strong>ONZ (Oznámení o nástupu do zaměstnání)</strong> přes
          ePortál ČSSZ → ČSSZ vrátí <strong>OIC</strong> (pokud neexistuje) a{' '}
          <strong>ID PPV</strong> pro tento vztah.
        </li>
        <li>
          V <Link href="/settings/employees" className="underline">Nastavení &gt; Zaměstnanci</Link>{' '}
          doplníte OIC, ID PPV, výchozí měsíční hrubou odměnu, případně další pole.
        </li>
        <li>
          Měsíčně otevřete <strong>Payroll</strong>, zkontrolujete částky, uložíte. Pak{' '}
          <strong>Exporty</strong> → vygenerujete JMHZ XML.
        </li>
        <li>XML pošlete přes ePortál ČSSZ → vrátí potvrzení s referenčním číslem.</li>
        <li>
          V aplikaci kliknete <em>Označit jako odeslané</em>, zadáte referenci → měsíc se zamkne a
          bundle (CSV, PDF, XML) se zaarchivuje do Google Drive.
        </li>
        <li>Při ukončení smlouvy: podáte odhlášku přes ePortál; v aplikaci zaměstnance{' '}
        <em>Deaktivovat</em> (soft delete — historie zůstává).</li>
      </ol>

      <H2 id="vypocet">Výpočet měsíční odměny</H2>
      <p className="text-sm">
        Aplikace předvyplní <strong>Základní odměnu</strong> z karty zaměstnance, vy můžete přidat{' '}
        <strong>Bonus</strong> (jednorázové). Z toho:
      </p>
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{`
totalGross = baseReward + extraReward

if totalGross > limit (4 499 Kč pro 2026):
    BLOKOVÁNO — překročen limit pro pojistné

tax = ceil(totalGross × 0.15)   // § 146 ZDP — zaokrouhlení na celé Kč nahoru
if prohlášení k dani podepsáno:
    tax = max(0, tax − 2 570 Kč)   // sleva na poplatníka 2026

net = totalGross − tax
      `.trim()}</pre>
      <p className="text-xs text-slate-600">
        <strong>Limit 4 499 Kč</strong> je hranicí pro nemocenské pojištění u členů kolektivních
        orgánů (§ 6 odst. 4 zákona o nemocenském pojištění). Pokud měsíční hrubá odměna do limitu
        spadá, neodvádí se pojistné — sráží se pouze daň. Aplikace neumí výpočet pro odměny nad
        limitem.
      </p>

      <H2 id="prohlaseni">Prohlášení k dani</H2>
      <p className="text-sm">
        Zaměstnanec může u jednoho zaměstnavatele podepsat <em>Prohlášení poplatníka daně z
        příjmů</em> (růžový formulář). V karetě zaměstnance zaškrtnete checkbox.
      </p>
      <ul className="ml-5 list-disc space-y-1 text-sm">
        <li>
          <strong>Bez prohlášení</strong> (typické pro SVJ — člen výboru má prohlášení obvykle u
          jiného zaměstnavatele): srazí se plná srážková daň 15 %.
        </li>
        <li>
          <strong>S prohlášením</strong>: měsíční sleva na poplatníka (2 570 Kč) se odečte. U
          odměn pod 4 499 Kč to znamená daň = 0.
        </li>
      </ul>

      <H2 id="gdpr">GDPR — která pole jsou citlivá?</H2>
      <p className="text-sm">
        Pole označená <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">!</span> jsou citlivé osobní údaje
        ve smyslu GDPR. Vyplňujte je <strong>jen pokud máte právní důvod</strong> (nejčastěji
        povinnost JMHZ vůči ČSSZ):
      </p>
      <Table>
        <thead>
          <tr>
            <th>Pole</th>
            <th>Citlivost</th>
            <th>Kdy vyplnit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rodné číslo</td>
            <td><Tag color="rose">vysoká</Tag></td>
            <td>Občané ČR — povinné pro JMHZ.</td>
          </tr>
          <tr>
            <td>Datum a místo narození</td>
            <td><Tag color="amber">střední</Tag></td>
            <td>JMHZ vyžaduje pouze u cizinců bez RČ. U občanů ČR lze vynechat.</td>
          </tr>
          <tr>
            <td>Rodné příjmení</td>
            <td><Tag color="amber">střední</Tag></td>
            <td>JMHZ u některých cizinců. U občanů ČR obvykle ne.</td>
          </tr>
          <tr>
            <td>Bankovní účet</td>
            <td><Tag color="amber">střední</Tag></td>
            <td>Pouze pokud byste generovali platební příkazy. Pro JMHZ není potřeba.</td>
          </tr>
          <tr>
            <td>Zdravotní pojišťovna</td>
            <td><Tag color="slate">nízká</Tag></td>
            <td>Jen interní info. JMHZ ji nevyžaduje.</td>
          </tr>
          <tr>
            <td>OIC, ID PPV</td>
            <td><Tag color="slate">pseudonymní</Tag></td>
            <td>Bez nich nelze podat JMHZ — vyplnit vždy.</td>
          </tr>
        </tbody>
      </Table>

      <H2 id="retence">Retence dat</H2>
      <ul className="ml-5 list-disc space-y-1 text-sm">
        <li>
          <strong>Účetní záznamy</strong> (payroll history) — uchováváme až 10 let dle zákona o
          účetnictví. Hard delete payroll záznamů aplikace neumožňuje.
        </li>
        <li>
          <strong>Zaměstnanec</strong> — lze deaktivovat (soft delete). Skryje se v UI, ale data
          zůstávají.
        </li>
        <li>
          <strong>Právo na přístup (čl. 15 GDPR)</strong> — tlačítko „GDPR JSON" u zaměstnance
          stáhne všechny uchovávané údaje subjektu.
        </li>
      </ul>

      <H2 id="zaokrouhlovani">Zaokrouhlování srážkové daně</H2>
      <p className="text-sm">
        Aplikace používá <strong>zaokrouhlení nahoru</strong> na celé Kč dle § 146 ZDP
        (například: 994 × 0,15 = 149,10 → 150 Kč).
      </p>
      <p className="text-sm">
        Některé starší účetní programy zaokrouhlují matematicky (149,10 → 149). Pokud chcete
        kontinuitu s předchozí účetní, požádejte správce aplikace o úpravu v{' '}
        <code>lib/payroll.ts</code>.
      </p>

      <H2 id="zalohy">Zálohy</H2>
      <p className="text-sm">
        Každou noc se v 02:00 (Europe/Prague) provede snapshot SQLite databáze do Google Drive
        (Coolify volume → tmp → zašifrovaný `.enc` → Drive). Restore přes{' '}
        <code>pnpm restore-backup &lt;file&gt;</code> se zadáním passphrase.
      </p>
      <p className="text-sm">
        Reporty (JMHZ XML, PDF, CSV, XLSX) jsou navíc archivovány do Drive při označení měsíce
        jako odeslaného — bundle ve složce <code>archive/YYYY/MM-submitted/</code>.
      </p>

      <H2 id="omezeni">Známá omezení</H2>
      <ul className="ml-5 list-disc space-y-1 text-sm">
        <li>
          Aplikace neumí počítat odměny <strong>nad limitem 4 499 Kč</strong> (vyžadovalo by
          výpočet pojistného).
        </li>
        <li>
          Jeden zaměstnanec = jedna výchozí odměna. Pokud má někdo víc rolí (např. výbor + úklid)
          se samostatnými ID PPV, založte je jako <strong>dva záznamy</strong> (různé OIC nejde,
          ale různé ID PPV ano — bude potřeba schema úprava nebo workaround).
        </li>
        <li>
          XML JMHZ je zatím skeleton podle datového slovníku 1.4.1.5. Před prvním ostrým podáním
          validujte proti aktuálnímu XSD ze stránek ČSSZ.
        </li>
      </ul>
    </article>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-8 scroll-mt-20 text-lg font-semibold">
      {children}
    </h2>
  );
}

function Toc() {
  const items = [
    ['identifikatory', 'Identifikátory ČSSZ'],
    ['workflow', 'Workflow při nástupu'],
    ['vypocet', 'Výpočet měsíční odměny'],
    ['prohlaseni', 'Prohlášení k dani'],
    ['gdpr', 'GDPR — citlivá pole'],
    ['retence', 'Retence dat'],
    ['zaokrouhlovani', 'Zaokrouhlování daně'],
    ['zalohy', 'Zálohy'],
    ['omezeni', 'Známá omezení'],
  ];
  return (
    <nav className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <strong className="text-xs uppercase text-slate-500">Obsah</strong>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {items.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className="text-slate-700 hover:text-slate-900 hover:underline">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="my-3 w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

function Tag({ color, children }: { color: 'rose' | 'amber' | 'slate'; children: React.ReactNode }) {
  const map: Record<typeof color, string> = {
    rose: 'bg-rose-100 text-rose-800',
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-slate-200 text-slate-700',
  } as const;
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${map[color]}`}>{children}</span>;
}
