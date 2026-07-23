/* =========================================================
   ELREVMONT — Cookie lišta a podmíněné načtení Google Analytics
   Podle GDPR/ePrivacy se analytické skripty (GA4) smí načíst až
   po aktivním souhlasu uživatele — ne "opt-out", ale "opt-in".
   Volba se ukládá do localStorage a lze ji kdykoliv změnit přes
   odkaz "Nastavení cookies" v patičce.
   ========================================================= */

const COOKIE_CONSENT_KEY = 'elrevmont_cookie_consent';
// Hodnoty: 'accepted' | 'rejected' | null (ještě nerozhodnuto)

function getCookieConsent() {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch (err) {
    // Soukromý režim prohlížeče apod. — bez localStorage se lišta
    // bude ptát znovu při každé návštěvě, což je bezpečnější výchozí
    // chování než tiše předpokládat souhlas.
    return null;
  }
}

function setCookieConsent(value) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch (err) {
    // Ignorujeme — v horším případě se lišta objeví znovu příště.
  }
}

// Načte Google Analytics (gtag.js) — voláno POUZE po souhlasu uživatele,
// nikdy automaticky. measurementId přichází z data/content.json (pole
// vyplnitelné v adminu, záložka SEO), takže dokud tam Milan nezadá
// skutečné G-XXXXXXXXXX ID, žádný skript se nenačte ani po souhlasu.
function loadGoogleAnalytics(measurementId) {
  if (!measurementId || document.getElementById('ga4-script')) return;

  const script = document.createElement('script');
  script.id = 'ga4-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  // anonymize_ip pro citlivější přístup k IP adresám návštěvníků i nad
  // rámec základního nastavení GA4.
  gtag('config', measurementId, { anonymize_ip: true });
}

function removeGoogleAnalytics() {
  const script = document.getElementById('ga4-script');
  if (script) script.remove();
  window.dataLayer = [];
  window.gtag = function () {};
}

function showCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.classList.add('open');
}

function hideCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.classList.remove('open');
}

// Aplikuje aktuální souhlas na stav stránky (spustí/nespustí GA) a použije
// se jak při prvním načtení stránky, tak při změně volby v nastavení.
function applyCookieConsent(consent, measurementId) {
  if (consent === 'accepted') {
    loadGoogleAnalytics(measurementId);
  } else {
    removeGoogleAnalytics();
  }
}

// measurementId se doplní až z dat webu (main.js zavolá initCookieConsent
// s aktuální hodnotou z content.json, jakmile jsou data načtená).
function initCookieConsent(measurementId) {
  const consent = getCookieConsent();

  if (consent === 'accepted' || consent === 'rejected') {
    applyCookieConsent(consent, measurementId);
    hideCookieBanner();
  } else {
    // Bez rozhodnutí uživatele se nic sledovacího nespouští — lišta
    // se zobrazí a čeká na volbu.
    showCookieBanner();
  }

  const acceptBtn = document.getElementById('cookie-accept-btn');
  const rejectBtn = document.getElementById('cookie-reject-btn');
  const settingsBtn = document.getElementById('footer-cookie-settings-btn');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      setCookieConsent('accepted');
      applyCookieConsent('accepted', measurementId);
      hideCookieBanner();
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      setCookieConsent('rejected');
      applyCookieConsent('rejected', measurementId);
      hideCookieBanner();
    });
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      showCookieBanner();
    });
  }
}
