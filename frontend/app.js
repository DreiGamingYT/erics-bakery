/* app.js */

const INVENTORY_PAGE_LIMIT = 10;

async function fetchIngredientsAPI({ page=1, limit=INVENTORY_PAGE_LIMIT, type='all', filter='all', search='', sort='name', order='asc'} = {}){
  const qs = new URLSearchParams({ page, limit, type, filter, search, sort, order });
  const res = await fetch('/api/ingredients?' + qs.toString(), { credentials: 'include' });
  if(!res.ok) throw new Error('Failed to fetch ingredients');
  return res.json(); // { items, meta }
}

async function fetchIngredient(id) {
  if(!id) return null;
  const res = await apiFetch(`/api/ingredients/${id}`);
  return res && res.ingredient ? res.ingredient : null;
}

async function createIngredientAPI(payload){
  const res = await fetch('/api/ingredients', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    const body = await res.json().catch(()=>({}));
    throw new Error(body.error || body.message || 'Create failed');
  }
  return res.json();
}

async function updateIngredientAPI(id, payload){
  const res = await fetch(`/api/ingredients/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    const body = await res.json().catch(()=>({}));
    throw new Error(body.error || body.message || 'Update failed');
  }
  return res.json();
}

async function changeStockAPI(id, type, qty, note=''){
  const res = await fetch(`/api/ingredients/${id}/stock`, {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ type, qty, note })
  });
  if(!res.ok){
    const body = await res.json().catch(()=>({}));
    throw new Error(body.error || body.message || 'Stock change failed');
  }
  return res.json();
}

const sampleIngredients = [
  { id:1, name:'Flour', unit:'kg', qty:250, min:62.5, max:300, expiry:null, supplier:'Protego Inc.', icon:'fa-wheat', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:1 }},
  { id:2, name:'Sugar', unit:'kg', qty:80, min:16, max:120, expiry:null, supplier:'Protego Inc.', icon:'fa-cubes-stacked', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:3, name:'Yeast', unit:'kg', qty:5, min:1, max:10, expiry:null, supplier:'Protego Inc.', icon:'fa-seedling', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:90 }},
  { id:4, name:'Baking powder', unit:'kg', qty:6, min:1, max:12, expiry:null, supplier:'Protego Inc.', icon:'fa-flask', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:5, name:'Salt', unit:'kg', qty:12, min:2, max:24, expiry:null, supplier:'Protego Inc.', icon:'fa-salt-shaker', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:6, name:'Eggs', unit:'pcs', qty:300, min:100, max:600, expiry:null, supplier:'Protego Inc.', icon:'fa-egg', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:7 }},
  { id:7, name:'Milk / Cream', unit:'L', qty:50, min:10, max:100, expiry:null, supplier:'Protego Inc.', icon:'fa-bottle-droplet', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:3 }},
  { id:8, name:'Butter', unit:'kg', qty:40, min:8, max:80, expiry:null, supplier:'Protego Inc.', icon:'fa-bottle-droplet', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:90 }},
  { id:9, name:'Margarine', unit:'kg', qty:40, min:8, max:80, expiry:null, supplier:'Protego Inc.', icon:'fa-bottle-droplet', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:90 }},
  { id:10, name:'Oil', unit:'kg', qty:40, min:8, max:80, expiry:null, supplier:'Protego Inc.', icon:'fa-bottle-droplet', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:90 }},
  { id:11, name:'Shortening', unit:'kg', qty:40, min:8, max:80, expiry:null, supplier:'Protego Inc.', icon:'fa-bottle-droplet', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:90 }},
  { id:12, name:'Cocoa powder', unit:'kg', qty:20, min:5, max:40, expiry:null, supplier:'Protego Inc.', icon:'fa-chocolate-bar', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:13, name:'Vanilla', unit:'L', qty:4, min:1, max:8, expiry:null, supplier:'Protego Inc.', icon:'fa-wine-bottle', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:14, name:'Sesame seeds', unit:'kg', qty:6, min:1, max:12, expiry:null, supplier:'Protego Inc.', icon:'fa-seedling', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:15, name:'Food coloring', unit:'mL', qty:500, min:100, max:2000, expiry:null, supplier:'Protego Inc.', icon:'fa-palette', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:16, name:'Dobrim', unit:'kg', qty:8, min:2, max:16, expiry:null, supplier:'Protego Inc.', icon:'fa-boxes-stacked', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},

  { id:20, name:'Paper bags', unit:'pcs', qty:1000, min:200, max:2000, expiry:null, supplier:'Protego Inc.', icon:'fa-box', type:'packaging', attrs:{} },
  { id:21, name:'Plastics', unit:'pcs', qty:500, min:100, max:1000, expiry:null, supplier:'Protego Inc.', icon:'fa-box', type:'packaging', attrs:{} },
  { id:22, name:'Wrapping paper', unit:'roll', qty:30, min:6, max:60, expiry:null, supplier:'Protego Inc.', icon:'fa-box', type:'packaging', attrs:{} },

  { id:30, name:'Oven', unit:'unit', qty:2, min:1, max:4, expiry:null, supplier:'Protego Inc.', icon:'fa-fire', type:'equipment', attrs:{ serial:null, warrantyYears:2 } },
  { id:31, name:'Mixer', unit:'unit', qty:1, min:1, max:2, expiry:null, supplier:'Protego Inc.', icon:'fa-cogs', type:'equipment', attrs:{ serial:null, warrantyYears:2 } },
  { id:32, name:'Baking trays & pans / molder', unit:'pcs', qty:40, min:10, max:100, expiry:null, supplier:'Protego Inc.', icon:'fa-pan-food', type:'equipment', attrs:{} },
  { id:33, name:'Measuring cups / spoons / scales', unit:'pcs', qty:12, min:3, max:30, expiry:null, supplier:'Protego Inc.', icon:'fa-weight-scale', type:'equipment', attrs:{} },
  { id:34, name:'Dough roller / Rolling pins', unit:'pcs', qty:8, min:2, max:20, expiry:null, supplier:'Protego Inc.', icon:'fa-broom', type:'equipment', attrs:{} },
  { id:35, name:'Egg beater', unit:'pcs', qty:4, min:1, max:10, expiry:null, supplier:'Protego Inc.', icon:'fa-whisk', type:'equipment', attrs:{} },
  { id:36, name:'Knives & spatulas', unit:'pcs', qty:30, min:6, max:60, expiry:null, supplier:'Protego Inc.', icon:'fa-utensils', type:'equipment', attrs:{} },

  { id:40, name:'Hairnet', unit:'pcs', qty:200, min:50, max:500, expiry:null, supplier:'Protego Inc.', icon:'fa-user-gear', type:'maintenance', attrs:{} },
  { id:41, name:'Gloves', unit:'box', qty:40, min:10, max:120, expiry:null, supplier:'Protego Inc.', icon:'fa-hand-holding', type:'maintenance', attrs:{} },
  { id:42, name:'Aprons', unit:'pcs', qty:10, min:3, max:30, expiry:null, supplier:'Protego Inc.', icon:'fa-user-tie', type:'maintenance', attrs:{} },
  { id:43, name:'Trash bags', unit:'roll', qty:50, min:12, max:150, expiry:null, supplier:'Protego Inc.', icon:'fa-trash', type:'maintenance', attrs:{} },
];

const sampleProducts = [
  { id:1, name:'Pandesal (6pcs)', category:'Bread', price:30, stock:50, image:'', recipe:[ {ingredient_id:1, qty_per_unit:0.2}, {ingredient_id:2, qty_per_unit:1} ]},
  { id:2, name:'Ensaymada (1pc)', category:'Pastry', price:45, stock:30, image:'', recipe:[ {ingredient_id:1, qty_per_unit:0.15}, {ingredient_id:4, qty_per_unit:0.02} ]},
  { id:3, name:'Brownie (1pc)', category:'Pastry', price:60, stock:15, image:'', recipe:[ {ingredient_id:1, qty_per_unit:0.12}, {ingredient_id:3, qty_per_unit:0.05} ]}
];

let DB = {
  ingredients: structuredClone(sampleIngredients),
  products: structuredClone(sampleProducts),
  activity: []
};

const sampleOrders = [
  { id: 1001, date: offsetDateISO(-1), items:[ {product_id:1, qty:12}, {product_id:2, qty:3} ], customer:'Local Cafe', total: 12*30 + 3*45 },
  { id: 1002, date: offsetDateISO(-2), items:[ {product_id:1, qty:15} ], customer:'Walk-in', total: 15*30 },
  { id: 1003, date: offsetDateISO(-5), items:[ {product_id:2, qty:6}, {product_id:3, qty:2} ], customer:'Online', total: 6*45 + 2*60 },
  { id: 1004, date: offsetDateISO(-8), items:[ {product_id:1, qty:8}, {product_id:3, qty:4} ], customer:'Wholesale', total: 8*30 + 4*60 },
  { id: 1005, date: offsetDateISO(-15), items:[ {product_id:2, qty:10} ], customer:'Event', total: 10*45 }
];

let chartStock = null;
let chartBestSeller = null;
let chartSalesTimeline = null;
let chartIngredientUsage = null;

const ACCOUNTS_KEY = 'bakery_accounts';
const SESSION_KEY = 'bakery_session';
const THEME_KEY = 'bakery_theme';

function q(id){ return document.getElementById(id) || null; }
function on(id, ev, fn){ const el = q(id); if(el) el.addEventListener(ev, fn); else console.debug(`[on] missing #${id}`); }
function offsetDateISO(days){ const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); }

function loadAccounts(){ try{ return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}'); }catch(e){ return {}; } }
function saveAccounts(obj){ localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(obj)); }

function getPersistentSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }catch(e){ return null; } }
function setPersistentSession(o){ try{ localStorage.setItem(SESSION_KEY, JSON.stringify(o)); }catch(e){} }
function clearPersistentSession(){ try{ localStorage.removeItem(SESSION_KEY); }catch(e){} }

function setSession(obj, persist=false){ try{ sessionStorage.setItem('user', JSON.stringify(obj)); }catch(e){} if(persist) setPersistentSession(obj); }
function clearSession(){ try{ sessionStorage.removeItem('user'); }catch(e){} clearPersistentSession(); }
function getSession(){ try{ return JSON.parse(sessionStorage.getItem('user') || JSON.stringify(getPersistentSession() || null)); }catch(e){ return null; } }
function isLoggedIn(){ return !!getSession(); }

function daysUntil(dateStr){ if(!dateStr) return Infinity; const t=new Date(); t.setHours(0,0,0,0); const d=new Date(dateStr); d.setHours(0,0,0,0); return Math.ceil((d - t)/(1000*60*60*24)); }

function notify(msg){ try{ if(typeof Toast !== 'undefined') Toast.show(msg); else alert(msg); }catch(e){ alert(msg); } }

const PERMISSIONS = {
  Owner: { help: true, dashboard: true, calendar: true, profile: true, activity: true, inventory: true, reports: true, settings: true },
  Baker: { help: false, dashboard: true, calendar: true, profile: false, activity: true, inventory: true, reports: true, settings: false },
  Assistant: { help: false, dashboard: true, calendar: true, profile: false, activity: true, inventory: true, reports: false, settings: false },
};

function getCurrentRole(){
  const s = getSession();
  return s?.role || 'Baker';
}
function hasPermission(feature){
  const role = getCurrentRole();
  const perms = PERMISSIONS[role] || {};
  return !!perms[feature];
}

function enforcePermissionsUI(){
  const map = { products: 'products', orders: 'orders' };
  document.querySelectorAll('#sideNav .nav-item').forEach(btn=>{
    const view = btn.dataset.view;
    if(view && !hasPermission(view)){
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
  });

  if(!hasPermission('products')) {
    const el = q('view-products'); if(el) el.classList.add('hidden');
    const prodBtn = q('addProductBtn'); if(prodBtn) prodBtn.style.display = 'none';
  } else { if(q('addProductBtn')) q('addProductBtn').style.display = ''; }

  if(!hasPermission('orders')) {
    const el = q('view-orders'); if(el) el.classList.add('hidden');
    const orderBtn = q('createOrderBtn'); if(orderBtn) orderBtn.style.display = 'none';
  } else { if(q('createOrderBtn')) q('createOrderBtn').style.display = ''; }

  const quickBakeBtn = q('quickBake');
  if(quickBakeBtn) quickBakeBtn.style.display = hasPermission('bake') ? '' : 'none';

  const addProd = q('addProductBtn');
  if(addProd) addProd.style.display = hasPermission('addProduct') ? '' : 'none';
}

function nextIngredientId(){
  const arr = DB.ingredients.map(i=> i.id || 0);
  return (arr.length? Math.max(...arr) : 0) + 1;
}
function nextProductId(){
  const arr = DB.products.map(p=> p.id || 0);
  return (arr.length? Math.max(...arr) : 0) + 1;
}
function nextOrderId(){
  const arr = sampleOrders.map(o=> o.id || 0);
  return (arr.length? Math.max(...arr) : 1000) + 1;
}

(function restoreCurrentUser(){
  try {
    const raw = localStorage.getItem('CURRENT_USER');
    if (raw) {
      window.CURRENT_USER = JSON.parse(raw);
    } else {
      window.CURRENT_USER = null;
    }
  } catch(e){
    window.CURRENT_USER = null;
  }
})();

function getCurrentUserRole() {
  const me = window.CURRENT_USER || null;
  if (!me || !me.role) return '';
  return (String(me.role || '')).toLowerCase();
}

const PROGRAMMED_CONSUMPTION = {
  'flour (hard & soft)': { dailyAmount: 62.5, unit: 'kg' },
  'sugar (white & brown)': { dailyAmount: 8, unit: 'kg' }, 
  'butter / margarine / oil / shortening': { dailyAmount: 10, unit: 'kg' },
  'eggs': { dailyAmount: 200, unit: 'pcs' }, 
  'milk / cream': { dailyAmount: 15, unit: 'L' },
  'yeast': { dailyAmount: 2, unit: 'kg' },
  'baking powder': { dailyAmount: 1, unit: 'kg' },
  'salt': { dailyAmount: 2, unit: 'kg' },
  'cocoa powder': { dailyAmount: 1, unit: 'kg' },
  'vanilla': { dailyAmount: 0.1, unit: 'L' },
  'sesame seeds': { dailyAmount: 1, unit: 'kg' },
  'food coloring': { dailyAmount: 50, unit: 'mL' },
  'dobrim': { dailyAmount: 2, unit: 'kg' }
};

function computeThresholdForIngredient(ing, options = {}) {
  const leadDays = Number(options.leadDays ?? 2);
  const fallbackDays = Number(options.fallbackDays ?? 3);

  if (!ing || !ing.name) return 0;
  const key = (ing.name || '').toLowerCase().trim();

  const prog = PROGRAMMED_CONSUMPTION[key] || PROGRAMMED_CONSUMPTION[ing.id];
  if (prog && prog.unit && String(prog.unit).toLowerCase() === String(ing.unit || '').toLowerCase()) {
    const daily = Number(prog.dailyAmount || 0);
    const thr = +(daily * leadDays).toFixed(3);
    return Math.max(thr, 0.001);
  }

  if (ing.type && (ing.type === 'equipment' || ing.type === 'maintenance' || ing.type === 'packaging')) {
    return ing.min || 0;
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const history = (DB.activity || []).filter(a => a.ingredient_id === ing.id && new Date(a.time) >= cutoff);
  let estimatedDaily = 0;
  if (history.length) {
    const totalFromHistory = history.reduce((sum, rec) => {
      const m = String(rec.text || '').match(/([0-9]*\.?[0-9]+)/);
      if (!m) return sum;
      const v = Number(m[0]) || 0;
      const textLower = String(rec.text || '').toLowerCase();
      if (textLower.includes('stock in')) return sum; 
      if (textLower.includes('used') || textLower.includes('stock out') || textLower.includes('used for')) {
        return sum + v;
      }
      return sum;
    }, 0);
    estimatedDaily = totalFromHistory / 7;
  }

  if (estimatedDaily > 0.001) {
    return +(estimatedDaily * fallbackDays).toFixed(3);
  }

  const fallback = ing.qty ? Math.max( +(ing.qty * 0.2).toFixed(3), (ing.unit === 'kg' ? 1 : 1) ) : 1;
  return fallback;
}

function aggregateUsageFromActivity(startISO, endISO, maxItems = 12) {
  const start = startISO ? new Date(startISO) : new Date(new Date().getTime() - (30*24*60*60*1000));
  const end = endISO ? new Date(endISO) : new Date();
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);

  const usageMap = {};
  (DB.ingredients || []).forEach(ing => usageMap[ing.id] = 0);

  (DB.activity || []).forEach(rec => {
    if(!rec || !rec.time) return;
    const t = new Date(rec.time);
    if(t < start || t > end) return;
    const iid = rec.ingredient_id;
    if(!iid) return;
    const text = String(rec.text || '').toLowerCase();
    if(!(text.includes('used') || text.includes('stock out') || text.includes('used for'))) return;
    const m = String(rec.text || '').match(/([0-9]*\.?[0-9]+)/g);
    if(!m) return;
    const v = Number(m[0]) || 0;
    usageMap[iid] = (usageMap[iid] || 0) + v;
  });

  const arr = Object.keys(usageMap).map(k => ({ id: Number(k), qty: usageMap[k] })).sort((a,b) => b.qty - a.qty).slice(0, maxItems);
  const labels = arr.map(x => (DB.ingredients.find(i => i.id === x.id)?.name) || `#${x.id}`);
  const data = arr.map(x => +(x.qty.toFixed(3)));
  return { labels, data, raw: arr };
}

function showApp(flag){ const app=q('app'); if(!app) return; app.classList.toggle('hidden', !flag); app.setAttribute('aria-hidden', String(!flag)); }
function showOverlay(flag, focus=false){ const overlay=q('landingOverlay'); if(!overlay) return; overlay.classList.toggle('hidden', !flag); overlay.setAttribute('aria-hidden', String(!flag)); if(flag && focus) setTimeout(()=> q('overlay-username')?.focus(), 160); }

function avatarKeyFor(username){ return `profile_avatar_${username}`; }
function prefsKeyFor(username){ return `profile_prefs_${username}`; }

function openModal(){ const m=q('modal'); if(!m) return; m.classList.remove('hidden'); m.setAttribute('aria-hidden','false'); setTimeout(()=> m.querySelector('input,button,textarea,select')?.focus(), 120); }
function closeModal(){ const m=q('modal'); if(!m) return; m.classList.add('hidden'); m.setAttribute('aria-hidden','true'); const c=q('modalContent'); if(c) c.innerHTML=''; const mc = document.querySelector('.modal-card'); if(mc && mc.classList.contains('modal-small')) mc.classList.remove('modal-small'); }

// showGlobalLoader(show, title, subtitle, minMs)
// minMs = minimum milliseconds the loader will remain visible
function showGlobalLoader(show, title = 'Working', subtitle = 'Please wait...', minMs = 600) {
  const id = 'globalLoader';
  if (show) {
    if (document.getElementById(id)) return; // already visible
    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'global-loader';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.dataset._glStart = String(Date.now());
    wrap.dataset._glMin = String(minMs || 0);
    wrap.innerHTML = `
      <div class="loader-box" role="dialog" aria-modal="true">
        <div class="global-spinner" aria-hidden="true"></div>
        <div class="loader-title">${escapeHtml(title)}</div>
        <div class="loader-sub">${escapeHtml(subtitle)}</div>
      </div>
    `;
    document.body.appendChild(wrap);
    // prevent background scroll
    document.body.style.overflow = 'hidden';
  } else {
    const el = document.getElementById(id);
    if (!el) return;
    const start = Number(el.dataset._glStart || 0);
    const min = Number(el.dataset._glMin || minMs || 0);
    const elapsed = Date.now() - start;
    const remain = Math.max(0, min - elapsed);
    // ensure minimum display time then remove
    setTimeout(() => {
      const n = document.getElementById(id);
      if (n) n.remove();
      document.body.style.overflow = '';
    }, remain);
  }
}

// setButtonLoadingWithMin(btn, loading, minMs)
// ensures button shows loading state at least minMs milliseconds
function setButtonLoadingWithMin(btn, loading, minMs = 450) {
  if (!btn) return;
  if (loading) {
    // store start time, original content
    btn.dataset._btnStart = String(Date.now());
    if (!btn.dataset._origHtml) btn.dataset._origHtml = btn.innerHTML;
    // set UI: prepend spinner (adjust to your markup)
    btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> ${escapeHtml((btn.dataset._origLabel || btn.innerText).trim())}`;
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    const start = Number(btn.dataset._btnStart || 0);
    const elapsed = Date.now() - start;
    const remain = Math.max(0, (minMs || 0) - elapsed);
    setTimeout(() => {
      // restore original content
      if (btn.dataset._origHtml) {
        btn.innerHTML = btn.dataset._origHtml;
        delete btn.dataset._origHtml;
      }
      btn.classList.remove('loading');
      btn.disabled = false;
      delete btn.dataset._btnStart;
    }, remain);
  }
}

// small helper to show loader on overlay
function showOverlayLoader(show, text='') {
  let el = document.getElementById('overlayLoader');
  if(!el){
    el = document.createElement('div');
    el.id = 'overlayLoader';
    el.style.position = 'fixed';
    el.style.inset = 0;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.zIndex = 12000;
    el.innerHTML = `<div style="background:rgba(255,255,255,0.95);padding:18px;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.12);text-align:center">
      <div class="muted small" id="overlayLoaderText">${escapeHtml(text)}</div>
      <div style="margin-top:10px"><svg width="36" height="36" viewBox="0 0 50 50"><path fill="none" stroke="#1b85ec" stroke-width="4" d="M25 5 a20 20 0 0 1 0 40 a20 20 0 0 1 0 -40" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" from="0 25 25" to="360 25 25" repeatCount="indefinite"/></path></svg></div>
    </div>`;
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
  if(show) q('overlayLoaderText').textContent = text || '';
}

// Open a simple forgot modal (call this from a 'Forgot password' link)
function openForgotPasswordModal(){
  openModalHTML(`
    <h3>Forgot password</h3>
    <form id="forgotForm" class="form">
      <label class="field"><span class="field-label">Registered email</span><input id="forgotEmail" type="email" required /></label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn ghost" id="forgotCancel" type="button">Cancel</button>
        <button class="btn primary" id="forgotSendBtn" type="submit">Send code</button>
      </div>
    </form>
  `);
  q('forgotCancel')?.addEventListener('click', closeModal);
  q('forgotForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (q('forgotEmail')?.value || '').trim();
    if(!email) return notify('Enter your email');
    showOverlayLoader(true, 'Sending reset code…');
    try {
      const r = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const txt = await r.text();
      let data = null;
      try { data = txt ? JSON.parse(txt) : null; } catch(e){}
      if(!r.ok) {
        notify(data?.error || data?.message || txt || `Error: ${r.status}`);
        showOverlayLoader(false);
        return;
      }
      showOverlayLoader(false);
      notify(data?.message || 'If the email exists, a code was sent.');
      closeModal();
      openVerifyResetModal(email); // next step
    } catch (err) {
      console.error('forgot fetch err', err);
      showOverlayLoader(false);
      notify('Network error sending code — check server & Network tab.');
    }
  });
}

function openVerifyResetModal(email=''){
  openModalHTML(`
    <h3>Verify code</h3>
    <form id="verifyForm" class="form">
      <label class="field"><span class="field-label">Email</span><input id="verifyEmail" type="email" value="${escapeHtml(email)}" required/></label>
      <label class="field"><span class="field-label">6-digit code</span><input id="verifyCode" type="text" inputmode="numeric" pattern="\\d{6}" required/></label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn ghost" id="verifyCancel" type="button">Cancel</button>
        <button class="btn primary" id="verifyBtn" type="submit">Verify</button>
      </div>
    </form>
  `);
  q('verifyCancel')?.addEventListener('click', closeModal);
  q('verifyForm')?.addEventListener('submit', async (e)=> {
    e.preventDefault();
    const email = (q('verifyEmail')?.value||'').trim();
    const code = (q('verifyCode')?.value||'').trim();
    if(!email||!code) return notify('Email and code required');
    showOverlayLoader(true,'Verifying...');
    try {
      const r = await fetch('/api/auth/forgot/verify', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, code })
      });
      const txt = await r.text();
      let data=null; try{ data = txt ? JSON.parse(txt) : null }catch(e){}
      showOverlayLoader(false);
      if(!r.ok) { notify(data?.error || data?.message || txt || `Error ${r.status}`); return; }
      notify('Code verified — set new password');
      closeModal();
      openResetPasswordModal(email, code);
    } catch(err) {
      showOverlayLoader(false);
      console.error('verify err', err);
      notify('Network error verifying code');
    }
  });
}

function openResetPasswordModal(email='', code=''){
  openModalHTML(`
    <h3>Reset password</h3>
    <form id="resetForm" class="form">
      <label class="field"><span class="field-label">Email</span><input id="resetEmail" type="email" value="${escapeHtml(email)}" required/></label>
      <label class="field"><span class="field-label">Code</span><input id="resetCode" type="text" value="${escapeHtml(code)}" required/></label>
      <label class="field"><span class="field-label">New password</span><input id="resetPassword" type="password" required minlength="6"/></label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn ghost" id="resetCancel" type="button">Cancel</button>
        <button class="btn primary" id="resetBtn" type="submit">Reset password</button>
      </div>
    </form>
  `);
  q('resetCancel')?.addEventListener('click', closeModal);
  q('resetForm')?.addEventListener('submit', async (e)=> {
    e.preventDefault();
    const email = (q('resetEmail')?.value||'').trim();
    const code = (q('resetCode')?.value||'').trim();
    const pw = q('resetPassword')?.value || '';
    if(!email||!code||!pw) return notify('Complete the form');
    showOverlayLoader(true,'Resetting password…');
    try {
      const r = await fetch('/api/auth/forgot/reset', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, code, password: pw })
      });
      const txt = await r.text();
      let data=null; try{ data = txt ? JSON.parse(txt) : null }catch(e){}
      showOverlayLoader(false);
      if(!r.ok){ notify(data?.error || data?.message || txt || `Error ${r.status}`); return; }
      notify('Password changed — you can sign in now');
      closeModal();
    } catch(err){
      showOverlayLoader(false);
      console.error('reset err', err);
      notify('Network error resetting password');
    }
  });
}

function applyTheme(theme){
  localStorage.setItem(THEME_KEY, theme);
  if(theme === 'dark') document.documentElement.classList.add('theme-dark');
  else document.documentElement.classList.remove('theme-dark');

  if(q('themeToggle')) q('themeToggle').checked = theme === 'dark';
}

const SEARCH_HISTORY_KEY = 'bakery_search_history_v1';
const MAX_SEARCH_HISTORY = 25;

if(!Array.isArray(DB.orders)) DB.orders = []; 

function loadSearchHistory(){
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]'); } catch(e){ return []; }
}
function saveSearchHistory(arr){
  try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(arr.slice(0, MAX_SEARCH_HISTORY))); } catch(e){}
}
function pushSearchQuery(q){
  if(!q) return;
  const arr = loadSearchHistory();
  const idx = arr.findIndex(x=> x.toLowerCase() === q.toLowerCase());
  if(idx !== -1) arr.splice(idx,1);
  arr.unshift(q);
  saveSearchHistory(arr);
}

function ensureSuggestionContainer(){
  let wrap = document.querySelector('.search-suggestions');
  const input = q('topSearch');
  if(!input) return null;
  if(wrap) return wrap;
  wrap = document.createElement('div');
  wrap.className = 'search-suggestions hidden';
  wrap.innerHTML = '<ul></ul>';
  input.parentElement.appendChild(wrap);
  document.addEventListener('click', (e)=> {
    if(!wrap) return;
    if(!wrap.contains(e.target) && e.target !== input) wrap.classList.add('hidden');
  });
  return wrap;
}

function showSuggestions(filter=''){
  const wrap = ensureSuggestionContainer();
  if(!wrap) return;
  const ul = wrap.querySelector('ul');
  const hist = loadSearchHistory();
  const qf = (filter||'').trim().toLowerCase();
  const historyMatches = hist.filter(h=> h.toLowerCase().includes(qf));
  const prodMatches = DB.products.filter(p=> p.name.toLowerCase().includes(qf)).slice(0,6).map(p=>({label:p.name, type:'Product'}));
  const ingMatches = DB.ingredients.filter(i=> i.name.toLowerCase().includes(qf)).slice(0,6).map(i=>({label:i.name, type:'Ingredient'}));
  const orderMatches = (DB.orders || []).filter(o=> (o.id && String(o.id).includes(qf)) || (o.customer && o.customer.toLowerCase().includes(qf)) ).slice(0,6).map(o=>({label:o.id ? `Order #${o.id}` : (o.customer||'Order'), type:'Order'}));
  const seen = new Set();
  const rows = [];
  historyMatches.forEach(h => { if(!seen.has(h.toLowerCase())){ rows.push({label:h, type:'Recent'}); seen.add(h.toLowerCase()); } });
  [...prodMatches, ...ingMatches, ...orderMatches].forEach(m => { if(!seen.has(m.label.toLowerCase())){ rows.push(m); seen.add(m.label.toLowerCase()); } });

  if(qf === '' && hist.length === 0){
    wrap.classList.add('hidden');
    return;
  }
  if(rows.length === 0){
    wrap.classList.add('hidden');
    return;
  }
  ul.innerHTML = rows.map((r, idx)=>`<li data-idx="${idx}" data-label="${encodeURIComponent(r.label)}" data-type="${r.type}"><span>${escapeHtml(r.label)}</span><span class="meta">${escapeHtml(r.type)}</span></li>`).join('');
  wrap.classList.remove('hidden');
  wrap.querySelectorAll('li').forEach(li => li.addEventListener('click', ()=> {
    const label = decodeURIComponent(li.dataset.label);
    applySearch(label);
    wrap.classList.add('hidden');
  }));
  let current = 0;
  wrap.querySelectorAll('li').forEach((li,i)=> li.classList.toggle('active', i===current));
  wrap._current = current;
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }

function applySearch(query){
  if(!query) return;
  pushSearchQuery(query);
  const ql = query.toLowerCase();
  const prodMatches = DB.products.filter(p=> p.name.toLowerCase().includes(ql));
  const ingMatches = DB.ingredients.filter(i=> i.name.toLowerCase().includes(ql));
  const orderMatches = (DB.orders || []).filter(o=> (o.id && String(o.id).includes(ql)) || (o.customer && o.customer.toLowerCase().includes(ql)));

  if(prodMatches.length){
    showView('products');
    if(q('searchProd')) q('searchProd').value = query;
    renderProductGrid();
    highlightSearchResultInProducts(query);
    return;
  }
  if(ingMatches.length){
    showView('inventory');
    if(q('searchIng')) q('searchIng').value = query;
    renderIngredientCards();
    return;
  }
  if(orderMatches.length){
    ensureOrdersView();
    showView('orders');
    if(q('searchOrders')) q('searchOrders').value = query;
    renderOrders();
    return;
  }
  showView('activity');
  if(q('activityFilter')) q('activityFilter').value = 'all';
  filterActivityByQuery(query);
}

function highlightSearchResultInProducts(query){
  const ql = query.toLowerCase();
  setTimeout(()=> {
    const matches = Array.from(document.querySelectorAll('#productGrid .product-card')).filter(card=> card.innerText.toLowerCase().includes(ql));
    if(matches.length){
      matches[0].scrollIntoView({behavior:'smooth', block:'center'});
      matches[0].classList.add('search-highlight');
      setTimeout(()=> matches[0].classList.remove('search-highlight'), 2200);
    }
  }, 120);
}

(function injectSearchHighlightStyle(){
  if(document.getElementById('search-highlight-style')) return;
  const st = document.createElement('style');
  st.id = 'search-highlight-style';
  st.textContent = `.search-highlight{ box-shadow: 0 8px 30px rgba(28,120,220,0.12) !important; transform: translateY(-2px); transition: all .28s ease; }`;
  document.head.appendChild(st);
})();

function filterActivityByQuery(query){
  const ql = (query||'').toLowerCase();
  const items = DB.activity.filter(a=> a.text && a.text.toLowerCase().includes(ql));
  const act = q('activityList');
  if(!act) return;
  if(items.length === 0){ act.innerHTML = '<li class="muted">No activity matches</li>'; return; }
  act.innerHTML = items.map(a=>`<li><div>${a.text}</div><div class="muted small">${a.time}</div></li>`).join('');
}

function attachTopSearchHandlers(){
  const input = q('topSearch');
  const wrap = ensureSuggestionContainer();
  if(!input) return;
  input.addEventListener('input', (e)=> {
    const v = input.value || '';
    showSuggestions(v);
  });
  input.addEventListener('keydown', (e)=> {
    const wrap = document.querySelector('.search-suggestions');
    if(!wrap || wrap.classList.contains('hidden')) {
      if(e.key === 'Enter') {
        e.preventDefault();
        applySearch(input.value.trim());
      }
      return;
    }
    const items = Array.from(wrap.querySelectorAll('li'));
    if(items.length === 0) return;
    let current = items.findIndex(i=> i.classList.contains('active'));
    if(current < 0) current = 0;
    if(e.key === 'ArrowDown'){ e.preventDefault(); items[current]?.classList.remove('active'); current = (current+1) % items.length; items[current].classList.add('active'); items[current].scrollIntoView({block:'nearest'}); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); items[current]?.classList.remove('active'); current = (current-1 + items.length) % items.length; items[current].classList.add('active'); items[current].scrollIntoView({block:'nearest'}); }
    else if(e.key === 'Enter'){ e.preventDefault(); const lab = decodeURIComponent(items[current].dataset.label); applySearch(lab); wrap.classList.add('hidden'); }
    else if(e.key === 'Escape'){ wrap.classList.add('hidden'); }
  });
  input.addEventListener('blur', ()=> setTimeout(()=> { const w=document.querySelector('.search-suggestions'); if(w) w.classList.add('hidden'); }, 180));
}

function ensureOrdersView(){
  if(q('view-orders')) return;
  const main = document.querySelector('main.main');
  if(!main) return;
  const node = document.createElement('section');
  node.id = 'view-orders';
  node.className = 'view hidden';
  node.innerHTML = `
    <div class="page-header">
      <h2>Orders</h2>
      <div class="page-actions">
        <input id="searchOrders" placeholder="Search orders (id, customer)..." />
        <button id="newOrderBtn" class="btn small primary" type="button"><i class="fa fa-plus"></i> New Order</button>
      </div>
    </div>
    <div class="card">
      <div id="ordersList" class="orders-list"></div>
    </div>
  `;
  main.appendChild(node);
  const so = q('searchOrders');
  if(so) {
    so.addEventListener('input', ()=> renderOrders());
    so.addEventListener('keydown', (e)=> { if(e.key === 'Enter'){ e.preventDefault(); pushSearchQuery(so.value.trim()); }});
  }
  renderOrders();
}

function updateDateTime(){ const d=new Date(); if(q('dateText')) q('dateText').textContent = d.toLocaleDateString(); if(q('timeText')) q('timeText').textContent = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
setInterval(updateDateTime, 1000);
updateDateTime();

function setupSidebarToggle(){
  const hb = q('hamburger'), sb = q('sidebar');
  if(!hb || !sb) return;
  hb.onclick = ()=> {
    if(sb.classList.contains('open')){ sb.classList.remove('open'); const overlay=document.getElementById('drawerOverlay'); if(overlay) overlay.remove(); return; }
    const o=document.createElement('div'); o.id='drawerOverlay'; o.style.position='fixed'; o.style.inset='0'; o.style.zIndex='9998'; o.style.background='rgba(0,0,0,0.18)';
    o.addEventListener('click', ()=> { sb.classList.remove('open'); o.remove(); });
    document.body.appendChild(o);
    sb.classList.add('open');
  };
}

function buildTopNav(){
  const top=q('topNav'); if(!top) return; top.innerHTML='';
  const items = Array.from(document.querySelectorAll('#sideNav .nav-item'));
  items.forEach(b=>{ const btn=document.createElement('button'); btn.className='nav-btn'; btn.dataset.view=b.dataset.view; btn.textContent=b.innerText.trim(); btn.type='button'; btn.addEventListener('click', ()=>{ if(!isLoggedIn()){ showOverlay(true,true); return; } if(btn.dataset.view==='profile') { populateProfile(); bindProfileControls(); } if(btn.dataset.view==='settings') populateSettings(); showView(btn.dataset.view); }); top.appendChild(btn); });
}

const views = ['dashboard','inventory','activity','profile','settings','reports','calendar'];
function showView(name){
  if(!isLoggedIn()){ showOverlay(true, true); return; }
  views.forEach(v=> { const el = q('view-'+v); if(el) el.classList.toggle('hidden', v !== name); });
  document.querySelectorAll('#sideNav .nav-item').forEach(b=> b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('#topNav .nav-btn').forEach(b=> b.classList.toggle('active', b.dataset.view === name));

  if(name === 'dashboard'){ renderStockChart(); renderBestSellerChart(); renderDashboard(); }
  if(name === 'reports'){ renderReports(); }
  if(name === 'orders'){ renderOrders(); }
  if(name === 'calendar'){ renderCalendar(); renderMonthCalendar(currentCalendarYear, currentCalendarMonth); }
  if(name === 'profile'){ populateProfile(); bindProfileControls(); }
}

// ---------------------------
// Dashboard: server-backed charts & recent activity
// Replace existing renderDashboard, renderStockChart, renderBestSellerChart, renderActivity
// ---------------------------

async function fetchAllIngredientsMap() {
  try {
    const resp = await apiFetch('/api/ingredients?limit=1000&page=1');
    const items = (resp && resp.items) ? resp.items : [];
    const map = {};
    items.forEach(i => { map[i.id] = i; });
    return { items, map };
  } catch (e) {
    console.error('fetchAllIngredientsMap err', e);
    // fallback to local DB if present
    const fallback = (DB && DB.ingredients) ? DB.ingredients : [];
    const map = {}; fallback.forEach(i=> map[i.id] = i);
    return { items: fallback, map };
  }
}

async function renderActivity(limit = 6) {
  // Update the dashboard "Recent Activity" block (#recentActivity)
  const container = q('recentActivity');
  if(!container) return;
  container.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const resp = await apiFetch(`/api/activity?limit=${limit}`);
    const items = (resp && resp.items) ? resp.items : [];
    if(items.length === 0) {
      container.innerHTML = '<li class="muted">No recent activity</li>';
      return;
    }
    container.innerHTML = items.slice(0, limit).map(a => {
      const time = a.time ? new Date(a.time).toLocaleString() : '';
      // show ingredient name when available
      const left = escapeHtml(a.text || a.ingredient_name || '');
      return `<li><div>${left}</div><div class="muted small">${escapeHtml(time)}</div></li>`;
    }).join('');
  } catch (e) {
    console.error('renderActivity err', e);
    container.innerHTML = '<li class="muted">Failed to load activity</li>';
  }
}

/**
 * Aggregate stock movement per day using activity entries.
 * We consider activity texts that contain "Stock in", "Stock out", or "Used" and parse the numeric qty.
 */
function _parseQtyFromText(text){
  if(!text) return 0;
  // Find first number (int or float)
  const m = text.match(/(\d+(?:\.\d+)?)/);
  if(!m) return 0;
  return parseFloat(m[1]) || 0;
}

async function renderStockChart(rangeStart, rangeEnd){
  const ctx = q('stockChart')?.getContext('2d');
  if(!ctx) return;
  // determine range: default last 7 days
  const end = rangeEnd ? new Date(rangeEnd) : new Date();
  end.setHours(0,0,0,0);
  const start = rangeStart ? new Date(rangeStart) : new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0,0,0,0);

  // initialize day map
  const days = [];
  const map = {};
  const cur = new Date(start);
  while (cur <= end) {
    const key = cur.toISOString().slice(0,10);
    days.push(key);
    map[key] = 0;
    cur.setDate(cur.getDate() + 1);
  }

  try {
    // fetch activity (up to 2000 rows)
    const resp = await apiFetch('/api/activity?limit=2000');
    const items = (resp && resp.items) ? resp.items : [];

    // accumulate net items movement per day (out and used subtract, in add)
    items.forEach(a => {
      if(!a.time) return;
      const d = new Date(a.time); d.setHours(0,0,0,0);
      const key = d.toISOString().slice(0,10);
      if(map[key] === undefined) return; // outside range
      const txt = (a.text || '').toLowerCase();
      const qty = _parseQtyFromText(a.text || '') || 0;
      if(qty === 0) return;
      if(txt.includes('stock out') || txt.includes('used')) map[key] -= qty;
      else if(txt.includes('stock in')) map[key] += qty;
      // else ignore other activity types
    });

    const labels = days;
    const data = days.map(d => Math.max(0, Math.round((map[d] || 0) * 100)/100)); // net positive items in; we clamp to show movement

    if(chartStock) try{ chartStock.destroy(); }catch(e){}
    chartStock = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Net units (in-out)', data, borderWidth:0, backgroundColor:'rgba(27,133,236,0.85)'}] },
      options: {
        responsive:true, maintainAspectRatio:false,
        scales:{ y:{ beginAtZero:true } },
        plugins:{ legend:{ display:false } }
      }
    });

  } catch (e) {
    console.error('renderStockChart err', e);
    // fallback: destroy chart if exists
    if(chartStock) try{ chartStock.destroy(); chartStock = null; }catch(e){}
  }
}

async function renderBestSellerChart(){
  // repurposed: show top-used ingredients (by stock out / used quantity)
  const ctx = q('bestSellerChart')?.getContext('2d');
  if(!ctx) return;
  try {
    const [ingsResp, actResp] = await Promise.all([
      apiFetch('/api/ingredients?limit=1000&page=1'),
      apiFetch('/api/activity?limit=2000')
    ]);
    const ingredients = (ingsResp && ingsResp.items) ? ingsResp.items : [];
    const act = (actResp && actResp.items) ? actResp.items : [];

    const usageMap = {}; // ingredient_id -> qty used
    act.forEach(a => {
      const txt = (a.text || '').toLowerCase();
      const qty = _parseQtyFromText(a.text || '') || 0;
      if(qty === 0) return;
      if(!a.ingredient_id) return; // skip if no ingredient_id
      // consider 'used' and 'stock out' as consumption
      if(txt.includes('used') || txt.includes('stock out')) {
        usageMap[a.ingredient_id] = (usageMap[a.ingredient_id] || 0) + qty;
      }
    });

    // build array from usageMap
    const usageArr = Object.keys(usageMap).map(k => ({ id: Number(k), qty: usageMap[k] }));
    usageArr.sort((a,b)=> b.qty - a.qty);
    const top = usageArr.slice(0,8);
    const labels = top.map(x => {
      const ing = ingredients.find(i=> Number(i.id) === Number(x.id));
      return ing ? (ing.name || `#${x.id}`) : `#${x.id}`;
    });
    const data = top.map(x => +(x.qty.toFixed(3)));

    if(chartBestSeller) try{ chartBestSeller.destroy(); }catch(e){}
    chartBestSeller = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: generateColors(data.length) }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
    });

  } catch (e) {
    console.error('renderBestSellerChart err', e);
    if(chartBestSeller) try{ chartBestSeller.destroy(); chartBestSeller = null; }catch(e){}
  }
}

async function renderDashboard(){
  // fetch summary KPIs and then render charts and recent activity
  try {
    // fetch required counts (use small requests to take advantage of meta.total)
    const [totalResp, lowResp, expResp, equipResp] = await Promise.all([
      apiFetch('/api/ingredients?type=ingredient&limit=1&page=1'),
      apiFetch('/api/ingredients?filter=low&limit=1&page=1'),
      apiFetch('/api/ingredients?filter=expiring&limit=1&page=1'),
      apiFetch('/api/ingredients?type=equipment&limit=1&page=1')
    ].map(p => p.catch(e=> null)).map(async req => req ? req : null).map(x=> x)); // keep failures isolated

    // defensive read
    const total = totalResp && totalResp.meta ? totalResp.meta.total : ((DB.ingredients && DB.ingredients.length) || 0);
    const low = lowResp && lowResp.meta ? lowResp.meta.total : 0;
    const exp = expResp && expResp.meta ? expResp.meta.total : 0;
    const equipmentCount = equipResp && equipResp.meta ? equipResp.meta.total : 0;

    if(q('kpi-total-ing')) q('kpi-total-ing').textContent = total;
    if(q('kpi-low')) q('kpi-low').textContent = low;
    if(q('kpi-exp')) q('kpi-exp').textContent = exp;
    if(q('kpi-equipment')) q('kpi-equipment').textContent = equipmentCount;

    // charts and activity
    await renderStockChart();
    await renderBestSellerChart();
    await renderActivity(6);

  } catch (e) {
    console.error('renderDashboard err', e);
    // fallback to old rendering
    try {
      if(q('kpi-total-ing')) q('kpi-total-ing').textContent = (DB.ingredients || []).length;
      if(q('kpi-low')) q('kpi-low').textContent = (DB.ingredients || []).filter(i=>i.qty <= i.min).length;
      renderStockChart();
      renderBestSellerChart();
      renderActivity(6);
    } catch (_) {}
  }
}

async function fetchAllIngredientsMap() {
  try {
    const resp = await apiFetch('/api/ingredients?limit=1000&page=1');
    const items = (resp && resp.items) ? resp.items : [];
    const map = {};
    items.forEach(i => { map[i.id] = i; });
    return { items, map };
  } catch (e) {
    console.error('fetchAllIngredientsMap err', e);
    // fallback to local DB if present
    const fallback = (DB && DB.ingredients) ? DB.ingredients : [];
    const map = {}; fallback.forEach(i=> map[i.id] = i);
    return { items: fallback, map };
  }
}

async function renderActivity(limit = 6) {
  // Update the dashboard "Recent Activity" block (#recentActivity)
  const container = q('recentActivity');
  if(!container) return;
  container.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const resp = await apiFetch(`/api/activity?limit=${limit}`);
    const items = (resp && resp.items) ? resp.items : [];
    if(items.length === 0) {
      container.innerHTML = '<li class="muted">No recent activity</li>';
      return;
    }
    container.innerHTML = items.slice(0, limit).map(a => {
      const time = a.time ? new Date(a.time).toLocaleString() : '';
      // show ingredient name when available
      const left = escapeHtml(a.text || a.ingredient_name || '');
      return `<li><div>${left}</div><div class="muted small">${escapeHtml(time)}</div></li>`;
    }).join('');
  } catch (e) {
    console.error('renderActivity err', e);
    container.innerHTML = '<li class="muted">Failed to load activity</li>';
  }
}

function _parseQtyFromText(text){
  if(!text) return 0;
  // Find first number (int or float)
  const m = text.match(/(\d+(?:\.\d+)?)/);
  if(!m) return 0;
  return parseFloat(m[1]) || 0;
}

// ------------------- helper: debounce -------------------
function debounce(fn, wait = 250) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ------------------- helper: pagination renderer -------------------
function renderPaginationControls(container, meta, onPageClick) {
  // meta: { total, page, limit, totalPages }
  const pages = meta.totalPages || 1;
  const current = meta.page || 1;
  const maxButtons = 7; // visible page buttons
  if (!container) return;

  if (pages <= 1) {
    container.innerHTML = '';
    return;
  }

  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  let end = start + maxButtons - 1;
  if (end > pages) { end = pages; start = Math.max(1, end - maxButtons + 1); }

  const btns = [];
  // prev
  btns.push(`<button class="btn small" data-page="${Math.max(1, current-1)}" ${current===1? 'disabled':''}>&lt;</button>`);
  if (start > 1) btns.push(`<button class="btn small" data-page="1">1</button>${start>2?'<span class="muted small" style="padding:0 6px">…</span>':''}`);
  for (let p = start; p <= end; p++) {
    btns.push(`<button class="btn small" data-page="${p}" ${p===current? 'aria-current="true" style="font-weight:900;"':''}>${p}</button>`);
  }
  if (end < pages) btns.push(`${end < pages-1?'<span class="muted small" style="padding:0 6px">…</span>':''}<button class="btn small" data-page="${pages}">${pages}</button>`);
  // next
  btns.push(`<button class="btn small" data-page="${Math.min(pages, current+1)}" ${current===pages? 'disabled':''}>&gt;</button>`);

  container.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${btns.join('')}</div>`;

  for (const b of Array.from(container.querySelectorAll('button[data-page]'))) {
    b.addEventListener('click', (e) => {
      const p = Number(e.currentTarget.dataset.page || 1);
      if (onPageClick) onPageClick(p);
    });
  }
}

async function renderIngredientCards(page = 1, limit = 5) {
  const container = q('ingredientList');
  if (!container) return;

  // UI: read filters and search
  const qv = (q('searchIng')?.value || '').trim();
  const chip = document.querySelector('.filter-chips .chip.active')?.dataset.filter || 'all';
  const invType = document.querySelector('input[name="invType"]:checked')?.value || 'all';

  // show loading placeholder
  container.innerHTML = `<div class="card muted">Loading inventory…</div>`;

  try {
    // build query params
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (invType && invType !== 'all') params.set('type', invType);
    if (chip && chip !== 'all') params.set('filter', chip);
    if (qv) params.set('search', qv);

    const res = await apiFetch(`/api/ingredients?${params.toString()}`);
    const items = (res && res.items) ? res.items : [];
    const meta = (res && res.meta) ? res.meta : { total: items.length, page: page, limit, totalPages: Math.ceil(items.length / limit) };

    // Header with radios, export, print, and pagination placeholder
    const header = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap">
        <div style="display:flex;gap:8px;align-items:center">
          <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="all" ${invType==='all'?'checked':''}/> All</label>
          <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="ingredient" ${invType==='ingredient'?'checked':''}/> Ingredients</label>
          <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="packaging" ${invType==='packaging'?'checked':''}/> Packaging</label>
          <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="equipment" ${invType==='equipment'?'checked':''}/> Equipment</label>
          <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="maintenance" ${invType==='maintenance'?'checked':''}/> Maintenance</label>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn small" id="exportInventoryCsvBtn" type="button">Export CSV</button>
          <button class="btn small" id="printInventoryBtn" type="button">Print / Save PDF</button>
        </div>
      </div>
    `;

    // table head
    const tableHead = `
      <table class="inv-table" style="width:100%;border-collapse:collapse" role="table" aria-label="Inventory table">
        <thead>
          <tr role="row" style="text-align:left">
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">ID</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Name</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Supplier</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Qty</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Unit</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Threshold</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Min</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">In</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Out</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Actions</th>
          </tr>
        </thead>
      <tbody>
    `;

    const rowsHtml = items.map(i => {
      // server returns min_qty, max_qty
      const isMaterial = (i.type === 'ingredient');
      const threshold = isMaterial ? computeThresholdForIngredient(i) : '';
      const lowBadge = (isMaterial && (Number(i.qty || 0) <= (Number(i.min_qty || 0) || threshold))) ? '<span class="badge low">Low</span>' : '';
      const expiryNote = (isMaterial && i.expiry ? `<div class="muted small">${daysUntil(i.expiry)}d</div>` : '');

      const _me = (() => {
      try {
        const raw = sessionStorage.getItem('user');
        if (raw) return JSON.parse(raw);
      } catch (e) { /* ignore */ }
      return (window.CURRENT_USER || window.ME || null);
    })() || { id: null, role: '' };

    const roleLower = (String(_me.role || '').trim() || '').toLowerCase();

    // canonical allowed roles (lowercased)
    const canEditRoles = ['owner', 'admin', 'baker'];         // can change metadata (min/max/supplier/name)
    const canStockRoles = ['owner', 'admin', 'baker', 'assistant']; // can perform stock in/out

    // helper to decide per-item permissions
    const userCanEdit = (r => canEditRoles.includes(r))(roleLower);
    const userCanStock = (r => canStockRoles.includes(r))(roleLower);

          const rowsHtml = items.map(i => {
      const isMaterial = (i.type === 'ingredient');
      const threshold = isMaterial ? computeThresholdForIngredient(i) : '';
      const lowBadge = (isMaterial && (Number(i.qty || 0) <= (Number(i.min_qty || 0) || threshold))) ? '<span class="badge low">Low</span>' : '';
      const expiryNote = (isMaterial && i.expiry ? `<div class="muted small">${daysUntil(i.expiry)}d</div>` : '');

      // for each row we use precomputed user permissions
      const saveAllowed = userCanStock || userCanEdit;
      const editAllowed = userCanEdit;

      return `<tr data-id="${i.id}" data-type="${escapeHtml(i.type||'')}" style="background:var(--card);border-bottom:1px solid rgba(0,0,0,0.04)">
        <td style="padding:10px;vertical-align:middle">${i.id}</td>
        <td style="padding:10px;vertical-align:middle"><strong>${escapeHtml(i.name)}</strong><div class="muted small">${escapeHtml(i.type)}</div></td>
        <td style="padding:10px;vertical-align:middle">${isMaterial ? escapeHtml(i.supplier||'') : ''}</td>
        <td style="padding:10px;vertical-align:middle"><span class="qty-value">${i.qty}</span> ${expiryNote} ${lowBadge}</td>
        <td style="padding:10px;vertical-align:middle">${isMaterial ? escapeHtml(i.unit||'') : ''}</td>
        <td style="padding:10px;vertical-align:middle">${isMaterial ? threshold : ''}</td>
        <td style="padding:10px;vertical-align:middle">${isMaterial ? `<input class="min-input" type="number" value="${i.min_qty||0}" step="0.01" style="width:80px" />` : ''}</td>
        <td style="padding:10px;vertical-align:middle"><input class="in-input" type="number" step="0.01" style="width:90px" /></td>
        <td style="padding:10px;vertical-align:middle"><input class="out-input" type="number" step="0.01" style="width:90px" /></td>
        <td role="cell" style="padding:10px;vertical-align:middle">
            <button class="btn small save-row" type="button" ${saveAllowed ? '' : 'disabled title="Not authorized"'} aria-label="Save changes for ${escapeHtml(i.name)}">Save</button>
            <button class="btn small soft details-btn" data-id="${i.id}" type="button" aria-controls="modal" aria-label="Show details for ${escapeHtml(i.name)}">Details</button>
            <button class="btn small soft edit-btn" type="button" ${editAllowed ? '' : 'disabled title="Not authorized"'} aria-label="Edit ${escapeHtml(i.name)}">Edit</button>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="10" class="muted" style="padding:12px">No inventory items</td></tr>`;

    const tableFooter = `</tbody></table>`;

    // pagination wrapper
    const paginationWrap = `<div id="invPagination" style="margin-top:12px;display:flex;justify-content:center"></div>`;

    container.innerHTML = header + tableHead + rowsHtml + tableFooter + paginationWrap;

    // setup radio filter wiring (switching type resets to page 1)
    Array.from(container.querySelectorAll('input[name="invType"]')).forEach(r => {
      r.addEventListener('change', () => renderIngredientCards(1, limit));
    });

    // Save / In/Out wiring — call API and refresh current page
    container.querySelectorAll('button.save-row').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        // re-evaluate permissions in case role changed
        const me = window.CURRENT_USER || window.ME || { id: null, role: 'assistant' };
        const role = (me.role || '').toString().toLowerCase();
        const canEdit = ['owner','admin','baker'].includes(role);
        const canStock = ['owner','admin','baker','assistant'].includes(role);
        const saveAllowed = canStock || canEdit;

        if (!saveAllowed) { notify('You are not authorized'); return; }

        const tr = ev.currentTarget.closest('tr');
        if (!tr) return;
        const id = Number(tr.dataset.id);
        const inVal = Number(tr.querySelector('.in-input')?.value || 0);
        const outVal = Number(tr.querySelector('.out-input')?.value || 0);
        const minInput = tr.querySelector('.min-input');
        const newMinRaw = (minInput ? minInput.value : null);
        const newMin = (newMinRaw !== null && newMinRaw !== '') ? Number(newMinRaw) : null;

        try {
          // metadata update (min_qty) only if user canEdit
          if (newMin !== null && !Number.isNaN(newMin)) {
            if (canEdit) {
              await apiFetch(`/api/ingredients/${id}`, { method: 'PUT', body: { min_qty: Number(newMin) }});
            } else {
              // user tried to change metadata but lacks permission — ignore and notify
              // notify('You are not authorized to modify item metadata (min/max/supplier). Changes to stock were applied only.');
            }
          }

          // stock in / out require canStock
          if (inVal > 0) {
            if (!canStock) { notify('Not authorized to perform stock in'); }
            else await apiFetch(`/api/ingredients/${id}/stock`, { method: 'POST', body: { type: 'in', qty: Number(inVal), note: 'Stock-in' }});
          }
          if (outVal > 0) {
            if (!canStock) { notify('Not authorized to perform stock out'); }
            else await apiFetch(`/api/ingredients/${id}/stock`, { method: 'POST', body: { type: 'out', qty: Number(outVal), note: 'Stock-out' }});
          }

          notify('Inventory updated');
          // refresh current page and activity
          await renderIngredientCards(meta.page || page, limit);
          await renderInventoryActivity();
        } catch (err) {
          console.error('save-row api error', err);
          notify(err.message || 'Server error');
        }
      });
    });

    // Details handlers (open modal with server-fetched details if necessary)
    container.querySelectorAll('.details-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(btn.dataset.id);
        try {
          const ing = items.find(x => Number(x.id) === id) || {};
          const historyResp = await apiFetch(`/api/activity?limit=50`);
          const history = (historyResp && historyResp.items) ? historyResp.items.filter(a => Number(a.ingredient_id) === id) : [];
          const histHtml = history.length ? history.slice().map(h => `<li>${escapeHtml(h.text)} <div class="muted small">${escapeHtml(new Date(h.time).toLocaleString())}</div></li>`).join('') : '<li class="muted">No history</li>';
          const attrs = ing.attrs ? (typeof ing.attrs === 'string' ? (() => { try { return JSON.parse(ing.attrs) } catch(e){ return {}; } })() : ing.attrs) : {};
          const attrsHtml = Object.keys(attrs || {}).length ? Object.keys(attrs).map(k => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(attrs[k]||''))}</div>`).join('') : '<div class="muted small">No attributes</div>';
          openModalHTML(`<h3>${escapeHtml(ing.name || 'Item')}</h3>
            <div style="display:flex;gap:12px;margin-bottom:12px">
              <div><strong>${ing.qty || 0} ${ing.unit || ''}</strong><div class="muted small">Current qty</div></div>
              <div><strong>${ing.min_qty || computeThresholdForIngredient(ing)}</strong><div class="muted small">Threshold / Min</div></div>
              <div><strong>${ing.max_qty || '—'}</strong><div class="muted small">Max</div></div>
            </div>
            <div><h4>Attributes</h4>${attrsHtml}</div>
            <div style="margin-top:12px"><h4>Stock History</h4><ul class="timeline">${histHtml}</ul></div>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="closeDetails" type="button">Close</button></div>
          `);
          q('closeDetails')?.addEventListener('click', closeModal, { once: true });
        } catch (err) {
          console.error('details fetch error', err);
          notify('Could not load details');
        }
      });
    });

    // Edit handlers (use existing openEditIngredient function)
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tr = e.currentTarget.closest('tr');
        if (!tr) return;
        const id = Number(tr.dataset.id);
        openEditIngredient(id);
      });
    });

    // Export CSV
    q('exportInventoryCsvBtn')?.addEventListener('click', () => {
      const qs = new URLSearchParams();
      if (invType && invType !== 'all') qs.set('type', invType);
      if (chip && chip !== 'all') qs.set('filter', chip);
      if (qv) qs.set('search', qv);
      window.open(`/api/ingredients/export/csv?${qs.toString()}`, '_self');
    });

    // Print: fetch all matching rows and render print HTML in iframe
    q('printInventoryBtn')?.addEventListener('click', async () => {
      try {
        const qs = new URLSearchParams();
        if (invType && invType !== 'all') qs.set('type', invType);
        if (chip && chip !== 'all') qs.set('filter', chip);
        if (qv) qs.set('search', qv);
        const allResp = await apiFetch(`/api/ingredients?${qs.toString()}&limit=1000&page=1`);
        const allItems = allResp && allResp.items ? allResp.items : [];
        let rows = allItems.map(i => `<tr>
          <td>${i.id}</td>
          <td>${escapeHtml(i.name)}</td>
          <td>${escapeHtml(i.type||'')}</td>
          <td>${escapeHtml(i.supplier||'')}</td>
          <td style="text-align:right">${i.qty}</td>
          <td>${escapeHtml(i.unit||'')}</td>
          <td style="text-align:right">${i.min_qty||0}</td>
          <td>${i.expiry||''}</td>
        </tr>`).join('');
        const bakeryName = (q('bakeryName')?.value) || document.querySelector('.brand-name')?.innerText || "Eric's Bakery";
        const logoSrc = document.querySelector('.sidebar-logo-img')?.src || '';
        const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Inventory — ${new Date().toLocaleDateString()}</title>
          <style>:root{font-family:Poppins,Inter,Arial,sans-serif;color:#12202f}body{margin:16px;font-size:13px;color:#12202f}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f6f7fb;font-weight:800}@media print{body{margin:8mm}th,td{font-size:11px}.no-print{display:none}}@media (max-width:600px){table,thead,tbody,th,td,tr{display:block}thead{display:none}tr{margin-bottom:12px;border:1px solid #eee;border-radius:8px;padding:8px}td{border:none;display:flex;justify-content:space-between;padding:6px 8px}}</style>
        </head><body>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          ${logoSrc? `<img src="${logoSrc}" style="width:64px;height:64px;border-radius:8px" />`: ''}
          <div><h1 style="margin:0;font-size:18px">${escapeHtml(bakeryName)}</h1><div style="color:#6b7a86;font-size:12px">Exported: ${new Date().toLocaleString()}</div></div>
        </div>
        <table><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Supplier</th><th style="text-align:right">Qty</th><th>Unit</th><th style="text-align:right">Min</th><th>Expiry</th></tr></thead><tbody>${rows}</tbody></table>
        <div style="margin-top:18px" class="no-print"><button onclick="window.print()" style="padding:10px 14px;border-radius:8px;cursor:pointer">Print</button></div>
        </body></html>`;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; iframe.setAttribute('aria-hidden','true');
        document.body.appendChild(iframe);
        const idoc = iframe.contentWindow.document;
        idoc.open(); idoc.write(html); idoc.close();
        setTimeout(() => {
          try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { try { window.print(); } catch(e2){} }
          setTimeout(()=> iframe.remove(), 800);
        }, 500);
      } catch (err) {
        console.error('print error', err);
        notify('Could not prepare print');
      }
    });

    // pagination
    const pagWrap = q('invPagination');
    renderPaginationControls(pagWrap, meta, (p) => {
      renderIngredientCards(p, limit);
      const top = container.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });

    // wire search input with debounce to reset to page 1
    const searchEl = q('searchIng');
    if (searchEl) {
      searchEl.oninput = debounce(() => { renderIngredientCards(1, limit); }, 300);
    }

  } catch (err) {
    console.error('renderIngredientCards error', err);
    container.innerHTML = `<div class="card muted">Failed to load inventory</div>`;
  }
}

function initSearchFeature(){
  const wrap = ensureSuggestionContainer();
  attachTopSearchHandlers();
  if(q('view-orders')) ensureOrdersView();
}

function openOrderDetailModal(order){
  const date = new Date(order.date).toLocaleString();
  const itemsHtml = order.items.map(i=>{
    const p = DB.products.find(pp=>pp.id===i.product_id) || {name:'Unknown'};
    return `<li>${p.name} — ${i.qty}pcs</li>`;
  }).join('');
  openModalHTML(`<h3>Order #${order.id}</h3><div class="muted small">${order.customer} • ${date}</div><div style="margin-top:10px"><h4>Items</h4><ul>${itemsHtml}</ul></div><div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button class="btn primary" id="fulfillOrderBtn" type="button">Mark fulfilled</button><button class="btn ghost" id="cancelOrderView" type="button">Close</button></div>`);
  q('cancelOrderView')?.addEventListener('click', closeModal);
  q('fulfillOrderBtn')?.addEventListener('click', ()=> {
    DB.activity.push({text:`Order #${order.id} fulfilled`, time: new Date().toLocaleString()});
    order.items.forEach(it => {
      const p = DB.products.find(pp=>pp.id===it.product_id);
      if(p) p.stock = Math.max(0, (p.stock||0) - it.qty);
      const prod = DB.products.find(pp=>pp.id===it.product_id);
      if(prod && prod.recipe){
        prod.recipe.forEach(r => {
          const ing = DB.ingredients.find(ii=>ii.id===r.ingredient_id);
          if(ing) {
            const used = +(r.qty_per_unit * it.qty);
            ing.qty = +(Math.max(0, ing.qty - used)).toFixed(3);
            DB.activity.push({text:`Used ${used} ${ing.unit} — ${ing.name}`, time:new Date().toLocaleString(), ingredient_id:ing.id});
          }
        });
      }
    });
    closeModal();
    renderIngredientCards();
    renderProductGrid();
    renderOrders();
    notify('Order fulfilled');
    renderStockChart();
    renderBestSellerChart();
    renderReports();
  });
}

function openNewOrderModal(){
  const prodOptions = DB.products.map(p=>`<option value="${p.id}">${p.name} (₱${p.price})</option>`).join('');
  openModalHTML(`<h3>New Order</h3>
    <form id="newOrderForm" class="form">
      <label class="field"><span class="field-label">Customer</span><input id="orderCustomer" type="text" placeholder="Customer name" /></label>
      <label class="field"><span class="field-label">Product</span><div style="display:flex;gap:8px"><select id="orderProd">${prodOptions}</select><input id="orderQty" type="number" value="1" min="1" style="width:90px" /></div></label>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px"><button class="btn primary" type="submit">Create</button><button class="btn ghost" id="cancelNewOrder" type="button">Cancel</button></div>
    </form>`);
  q('cancelNewOrder')?.addEventListener('click', closeModal);
  q('newOrderForm')?.addEventListener('submit', (e)=> {
    e.preventDefault();
    const cust = q('orderCustomer')?.value || 'Walk-in';
    const pid = Number(q('orderProd')?.value);
    const qty = Number(q('orderQty')?.value) || 1;
    const prod = DB.products.find(p=>p.id===pid);
    const total = (prod?.price || 0) * qty;
    const newOrder = { id: nextOrderId(), date: new Date().toISOString(), items:[{product_id:pid, qty}], customer:cust, total };
    sampleOrders.push(newOrder);
    DB.activity.push({text:`Order #${newOrder.id} created (${cust})`, time: new Date().toLocaleString()});
    closeModal();
    renderOrders();
    notify('Order created');
    renderReports();
    renderStockChart();
    renderBestSellerChart();
  });
}

function aggregateSalesRange(startISO, endISO){
  const start = new Date(startISO); start.setHours(0,0,0,0);
  const end = new Date(endISO); end.setHours(0,0,0,0);
  const days = [];
  const map = {};
  const cur = new Date(start);
  while(cur <= end){
    const key = cur.toISOString().slice(0,10);
    days.push(key);
    map[key] = 0;
    cur.setDate(cur.getDate() + 1);
  }
  sampleOrders.forEach(o=>{
    const day = o.date.slice(0,10);
    if(map[day] !== undefined){
      const s = o.items.reduce((acc,i)=> acc + (i.qty || 0), 0);
      map[day] += s;
    }
  });
  return { labels: days, data: days.map(d=> map[d] || 0) };
}

async function renderStockChart(rangeStart, rangeEnd){
  const ctx = q('stockChart')?.getContext('2d');
  if(!ctx) return;
  // determine range: default last 7 days
  const end = rangeEnd ? new Date(rangeEnd) : new Date();
  end.setHours(0,0,0,0);
  const start = rangeStart ? new Date(rangeStart) : new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0,0,0,0);

  // initialize day map
  const days = [];
  const map = {};
  const cur = new Date(start);
  while (cur <= end) {
    const key = cur.toISOString().slice(0,10);
    days.push(key);
    map[key] = 0;
    cur.setDate(cur.getDate() + 1);
  }

  try {
    // fetch activity (up to 2000 rows)
    const resp = await apiFetch('/api/activity?limit=2000');
    const items = (resp && resp.items) ? resp.items : [];

    // accumulate net items movement per day (out and used subtract, in add)
    items.forEach(a => {
      if(!a.time) return;
      const d = new Date(a.time); d.setHours(0,0,0,0);
      const key = d.toISOString().slice(0,10);
      if(map[key] === undefined) return; // outside range
      const txt = (a.text || '').toLowerCase();
      const qty = _parseQtyFromText(a.text || '') || 0;
      if(qty === 0) return;
      if(txt.includes('stock out') || txt.includes('used')) map[key] -= qty;
      else if(txt.includes('stock in')) map[key] += qty;
      // else ignore other activity types
    });

    const labels = days;
    const data = days.map(d => Math.max(0, Math.round((map[d] || 0) * 100)/100)); // net positive items in; we clamp to show movement

    if(chartStock) try{ chartStock.destroy(); }catch(e){}
    chartStock = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Net units (in-out)', data, borderWidth:0, backgroundColor:'rgba(27,133,236,0.85)'}] },
      options: {
        responsive:true, maintainAspectRatio:false,
        scales:{ y:{ beginAtZero:true } },
        plugins:{ legend:{ display:false } }
      }
    });

  } catch (e) {
    console.error('renderStockChart err', e);
    // fallback: destroy chart if exists
    if(chartStock) try{ chartStock.destroy(); chartStock = null; }catch(e){}
  }
}

async function renderBestSellerChart(){
  // repurposed: show top-used ingredients (by stock out / used quantity)
  const ctx = q('bestSellerChart')?.getContext('2d');
  if(!ctx) return;
  try {
    const [ingsResp, actResp] = await Promise.all([
      apiFetch('/api/ingredients?limit=1000&page=1'),
      apiFetch('/api/activity?limit=2000')
    ]);
    const ingredients = (ingsResp && ingsResp.items) ? ingsResp.items : [];
    const act = (actResp && actResp.items) ? actResp.items : [];

    const usageMap = {}; // ingredient_id -> qty used
    act.forEach(a => {
      const txt = (a.text || '').toLowerCase();
      const qty = _parseQtyFromText(a.text || '') || 0;
      if(qty === 0) return;
      if(!a.ingredient_id) return; // skip if no ingredient_id
      // consider 'used' and 'stock out' as consumption
      if(txt.includes('used') || txt.includes('stock out')) {
        usageMap[a.ingredient_id] = (usageMap[a.ingredient_id] || 0) + qty;
      }
    });

    // build array from usageMap
    const usageArr = Object.keys(usageMap).map(k => ({ id: Number(k), qty: usageMap[k] }));
    usageArr.sort((a,b)=> b.qty - a.qty);
    const top = usageArr.slice(0,8);
    const labels = top.map(x => {
      const ing = ingredients.find(i=> Number(i.id) === Number(x.id));
      return ing ? (ing.name || `#${x.id}`) : `#${x.id}`;
    });
    const data = top.map(x => +(x.qty.toFixed(3)));

    if(chartBestSeller) try{ chartBestSeller.destroy(); }catch(e){}
    chartBestSeller = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: generateColors(data.length) }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
    });

  } catch (e) {
    console.error('renderBestSellerChart err', e);
    if(chartBestSeller) try{ chartBestSeller.destroy(); chartBestSeller = null; }catch(e){}
  }
}

// small fetch wrapper that sends/receives JSON and includes cookies
async function apiFetch(path, opts = {}) {
  const cfg = Object.assign({}, opts);
  cfg.headers = Object.assign({}, cfg.headers || {}, { 'Content-Type': 'application/json' });
  cfg.credentials = 'include'; // include cookie JWT
  if (cfg.body && typeof cfg.body !== 'string') cfg.body = JSON.stringify(cfg.body);

  const res = await fetch(path, cfg);
  // try JSON parse for both success and error bodies
  const text = await res.text().catch(() => '');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch(e){ json = null; }
  if (!res.ok) {
    const msg = (json && (json.error || json.message)) ? (json.error || json.message) : res.statusText || 'Request failed';
    const e = new Error(msg);
    e.status = res.status;
    e.body = json;
    throw e;
  }
  return json;
}

// --- Render recent inventory activity in the right column ---
async function renderInventoryActivity(limit = 20) {
  const el = q('inventoryRecentActivity');
  if (!el) return;
  el.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const resp = await apiFetch(`/api/activity?limit=${limit}`);
    const items = (resp && resp.items) ? resp.items : [];
    if (!items.length) {
      el.innerHTML = '<li class="muted">No recent inventory activity</li>';
      return;
    }
    el.innerHTML = items.slice(0, limit).map(it => {
      const time = it.time ? new Date(it.time).toLocaleString() : '';
      return `<li tabindex="0" role="listitem"><div>${escapeHtml(it.text)}</div><div class="muted small">${escapeHtml(time)}</div></li>`;
    }).join('');
  } catch (err) {
    console.error('renderInventoryActivity err', err);
    el.innerHTML = '<li class="muted">Failed to load activity</li>';
  }
}

function renderReports(rangeStart, rangeEnd, reportFilter) {
  const startInput = rangeStart || q('reportStart')?.value || null;
  const endInput = rangeEnd || q('reportEnd')?.value || null;
  const end = endInput ? new Date(endInput) : new Date();
  const start = startInput ? new Date(startInput) : new Date(end);
  if (!startInput) start.setDate(end.getDate() - 29);
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);

  const filter = reportFilter || q('reportFilter')?.value || 'usage';

  try {
    const salesCard = q('salesTimelineChart') ? q('salesTimelineChart').closest('.card') : null;
    if (salesCard && salesCard.parentElement) salesCard.remove();
    try { chartSalesTimeline && chartSalesTimeline.destroy(); } catch(e){}
    chartSalesTimeline = null;
  } catch(e){}

  let agg;
  if (typeof aggregateUsageFromActivity === 'function') {
    agg = aggregateUsageFromActivity(start.toISOString(), end.toISOString(), 50);
  } else {
    const usageMap = {};
    (DB.ingredients || []).forEach(i => usageMap[i.id] = 0);
    (DB.activity || []).forEach(a => {
      const t = new Date(a.time || a.date || null);
      if(!t) return;
      if(t < start || t > end) return;
      const text = String(a.text || '').toLowerCase();
      if(!(text.includes('used') || text.includes('stock out') || text.includes('used for'))) return;
      const m = String(a.text || '').match(/([0-9]*\.?[0-9]+)/g);
      if(!m) return;
      const v = Number(m[0]) || 0;
      if(a.ingredient_id) usageMap[a.ingredient_id] = (usageMap[a.ingredient_id] || 0) + v;
    });
    const arr = Object.keys(usageMap).map(k => ({ id: Number(k), qty: usageMap[k] })).sort((a,b)=> b.qty - a.qty).slice(0,50);
    agg = { labels: arr.map(x => (DB.ingredients.find(i=>i.id===x.id)?.name)||`#${x.id}`), data: arr.map(x=> +(x.qty.toFixed(3))), raw: arr };
  }

  const ingCtx = q('ingredientUsageChart')?.getContext('2d');
  if(ingCtx){
    try { if(chartIngredientUsage) chartIngredientUsage.destroy(); } catch(e){}
    chartIngredientUsage = new Chart(ingCtx, {
      type: 'bar',
      data: { labels: agg.labels, datasets:[{ label:'Units used', data: agg.data, backgroundColor: generateColors(agg.data.length) }]},
      options: { indexAxis:'y', responsive:true, maintainAspectRatio:false, scales:{ x:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } }
    });
  }

  const summaryEl = q('reportSummary');
  if(summaryEl){
    const totalUsed = (agg.raw || []).reduce((s,r)=> s + (r.qty||0), 0);
    const lowCount = (DB.ingredients || []).filter(i => i.type === 'ingredient' && (i.qty <= (i.min || computeThresholdForIngredient(i)))).length;
    const expiringCount = (DB.ingredients || []).filter(i => i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= 30).length;
    const best = (agg.raw && agg.raw.length) ? (DB.ingredients.find(i=>i.id===agg.raw[0].id)?.name || `#${agg.raw[0].id}`) : '—';

    let tableRows = (DB.ingredients || []).map(i => {
      if(filter === 'usage' && !(agg.raw.some(r=> r.id === i.id))) return null;
      if(filter === 'low' && !(i.type === 'ingredient' && i.qty <= (i.min || computeThresholdForIngredient(i)))) return null;
      if(filter === 'expiring' && !(i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >=0 && daysUntil(i.expiry) <= 30)) return null;
      const used = (agg.raw || []).find(r=> r.id === i.id);
      const usedQty = used ? used.qty : 0;
      return `<tr>
        <td style="padding:8px;border:1px solid #eee">${i.id}</td>
        <td style="padding:8px;border:1px solid #eee">${escapeHtml(i.name)}</td>
        <td style="padding:8px;border:1px solid #eee;text-align:right">${usedQty}</td>
        <td style="padding:8px;border:1px solid #eee;text-align:right">${i.qty}</td>
        <td style="padding:8px;border:1px solid #eee">${escapeHtml(i.unit||'')}</td>
        <td style="padding:8px;border:1px solid #eee">${i.min || computeThresholdForIngredient(i)}</td>
        <td style="padding:8px;border:1px solid #eee">${i.type||''}</td>
        <td style="padding:8px;border:1px solid #eee">${i.expiry||''}</td>
      </tr>`;
    }).filter(Boolean).join('') || `<tr><td colspan="8" style="padding:12px" class="muted">No items match the selected filter/range</td></tr>`;

    summaryEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div>
          <div style="font-weight:800">Reports — ${filter === 'usage' ? 'Ingredient Usage' : filter === 'low' ? 'Low stock' : 'Expiring items'}</div>
          <div class="muted small">Period: ${start.toISOString().slice(0,10)} to ${end.toISOString().slice(0,10)} • Total used: ${totalUsed} • Low items: ${lowCount} • Expiring: ${expiringCount} • Top used: ${best}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="printReportsBtn" class="btn small">Print / Save PDF</button>
          <button id="exportReportsCsvBtn" class="btn small">Export CSV</button>
        </div>
      </div>

      <div style="margin-top:12px;overflow:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="padding:8px;border:1px solid #eee">ID</th>
            <th style="padding:8px;border:1px solid #eee">Name</th>
            <th style="padding:8px;border:1px solid #eee">Used</th>
            <th style="padding:8px;border:1px solid #eee">Current Qty</th>
            <th style="padding:8px;border:1px solid #eee">Unit</th>
            <th style="padding:8px;border:1px solid #eee">Min</th>
            <th style="padding:8px;border:1px solid #eee">Type</th>
            <th style="padding:8px;border:1px solid #eee">Expiry</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;

    const prBtn = q('printReportsBtn');
    if(prBtn) prBtn.onclick = () => printReports(start.toISOString(), end.toISOString(), filter);
    const exBtn = q('exportReportsCsvBtn');
    if(exBtn) exBtn.onclick = () => exportReportsCSVReport(start.toISOString(), end.toISOString(), filter);
  }

  try { chartIngredientUsage && chartIngredientUsage.resize && chartIngredientUsage.resize(); } catch(e){}
}

// Chrome-optimized printReports(rangeStartISO, rangeEndISO, filter)
// If range/filter aren't provided, it uses reportStart/reportEnd and reportFilter controls.
// It prints a table of ingredient usage/current stock filtered by the chosen filter.
// Uses hidden iframe in Chrome for reliable page breaks; falls back to in-page print root otherwise.
function printReports(rangeStartISO, rangeEndISO, filter){
  try {
    // resolve filter and range (prefer args, then controls, then defaults)
    const selFilter = filter || q('reportFilter')?.value || 'usage';
    const startISO = rangeStartISO || q('reportStart')?.value || null;
    const endISO = rangeEndISO || q('reportEnd')?.value || null;
    const end = endISO ? new Date(endISO) : new Date();
    const start = startISO ? new Date(startISO) : new Date(end);
    if (!startISO) start.setDate(end.getDate() - 29);
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);

    const bakeryName = (q('bakeryName')?.value) || document.querySelector('.brand-name')?.innerText || "Eric's Bakery";

    // compute usageMap from DB.activity within the range
    const usageMap = {};
    (DB.ingredients || []).forEach(i => usageMap[i.id] = 0);
    (DB.activity || []).forEach(a=>{
      const t = new Date(a.time || a.date || null);
      if(!t) return;
      if(t < start || t > end) return;
      const txt = String(a.text || '').toLowerCase();
      if(!(txt.includes('used') || txt.includes('stock out') || txt.includes('used for'))) return;
      const m = String(a.text || '').match(/([0-9]*\.?[0-9]+)/g);
      if(!m) return;
      const v = Number(m[0]) || 0;
      if(a.ingredient_id) usageMap[a.ingredient_id] = (usageMap[a.ingredient_id] || 0) + v;
    });

    // build rows according to filter (usage → include all; low/expiring → only matching)
    const expiryWindow = (typeof REPORT_EXPIRY_DAYS !== 'undefined' ? REPORT_EXPIRY_DAYS : 7);
    const rows = (DB.ingredients || []).map(i => {
      if(selFilter === 'low' && !(i.type === 'ingredient' && i.qty <= (i.min || computeThresholdForIngredient(i)))) return '';
      if(selFilter === 'expiring' && !(i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= expiryWindow)) return '';
      const used = usageMap[i.id] || 0;
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd">${i.id}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.name)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${used}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${i.qty}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.unit||'')}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${i.min || computeThresholdForIngredient(i)}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.type||'')}</td>
        <td style="padding:8px;border:1px solid #ddd">${i.expiry||''}</td>
      </tr>`;
    }).filter(Boolean).join('');

    const finalRows = rows || `<tr><td colspan="8" style="padding:12px;border:1px solid #ddd" class="muted">No items match the selected filter/range</td></tr>`;

    // printable HTML (same for iframe and in-page)
    const printableHTML = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>Report — ${escapeHtml(selFilter)} — ${start.toISOString().slice(0,10)} to ${end.toISOString().slice(0,10)}</title>
        <style>
          html,body{font-family:Poppins,Inter,Arial,sans-serif;color:#12202f;margin:0;padding:8px}
          .header { display:flex;align-items:center;gap:12px;margin-bottom:12px }
          h1{margin:0;font-size:18px}
          .meta { color: rgba(0,0,0,0.54); font-size:12px }
          table{width:100%;border-collapse:collapse;margin-top:10px; page-break-inside:auto}
          thead{display:table-header-group}
          tr{page-break-inside:avoid; page-break-after:auto}
          th,td{border:1px solid #ddd;padding:8px;font-size:12px;vertical-align:top}
          th{background:#f6f7fb;font-weight:700}
          @media print {
            @page { margin: 12mm; }
            html,body{height:auto;overflow:visible}
            ::-webkit-scrollbar { display: none; }
          }
          @media (max-width:600px){
            th, td { font-size:11px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${escapeHtml(bakeryName)}</h1>
            <div class="meta">Report: ${escapeHtml(selFilter)} • ${start.toISOString().slice(0,10)} — ${end.toISOString().slice(0,10)}</div>
            <div class="meta">Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Used</th>
              <th>Current Qty</th>
              <th>Unit</th>
              <th>Min</th>
              <th>Type</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            ${finalRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Chrome detection (favor iframe path)
    const ua = navigator.userAgent || '';
    const isChrome = /Chrome/.test(ua) && !/Edg|OPR|Brave/.test(ua);

    if(isChrome){
      // Chrome: print via hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden','true');
      document.body.appendChild(iframe);

      const idoc = iframe.contentWindow.document;
      idoc.open();
      idoc.write(printableHTML);
      idoc.close();

      const finish = () => {
        try {
          iframe.contentWindow.focus();
          setTimeout(()=> {
            try { iframe.contentWindow.print(); } catch(e){ console.warn('iframe.print failed', e); try { window.print(); } catch(_){} }
            setTimeout(()=> { try { iframe.remove(); } catch(_){} }, 600);
          }, 160);
        } catch(e){
          try { window.print(); } catch(_) {}
          try { iframe.remove(); } catch(_) {}
        }
      };

      try {
        if(iframe.contentWindow.document.readyState === 'complete') finish();
        else iframe.onload = finish;
        setTimeout(() => { if(document.body.contains(iframe)) finish(); }, 900);
      } catch(e){
        setTimeout(()=> { try { window.print(); } catch(_){} if(document.body.contains(iframe)) iframe.remove(); }, 400);
      }
      return;
    }

    // Non-Chrome fallback: inject print-root and print
    const prevRoot = document.getElementById('bakery-report-print-root');
    if(prevRoot) prevRoot.remove();
    const prevStyle = document.getElementById('bakery-report-print-style');
    if(prevStyle) prevStyle.remove();

    const style = document.createElement('style');
    style.id = 'bakery-report-print-style';
    style.textContent = `
      .bakery-report-print-root { display:none; }
      @media print {
        body * { visibility: hidden !important; }
        .bakery-report-print-root, .bakery-report-print-root * { visibility: visible !important; }
        .bakery-report-print-root { display:block !important; position: static !important; width:100% !important; padding:0 !important; margin:0 !important; box-sizing:border-box !important; overflow:visible !important; }
        .bakery-report-print-root table { width:100% !important; border-collapse:collapse !important; page-break-inside:auto !important; }
        .bakery-report-print-root thead { display: table-header-group !important; }
        .bakery-report-print-root tr { page-break-inside: avoid !important; page-break-after: auto !important; }
        html, body { height:auto !important; overflow:visible !important; }
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.className = 'bakery-report-print-root';
    container.id = 'bakery-report-print-root';
    container.innerHTML = printableHTML;
    document.body.appendChild(container);

    setTimeout(()=> {
      try { window.focus(); } catch(e){}
      try { window.print(); } catch(e){ console.warn('print failed', e); notify('Print failed'); }
      setTimeout(()=> { try { document.getElementById('bakery-report-print-root')?.remove(); document.getElementById('bakery-report-print-style')?.remove(); } catch(_){} }, 700);
    }, 180);

  } catch(err) {
    console.error('printReports error', err);
    notify('Unable to prepare print preview');
  }
}

function exportReportsCSVReport(rangeStartISO, rangeEndISO, filter) {
  const start = new Date(rangeStartISO); start.setHours(0,0,0,0);
  const end = new Date(rangeEndISO); end.setHours(23,59,59,999);

  const usageMap = {};
  (DB.ingredients || []).forEach(i => usageMap[i.id] = 0);
  (DB.activity || []).forEach(a=>{
    const t = new Date(a.time || a.date || null);
    if(!t) return;
    if(t < start || t > end) return;
    const txt = String(a.text || '').toLowerCase();
    if(!(txt.includes('used') || txt.includes('stock out') || txt.includes('used for'))) return;
    const m = String(a.text || '').match(/([0-9]*\.?[0-9]+)/g);
    if(!m) return;
    const v = Number(m[0]) || 0;
    if(a.ingredient_id) usageMap[a.ingredient_id] = (usageMap[a.ingredient_id] || 0) + v;
  });

  const rows = [['ingredient_id','name','used','current_qty','unit','min','type','expiry']];

  (DB.ingredients || []).forEach(i=>{
    if(filter === 'low' && !(i.type === 'ingredient' && i.qty <= (i.min || computeThresholdForIngredient(i)))) return;
    if(filter === 'expiring' && !(i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= REPORT_EXPIRY_DAYS)) return;

    rows.push([i.id, i.name, (usageMap[i.id]||0), i.qty, i.unit||'', i.min||'', i.type||'', i.expiry||'']);
  });

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bakery_report_${rangeStartISO.slice(0,10)}_to_${rangeEndISO.slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function computeBestSelling(){
  const map = {};
  DB.products.forEach(p=> map[p.id] = 0);
  sampleOrders.forEach(o=> o.items.forEach(it=> { map[it.product_id] = (map[it.product_id]||0) + (it.qty||0); }));
  let bestId = null; let bestQty = 0;
  Object.keys(map).forEach(k=> { if(map[k] > bestQty){ bestQty = map[k]; bestId = Number(k); } });
  const p = DB.products.find(pp=>pp.id===bestId) || {name:'—'};
  return { id: bestId, name: p.name, qty: bestQty };
}

function computeBestSellingInRange(start, end){
  const map = {};
  DB.products.forEach(p=> map[p.id] = 0);
  sampleOrders.forEach(o=>{
    const od = new Date(o.date); od.setHours(0,0,0,0);
    if(od < start || od > end) return;
    o.items.forEach(it=> { map[it.product_id] = (map[it.product_id]||0) + (it.qty||0); });
  });
  let bestId = null, bestQty = 0;
  Object.keys(map).forEach(k=> { if(map[k] > bestQty){ bestQty = map[k]; bestId = Number(k); } });
  const p = DB.products.find(pp=>pp.id===bestId) || {name:'—'};
  return { id: bestId, name: p.name, qty: bestQty };
}

function generateColors(n){
  const base = ['#1b85ec','#3ea9f5','#ffb366','#8B5E3C','#47C278','#C07A3A','#9b59b6','#e74c3c','#2ecc71'];
  const out = [];
  for(let i=0;i<n;i++) out.push(base[i % base.length]);
  return out;
}

function exportInventoryCSV(){
  const activeChip = document.querySelector('.filter-chips .chip.active')?.dataset.filter || 'all';
  const invType = document.querySelector('input[name="invType"]:checked')?.value || 'all';

  const rows = [['id','name','type','supplier','qty','unit','min','expiry']];

  (DB.ingredients || []).forEach(i=>{
    if(invType !== 'all' && (i.type || 'ingredient') !== invType) return;
    if(activeChip === 'low'){
      if(!(i.type === 'ingredient' && i.qty <= (i.min || computeThresholdForIngredient(i)))) return;
    } else if(activeChip === 'expiring'){
      if(!(i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= (typeof REPORT_EXPIRY_DAYS !== 'undefined' ? REPORT_EXPIRY_DAYS : 7))) return;
    }
    rows.push([i.id, i.name, i.type || 'ingredient', i.supplier || '', i.qty, i.unit || '', i.min || 0, i.expiry || '']);
  });

  const csv = rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function printInventoryTable(){
  try {
    const activeChip = document.querySelector('.filter-chips .chip.active')?.dataset.filter || 'all';
    const invType = document.querySelector('input[name="invType"]:checked')?.value || 'all';

    const logoSrc = document.querySelector('.sidebar-logo-img')?.src || '';
    const bakeryName = (q('bakeryName')?.value) || document.querySelector('.brand-name')?.innerText || "Eric's Bakery";

    const rows = (DB.ingredients || []).map(i => {
      if(invType !== 'all' && (i.type || 'ingredient') !== invType) return '';
      if(activeChip === 'low'){
        if(!(i.type === 'ingredient' && i.qty <= (i.min || computeThresholdForIngredient(i)))) return '';
      } else if(activeChip === 'expiring'){
        const expiryWindow = (typeof REPORT_EXPIRY_DAYS !== 'undefined' ? REPORT_EXPIRY_DAYS : 7);
        if(!(i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= expiryWindow)) return '';
      }
      return `<tr>
        <td>${i.id}</td>
        <td>${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.type||'ingredient')}</td>
        <td>${escapeHtml(i.supplier||'')}</td>
        <td style="text-align:right">${i.qty}</td>
        <td>${escapeHtml(i.unit||'')}</td>
        <td style="text-align:right">${i.min||0}</td>
        <td>${i.expiry||''}</td>
      </tr>`;
    }).filter(Boolean).join('');

    const finalRows = rows || `<tr><td colspan="8" class="muted" style="padding:12px">No inventory items match the selected filters</td></tr>`;

    const printableHTML = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>Inventory — ${new Date().toLocaleDateString()}</title>
        <style>
          html,body{font-family:Poppins,Inter,Arial,sans-serif;color:#12202f;margin:0;padding:8px}
          h1{font-size:18px;margin:0 0 6px 0}
          .header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
          .logo{width:64px;height:64px;object-fit:cover;border-radius:8px}
          table{width:100%;border-collapse:collapse;margin-top:10px; page-break-inside:auto}
          thead{display:table-header-group}
          tr{page-break-inside:avoid; page-break-after:auto}
          th,td{border:1px solid #ddd;padding:8px;font-size:12px;vertical-align:top}
          th{background:#f6f7fb;font-weight:700}
          @media print {
            @page { margin: 12mm; }
            html,body{height:auto;overflow:visible}
            /* ensure no scrollbars in print preview */
            ::-webkit-scrollbar { display: none; }
          }
          /* responsive fallback if someone views ephemeral HTML on small screens */
          @media (max-width:600px){
            table, thead, tbody, th, td, tr { display:table !important; }
            th, td { font-size:11px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="logo">` : ''}
          <div>
            <h1>${escapeHtml(bakeryName)}</h1>
            <div style="font-size:12px;color:rgba(0,0,0,0.54)">Exported: ${new Date().toLocaleString()}</div>
            <div style="font-size:12px;color:rgba(0,0,0,0.54)">Filter: ${escapeHtml(activeChip)} • Type: ${escapeHtml(invType)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Supplier</th>
              <th style="text-align:right">Qty</th>
              <th>Unit</th>
              <th style="text-align:right">Min</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            ${finalRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const ua = navigator.userAgent || '';
    const isChrome = /Chrome/.test(ua) && !/Edg|OPR|Brave/.test(ua);

    if(isChrome){
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden','true');
      document.body.appendChild(iframe);

      const idoc = iframe.contentWindow.document;
      idoc.open();
      idoc.write(printableHTML);
      idoc.close();
      const finish = () => {
        try {
          iframe.contentWindow.focus();
          setTimeout(()=> {
            try { iframe.contentWindow.print(); } catch(e){ console.warn('iframe.print failed', e); try { window.print(); } catch(_){} }
            setTimeout(()=> { try { iframe.remove(); } catch(_){} }, 600);
          }, 160);
        } catch(e){
          try { window.print(); } catch(_) {}
          try { iframe.remove(); } catch(_) {}
        }
      };

      try {
        if(iframe.contentWindow.document.readyState === 'complete') finish();
        else iframe.onload = finish;
        setTimeout(() => { if(document.body.contains(iframe)) finish(); }, 900);
      } catch(e){
        setTimeout(()=> { try { window.print(); } catch(_){} if(document.body.contains(iframe)) iframe.remove(); }, 400);
      }

      return;
    }

    const prevRoot = document.getElementById('bakery-print-root');
    if(prevRoot) prevRoot.remove();
    const prevStyle = document.getElementById('bakery-print-style');
    if(prevStyle) prevStyle.remove();

    const style = document.createElement('style');
    style.id = 'bakery-print-style';
    style.textContent = `
      .bakery-print-root { display:none; }
      @media print {
        body * { visibility: hidden !important; }
        .bakery-print-root, .bakery-print-root * { visibility: visible !important; }
        .bakery-print-root { display:block !important; position: static !important; width:100% !important; padding:0 !important; margin:0 !important; box-sizing:border-box !important; overflow:visible !important; }
        .bakery-print-root table { width:100% !important; border-collapse:collapse !important; page-break-inside:auto !important; }
        .bakery-print-root thead { display: table-header-group !important; }
        .bakery-print-root tr { page-break-inside: avoid !important; page-break-after: auto !important; }
        html, body { height:auto !important; overflow:visible !important; }
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.className = 'bakery-print-root';
    container.id = 'bakery-print-root';
    container.innerHTML = printableHTML;
    document.body.appendChild(container);

    // small delay then print
    setTimeout(()=> {
      try { window.focus(); } catch(e){}
      try { window.print(); } catch(e){ console.warn('print failed', e); notify('Print failed'); }
      setTimeout(()=> { try { document.getElementById('bakery-print-root')?.remove(); document.getElementById('bakery-print-style')?.remove(); } catch(_){} }, 700);
    }, 180);

  } catch (err) {
    console.error('printInventoryTable error', err);
    notify('Unable to prepare print preview');
  }
}

let currentCalendarYear = (new Date()).getFullYear();
let currentCalendarMonth = (new Date()).getMonth();

function renderMonthCalendar(year, month){
  const grid = q('calendarGrid');
  if(!grid) return;
  grid.innerHTML = '';
  const firstDay = new Date(year, month, 1);
  const startDayIndex = firstDay.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  for(let i=0;i<startDayIndex;i++){
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    grid.appendChild(cell);
  }
  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    const dateNum = document.createElement('div');
    dateNum.className = 'date-num';
    dateNum.textContent = d;
    cell.appendChild(dateNum);
    const iso = new Date(year, month, d).toISOString().slice(0,10);
    const events = sampleOrders.filter(o => o.date.slice(0,10) === iso);
    events.slice(0,3).forEach(ev => {
      const chip = document.createElement('div');
      chip.className = 'event-chip';
      chip.textContent = `${ev.customer} • Order #${ev.id}`;
      cell.appendChild(chip);
    });
    if(events.length > 3){
      const more = document.createElement('div');
      more.className = 'muted small';
      more.textContent = `+${events.length - 3} more`;
      cell.appendChild(more);
    }
    grid.appendChild(cell);
  }
}

function renderCalendar(){
  const header = q('view-calendar')?.querySelector('.page-header h2');
  if(header && q('calendarGrid')){
    header.textContent = `Calendar — ${new Date(currentCalendarYear, currentCalendarMonth,1).toLocaleString([], {month:'long', year:'numeric'})}`;
  }
  renderMonthCalendar(currentCalendarYear, currentCalendarMonth);
}

function destroyAllCharts(){
  [chartStock, chartBestSeller, chartSalesTimeline, chartIngredientUsage].forEach(c=> { try{ c && c.destroy(); } catch(e){} });
}

function renderProductGrid(){
  const qv=(q('searchProd')?.value||'').trim().toLowerCase();
  const grid=q('productGrid'); if(!grid) return;
  const items = DB.products.filter(p=>!qv || p.name.toLowerCase().includes(qv));
  grid.innerHTML = items.map(p=>`<div class="product-card card"><div class="img" style="background:var(--card);display:flex;align-items:center;justify-content:center">${p.image||'<i class="fa fa-bread-slice fa-2x"></i>'}</div><div class="pbody"><div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${p.name}</strong><div class="muted small">${p.category}</div></div><div style="text-align:right"><div><strong>₱${p.price}</strong></div><div class="muted small">${p.stock || 0} in stock</div></div></div><div style="margin-top:8px;display:flex;gap:8px"><button class="btn small p-bake" data-id="${p.id}" type="button"><i class="fa fa-fire"></i> Bake</button></div></div></div>`).join('') || '<div class="card muted">No products</div>';
  grid.querySelectorAll('.p-bake').forEach(btn=> btn.addEventListener('click', ()=> openBakeModal(Number(btn.dataset.id))));
}

function openModalHTML(html){ const c=q('modalContent'); if(!c) return; c.innerHTML = html; openModal(); }
function ingredientModalTemplate(ing){
  return `
    <h3>${ing.name}</h3>
    <div style="display:flex;gap:12px;margin-bottom:12px">
      <div><strong>${ing.qty} ${ing.unit}</strong><div class="muted small">Current qty</div></div>
      <div><strong>${ing.min} ${ing.unit}</strong><div class="muted small">Minimum</div></div>
      <div><strong>${ing.expiry||'—'}</strong><div class="muted small">Expiry</div></div>
    </div>
    <div><h4>Stock History</h4><ul class="timeline">${DB.activity.filter(a=>a.ingredient_id===ing.id).map(a=>`<li>${a.text} <span class="muted small">${a.time}</span></li>`).join('') || '<li class="muted">No history</li>'}</ul></div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn primary" id="modalStockIn" type="button">Stock In</button>
      <button class="btn" id="modalStockOut" type="button">Stock Out</button>
    </div>
  `;
}

async function openIngredientDetail(id){
  try {
    const ing = await fetchIngredient(id);
    if (!ing) return notify('Ingredient not found');
    // fetch recent activity for this ingredient
    const actResp = await apiFetch(`/api/activity?limit=50`);
    const history = (actResp && actResp.items) ? actResp.items.filter(a => Number(a.ingredient_id) === Number(id)) : [];
    const histHtml = history.length ? history.slice().map(h => `<li>${escapeHtml(h.text)} <div class="muted small">${escapeHtml(new Date(h.time).toLocaleString())}</div></li>`).join('') : '<li class="muted">No history</li>';
    const attrs = (ing.attrs && typeof ing.attrs === 'string') ? (() => { try { return JSON.parse(ing.attrs); } catch(e){ return {}; } })() : (ing.attrs || {});
    const attrsHtml = Object.keys(attrs || {}).length ? Object.keys(attrs).map(k=> `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(attrs[k]||''))}</div>`).join('') : '<div class="muted small">No attributes</div>';

    openModalHTML(ingredientModalTemplate(Object.assign({}, ing, { min: ing.min_qty, max: ing.max_qty })));
    // replace or attach buttons after modal HTML created
    q('modalStockIn')?.addEventListener('click', ()=> openStockForm(id,'in'));
    q('modalStockOut')?.addEventListener('click', ()=> openStockForm(id,'out'));
  } catch (e) {
    console.error('openIngredientDetail err', e);
    notify('Could not load ingredient details');
  }
}

async function openEditIngredient(id){
  try {
    const ing = await fetchIngredient(id);
    if(!ing) return notify('Ingredient not found');

    // open modal populated with server data (use min_qty)
    openModalHTML(`<h3>Edit — ${escapeHtml(ing.name)}</h3>
      <form id="editIngForm" class="form">
        <label class="field"><span class="field-label">Name</span><input id="editName" type="text" value="${escapeHtml(ing.name)}" required/></label>
        <label class="field"><span class="field-label">Quantity</span><input id="editQty" type="number" step="0.01" value="${ing.qty||0}" required/></label>
        <label class="field"><span class="field-label">Minimum</span><input id="editMin" type="number" step="0.01" value="${ing.min_qty||0}" required/></label>
        <div style="display:flex;gap:8px;margin-top:8px" class="modal-actions"><button class="btn primary" type="submit">Save</button><button class="btn ghost" id="cancelEdit" type="button">Cancel</button></div>
      </form>`);

    q('cancelEdit')?.addEventListener('click', closeModal);
    q('editIngForm')?.addEventListener('submit', async (e)=> {
      e.preventDefault();
      const body = {
        name: q('editName')?.value || ing.name,
        // update qty via stock endpoint instead of PUT qty (to keep activity log), but we'll support a direct qty update too:
        qty: Number(q('editQty')?.value || ing.qty || 0),
        min_qty: Number(q('editMin')?.value || ing.min_qty || 0)
      };

      try {
        // Update fields: server's PUT supports min_qty etc. If you prefer to use stock endpoint for qty changes, change accordingly.
        await apiFetch(`/api/ingredients/${id}`, { method: 'PUT', body: { name: body.name, min_qty: body.min_qty, attrs: ing.attrs || null }});
        // If qty changed, use the stock endpoint so activity is logged:
        if (Number(body.qty) !== Number(ing.qty || 0)) {
          const diff = Number(body.qty) - Number(ing.qty || 0);
          if (diff > 0) {
            await apiFetch(`/api/ingredients/${id}/stock`, { method: 'POST', body: { type: 'in', qty: Math.abs(diff), note: 'Quantity adjusted (edit)' }});
          } else if (diff < 0) {
            await apiFetch(`/api/ingredients/${id}/stock`, { method: 'POST', body: { type: 'out', qty: Math.abs(diff), note: 'Quantity adjusted (edit)' }});
          }
        }
        closeModal();
        // refresh table and activity
        await renderIngredientCards();
        await renderInventoryActivity();
        notify('Ingredient updated');
      } catch (err) {
        console.error('edit save err', err);
        notify(err.message || 'Could not update ingredient');
      }
    }, { once: true });
  } catch (err) {
    console.error('openEditIngredient err', err);
    notify('Could not open edit dialog');
  }
}


function openStockForm(id,type){
  const ing = DB.ingredients.find(x=>x.id===id); if(!ing) return;
  openModalHTML(`<h3>${type==='in'?'Stock In':'Stock Out'} — ${ing.name}</h3><form id="stockForm" class="form"><label class="field"><span class="field-label">Quantity (${ing.unit})</span><input id="stockQty" type="number" step="0.01" required/></label><label class="field"><span class="field-label">Note</span><input id="stockNote" type="text"/></label><div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary" type="submit">${type==='in'?'Add':'Remove'}</button><button class="btn ghost" id="cancelStock" type="button">Cancel</button></div></form>`);
  q('cancelStock')?.addEventListener('click', closeModal);
  q('stockForm')?.addEventListener('submit', (e)=>{ e.preventDefault(); const qty = Number(q('stockQty')?.value || 0); const note = q('stockNote')?.value || ''; applyStockChange(id,type,qty,note); closeModal(); });
}

async function applyStockChange(id, type, qty, note) {
  if(!id || !['in','out'].includes(type) || !(qty > 0)) { notify('Invalid stock change'); return; }
  try {
    await apiFetch(`/api/ingredients/${id}/stock`, { method: 'POST', body: { type, qty: Number(qty), note: note || '' }});
    notify('Stock updated');
    await renderIngredientCards();      // refresh current table
    await renderInventoryActivity();    // refresh activity side panel
    // also re-render kpis
    renderDashboard();
  } catch (e) {
    console.error('applyStockChange err', e);
    notify(e.message || 'Server error');
    // If the server returned success but responded slowly, you may see stale UI; we re-fetch above.
  }
}

function openAddIngredient(){
  const defaultUnit = 'kg';
  const suggestedMin = 1;

  openModalHTML(`
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">Add Inventory Item</h3>
    </div>
    <form id="addIngForm" class="form" style="margin-top:10px">
      <label class="field"><span class="field-label">Name</span><input id="ingName" type="text" required/></label>

      <label class="field"><span class="field-label">Type</span>
        <select id="ingType" required>
          <option value="ingredient">Ingredients</option>
          <option value="packaging">Packaging</option>
          <option value="equipment">Equipment</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </label>

      <label class="field field-unit"><span class="field-label">Unit</span><input id="ingUnit" type="text" required value="" placeholder="e.g., kg, pcs, ltr, pack, box, roll, bag"/></label>

      <label class="field"><span class="field-label">Quantity</span><input id="ingQty" type="number" step="0.01" value="0" required/></label>

      <label class="field field-min"><span class="field-label">Minimum quantity</span><input id="ingMin" type="number" step="0.01" value="0" required/></label>

      <label class="field field-max"><span class="field-label">Maximum quantity</span><input id="ingMax" type="number" step="0.01" value="" /></label>

      <label class="field field-expiry"><span class="field-label">Expiry date</span><input id="ingExpiry" type="date"/></label>

      <label class="field field-supplier"><span class="field-label">Supplier</span><input id="ingSupplier" type="text"/></label>

      <div class="modal-actions" style="margin-top:8px">
        <button class="btn primary" type="submit">Save</button>
        <button class="btn ghost" id="cancelAdd" type="button">Cancel</button>
      </div>
    </form>
  `);

  const mc = document.querySelector('.modal-card');
  if(mc) mc.classList.add('modal-small');

  const toggleMaterialFields = () => {
    const type = (q('ingType')?.value || 'ingredient');
    const isMaterial = type === 'ingredient';
    ['field-min','field-max','field-supplier','field-expiry'].forEach(cls => {
      const el = document.querySelector(`#modalContent .${cls}`) || document.querySelector(`.${cls}`);
      if(el) el.style.display = isMaterial ? '' : 'none';
    });
    // ensure required attributes reflect visibility
    if(q('ingUnit')) q('ingUnit').required = isMaterial;
    if(q('ingMin')) q('ingMin').required = isMaterial;
  };

  q('ingType')?.addEventListener('change', toggleMaterialFields);
  // initial state
  toggleMaterialFields();

  q('cancelAdd')?.addEventListener('click', closeModal);
  q('addIngForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    name: (q('ingName')?.value || '').trim(),
    type: (q('ingType')?.value || 'ingredient'),
    unit: (q('ingUnit')?.value || '').trim(),
    qty: Number(q('ingQty')?.value || 0),
    min_qty: Number(q('ingMin')?.value || 0),
    max_qty: q('ingMax')?.value ? Number(q('ingMax')?.value) : null,
    expiry: q('ingExpiry')?.value || null,
    supplier: q('ingSupplier')?.value || '',
    attrs: {} // keep placeholder - update if you have attribute fields
  };

  try {
    // call server
    const res = await apiFetch('/api/ingredients', { method: 'POST', body: payload });
    // server returns created ingredient as res.ingredient (per server code)
    const created = res && res.ingredient ? res.ingredient : null;

    // update local cache (so UI is snappy). use same mapping as loadRemoteInventory
    if (created) {
      const local = {
        id: created.id,
        name: created.name,
        unit: (created.unit && String(created.unit).trim()) || (created.unit_name && String(created.unit_name).trim()) || (created.type === 'ingredient' ? 'kg' : ''),
        qty: Number(created.qty || 0),
        min: Number(created.min_qty || created.min || 0),
        max: created.max_qty || created.max || null,
        expiry: created.expiry || null,
        supplier: created.supplier || '',
        type: created.type || 'ingredient',
        attrs: (typeof created.attrs === 'string' ? (()=>{ try{ return JSON.parse(created.attrs); }catch(e){return null;} })() : created.attrs) || null,
        icon: created.icon || 'fa-box-open'
      };
      // add to local list
      DB.ingredients = DB.ingredients || [];
      // insert at top
      DB.ingredients.unshift(local);
    }

    closeModal();
    await renderIngredientCards();      // refresh table UI
    await renderInventoryActivity();    // fetch the server activity (server will have logged initial stock)
    renderDashboard();
    notify('Ingredient added');
  } catch (err) {
    console.error('add ingredient err', err);
    notify(err.message || 'Could not add ingredient');
  }
});


  function tryAutoSuggestMin(){
    const name = (q('ingName')?.value || '').trim();
    const unit = (q('ingUnit')?.value || defaultUnit).trim();
    const qty = Number(q('ingQty')?.value || 0);
    const key = name.toLowerCase();
    if(PROGRAMMED_CONSUMPTION[key] && PROGRAMMED_CONSUMPTION[key].unit === unit){
      const suggested = +(PROGRAMMED_CONSUMPTION[key].dailyKg * 2).toFixed(3); 
      q('ingMin').value = suggested;
      return;
    }
    const tmp = { id: nextIngredientId(), name, unit, qty, type: q('ingType')?.value || 'ingredient' };
    const thr = computeThresholdForIngredient(tmp);
    q('ingMin').value = thr;
  }

  q('ingName')?.addEventListener('input', tryAutoSuggestMin);
  q('ingUnit')?.addEventListener('change', tryAutoSuggestMin);
  q('ingQty')?.addEventListener('input', tryAutoSuggestMin);

  tryAutoSuggestMin();
}

function openAddProduct(){
  const ingOptions = DB.ingredients.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
  openModalHTML(`
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">Add Product</h3>
    </div>

    <form id="addProdForm" class="form" style="margin-top:10px">
      <label class="field"><span class="field-label">Product name</span><input id="prodName" type="text" required/></label>

      <label class="field"><span class="field-label">Category</span><input id="prodCategory" type="text"/></label>

      <label class="field"><span class="field-label">Price (₱)</span><input id="prodPrice" type="number" step="0.01" required/></label>

      <label class="field"><span class="field-label">Starting stock</span><input id="prodStock" type="number" value="0" required/></label>

      <label class="field">
        <span class="field-label">Recipe</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <select id="recipeIng">${ingOptions}</select>
          <input id="recipeQty" type="number" placeholder="qty per unit" step="0.001" style="width:110px"/>
          <button class="btn" type="button" id="addRecipeLine">Add</button>
        </div>
        <div id="recipeList" style="margin-top:8px"></div>
      </label>

      <div class="modal-actions" style="margin-top:12px">
        <button class="btn primary" type="submit">Save Product</button>
        <button class="btn ghost" id="cancelAddProd" type="button">Cancel</button>
      </div>
    </form>
  `);

  const mc = document.querySelector('.modal-card');
  if(mc) mc.classList.add('modal-small');

  q('cancelAddProd')?.addEventListener('click', closeModal);

  const recipe = [];

  function renderRecipeList(){
    const list = q('recipeList');
    if(!list) return;
    list.innerHTML = recipe.map((r, idx)=> {
      const n = DB.ingredients.find(i=>i.id===r.ingredient_id)?.name || 'Unknown';
      return `<div data-idx="${idx}" style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-radius:6px;background:var(--card);border:1px solid rgba(0,0,0,0.04);margin-bottom:6px">
                <div style="flex:1">${n} — <strong>${r.qty_per_unit}</strong></div>
                <div><button class="btn small remove-recipe" data-idx="${idx}" type="button">Remove</button></div>
              </div>`;
    }).join('');
    list.querySelectorAll('button.remove-recipe').forEach(btn => btn.addEventListener('click', ()=> {
      const idx = Number(btn.dataset.idx);
      if(!Number.isFinite(idx)) return;
      recipe.splice(idx,1);
      renderRecipeList();
    }));
  }

  q('addRecipeLine')?.addEventListener('click', ()=> {
    const iid = Number(q('recipeIng')?.value || 0);
    const qty = Number(q('recipeQty')?.value || 0);
    if(!iid || qty <= 0) { notify('Pick ingredient and qty'); return; }
    recipe.push({ ingredient_id: iid, qty_per_unit: qty });
    renderRecipeList();
    if(q('recipeQty')) q('recipeQty').value = '';
  });

  q('addProdForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = q('prodName')?.value.trim();
    if(!name) { notify('Product name required'); return; }
    const category = q('prodCategory')?.value || '';
    const price = Number(q('prodPrice')?.value) || 0;
    const stock = Number(q('prodStock')?.value) || 0;
    const normalizedRecipe = (recipe || []).map(r=> ({ ingredient_id: Number(r.ingredient_id), qty_per_unit: Number(r.qty_per_unit) || 0 }));
    const newP = { id: nextProductId(), name, category, price, stock, recipe: normalizedRecipe };
    DB.products.push(newP);
    DB.activity.push({ text: `Added product ${name}`, time: new Date().toLocaleString() });
    closeModal();
    renderProductGrid();
    renderDashboard();
    notify('Product added');
  });
}

function openBakeModal(productId){
  const product = DB.products.find(p=>p.id===productId) || DB.products[0];
  if(!product) return;
  const recipeLines = (product.recipe || []).map(r=>{ 
    const ing = DB.ingredients.find(i=>i.id===r.ingredient_id) || {name:'Unknown', qty:0, unit:'u', id:null};
    return `<tr><td>${ing.name}</td><td class="req" data-ingredient="${ing.id}">${r.qty_per_unit}</td><td class="avail">${ing.qty}</td></tr>`; 
  }).join('');
  openModalHTML(`<h3>Bake — ${product.name}</h3><div class="muted small">Recipe summary</div><table style="width:100%;margin-top:8px;border-collapse:collapse"><thead><tr style="text-align:left"><th>Ingredient</th><th>Per unit</th><th>Available</th></tr></thead><tbody>${recipeLines}</tbody></table><form id="bakeForm" style="margin-top:12px"><label class="field"><span class="field-label">Quantity to bake</span><input id="bakeQty" type="number" value="1" min="1" required/></label><div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary" type="submit">Confirm Bake</button><button class="btn ghost" id="cancelBake" type="button">Cancel</button></div></form>`);
  q('cancelBake')?.addEventListener('click', closeModal);
  q('bakeForm')?.addEventListener('submit', (e)=>{ 
    e.preventDefault();
    const qty=Number(q('bakeQty')?.value)||1;
    const shortages=[];
    (product.recipe||[]).forEach(r=>{
      const ing=DB.ingredients.find(i=>i.id===r.ingredient_id);
      const required = +(r.qty_per_unit * qty);
      if(!ing || ing.qty < required) shortages.push({ingredient: ing?ing.name:'Unknown', required, available: ing?ing.qty:0});
    });
    if(shortages.length){
      notify('Shortage:\n'+shortages.map(s=>`${s.ingredient}: need ${s.required}, have ${s.available}`).join('\n'));
      return;
    }
    (product.recipe||[]).forEach(r=>{
      const ing = DB.ingredients.find(i=>i.id===r.ingredient_id);
      if(!ing) return;
      const required = +(r.qty_per_unit * qty);
      ing.qty = +(Math.max(0, ing.qty - required)).toFixed(3);
      DB.activity.push({text:`Used ${required} ${ing.unit} for ${product.name}`, time:new Date().toLocaleString(), ingredient_id:ing.id});
    });
    product.stock = (product.stock || 0) + qty;
    DB.activity.push({text:`Baked ${qty} x ${product.name}`, time:new Date().toLocaleString()});
    closeModal();
    renderIngredientCards();
    renderProductGrid();
    renderDashboard();
    renderStockChart();
    renderBestSellerChart();
    renderReports();
    notify('Bake successful — inventory updated (simulated)');
  });
}

function populateSettings(){
  const list=q('usersList'); if(list){
    const acc=loadAccounts(); const curr=getSession()?.username;
    const rows=Object.keys(acc||{}).map(u=>{ const role=acc[u].role||''; return `<div class="user-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:8px;background:var(--card);border:1px solid rgba(0,0,0,0.04)"><div><strong>${u}</strong><div class="muted small">${role}</div></div><div>${u!==curr?`<button class="btn small" data-del="${u}" type="button">Delete</button>`:`<span class="muted small">Signed in</span>`}</div></div>`}).join('');
    list.innerHTML = rows || '<div class="muted small">No users</div>';
    list.querySelectorAll('button[data-del]').forEach(b=> b.addEventListener('click', ()=> { const u=b.dataset.del; if(confirm(`Delete user ${u}?`)){ const ac=loadAccounts(); delete ac[u]; saveAccounts(ac); populateSettings(); notify('User deleted'); } }));
  }
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  if(q('themeToggle')) q('themeToggle').checked = theme === 'dark';
  const bakery = JSON.parse(localStorage.getItem('bakery_profile') || '{}');
  if(q('bakeryName')) q('bakeryName').value = bakery.name || '';
  if(q('bakeryAddress')) q('bakeryAddress').value = bakery.address || '';
  if(q('bakeryUnit')) q('bakeryUnit').value = bakery.unit || '';

  // save bakery
  q('saveBakery')?.addEventListener('click', (e)=> { e.preventDefault(); const o={name:q('bakeryName')?.value||'', address:q('bakeryAddress')?.value||'', unit:q('bakeryUnit')?.value||''}; localStorage.setItem('bakery_profile', JSON.stringify(o)); });

  q('themeToggle')?.addEventListener('change', ()=> {
    const isDark = q('themeToggle')?.checked;
    setTheme(isDark ? 'dark' : 'light');
  });
}

// --- Fetch ingredients from backend and hydrate local DB ---
async function loadRemoteInventory(){
  try {
    const res = await fetch('/api/ingredients', { credentials: 'include' });
    if(!res.ok){ console.debug('loadRemoteInventory failed', res.status); return; }
    const json = await res.json().catch(()=> ({}));
    // support different server shapes: { data: [...] } or { items: [...] }
    const items = json.data || json.items || json || [];
    if(!Array.isArray(items)) return;
    // map server fields to client DB shape
    DB.ingredients = items.map(i => ({
  id: i.id,
  name: i.name,
  // prefer server-provided unit; fall back to unit_name; only default to 'kg' when server didn't provide
  unit: (i.unit && String(i.unit).trim()) || (i.unit_name && String(i.unit_name).trim()) || ( (i.type === 'ingredient') ? 'kg' : '' ),
  qty: Number(i.qty || i.quantity || 0),
  min: Number(i.min_qty || i.min || 0),
  max: i.max_qty || i.max || null,
  expiry: i.expiry || null,
  supplier: i.supplier || '',
  type: i.type || 'ingredient',
  attrs: (typeof i.attrs === 'string' ? (()=>{ try{ return JSON.parse(i.attrs); } catch(e){ return null; } })() : i.attrs) || null,
  icon: i.icon || 'fa-box-open'
}));
    // re-render currently-visible views
    renderIngredientCards();
    renderDashboard();
  } catch (err) {
    console.error('loadRemoteInventory error', err);
  }
}

function startApp(){
  showApp(true); showOverlay(false);
  loadRemoteInventory().catch(()=>{});
  const user=getSession()||{name:'Guest',role:'Baker'};
  if(q('sidebarUser')) q('sidebarUser').textContent = `${user.name} — ${user.role}`;
  if(q('userBadgeText')) q('userBadgeText').textContent = `${user.name}`;
  if(q('userMenuName')) q('userMenuName').textContent = user.name || '';
  if(q('userMenuRole')) q('userMenuRole').textContent = user.role || '';

  renderDashboard(); renderIngredientCards(); renderProductGrid(); renderActivity(); initSearchFeature();
  buildTopNav(); showView('dashboard');
  setupSidebarToggle();

  document.querySelectorAll('.nav-item').forEach(btn=>{ 
    btn.onclick = ()=>{ if(!isLoggedIn()){ 
      showOverlay(true,true); return; } 
      const view=btn.dataset.view; 
      if(view==='profile') { populateProfile(); bindProfileControls(); } 
      if(view==='settings') populateSettings(); 
      showView(view); const sb=q('sidebar'); 
      if(sb && window.innerWidth <= 900) sb.classList.remove('open'); const overlay=document.getElementById('drawerOverlay'); if(overlay) overlay.remove(); }; });

  on('addProductBtn','click', openAddProduct);
  on('addIngredientBtn','click', openAddIngredient);
  on('quickAddIng','click', openAddIngredient);
  on('searchIng','input', renderIngredientCards);
  on('searchProd','input', renderProductGrid);
  document.querySelectorAll('.chip').forEach(c=> c.addEventListener('click', (e)=>{ document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active')); e.currentTarget.classList.add('active'); renderIngredientCards(); }));

  on('createOrderBtn','click', openNewOrderModal);
  on('refreshReports','click', ()=> renderReports());
  on('reportPeriod','change', ()=> renderReports());
  on('searchOrder','input', ()=> renderOrders());

  on('applyReportRange','click', ()=> {
  });

  on('exportReportsBtn','click', ()=> {
    const start = q('reportStart')?.value;
    const end = q('reportEnd')?.value;
    if(!start || !end){ notify('Choose a date range first'); return; }
    exportReportsCSV(start + 'T00:00:00Z', end + 'T23:59:59Z');
  });

  on('calendarPrev','click', ()=> { currentCalendarMonth--; if(currentCalendarMonth < 0){ currentCalendarMonth = 11; currentCalendarYear--; } renderCalendar(); });
  on('calendarNext','click', ()=> { currentCalendarMonth++; if(currentCalendarMonth > 11){ currentCalendarMonth = 0; currentCalendarYear++; } renderCalendar(); });
  on('calendarToday','click', ()=> { const now = new Date(); currentCalendarYear = now.getFullYear(); currentCalendarMonth = now.getMonth(); renderCalendar(); });

  const hb=q('hamburger');
  if(hb){
    hb.onclick = ()=> {
      const sb=q('sidebar'); if(!sb) return;
      if(sb.classList.contains('open')){ sb.classList.remove('open'); const overlay=document.getElementById('drawerOverlay'); if(overlay) overlay.remove(); return; }
      const o=document.createElement('div'); o.id='drawerOverlay'; o.style.position='fixed'; o.style.inset='0'; o.style.zIndex='9998'; o.style.background='rgba(0,0,0,0.18)';
      o.addEventListener('click', ()=> { sb.classList.remove('open'); o.remove(); });
      document.body.appendChild(o);
      sb.classList.add('open');
    };
  }

  if(q('userBadge')) q('userBadge').onclick = (e)=>{ const um = q('userMenu'); if(!um) return; const next = um.classList.toggle('hidden'); um.setAttribute('aria-hidden', next); };
  document.addEventListener('click', (e)=> {
    const um=q('userMenu'), badge=q('userBadge');
    if(!um || !badge) return;
    if(!um.classList.contains('hidden') && !um.contains(e.target) && !badge.contains(e.target)){ um.classList.add('hidden'); um.setAttribute('aria-hidden','true'); }
  });

  if(q('userMenuLogout')) q('userMenuLogout').onclick = performLogout;
  if(q('userMenuProfile')) q('userMenuProfile').onclick = ()=> { populateProfile(); showView('profile'); q('userMenu') && q('userMenu').classList.add('hidden'); };
  if(q('logoutBtn')) q('logoutBtn').addEventListener('click', performLogout);
  if(q('saveProfile')) q('saveProfile').addEventListener('click', (e)=>{ e.preventDefault(); const name=q('profileName')?.value||''; const sess=getSession(); if(sess){ sess.name=name; setSession(sess, !!getPersistentSession()); if(q('sidebarUser')) q('sidebarUser').textContent = `${name} — ${sess.role}`; notify('Profile saved'); } });
  if(q('saveBakery')) q('saveBakery').addEventListener('click', (e)=> { e.preventDefault(); const o={name:q('bakeryName')?.value||'', address:q('bakeryAddress')?.value||'', unit:q('bakeryUnit')?.value||''}; localStorage.setItem('bakery_profile', JSON.stringify(o)); notify('Bakery settings saved'); });
  if(q('modalClose')) q('modalClose').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e)=> { if(e.key === 'Escape') closeModal(); });

  if(q('themeToggle')) q('themeToggle').addEventListener('change', (e)=> applyTheme(e.target.checked ? 'dark' : 'light'));
  if(q('addIngredientBtn')) q('addIngredientBtn').addEventListener('click', openAddIngredient);
  if(q('addProductBtn')) q('addProductBtn').addEventListener('click', openAddProduct);
  
  enforcePermissionsUI();

  if(q('view-inventory') && !q('exportInventoryCsvBtn')){
    renderIngredientCards();
  }

  if (!q('reportFilter')) {
  const parent = q('view-reports')?.querySelector('.page-actions.report-controls');
  if (parent) {
    const sel = document.createElement('select');
    sel.id = 'reportFilter';
    sel.innerHTML = `<option value="usage">Ingredient usage</option><option value="low">Low stock</option><option value="expiring">Expiring</option>`;
    parent.appendChild(sel);

    sel.addEventListener('change', () => {
      const start = q('reportStart')?.value || null;
      const end = q('reportEnd')?.value || null;
      renderReports(start, end, sel.value);
    });
  }
}

  const applyBtn = q('applyReportRange');
if (applyBtn) {
  applyBtn.removeEventListener?.('click', ()=>{});
  applyBtn.addEventListener('click', () => {
    const presetDays = Number(q('reportPreset')?.value || 30);
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - (presetDays - 1));
    q('reportStart').value = start.toISOString().slice(0,10);
    q('reportEnd').value = end.toISOString().slice(0,10);
    const filter = q('reportFilter')?.value || 'usage';
    renderReports(q('reportStart').value, q('reportEnd').value, filter);
    renderStockChart(q('reportStart').value, q('reportEnd').value);
  });
}

  if(typeof populateProfile === 'function') populateProfile();
  if(typeof bindProfileControls === 'function') bindProfileControls();

  renderStockChart();
  renderBestSellerChart();
  initSearchFeature();
}

async function performLogout(){
  try { await fetch('/api/auth/logout', { method:'POST', credentials:'include' }); 

  try { localStorage.removeItem('CURRENT_USER'); } catch(e){}
location.reload();
} catch(e){}
  clearSession();
  destroyAllCharts();
  showApp(false);
  showOverlay(true, true);
  if(q('overlay-username')) q('overlay-username').value='';
  if(q('overlay-password')) q('overlay-password').value='';
}

// --- Recent login profiles helpers (for overlay sign-in) ---
const RECENT_LOGINS_KEY = 'bakery_recent_logins_v1';
function loadRecentProfiles(){ try{ return JSON.parse(localStorage.getItem(RECENT_LOGINS_KEY) || '[]'); }catch(e){ return []; } }
function saveRecentProfileLocally(username){
  if(!username) return;
  const arr = loadRecentProfiles().filter(u => u.toLowerCase() !== username.toLowerCase());
  arr.unshift(username);
  localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(arr.slice(0,6)));
  renderRecentProfiles();
}
function removeRecentProfile(username){
  const arr = loadRecentProfiles().filter(u => u.toLowerCase() !== username.toLowerCase());
  localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(arr.slice(0,6)));
  renderRecentProfiles();
}

function renderRecentProfiles(){
  const wrap = q('recentProfiles');
  if(!wrap) return;
  const list = loadRecentProfiles();
  if(!list || list.length === 0){ wrap.innerHTML = ''; return; }

  const inner = [];
  inner.push('<div class="rp-title small muted" style="color:var(--deep-navy)">Recent users</div>');
  inner.push('<div class="rp-list" role="list">');
  list.forEach(username => {
    const av = localStorage.getItem(avatarKeyFor(username));
    const avatarHtml = av ? `<div class="rp-avatar" aria-hidden="true"><img src="${av}" alt="${escapeHtml(username)} avatar" /></div>` :
                             `<div class="rp-avatar" aria-hidden="true">${escapeHtml((username||'')[0]||'U')}</div>`;
    inner.push(`<div class="recent-profile" role="button" tabindex="0" data-user="${escapeHtml(username)}">
                  ${avatarHtml}
                  <div class="rp-name">${escapeHtml(username)}</div>
                  <button class="rp-remove" data-user="${escapeHtml(username)}" title="Remove ${escapeHtml(username)}" aria-label="Remove ${escapeHtml(username)}">✕</button>
                </div>`);
  });
  inner.push('</div>');
  wrap.innerHTML = inner.join('');
  // bind handlers
  wrap.querySelectorAll('.recent-profile').forEach(el=>{
    const user = el.dataset.user;
    // clicking the whole card fills username and focuses password
    el.addEventListener('click', (ev)=> {
      if(ev.target && ev.target.classList && ev.target.classList.contains('rp-remove')) return; // ignore container click when remove clicked
      const u = el.dataset.user;
      if(q('overlay-username')) q('overlay-username').value = u;
      if(q('overlay-password')) { q('overlay-password').value=''; q('overlay-password').focus(); }
      // set focus to password so user only types password
    });
    // keyboard enter support
    el.addEventListener('keydown', (e)=> { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  });
  wrap.querySelectorAll('.rp-remove').forEach(btn=>{
    btn.addEventListener('click', (ev)=> {
      ev.stopPropagation();
      const u = btn.dataset.user;
      if(!u) return;
      removeRecentProfile(u);
    });
  });
}

// render at startup (if overlay exists)
document.addEventListener('DOMContentLoaded', ()=> {
  renderRecentProfiles();
});

document.addEventListener('DOMContentLoaded', ()=> {
  const accounts = loadAccounts(); if(Object.keys(accounts).length === 0){ accounts['admin'] = { password:'admin', role:'Owner', name:'Admin' }; saveAccounts(accounts); }

  const splash=q('splash'), overlay=q('landingOverlay'), loginPanel=q('overlayLogin'), signupPanel=q('overlaySignup');
  const splashDuration=5200; if(splash) splash.classList.remove('hidden');
  setTimeout(()=>{ if(splash) splash.classList.add('hidden'); setTimeout(()=>{ const pers=getPersistentSession(); if(pers && pers.username){ setSession(pers, true); startApp(); applyTheme(localStorage.getItem(THEME_KEY) || 'light'); } else { showOverlay(true,true); } }, 260); }, splashDuration);

  on('overlayToSignup','click', ()=> { overlay && overlay.classList.add('signup-mode'); loginPanel && loginPanel.classList.add('hidden'); signupPanel && signupPanel.classList.remove('hidden'); setTimeout(()=> q('overlay-su-username')?.focus(), 240); });
  on('overlayBackToLogin','click', ()=> { overlay && overlay.classList.remove('signup-mode'); signupPanel && signupPanel.classList.add('hidden'); loginPanel && loginPanel.classList.remove('hidden'); setTimeout(()=> q('overlay-username')?.focus(), 160); });
  on('forgotPasswordBtn', 'click', (e) => { openForgotPasswordModal(); });

  on('overlaySignInBtn','click', async (e) => {
  e.preventDefault();
  const btn = q('overlaySignInBtn');
  setButtonLoadingWithMin(btn, true, 600);
  showGlobalLoader(true, 'Signing in', 'Authenticating your account...', 1500);

  try {
    const username = q('overlay-username')?.value.trim();
    const password = q('overlay-password')?.value || '';
    const remember = !!q('rememberMe')?.checked;

    if (!username) {
      notify('Enter username');
      setButtonLoadingWithMin(btn, false, 600);
      showGlobalLoader(false);
      return;
    }
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
      if (!res.ok) {

        if (data && data.user) {
          sessionStorage.setItem('user', JSON.stringify(data.user));
  window.CURRENT_USER = data.user;
  try { localStorage.setItem('CURRENT_USER', JSON.stringify(data.user)); } catch(e){}
  // update UI elements that show username / role
  document.getElementById('sidebarUser') && (document.getElementById('sidebarUser').innerText = data.user.name || data.user.username);
  document.getElementById('userBadgeText') && (document.getElementById('userBadgeText').innerText = data.user.username || '');
}
        notify(data?.message || data?.error || 'Login failed');
        setButtonLoadingWithMin(btn, false, 600);
        showGlobalLoader(false);
        return;
      }

      const userObj = { username: data.user.username, role: data.user.role, name: data.user.name || data.user.username, id: data.user.id };
      setSession(userObj, remember);
      // keep recent profiles code if you added it
      if (typeof saveRecentProfileLocally === 'function') saveRecentProfileLocally(username);

    // server sets httpOnly cookie; set front session from returned user
    setSession({ username: data.user.username, role: data.user.role, name: data.user.name }, remember);
    saveRecentProfileLocally(username);
    setButtonLoadingWithMin(btn, false, 600);
    showGlobalLoader(false);
    startApp();
    applyTheme(localStorage.getItem(THEME_KEY) || 'light');
    return;
  } catch (innerErr) {
      // if you have local fallback logic (local accounts), run it here instead of returning
      // Example fallback to local accounts (if your app still supports it):
      const acc = loadAccounts();
      try {
        if (!acc[username]) {
          if (confirm('Account not found. Would you like to sign up?')) q('overlayToSignup')?.click();
          setButtonLoadingWithMin(btn, false, 600);
          showGlobalLoader(false);
          return;
        }
        if (acc[username].password !== password) {
          notify('Incorrect password');
          setButtonLoadingWithMin(btn, false, 600);
          showGlobalLoader(false);
          return;
        }
        const userObj = { username, role: acc[username].role, name: acc[username].name || username };
        setSession(userObj, remember);
        if (typeof saveRecentProfileLocally === 'function') saveRecentProfileLocally(username);
        setButtonLoadingWithMin(btn, false, 600);
        showGlobalLoader(false);
        startApp();
        applyTheme(localStorage.getItem(THEME_KEY) || 'light');
        return;
      } catch (fallbackErr) {
        notify('Login error');
        console.error(fallbackErr);
        setButtonLoadingWithMin(btn, false, 600);
        return;
      }
    }
  } catch (err) {
    console.error('signin handler error', err);
    notify('Sign-in error');
    setButtonLoadingWithMin(btn, false, 600);
    showGlobalLoader(false);
  }
});

  on('overlaySignUpBtn','click', async (e) => {
  e.preventDefault();
  const btn = q('overlaySignUpBtn');
  setButtonLoadingWithMin(btn, true, 600);
  showGlobalLoader(true, 'Creating account', 'Setting things up...', 700);

  try {
    const username = q('overlay-su-username')?.value.trim();
    const password = q('overlay-su-password')?.value || '';
    const role = q('overlay-su-role')?.value || 'Baker';

    if (!username || !password) {
      notify('Provide username and password');
      setButtonLoadingWithMin(btn, false, 600);
      showGlobalLoader(false);
      return;
    }
  try {
    const res = await fetch('/api/auth/signup', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials: 'include',
      body: JSON.stringify({ username, password, role, email: document.getElementById('overlay-su-email')?.value || null, name: username })
    });
    const data = await res.json();
      if (!res.ok) {
        notify(data?.message || data?.error || 'Signup failed');
        setButtonLoadingWithMin(btn, false, 600);
        showGlobalLoader(false);
        return;
      }
    // user created and cookie set — store session locally as before
    setSession({ username: data.user.username, role: data.user.role, name: data.user.name }, true);
    notify('Account created. Please sign in.');
      // optional: pre-fill login
      q('overlay-username') && (q('overlay-username').value = username);
      q('overlay-password') && (q('overlay-password').value = '');
      // switch to login panel
      const overlay = q('landingOverlay');
      if (overlay) overlay.classList.remove('signup-mode');
      q('overlaySignup') && q('overlaySignup').classList.add('hidden');
      q('overlayLogin') && q('overlayLogin').classList.remove('hidden');

      setButtonLoadingWithMin(btn, false, 600);
      showGlobalLoader(false);
      return;
  } catch (innerErr) {
      // fallback to local signup behavior (existing demo)
      const acc = loadAccounts();
      if (acc[username]) {
        notify('Username exists. Choose another or sign in.');
        overlay && overlay.classList.remove('signup-mode');
        q('overlaySignup') && q('overlaySignup').classList.add('hidden');
        q('overlayLogin') && q('overlayLogin').classList.remove('hidden');
        setButtonLoadingWithMin(btn, false, 600);
        showGlobalLoader(false);
        return;
      }
      acc[username] = { password, role, name: username };
      saveAccounts(acc);
      notify('Account created. Please sign in.');
      overlay && overlay.classList.remove('signup-mode');
      setButtonLoadingWithMin(btn, false, 600);
      showGlobalLoader(false);
      return;
    }
  } catch (err) {
    console.error('signup handler error', err);
    notify('Sign-up error');
    setButtonLoadingWithMin(btn, false, 600);
    showGlobalLoader(false);
  }
});

  on('modalClose','click', closeModal);
  on('exportBtn','click', ()=>{ const payload={db:DB, accounts:loadAccounts(), meta:{exportedAt:new Date().toISOString()}}; const blob=new Blob([JSON.stringify(payload, null, 2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`bakery-backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });
  on('importBtn','click', ()=>{ const f=q('importInput')?.files?.[0]; if(!f) return notify('Choose a backup file first'); const reader=new FileReader(); reader.onload=(ev)=>{ try{ const data=JSON.parse(ev.target.result); if(!confirm('Import will replace current DB and accounts. Continue?')) return; if(data.db) DB = data.db; if(data.accounts) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data.accounts)); renderIngredientCards(); renderProductGrid(); renderDashboard(); notify('Import successful'); } catch(e){ notify('Invalid backup file'); } }; reader.readAsText(f); });
  const pers=getPersistentSession();
  if(pers && pers.username){ setSession(pers, true); startApp(); applyTheme(localStorage.getItem(THEME_KEY) || 'light'); }

  // Attempt to hydrate session from server cookie before showing overlay
(async function tryServerSession(){
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if(res.ok){
      const data = await res.json();
      setSession({ username: data.user.username, name: data.user.name, role: data.user.role }, true);
      startApp();
      applyTheme(localStorage.getItem(THEME_KEY) || 'light');
      return;
    }
  } catch(e){ /* ignore */ }
  // fallback to current logic (show overlay)
  showOverlay(true, true);
})();

});

async function populateProfile(){
  // fetch server user info if available
  let s = getSession();
  try {
    const res = await fetch('/api/auth/me', { credentials:'include' });
    if(res.ok){
      const data = await res.json();
      if(data && data.user){
        s = data.user;
        setSession(s, !!getPersistentSession()); // update local session to server truth
      }
    }
  } catch(e){
    // ignore (server may not be available)
    console.debug('populateProfile: no server /api/auth/me', e && e.message ? e.message : e);
  }

  if(!s) return;
  if(q('profileName')) q('profileName').value = s.name || '';
  if(q('profileRole')) q('profileRole').value = s.role || '';
  if(q('profileUsername')) q('profileUsername').value = s.username || '';

  // prefs stored in localStorage per-user
  const prefsRaw = localStorage.getItem(prefsKeyFor(s.username)) || '{}';
  let prefs = {};
  try{ prefs = JSON.parse(prefsRaw); }catch(e){ prefs = {}; }

  if(q('profileEmail')) q('profileEmail').value = prefs.email || s.email || '';
  if(q('profilePhone')) q('profilePhone').value = prefs.phone || '';
  if(q('profileTimezone')) q('profileTimezone').value = prefs.timezone || 'Asia/Manila';
  if(q('prefEmailNotif')) q('prefEmailNotif').checked = !!prefs.emailNotifications;
  if(q('prefPushNotif')) q('prefPushNotif').checked = !!prefs.pushNotifications;

  // avatar preview logic (local)
  const avatarData = localStorage.getItem(avatarKeyFor(s.username));
  const avatarWrap = q('profileAvatarPreview');
  if(avatarWrap){
    avatarWrap.innerHTML = '';
    if(avatarData){
      const img = document.createElement('img');
      img.src = avatarData;
      avatarWrap.appendChild(img);
    } else {
      avatarWrap.innerHTML = '<i class="fa fa-user fa-2x"></i>';
    }
  }

  // load recent logins
  renderRecentLogins();

  // enable role editing only for owner
  const current = getSession();
  if(current && current.role === 'Owner'){
    if(q('profileRole')) q('profileRole').removeAttribute('readonly');
  } else {
    if(q('profileRole')) q('profileRole').setAttribute('readonly','true');
  }

  if(q('changePassStatus')) q('changePassStatus').textContent = '';
  if(q('curPassword')) q('curPassword').value = '';
  if(q('newPassword')) q('newPassword').value = '';
  if(q('confirmPassword')) q('confirmPassword').value = '';
}

function renderRecentLogins(){
  // store recent login list in localStorage.recent_logins as [{username, time}]
  const listEl = q('recentLogins');
  if(!listEl) return;
  const raw = localStorage.getItem('recent_logins') || '[]';
  let arr = [];
  try{ arr = JSON.parse(raw) }catch(e){ arr = []; }
  listEl.innerHTML = arr.slice().reverse().slice(0,6).map(r => {
    return `<li style="padding:8px;border-radius:8px;margin-bottom:8px;background:var(--card);display:flex;justify-content:space-between;gap:8px;align-items:center">
      <div><strong>${escapeHtml(r.username)}</strong><div class="muted small">${escapeHtml(r.time)}</div></div>
      <div><button class="btn small" data-username="${escapeHtml(r.username)}">Use</button></div>
    </li>`;
  }).join('') || '<div class="muted small">No recent logins</div>';
  listEl.querySelectorAll('button[data-username]').forEach(b=>{
    b.addEventListener('click', ()=> {
      const u = b.dataset.username;
      // prefill overlay username and focus password
      const ou = q('overlay-username'); const op = q('overlay-password');
      if(ou) { ou.value = u; ou.focus(); }
      if(op) { setTimeout(()=> op.focus(), 120); }
      showView(''); // don't change view, just keep overlay visible if present
    });
  });
}

function bindProfileAvatarUpload(){
  const input = q('profileAvatarInput');
  if(!input) return;
  input.addEventListener('change', (e) => {
    const file = input.files && input.files[0];
    if(!file) return;
    if(file.size > 1_500_000){ notify('Avatar too large (max ~1.5MB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const s = getSession(); if(!s) return;
      const dataURL = ev.target.result;
      const wrap = q('profileAvatarPreview');
      if(wrap){ wrap.innerHTML=''; const img=document.createElement('img'); img.src=dataURL; wrap.appendChild(img); }
      localStorage.setItem(avatarKeyFor(s.username), dataURL);
      notify('Avatar updated');
    };
    reader.readAsDataURL(file);
  });

  const rem = q('removeAvatar');
  if(rem) rem.addEventListener('click', ()=> {
    const s = getSession(); if(!s) return;
    localStorage.removeItem(avatarKeyFor(s.username));
    const wrap = q('profileAvatarPreview');
    if(wrap){ wrap.innerHTML = '<i class="fa fa-user fa-2x"></i>'; }
    notify('Avatar removed');
  });
}

function saveProfile(){
  const s = getSession();
  if(!s){ notify('Not signed in'); return; }

  const name = q('profileName')?.value?.trim() || s.name || '';
  const role = q('profileRole')?.value?.trim() || s.role || '';
  const email = q('profileEmail')?.value?.trim() || '';
  const phone = q('profilePhone')?.value?.trim() || '';
  const timezone = q('profileTimezone')?.value || 'Asia/Manila';
  const emailNotif = !!q('prefEmailNotif')?.checked;
  const pushNotif = !!q('prefPushNotif')?.checked;

  s.name = name;
  const sess = getSession();
  if(sess && sess.role === 'Owner'){ s.role = role; }

  setSession(s, !!getPersistentSession());

  // update local accounts if legacy demo accounts exist
  try {
    const acc = loadAccounts();
    if(acc && acc[s.username]){ acc[s.username].name = name; acc[s.username].role = s.role; saveAccounts(acc); }
  } catch(e){ /* ignore */ }

  const prefs = { email, phone, timezone, emailNotifications: emailNotif, pushNotifications: pushNotif };
  localStorage.setItem(prefsKeyFor(s.username), JSON.stringify(prefs));

  if(q('sidebarUser')) q('sidebarUser').textContent = `${s.name} — ${s.role}`;
  if(q('userBadgeText')) q('userBadgeText').textContent = `${s.name}`;

  // record recent login if username present
  try {
    const arr = JSON.parse(localStorage.getItem('recent_logins') || '[]');
    arr.push({ username: s.username || '', time: new Date().toLocaleString() });
    // keep last 12
    localStorage.setItem('recent_logins', JSON.stringify(arr.slice(-12)));
  } catch(e){}

  notify('Profile saved');
}


function changePassword(){
  const s = getSession();
  if(!s){ notify('Not signed in'); return; }
  const cur = q('curPassword')?.value || '';
  const nw = q('newPassword')?.value || '';
  const cnf = q('confirmPassword')?.value || '';

  if(!cur || !nw || !cnf){ notify('Fill all password fields'); return; }
  if(nw.length < 6){ notify('New password should be at least 6 characters'); return; }
  if(nw !== cnf){ notify('New password and confirmation do not match'); return; }

  const acc = loadAccounts();
  if(!acc[s.username]){ notify('Account not found'); return; }
  if(acc[s.username].password !== cur){ notify('Current password is incorrect'); return; }

  acc[s.username].password = nw;
  saveAccounts(acc);
  q('curPassword').value = ''; q('newPassword').value = ''; q('confirmPassword').value = '';
  if(q('changePassStatus')) q('changePassStatus').textContent = 'Password updated';
  notify('Password changed');
}

function deleteAccountDemo(){
  const s = getSession(); if(!s) return;
  if(!confirm(`Delete account ${s.username}? This will remove local account.`)) return;
  const acc = loadAccounts();
  delete acc[s.username];
  saveAccounts(acc);
  notify('Account deleted');
  performLogout();
}

function bindProfileControls(){
  // avatar upload
  const input = q('profileAvatarInput');
  if(input) input.addEventListener('change', (e) => {
    const file = input.files && input.files[0];
    if(!file) return;
    if(file.size > 1_800_000){ notify('Avatar too large (max ~1.8MB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const s = getSession(); if(!s) return;
      const dataURL = ev.target.result;
      const wrap = q('profileAvatarPreview');
      if(wrap){ wrap.innerHTML=''; const img=document.createElement('img'); img.src=dataURL; wrap.appendChild(img); }
      localStorage.setItem(avatarKeyFor(s.username), dataURL);
      notify('Avatar updated');
    };
    reader.readAsDataURL(file);
  });

  q('removeAvatar')?.addEventListener('click', ()=> {
    const s = getSession(); if(!s) return;
    localStorage.removeItem(avatarKeyFor(s.username));
    const wrap = q('profileAvatarPreview');
    if(wrap){ wrap.innerHTML = '<i class="fa fa-user fa-2x"></i>'; }
    notify('Avatar removed');
  });

  q('profileSaveServer')?.addEventListener('click', async ()=> {
    // try to call server to update user's public profile data if endpoint exists
    const s = getSession();
    if(!s) { notify('Sign in first'); return; }
    const payload = { name: q('profileName')?.value || s.name, phone: q('profilePhone')?.value||'', email: q('profileEmail')?.value||'' };
    try {
      const res = await fetch('/api/users/me', { method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload) });
      if(res.ok){ notify('Profile updated on server'); const data = await res.json(); if(data && data.user){ setSession(data.user, !!getPersistentSession()); populateProfile(); } }
      else { const text = await res.text().catch(()=>null); notify('Server update failed'); console.debug('profileSaveServer failed', res.status, text); }
    } catch(e){ notify('Server update failed'); console.debug('profileSaveServer error', e && e.message ? e.message : e); }
  });

  // save / cancel binding
  const saveBtn = q('saveProfile');
  if(saveBtn){
    saveBtn.onclick = (e)=>{ e.preventDefault(); saveProfile(); populateProfile(); };
  }
  const cancelBtn = q('profileCancel');
  if(cancelBtn) cancelBtn.onclick = (e)=>{ e.preventDefault(); populateProfile(); notify('Changes reverted'); };

  const cpb = q('changePassBtn');
  if(cpb) cpb.onclick = (e)=>{ e.preventDefault(); changePassword(); };

  const outBtn = q('signOutBtn');
  if(outBtn) outBtn.onclick = (e)=>{ e.preventDefault(); performLogout(); };

  const delBtn = q('deleteAccountBtn');
  if(delBtn) delBtn.onclick = (e)=>{ e.preventDefault(); deleteAccountDemo(); };

  // wire preference auto-save
  ['prefEmailNotif','prefPushNotif','profileTimezone','profileEmail','profilePhone'].forEach(id=>{
    const el = q(id);
    if(el) el.addEventListener('change', ()=> {
      const s = getSession(); if(!s) return;
      const p = JSON.parse(localStorage.getItem(prefsKeyFor(s.username)) || '{}');
      p.email = q('profileEmail')?.value || p.email || '';
      p.phone = q('profilePhone')?.value || p.phone || '';
      p.timezone = q('profileTimezone')?.value || p.timezone || 'Asia/Manila';
      p.emailNotifications = !!q('prefEmailNotif')?.checked;
      p.pushNotifications = !!q('prefPushNotif')?.checked;
      localStorage.setItem(prefsKeyFor(s.username), JSON.stringify(p));
    });
  });
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    [chartStock, chartBestSeller, chartSalesTimeline, chartIngredientUsage].forEach(c => {
      try{ c && c.resize(); } catch(e){}
    });
  }, 120);
});

// Adds show/hide toggles to password fields (sign-in, sign-up, change password)
function addPasswordToggles() {
  const ids = ['overlay-password','overlay-su-password','curPassword','newPassword','confirmPassword'];
  ids.forEach(id => {
    const input = document.getElementById(id);
    if(!input) return;
    // avoid duplicating toggle
    const wrapper = input.closest('.field') || input.parentElement;
    if(!wrapper) return;
    if(wrapper.querySelector('.pwd-toggle')) return;

    // ensure wrapper is positioned (CSS already sets .field { position:relative })
    wrapper.style.position = wrapper.style.position || 'relative';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pwd-toggle';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('title', 'Show password');
    btn.innerHTML = '<i class="fa fa-eye"></i>';
    btn.onclick = (e) => {
      e.preventDefault();
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      // update icon + accessible label
      btn.innerHTML = isPassword ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
      // keep focus on input
      try { input.focus(); } catch(e){}
    };

    // place button (after input)
    wrapper.appendChild(btn);

    // if input already set to show (text), set appropriate icon
    if(input.type === 'text') {
      btn.innerHTML = '<i class="fa fa-eye-slash"></i>';
      btn.setAttribute('aria-label', 'Hide password');
      btn.setAttribute('title', 'Hide password');
    }
  });
}

// auto-run after DOM ready. If you already call a startup function, you can call addPasswordToggles() there instead.
document.addEventListener('DOMContentLoaded', () => {
  addPasswordToggles();

  // If your UI dynamically swaps panels (login/signup) you may want to re-run
  // for safety: re-run after a short delay to catch dynamically-inserted fields
  setTimeout(addPasswordToggles, 300);
});

/* Guided Help / Tour JS */

// ----- Define help steps per view (edit messages/selectors as you want) -----
const HELP_STEPS = {
  dashboard: [
    { sel: '#topSearch', title: 'Search suggestions', text: 'Start typing to see suggestions from your recent searches, products, ingredients, and orders. Use arrow keys to navigate.', pos: 'bottom' },
    { sel: '#kpi-total-ing', title: 'Total ingredients', text: 'Total number of items tracked in inventory (ingredients, tools, packaging).', pos: 'right' },
    { sel: '#kpi-low', title: 'Low stock', text: 'Items at or below their threshold. Restock these first.', pos: 'right' },
    { sel: '#stockChart', title: 'Stock Movement', text: 'Shows stock in and stock out events across recent days.', pos: 'left' }
  ],
  inventory: [
    { sel: '#searchIng', title: 'Search', text: 'Type to quickly find an ingredient. Press Enter to apply search.', pos:'bottom' },
    { sel: '#addIngredientBtn', title: 'Add Ingredient', text: 'Add a new raw material, tool, or packaging item here.', pos:'left' },
    { sel: '#ingredientList', title: 'Inventory table', text: 'Edit min, stock in/out inline and click Save to update history.', pos:'top' },
    { sel: '#topSearch', title: 'Search suggestions', text: 'Search suggestions appear as you type; pick one to jump directly to that item.', pos: 'bottom' },
    { sel: '.filter-chips', title: 'Filters', text: 'Switch between All, Low stock, and Expiring to filter the table.', pos: 'bottom' },
    { sel: 'input[name="invType"]', title: 'Inventory Type', text: 'Pick the inventory type (Ingredients, Packaging, Equipment, Maintenance) to narrow the list.', pos: 'bottom' },
    { sel: '#printInventoryBtn', title: 'Print / Save PDF', text: 'Export the current filtered inventory as a printable report (Save as PDF).', pos: 'bottom' },
    { sel: '#inventoryRecentActivity', title: 'Recent activity', text: 'Shows the latest stock changes and edits. Tap an item to view more details.', pos: 'left' }
  ],
  reports: [
    { sel: '#reportPreset', title: 'Date presets', text: 'Quickly select common date ranges for reports.', pos:'bottom' },
    { sel: '#reportFilter', title: 'Report filter', text: 'Choose Usage / Low / Expiring to change the report content.', pos:'bottom' },
    { sel: '#exportReportsBtn', title: 'Export CSV', text: 'Exports the filtered report to CSV.', pos:'left' },
    { sel: '#exportReportsBtn', title: 'Print / Save PDF', text: 'Click to open print preview and save as PDF.', pos:'left' },
    { sel: '#applyReportRange', title: 'Apply', text: 'Apply the selected date range and filters to update charts below.', pos: 'bottom' },
  ],
  activity: [
    { sel: '#activityFilter', title: 'Activity Filter', text: 'Filter activity by type (stock, production, etc.)', pos: 'bottom' },
    { sel: '#activityList', title: 'Activity Log', text: 'All actions are recorded here. This helps with audits and tracing inventory changes.', pos: 'right' }
  ],
  calendar: [
    { sel: '#calendarPrev', title: 'Prev / Next', text: 'Navigate months to see orders/events on different dates.', pos: 'bottom' },
    { sel: '#calendarGrid', title: 'Month view', text: 'Events and orders appear on their respective calendar days.', pos: 'top' }
  ],
  profile: [
    { sel: '#profileName', title: 'Your name', text: 'Edit the display name for your profile.', pos:'right' },
    { sel: '#profileAvatarPreview', title: 'Avatar', text: 'Upload a square avatar (max ~1.5MB) to personalize.', pos:'right' }
  ],
  settings: [
    { sel: '#bakeryName', title: 'Bakery profile', text: 'Update bakery name, address, and default unit used in reports.', pos:'bottom' },
    { sel: '#themeToggle', title: 'Appearance', text: 'Toggle between light and dark themes.', pos:'left' }
  ]
};

HELP_STEPS.inventory = HELP_STEPS.inventory || [];
// avoid duplicate if run twice
if(!HELP_STEPS.inventory.some(s => s.sel === '.inv-pagination')) {
  HELP_STEPS.inventory.push({
    sel: '.inv-pagination',
    title: 'Pagination (Inventory)',
    text: 'Navigate inventory pages using Prev / Next or the page numbers. Each page shows up to 10 rows. Search, filters, and inventory type affect the total pages. Export / Print use the entire filtered list (all pages).',
    pos: 'bottom'
  });
}

// ----- Guided help runtime -----
let _helpState = { overlay:null, spotlight:null, tooltip:null, steps:[], idx:0, view:'' };

function startHelp(viewName){
  // find steps for view
  const steps = Array.isArray(HELP_STEPS[viewName]) ? HELP_STEPS[viewName] : [];
  if(steps.length === 0){
    notify('No help steps defined for this view (ask dev to add steps).');
    return;
  }
  // build overlay
  cleanupHelp();
  _helpState.view = viewName;
  _helpState.steps = steps;
  _helpState.idx = 0;

  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Help overlay');
  overlay.addEventListener('click', (e)=> { e.stopPropagation(); /* prevent outside click from closing */ });

  const blocker = document.createElement('div');
  blocker.className = 'help-blocker';
  overlay.appendChild(blocker);

  const spotlight = document.createElement('div');
  spotlight.className = 'help-spotlight';
  overlay.appendChild(spotlight);

  const tooltip = document.createElement('div');
  tooltip.className = 'help-tooltip';
  tooltip.setAttribute('tabindex','0');

  // build tooltip inner HTML
  tooltip.innerHTML = `
    <div id="helpContent"><h4></h4><p></p></div>
    <div class="help-controls">
      <button id="helpPrev" class="btn ghost small">Prev</button>
      <button id="helpNext" class="btn small">Next</button>
      <button id="helpClose" class="btn primary small">I understand</button>
    </div>
  `;
  overlay.appendChild(tooltip);

  document.body.appendChild(overlay);
  _helpState.overlay = overlay;
  _helpState.spotlight = spotlight;
  _helpState.tooltip = tooltip;

  // event wiring
  document.getElementById('helpPrev').addEventListener('click', ()=> { moveHelp(-1); });
  document.getElementById('helpNext').addEventListener('click', ()=> { moveHelp(1); });
  document.getElementById('helpClose').addEventListener('click', ()=> { cleanupHelp(true); });

  // keyboard: Esc does nothing (require explicit "I understand"), but allow left/right arrows
  overlay.addEventListener('keydown', (e)=> {
    if(e.key === 'ArrowRight') moveHelp(1);
    if(e.key === 'ArrowLeft') moveHelp(-1);
    e.stopPropagation();
  });

  // show first step
  setTimeout(()=> showHelpStep(0), 80);
}

// Replace existing showHelpStep() with this improved async version
function waitForElement(selector, timeout = 1500) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    let observer;
    const timer = setTimeout(() => {
      if (observer) observer.disconnect();
      resolve(null);
    }, timeout);

    observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function showHelpStep(index){
  const steps = _helpState.steps || [];
  if(index < 0) index = 0;
  if(index >= steps.length) index = steps.length - 1;
  _helpState.idx = index;
  const step = steps[index];
  if(!step) return;

  const tip = _helpState.tooltip;
  tip.querySelector('h4').textContent = step.title || '';
  tip.querySelector('p').textContent = step.text || '';

  // Try to find target; wait briefly if it's not present (useful for dynamic content like pagination)
  let el = null;
  try {
    el = document.querySelector(step.sel);
    if(!el) el = await waitForElement(step.sel, 1500);
  } catch(e) {
    el = document.querySelector(step.sel) || null;
  }

  // If element missing after waiting, show centered tooltip and hide spotlight
  if(!el){
    if(_helpState.spotlight) { _helpState.spotlight.style.width = '0px'; _helpState.spotlight.classList.remove('pulse'); }
    tip.classList.remove('top','right','left','bottom');
    tip.style.left = '50%';
    tip.style.top = '10%';
    tip.style.transform = 'translateX(-50%)';
    tip.focus();
    updateHelpControls();
    return;
  }

  // If we have the element: scroll it into view smoothly, then position the spotlight/tooltip
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } catch(e){ /* ignore if browser doesn't support */ }

  // Wait for scroll & layout to settle
  await new Promise(r => setTimeout(r, 260));

  // compute bounding
  const rect = el.getBoundingClientRect();
  const padding = 12;
  const left = Math.max(8, Math.round(rect.left - padding + window.scrollX));
  const top = Math.max(8, Math.round(rect.top - padding + window.scrollY));
  const width = Math.max(36, Math.round(rect.width + padding * 2));
  const height = Math.max(24, Math.round(rect.height + padding * 2));

  // position spotlight
  const sp = _helpState.spotlight;
  sp.style.left = `${left}px`;
  sp.style.top = `${top}px`;
  sp.style.width = `${width}px`;
  sp.style.height = `${height}px`;
  try { sp.style.borderRadius = window.getComputedStyle(el).borderRadius || '10px'; } catch(e){ sp.style.borderRadius = '10px'; }
  sp.classList.add('pulse');

  // position tooltip per preferred pos with clamping
  tip.classList.remove('top','right','left','bottom');
  tip.style.transform = '';
  tip.style.left = ''; tip.style.top = ''; tip.style.right = ''; tip.style.bottom = '';

  const tooltipMaxW = Math.min(420, window.innerWidth - 40);
  const prefer = step.pos || (window.innerWidth <= 420 ? 'bottom' : 'right');
  let tx, ty, cls;
  const estH = Math.min(200, window.innerHeight * 0.4);
  if(prefer === 'bottom'){
    tx = left + (width/2) - (tooltipMaxW/2);
    ty = top + height + 12;
    cls = 'bottom';
  } else if(prefer === 'top'){
    tx = left + (width/2) - (tooltipMaxW/2);
    ty = top - estH - 12;
    cls = 'top';
  } else if(prefer === 'left'){
    tx = left - tooltipMaxW - 12;
    ty = top + (height/2) - (estH/2);
    cls = 'left';
  } else {
    tx = left + width + 12;
    ty = top + (height/2) - (estH/2);
    cls = 'right';
  }

  tx = Math.max(12 + window.scrollX, Math.min(tx, window.scrollX + window.innerWidth - tooltipMaxW - 12));
  ty = Math.max(12 + window.scrollY, Math.min(ty, window.scrollY + window.innerHeight - 80));

  tip.style.left = `${tx}px`;
  tip.style.top = `${ty}px`;
  tip.classList.add(cls);
  tip.focus();

  updateHelpControls();
}


function moveHelp(dir){
  const idx = _helpState.idx + dir;
  if(idx < 0) return;
  if(idx >= (_helpState.steps||[]).length) return;
  showHelpStep(idx);
}

function updateHelpControls(){
  const idx = _helpState.idx || 0;
  const len = (_helpState.steps||[]).length || 0;
  const prevBtn = document.getElementById('helpPrev');
  const nextBtn = document.getElementById('helpNext');
  if(prevBtn) prevBtn.disabled = idx === 0;
  if(nextBtn) nextBtn.disabled = idx === (len - 1);
}

function cleanupHelp(closedByUser){
  if(_helpState.overlay){
    try { _helpState.overlay.remove(); } catch(e) {}
  }
  _helpState = { overlay:null, spotlight:null, tooltip:null, steps:[], idx:0, view:'' };
  // focus back to primary UI
  try { document.querySelector('.view:not(.hidden)')?.focus(); } catch(e){}
}

// attach a help button to the topbar and wire side-nav to start help when view is active
function attachHelpButtons(){
  // add help small button to each page header (optional, will create if missing)
  document.querySelectorAll('.page-header').forEach(ph => {
    // find the page-actions container
    const pa = ph.querySelector('.page-actions');
    if(!pa) return;

    // if a help button already exists in this page-actions, skip
    if(pa.querySelector('.page-help')) return;

    // create the button (styled to match existing .btn classes)
    const hb = document.createElement('button');
    hb.type = 'button';
    hb.className = 'page-help btn ghost small';
    hb.setAttribute('aria-haspopup','dialog');
    hb.setAttribute('title','Guide me');
    hb.style.marginLeft = '6px';
    hb.innerHTML = '<i class="fa fa-question"></i> Help';

    // wire click: determine view id from closest .view
    hb.addEventListener('click', (e) => {
      e.preventDefault();
      const view = ph.closest('.view');
      const id = view?.id?.replace('view-','') || 'dashboard';
      startHelp(id);
    });

    // append to page-actions so it stays next to other action buttons
    pa.appendChild(hb);
  });

  // also ensure we don't accidentally leave the old footer/leftover help buttons
  // If there are any legacy .page-help placed elsewhere, move them into closest .page-actions
  document.querySelectorAll('.page-help').forEach(btn => {
    const closestPa = btn.closest('.page-header')?.querySelector('.page-actions');
    if(closestPa && btn.parentElement !== closestPa){
      try { closestPa.appendChild(btn); } catch(e) {}
    }
  });
}

// Auto attach on DOMContentLoaded (or call attachHelpButtons() from your startApp)
document.addEventListener('DOMContentLoaded', () => {
  // small defer to ensure elements exist after your app boot
  setTimeout(()=> attachHelpButtons(), 420);
});
