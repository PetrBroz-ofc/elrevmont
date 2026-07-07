/* =========================================================
   ELREVMONT — Editor obrázků v administraci
   Modální okno, které se otevře po výběru souboru z počítače
   nebo mobilu, ještě než se obrázek nahraje na server. Umožňuje:
   - oříznutí (volný výběr nebo pevný poměr stran)
   - otočení o 90°
   - jas / kontrast
   - změnu výstupní velikosti (max. šířka) a kvality JPEG komprese

   Čistý vanilla JS + <canvas>, žádné externí knihovny.
   ========================================================= */

function openImageEditor(file, { aspectRatioOptions = null, onConfirm, onCancel } = {}) {
  const state = {
    img: null,
    rotation: 0,       // 0, 90, 180, 270
    brightness: 100,   // %
    contrast: 100,     // %
    aspect: null,       // null = volný poměr, jinak číslo (w/h)
    // Ořezový rámeček v souřadnicích zobrazovaného (rotovaného) obrázku, 0–1 relativně.
    crop: { x: 0, y: 0, w: 1, h: 1 },
    quality: 0.85,
    maxWidth: 1920
  };

  const overlay = el('div', { class: 'img-editor-overlay' });
  const modal = el('div', { class: 'img-editor-modal' });

  const header = el('div', { class: 'img-editor-header' }, [
    el('h3', {}, [document.createTextNode('Upravit obrázek')]),
  ]);
  const closeBtn = el('button', { class: 'img-editor-close', type: 'button', 'aria-label': 'Zavřít' }, [document.createTextNode('×')]);
  header.appendChild(closeBtn);

  const canvasWrap = el('div', { class: 'img-editor-canvas-wrap' });
  const canvas = el('canvas', { class: 'img-editor-canvas' });
  const cropBox = el('div', { class: 'img-editor-cropbox' });
  const handles = ['nw', 'ne', 'sw', 'se'].map(pos => el('div', { class: `img-editor-handle handle-${pos}`, 'data-handle': pos }));
  handles.forEach(h => cropBox.appendChild(h));
  canvasWrap.appendChild(canvas);
  canvasWrap.appendChild(cropBox);

  // ---------- Ovládací prvky ----------
  const controls = el('div', { class: 'img-editor-controls' });

  // Poměr stran
  const aspectRow = el('div', { class: 'img-editor-row' });
  aspectRow.appendChild(el('label', {}, [document.createTextNode('Poměr stran')]));
  const aspectButtons = el('div', { class: 'img-editor-aspect-buttons' });
  const aspects = aspectRatioOptions || [
    { label: 'Volný', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:4 (na výšku)', value: 3 / 4 }
  ];
  aspects.forEach((a, i) => {
    const btn = el('button', { type: 'button', class: 'img-editor-aspect-btn' + (i === 0 ? ' active' : '') }, [document.createTextNode(a.label)]);
    btn.addEventListener('click', () => {
      state.aspect = a.value;
      aspectButtons.querySelectorAll('.img-editor-aspect-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resetCropToAspect();
      drawCanvas();
    });
    aspectButtons.appendChild(btn);
  });
  aspectRow.appendChild(aspectButtons);
  controls.appendChild(aspectRow);

  // Otočení
  const rotateRow = el('div', { class: 'img-editor-row' });
  rotateRow.appendChild(el('label', {}, [document.createTextNode('Otočení')]));
  const rotateBtn = el('button', { type: 'button', class: 'btn-small' }, [document.createTextNode('⟳ Otočit o 90°')]);
  rotateBtn.addEventListener('click', () => {
    state.rotation = (state.rotation + 90) % 360;
    state.crop = { x: 0, y: 0, w: 1, h: 1 };
    layoutCanvas();
    drawCanvas();
  });
  rotateRow.appendChild(rotateBtn);
  controls.appendChild(rotateRow);

  // Jas
  const brightnessRow = el('div', { class: 'img-editor-row' });
  brightnessRow.appendChild(el('label', {}, [document.createTextNode('Jas')]));
  const brightnessInput = el('input', { type: 'range', min: '50', max: '150', value: '100' });
  brightnessInput.addEventListener('input', () => { state.brightness = Number(brightnessInput.value); drawCanvas(); });
  brightnessRow.appendChild(brightnessInput);
  controls.appendChild(brightnessRow);

  // Kontrast
  const contrastRow = el('div', { class: 'img-editor-row' });
  contrastRow.appendChild(el('label', {}, [document.createTextNode('Kontrast')]));
  const contrastInput = el('input', { type: 'range', min: '50', max: '150', value: '100' });
  contrastInput.addEventListener('input', () => { state.contrast = Number(contrastInput.value); drawCanvas(); });
  contrastRow.appendChild(contrastInput);
  controls.appendChild(contrastRow);

  // Max šířka výstupu
  const sizeRow = el('div', { class: 'img-editor-row' });
  sizeRow.appendChild(el('label', {}, [document.createTextNode('Max. šířka výstupu')]));
  const sizeSelect = el('select', {});
  [
    { label: '640 px (rychlé načítání)', value: 640 },
    { label: '1280 px', value: 1280 },
    { label: '1920 px (doporučeno)', value: 1920 },
    { label: 'Beze změny (původní velikost)', value: 0 }
  ].forEach(opt => {
    const optionEl = el('option', { value: String(opt.value) }, [document.createTextNode(opt.label)]);
    if (opt.value === 1920) optionEl.setAttribute('selected', 'selected');
    sizeSelect.appendChild(optionEl);
  });
  sizeSelect.addEventListener('change', () => { state.maxWidth = Number(sizeSelect.value); });
  sizeRow.appendChild(sizeSelect);
  controls.appendChild(sizeRow);

  // Kvalita komprese
  const qualityRow = el('div', { class: 'img-editor-row' });
  qualityRow.appendChild(el('label', {}, [document.createTextNode('Kvalita (komprese)')]));
  const qualityInput = el('input', { type: 'range', min: '50', max: '100', value: '85' });
  const qualityValueLabel = el('span', { class: 'img-editor-value' }, [document.createTextNode('85 %')]);
  qualityInput.addEventListener('input', () => {
    state.quality = Number(qualityInput.value) / 100;
    qualityValueLabel.textContent = `${qualityInput.value} %`;
  });
  const qualityWrap = el('div', { class: 'img-editor-slider-with-value' }, [qualityInput, qualityValueLabel]);
  qualityRow.appendChild(qualityWrap);
  controls.appendChild(qualityRow);

  const resetBtn = el('button', { type: 'button', class: 'btn-small' }, [document.createTextNode('Vrátit vše zpět')]);
  resetBtn.addEventListener('click', () => {
    state.rotation = 0;
    state.brightness = 100;
    state.contrast = 100;
    state.aspect = null;
    brightnessInput.value = '100';
    contrastInput.value = '100';
    qualityInput.value = '85';
    state.quality = 0.85;
    qualityValueLabel.textContent = '85 %';
    aspectButtons.querySelectorAll('.img-editor-aspect-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    layoutCanvas();
    drawCanvas();
  });
  controls.appendChild(resetBtn);

  // ---------- Akce (dole) ----------
  const footer = el('div', { class: 'img-editor-footer' });
  const cancelBtn = el('button', { type: 'button', class: 'btn-small' }, [document.createTextNode('Zrušit')]);
  const confirmBtn = el('button', { type: 'button', class: 'btn btn-primary', style: 'width:auto' }, [document.createTextNode('Použít a nahrát')]);
  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);

  const body = el('div', { class: 'img-editor-body' }, [canvasWrap, controls]);
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKeyDown);
  }
  function onKeyDown(e) {
    if (e.key === 'Escape') { close(); if (onCancel) onCancel(); }
  }
  document.addEventListener('keydown', onKeyDown);
  closeBtn.addEventListener('click', () => { close(); if (onCancel) onCancel(); });
  cancelBtn.addEventListener('click', () => { close(); if (onCancel) onCancel(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { close(); if (onCancel) onCancel(); } });

  // ---------- Canvas rendering ----------
  let displayScale = 1; // poměr mezi zobrazenou velikostí canvasu a skutečným (rotovaným) obrázkem

  function rotatedDimensions() {
    const w = state.img.naturalWidth;
    const h = state.img.naturalHeight;
    return (state.rotation === 90 || state.rotation === 270) ? { w: h, h: w } : { w, h };
  }

  function layoutCanvas() {
    const dims = rotatedDimensions();
    const maxDisplayW = Math.min(560, canvasWrap.clientWidth || 560);
    const maxDisplayH = 380;
    const scale = Math.min(maxDisplayW / dims.w, maxDisplayH / dims.h, 1);
    displayScale = scale;
    canvas.width = Math.round(dims.w * scale);
    canvas.height = Math.round(dims.h * scale);
    resetCropToAspect();
    updateCropBoxFromState();
  }

  function resetCropToAspect() {
    if (!state.aspect) {
      state.crop = { x: 0, y: 0, w: 1, h: 1 };
      return;
    }
    const dims = rotatedDimensions();
    const imgAspect = dims.w / dims.h;
    let w, h;
    if (state.aspect > imgAspect) {
      w = 1;
      h = (dims.w / state.aspect) / dims.h;
    } else {
      h = 1;
      w = (dims.h * state.aspect) / dims.w;
    }
    state.crop = { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
  }

  function drawCanvas() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%)`;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((state.rotation * Math.PI) / 180);

    const w = state.img.naturalWidth * displayScale;
    const h = state.img.naturalHeight * displayScale;
    ctx.drawImage(state.img, -w / 2, -h / 2, w, h);
    ctx.restore();

    updateCropBoxFromState();
  }

  function updateCropBoxFromState() {
    const rect = canvas.getBoundingClientRect();
    const wrapRect = canvasWrap.getBoundingClientRect();
    const left = rect.left - wrapRect.left;
    const top = rect.top - wrapRect.top;
    cropBox.style.left = `${left + state.crop.x * canvas.width}px`;
    cropBox.style.top = `${top + state.crop.y * canvas.height}px`;
    cropBox.style.width = `${state.crop.w * canvas.width}px`;
    cropBox.style.height = `${state.crop.h * canvas.height}px`;
  }

  // ---------- Tažení ořezového rámečku a jeho rohů ----------
  let dragMode = null; // 'move' | 'nw' | 'ne' | 'sw' | 'se'
  let dragStart = null;

  function pointerDown(e, mode) {
    e.preventDefault();
    dragMode = mode;
    const point = e.touches ? e.touches[0] : e;
    dragStart = { x: point.clientX, y: point.clientY, crop: { ...state.crop } };
    document.addEventListener('mousemove', pointerMove);
    document.addEventListener('mouseup', pointerUp);
    document.addEventListener('touchmove', pointerMove, { passive: false });
    document.addEventListener('touchend', pointerUp);
  }

  function pointerMove(e) {
    if (!dragMode) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const dx = (point.clientX - dragStart.x) / canvas.width;
    const dy = (point.clientY - dragStart.y) / canvas.height;
    const c = dragStart.crop;
    let next = { ...c };

    if (dragMode === 'move') {
      next.x = clamp(c.x + dx, 0, 1 - c.w);
      next.y = clamp(c.y + dy, 0, 1 - c.h);
    } else {
      // Rohové táhlo mění velikost, s volitelným udržením poměru stran.
      let { x, y, w, h } = c;
      if (dragMode.includes('e')) w = clamp(c.w + dx, 0.05, 1 - c.x);
      if (dragMode.includes('w')) { const newX = clamp(c.x + dx, 0, c.x + c.w - 0.05); w = c.w + (c.x - newX); x = newX; }
      if (dragMode.includes('s')) h = clamp(c.h + dy, 0.05, 1 - c.y);
      if (dragMode.includes('n')) { const newY = clamp(c.y + dy, 0, c.y + c.h - 0.05); h = c.h + (c.y - newY); y = newY; }

      if (state.aspect) {
        // Udržíme poměr stran podle šířky v obrazových (ne canvas) jednotkách.
        const dims = rotatedDimensions();
        const targetH = (w * dims.w) / state.aspect / dims.h;
        h = clamp(targetH, 0.05, 1 - y);
      }
      next = { x, y, w, h };
    }

    state.crop = next;
    updateCropBoxFromState();
  }

  function pointerUp() {
    dragMode = null;
    document.removeEventListener('mousemove', pointerMove);
    document.removeEventListener('mouseup', pointerUp);
    document.removeEventListener('touchmove', pointerMove);
    document.removeEventListener('touchend', pointerUp);
  }

  cropBox.addEventListener('mousedown', (e) => { if (e.target === cropBox) pointerDown(e, 'move'); });
  cropBox.addEventListener('touchstart', (e) => { if (e.target === cropBox) pointerDown(e, 'move'); }, { passive: false });
  handles.forEach(h => {
    h.addEventListener('mousedown', (e) => pointerDown(e, h.dataset.handle));
    h.addEventListener('touchstart', (e) => pointerDown(e, h.dataset.handle), { passive: false });
  });

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  // ---------- Export výsledného obrázku ----------
  confirmBtn.addEventListener('click', () => {
    const dims = rotatedDimensions();
    const cropPxX = state.crop.x * dims.w;
    const cropPxY = state.crop.y * dims.h;
    const cropPxW = state.crop.w * dims.w;
    const cropPxH = state.crop.h * dims.h;

    // Vykreslíme rotovaný obrázek do dočasného plátna v plné (nezmenšené) velikosti.
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = dims.w;
    fullCanvas.height = dims.h;
    const fctx = fullCanvas.getContext('2d');
    fctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%)`;
    fctx.translate(dims.w / 2, dims.h / 2);
    fctx.rotate((state.rotation * Math.PI) / 180);
    fctx.drawImage(state.img, -state.img.naturalWidth / 2, -state.img.naturalHeight / 2);

    // Ořízneme podle vybraného rámečku.
    const croppedCanvas = document.createElement('canvas');
    let outW = cropPxW;
    let outH = cropPxH;
    if (state.maxWidth && outW > state.maxWidth) {
      const ratio = state.maxWidth / outW;
      outW = state.maxWidth;
      outH = outH * ratio;
    }
    croppedCanvas.width = Math.round(outW);
    croppedCanvas.height = Math.round(outH);
    const cctx = croppedCanvas.getContext('2d');
    cctx.drawImage(fullCanvas, cropPxX, cropPxY, cropPxW, cropPxH, 0, 0, croppedCanvas.width, croppedCanvas.height);

    const mimeType = /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg';
    croppedCanvas.toBlob((blob) => {
      if (!blob) return;
      const outName = file.name.replace(/\.[^.]+$/, '') + (mimeType === 'image/png' ? '.png' : '.jpg');
      const outFile = new File([blob], outName, { type: mimeType });
      close();
      onConfirm(outFile);
    }, mimeType, mimeType === 'image/jpeg' ? state.quality : undefined);
  });

  // ---------- Načtení obrázku ----------
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.img = img;
      layoutCanvas();
      drawCanvas();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);

  window.addEventListener('resize', () => { if (state.img) { layoutCanvas(); drawCanvas(); } });
}
