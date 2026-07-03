# Elrevmont — web + admin CMS

Statický web (`index.html`) + oddělený admin panel (`admin.html`), který edituje
obsah uložený v `/data/*.json`. Architektura stejná jako u Crystal Valley:

- **Frontend nikdy nehardcoduje texty** — vše se natahuje z `data/content.json` (a barvy/fonty z `data/theme.json`).
- **Admin panel** (`admin.html`) edituje tato JSON data přes formuláře.
- **Ukládání** jde přes Vercel serverless funkci `/api/save`, která commituje
  změny přímo do GitHub repozitáře přes GitHub Contents API.
- **GitHub token nikdy neopouští server** — leží pouze ve Vercel Environment
  Variables, frontend (ani admin.html) s ním nikdy nepřijde do styku.

## Struktura

```
index.html          veřejný web (jedna stránka, vše ze sekcí)
admin.html           administrace (samostatná stránka, mimo index)
css/style.css         styly veřejného webu
css/admin.css         styly administrace
js/main.js            renderer veřejného webu (čte data/content.json)
js/admin.js            logika administrace (login, formuláře, ukládání)
js/icons.js            sada SVG ikon
data/content.json      veškerý textový/obsahový obsah webu
data/theme.json         barvy a fonty
api/login.js            serverless funkce — ověření hesla admina
api/save.js              serverless funkce — commit změn do GitHubu
assets/img/              obrázky (hero pozadí, galerie, o nás...)
```

## Nastavení na Vercelu

V nastavení projektu na Vercelu (Settings → Environment Variables) je potřeba nastavit:

| Proměnná | Popis |
|---|---|
| `ADMIN_PASSWORD` | Heslo pro přihlášení do `admin.html`. |
| `ADMIN_SESSION_SECRET` | Náhodný dlouhý řetězec (session token), který admin.html po přihlášení posílá jako Bearer token. Vygenerujte např. `openssl rand -hex 32`. |
| `GITHUB_TOKEN` | GitHub Personal Access Token (fine-grained) s právem **Contents: Read and write** pouze pro tento repozitář. |
| `GITHUB_OWNER` | Uživatelské jméno / organizace na GitHubu (např. `PetrBroz`). |
| `GITHUB_REPO` | Název repozitáře (např. `elrevmont-web`). |
| `GITHUB_BRANCH` | Větev, do které se commituje (výchozí `main`). |

Po nastavení proměnných je nutné projekt znovu nasadit (Redeploy), aby se
proměnné načetly do serverless funkcí.

## Jak funguje ukládání

1. V `admin.html` se přihlásíte heslem → `/api/login` ověří heslo proti
   `ADMIN_PASSWORD` a vrátí `ADMIN_SESSION_SECRET` jako token.
2. Token se uloží do `sessionStorage` (jen po dobu relace prohlížeče).
3. Při kliknutí na „Uložit změny“ admin panel pošle aktuální JSON na
   `/api/save` s tímto tokenem v hlavičce `Authorization: Bearer ...`.
4. `/api/save` ověří token, ověří že jde o povolený soubor (`data/content.json`
   nebo `data/theme.json`), zvaliduje JSON a přes GitHub Contents API vytvoří
   commit s novým obsahem.
5. Vercel díky napojení na GitHub repo automaticky nasadí novou verzi webu.

## Lokální vývoj

Pro testování frontendu bez API stačí otevřít `index.html` přes libovolný
statický server (kvůli `fetch()` nejde spouštět přes `file://`):

```bash
npx serve .
```

Pro testování API funkcí lokálně použijte Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

a do `.env.local` doplňte stejné proměnné jako výše.

## Doplnění obrázků

Zatím jsou v `data/content.json` použity placeholder cesty
(`assets/img/hero-bg.jpg`, `assets/img/gallery-1.jpg` atd.). Nahrajte reálné
fotografie do `assets/img/` se stejnými názvy, nebo cesty upravte přímo
v administraci (sekce Galerie / Hero / O nás).
