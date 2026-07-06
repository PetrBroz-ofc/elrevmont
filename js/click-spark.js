/* =========================================================
   ELREVMONT — ClickSpark efekt
   Vanilla JS ekvivalent komponenty "ClickSpark" (React Bits):
   při kliknutí kdekoliv na stránce vylétnou z místa kliknutí
   krátké jiskry/čárky, které se rozletí do stran a zmizí.

   Implementace přes jediné <canvas> přes celou obrazovku
   (position: fixed, pointer-events: none, aby nezasahovalo do
   klikání na skutečné prvky pod ním) — žádná závislost na Reactu.
   ========================================================= */

function initClickSpark(options = {}) {
  const sparkColor = options.sparkColor || '#2E9BF0';
  const sparkSize = options.sparkSize ?? 10;
  const sparkRadius = options.sparkRadius ?? 18;
  const sparkCount = options.sparkCount ?? 8;
  const duration = options.duration ?? 400;
  const easing = options.easing || 'ease-out';
  const extraScale = options.extraScale ?? 1.0;

  const canvas = document.createElement('canvas');
  canvas.id = 'click-spark-canvas';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let sparks = [];
  let dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 100);
  });

  function ease(t) {
    switch (easing) {
      case 'linear': return t;
      case 'ease-in': return t * t;
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default: return t * (2 - t); // ease-out
    }
  }

  let animationId = null;

  function draw(timestamp) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    sparks = sparks.filter(spark => {
      const elapsed = timestamp - spark.startTime;
      if (elapsed >= duration) return false;

      const progress = elapsed / duration;
      const eased = ease(progress);

      const distance = eased * sparkRadius * extraScale;
      const lineLength = sparkSize * (1 - eased);

      const x1 = spark.x + distance * Math.cos(spark.angle);
      const y1 = spark.y + distance * Math.sin(spark.angle);
      const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
      const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

      ctx.strokeStyle = sparkColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      return true;
    });

    animationId = requestAnimationFrame(draw);
  }
  animationId = requestAnimationFrame(draw);

  // Respektujeme "omezit pohyb" — jiskry úplně vypneme, ne jen zpomalíme,
  // protože jde o čistě dekorativní efekt bez informační hodnoty.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    if (animationId) cancelAnimationFrame(animationId);
    canvas.remove();
    return;
  }

  document.addEventListener('click', (e) => {
    // Nevytváříme jiskry při kliknutí do textových polí/formulářů v adminu
    // (tam by to spíš rušilo), ale na veřejném webu to necháváme všude.
    const now = performance.now();
    const newSparks = Array.from({ length: sparkCount }, (_, i) => ({
      x: e.clientX,
      y: e.clientY,
      angle: (2 * Math.PI * i) / sparkCount,
      startTime: now
    }));
    sparks.push(...newSparks);
  });
}
