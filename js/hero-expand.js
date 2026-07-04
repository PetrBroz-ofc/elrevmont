/* =========================================================
   ELREVMONT — Hero scroll-expand efekt
   Vanilla JS varianta konceptu "ScrollExpandMedia": video
   v malém boxu se při scrollu postupně roztahuje na celou
   šířku/výšku obrazovky, text "Milan" / "Dolenský" se
   rozjíždí do stran spolu s roztahováním. Po plném rozbalení
   se odemkne normální scroll stránky a zobrazí zbytek hero
   obsahu (podnadpis, tlačítka, statistiky).

   Žádná závislost na Reactu ani Framer Motion — čisté DOM
   API + requestAnimationFrame.
   ========================================================= */

function initHeroExpand(heroData) {
  const section = document.getElementById('hero');
  if (!section) return;

  const mediaBox = document.getElementById('hero-media-box');
  const splitTitle = document.getElementById('hero-split-title');
  const titleLeft = document.getElementById('hero-title-left');
  const titleRight = document.getElementById('hero-title-right');
  const scrollHint = document.getElementById('hero-scroll-hint');
  const heroContent = document.getElementById('hero-content');
  const video = document.getElementById('hero-video');

  let progress = 0;          // 0 → 1, jak moc je video "rozbalené"
  let fullyExpanded = false; // true, jakmile progress dosáhne 1 a scroll stránky se odemkne
  let touchStartY = 0;
  let isMobile = window.innerWidth < 768;

  function updateIsMobile() {
    isMobile = window.innerWidth < 768;
  }
  window.addEventListener('resize', updateIsMobile);

  function applyProgress() {
    const baseW = 320;
    const baseH = 220;
    const maxAddW = isMobile ? 620 : 1180;
    const maxAddH = isMobile ? 260 : 480;

    const width = baseW + progress * maxAddW;
    const height = baseH + progress * maxAddH;

    mediaBox.style.width = `${width}px`;
    mediaBox.style.height = `${height}px`;
    mediaBox.style.maxWidth = '95vw';
    mediaBox.style.maxHeight = '82vh';

    // Text se rozjíždí do stran (v vw jednotkách, jako v původním konceptu)
    const translate = progress * (isMobile ? 20 : 16);
    titleLeft.style.transform = `translateX(-${translate}vw)`;
    titleRight.style.transform = `translateX(${translate}vw)`;

    scrollHint.style.opacity = String(1 - progress * 1.4);
  }

  function showContent(show) {
    if (show) {
      heroContent.classList.add('is-shown');
    } else {
      heroContent.classList.remove('is-shown');
    }
  }

  function setProgress(next) {
    progress = Math.min(Math.max(next, 0), 1);
    applyProgress();

    if (progress >= 1) {
      fullyExpanded = true;
      showContent(true);
    } else if (progress < 0.7) {
      showContent(false);
    }
  }

  function handleWheel(e) {
    // Jakmile je video plně rozbalené a uživatel je na vrcholu stránky,
    // scroll nahoru (deltaY < 0) video znovu sbalí místo scrollování pryč.
    if (fullyExpanded && e.deltaY < 0 && window.scrollY <= 4) {
      fullyExpanded = false;
      e.preventDefault();
      setProgress(0.98);
      return;
    }
    if (!fullyExpanded) {
      e.preventDefault();
      const delta = e.deltaY * 0.0011;
      setProgress(progress + delta);
    }
  }

  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchMove(e) {
    if (!touchStartY) return;
    const touchY = e.touches[0].clientY;
    const deltaY = touchStartY - touchY;

    if (fullyExpanded && deltaY < -20 && window.scrollY <= 4) {
      fullyExpanded = false;
      e.preventDefault();
      setProgress(0.98);
      touchStartY = touchY;
      return;
    }
    if (!fullyExpanded) {
      e.preventDefault();
      const factor = deltaY < 0 ? 0.009 : 0.006;
      setProgress(progress + deltaY * factor);
      touchStartY = touchY;
    }
  }

  function handleTouchEnd() {
    touchStartY = 0;
  }

  function handleScroll() {
    // Dokud video není plně rozbalené, drž stránku na vrcholu —
    // scroll "spotřebováváme" na animaci videa, ne na posun stránky.
    if (!fullyExpanded) {
      window.scrollTo(0, 0);
    }
  }

  window.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Respektuj "prefers-reduced-motion": rovnou ukaž plně rozbalený stav bez animace.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    fullyExpanded = true;
    setProgress(1);
  } else {
    applyProgress();
  }

  // Nastavení videa/textu z dat.
  if (heroData.backgroundVideo) {
    video.src = heroData.backgroundVideo;
    if (heroData.backgroundVideoPoster) video.poster = heroData.backgroundVideoPoster;
  }
  titleLeft.textContent = heroData.titleLeft || '';
  titleRight.textContent = heroData.titleRight || '';
  scrollHint.textContent = heroData.scrollHint || '';
}
