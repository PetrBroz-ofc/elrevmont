/* =========================================================
   ELREVMONT — Admin panel v2
   Edituje veškerý obsah, který index.html natahuje z
   data/content.json a data/theme.json. Ukládání jde přes
   /api/save (Vercel serverless), který commituje do GitHubu.
   Obrázky do galerie jdou přes /api/upload-image.
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

// ---------- Image upload helper (pro galerii) ----------

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file, folder = 'gallery') {
  const base64Data = await fileToBase64(file);
  const res = await fetch('api/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({ fileName: file.name, base64Data, folder })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Nahrání obrázku selhalo.');
  return data.path;
}

// Vytvoří tlačítko "Nahrát fotku" s file inputem, náhledem a stavovým hlášením.
// Po výběru souboru se otevře editor obrázků (oříznutí, jas/kontrast,
// otočení, změna velikosti) — teprve výsledek z editoru se nahraje na server.
// onUploaded(path) se zavolá po úspěšném nahrání s cestou k souboru v repu.
function imageUploadButton(onUploaded, label = '+ Nahrát fotku') {
  const wrap = el('div', { class: 'image-upload' });
  const input = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', style: 'display:none' });
  const btn = el('button', { class: 'btn-small', type: 'button' }, [document.createTextNode(label)]);
  const status = el('span', { class: 'upload-status' });

  async function handleEditedFile(editedFile) {
    status.textContent = 'Nahrávám…';
    btn.setAttribute('disabled', 'disabled');
    try {
      const path = await uploadImage(editedFile);
      status.textContent = 'Nahráno ✓';
      onUploaded(path);
      setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (err) {
      status.textContent = 'Chyba: ' + err.message;
    } finally {
      btn.removeAttribute('disabled');
    }
  }

  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (typeof openImageEditor === 'function') {
      openImageEditor(file, {
        onConfirm: (editedFile) => { input.value = ''; handleEditedFile(editedFile); },
        onCancel: () => { input.value = ''; }
      });
    } else {
      // Záložní chování, kdyby se editor z nějakého důvodu nenačetl —
      // nahraje se rovnou originální soubor beze změn.
      input.value = '';
      handleEditedFile(file);
    }
  });

  wrap.appendChild(input);
  wrap.appendChild(btn);
  wrap.appendChild(status);
  return wrap;
}

// ---------- Tab panel renderers ----------

const TABS = {
  hero: { title: 'Hero sekce', render: renderHeroTab },
  aboutfirm: { title: 'O firmě', render: renderAboutFirmTab },
  services: { title: 'Služby', render: renderServicesTab },
  revize: { title: 'Revize', render: renderRevizeTab },
  montaze: { title: 'Montáže', render: renderMontazeTab },
  skoleni: { title: 'Školení', render: renderSkoleniTab },
  servis: { title: 'Servis', render: renderServisTab },
  gallery: { title: 'Galerie', render: renderGalleryTab },
  reference: { title: 'Reference', render: renderReferenceTab },
  faq: { title: 'FAQ', render: renderFaqTab },
  contact: { title: 'Kontakt', render: renderContactTab },
  footer: { title: 'Footer', render: renderFooterTab },
  nav: { title: 'Hlavní menu', render: renderNavTab },
  seo: { title: 'SEO', render: renderSeoTab },
  theme: { title: 'Vzhled', render: renderThemeTab }
};

function renderHeroTab(root) {
  const h = CONTENT.hero;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Úvodní sekce s animovanými vlnitými čarami na pozadí, hlavním nadpisem (rozepíše se písmeno po písmenu) a kontakty (telefon, e-mail).')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Malý text nad nadpisem', textInput(h.eyebrowTag, v => h.eyebrowTag = v), 'Např. jméno a obor firmy.'));

  const titleField = field('Hlavní nadpis', textArea(h.title, v => { h.title = v; redrawHighlightPanel(); }), 'Nový řádek v textu = zalomení řádku na webu.');
  panel.appendChild(titleField);
  panel.appendChild(field('Podnadpis', textArea(h.subtitle, v => h.subtitle = v)));

  const row = el('div', { class: 'field-row' });
  row.appendChild(field('Telefon (zobrazí se jako tlačítko)', textInput(h.phone, v => h.phone = v)));
  row.appendChild(field('E-mail (zobrazí se jako tlačítko)', textInput(h.email, v => h.email = v)));
  panel.appendChild(row);

  panel.appendChild(field('Text nápovědy ke scrollování', textInput(h.scrollCueText, v => h.scrollCueText = v)));
  root.appendChild(panel);

  // ---------- Barevné zvýraznění písmen v nadpisu ----------
  const highlightPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Barevné zvýraznění v nadpisu')])])
  ]);
  highlightPanel.appendChild(el('p', { class: 'field-hint', style: 'margin-bottom:16px' }, [
    document.createTextNode('U každého slova nastav, kolik prvních písmen se má zbarvit červeně (0 = beze změny). Náhled dole ukazuje aktuální výsledek.')
  ]));
  const highlightContainer = el('div');
  const previewEl = el('div', { class: 'hero-highlight-preview' });
  highlightPanel.appendChild(highlightContainer);
  highlightPanel.appendChild(previewEl);
  root.appendChild(highlightPanel);

  function getWords() {
    // Stejná logika jako v js/hero-paths.js: rozdělíme podle řádků a mezer,
    // ať pole sedí přesně na slova tak, jak se skutečně vykreslí na webu.
    return h.title.split('\n').flatMap(line => line.split(' ').filter(Boolean));
  }

  function redrawHighlightPanel() {
    const words = getWords();
    if (!Array.isArray(h.titleHighlightCounts)) h.titleHighlightCounts = [];
    // Zarovnáme délku pole počtů s aktuálním počtem slov (nové slovo = 0, přebytečné zahodíme).
    h.titleHighlightCounts = words.map((_, i) => h.titleHighlightCounts[i] || 0);

    highlightContainer.innerHTML = '';
    words.forEach((word, i) => {
      const row2 = el('div', { class: 'field-row hero-highlight-row' });
      const wordLabel = el('div', { class: 'hero-highlight-word' }, [document.createTextNode(`„${word}“`)]);
      const countInput = el('input', { type: 'number', min: '0', max: String(word.length) });
      countInput.value = String(Math.min(h.titleHighlightCounts[i], word.length));
      countInput.addEventListener('input', () => {
        const val = Math.max(0, Math.min(Number(countInput.value) || 0, word.length));
        h.titleHighlightCounts[i] = val;
        updatePreview();
      });
      row2.appendChild(el('div', { class: 'field-group' }, [el('label', {}, [document.createTextNode('Slovo')]), wordLabel]));
      row2.appendChild(el('div', { class: 'field-group' }, [el('label', {}, [document.createTextNode('Počet zvýrazněných písmen')]), countInput]));
      highlightContainer.appendChild(row2);
    });

    updatePreview();
  }

  function updatePreview() {
    const words = getWords();
    previewEl.innerHTML = '';
    words.forEach((word, i) => {
      const count = h.titleHighlightCounts[i] || 0;
      const highlighted = word.slice(0, count);
      const rest = word.slice(count);
      if (highlighted) previewEl.appendChild(el('span', { class: 'hero-highlight-red' }, [document.createTextNode(highlighted)]));
      if (rest) previewEl.appendChild(document.createTextNode(rest));
      if (i < words.length - 1) previewEl.appendChild(document.createTextNode(' '));
    });
  }

  redrawHighlightPanel();

  const bgPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Záložní obrázek (nepovinné)')])])
  ]);
  const bgField = field('Cesta k obrázku na pozadí', textInput(h.backgroundImage, v => { h.backgroundImage = v; }), 'Např. assets/img/hero-bg.jpg — momentálně se nezobrazuje, hero používá gradient a animované čáry.');
  bgPanel.appendChild(bgField);
  bgPanel.appendChild(imageUploadButton((path) => {
    h.backgroundImage = path;
    switchTab('hero');
  }, '+ Nahrát novou fotku pozadí'));
  root.appendChild(bgPanel);
}

function renderAboutFirmTab(root) {
  const a = CONTENT.aboutFirm;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Sekce hned pod hero, kde firma stručně popisuje, co dělá.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(a.eyebrow, v => a.eyebrow = v)));
  panel.appendChild(field('Nadpis', textInput(a.title, v => a.title = v)));
  panel.appendChild(field('Text o firmě', textArea(a.text, v => a.text = v)));
  root.appendChild(panel);

  const badgesPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Čísla / statistiky (3 dlaždice)')])])
  ]);
  const container = el('div');
  badgesPanel.appendChild(container);
  root.appendChild(badgesPanel);

  function redraw() {
    renderRepeater({
      container,
      items: a.badges,
      itemLabel: 'Statistika',
      fieldsConfig: [
        { render: (item) => field('Hodnota', textInput(item.value, v => item.value = v)) },
        { render: (item) => field('Popisek', textInput(item.label, v => item.label = v)) }
      ],
      onAdd: () => { a.badges.push({ value: '', label: '' }); redraw(); },
      onRemove: (i) => { a.badges.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

function renderServicesTab(root) {
  const s = CONTENT.services;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Karty jednotlivých služeb (revize, montáže, servis, školení...).')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(s.eyebrow, v => s.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(s.title, v => s.title = v)));
  panel.appendChild(field('Podnadpis', textArea(s.subtitle, v => s.subtitle = v)));
  root.appendChild(panel);

  const iconOptions = ['bolt', 'plug', 'shield-bolt', 'tool', 'wrench', 'graduation-cap', 'certificate', 'clock', 'file-check', 'map-pin', 'users', 'book-open'];
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
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Sekce vysvětlující druhy revizí, důvody, objekty a související legislativu.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(r.eyebrow, v => r.eyebrow = v)));
  panel.appendChild(field('Řádek s normami ČSN', textInput(r.normsLine, v => r.normsLine = v)));
  panel.appendChild(field('Nadpis sekce', textInput(r.title, v => r.title = v)));
  panel.appendChild(field('Úvodní text', textArea(r.intro, v => r.intro = v)));
  root.appendChild(panel);

  const typesPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Druhy revizí')])])
  ]);
  typesPanel.appendChild(field('Nadpis nad kartami', textInput(r.typesTitle, v => r.typesTitle = v)));
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

  const whyPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Proč se revize dělají')])])
  ]);
  whyPanel.appendChild(field('Nadpis', textInput(r.whyTitle, v => r.whyTitle = v)));
  const whyContainer = el('div');
  whyPanel.appendChild(whyContainer);
  root.appendChild(whyPanel);

  function redrawWhy() {
    renderRepeater({
      container: whyContainer,
      items: r.whyPoints.map(v => ({ value: v })),
      itemLabel: 'Bod',
      fieldsConfig: [
        { render: (item, index) => field('Text', textArea(item.value, v => r.whyPoints[index] = v)) }
      ],
      onAdd: () => { r.whyPoints.push(''); redrawWhy(); },
      onRemove: (i) => { r.whyPoints.splice(i, 1); redrawWhy(); }
    });
  }
  redrawWhy();

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

function renderSkoleniTab(root) {
  const s = CONTENT.skoleni;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Sekce školení a konzultací.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(s.eyebrow, v => s.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(s.title, v => s.title = v)));
  panel.appendChild(field('Popis', textArea(s.description, v => s.description = v)));
  root.appendChild(panel);

  const iconOptions = ['graduation-cap', 'users', 'book-open', 'certificate', 'clock', 'file-check'];
  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Karty')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    renderRepeater({
      container,
      items: s.items,
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
      onAdd: () => { s.items.push({ icon: 'graduation-cap', title: '', text: '' }); redraw(); },
      onRemove: (i) => { s.items.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

// ---------- Servis ----------

function renderServisTab(root) {
  const s = CONTENT.servis;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Sekce servisu a údržby elektro.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(s.eyebrow, v => s.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(s.title, v => s.title = v)));
  panel.appendChild(field('Text', textArea(s.text, v => s.text = v)));
  root.appendChild(panel);

  const pointsPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Body (karty vpravo)')])])
  ]);
  const container = el('div');
  pointsPanel.appendChild(container);
  root.appendChild(pointsPanel);

  function redraw() {
    renderRepeater({
      container,
      items: s.points,
      itemLabel: 'Bod',
      fieldsConfig: [
        { render: (item) => field('Název', textInput(item.title, v => item.title = v)) },
        { render: (item) => field('Popis', textArea(item.description, v => item.description = v)) }
      ],
      onAdd: () => { s.points.push({ title: '', description: '' }); redraw(); },
      onRemove: (i) => { s.points.splice(i, 1); redraw(); }
    });
  }
  redraw();
}

// ---------- Galerie s kategoriemi (alba) ----------

function renderGalleryTab(root) {
  const g = CONTENT.gallery;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Galerie je rozdělená do kategorií (alb). Každá kategorie má vlastní sadu fotek, které se zobrazí po rozkliknutí na webu.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(g.eyebrow, v => g.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(g.title, v => g.title = v)));
  panel.appendChild(field('Podnadpis', textArea(g.subtitle, v => g.subtitle = v)));
  root.appendChild(panel);

  const catsPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Kategorie (alba)')])])
  ]);
  const container = el('div');
  catsPanel.appendChild(container);
  root.appendChild(catsPanel);

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kategorie';
  }

  function redrawCategories() {
    container.innerHTML = '';

    g.categories.forEach((cat, catIndex) => {
      const catBody = el('div');

      catBody.appendChild(field('Název kategorie', textInput(cat.name, v => {
        cat.name = v;
        if (!cat.id) cat.id = slugify(v);
      })));

      // Náhled a nahrání titulní fotky kategorie
      const coverWrap = el('div', { class: 'field-group' }, [
        el('label', {}, [document.createTextNode('Titulní fotka kategorie')])
      ]);
      const coverPreview = el('div', { class: 'cover-preview' });
      function updateCoverPreview() {
        coverPreview.innerHTML = '';
        if (cat.cover) {
          coverPreview.appendChild(el('img', { src: cat.cover, alt: 'Náhled' }));
        }
      }
      updateCoverPreview();
      coverWrap.appendChild(coverPreview);
      coverWrap.appendChild(textInput(cat.cover, v => { cat.cover = v; updateCoverPreview(); }, 'Cesta k obrázku, nebo nahrajte níže'));
      coverWrap.appendChild(imageUploadButton((path) => {
        cat.cover = path;
        redrawCategories();
      }, '+ Nahrát titulní fotku'));
      catBody.appendChild(coverWrap);

      catBody.appendChild(field('Popis kategorie (volitelné)', textArea(cat.description || '', v => cat.description = v)));

      // Fotky v albu
      const imagesWrap = el('div', { class: 'field-group' }, [
        el('label', {}, [document.createTextNode(`Fotky v albu (${(cat.images || []).length})`)])
      ]);
      const imagesGrid = el('div', { class: 'album-grid' });

      function redrawImages() {
        imagesGrid.innerHTML = '';
        (cat.images || []).forEach((img, imgIndex) => {
          const thumb = el('div', { class: 'album-thumb' }, [
            el('img', { src: img.src, alt: img.alt || '' })
          ]);
          const removeBtn = el('button', { class: 'album-thumb-remove', type: 'button', title: 'Odebrat fotku' }, [document.createTextNode('×')]);
          removeBtn.addEventListener('click', () => {
            cat.images.splice(imgIndex, 1);
            redrawImages();
          });
          thumb.appendChild(removeBtn);
          imagesGrid.appendChild(thumb);
        });
      }
      redrawImages();
      imagesWrap.appendChild(imagesGrid);

      imagesWrap.appendChild(imageUploadButton((path) => {
        if (!cat.images) cat.images = [];
        cat.images.push({ src: path, alt: cat.name });
        redrawImages();
      }, '+ Přidat fotku do alba'));
      catBody.appendChild(imagesWrap);

      const removeCatBtn = el('button', { class: 'btn-small danger', type: 'button' }, [document.createTextNode('Odebrat celou kategorii')]);
      removeCatBtn.addEventListener('click', () => {
        g.categories.splice(catIndex, 1);
        redrawCategories();
      });

      const head = el('div', { class: 'repeater-item-head' }, [
        el('span', { class: 'tag' }, [document.createTextNode(`Kategorie ${catIndex + 1}`)]),
        removeCatBtn
      ]);

      container.appendChild(el('div', { class: 'repeater-item' }, [head, catBody]));
    });

    const addBtn = el('button', { class: 'add-item-btn', type: 'button' }, [document.createTextNode('+ Přidat novou kategorii')]);
    addBtn.addEventListener('click', () => {
      g.categories.push({ id: '', name: 'Nová kategorie', cover: '', description: '', images: [] });
      redrawCategories();
    });
    container.appendChild(addBtn);
  }

  redrawCategories();
}

function renderReferenceTab(root) {
  const r = CONTENT.reference;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Firmy a partneři zobrazení jako dlaždice s logy. Dokud logo nenahrajete, zobrazí se na webu jen prázdná dlaždice s "+" — jakmile logo nahrajete, dlaždice se jím vyplní.')]));

  const panel = el('div', { class: 'card-panel' });
  panel.appendChild(field('Eyebrow', textInput(r.eyebrow, v => r.eyebrow = v)));
  panel.appendChild(field('Nadpis sekce', textInput(r.title, v => r.title = v)));
  panel.appendChild(field('Podnadpis (volitelné)', textArea(r.subtitle || '', v => r.subtitle = v)));
  root.appendChild(panel);

  const listPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Dlaždice / loga')])])
  ]);
  const container = el('div');
  listPanel.appendChild(container);
  root.appendChild(listPanel);

  function redraw() {
    container.innerHTML = '';

    r.items.forEach((item, index) => {
      const itemBody = el('div');
      itemBody.appendChild(field('Název firmy / objektu (nepovinné, jen popisek pro prázdnou dlaždici)', textInput(item.name, v => item.name = v)));

      const logoWrap = el('div', { class: 'field-group' }, [
        el('label', {}, [document.createTextNode('Logo')])
      ]);
      const preview = el('div', { class: 'cover-preview' });
      function updatePreview() {
        preview.innerHTML = '';
        if (item.logo) {
          preview.appendChild(el('img', { src: item.logo, alt: 'Náhled loga' }));
        }
      }
      updatePreview();
      logoWrap.appendChild(preview);
      logoWrap.appendChild(textInput(item.logo, v => { item.logo = v; updatePreview(); }, 'Cesta k logu, nebo nahrajte níže'));
      logoWrap.appendChild(imageUploadButton((path) => {
        item.logo = path;
        redraw();
      }, item.logo ? '+ Nahradit logo' : '+ Nahrát logo'));
      if (item.logo) {
        const clearBtn = el('button', { class: 'btn-small', type: 'button', style: 'margin-top:8px' }, [document.createTextNode('Odebrat logo (zpět na prázdnou dlaždici)')]);
        clearBtn.addEventListener('click', () => { item.logo = ''; redraw(); });
        logoWrap.appendChild(clearBtn);
      }
      itemBody.appendChild(logoWrap);

      const removeBtn = el('button', { class: 'btn-small danger', type: 'button' }, [document.createTextNode('Odebrat dlaždici')]);
      removeBtn.addEventListener('click', () => { r.items.splice(index, 1); redraw(); });

      const head = el('div', { class: 'repeater-item-head' }, [
        el('span', { class: 'tag' }, [document.createTextNode(`Dlaždice ${index + 1}`)]),
        removeBtn
      ]);

      container.appendChild(el('div', { class: 'repeater-item' }, [head, itemBody]));
    });

    const addBtn = el('button', { class: 'add-item-btn', type: 'button' }, [document.createTextNode('+ Přidat dlaždici')]);
    addBtn.addEventListener('click', () => { r.items.push({ name: '', logo: '' }); redraw(); });
    container.appendChild(addBtn);
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

function renderContactTab(root) {
  const c = CONTENT.contact;
  root.appendChild(el('p', { class: 'section-desc' }, [document.createTextNode('Kontaktní údaje a mapa s provozovnou.')]));

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

  const mapPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Mapa')])])
  ]);
  mapPanel.appendChild(field(
    'Vlastní Google Maps embed odkaz (volitelné)',
    textInput(c.mapEmbed, v => c.mapEmbed = v),
    'Necháte-li prázdné, mapa se automaticky vygeneruje z adresy provozovny výše. Vlastní odkaz získáte v Google Maps přes Sdílet → Vložit mapu.'
  ));
  root.appendChild(mapPanel);
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

  if (!f.credit) f.credit = { text: 'Web vytvořil', name: '', url: '' };
  const creditPanel = el('div', { class: 'card-panel' }, [
    el('div', { class: 'card-panel-head' }, [el('h3', {}, [document.createTextNode('Autorský odkaz')])])
  ]);
  creditPanel.appendChild(el('p', { class: 'field-hint', style: 'margin-bottom:16px' }, [
    document.createTextNode('Malý odkaz vpravo dole v patičce webu (např. "Web vytvořil PEBMedia").')
  ]));
  creditPanel.appendChild(field('Text před jménem', textInput(f.credit.text, v => f.credit.text = v), 'Např. "Web vytvořil"'));
  creditPanel.appendChild(field('Jméno / název firmy', textInput(f.credit.name, v => f.credit.name = v)));
  creditPanel.appendChild(field('Odkaz (URL)', textInput(f.credit.url, v => f.credit.url = v), 'Např. https://broz-petr.cz'));
  root.appendChild(creditPanel);
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
    bgSoft: 'Tmavé pozadí (jemnější odstín)',
    bgLight: 'Světlé pozadí',
    accent: 'Akcentní barva (azurová)',
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
  closeMobileSidebar();
  // Po přepnutí sekce na mobilu odscrolujeme obsah nahoru, ať uživatel
  // hned vidí začátek nového formuláře, ne kde skončil scroll v předchozím.
  document.querySelector('.admin-main')?.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

document.getElementById('admin-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  switchTab(btn.dataset.tab);
});

// ---------- Mobilní výsuvné menu sekcí ----------

function openMobileSidebar() {
  document.getElementById('admin-sidebar').classList.add('open');
  document.getElementById('admin-sidebar-overlay').classList.add('open');
}
function closeMobileSidebar() {
  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.getElementById('admin-sidebar-overlay')?.classList.remove('open');
}

document.getElementById('admin-menu-toggle')?.addEventListener('click', () => {
  const sidebar = document.getElementById('admin-sidebar');
  if (sidebar.classList.contains('open')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
});
document.getElementById('admin-sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

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
