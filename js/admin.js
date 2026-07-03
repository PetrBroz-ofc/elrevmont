/* =========================================================
   ELREVMONT — Admin panel
   Edituje veškerý obsah, který index.html natahuje z
   data/content.json a data/theme.json. Ukládání jde přes
   /api/save (Vercel serverless), který commituje do GitHubu.
   GitHub token nikdy neopouští server.
   ========================================================= */

const SESSION_KEY = 'elrevmont_admin_token';
let CONTENT = null;
let THEME = null;
let ACTIVE_TAB = 'hero';

// ---------- Auth ----------

function getToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

function setToken(token) {
  sessionStorage.setItem(SESSION_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

async function login(password) {
  const res = await fetch('api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Přihlášení selhalo.');
  return data.token;
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  try {
    const token = await login(password);
    setToken(token);
    await boot();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearToken();
  location.reload();
});

// ---------- Data loading ----------

async function loadData() {
  const [contentRes, themeRes] = await Promise.all([
    fetch('data/content.json', { cache: 'no-store' }),
    fetch('data/theme.json', { cache: 'no-store' })
  ]);
  CONTENT = await contentRes.json();
  THEME = await themeRes.json();
}

// ---------- Small DOM helpers ----------

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

function field(labelText, inputEl, hint) {
  const group = el('div', { class: 'field-group' }, [
    el('label', {}, [document.createTextNode(labelText)]),
    inputEl
  ]);
  if (hint) group.appendChild(el('div', { class: 'field-hint' }, [document.createTextNode(hint)]));
  return group;
}

function textInput(value, onChange, placeholder = '') {
  const input = el('input', { type: 'text', placeholder });
  input.value = value || '';
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

function textArea(value, onChange, placeholder = '') {
  const input = el('textarea', { placeholder });
  input.value = value || '';
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

function urlInput(value, onChange, placeholder = '') {
  const input = el('input', { type: 'text', placeholder });
  input.value = value || '';
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

// Generic helper to render a repeatable list of objects (services, faq items, etc.)
function renderRepeater({ container, items, itemLabel, fieldsConfig, onAdd, onRemove }) {
  container.innerHTML = '';
  items.forEach((item, index) => {
    const itemBody = el('div', {});
    fieldsConfig.forEach(cfg => {
      itemBody.appendChild(cfg.render(item, index));
    });

    const removeBtn = el('button', { class: 'btn-small danger', type: 'button' }, [document.createTextNode('Odebrat')]);
    removeBtn.addEventListener('click', () => onRemove(index));

    const head = el('div', { class: 'repeater-item-head' }, [
      el('span', { class: 'tag' }, [document.createTextNode(`${itemLabel} ${index + 1}`)]),
      removeBtn
    ]);

    container.appendChild(el('div', { class: 'repeater-item' }, [head, itemBody]));
  });

  const addBtn = el('button', { class: 'add-item-btn', type: 'button' }, [document.createTextNode(`+ Přidat (${itemLabel.toLowerCase()})`)]);
  addBtn.addEventListener('click', onAdd);
  container.appendChild(addBtn);
}

// ---------- Tab panel renderers ----------

const TABS = {
  hero: { title: 'Hero sekce', render: renderHeroTab },
  services: { title: 'Služby', render: renderServicesTab },
  revize: { title: 'Revize', render: renderRevizeTab },
  montaze: { title: 'Montáže', render: renderMontazeTab },
  whyus: { title: 'Proč my', render: renderWhyUsTab },
  timeline: { title: 'Postup spolupráce', render: renderTimelineTab },
  faq: { title: 'Časté dotazy', render: renderFaqTab },
  gallery: { title: 'Galerie', render: renderGalleryTab },
  about: { title: 'O nás', render: renderAboutTab },
  contact: { title: 'Kontakt', render: renderContactTab },
  footer: { title: 'Footer', render: renderFooterTab },
  nav: { title: 'Hlavní menu', render: renderNavTab },
  seo: { title: 'SEO', render: renderSeoTab },
  theme: { title: 'Vzhled', render: renderThemeTab }
};

function renderHeroTab(root) {
  const h = CONTENT.hero;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Úvodní sekce s hlavním nadpisem, popiskem a tlačítky, kterou návštěvník vidí jako první.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow (malý text nad nadpisem)', textInput(h.eyebrow, v => h.eyebrow = v)));
  panel.appendChild(field('Hlavní nadpis', textArea(h.title, v => h.title = v), 'Nový řádek v textu = zalomení řádku na webu.'));
  panel.appendChild(field('Podnadpis', textArea(h.subtitle, v => h.subtitle = v)));

  const row = el('div', { class: 'field-row' });
  row.appendChild(field('Text hlavního tlačítka', textInput(h.primaryButton.label, v => h.primaryButton.label = v)));
  row.appendChild(field('Odkaz hlavního tlačítka', textInput(h.primaryButton.href, v => h.primaryButton.href = v)));
  panel.appendChild(row);

  const row2 = el('div', { class: 'field-row' });
  row2.appendChild(field('Text vedlejšího tlačítka', textInput(h.secondaryButton.label, v => h.secondaryButton.label = v)));
  row2.appendChild(field('Odkaz vedlejšího tlačítka', textInput(h.secondaryButton.href, v => h.secondaryButton.href = v)));
  panel.appendChild(row2);

  panel.appendChild(field('Cesta k pozadí (obrázek)', textInput(h.backgroundImage, v => h.backgroundImage = v), 'Např. assets/img/hero-bg.jpg'));
  root.appendChild(panel);

  const statsPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Statistiky (3 čísla v hero sekci)')])])
  ]);
  const statsContainer = el('div');
  statsPanel.appendChild(statsContainer);
  root.appendChild(statsPanel);

  function redrawStats() {
    renderRepeater({
      container: statsContainer,
      items: h.stats,
      itemLabel: 'Statistika',
      fieldsConfig: [
        { render: (item) => field('Hodnota', textInput(item.value, v => item.value = v)) },
        { render: (item) => field('Popisek', textInput(item.label, v => item.label = v)) }
      ],
      onAdd: () => { h.stats.push({ value: '', label: '' }); redrawStats(); },
      onRemove: (i) => { h.stats.splice(i, 1); redrawStats(); }
    });
  }
  redrawStats();
}

function renderServicesTab(root) {
  const s = CONTENT.services;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Karty jednotlivých služeb (revize, montáže, servis, školení...).')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(s.eyebrow, v => s.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(s.title, v => s.title = v)));
  panel.appendChild(field('Podnadpis', textArea(s.subtitle, v => s.subtitle = v)));
  root.appendChild(panel);

  const iconOptions = ['bolt', 'plug', 'shield-bolt', 'tool', 'wrench', 'graduation-cap', 'certificate', 'clock', 'file-check', 'map-pin'];
  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Jednotlivé služby')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: s.items,
      itemLabel: 'Služba',
      fieldsConfig: [
        { render: (item) => field('Název', textInput(item.title, v => item.title = v)) },
        { render: (item) => field('Popis', textArea(item.description, v => item.description = v)) },
        { render: (item) => {
          const select = el('select');
          iconOptions.forEach(opt => {
            const optionEl = el('option', { value: opt }, [document.createTextNode(opt)]);
            if (opt === item.icon) optionEl.setAttribute('selected', 'selected');
            select.appendChild(optionEl);
          });
          select.addEventListener('change', () => item.icon = select.value);
          return field('Ikona', select);
        }}
      ],
      onAdd: () => { s.items.push({ icon: 'bolt', title: '', description: '' }); redraw(); },
      onRemove: (i) => { s.items.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderRevizeTab(root) {
  const r = CONTENT.revize;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Sekce vysvětlující druhy revizí, objekty a související legislativu.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(r.eyebrow, v => r.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(r.title, v => r.title = v)));
  panel.appendChild(field('Úvodní text', textArea(r.intro, v => r.intro = v)));
  root.appendChild(panel);

  const typesPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Druhy revizí')])])
  ]);
  const typesContainer = el('div');
  typesPanel.appendChild(typesContainer);
  root.appendChild(typesPanel);

  function redrawTypes() {
    renderRepeater({
      container: typesContainer,
      items: r.types,
      itemLabel: 'Druh revize',
      fieldsConfig: [
        { render: (item) => field('Název', textInput(item.title, v => item.title = v)) },
        { render: (item) => field('Popis', textArea(item.description, v => item.description = v)) }
      ],
      onAdd: () => { r.types.push({ title: '', description: '' }); redrawTypes(); },
      onRemove: (i) => { r.types.splice(i, 1); redrawTypes(); }
    });
  }
  redrawTypes();

  const objPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Objekty, na kterých revidujeme')])])
  ]);
  objPanel.appendChild(field('Nadpis seznamu', textInput(r.objects.title, v => r.objects.title = v)));
  const objContainer = el('div');
  objPanel.appendChild(objContainer);
  root.appendChild(objPanel);

  function redrawObjects() {
    renderRepeater({
      container: objContainer,
      items: r.objects.list.map(v => ({ value: v })),
      itemLabel: 'Objekt',
      fieldsConfig: [
        { render: (item, index) => field('Text', textInput(item.value, v => r.objects.list[index] = v)) }
      ],
      onAdd: () => { r.objects.list.push(''); redrawObjects(); },
      onRemove: (i) => { r.objects.list.splice(i, 1); redrawObjects(); }
    });
  }
  redrawObjects();

  const legisPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Související legislativa')])])
  ]);
  legisPanel.appendChild(field('Nadpis seznamu', textInput(r.legislation.title, v => r.legislation.title = v)));
  const legisContainer = el('div');
  legisPanel.appendChild(legisContainer);
  root.appendChild(legisPanel);

  function redrawLegis() {
    renderRepeater({
      container: legisContainer,
      items: r.legislation.list.map(v => ({ value: v })),
      itemLabel: 'Předpis',
      fieldsConfig: [
        { render: (item, index) => field('Text', textInput(item.value, v => r.legislation.list[index] = v)) }
      ],
      onAdd: () => { r.legislation.list.push(''); redrawLegis(); },
      onRemove: (i) => { r.legislation.list.splice(i, 1); redrawLegis(); }
    });
  }
  redrawLegis();
}

function renderMontazeTab(root) {
  const m = CONTENT.montaze;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Sekce montáží a oprav elektro.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(m.eyebrow, v => m.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(m.title, v => m.title = v)));
  panel.appendChild(field('Popis', textArea(m.description, v => m.description = v)));
  root.appendChild(panel);

  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Seznam typů objektů')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: m.list.map(v => ({ value: v })),
      itemLabel: 'Položka',
      fieldsConfig: [
        { render: (item, index) => field('Text', textInput(item.value, v => m.list[index] = v)) }
      ],
      onAdd: () => { m.list.push(''); redraw(); },
      onRemove: (i) => { m.list.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderWhyUsTab(root) {
  const w = CONTENT.whyUs;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Karty "Proč zvolit nás" — čtveřice argumentů.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(w.eyebrow, v => w.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(w.title, v => w.title = v)));
  root.appendChild(panel);

  const iconOptions = ['certificate', 'clock', 'file-check', 'map-pin', 'bolt', 'shield-bolt', 'tool', 'wrench'];
  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Karty')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: w.cards,
      itemLabel: 'Karta',
      fieldsConfig: [
        { render: (item) => field('Název', textInput(item.title, v => item.title = v)) },
        { render: (item) => field('Text', textArea(item.text, v => item.text = v)) },
        { render: (item) => {
          const select = el('select');
          iconOptions.forEach(opt => {
            const optionEl = el('option', { value: opt }, [document.createTextNode(opt)]);
            if (opt === item.icon) optionEl.setAttribute('selected', 'selected');
            select.appendChild(optionEl);
          });
          select.addEventListener('change', () => item.icon = select.value);
          return field('Ikona', select);
        }}
      ],
      onAdd: () => { w.cards.push({ icon: 'bolt', title: '', text: '' }); redraw(); },
      onRemove: (i) => { w.cards.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderTimelineTab(root) {
  const t = CONTENT.timeline;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Kroky spolupráce zobrazené jako časová osa.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(t.eyebrow, v => t.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(t.title, v => t.title = v)));
  root.appendChild(panel);

  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Kroky')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: t.steps,
      itemLabel: 'Krok',
      fieldsConfig: [
        { render: (item) => field('Název kroku', textInput(item.title, v => item.title = v)) },
        { render: (item) => field('Popis', textArea(item.description, v => item.description = v)) }
      ],
      onAdd: () => { t.steps.push({ title: '', description: '' }); redraw(); },
      onRemove: (i) => { t.steps.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderFaqTab(root) {
  const f = CONTENT.faq;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Časté dotazy zobrazené jako rozklikávací seznam.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(f.eyebrow, v => f.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(f.title, v => f.title = v)));
  root.appendChild(panel);

  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Otázky a odpovědi')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: f.items,
      itemLabel: 'Dotaz',
      fieldsConfig: [
        { render: (item) => field('Otázka', textInput(item.question, v => item.question = v)) },
        { render: (item) => field('Odpověď', textArea(item.answer, v => item.answer = v)) }
      ],
      onAdd: () => { f.items.push({ question: '', answer: '' }); redraw(); },
      onRemove: (i) => { f.items.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderGalleryTab(root) {
  const g = CONTENT.gallery;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Fotografie z realizací. Nahrajte obrázky do assets/img a zde zadejte cestu k souboru.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(g.eyebrow, v => g.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(g.title, v => g.title = v)));
  root.appendChild(panel);

  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Obrázky')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: g.images,
      itemLabel: 'Obrázek',
      fieldsConfig: [
        { render: (item) => field('Cesta k souboru', textInput(item.src, v => item.src = v), 'Např. assets/img/gallery-1.jpg') },
        { render: (item) => field('Alt text (popis pro SEO)', textInput(item.alt, v => item.alt = v)) }
      ],
      onAdd: () => { g.images.push({ src: '', alt: '' }); redraw(); },
      onRemove: (i) => { g.images.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderAboutTab(root) {
  const a = CONTENT.about;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Sekce "O nás" s fotografií.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(a.eyebrow, v => a.eyebrow = v)));
  panel.appendChild(field('Nadpis', textInput(a.title, v => a.title = v)));
  panel.appendChild(field('Text', textArea(a.text, v => a.text = v)));
  panel.appendChild(field('Cesta k fotografii', textInput(a.image, v => a.image = v), 'Např. assets/img/about.jpg'));
  root.appendChild(panel);
}

function renderContactTab(root) {
  const c = CONTENT.contact;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Kontaktní údaje a texty kontaktního formuláře.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(c.eyebrow, v => c.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(c.title, v => c.title = v)));
  panel.appendChild(field('Podnadpis', textArea(c.subtitle, v => c.subtitle = v)));

  const row = el('div', { class: 'field-row' });
  row.appendChild(field('Telefon', textInput(c.phone, v => c.phone = v)));
  row.appendChild(field('E-mail', textInput(c.email, v => c.email = v)));
  panel.appendChild(row);

  panel.appendChild(field('Fakturační adresa', textInput(c.billingAddress, v => c.billingAddress = v)));
  panel.appendChild(field('Provozovna', textInput(c.operationAddress, v => c.operationAddress = v)));
  panel.appendChild(field('IČO', textInput(c.ico, v => c.ico = v)));
  root.appendChild(panel);

  const formPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Texty formuláře')])])
  ]);
  const labels = c.formLabels;
  formPanel.appendChild(field('Jméno (label)', textInput(labels.name, v => labels.name = v)));
  formPanel.appendChild(field('E-mail (label)', textInput(labels.email, v => labels.email = v)));
  formPanel.appendChild(field('Telefon (label)', textInput(labels.phone, v => labels.phone = v)));
  formPanel.appendChild(field('Zpráva (label)', textInput(labels.message, v => labels.message = v)));
  formPanel.appendChild(field('Text tlačítka odeslat', textInput(labels.submit, v => labels.submit = v)));
  root.appendChild(formPanel);
}

function renderFooterTab(root) {
  const f = CONTENT.footer;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Patička webu.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Název firmy', textInput(f.companyName, v => f.companyName = v)));
  panel.appendChild(field('Slogan', textInput(f.tagline, v => f.tagline = v)));
  panel.appendChild(field('Copyright text', textInput(f.copyright, v => f.copyright = v)));
  root.appendChild(panel);

  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Odkazy v patičce')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: f.links,
      itemLabel: 'Odkaz',
      fieldsConfig: [
        { render: (item) => field('Text', textInput(item.label, v => item.label = v)) },
        { render: (item) => field('Cíl (#kotva nebo URL)', textInput(item.href, v => item.href = v)) }
      ],
      onAdd: () => { f.links.push({ label: '', href: '' }); redraw(); },
      onRemove: (i) => { f.links.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderNavTab(root) {
  const n = CONTENT.nav;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Horní navigační menu.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Logo (text)', textInput(n.logo, v => n.logo = v)));
  panel.appendChild(field('Text CTA tlačítka', textInput(n.ctaLabel, v => n.ctaLabel = v)));
  root.appendChild(panel);

  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Položky menu')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: n.links,
      itemLabel: 'Položka',
      fieldsConfig: [
        { render: (item) => field('Text', textInput(item.label, v => item.label = v)) },
        { render: (item) => field('Kotva (#sekce)', textInput(item.href, v => item.href = v)) }
      ],
      onAdd: () => { n.links.push({ label: '', href: '' }); redraw(); },
      onRemove: (i) => { n.links.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderSeoTab(root) {
  const s = CONTENT.seo;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Meta údaje pro vyhledávače a sociální sítě.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Titulek stránky (title)', textInput(s.title, v => s.title = v)));
  panel.appendChild(field('Meta popis (description)', textArea(s.description, v => s.description = v)));
  panel.appendChild(field('Klíčová slova (keywords)', textArea(s.keywords, v => s.keywords = v)));
  panel.appendChild(field('OG obrázek (pro sdílení na sítích)', textInput(s.ogImage, v => s.ogImage = v)));
  root.appendChild(panel);
}

function renderThemeTab(root) {
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Barvy a fonty webu. Změny se projeví po uložení a znovunačtení webu.')]));

  const panel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Barvy')])])
  ]);
  const colorLabels = {
    bg: 'Tmavé pozadí (primární)',
    bgLight: 'Světlé pozadí',
    accent: 'Akcentní barva',
    accentDark: 'Akcentní barva (tmavší)',
    steel: 'Šedá pro texty',
    safe: 'Zelená (OK stavy)',
    textLight: 'Text na tmavém pozadí',
    textDark: 'Text na světlém pozadí'
  };
  Object.entries(THEME.colors).forEach(([key, value]) => {
    const row = el('div', { class: 'theme-swatch-row' });
    const colorPicker = el('input', { type: 'color' });
    colorPicker.value = value;
    const textField = el('input', { type: 'text' });
    textField.value = value;
    colorPicker.addEventListener('input', () => { textField.value = colorPicker.value; THEME.colors[key] = colorPicker.value; });
    textField.addEventListener('input', () => { THEME.colors[key] = textField.value; });
    row.appendChild(colorPicker);
    row.appendChild(textField);
    panel.appendChild(field(colorLabels[key] || key, row));
  });
  root.appendChild(panel);

  const fontPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Fonty')])])
  ]);
  fontPanel.appendChild(field('Nadpisový font (display)', textInput(THEME.fonts.display, v => THEME.fonts.display = v)));
  fontPanel.appendChild(field('Textový font (body)', textInput(THEME.fonts.body, v => THEME.fonts.body = v)));
  fontPanel.appendChild(field('Mono font (čísla norem)', textInput(THEME.fonts.mono, v => THEME.fonts.mono = v)));
  root.appendChild(fontPanel);

  root.appendChild(el('p', { class: 'field-hint' }, [document.createTextNode('Pozn.: Změna fontu zde vyžaduje, aby byl daný font dostupný i v css/style.css (Google Fonts import).')]));
}

// ---------- Tab switching ----------

function switchTab(tabKey) {
  ACTIVE_TAB = tabKey;
  document.querySelectorAll('#admin-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabKey);
  });
  document.getElementById('admin-tab-title').textContent = TABS[tabKey].title;
  const content = document.getElementById('admin-content');
  content.innerHTML = '';
  TABS[tabKey].render(content);
}

document.getElementById('admin-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  switchTab(btn.dataset.tab);
});

// ---------- Saving ----------

async function saveFile(file, contentObj, message) {
  const res = await fetch('api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      file,
      content: JSON.stringify(contentObj, null, 2),
      message
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Uložení selhalo.');
  return data;
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const status = document.getElementById('save-status');
  status.textContent = 'Ukládám…';
  status.className = 'save-status';
  try {
    await saveFile('data/content.json', CONTENT, `Admin: aktualizace obsahu (${ACTIVE_TAB})`);
    await saveFile('data/theme.json', THEME, 'Admin: aktualizace vzhledu');
    status.textContent = 'Uloženo ✓';
    status.className = 'save-status success';
    setTimeout(() => { status.textContent = ''; }, 4000);
  } catch (err) {
    status.textContent = 'Chyba: ' + err.message;
    status.className = 'save-status error';
  }
});

// ---------- Boot ----------

async function boot() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('admin-app').hidden = false;
  await loadData();
  switchTab(ACTIVE_TAB);
}

(async function initAdmin() {
  if (getToken()) {
    try {
      await boot();
      return;
    } catch (err) {
      clearToken();
    }
  }
  document.getElementById('login-screen').hidden = false;
  document.getElementById('admin-app').hidden = true;
})();
