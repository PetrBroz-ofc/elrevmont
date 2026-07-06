/* =========================================================
   ELREVMONT — Hero scroll-driven video efekt
   Vanilla JS/CSS ekvivalent konceptu "ContainerScroll" (Motion/
   Framer Motion): video v zaobleném okně se při scrollování
   přes dlouhou dráhu (320vh) postupně "odmaskovává" na plnou
   šířku/výšku sticky panelu. Text nad videem stoupá nahoru
   s jemným blur-fade efektem, tlačítka se zjevují zdola.

   Žádná závislost na Reactu, Next.js ani knihovně "motion" —
   čisté DOM API + requestAnimationFrame + scroll listener.
   ========================================================= */

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

// Lineární interpolace mezi dvěma hodnotami podle poměru t (0–1).
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Ekvivalent Motion "useTransform": namapuje progress (0–1) z inputRange
// do outputRange, s lineární interpolací mezi jednotlivými body.
function mapRange(progress, inputRange, outputRange) {
  if (progress <= inputRange[0]) return outputRange[0];
  if (progress >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
  for (let i = 0; i < inputRange.length - 1; i++) {
    if (progress >= inputRange[i] && progress <= inputRange[i + 1]) {
      const t = (progress - inputRange[i]) / (inputRange[i + 1] - inputRange[i]);
      return lerp(outputRange[i], outputRange[i + 1], t);
    }
  }
  return outputRange[outputRange.length - 1];
}

function initHeroScroll(heroData) {
  const track = document.getElementById('hero-scroll-track');
  if (!track) return;

  const videoMask = document.getElementById('hero-video-mask');
  const video = document.getElementById('hero-video');
  const content = document.getElementById('hero-scroll-content');
  const actions = document.getElementById('hero-scroll-actions');
  const scrollCue = document.getElementById('hero-scroll-cue');

  if (heroData.backgroundVideo) {
    video.src = heroData.backgroundVideo;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getProgress() {
    // Progress 0 → 1 podle toho, jak moc jsme "propadli" skrz track
    // (odpovídá Motion offsetu ["start center", "end end"]).
    const rect = track.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const start = viewportH * 0.5;               // "start center"
    const totalScrollable = rect.height - viewportH; // do "end end"
    if (totalScrollable <= 0) return 1;
    const scrolled = start - rect.top;
    return clamp01(scrolled / (totalScrollable + start));
  }

  function applyProgress() {
    const p = getProgress();

    // Video okno: inset (maska) 45% → 0%, zaoblení 1000px → 28px.
    const insetY = mapRange(p, [0, 0.8], [40, 0]);
    const insetX = mapRange(p, [0, 0.8], [40, 0]);
    const roundedness = mapRange(p, [0, 1], [1000, 28]);
    videoMask.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${roundedness}px)`;

    // Video mírně "zoomuje" dovnitř, jak se scrolluje (scale 0.7 → 1).
    const scale = mapRange(p, [0, 0.8], [0.82, 1]);
    video.style.transform = `scale(${scale})`;

    // Text nad videem: posun nahoru + blur/fade-in na začátku scrollu.
    const textY = mapRange(p, [0.2, 0.8], [80, 0]);
    const textOpacity = mapRange(p, [0, 0.25], [0, 1]);
    const textBlur = mapRange(p, [0, 0.25], [10, 0]);
    content.style.transform = `translateY(${textY}px)`;
    content.style.opacity = String(textOpacity);
    content.style.filter = `blur(${textBlur}px)`;

    // Tlačítka: zjeví se zdola o něco později než text.
    const actionsY = mapRange(p, [0, 0.7], [-120, 0]);
    const actionsOpacity = mapRange(p, [0, 0.3], [0, 1]);
    const actionsBlur = mapRange(p, [0, 0.3], [10, 0]);
    actions.style.transform = `translateY(${actionsY}px)`;
    actions.style.opacity = String(actionsOpacity);
    actions.style.filter = `blur(${actionsBlur}px)`;

    // Nápověda ke scrollování zmizí, jakmile se video začne odmaskovávat.
    scrollCue.style.opacity = String(1 - clamp01(p * 6));
  }

  if (prefersReducedMotion) {
    // Bez animace rovnou zobrazíme plně rozbalený stav.
    videoMask.style.clipPath = 'inset(0% 0% 0% 0% round 28px)';
    video.style.transform = 'scale(1)';
    content.style.transform = 'translateY(0)';
    content.style.opacity = '1';
    content.style.filter = 'none';
    actions.style.transform = 'translateY(0)';
    actions.style.opacity = '1';
    actions.style.filter = 'none';
    scrollCue.style.display = 'none';
    return;
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        applyProgress();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  applyProgress();
}
