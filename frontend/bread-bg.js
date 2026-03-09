/**
 * bread-bg.js
 * Animated falling toast slices background for the landing overlay.
 */
(function () {
  'use strict';

  const COUNT      = 13;
  const SPEED_MIN  = 0.45;
  const SPEED_MAX  = 1.0;
  const SWAY_AMP   = 26;
  const SWAY_SPEED = 0.008;
  const ROT_SPEED  = 0.007;
  const SIZE_MIN   = 42;
  const SIZE_MAX   = 82;

  let canvas, ctx, slices = [], raf;
  let W = 0, H = 0;

  // ── Rounded-rect path helper ──────────────────────────────────────────────
  function roundRect(cx, cy, w, h, r) {
    const x = cx - w / 2, y = cy - h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Draw a toast slice centered at 0,0 with half-size s ──────────────────
  function drawToast(s) {
    const w  = s * 1.9;   // slightly wider than tall
    const h  = s * 1.85;
    const cr = s * 0.22;  // corner radius
    const cw = s * 0.16;  // crust border width

    // ── Drop shadow ────────────────────────────────────────────────────────
    ctx.shadowColor    = 'rgba(0,0,0,0.40)';
    ctx.shadowBlur     = s * 0.55;
    ctx.shadowOffsetX  = s * 0.06;
    ctx.shadowOffsetY  = s * 0.12;

    // ── Crust (full shape, golden-brown) ───────────────────────────────────
    roundRect(0, 0, w, h, cr);
    const crustGrad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
    crustGrad.addColorStop(0,    '#d4882a');
    crustGrad.addColorStop(0.35, '#c07020');
    crustGrad.addColorStop(0.7,  '#a85818');
    crustGrad.addColorStop(1,    '#8a4010');
    ctx.fillStyle = crustGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;

    // ── Inner bread face (cream/pale yellow) ───────────────────────────────
    const iw = w - cw * 2;
    const ih = h - cw * 2;
    const icr = Math.max(cr - cw, 4);
    roundRect(0, 0, iw, ih, icr);

    const innerGrad = ctx.createRadialGradient(-iw*0.15, -ih*0.2, iw*0.05, 0, 0, iw*0.72);
    innerGrad.addColorStop(0,    '#f5ebc8');
    innerGrad.addColorStop(0.3,  '#ecdba8');
    innerGrad.addColorStop(0.65, '#dfc88a');
    innerGrad.addColorStop(1,    '#c9a85a');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    // ── Crumb texture — small irregular pores ─────────────────────────────
    ctx.save();
    roundRect(0, 0, iw, ih, icr);
    ctx.clip();

    const poreCount = Math.floor(s * 1.4);
    for (let i = 0; i < poreCount; i++) {
      const px = (Math.random() - 0.5) * iw * 0.85;
      const py = (Math.random() - 0.5) * ih * 0.85;
      const pr = s * (0.02 + Math.random() * 0.055);
      const alpha = 0.08 + Math.random() * 0.14;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (0.6 + Math.random() * 0.8), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,110,40,${alpha})`;
      ctx.fill();
    }

    // ── Subtle highlight top-left ──────────────────────────────────────────
    const hi = ctx.createRadialGradient(-iw*0.28, -ih*0.28, 0, -iw*0.1, -ih*0.1, iw*0.65);
    hi.addColorStop(0,   'rgba(255,245,200,0.45)');
    hi.addColorStop(0.5, 'rgba(255,235,170,0.12)');
    hi.addColorStop(1,   'rgba(255,255,255,0)');
    roundRect(0, 0, iw, ih, icr);
    ctx.fillStyle = hi;
    ctx.fill();

    ctx.restore();

    // ── Crust inner-edge shadow (darkens the border area) ─────────────────
    roundRect(0, 0, w, h, cr);
    const rimGrad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
    rimGrad.addColorStop(0,   'rgba(0,0,0,0)');
    rimGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(1,   'rgba(0,0,0,0.18)');
    ctx.fillStyle = rimGrad;
    ctx.fill();
  }

  // ── Spawn a slice ─────────────────────────────────────────────────────────
  function spawnSlice(startY) {
    const s = SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN);
    return {
      s,
      y:      startY !== undefined ? startY : -(s + Math.random() * H),
      swayX:  Math.random() * W,
      speed:  SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
      angle:  Math.random() * Math.PI * 2,
      rotDir: Math.random() < 0.5 ? 1 : -1,
      rotSpd: ROT_SPEED * (0.4 + Math.random() * 0.8),
      swayO:  Math.random() * Math.PI * 2,
      frame:  Math.random() * 1000,
      opacity: 0.70 + Math.random() * 0.28,
      // Pre-bake pores so they don't re-randomise every frame
      pores: null
    };
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (const sl of slices) {
      sl.frame++;
      sl.y     += sl.speed;
      sl.angle += sl.rotDir * sl.rotSpd;
      const x = sl.swayX + Math.sin(sl.frame * SWAY_SPEED + sl.swayO) * SWAY_AMP;

      if (sl.y - sl.s * 1.4 > H) {
        sl.y     = -(sl.s * 1.4 + 10);
        sl.swayX = Math.random() * W;
        sl.frame = 0;
      }

      ctx.save();
      ctx.globalAlpha = sl.opacity;
      ctx.translate(x, sl.y);
      ctx.rotate(sl.angle);
      drawToast(sl.s);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    raf = requestAnimationFrame(tick);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
    slices.forEach(sl => { sl.swayX = Math.random() * W; });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    const overlay = document.getElementById('landingOverlay');
    if (!overlay) return;

    canvas = document.createElement('canvas');
    canvas.id = 'breadBgCanvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;border-radius:inherit';
    overlay.insertBefore(canvas, overlay.firstChild);

    const split = overlay.querySelector('.landing-split');
    if (split) { split.style.position = 'relative'; split.style.zIndex = '1'; }

    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < COUNT; i++) {
      slices.push(spawnSlice(Math.random() * H));
    }

    tick();

    new MutationObserver(() => {
      const hidden = overlay.classList.contains('hidden');
      if (hidden && raf)  { cancelAnimationFrame(raf); raf = null; }
      else if (!hidden && !raf) tick();
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();