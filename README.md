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
js/hero-scroll.js      scroll-driven video efekt v hero sekci (vanilla JS, bez frameworku)
js/admin.js            logika administrace (login, formuláře, ukládání, upload fotek)
js/icons.js            sada SVG ikon
data/content.json      veškerý textový/obsahový obsah webu
data/theme.json         barvy a fonty
api/login.js            serverless funkce — ověření hesla admina
api/save.js              serverless funkce — commit JSON změn do GitHubu
api/upload-image.js      serverless funkce — nahrání fotek do assets/img/gallery
assets/img/              obrázky (hero pozadí, galerie, o nás...)
```

## Struktura webu

Hlavní menu (v tomto pořadí): **O nás, Revize, Montáže, Školení, Servis,
Galerie, Reference, FAQ, Kontakt**.

Na stránce jsou navíc sekce **Hero** (úvod) a **Služby** (6 karet), které
nemají vlastní položku v menu, ale zobrazují se mezi Hero a Revize.

1. **Hero** — scroll-driven video (viz níže), jméno firmy, hlavní nadpis, tlačítka telefon/e-mail
2. **O nás** — stručný popis činnosti + 3 statistiky
3. **Služby** — 6 karet nabízených služeb (bez vlastní položky v menu)
4. **Revize** — základní informace, druhy revizí, proč se dělají, objekty, legislativa
5. **Montáže** — popis + seznam typů objektů
6. **Školení** — 3 karty (vyhláška, individuální školení, konzultace)
7. **Servis** — text o servisu a údržbě + 3 body (odstraňování závad, pravidelná údržba, servisní smlouva)
8. **Galerie** — kategorie/alba fotografií, klik na kategorii otevře lightbox se všemi fotkami
9. **Reference** — mřížka dlaždic s logy firem/partnerů (viz níže)
10. **FAQ** — časté dotazy, rozklikávací seznam
11. **Kontakt** — kontaktní údaje + Google mapa s provozovnou

## Hero sekce — scroll-driven video

Úvodní sekce používá efekt inspirovaný konceptem "ContainerScroll" (scroll-
-driven video), ale přepsaný do čistého vanilla JS (`js/hero-scroll.js`) bez
Reactu, Next.js nebo knihovny Motion/Framer Motion — aby zůstala zachována
architektura statického webu.

Chování: video v malém zaobleném okně se při scrollování přes dlouhou dráhu
(320 % výšky obrazovky) postupně "odmaskuje" (CSS `clip-path`) na plnou šířku
a výšku sticky panelu. Nadpis, podnadpis a tlačítka nad videem se zároveň
zvedají nahoru s jemným efektem rozostření a prolnutí. Jakmile scroll dorazí
na konec dráhy, sticky panel se "pustí" a pokračuje běžný scroll na další
sekce webu.

Efekt respektuje `prefers-reduced-motion`: lidem, kteří mají v systému
vypnuté animace, se zobrazí rovnou plně rozbalený stav bez scrollové animace.

Video je aktuálně nastaveno na volně dostupný stock klip z Pexels (detail
barevných vodičů na pracovním stole, licence Pexels — volné komerční
i nekomerční užití bez nutnosti atribuce):
```
https://videos.pexels.com/video-files/6079428/6079428-uhd_2560_1440_24fps.mp4
```
Odkaz na video lze kdykoliv změnit v adminu (záložka Hero → „Odkaz na video“)
nebo přímo v `data/content.json` (`hero.backgroundVideo`).

## Galerie — kategorie a nahrávání fotek

V adminu (záložka Galerie) lze vytvářet libovolný počet kategorií (alb). Každá
kategorie má název, titulní fotku a sadu fotek uvnitř alba. Fotky se nahrávají
přímo z počítače tlačítkem „Nahrát fotku“ — soubor se pošle na
`/api/upload-image`, ta ho uloží do `assets/img/gallery/` v GitHub repozitáři
a vrátí cestu, kterou si admin panel sám doplní do JSONu. Podporované formáty:
JPG, PNG, WEBP, GIF (max. cca 6 MB na soubor).

Na webu se kategorie zobrazí jako dlaždice s náhledem; klik na dlaždici otevře
lightbox se všemi fotkami dané kategorie.

## Reference — dlaždice s logy

Sekce Reference zobrazuje statickou mřížku dlaždic (bez animace). Dokud
k dlaždici není nahrané logo, zobrazí se jen prázdná dlaždice s přerušovaným
rámečkem, ikonou „+“ a volitelným popiskem (název firmy) — funguje jako
vizuální „místo rezervováno pro logo“. Jakmile admin logo nahraje (stejným
způsobem jako fotky do galerie, přes `/api/upload-image`), dlaždice se logem
vyplní a rámeček zmizí. Počet dlaždic i jejich obsah se spravuje v adminu,
záložka Reference.

## Kontaktní sekce — mapa místo formuláře

Web funguje jako prezentace firmy, ne jako nástroj na sběr poptávek, proto
kontaktní sekce místo formuláře zobrazuje Google mapu s provozovnou. Mapa se
automaticky generuje z adresy v `data/content.json` (`contact.operationAddress`).
Pro vlastní embed (např. s jiným zoomem nebo stylem) lze v adminu vyplnit pole
„Vlastní Google Maps embed odkaz“ (Google Maps → Sdílet → Vložit mapu).

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
5. Nahrávání fotek do galerie jde samostatnou cestou přes `/api/upload-image`
   (viz sekce výše) — probíhá okamžitě při výběru souboru, ne až při „Uložit změny“.
6. Vercel díky napojení na GitHub repo automaticky nasadí novou verzi webu.

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
fotografie přímo v administraci (sekce Hero pro fotku na pozadí, sekce Galerie
pro kategorie a alba fotek).
