/* =========================================================
   ELREVMONT — frontend renderer
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
  const links = document.getElementById('nav-links');
  links.innerHTML = '';
  data.nav.links.forEach(l => {
    links.appendChild(el('a', { href: l.href }, [document.createTextNode(l.label)]));
  });
  document.getElementById('nav-cta').textContent = data.nav.ctaLabel;
}

function renderHero(data) {
  const h = data.hero;
  document.getElementById('hero-eyebrow').textContent = h.eyebrow;
  document.getElementById('hero-title').textContent = h.title;
  document.getElementById('hero-subtitle').textContent = h.subtitle;

  const btnP = document.getElementById('hero-btn-primary');
  btnP.textContent = h.primaryButton.label;
  btnP.setAttribute('href', h.primaryButton.href);

  const btnS = document.getElementById('hero-btn-secondary');
  btnS.textContent = h.secondaryButton.label;
  btnS.setAttribute('href', h.secondaryButton.href);

  if (h.backgroundImage) {
    document.getElementById('hero-bg').style.backgroundImage = `url('${h.backgroundImage}')`;
  }

  const stats = document.getElementById('hero-stats');
  stats.innerHTML = '';
  h.stats.forEach(s => {
    stats.appendChild(el('div', { class: 'stat' }, [
      el('div', { class: 'stat-value' }, [document.createTextNode(s.value)]),
      el('div', { class: 'stat-label' }, [document.createTextNode(s.label)])
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
  document.getElementById('revize-title').textContent = r.title;
  document.getElementById('revize-intro').textContent = r.intro;

  const types = document.getElementById('revize-types');
  types.innerHTML = '';
  r.types.forEach(t => {
    types.appendChild(el('div', { class: 'revize-type', 'data-reveal': '' }, [
      el('h3', {}, [document.createTextNode(t.title)]),
      el('p', {}, [document.createTextNode(t.description)])
    ]));
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

function renderWhyUs(data) {
  const w = data.whyUs;
  document.getElementById('whyus-eyebrow').textContent = w.eyebrow;
  document.getElementById('whyus-title').textContent = w.title;

  const grid = document.getElementById('whyus-grid');
  grid.innerHTML = '';
  w.cards.forEach(c => {
    grid.appendChild(el('div', { class: 'why-card', 'data-reveal': '' }, [
      el('div', { class: 'why-icon', html: getIcon(c.icon) }),
      el('h3', {}, [document.createTextNode(c.title)]),
      el('p', {}, [document.createTextNode(c.text)])
    ]));
  });
}

function renderTimeline(data) {
  const t = data.timeline;
  document.getElementById('timeline-eyebrow').textContent = t.eyebrow;
  document.getElementById('timeline-title').textContent = t.title;

  const list = document.getElementById('timeline-list');
  list.innerHTML = '';
  t.steps.forEach((s, i) => {
    list.appendChild(el('div', { class: 'timeline-step', 'data-reveal': '' }, [
      el('div', { class: 'timeline-num' }, [document.createTextNode(String(i + 1).padStart(2, '0'))]),
      el('div', {}, [
        el('h3', {}, [document.createTextNode(s.title)]),
        el('p', {}, [document.createTextNode(s.description)])
      ])
    ]));
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

function renderGallery(data) {
  const g = data.gallery;
  document.getElementById('gallery-eyebrow').textContent = g.eyebrow;
  document.getElementById('gallery-title').textContent = g.title;

  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';
  g.images.forEach(img => {
    grid.appendChild(el('img', { src: img.src, alt: img.alt, loading: 'lazy', 'data-reveal': '' }));
  });
}

function renderAbout(data) {
  const a = data.about;
  document.getElementById('about-eyebrow').textContent = a.eyebrow;
  document.getElementById('about-title').textContent = a.title;
  document.getElementById('about-text').textContent = a.text;
  const img = document.getElementById('about-img');
  img.src = a.image;
  img.alt = a.title;
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

  const labels = c.formLabels;
  document.getElementById('label-name').textContent = labels.name;
  document.getElementById('label-email').textContent = labels.email;
  document.getElementById('label-phone').textContent = labels.phone;
  document.getElementById('label-message').textContent = labels.message;
  document.getElementById('form-submit').textContent = labels.submit;
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

function setupContactForm() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Poznámka: bez backendu formulář jen potvrdí odeslání lokálně.
    // Pro reálné odesílání e-mailů lze napojit vlastní /api/contact endpoint.
    status.textContent = 'Děkujeme, poptávku jsme zaznamenali. Ozveme se co nejdříve.';
    status.className = 'form-status success';
    form.reset();
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
    renderServices(data);
    renderRevize(data);
    renderMontaze(data);
    renderWhyUs(data);
    renderTimeline(data);
    renderGallery(data);
    renderAbout(data);
    renderFAQ(data);
    renderContact(data);
    renderFooter(data);
    setupContactForm();
    setupNavToggle();
    setupScrollReveal();
  } catch (err) {
    console.error('Chyba při načítání obsahu webu:', err);
    document.body.innerHTML = '<div style="padding:80px;text-align:center;font-family:sans-serif">Nepodařilo se načíst obsah stránky. Zkuste to prosím později.</div>';
  }
})();
