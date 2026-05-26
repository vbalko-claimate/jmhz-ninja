# Deploy JMHZ Ninja do Coolify

Kompletní průvodce nasazením, včetně získání všech secretů. Bude vás stát zhruba 30–45 minut, většina je klikání v Google Cloud Console.

---

## Co budete potřebovat

- Funkční Coolify instance na Azure VM (nebo jiném serveru) — dále jen „Coolify".
- GitHub účet s přístupem k tomuto repu.
- Google účet (pro OAuth + Drive backup).
- Doménu nebo subdoménu, kterou nasměrujete na Coolify (např. `jmhz.example.com`).

---

## 1) Vygenerujte `AUTH_SECRET`

Auth.js používá tento secret k podepisování JWT session tokenů. Nikdy ho nesdílejte, nikam necommitujte.

```bash
openssl rand -base64 32
```

Výstup např. `K7p8...EXAMPLE...x9q=`. Uložte si ho — vložíte do Coolify ENV jako `AUTH_SECRET`.

---

## 2) Google OAuth credentials

Aplikace přihlašuje přes Google. Potřebujete OAuth 2.0 Client ID.

### 2.1 Vytvořte / vyberte GCP projekt

1. https://console.cloud.google.com/projectcreate
2. Pojmenujte projekt např. `jmhz-ninja`.

### 2.2 Zapněte OAuth consent screen

1. https://console.cloud.google.com/apis/credentials/consent
2. **User type:** External (pokud nemáte Google Workspace).
3. Vyplňte minimum:
   - App name: `JMHZ Ninja`
   - User support email: váš email
   - Developer contact: váš email
4. **Scopes:** přidat `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
5. **Test users** (pokud necháváte v *Testing* stavu):
   - přidejte všechny e-maily, které se budou přihlašovat (vy + ostatní)
6. Save & continue.

> 💡 V *Testing* stavu funguje OAuth bez omezení pro test users. Publishing do produkce vyžaduje Google verifikaci jen pokud používáte sensitive scopes — pro náš čistě email/profile scope **nemusíte** verifikovat a stačí *Testing*.

### 2.3 Vytvořte OAuth Client ID

1. https://console.cloud.google.com/apis/credentials
2. **+ Create credentials → OAuth client ID**
3. **Application type:** Web application
4. **Name:** `JMHZ Ninja (production)`
5. **Authorized JavaScript origins:**
   - `https://jmhz.example.com` ← vaše produkční doména
   - (volitelně `http://localhost:3000` pro lokální vývoj)
6. **Authorized redirect URIs:**
   - `https://jmhz.example.com/api/auth/callback/google`
   - (volitelně `http://localhost:3000/api/auth/callback/google`)
7. Create → zobrazí se vám:
   - **Client ID** → uložte jako `AUTH_GOOGLE_ID`
   - **Client secret** → uložte jako `AUTH_GOOGLE_SECRET`

---

## 3) Google Drive backup přes OAuth (osobní účet)

Pro osobní Gmail (My Drive) nelze použít service account — nemá vlastní storage quota
a upload do sdílené složky selže s 403 Forbidden. Místo toho použijeme **OAuth refresh token**:
autorizujete app jednorázově v prohlížeči, dostanete trvalý refresh_token, a app pak
nahrává soubory **vaším jménem** (jdou proti vašich 15 GB Drive quota).

### 3.1 Zapněte Google Drive API

1. https://console.cloud.google.com/apis/library/drive.googleapis.com
2. **Enable**.

### 3.2 Vytvořte OAuth client typu Desktop app

1. https://console.cloud.google.com/apis/credentials
2. **+ Create credentials → OAuth client ID**.
3. **Application type:** Desktop app.
4. **Name:** `JMHZ Ninja — Drive backup` (libovolné).
5. **Authorized redirect URIs:** `http://localhost:8765/callback`.
6. Create → uložte si **Client ID** a **Client secret**.

> Pokud máte OAuth consent screen ve stavu *Testing*, přidejte do **Test users**
> stejné e-maily jako pro web login.

### 3.3 Vytvořte Drive složku

1. https://drive.google.com → vytvořte složku, např. `JMHZ Ninja — Backup`.
2. Otevřete ji, ID složky je v URL:
   `https://drive.google.com/drive/folders/<TOHLE>` → uložte jako `GDRIVE_FOLDER_ID`.

Žádné sdílení s SA emailem už **není potřeba** — soubory se vytváří pod vaším účtem.

### 3.4 Jednorázová autorizace (refresh token)

Lokálně na vašem Macu:

```bash
# Doplňte hodnoty do .env.local nebo přes export
export GDRIVE_OAUTH_CLIENT_ID="...apps.googleusercontent.com"
export GDRIVE_OAUTH_CLIENT_SECRET="GOCSPX-..."

pnpm auth-gdrive
```

Co se stane:
1. Spustí se lokální server na portu 8765.
2. Otevře se prohlížeč s Google consent screen.
3. Přihlásíte se účtem **vbalko@gmail.com** (ten co vlastní backup složku).
4. Kliknete **Allow**.
5. Skript v terminálu vypíše `GDRIVE_REFRESH_TOKEN`.

Vložte ho do Coolify ENV. **Refresh token je trvalý** — funguje dokud ho nezneplatníte
v https://myaccount.google.com/permissions.

### 3.5 ENV summary

| Klíč | Hodnota |
|---|---|
| `GDRIVE_OAUTH_CLIENT_ID` | Z kroku 3.2 |
| `GDRIVE_OAUTH_CLIENT_SECRET` | Z kroku 3.2 |
| `GDRIVE_REFRESH_TOKEN` | Z kroku 3.4 |
| `GDRIVE_FOLDER_ID` | ID složky z 3.3 |

---

## 4) Šifrovací heslo pro zálohy (volitelné)

Pokud chcete zálohy v Drive šifrovat AES-256-GCM:

```bash
openssl rand -base64 24
```

Uložte jako `BACKUP_PASSPHRASE`. **Toto heslo si pečlivě uschovejte mimo aplikaci** (password manager) — bez něj neobnovíte zálohu.

Pokud `BACKUP_PASSPHRASE` v ENV nenastavíte, zálohy se nebudou šifrovat (přepínač v Settings → Backup pak bude zašedlý).

---

## 5) Coolify deploy

### 5.1 Vytvořte resource

1. V Coolify dashboardu **+ New Resource → Public Repository**.
2. **Git source:** `https://github.com/vbalko-claimate/jmhz-ninja` (nebo váš fork).
3. **Branch:** `main`.
4. **Build pack:** `Dockerfile`.

### 5.2 Persistent volume

V resource → **Storages → + Add**:

- **Source type:** **Volume** (Docker named volume) — **ne** *file*, **ne** *bind directory*
- **Name:** `jmhz-data`
- **Mount path:** `/app/data`
- **Is directory:** ✅ ano

> ⚠️ Musí to být **Volume / directory**, ne *file mount*. SQLite v WAL módu (který používáme pro výkon a konzistenci zálohy přes `VACUUM INTO`) drží vedle `svj.db` ještě dva pomocné soubory `svj.db-wal` a `svj.db-shm`. File mount by chytil jen jeden a způsobil ztrátu dat při restartu.
>
> Volume je preferovaný před bind-mountem (host path): Coolify ho spravuje, nemusíte řešit ownership na hostiteli, a backup do Drive funguje stejně tak jako tak.

Co se sem ukládá:
- `svj.db` + `svj.db-wal` + `svj.db-shm` — SQLite databáze
- `/app/data` je jediná persistentní cesta; `tmp/` pro snapshot zálohy je v `/app/tmp` (efemérní, neperzistuje, to je v pořádku — generuje se znova).

### 5.3 Doména

V resource → **Domains** přidejte `https://jmhz.example.com`. Coolify vám vygeneruje Let's Encrypt cert.

### 5.4 Environment variables

V resource → **Environment Variables**:

| Klíč | Hodnota |
|---|---|
| `AUTH_SECRET` | Výstup z `openssl rand -base64 32` (krok 1) |
| `AUTH_URL` | `https://jmhz.example.com` |
| `AUTH_GOOGLE_ID` | Z kroku 2.3 |
| `AUTH_GOOGLE_SECRET` | Z kroku 2.3 |
| `ADMIN_EMAILS` | `vase-adresa@gmail.com` (čárkou oddělené) |
| `DB_PATH` | `/app/data/svj.db` |
| `GDRIVE_OAUTH_CLIENT_ID` | Z kroku 3.2 |
| `GDRIVE_OAUTH_CLIENT_SECRET` | Z kroku 3.2 |
| `GDRIVE_REFRESH_TOKEN` | Z kroku 3.4 (`pnpm auth-gdrive`) |
| `GDRIVE_FOLDER_ID` | ID složky z kroku 3.3 |
| `BACKUP_PASSPHRASE` | Z kroku 4 — **nebo nechte prázdné** |

Všechny secrety v Coolify označte jako **Secret** (skrytí v UI).

### 5.5 Healthcheck

Coolify ho čte z Dockerfile. Default: `GET /api/health`. Žádné další nastavení nepotřeba.

### 5.6 Deploy

**Deploy** v Coolify UI. Build trvá zhruba 3–5 minut (multi-stage Docker).

Při startu kontejner:
1. Aplikuje Drizzle migrace na `svj.db`.
2. Seedne singleton `app_config`, `backup_settings`, a 2026 `legal_parameters`.
3. Nastartuje Next.js server na portu 3000.
4. Armuje cron pro noční zálohu (02:00 Europe/Prague).

---

## 6) První přihlášení a setup

1. Otevřete `https://jmhz.example.com` v prohlížeči.
2. Redirect na `/login` → klikněte **Přihlásit se přes Google**.
3. Vyberte účet z `ADMIN_EMAILS`.
4. Po prvním loginu jste admin. V DB se vytvoří záznam v `users`.
5. V navigaci klikněte **Nastavení**:
   - **Nastavení SVJ** — IČO, název, adresa, účet FÚ, VS ČSSZ.
   - **Zákonné parametry** — zkontrolujte 2026 hodnoty, případně přidejte nové verze.
   - **Zaměstnanci** — přidejte 4 členy výboru. Pro JMHZ jsou povinné `OIC` a `ID PPV` z ČSSZ.
   - **Uživatelé** — pokud chcete přidat účetní jako `viewer` nebo dalšího `user`, dejte sem jejich email + roli. Login si JIT vytvoří účet při Google přihlášení.
   - **Zálohy** — zkontrolujte stav (Drive SA + passphrase). Klikněte **Spustit zálohu nyní** pro ověření, že upload funguje.
6. Otevřete `/dashboard → Měsíční payroll`, uložte první měsíc a vyzkoušejte exporty.

---

## 7) Verifikace deploy (checklist)

- [ ] `https://jmhz.example.com/api/health` vrací `{"ok":true,...}`.
- [ ] Login Googlem funguje, redirect na dashboard.
- [ ] Po vytvoření zaměstnance a uložení payrollu vidím záznam v `/exports`.
- [ ] Stáhnu CSV, TXT, PDF — sedí čísla.
- [ ] Stáhnu JMHZ XML — soubor je validní XML (i když finální tagy validujte proti XSD po `pnpm fetch-jmhz`).
- [ ] „Spustit zálohu nyní" → v Drive složce přibude `svj-YYYY-MM-DD.db` (nebo `.db.enc`).
- [ ] V `/settings/backup` se aktualizoval `lastBackupAt`.
- [ ] Lock workflow: po označení odeslání vznikne `archive/YYYY/MM-submitted/` ve Drive s CSV+TXT+PDF+XLSX+XML+JSON.

---

## 8) Update a rollback

### Update
```bash
# z lokálu:
git push origin main
# v Coolify klikněte „Deploy" — pull, build, swap kontejneru.
```

Migrace se aplikují automaticky při startu.

### Rollback
V Coolify → resource → **Deployments** → vyberte předchozí deployment → **Redeploy**.

Pokud migrace přidala nekompatibilní změnu schématu, ručně:
```bash
# SSH na VM
docker exec -it <container> /bin/sh
node ./node_modules/.bin/tsx lib/db/migrate.ts  # rolloutuje až k aktuální verzi
```

Drizzle nemá out-of-the-box rollback — pokud potřebujete starou verzi DB, použijte zálohu z Drive (`pnpm restore-backup`).

---

## 9) Restore zálohy

Pokud potřebujete obnovit data:

```bash
# Stáhněte zálohu z Drive lokálně, např. svj-2026-05-20.db.enc

# Plaintext záloha:
pnpm restore-backup svj-2026-05-20.db ./data/svj.db

# Šifrovaná záloha (interaktivně se zeptá na BACKUP_PASSPHRASE):
pnpm restore-backup svj-2026-05-20.db.enc ./data/svj.db
```

Pak nahrajte vzniklý `svj.db` do Coolify volume `/app/data/` (přes SSH nebo Coolify file manager) a restartujte kontejner.

---

## 10) Troubleshooting

### „Přihlášení odmítnuto" po Google loginu
- E-mail není v `ADMIN_EMAILS` (pro prvního admina) ani v DB tabulce `users`.
- V Coolify ověřte `ADMIN_EMAILS`, redeploy.

### „redirect_uri_mismatch" z Google
- V Google Cloud Console → OAuth client → Authorized redirect URIs musí být přesně `https://vase-domena/api/auth/callback/google`.

### Backup selhal — „Drive folder not configured"
- Buď není `GDRIVE_FOLDER_ID` v ENV, nebo nesouhlasí s ID složky.
- Zkontrolujte také, že SA email má ve sdílení složky roli **Editor**.

### Backup selhal — „insufficient permissions"
- Drive API není zapnuté v projektu (krok 3.1).
- Service account nemá Editor přístup k cílové složce.

### Build padá v Coolify s „type error"
- Coolify používá Docker, který provádí TypeScript check. Vyzkoušejte lokálně `AUTH_SECRET=x ADMIN_EMAILS=x@x pnpm build` — chyby uvidíte rychleji.

### „Cannot find module 'better-sqlite3'"
- Native binárka se nepřeložila v `deps` stage. Většinou kvůli nesprávné Node verzi. Drží se `node:24-bookworm-slim` v Dockerfile.

### Změna domény po nasazení
1. V Coolify upravte domain.
2. V Google Cloud Console → OAuth client přidejte novou redirect URI.
3. V Coolify upravte `AUTH_URL` na novou doménu.
4. Redeploy.

---

## Reference (kdy aktualizovat ENV?)

| Změna | Co udělat |
|---|---|
| Přidat dalšího admina | `ADMIN_EMAILS` v Coolify, redeploy. Po prvním loginu vznikne v DB. (Nebo přidejte v Settings → Uživatelé.) |
| Přidat user/viewer | Stačí Settings → Uživatelé, žádný redeploy. |
| Změnit Google OAuth secret | `AUTH_GOOGLE_SECRET` v Coolify, redeploy. |
| Změnit Drive složku | `GDRIVE_FOLDER_ID` v Coolify nebo v Settings → Backup. |
| Zapnout / vypnout šifrování zálohy | Settings → Backup → checkbox (vyžaduje, aby `BACKUP_PASSPHRASE` byl v ENV). |
| Změnit zákonné parametry (limit, sazba) | Settings → Zákonné parametry → přidat verzi s `effective_from`. **Nikdy needitovat historické verze** — payroll snapshoty by ztratily kontext. |
