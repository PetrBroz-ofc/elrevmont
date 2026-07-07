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
js/hero-paths.js       animované vlnité čáry na pozadí hero sekce + animace nadpisu (vanilla JS, bez frameworku)
js/border-glow.js      zářící okraj karet reagující na kurzor (vanilla JS, bez frameworku)
js/click-spark.js      jiskry při kliknutí kdekoliv na stránce (vanilla JS, bez frameworku)
js/admin.js            logika administrace (login, formuláře, ukládání, upload fotek)
js/image-editor.js     editor obrázků (oříznutí, jas/kontrast, otočení, změna velikosti) při nahrávání v adminu
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

1. **Hero** — animované vlnité čáry na pozadí (viz níže), jméno firmy, hlavní nadpis, tlačítka telefon/e-mail
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

## Hero sekce — animované vlnité čáry na pozadí

Úvodní sekce používá efekt inspirovaný konceptem "BackgroundPaths", ale
přepsaný do čistého vanilla JS/SVG (`js/hero-paths.js`) bez Reactu, Next.js
nebo knihovny Framer Motion — aby zůstala zachována architektura statického
webu.

Chování: na pozadí se vykreslí čtyři vrstvy jemně animovaných SVG křivek
(připomínajících vodivé dráhy) — dvě vrstvy soustředěné do pravého horního
rohu a dvě do levého dolního, takže vzor "plave" v obou rozích současně.
Animace je řešená přes CSS `transform` na úrovni celé vrstvy (ne na
jednotlivých cestách), což je výrazně levnější pro výkon prohlížeče. Hlavní
nadpis se při načtení stránky rozepíše písmeno po písmenu (každé písmeno má
vlastní zpožděnou animaci). Zbytek obsahu (eyebrow, podnadpis, tlačítka
telefon/e-mail) zůstal beze změny stejný jako předtím. Sekce je statická —
scrolluje se přes ni úplně normálně, bez scroll-jackingu.

Efekt respektuje `prefers-reduced-motion`: lidem, kteří mají v systému
vypnuté animace, se čáry na pozadí nehýbou a nadpis se zobrazí rovnou celý.

Přístupnost: nadpis má nastavený `aria-label` s plným textem, takže čtečky
obrazovky přečtou smysluplný text i přes to, že vizuálně je rozdělený na
jednotlivá písmenka v `<span>` elementech.

## BorderGlow — zářící okraj karet služeb a školení

Karty v sekcích Služby a Školení mají efekt inspirovaný komponentou
"BorderGlow" (React Bits), přepsaný do vanilla JS (`js/border-glow.js`) bez
Reactu. Při pohybu kurzoru blízko okraje karty se objeví jemná modrá záře,
která kopíruje směr, odkud kurzor přichází — čím blíž k okraji, tím
výraznější. Po opuštění karty záře plynule zmizí.

Implementace sleduje pozici kurzoru přes `pointermove`/`pointerleave` a
výsledky (vzdálenost od středu karty, úhel) zapisuje do CSS custom
properties (`--edge-proximity`, `--cursor-angle`), které řídí `conic-gradient`
masku a `box-shadow` v CSS — žádný JS běžící smyčka navíc, jen event listener.

## ClickSpark — jiskry při kliknutí

Kliknutí kdekoliv na stránce vyvolá krátké jiskry vylétávající z místa
kliknutí do všech stran — efekt inspirovaný komponentou "ClickSpark" (React
Bits), přepsaný do vanilla JS (`js/click-spark.js`) bez Reactu. Implementace
používá jediný `<canvas>` přes celou obrazovku (`position: fixed`,
`pointer-events: none`, takže nezasahuje do klikání na skutečné prvky pod
ním) a `requestAnimationFrame` smyčku pro vykreslování a mizení jisker.

Respektuje `prefers-reduced-motion` — lidem s vypnutými animacemi se efekt
rovnou nenačte (canvas se ani nevytvoří), protože jde o čistě dekorativní
prvek bez informační hodnoty.

## Mobilní kompatibilita

Web i administrace jsou otestované a upravené pro plynulé fungování na všech
běžných velikostech mobilů — od malých Android telefonů (320 px šířky) přes
iPhone SE, běžné iPhony a Android telefony, až po větší modely (iPhone 14 Pro
Max), a to na výšku i na šířku (landscape).

**Veřejný web:**
- Žádné horizontální přetečení stránky na žádné testované šířce.
- Hlavní menu se pod 900 px šířky přepíná na výsuvný panel ovládaný
  hamburger tlačítkem (velikost dotykové plochy 44×44 px).
- Tlačítka, odkazy v patičce a další klikatelné prvky mají na mobilu
  dostatečně velkou dotykovou plochu (min. ~44 px) podle doporučení
  Apple/Google pro pohodlné ovládání prstem.
- Zvláštní úpravy pro velmi malé telefony (do 359 px šířky) a pro
  telefony položené na šířku s nízkou výškou obrazovky.

**Administrace (`admin.html`):**
- Postranní menu se sekcemi (Hero, Služby, Revize, ...) se pod 900 px šířky
  mění na výsuvný panel s vlastním hamburger tlačítkem v horní liště —
  stejný vzor jako na veřejném webu, aby to bylo intuitivní.
- Po výběru sekce se menu na mobilu samo zavře a obsah se posune nahoru.
- Formulářová pole mají na mobilu velikost písma 16 px, aby telefon
  (především iOS Safari) při kliknutí do pole samovolně nepřibližoval
  stránku.
- Malá tlačítka (nahrát fotku, odebrat položku) mají na mobilu zvětšenou
  dotykovou plochu oproti desktopové verzi.

## Editor obrázků při nahrávání

Kdekoliv v adminu, kde se nahrává fotka z počítače nebo mobilu (Hero pozadí,
Galerie — titulní fotka i fotky v albu, Reference — loga), se po výběru
souboru nejdřív otevře editor obrázků (`js/image-editor.js`) — teprve
upravený výsledek se odešle na server. Nic se nenahrává rovnou napřímo.

Editor umožňuje:
- **Oříznutí** — přetažením rámečku nebo jeho rohů, s volitelným pevným
  poměrem stran (volný výběr, 1:1, 4:3, 16:9, 3:4 na výšku).
- **Otočení** o 90°.
- **Jas a kontrast** — jemné doladění přes posuvníky.
- **Změnu velikosti** — nastavení max. šířky výstupu (640 / 1280 / 1920 px,
  nebo beze změny), což zmenší i objem dat, které se posílají na server.
- **Kvalitu komprese** (JPEG) — posuvník 50–100 %, kompromis mezi velikostí
  souboru a kvalitou obrazu.

Implementace je čistý vanilla JS s `<canvas>`, bez závislosti na externích
knihovnách — funguje stejně na desktopu i na mobilu (ořezový rámeček se dá
tahat prstem i myší).

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
