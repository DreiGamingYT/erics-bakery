/**
 * bread-bg.js
 * Animated falling bread rolls background for the landing overlay.
 * Draws on a canvas injected behind #landingOverlay content.
 */
(function () {
  'use strict';

  const COUNT       = 13;    // number of rolls
  const SPEED_MIN   = 0.5;   // px/frame fall speed (slow)
  const SPEED_MAX   = 1.1;
  const SWAY_AMP    = 28;    // horizontal sway amplitude in px
  const SWAY_SPEED  = 0.008; // sway frequency
  const ROT_SPEED   = 0.008; // rotation radians per frame
  const SIZE_MIN    = 38;
  const SIZE_MAX    = 80;

  let canvas, ctx, rolls = [], raf;
  let W = 0, H = 0;

  // ── Draw a single bread roll ──────────────────────────────────────────────
  function drawRoll(x, y, r, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur  = r * 0.5;
    ctx.shadowOffsetY = r * 0.15;

    // Base gradient — warm golden-brown
    const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.05, 0, 0, r);
    grad.addColorStop(0,   '#e8c07a');
    grad.addColorStop(0.4, '#c8883a');
    grad.addColorStop(0.75,'#a05c1a');
    grad.addColorStop(1,   '#7a3a08');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Top highlight
    const hi = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, -r * 0.2, -r * 0.2, r * 0.7);
    hi.addColorStop(0,   'rgba(255,230,160,0.55)');
    hi.addColorStop(0.5, 'rgba(255,210,120,0.18)');
    hi.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = hi;
    ctx.fill();

    // Scoring lines (cross-hatch)
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = 'rgba(90,40,5,0.55)';
    ctx.lineWidth   = Math.max(1, r * 0.055);
    ctx.lineCap     = 'round';
    const sl = r * 0.55; // line half-length

    // Diagonal ↗
    ctx.save();
    ctx.clip();  // clip to circle so lines don't spill out
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    [[-sl * 0.4, -sl * 0.4, sl * 0.4, sl * 0.4],
     [ sl * 0.4, -sl * 0.4,-sl * 0.4, sl * 0.4]].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Rim darkening
    const rim = ctx.createRadialGradient(0, 0, r * 0.72, 0, 0, r);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();

    ctx.restore(); // restore clip
    ctx.restore(); // restore transform
  }

  // ── Spawn a roll (random x, above screen) ────────────────────────────────
  function spawnRoll(startY) {
    const r     = SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN);
    const swayO = Math.random() * Math.PI * 2; // sway phase offset
    return {
      x:       Math.random() * W,
      y:       startY !== undefined ? startY : -(r + Math.random() * H),
      r,
      speed:   SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
      angle:   Math.random() * Math.PI * 2,
      rotDir:  Math.random() < 0.5 ? 1 : -1,
      rotSpd:  ROT_SPEED * (0.5 + Math.random()),
      swayO,
      swayX:   Math.random() * W, // base x
      frame:   Math.random() * 1000,
      opacity: 0.72 + Math.random() * 0.28
    };
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (const roll of rolls) {
      roll.frame++;
      roll.y     += roll.speed;
      roll.angle += roll.rotDir * roll.rotSpd;
      const swayX = roll.swayX + Math.sin(roll.frame * SWAY_SPEED + roll.swayO) * SWAY_AMP;

      // Reset when off-screen bottom
      if (roll.y - roll.r > H) {
        roll.y     = -(roll.r + 10);
        roll.swayX = Math.random() * W;
        roll.frame = 0;
      }

      ctx.globalAlpha = roll.opacity;
      drawRoll(swayX, roll.y, roll.r, roll.angle);
      ctx.globalAlpha = 1;
    }

    raf = requestAnimationFrame(tick);
  }

  // ── Resize handler ────────────────────────────────────────────────────────
  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
    // Reposition rolls that are now off-screen horizontally
    rolls.forEach(r => { r.swayX = Math.random() * W; });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    const overlay = document.getElementById('landingOverlay');
    if (!overlay) return;

    canvas = document.createElement('canvas');
    canvas.id = 'breadBgCanvas';
    canvas.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'z-index:0',
      'pointer-events:none',
      'border-radius:inherit'
    ].join(';');

    // Insert as first child so it's behind everything
    overlay.insertBefore(canvas, overlay.firstChild);

    // Make sure overlay content sits above canvas
    const split = overlay.querySelector('.landing-split');
    if (split) split.style.position = 'relative', split.style.zIndex = '1';

    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Spread rolls across screen at start (not all at top)
    for (let i = 0; i < COUNT; i++) {
      rolls.push(spawnRoll(Math.random() * H));
    }

    tick();

    // Pause when overlay is hidden to save CPU
    const observer = new MutationObserver(() => {
      const hidden = overlay.classList.contains('hidden');
      if (hidden && raf) { cancelAnimationFrame(raf); raf = null; }
      else if (!hidden && !raf) tick();
    });
    observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();