/* =========================================================
   ELREVMONT — Hero: animované vlnité čáry na pozadí
   Vanilla JS/SVG ekvivalent komponenty "BackgroundPaths":
   dvě vrstvy jemně animovaných křivek připomínajících vodivé
   dráhy/elektrické vedení, plus nadpis, který se při načtení
   stránky rozepíše písmeno po písmenu.

   Žádná závislost na Reactu, Next.js ani Framer Motion —
   čisté SVG + CSS animace (stroke-dashoffset, transform).
   ========================================================= */

const SVG_NS = 'http://www.w3.org/2000/svg';

// Vygeneruje jednu vrstvu křivek (ekvivalent FloatingPaths({ position })).
// `position` mění směr/rozestup křivek, takže dvě vrstvy s +1 a -1
// vytvoří jemný křížený vzor, podobně jako v originální komponentě.
function buildPathsLayer(position, count = 24) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 696 316');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('fill', 'none');

  for (let i = 0; i < count; i++) {
    const path = document.createElementNS(SVG_NS, 'path');
    const d =
      `M-${380 - i * 5 * position} -${189 + i * 6}` +
      `C-${380 - i * 5 * position} -${189 + i * 6} ` +
      `-${312 - i * 5 * position} ${216 - i * 6} ` +
      `${152 - i * 5 * position} ${343 - i * 6}` +
      `C${616 - i * 5 * position} ${470 - i * 6} ` +
      `${684 - i * 5 * position} ${875 - i * 6} ` +
      `${684 - i * 5 * position} ${875 - i * 6}`;

    path.setAttribute('d', d);
    path.setAttribute('stroke-width', String(0.5 + i * 0.03));
    path.setAttribute('stroke-opacity', String(0.1 + i * 0.03));
    path.setAttribute('stroke-dasharray', '1400');

    // Mírně odlišná délka a zpoždění animace pro každou křivku,
    // ať vlnění nepůsobí mechanicky synchronizovaně.
    const duration = 20 + ((i * 37) % 10); // deterministické "náhodné" rozpětí 20–30s
    const delay = (i % 6) * -1.7;
    path.style.animationDuration = `${duration}s`;
    path.style.animationDelay = `${delay}s`;

    svg.appendChild(path);
  }

  return svg;
}

function initHeroPaths() {
  const container = document.getElementById('hero-paths');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(buildPathsLayer(1));
  container.appendChild(buildPathsLayer(-1));
}

// Rozdělí text nadpisu na slova a písmena, každé písmeno zabalí do <span>
// s animací "hero-letter-in" a postupným zpožděním — ekvivalent
// písmenkové animace z originální komponenty (motion.span + delay).
function animateHeroTitle() {
  const titleEl = document.getElementById('hero-title');
  if (!titleEl) return;

  const rawText = titleEl.textContent;
  // Zachováme zalomení řádků (\n v datech) jako oddělovač skupin slov.
  const lines = rawText.split('\n');

  titleEl.innerHTML = '';
  titleEl.setAttribute('aria-label', rawText);

  let globalIndex = 0;
  lines.forEach((line, lineIndex) => {
    const words = line.split(' ').filter(Boolean);
    words.forEach(word => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      wordSpan.setAttribute('aria-hidden', 'true');

      word.split('').forEach(letter => {
        const letterSpan = document.createElement('span');
        letterSpan.className = 'letter';
        letterSpan.textContent = letter;
        letterSpan.style.animationDelay = `${globalIndex * 0.035}s`;
        wordSpan.appendChild(letterSpan);
        globalIndex++;
      });

      titleEl.appendChild(wordSpan);
    });
    if (lineIndex < lines.length - 1) {
      titleEl.appendChild(document.createElement('br'));
    }
  });
}
