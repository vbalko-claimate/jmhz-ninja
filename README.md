# JMHZ Ninja

Webová aplikace pro zpracování měsíčních odměn členů výboru SVJ a generování JMHZ pro ČSSZ.

- **Stack:** Next.js 16 + TypeScript + Tailwind 4 + Drizzle ORM + SQLite + Auth.js v5 + Google OAuth
- **Deploy:** Coolify na Azure VM, persistentní volume `/app/data`
- **Backup:** noční cron do Google Drive (volitelně AES-256-GCM šifrované)

## Lokální vývoj

```bash
pnpm install
cp .env.example .env.local   # vyplň AUTH_SECRET, AUTH_GOOGLE_*, ADMIN_EMAILS
pnpm db:migrate              # vytvoří data/svj.db
pnpm db:seed                 # singleton config + 2026 legal params
pnpm dev
```

Otevři http://localhost:3000 → redirect na `/login` → Google login.

První přihlášení e-mailem z `ADMIN_EMAILS` automaticky vytvoří admin účet v DB.

## Google OAuth setup

1. https://console.cloud.google.com/apis/credentials
2. Vytvoř OAuth client ID — Web application.
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (dev) + produkční URL.
4. Doplň `AUTH_GOOGLE_ID` a `AUTH_GOOGLE_SECRET` do `.env.local`.
5. Vygeneruj `AUTH_SECRET`: `openssl rand -base64 32`.

## Skripty

| Skript | Co dělá |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Produkční build |
| `pnpm test` | Vitest |
| `pnpm db:generate` | Drizzle: generuj migraci ze schématu |
| `pnpm db:migrate` | Aplikuj migrace |
| `pnpm db:seed` | Vlož singleton config + 2026 legal params |
| `pnpm db:studio` | Drizzle Studio (DB browser) |
| `pnpm fetch-jmhz` | Stáhne aktuální JMHZ XSD/příklady z developers.mpsv.cz |
| `pnpm restore-backup` | CLI pro restore (de)šifrované zálohy DB |

## Architektura

Viz `~/.claude/plans/ad-auth-myslel-whimsical-duckling.md` pro kompletní architektonický plán.

## JMHZ XML

Aplikace generuje XML pro **e-Podání ČSSZ** ve formátu JMHZ 1.4.3.4 (platný od 1. 4. 2026).

Zdrojové dokumenty od ČSSZ/MPSV jsou stahovány skriptem `scripts/fetch-jmhz.sh` do `vendor/jmhz/` (gitignored). Při změně XSD je nutné regenerovat typy a projít testy.

## Roadmap (stav implementace)

- [x] Scaffold + dependencies
- [x] Drizzle schema + migrace (7 tabulek)
- [x] Core payroll calc + Vitest (10 testů, threshold + ceil rounding + signed declaration)
- [x] Auth.js + Google OAuth + RBAC middleware + login page + dashboard
- [ ] Settings UI (AppConfig, LegalParameters, Employees, Users)
- [ ] Monthly Payroll UI
- [ ] Exports (CSV, TXT, PDF, XML JMHZ)
- [ ] Lock workflow + Drive archive
- [ ] Noční backup do Google Drive (+ volitelné šifrování)
- [ ] GDPR JSON export
- [ ] Dockerfile + Coolify config
