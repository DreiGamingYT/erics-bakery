/**
 * global-search.js
 * Powers the #topSearch bar with live cross-module results.
 * Searches: Ingredients (name, supplier, type) + Activity log.
 *
 * Reuses window._bakeryIngredientsCache and window._bakeryActivityCache
 * set by reports-enhancements.js — no extra API calls.
 * Load AFTER app.js and reports-enhancements.js.
 */
(function () {
  'use strict';

  const DEBOUNCE_MS   = 220;
  const MAX_PER_GROUP = 5;
  const MIN_CHARS     = 2;

  let _debounce  = null;
  let _activeIdx = -1;

  // ── Pull from shared cache (set by reports-enhancements.js) ──────────────
  // Falls back to a direct fetch only if the cache is genuinely empty
  // (e.g. user lands on a page without Reports loaded yet).
  function getIngredients() { return window._bakeryIngredientsCache || []; }
  function getActivity()    { return window._bakeryActivityCache    || []; }

  async function ensureCacheLoaded() {
    if (getIngredients().length || getActivity().length) return; // already warm
    try {
      const [ingRes, actRes] = await Promise.all([
        fetch('/api/ingredients?limit=2000&page=1', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('/api/activity?limit=2000',           { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      ]);
      // Store in the shared slots so other scripts benefit too
      window._bakeryIngredientsCache = ingRes?.items || [];
      window._bakeryActivityCache    = actRes?.items || [];
    } catch (e) {
      console.warn('[global-search] fallback fetch failed:', e.message);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return esc(text).replace(re, '<mark style="background:rgba(99,102,241,.25);border-radius:2px;padding:0 1px">$1</mark>');
  }

  // ── Search ────────────────────────────────────────────────────────────────
  function searchIngredients(q) {
    const lower = q.toLowerCase();
    return getIngredients().filter(it =>
      (it.name     || '').toLowerCase().includes(lower) ||
      (it.supplier || '').toLowerCase().includes(lower) ||
      (it.type     || '').toLowerCase().includes(lower)
    ).slice(0, MAX_PER_GROUP);
  }

  function searchActivity(q) {
    const lower = q.toLowerCase();
    return getActivity().filter(a =>
      (a.text   || '').toLowerCase().includes(lower) ||
      (a.action || '').toLowerCase().includes(lower)
    ).slice(0, MAX_PER_GROUP);
  }

  // ── Dropdown ──────────────────────────────────────────────────────────────
  function getOrCreateDropdown(input) {
    let dd = document.getElementById('globalSearchDropdown');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = 'globalSearchDropdown';
      dd.setAttribute('role', 'listbox');
      dd.style.cssText = [
        'position:absolute','top:calc(100% + 6px)','left:0','right:0',
        'background:var(--card,#fff)',
        'border:1px solid rgba(0,0,0,0.10)',
        'border-radius:12px',
        'box-shadow:0 8px 32px rgba(0,0,0,0.13)',
        'z-index:9999','max-height:420px','overflow-y:auto',
        'font-size:13px','padding:6px 0'
      ].join(';');
      const wrap = input.closest('.top-search') || input.parentElement;
      wrap.style.position = 'relative';
      wrap.appendChild(dd);
    }
    return dd;
  }

  function renderGroup(title, icon, items, q, buildRow) {
    if (!items.length) return '';
    return `
      <div style="padding:6px 14px 2px;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--muted,#888);text-transform:uppercase">
        <i class="fa ${icon}" style="margin-right:5px;opacity:.6"></i>${title}
      </div>
      ${items.map(it => buildRow(it, q)).join('')}`;
  }

  function renderDropdown(dd, ingResults, actResults, q) {
    _activeIdx = -1;

    if (!ingResults.length && !actResults.length) {
      const cacheEmpty = !getIngredients().length && !getActivity().length;
      dd.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted,#888)">
        <i class="fa fa-magnifying-glass" style="font-size:22px;opacity:.3;display:block;margin-bottom:8px"></i>
        No results for "<strong>${esc(q)}</strong>"
        ${cacheEmpty ? '<div style="font-size:11px;margin-top:6px;opacity:.6">Try opening Reports first to load data</div>' : ''}
      </div>`;
      return;
    }

    const ingHTML = renderGroup('Ingredients', 'fa-boxes-stacked', ingResults, q, (it, q) => {
      const badge = it.qty <= (it.min_qty || 0)
        ? `<span style="font-size:10px;padding:1px 5px;border-radius:999px;background:rgba(239,68,68,.12);color:#dc2626;margin-left:6px">Low</span>` : '';
      return `<div class="gs-item" data-type="ingredient" data-id="${it.id}"
        style="display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;border-radius:8px;margin:1px 6px">
        <i class="fa fa-box" style="opacity:.4;width:16px;text-align:center"></i>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${highlight(it.name, q)}${badge}</div>
          <div style="font-size:11px;color:var(--muted,#888)">Qty: ${it.qty} ${it.unit || ''} · ${it.supplier || 'No supplier'}</div>
        </div>
        <i class="fa fa-arrow-right" style="opacity:.25;font-size:11px"></i>
      </div>`;
    });

    const actHTML = renderGroup('Activity', 'fa-clock-rotate-left', actResults, q, (a, q) => {
      return `<div class="gs-item" data-type="activity"
        style="display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;border-radius:8px;margin:1px 6px">
        <i class="fa fa-list" style="opacity:.4;width:16px;text-align:center"></i>
        <div style="flex:1;min-width:0">
          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${highlight(a.text || a.action, q)}</div>
          <div style="font-size:11px;color:var(--muted,#888)">${a.time ? new Date(a.time).toLocaleString() : ''}</div>
        </div>
        <i class="fa fa-arrow-right" style="opacity:.25;font-size:11px"></i>
      </div>`;
    });

    dd.innerHTML = ingHTML + actHTML;

    dd.querySelectorAll('.gs-item').forEach(el => {
      el.addEventListener('mouseenter', () => { clearActive(dd); el.style.background = 'var(--hover-bg,rgba(99,102,241,.07))'; });
      el.addEventListener('mouseleave', () => { el.style.background = ''; });
      el.addEventListener('mousedown',  (e) => { e.preventDefault(); handleSelect(el); });
    });
  }

  // ── Keyboard nav ──────────────────────────────────────────────────────────
  function getItems(dd) { return Array.from(dd.querySelectorAll('.gs-item')); }

  function clearActive(dd) {
    getItems(dd).forEach(el => { el.style.background = ''; el.removeAttribute('aria-selected'); });
  }

  function setActive(dd, idx) {
    const items = getItems(dd);
    clearActive(dd);
    if (idx < 0 || idx >= items.length) { _activeIdx = -1; return; }
    _activeIdx = idx;
    items[idx].style.background = 'var(--hover-bg,rgba(99,102,241,.07))';
    items[idx].setAttribute('aria-selected', 'true');
    items[idx].scrollIntoView({ block: 'nearest' });
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function handleSelect(el) {
    const type = el.dataset.type;
    closeDropdown();
    if (type === 'ingredient') {
      if (typeof showView === 'function') showView('inventory');
      setTimeout(() => {
        const inv = document.getElementById('inventorySearch') || document.getElementById('searchInput');
        if (inv) {
          inv.value = el.querySelector('[style*="font-weight:600"]')?.textContent?.trim() || '';
          inv.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 300);
    } else if (type === 'activity') {
      if (typeof showView === 'function') showView('activity');
    }
  }

  function closeDropdown() {
    document.getElementById('globalSearchDropdown')?.remove();
    _activeIdx = -1;
  }

  // ── Input handler ─────────────────────────────────────────────────────────
  async function onInput(e, input) {
    const q = (e.target.value || '').trim();
    if (q.length < MIN_CHARS) { closeDropdown(); return; }

    // If cache is cold, show a brief loading state and fetch once
    if (!getIngredients().length && !getActivity().length) {
      const dd = getOrCreateDropdown(input);
      dd.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted,#888);font-size:12px">
        <i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Loading…</div>`;
      await ensureCacheLoaded();
    }

    const dd = getOrCreateDropdown(input);
    renderDropdown(dd, searchIngredients(q), searchActivity(q), q);
  }

  function onKeydown(e, input) {
    const dd = document.getElementById('globalSearchDropdown');
    if (!dd) return;
    const items = getItems(dd);
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActive(dd, Math.min(_activeIdx + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(dd, Math.max(_activeIdx - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (_activeIdx >= 0 && items[_activeIdx]) { handleSelect(items[_activeIdx]); input.value = ''; } }
    else if (e.key === 'Escape')    { closeDropdown(); input.blur(); }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('globalSearchStyles')) return;
    const s = document.createElement('style');
    s.id = 'globalSearchStyles';
    s.textContent = `
      #topSearch {
        width:100%; padding:8px 36px 8px 14px;
        border-radius:8px; border:1.5px solid rgba(255,255,255,0.15);
        background:rgba(255,255,255,0.10); color:inherit;
        font-size:13px; outline:none; min-width:220px;
        transition:border-color .15s, background .15s;
      }
      #topSearch:focus { border-color:rgba(99,102,241,0.6); background:rgba(255,255,255,0.18); }
      #topSearch::placeholder { opacity:.55; }
      .top-search { position:relative; display:flex; align-items:center; }
      .top-search::after {
        content:"\\f002"; font-family:"Font Awesome 6 Free"; font-weight:900;
        position:absolute; right:10px; opacity:.4; pointer-events:none; font-size:12px;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    const input = document.getElementById('topSearch');
    if (!input) { console.warn('[global-search] #topSearch not found'); return; }

    input.setAttribute('autocomplete', 'off');

    input.addEventListener('input', (e) => {
      clearTimeout(_debounce);
      _debounce = setTimeout(() => onInput(e, input), DEBOUNCE_MS);
    });
    input.addEventListener('keydown', (e) => onKeydown(e, input));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.top-search') && !e.target.closest('#globalSearchDropdown')) closeDropdown();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 400));
  } else {
    setTimeout(init, 400);
  }

})();