/**
 * global-search.js
 * Powers the #topSearch bar in the topbar with live, cross-module results.
 *
 * Searches across:
 *   • Ingredients  (name, supplier, type)
 *   • Activity log (action text)
 *
 * Clicking a result navigates to the relevant view.
 * Load AFTER app.js.
 */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const DEBOUNCE_MS   = 220;
  const MAX_PER_GROUP = 5;
  const MIN_CHARS     = 2;

  // ── State ─────────────────────────────────────────────────────────────────
  let _ingredients = [];
  let _activity    = [];
  let _loaded      = false;
  let _debounce    = null;
  let _activeIdx   = -1;

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

  // ── Data loader ───────────────────────────────────────────────────────────
  async function ensureData() {
    if (_loaded) return;
    try {
      const [ingRes, actRes] = await Promise.allSettled([
        apiFetch('/api/ingredients?limit=2000&page=1'),
        apiFetch('/api/activity?limit=2000')
      ]);
      if (ingRes.status === 'fulfilled') _ingredients = ingRes.value?.items || [];
      if (actRes.status === 'fulfilled') _activity    = actRes.value?.items || [];
      _loaded = true;
    } catch (e) {
      console.warn('[global-search] data load failed', e);
    }
  }

  // Invalidate cache when stock changes so search stays fresh
  window.addEventListener('bakery:stockChanged', () => { _loaded = false; });

  // ── Search logic ──────────────────────────────────────────────────────────
  function searchIngredients(q) {
    const lower = q.toLowerCase();
    return _ingredients.filter(it =>
      (it.name     || '').toLowerCase().includes(lower) ||
      (it.supplier || '').toLowerCase().includes(lower) ||
      (it.type     || '').toLowerCase().includes(lower)
    ).slice(0, MAX_PER_GROUP);
  }

  function searchActivity(q) {
    const lower = q.toLowerCase();
    return _activity.filter(a =>
      (a.text   || '').toLowerCase().includes(lower) ||
      (a.action || '').toLowerCase().includes(lower)
    ).slice(0, MAX_PER_GROUP);
  }

  // ── Dropdown rendering ────────────────────────────────────────────────────
  function getOrCreateDropdown(input) {
    let dd = document.getElementById('globalSearchDropdown');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = 'globalSearchDropdown';
      dd.setAttribute('role', 'listbox');
      dd.setAttribute('aria-label', 'Search results');
      dd.style.cssText = [
        'position:absolute',
        'top:calc(100% + 6px)',
        'left:0',
        'right:0',
        'background:var(--card,#fff)',
        'border:1px solid rgba(0,0,0,0.10)',
        'border-radius:12px',
        'box-shadow:0 8px 32px rgba(0,0,0,0.13)',
        'z-index:9999',
        'max-height:420px',
        'overflow-y:auto',
        'font-size:13px',
        'padding:6px 0'
      ].join(';');

      // Place relative to the .top-search wrapper
      const wrap = input.closest('.top-search') || input.parentElement;
      wrap.style.position = 'relative';
      wrap.appendChild(dd);
    }
    return dd;
  }

  function renderGroup(title, icon, items, q, buildRow) {
    if (!items.length) return '';
    const rows = items.map(it => buildRow(it, q)).join('');
    return `
      <div class="gs-group-label" style="padding:6px 14px 2px;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--muted,#888);text-transform:uppercase">
        <i class="fa ${icon}" style="margin-right:5px;opacity:.6"></i>${title}
      </div>
      ${rows}`;
  }

  function renderDropdown(dd, ingResults, actResults, q) {
    _activeIdx = -1;

    const ingHTML = renderGroup('Ingredients', 'fa-boxes-stacked', ingResults, q, (it, q) => {
      const badge = it.qty <= (it.min_qty || 0)
        ? `<span style="font-size:10px;padding:1px 5px;border-radius:999px;background:rgba(239,68,68,.12);color:#dc2626;margin-left:6px">Low</span>`
        : '';
      return `
        <div class="gs-item" role="option" tabindex="-1"
          data-type="ingredient" data-id="${it.id}"
          style="display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;border-radius:8px;margin:1px 6px;transition:background .12s">
          <i class="fa fa-box" style="opacity:.4;width:16px;text-align:center"></i>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${highlight(it.name, q)}${badge}</div>
            <div style="font-size:11px;color:var(--muted,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              Qty: ${it.qty} ${it.unit || ''} · ${it.supplier || 'No supplier'}
            </div>
          </div>
          <i class="fa fa-arrow-right" style="opacity:.25;font-size:11px"></i>
        </div>`;
    });

    const actHTML = renderGroup('Activity', 'fa-clock-rotate-left', actResults, q, (a, q) => {
      const d = a.time ? new Date(a.time).toLocaleString() : '';
      return `
        <div class="gs-item" role="option" tabindex="-1"
          data-type="activity" data-id="${a.id || ''}"
          style="display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;border-radius:8px;margin:1px 6px;transition:background .12s">
          <i class="fa fa-list" style="opacity:.4;width:16px;text-align:center"></i>
          <div style="flex:1;min-width:0">
            <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${highlight(a.text || a.action, q)}</div>
            <div style="font-size:11px;color:var(--muted,#888)">${d}</div>
          </div>
          <i class="fa fa-arrow-right" style="opacity:.25;font-size:11px"></i>
        </div>`;
    });

    const total = ingResults.length + actResults.length;

    if (total === 0) {
      dd.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted,#888)">
        <i class="fa fa-magnifying-glass" style="font-size:22px;opacity:.3;display:block;margin-bottom:8px"></i>
        No results for "<strong>${esc(q)}</strong>"</div>`;
      return;
    }

    dd.innerHTML = ingHTML + actHTML;

    // Hover styles via JS (avoids needing a stylesheet injection)
    dd.querySelectorAll('.gs-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        clearActive(dd);
        el.style.background = 'var(--hover-bg,rgba(99,102,241,.07))';
      });
      el.addEventListener('mouseleave', () => {
        el.style.background = '';
      });
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep focus on input
        handleSelect(el);
      });
    });
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────
  function getItems(dd) {
    return Array.from(dd.querySelectorAll('.gs-item'));
  }

  function clearActive(dd) {
    getItems(dd).forEach(el => {
      el.style.background = '';
      el.removeAttribute('aria-selected');
    });
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

  // ── Result selection ──────────────────────────────────────────────────────
  function handleSelect(el) {
    const type = el.dataset.type;
    closeDropdown();

    if (type === 'ingredient') {
      if (typeof showView === 'function') showView('inventory');
      // Populate the inventory search box if it exists
      setTimeout(() => {
        const invSearch = document.getElementById('inventorySearch') ||
                          document.getElementById('searchInput');
        if (invSearch) {
          invSearch.value = el.querySelector('[style*="font-weight:600"]')?.textContent?.trim() || '';
          invSearch.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 300);

    } else if (type === 'activity') {
      if (typeof showView === 'function') showView('activity');
    }
  }

  // ── Open / close ──────────────────────────────────────────────────────────
  function closeDropdown() {
    const dd = document.getElementById('globalSearchDropdown');
    if (dd) dd.remove();
    _activeIdx = -1;
  }

  // ── Main handler ──────────────────────────────────────────────────────────
  async function onInput(e, input) {
    const q = (e.target.value || '').trim();

    if (q.length < MIN_CHARS) { closeDropdown(); return; }

    await ensureData();

    const ingResults = searchIngredients(q);
    const actResults = searchActivity(q);
    const dd = getOrCreateDropdown(input);
    renderDropdown(dd, ingResults, actResults, q);
  }

  function onKeydown(e, input) {
    const dd = document.getElementById('globalSearchDropdown');
    if (!dd) return;

    const items = getItems(dd);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(dd, Math.min(_activeIdx + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(dd, Math.max(_activeIdx - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_activeIdx >= 0 && items[_activeIdx]) {
        handleSelect(items[_activeIdx]);
        input.value = '';
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
      input.blur();
    }
  }

  // ── Wire up styles ────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('globalSearchStyles')) return;
    const s = document.createElement('style');
    s.id = 'globalSearchStyles';
    s.textContent = `
      #topSearch {
        width: 100%;
        padding: 8px 36px 8px 14px;
        border-radius: 8px;
        border: 1.5px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.10);
        color: inherit;
        font-size: 13px;
        outline: none;
        transition: border-color .15s, background .15s;
        min-width: 220px;
      }
      #topSearch:focus {
        border-color: rgba(99,102,241,0.6);
        background: rgba(255,255,255,0.18);
      }
      #topSearch::placeholder { opacity: .55; }
      .top-search {
        position: relative;
        display: flex;
        align-items: center;
      }
      .top-search::after {
        content: "\\f002";
        font-family: "Font Awesome 6 Free";
        font-weight: 900;
        position: absolute;
        right: 10px;
        opacity: .4;
        pointer-events: none;
        font-size: 12px;
      }
      #globalSearchDropdown::-webkit-scrollbar { width: 5px; }
      #globalSearchDropdown::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 99px; }
    `;
    document.head.appendChild(s);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    const input = document.getElementById('topSearch');
    if (!input) {
      console.warn('[global-search] #topSearch not found');
      return;
    }

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'globalSearchDropdown');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');

    input.addEventListener('input', (e) => {
      clearTimeout(_debounce);
      _debounce = setTimeout(() => onInput(e, input), DEBOUNCE_MS);
      input.setAttribute('aria-expanded', (e.target.value.trim().length >= MIN_CHARS).toString());
    });

    input.addEventListener('keydown', (e) => onKeydown(e, input));

    input.addEventListener('focus', () => {
      if ((input.value || '').trim().length >= MIN_CHARS) {
        // Re-trigger search on re-focus
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.top-search') && !e.target.closest('#globalSearchDropdown')) {
        closeDropdown();
        input.setAttribute('aria-expanded', 'false');
      }
    });

    // Preload data in background once app is ready
    setTimeout(ensureData, 1500);

    // Refresh cache when user navigates (new data may have been created)
    document.addEventListener('bakery:viewChanged', () => { _loaded = false; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Wait for app.js to define showView etc.
    setTimeout(init, 400);
  }

})();