/* =========================================================
   ELREVMONT — Hero: animované vlnité čáry na pozadí
   Vanilla JS/SVG ekvivalent komponenty "BackgroundPaths":
   dvě vrstvy jemně animovaných křivek připomínajících vodivé
   dráhy/elektrické vedení, plus nadpis, který se při načtení
   stránky rozepíše písmeno po písmenu.

   Žádná závislost na Reactu, Next.js ani Framer Motion —
   čisté SVG + CSS animace (transform na úrovni celé vrstvy,
   optimalizované pro plynulost místo animace jednotlivých cest).
   ========================================================= */

const SVG_NS = 'http://www.w3.org/2000/svg';

// Vygeneruje jednu vrstvu křivek (ekvivalent FloatingPaths({ position })).
// `position` mění směr/rozestup křivek, takže dvě vrstvy s +1 a -1
// vytvoří jemný křížený vzor, podobně jako v originální komponentě.
// Souřadnice jsou zrcadlené (x → -x, y → -y vůči středu viewBoxu),
// takže se vzor soustředí do pravého horního rohu místo levého
// dolního — řešeno přímo v datech cesty, ne CSS transformací
// na kontejneru (ta by komplikovala GPU compositing animace níže).
// Animace "plynutí" je řešená na úrovni celého <svg> (viz CSS
// .layer-a / .layer-b) přes transform, ne na jednotlivých cestách —
// je to o řád levnější pro výkon prohlížeče.
function buildPathsLayer(position, layerClass, count = 14) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 696 316');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('class', layerClass);

  for (let i = 0; i < count; i++) {
    const path = document.createElementNS(SVG_NS, 'path');

    // Původní (nezrcadlené) body křivky — dva segmenty krychlové
    // Bézierovy křivky, každý se svým vlastním kontrolním bodem.
    const startX = -(380 - i * 5 * position);
    const startY = -(189 + i * 6);
    const c1x = -(312 - i * 5 * position);
    const c1y = 216 - i * 6;
    const midX = 152 - i * 5 * position;
    const midY = 343 - i * 6;
    const c2x = 616 - i * 5 * position;
    const c2y = 470 - i * 6;
    const endX = 684 - i * 5 * position;
    const endY = 875 - i * 6;

    // Zrcadlení kolem středu viewBoxu (348, 158): mx = 696 - x, my = 316 - y.
    // Tím se vzor, který byl soustředěný vlevo dole, přesune vpravo nahoru.
    const mirror = (x, y) => [696 - x, 316 - y];
    const [mStartX, mStartY] = mirror(startX, startY);
    const [mC1x, mC1y] = mirror(c1x, c1y);
    const [mMidX, mMidY] = mirror(midX, midY);
    const [mC2x, mC2y] = mirror(c2x, c2y);
    const [mEndX, mEndY] = mirror(endX, endY);

    const d =
      `M${mStartX} ${mStartY}` +
      `C${mStartX} ${mStartY} ${mC1x} ${mC1y} ${mMidX} ${mMidY}` +
      `C${mC2x} ${mC2y} ${mEndX} ${mEndY} ${mEndX} ${mEndY}`;

    path.setAttribute('d', d);
    path.setAttribute('stroke-width', String(0.5 + i * 0.03));
    path.setAttribute('stroke-opacity', String(0.15 + i * 0.04));

    svg.appendChild(path);
  }

  return svg;
}

function initHeroPaths() {
  const container = document.getElementById('hero-paths');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(buildPathsLayer(1, 'layer-a'));
  container.appendChild(buildPathsLayer(-1, 'layer-b'));
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
    words.forEach((word, wordIndex) => {
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

      // Skutečná mezera mezi slovy jako textový uzel (spolehlivější
      // než CSS ::before, které se v kombinaci s letter-spacing
      // a inline-block slovy nemusí vykreslit s dostatečnou šířkou).
      if (wordIndex > 0) {
        titleEl.appendChild(document.createTextNode('\u00a0'));
      }
      titleEl.appendChild(wordSpan);
    });
    if (lineIndex < lines.length - 1) {
      titleEl.appendChild(document.createElement('br'));
    }
  });
}
