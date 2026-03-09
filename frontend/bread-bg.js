/**
 * bread-bg.js
 * Animated falling sandwich toast slices for the landing overlay.
 */
(function () {
  'use strict';

  const COUNT      = 13;
  const SPEED_MIN  = 0.45;
  const SPEED_MAX  = 1.0;
  const SWAY_AMP   = 26;
  const SWAY_SPEED = 0.008;
  const ROT_SPEED  = 0.006;
  const SIZE_MIN   = 44;
  const SIZE_MAX   = 88;

  let canvas, ctx, slices = [], raf;
  let W = 0, H = 0;

  // ── Build the toast outline path (sandwich bread shape) ──────────────────
  // Centered at 0,0. s = half-size unit.
  // Shape: mostly square, slight dome bump at top, rounded corners.
  function toastPath(s) {
    const w  = s * 1.85;
    const h  = s * 1.90;
    const hw = w / 2, hh = h / 2;
    const cr = s * 0.13; // corner radius

    ctx.beginPath();
    // Start bottom-left corner
    ctx.moveTo(-hw + cr, hh);
    // Bottom edge → bottom-right
    ctx.lineTo( hw - cr, hh);
    ctx.quadraticCurveTo( hw, hh,  hw, hh - cr);
    // Right edge → top-right
    ctx.lineTo( hw, -hh * 0.55);
    ctx.quadraticCurveTo( hw, -hh * 0.72,  hw * 0.82, -hh * 0.88);
    // Top-right shoulder → dome bump
    ctx.quadraticCurveTo( hw * 0.45, -hh * 1.14, 0, -hh * 1.16);
    // Dome → top-left shoulder
    ctx.quadraticCurveTo(-hw * 0.45, -hh * 1.14, -hw * 0.82, -hh * 0.88);
    // Left-top → left edge
    ctx.quadraticCurveTo(-hw, -hh * 0.72, -hw, -hh * 0.55);
    // Left edge → bottom-left
    ctx.lineTo(-hw, hh - cr);
    ctx.quadraticCurveTo(-hw, hh, -hw + cr, hh);
    ctx.closePath();
  }

  // ── Shrunk inner path for the crumb face ─────────────────────────────────
  function innerPath(s, inset) {
    const w  = s * 1.85 - inset * 2;
    const h  = s * 1.90 - inset * 2;
    const hw = w / 2, hh = h / 2;
    const cr = Math.max(s * 0.07, 2);
    const sc = inset / (s * 0.95); // scale factor to shrink dome

    ctx.beginPath();
    ctx.moveTo(-hw + cr, hh);
    ctx.lineTo( hw - cr, hh);
    ctx.quadraticCurveTo( hw, hh,  hw, hh - cr);
    ctx.lineTo( hw, -hh * 0.55);
    ctx.quadraticCurveTo( hw, -hh * 0.72,  hw * 0.82, -hh * 0.88);
    ctx.quadraticCurveTo( hw * 0.45, -hh * (1.14 - sc * 0.2), 0, -hh * (1.16 - sc * 0.22));
    ctx.quadraticCurveTo(-hw * 0.45, -hh * (1.14 - sc * 0.2), -hw * 0.82, -hh * 0.88);
    ctx.quadraticCurveTo(-hw, -hh * 0.72, -hw, -hh * 0.55);
    ctx.lineTo(-hw, hh - cr);
    ctx.quadraticCurveTo(-hw, hh, -hw + cr, hh);
    ctx.closePath();
  }

  // ── Draw one toast slice ──────────────────────────────────────────────────
  function drawToast(s) {
    const inset = s * 0.17; // crust thickness

    // Shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.42)';
    ctx.shadowBlur    = s * 0.6;
    ctx.shadowOffsetX = s * 0.05;
    ctx.shadowOffsetY = s * 0.14;

    // ── 1. Full crust shape ────────────────────────────────────────────────
    toastPath(s);
    const crustG = ctx.createLinearGradient(-s * 0.9, -s * 0.95, s * 0.9, s * 0.95);
    crustG.addColorStop(0,    '#d4922e');
    crustG.addColorStop(0.25, '#c07828');
    crustG.addColorStop(0.55, '#a86020');
    crustG.addColorStop(0.78, '#8c4a14');
    crustG.addColorStop(1,    '#6e3008');
    ctx.fillStyle = crustG;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.restore();

    // ── 2. Inner crumb face ───────────────────────────────────────────────
    ctx.save();
    innerPath(s, inset);
    ctx.clip();

    // Base crumb color
    const crumbG = ctx.createRadialGradient(-s * 0.2, -s * 0.35, s * 0.02, s * 0.05, s * 0.05, s * 1.1);
    crumbG.addColorStop(0,    '#f8f0d8');
    crumbG.addColorStop(0.18, '#f2e4be');
    crumbG.addColorStop(0.45, '#e8d09a');
    crumbG.addColorStop(0.72, '#d8b878');
    crumbG.addColorStop(1,    '#c4a058');
    ctx.fillStyle = crumbG;
    innerPath(s, inset);
    ctx.fill();

    // Fibrous strands — long thin curved lines mimicking bread structure
    const strandCount = Math.floor(s * 1.8);
    for (let i = 0; i < strandCount; i++) {
      const x1 = (Math.random() - 0.5) * s * 1.5;
      const y1 = (Math.random() - 0.5) * s * 1.5;
      const len = s * (0.08 + Math.random() * 0.22);
      const ang = Math.random() * Math.PI;
      const x2  = x1 + Math.cos(ang) * len;
      const y2  = y1 + Math.sin(ang) * len;
      const alpha = 0.04 + Math.random() * 0.09;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(155, 100, 35, ${alpha})`;
      ctx.lineWidth   = 0.5 + Math.random() * 0.9;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    // Pores / air holes
    const poreCount = Math.floor(s * 1.6);
    for (let i = 0; i < poreCount; i++) {
      const px    = (Math.random() - 0.5) * s * 1.4;
      const py    = (Math.random() - 0.5) * s * 1.4;
      const pr    = s * (0.015 + Math.random() * 0.05);
      const alpha = 0.07 + Math.random() * 0.16;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (0.5 + Math.random() * 0.9), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(140, 88, 28, ${alpha})`;
      ctx.fill();
    }

    // Top-left highlight sheen
    const hiG = ctx.createRadialGradient(-s * 0.35, -s * 0.4, 0, -s * 0.1, -s * 0.15, s * 0.85);
    hiG.addColorStop(0,   'rgba(255,248,220,0.50)');
    hiG.addColorStop(0.4, 'rgba(255,240,190,0.18)');
    hiG.addColorStop(1,   'rgba(255,255,255,0.00)');
    innerPath(s, inset);
    ctx.fillStyle = hiG;
    ctx.fill();

    ctx.restore();

    // ── 3. Crust edge detail — thin dark border ────────────────────────────
    toastPath(s);
    ctx.strokeStyle = 'rgba(80,35,5,0.30)';
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // ── 4. Crust inner-edge shadow at the seam ────────────────────────────
    ctx.save();
    toastPath(s);
    ctx.clip();
    innerPath(s, inset * 0.35);
    // Draw a ring just inside the crust-crumb boundary
    const seamG = ctx.createLinearGradient(-s * 0.9, -s, s * 0.9, s);
    seamG.addColorStop(0,   'rgba(0,0,0,0.00)');
    seamG.addColorStop(0.5, 'rgba(0,0,0,0.00)');
    seamG.addColorStop(1,   'rgba(0,0,0,0.12)');
    ctx.strokeStyle = seamG;
    ctx.lineWidth   = inset * 1.1;
    ctx.stroke();
    ctx.restore();
  }

  // ── Spawn ─────────────────────────────────────────────────────────────────
  function spawnSlice(startY) {
    const s = SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN);
    return {
      s,
      y:      startY !== undefined ? startY : -(s * 1.5 + Math.random() * H),
      swayX:  Math.random() * W,
      speed:  SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
      angle:  Math.random() * Math.PI * 2,
      rotDir: Math.random() < 0.5 ? 1 : -1,
      rotSpd: ROT_SPEED * (0.4 + Math.random() * 0.9),
      swayO:  Math.random() * Math.PI * 2,
      frame:  Math.random() * 1000,
      opacity: 0.72 + Math.random() * 0.26
    };
  }

  // ── Loop ──────────────────────────────────────────────────────────────────
  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const sl of slices) {
      sl.frame++;
      sl.y     += sl.speed;
      sl.angle += sl.rotDir * sl.rotSpd;
      const x = sl.swayX + Math.sin(sl.frame * SWAY_SPEED + sl.swayO) * SWAY_AMP;

      if (sl.y - sl.s * 1.5 > H) {
        sl.y     = -(sl.s * 1.5 + 10);
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

    // Remove old canvas if re-initialising
    const old = document.getElementById('breadBgCanvas');
    if (old) old.remove();

    canvas = document.createElement('canvas');
    canvas.id = 'breadBgCanvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;border-radius:inherit';
    overlay.insertBefore(canvas, overlay.firstChild);

    const split = overlay.querySelector('.landing-split');
    if (split) { split.style.position = 'relative'; split.style.zIndex = '1'; }

    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < COUNT; i++) slices.push(spawnSlice(Math.random() * H));

    tick();

    new MutationObserver(() => {
      const hidden = overlay.classList.contains('hidden');
      if (hidden && raf)        { cancelAnimationFrame(raf); raf = null; }
      else if (!hidden && !raf) { tick(); }
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();