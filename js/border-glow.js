/* =========================================================
   ELREVMONT — BorderGlow efekt
   Vanilla JS/CSS ekvivalent komponenty "BorderGlow" (React Bits):
   karta má jemný barevný "mesh gradient" okraj a vnější záři,
   které se objeví a natočí podle pozice kurzoru — čím blíž
   k okraji karty kurzor je, tím výraznější je záře.

   Žádná závislost na Reactu — čisté DOM API (pointermove) +
   CSS custom properties, které řídí masky/gradienty v CSS.
   ========================================================= */

function initBorderGlow(selector, options = {}) {
  const cards = document.querySelectorAll(selector);
  if (!cards.length) return;

  const edgeSensitivity = options.edgeSensitivity ?? 35;

  cards.forEach(card => {
    card.classList.add('border-glow-card');
    card.style.setProperty('--edge-sensitivity', String(edgeSensitivity));

    // Vytvoří strukturu potřebnou pro CSS vrstvy (mesh okraj + vnější záře),
    // pokud tam ještě není — umožňuje volat initBorderGlow i na karty
    // vykreslené dynamicky z JSON dat.
    if (!card.querySelector(':scope > .edge-light')) {
      const edgeLight = document.createElement('span');
      edgeLight.className = 'edge-light';
      card.appendChild(edgeLight);
    }

    function getCenter() {
      const { width, height } = card.getBoundingClientRect();
      return [width / 2, height / 2];
    }

    function getEdgeProximity(x, y) {
      const [cx, cy] = getCenter();
      const dx = x - cx;
      const dy = y - cy;
      let kx = Infinity;
      let ky = Infinity;
      if (dx !== 0) kx = cx / Math.abs(dx);
      if (dy !== 0) ky = cy / Math.abs(dy);
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    }

    function getCursorAngle(x, y) {
      const [cx, cy] = getCenter();
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return 0;
      const radians = Math.atan2(dy, dx);
      let degrees = radians * (180 / Math.PI) + 90;
      if (degrees < 0) degrees += 360;
      return degrees;
    }

    function handlePointerMove(e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const edge = getEdgeProximity(x, y);
      const angle = getCursorAngle(x, y);
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
      card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
    }

    card.addEventListener('pointermove', handlePointerMove);
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--edge-proximity', '0');
    });
  });
}
