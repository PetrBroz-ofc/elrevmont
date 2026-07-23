/* =========================================================
   ELREVMONT — frontend renderer v2
   Veškerý obsah stránky se natahuje z /data/content.json.
   Nic není natvrdo v HTML — admin panel edituje tento JSON
   a frontend ho jen vykresluje.
   ========================================================= */

// Náhledový režim: web běží uvnitř <iframe> v admin panelu (?preview=1
// v URL) — viz initPreviewMode() a renderAll() níže v souboru.
const IS_PREVIEW_MODE = new URLSearchParams(location.search).has('preview');

async function loadContent() {
  const res = await fetch('data/content.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Nepodařilo se načíst data/content.json');
  return res.json();
}

async function loadTheme() {
  try {
    const res = await fetch('data/theme.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    // Vzhled (barvy) není kritický pro fungování webu — pokud se
    // nepodaří načíst, web běží dál s výchozími barvami z CSS.
    console.error('Nepodařilo se načíst data/theme.json, používám výchozí barvy.', err);
    return null;
  }
}

// Mapování klíčů z theme.json na CSS custom properties použité v style.css.
const THEME_COLOR_VARS = {
  bg: '--c-bg',
  bgSoft: '--c-bg-soft',
  bgLight: '--c-bg-light',
  accent: '--c-accent',
  accentDark: '--c-accent-dark',
  steel: '--c-steel',
  safe: '--c-safe',
  textLight: '--c-text-light',
  textDark: '--c-text-dark',
  heroHighlight: '--c-hero-highlight'
};

const THEME_SIZE_VARS = {
  logoSize: '--size-nav-logo',
  heroEyebrowSize: '--size-hero-eyebrow'
};

function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.colors) {
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = THEME_COLOR_VARS[key];
      if (cssVar && value) root.style.setProperty(cssVar, value);
    });
  }
  if (theme.sizes) {
    Object.entries(theme.sizes).forEach(([key, value]) => {
      const cssVar = THEME_SIZE_VARS[key];
      if (cssVar && value) root.style.setProperty(cssVar, `${value}px`);
    });
  }
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  children.forEach(c => node.appendChild(c));
  return node;
}

function renderSEO(data) {
  const { seo, meta } = data;
  document.title = seo.title || meta.siteName;
  document.querySelector('meta[name="description"]').setAttribute('content', seo.description || '');
  document.querySelector('meta[name="keywords"]').setAttribute('content', seo.keywords || '');
  document.querySelector('meta[property="og:title"]').setAttribute('content', seo.title || '');
  document.querySelector('meta[property="og:description"]').setAttribute('content', seo.description || '');
  if (seo.ogImage) document.querySelector('meta[property="og:image"]').setAttribute('content', seo.ogImage);

  const ld = {
    "@context": "https://schema.org",
    "@type": "ElectricalContractor",
    "name": meta.companyName,
    "description": seo.description,
    "telephone": data.contact.phone,
    "email": data.contact.email,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": data.contact.operationAddress
    }
  };
  document.getElementById('schema-ld').textContent = JSON.stringify(ld);
}

function renderNav(data) {
  document.getElementById('nav-logo').textContent = data.nav.logo;
  document.getElementById('logo-icon').innerHTML = getIcon('logo-bolt');
  const footerIcon = document.getElementById('footer-logo-icon');
  if (footerIcon) footerIcon.innerHTML = getIcon('logo-bolt');

  const links = document.getElementById('nav-links');
  links.innerHTML = '';
  data.nav.links.forEach(l => {
    links.appendChild(el('a', { href: l.href }, [document.createTextNode(l.label)]));
  });
  document.getElementById('nav-cta').textContent = data.nav.ctaLabel;

  setupNavCursor(links);
}

// Pilulkové menu s posuvným "kurzorem", který na hover plynule klouže
// mezi položkami (vanilla JS ekvivalent NavHeader komponenty).
function setupNavCursor(navEl) {
  const cursor = el('span', { class: 'nav-cursor', 'aria-hidden': 'true' });
  navEl.appendChild(cursor);

  const linkEls = Array.from(navEl.querySelectorAll('a'));

  function moveCursorTo(target) {
    cursor.style.width = `${target.offsetWidth}px`;
    cursor.style.left = `${target.offsetLeft}px`;
    cursor.style.opacity = '1';
  }

  linkEls.forEach(link => {
    link.addEventListener('mouseenter', () => moveCursorTo(link));
  });

  navEl.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
}

function renderHero(data) {
  const h = data.hero;
  document.getElementById('hero-eyebrow').textContent = h.eyebrowTag;
  document.getElementById('hero-title').textContent = h.title;
  document.getElementById('hero-subtitle').textContent = h.subtitle;

  const phoneBtn = document.getElementById('hero-btn-phone');
  phoneBtn.innerHTML = getIcon('phone') + `<span>${h.phone}</span>`;
  phoneBtn.setAttribute('href', `tel:${h.phone.replace(/\s/g, '')}`);

  const emailBtn = document.getElementById('hero-btn-email');
  emailBtn.innerHTML = getIcon('mail') + `<span>${h.email}</span>`;
  emailBtn.setAttribute('href', `mailto:${h.email}`);

  const cue = document.getElementById('hero-scroll-cue');
  cue.innerHTML = getIcon('arrow-down');
  cue.setAttribute('title', h.scrollCueText || '');

  // Animované vlnité čáry na pozadí + animace nadpisu písmeno po písmenu
  // (vanilla JS, viz js/hero-paths.js)
  if (typeof initHeroPaths === 'function') {
    initHeroPaths();
  }
  if (typeof animateHeroTitle === 'function') {
    animateHeroTitle(h.titleHighlightCounts);
  }
}

function renderAboutFirm(data) {
  const a = data.aboutFirm;
  document.getElementById('aboutfirm-eyebrow').textContent = a.eyebrow;
  document.getElementById('aboutfirm-title').textContent = a.title;
  document.getElementById('aboutfirm-text').textContent = a.text;

  const badges = document.getElementById('aboutfirm-badges');
  badges.innerHTML = '';
  a.badges.forEach(b => {
    badges.appendChild(el('div', { class: 'about-firm-badge' }, [
      el('div', { class: 'value' }, [document.createTextNode(b.value)]),
      el('div', { class: 'label' }, [document.createTextNode(b.label)])
    ]));
  });
}

function renderServices(data) {
  const s = data.services;
  document.getElementById('services-eyebrow').textContent = s.eyebrow;
  document.getElementById('services-title').textContent = s.title;
  document.getElementById('services-subtitle').textContent = s.subtitle;

  const grid = document.getElementById('services-grid');
  grid.innerHTML = '';
  s.items.forEach(item => {
    grid.appendChild(el('div', { class: 'service-card', 'data-reveal': '' }, [
      el('div', { class: 'service-icon', html: getIcon(item.icon) }),
      el('h3', {}, [document.createTextNode(item.title)]),
      el('p', {}, [document.createTextNode(item.description)])
    ]));
  });
}

function renderRevize(data) {
  const r = data.revize;
  document.getElementById('revize-eyebrow').textContent = r.eyebrow;
  document.getElementById('revize-norms').textContent = r.normsLine;
  document.getElementById('revize-title').textContent = r.title;
  document.getElementById('revize-intro').textContent = r.intro;
  document.getElementById('revize-types-title').textContent = r.typesTitle;

  const types = document.getElementById('revize-types');
  types.innerHTML = '';
  r.types.forEach(t => {
    types.appendChild(el('div', { class: 'revize-type', 'data-reveal': '' }, [
      el('h3', {}, [document.createTextNode(t.title)]),
      el('p', {}, [document.createTextNode(t.description)])
    ]));
  });

  document.getElementById('revize-why-title').textContent = r.whyTitle;
  const whyList = document.getElementById('revize-why-list');
  whyList.innerHTML = '';
  r.whyPoints.forEach(point => {
    whyList.appendChild(el('li', {}, [document.createTextNode(point)]));
  });

  document.getElementById('revize-objects-title').textContent = r.objects.title;
  const objList = document.getElementById('revize-objects-list');
  objList.innerHTML = '';
  r.objects.list.forEach(o => {
    objList.appendChild(el('span', { class: 'chip' }, [document.createTextNode(o)]));
  });

  document.getElementById('revize-legis-title').textContent = r.legislation.title;
  const legisList = document.getElementById('revize-legis-list');
  legisList.innerHTML = '';
  r.legislation.list.forEach(li => {
    legisList.appendChild(el('li', {}, [document.createTextNode(li)]));
  });
}

function renderMontaze(data) {
  const m = data.montaze;
  document.getElementById('montaze-eyebrow').textContent = m.eyebrow;
  document.getElementById('montaze-title').textContent = m.title;
  document.getElementById('montaze-desc').textContent = m.description;

  const list = document.getElementById('montaze-list');
  list.innerHTML = '';
  m.list.forEach((item, i) => {
    list.appendChild(el('li', {}, [
      el('span', { class: 'num' }, [document.createTextNode(String(i + 1).padStart(2, '0'))]),
      el('span', {}, [document.createTextNode(item)])
    ]));
  });
}

function renderSkoleni(data) {
  const s = data.skoleni;
  document.getElementById('skoleni-eyebrow').textContent = s.eyebrow;
  document.getElementById('skoleni-title').textContent = s.title;
  document.getElementById('skoleni-desc').textContent = s.description;

  const grid = document.getElementById('skoleni-grid');
  grid.innerHTML = '';
  s.items.forEach(item => {
    grid.appendChild(el('div', { class: 'skoleni-card', 'data-reveal': '' }, [
      el('div', { class: 'skoleni-icon', html: getIcon(item.icon) }),
      el('h3', {}, [document.createTextNode(item.title)]),
      el('p', {}, [document.createTextNode(item.text)])
    ]));
  });
}

function renderServis(data) {
  const s = data.servis;
  document.getElementById('servis-eyebrow').textContent = s.eyebrow;
  document.getElementById('servis-title').textContent = s.title;
  document.getElementById('servis-text').textContent = s.text;

  const points = document.getElementById('servis-points');
  points.innerHTML = '';
  (s.points || []).forEach(p => {
    points.appendChild(el('div', { class: 'servis-point', 'data-reveal': '' }, [
      el('h3', {}, [document.createTextNode(p.title)]),
      el('p', {}, [document.createTextNode(p.description)])
    ]));
  });
}

function renderGallery(data) {
  const g = data.gallery;
  document.getElementById('gallery-eyebrow').textContent = g.eyebrow;
  document.getElementById('gallery-title').textContent = g.title;
  document.getElementById('gallery-subtitle').textContent = g.subtitle || '';

  const grid = document.getElementById('gallery-categories');
  grid.innerHTML = '';

  if (!g.categories || g.categories.length === 0) {
    grid.appendChild(el('div', { class: 'gallery-empty' }, [
      document.createTextNode('Zatím zde nejsou žádné kategorie fotografií. Přidejte je v administraci.')
    ]));
    return;
  }

  g.categories.forEach(cat => {
    const btn = el('button', { class: 'gallery-cat', type: 'button', 'data-reveal': '' }, [
      el('img', { src: cat.cover || (cat.images[0] && cat.images[0].src) || '', alt: cat.name, loading: 'lazy' }),
      el('div', { class: 'gallery-cat-overlay' }, [
        el('div', { class: 'cat-name' }, [document.createTextNode(cat.name)]),
        el('div', { class: 'cat-count' }, [document.createTextNode(`${(cat.images || []).length} fotografií`)])
      ])
    ]);
    btn.addEventListener('click', () => openGalleryAlbum(cat));
    grid.appendChild(btn);
  });

  // Lightbox close handlers
  const lightbox = document.getElementById('gallery-lightbox');
  document.getElementById('lightbox-close').innerHTML = getIcon('x');
  document.getElementById('lightbox-close').addEventListener('click', () => {
    lightbox.classList.remove('open');
  });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('open');
  });
}

function openGalleryAlbum(category) {
  const lightbox = document.getElementById('gallery-lightbox');
  document.getElementById('lightbox-title').textContent = category.name;
  const grid = document.getElementById('lightbox-grid');
  grid.innerHTML = '';
  (category.images || []).forEach(img => {
    grid.appendChild(el('img', { src: img.src, alt: img.alt || category.name, loading: 'lazy' }));
  });
  lightbox.classList.add('open');
}

function renderReference(data) {
  const r = data.reference;
  document.getElementById('reference-eyebrow').textContent = r.eyebrow;
  document.getElementById('reference-title').textContent = r.title;
  const subtitleEl = document.getElementById('reference-subtitle');
  if (subtitleEl) subtitleEl.textContent = r.subtitle || '';

  const grid = document.getElementById('reference-grid');
  grid.innerHTML = '';

  (r.items || []).forEach(item => {
    if (item.logo) {
      // Logo je nahrané — zobrazíme ho v dlaždici.
      grid.appendChild(el('div', { class: 'reference-tile has-logo', 'data-reveal': '' }, [
        el('img', { src: item.logo, alt: item.name || 'Logo partnera', loading: 'lazy' })
      ]));
    } else {
      // Logo zatím chybí — prázdná dlaždice jako placeholder pro budoucí nahrání v adminu.
      const children = [el('div', { html: getIcon('plus') })];
      if (item.name) children.push(el('div', { class: 'tile-label' }, [document.createTextNode(item.name)]));
      grid.appendChild(el('div', { class: 'reference-tile is-empty', 'data-reveal': '' }, children));
    }
  });
}

function renderFAQ(data) {
  const f = data.faq;
  document.getElementById('faq-eyebrow').textContent = f.eyebrow;
  document.getElementById('faq-title').textContent = f.title;

  const list = document.getElementById('faq-list');
  list.innerHTML = '';
  f.items.forEach(item => {
    const answer = el('div', { class: 'faq-answer' }, [
      el('p', {}, [document.createTextNode(item.answer)])
    ]);
    const question = el('button', { class: 'faq-question', type: 'button' }, [
      el('span', {}, [document.createTextNode(item.question)]),
      el('span', { class: 'icon' })
    ]);
    const wrap = el('div', { class: 'faq-item', 'data-reveal': '' }, [question, answer]);
    question.addEventListener('click', () => {
      const isOpen = wrap.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(x => {
        x.classList.remove('open');
        x.querySelector('.faq-answer').style.maxHeight = null;
      });
      if (!isOpen) {
        wrap.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
    list.appendChild(wrap);
  });
}

function renderContact(data) {
  const c = data.contact;
  document.getElementById('contact-eyebrow').textContent = c.eyebrow;
  document.getElementById('contact-title').textContent = c.title;
  document.getElementById('contact-subtitle').textContent = c.subtitle;

  const info = document.getElementById('contact-info');
  info.innerHTML = '';
  const items = [
    { label: 'Telefon', value: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}` },
    { label: 'E-mail', value: c.email, href: `mailto:${c.email}` },
    { label: 'Fakturační adresa', value: c.billingAddress },
    { label: 'Provozovna', value: c.operationAddress }
  ];
  items.forEach(it => {
    const valueNode = it.href
      ? el('a', { href: it.href }, [document.createTextNode(it.value)])
      : document.createTextNode(it.value);
    info.appendChild(el('div', { class: 'contact-info-item' }, [
      el('div', { class: 'label' }, [document.createTextNode(it.label)]),
      el('div', { class: 'value' }, [valueNode])
    ]));
  });

  const mapFrame = document.getElementById('contact-map-iframe');
  if (mapFrame && c.mapEmbed) {
    mapFrame.src = c.mapEmbed;
  } else if (mapFrame) {
    const query = encodeURIComponent(c.operationAddress || c.billingAddress || '');
    mapFrame.src = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }
}

function renderFooter(data) {
  const f = data.footer;
  document.getElementById('footer-name').textContent = f.companyName;
  document.getElementById('footer-tagline').textContent = f.tagline;
  document.getElementById('footer-copyright').textContent = f.copyright;

  const links = document.getElementById('footer-links');
  links.innerHTML = '';
  f.links.forEach(l => {
    links.appendChild(el('a', { href: l.href }, [document.createTextNode(l.label)]));
  });

  const adminIcon = document.getElementById('footer-admin-icon');
  if (adminIcon) adminIcon.innerHTML = getIcon('lock');

  const creditEl = document.getElementById('footer-credit');
  if (creditEl && f.credit) {
    creditEl.textContent = `${f.credit.text} ${f.credit.name}`;
    creditEl.setAttribute('href', f.credit.url);
  }
}

function setupNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    links.classList.toggle('open');
  });
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      toggle.classList.remove('open');
      links.classList.remove('open');
    }
  });
}

function setupScrollReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (IS_PREVIEW_MODE) {
    // V malém náhledovém okně admin panelu by opakované "zmizet a
    // nafadovat znovu" při každé úpravě jen rušivě blikalo — rovnou
    // vše zobrazíme.
    targets.forEach(t => t.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach(t => io.observe(t));
}

// Vykreslí (nebo znovu-vykreslí) celou stránku z dat. Používá se jak
// při běžném načtení webu, tak opakovaně v náhledovém režimu uvnitř
// admin panelu, pokaždé když přijde aktualizovaná data přes postMessage.
function renderAll(data, theme) {
  applyTheme(theme);
  renderSEO(data);
  renderNav(data);
  renderHero(data);
  renderAboutFirm(data);
  renderServices(data);
  renderRevize(data);
  renderMontaze(data);
  renderSkoleni(data);
  renderServis(data);
  renderGallery(data);
  renderReference(data);
  renderFAQ(data);
  renderContact(data);
  renderFooter(data);
  setupNavToggle();
  setupScrollReveal();

  // BorderGlow efekt na kartách služeb a školení (vanilla JS,
  // viz js/border-glow.js) — musí běžet až po vykreslení karet.
  if (typeof initBorderGlow === 'function') {
    initBorderGlow('.service-card', { edgeSensitivity: 35 });
    initBorderGlow('.skoleni-card', { edgeSensitivity: 35 });
  }

  // ClickSpark efekt pro celý web (vanilla JS, viz js/click-spark.js).
  // V náhledovém režimu (uvnitř admin iframe) se nespouští, aby při
  // každém překreslení nepřibýval další <canvas> navrch.
  if (!IS_PREVIEW_MODE && typeof initClickSpark === 'function') {
    initClickSpark({ sparkColor: '#2E9BF0', sparkCount: 8, sparkRadius: 20, duration: 420 });
  }
}

// Náhledový režim uvnitř admin panelu: web běží v <iframe> s ?preview=1
// v URL, nenačítá data ze souborů na disku, ale čeká na zprávy přes
// postMessage z rodičovského okna — díky tomu se každá změna v adminu
// (i bez uložení) hned promítne do vzhledu náhledu.
function initPreviewMode() {
  let lastData = null;
  let lastTheme = null;

  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'elrevmont-preview-update') return;
    lastData = event.data.content || lastData;
    lastTheme = event.data.theme || lastTheme;
    if (lastData) {
      try {
        renderAll(lastData, lastTheme);
      } catch (err) {
        console.error('Chyba při vykreslování náhledu:', err);
      }
    }
  });

  // Dáme rodičovskému oknu vědět, že náhled je připravený přijímat data
  // (řeší situaci, kdy admin odešle první zprávu dřív, než se iframe stihne načíst).
  if (window.parent) {
    window.parent.postMessage({ type: 'elrevmont-preview-ready' }, '*');
  }
}

(async function init() {
  if (IS_PREVIEW_MODE) {
    initPreviewMode();
    return;
  }
  try {
    const [data, theme] = await Promise.all([loadContent(), loadTheme()]);
    renderAll(data, theme);
  } catch (err) {
    console.error('Chyba při načítání obsahu webu:', err);
    document.body.innerHTML = '<div style="padding:80px;text-align:center;font-family:sans-serif">Nepodařilo se načíst obsah stránky. Zkuste to prosím později.</div>';
  }
})();
