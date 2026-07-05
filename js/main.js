/* =========================================================
   ELREVMONT — frontend renderer v2
   Veškerý obsah stránky se natahuje z /data/content.json.
   Nic není natvrdo v HTML — admin panel edituje tento JSON
   a frontend ho jen vykresluje.
   ========================================================= */

async function loadContent() {
  const res = await fetch('data/content.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Nepodařilo se načíst data/content.json');
  return res.json();
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
}

function renderHero(data) {
  const h = data.hero;
  document.getElementById('hero-eyebrow').textContent = h.eyebrowTag;
  document.getElementById('hero-title').textContent = h.title;
  document.getElementById('hero-subtitle').textContent = h.subtitle;

  if (h.backgroundImage) {
    document.getElementById('hero-bg').style.backgroundImage = `url('${h.backgroundImage}')`;
  }

  const phoneBtn = document.getElementById('hero-btn-phone');
  phoneBtn.innerHTML = getIcon('phone') + `<span>${h.phone}</span>`;
  phoneBtn.setAttribute('href', `tel:${h.phone.replace(/\s/g, '')}`);

  const emailBtn = document.getElementById('hero-btn-email');
  emailBtn.innerHTML = getIcon('mail') + `<span>${h.email}</span>`;
  emailBtn.setAttribute('href', `mailto:${h.email}`);

  const cue = document.getElementById('hero-scroll-cue');
  cue.innerHTML = getIcon('arrow-down');
  cue.setAttribute('title', h.scrollCueText || '');
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

  const row1 = document.getElementById('marquee-row-1');
  const row2 = document.getElementById('marquee-row-2');
  row1.innerHTML = '';
  row2.innerHTML = '';

  if (!r.items || r.items.length === 0) return;

  // Rozdělíme reference do dvou řad a duplikujeme obsah pro plynulou nekonečnou smyčku.
  const half = Math.ceil(r.items.length / 2);
  const firstRow = r.items.slice(0, half);
  const secondRow = r.items.length > half ? r.items.slice(half) : r.items;

  function buildCard(item) {
    return el('div', { class: 'reference-card' }, [
      el('div', { class: 'ref-name' }, [document.createTextNode(item.name)]),
      el('div', { class: 'ref-text' }, [document.createTextNode(item.text)])
    ]);
  }

  [firstRow, firstRow].forEach(set => set.forEach(item => row1.appendChild(buildCard(item))));
  [secondRow, secondRow].forEach(set => set.forEach(item => row2.appendChild(buildCard(item))));
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

(async function init() {
  try {
    const data = await loadContent();
    renderSEO(data);
    renderNav(data);
    renderHero(data);
    renderAboutFirm(data);
    renderServices(data);
    renderRevize(data);
    renderMontaze(data);
    renderSkoleni(data);
    renderGallery(data);
    renderReference(data);
    renderContact(data);
    renderFooter(data);
    setupNavToggle();
    setupScrollReveal();
  } catch (err) {
    console.error('Chyba při načítání obsahu webu:', err);
    document.body.innerHTML = '<div style="padding:80px;text-align:center;font-family:sans-serif">Nepodařilo se načíst obsah stránky. Zkuste to prosím později.</div>';
  }
})();
