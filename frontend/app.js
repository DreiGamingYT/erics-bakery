/* app.js */

const sampleIngredients = [
  // 1. Ingredients (Raw Materials)
  { id:1, name:'Flour (hard & soft)', unit:'kg', qty:250, min:62.5, max:300, expiry:null, supplier:'Local Mill', icon:'fa-wheat', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:1 }},
  { id:2, name:'Sugar (white & brown)', unit:'kg', qty:80, min:16, max:120, expiry:null, supplier:'SweetCo', icon:'fa-cubes-stacked', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:3, name:'Yeast', unit:'kg', qty:5, min:1, max:10, expiry:null, supplier:'YeastCo', icon:'fa-seedling', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:90 }},
  { id:4, name:'Baking powder', unit:'kg', qty:6, min:1, max:12, expiry:null, supplier:'BakerSupplies', icon:'fa-flask', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:5, name:'Salt', unit:'kg', qty:12, min:2, max:24, expiry:null, supplier:'SaltFarm', icon:'fa-salt-shaker', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:6, name:'Eggs', unit:'pcs', qty:300, min:100, max:600, expiry:null, supplier:'Manila Farms', icon:'fa-egg', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:7 }},
  { id:7, name:'Milk / cream', unit:'L', qty:50, min:10, max:100, expiry:null, supplier:'DairyPhil', icon:'fa-bottle-droplet', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:3 }},
  { id:8, name:'Butter / Margarine / Oil / Shortening', unit:'kg', qty:40, min:8, max:80, expiry:null, supplier:'DairyPhil', icon:'fa-bottle-droplet', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:90 }},
  { id:9, name:'Chocolate / Cocoa powder', unit:'kg', qty:20, min:5, max:40, expiry:null, supplier:'ChocoCo', icon:'fa-chocolate-bar', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:10, name:'Flavorings (vanilla)', unit:'L', qty:4, min:1, max:8, expiry:null, supplier:'FlavorX', icon:'fa-wine-bottle', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:11, name:'Fillings & toppings (sesame seeds)', unit:'kg', qty:6, min:1, max:12, expiry:null, supplier:'SeedsCo', icon:'fa-seedling', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:12, name:'Food coloring', unit:'mL', qty:500, min:100, max:2000, expiry:null, supplier:'ColorLab', icon:'fa-palette', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},
  { id:13, name:'Bread improver (dobrim)', unit:'kg', qty:8, min:2, max:16, expiry:null, supplier:'BakerSupplies', icon:'fa-boxes-stacked', type:'ingredient', attrs:{ antiAmag:false, shelfLifeDays:365 }},

  // 2. Packaging Materials
  { id:20, name:'Paper bags', unit:'pcs', qty:1000, min:200, max:2000, expiry:null, supplier:'PackCo', icon:'fa-box', type:'packaging', attrs:{} },
  { id:21, name:'Plastics', unit:'pcs', qty:500, min:100, max:1000, expiry:null, supplier:'PackCo', icon:'fa-box', type:'packaging', attrs:{} },
  { id:22, name:'Wrapping paper', unit:'roll', qty:30, min:6, max:60, expiry:null, supplier:'PackCo', icon:'fa-box', type:'packaging', attrs:{} },

  // 3. Baking Tools & Equipment
  { id:30, name:'Oven', unit:'unit', qty:2, min:1, max:4, expiry:null, supplier:'KitchenCo', icon:'fa-fire', type:'equipment', attrs:{ serial:null, warrantyYears:2 } },
  { id:31, name:'Mixer', unit:'unit', qty:1, min:1, max:2, expiry:null, supplier:'KitchenCo', icon:'fa-cogs', type:'equipment', attrs:{ serial:null, warrantyYears:2 } },
  { id:32, name:'Baking trays & pans / molder', unit:'pcs', qty:40, min:10, max:100, expiry:null, supplier:'BakeTools', icon:'fa-pan-food', type:'equipment', attrs:{} },
  { id:33, name:'Measuring cups / spoons / scales', unit:'pcs', qty:12, min:3, max:30, expiry:null, supplier:'BakeTools', icon:'fa-weight-scale', type:'equipment', attrs:{} },
  { id:34, name:'Dough roller / Rolling pins', unit:'pcs', qty:8, min:2, max:20, expiry:null, supplier:'BakeTools', icon:'fa-broom', type:'equipment', attrs:{} },
  { id:35, name:'Egg beater', unit:'pcs', qty:4, min:1, max:10, expiry:null, supplier:'BakeTools', icon:'fa-whisk', type:'equipment', attrs:{} },
  { id:36, name:'Knives & spatulas', unit:'pcs', qty:30, min:6, max:60, expiry:null, supplier:'BakeTools', icon:'fa-utensils', type:'equipment', attrs:{} },

  // 4. Maintenance Supplies
  { id:40, name:'Hairnet', unit:'pcs', qty:200, min:50, max:500, expiry:null, supplier:'HygieneCo', icon:'fa-user-gear', type:'maintenance', attrs:{} },
  { id:41, name:'Gloves', unit:'box', qty:40, min:10, max:120, expiry:null, supplier:'HygieneCo', icon:'fa-hand-holding', type:'maintenance', attrs:{} },
  { id:42, name:'Aprons', unit:'pcs', qty:10, min:3, max:30, expiry:null, supplier:'HygieneCo', icon:'fa-user-tie', type:'maintenance', attrs:{} },
  { id:43, name:'Trash bags', unit:'roll', qty:50, min:12, max:150, expiry:null, supplier:'CleanCo', icon:'fa-trash', type:'maintenance', attrs:{} },
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

// --- ROLE / PERMISSIONS HELPERS (paste after isLoggedIn) ---
const PERMISSIONS = {
  Owner: { dashboard: true, calendar: true, profile: true, activity: true, inventory: true, reports: true, settings: true, bake: true, addProduct: true },
  Baker: { dashboard: true, calendar: true, profile: false, activity: true, inventory: true, reports: true, settings: false, bake: true, addProduct: false },
  Cashier: { dashboard: true, calendar: false, profile: false, activity: true, inventory: false, reports: false, settings: false, bake: false, addProduct: false },
  Assistant: { dashboard: true, calendar: true, profile: false, activity: true, inventory: true, reports: false, settings: false, bake: false, addProduct: false },
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
  // hide side nav items and top buttons according to permissions
  const map = { products: 'products', orders: 'orders' };
  // hide nav items if no permission
  document.querySelectorAll('#sideNav .nav-item').forEach(btn=>{
    const view = btn.dataset.view;
    if(view && !hasPermission(view)){
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
  });

  // Hide product/order views (if still present)
  if(!hasPermission('products')) {
    const el = q('view-products'); if(el) el.classList.add('hidden');
    const prodBtn = q('addProductBtn'); if(prodBtn) prodBtn.style.display = 'none';
  } else { if(q('addProductBtn')) q('addProductBtn').style.display = ''; }

  if(!hasPermission('orders')) {
    const el = q('view-orders'); if(el) el.classList.add('hidden');
    const orderBtn = q('createOrderBtn'); if(orderBtn) orderBtn.style.display = 'none';
  } else { if(q('createOrderBtn')) q('createOrderBtn').style.display = ''; }

  // disable quick bake if no bake permission
  const quickBakeBtn = q('quickBake');
  if(quickBakeBtn) quickBakeBtn.style.display = hasPermission('bake') ? '' : 'none';

  // add/disable product-related actions
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

// ======= Auto-consumption / threshold calculation helpers =======
// Programmed daily consumption (units per day) for items we want auto-calculated.
// You specified: 2.5 sacks/day * 25kg per sack for flour => 62.5 kg/day.
const PROGRAMMED_CONSUMPTION = {
  // flour: 2.5 sacks/day × 25kg = 62.5 kg/day
  'flour (hard & soft)': { dailyAmount: 62.5, unit: 'kg' },

  // reasonable defaults (tweak if you want):
  'sugar (white & brown)': { dailyAmount: 8, unit: 'kg' },        // ~8 kg/day
  'butter / margarine / oil / shortening': { dailyAmount: 10, unit: 'kg' }, // ~10 kg/day
  'eggs': { dailyAmount: 200, unit: 'pcs' },                      // ~200 pcs/day
  // add more entries as needed; keys are lowercase name strings matching ingredient.name
};

// compute threshold (min) for an ingredient object
function computeThresholdForIngredient(ing, options = {}) {
  const leadDays = Number(options.leadDays ?? 2); // default lead time
  const fallbackDays = Number(options.fallbackDays ?? 3);

  if (!ing || !ing.name) return 0;
  const key = (ing.name || '').toLowerCase().trim();

  const prog = PROGRAMMED_CONSUMPTION[key] || PROGRAMMED_CONSUMPTION[ing.id];
  if (prog && prog.unit && String(prog.unit).toLowerCase() === String(ing.unit || '').toLowerCase()) {
    const daily = Number(prog.dailyAmount || 0);
    const thr = +(daily * leadDays).toFixed(3);
    return Math.max(thr, 0.001);
  }

  // equipment / maintenance / packaging: do not auto-calc (return existing min)
  if (ing.type && (ing.type === 'equipment' || ing.type === 'maintenance' || ing.type === 'packaging')) {
    return ing.min || 0;
  }

  // Fallback: estimate daily usage from recent DB.activity entries (last 7 days)
  const now = new Date();
  const cutoff = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const history = (DB.activity || []).filter(a => a.ingredient_id === ing.id && new Date(a.time) >= cutoff);
  let estimatedDaily = 0;
  if (history.length) {
    const totalFromHistory = history.reduce((sum, rec) => {
      // try to parse first number quantity in text
      const m = String(rec.text || '').match(/([0-9]*\.?[0-9]+)/);
      if (!m) return sum;
      const v = Number(m[0]) || 0;
      // if the record looks like a stock in (increase), we don't count it as usage
      const textLower = String(rec.text || '').toLowerCase();
      if (textLower.includes('stock in')) return sum; 
      // treat 'used' and 'stock out' as consumption
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

  // final fallback: 20% of current qty (at least 1 unit for kg)
  const fallback = ing.qty ? Math.max( +(ing.qty * 0.2).toFixed(3), (ing.unit === 'kg' ? 1 : 1) ) : 1;
  return fallback;
}

// --- Aggregate ingredient usage from DB.activity (preferred over orders) ---
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
    // consider records that indicate consumption
    if(!(text.includes('used') || text.includes('stock out') || text.includes('used for'))) return;
    // parse numeric quantity (first number)
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

const views = ['dashboard','inventory','products','activity','profile','settings','orders','reports','calendar'];
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

function renderDashboard(){
  if(q('kpi-total-ing')) q('kpi-total-ing').textContent = DB.ingredients.length;
  if(q('kpi-products')) q('kpi-products').textContent = DB.products.length;
  if(q('kpi-low')) q('kpi-low').textContent = DB.ingredients.filter(i=>i.qty<=i.min).length;
  if(q('kpi-exp')) q('kpi-exp').textContent = DB.ingredients.filter(i=>{ const d=daysUntil(i.expiry); return d>=0 && d<=7; }).length;
  renderActivity();
}
function renderActivity(){ const list=q('recentActivity'), act=q('activityList'); const items = DB.activity.slice().reverse(); if(list) list.innerHTML = items.slice(0,6).map(a=>`<li><div>${a.text}</div><div class="muted small">${a.time}</div></li>`).join('')||'<li class="muted">No recent activity</li>'; if(act) act.innerHTML = items.map(a=>`<li><div>${a.text}</div><div class="muted small">${a.time}</div></li>`).join('')||'<li class="muted">No activity</li>'; }

// --- TABLE-BASED INVENTORY RENDERER ---
function renderIngredientCards(){
  const qv = (q('searchIng')?.value||'').trim().toLowerCase();
  const filter = document.querySelector('.chip.active')?.dataset.filter || 'all';
  const container = q('ingredientList');
  if(!container) return;

  const allItems = (DB.ingredients || []).map(i => ({...i, type: i.type || 'ingredient'}));
  const items = allItems.filter(i=>{
    if(qv && !i.name.toLowerCase().includes(qv)) return false;
    if(filter === 'low' && !(i.qty <= i.min && i.type === 'ingredient')) return false;
    if(filter === 'expiring' && i.type === 'ingredient') { const d = daysUntil(i.expiry); if(!(d>=0 && d<=7)) return false; }
    return true;
  });

  // header with type radios and export/print controls
  const header = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap">
      <div style="display:flex;gap:8px;align-items:center">
        <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="all" checked /> All</label>
        <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="ingredient" /> Ingredients</label>
        <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="packaging" /> Packaging</label>
        <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="equipment" /> Equipment</label>
        <label style="display:flex;align-items:center;gap:8px"><input type="radio" name="invType" value="maintenance" /> Maintenance</label>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn small" id="exportInventoryCsvBtn" type="button">Export CSV</button>
        <button class="btn small" id="printInventoryBtn" type="button">Print / Save PDF</button>
      </div>
    </div>
  `;

  const tableHead = `
  <table class="inv-table" style="width:100%;border-collapse:collapse" role="table" aria-label="Inventory table">
    <thead>
      <tr role="row" style="text-align:left">
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">ID</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Name</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Supplier</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Qty</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Unit</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Threshold</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Min</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">In</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Out</th>
        <th scope="col" role="columnheader" style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Actions</th>
      </tr>
    </thead><tbody>
  `;

  const rows = items.map(i=>{
    const threshold = computeThresholdForIngredient(i);
    const lowBadge = (i.type === 'ingredient' && (i.qty <= (i.min || threshold))) ? '<span class="badge low" aria-hidden="true">Low</span>' : '';
    const expiryNote = (i.expiry ? `<div class="muted small" aria-hidden="true">${daysUntil(i.expiry)}d</div>` : '');
    return `<tr data-id="${i.id}" data-type="${i.type}" role="row" style="background:var(--card);border-bottom:1px solid rgba(0,0,0,0.04)">
      <td role="cell" style="padding:10px;vertical-align:middle">${i.id}</td>
      <td role="cell" style="padding:10px;vertical-align:middle"><strong>${escapeHtml(i.name)}</strong><div class="muted small">${i.type}</div></td>
      <td role="cell" style="padding:10px;vertical-align:middle">${escapeHtml(i.supplier||'')}</td>
      <td role="cell" style="padding:10px;vertical-align:middle"><span class="qty-value" aria-label="Quantity ${i.qty}">${i.qty}</span> ${expiryNote} ${lowBadge}</td>
      <td role="cell" style="padding:10px;vertical-align:middle">${escapeHtml(i.unit||'')}</td>
      <td role="cell" style="padding:10px;vertical-align:middle">${threshold}</td>
      <td role="cell" style="padding:10px;vertical-align:middle"><input class="min-input" type="number" value="${i.min||0}" step="0.01" style="width:80px" aria-label="Minimum for ${escapeHtml(i.name)}" /></td>
      <td role="cell" style="padding:10px;vertical-align:middle"><input class="in-input" type="number" step="0.01" style="width:90px" aria-label="Stock in for ${escapeHtml(i.name)}" /></td>
      <td role="cell" style="padding:10px;vertical-align:middle"><input class="out-input" type="number" step="0.01" style="width:90px" aria-label="Stock out for ${escapeHtml(i.name)}" /></td>
      <td role="cell" style="padding:10px;vertical-align:middle">
        <button class="btn small save-row" type="button" aria-label="Save changes for ${escapeHtml(i.name)}">Save</button>
        <button class="btn small soft details-btn" data-id="${i.id}" type="button" aria-controls="modal" aria-label="Show details for ${escapeHtml(i.name)}">Details</button>
        <button class="btn small soft edit-btn" type="button" aria-label="Edit ${escapeHtml(i.name)}">Edit</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="10" class="muted" style="padding:12px">No inventory items</td></tr>`;

  const tableFooter = `</tbody></table>`;

  // Render HTML
  container.innerHTML = header + tableHead + rows + tableFooter;

  // RADIO FILTER wiring (delegated via change on the wrapper)
  const radios = Array.from(container.querySelectorAll('input[name="invType"]'));
  radios.forEach(r => { r.onchange = (e) => {
    const v = e.target.value;
    const allRows = container.querySelectorAll('tbody tr');
    allRows.forEach(row => {
      const t = row.dataset.type || 'ingredient';
      row.style.display = (v === 'all' || v === t) ? '' : 'none';
    });
  }; });

  // Save / In/Out wiring
  container.querySelectorAll('button.save-row').forEach(btn=>{
    btn.onclick = (ev)=> {
      const tr = ev.currentTarget.closest('tr');
      if(!tr) return;
      const id = Number(tr.dataset.id);
      const ing = DB.ingredients.find(x=>x.id===id);
      if(!ing) return;
      const inVal = Number(tr.querySelector('.in-input')?.value || 0);
      const outVal = Number(tr.querySelector('.out-input')?.value || 0);
      const newMin = Number(tr.querySelector('.min-input')?.value || ing.min || 0);

      if(inVal > 0){
        ing.qty = +((ing.qty||0) + inVal).toFixed(3);
        DB.activity.push({ text:`Stock in ${inVal} ${ing.unit} — ${ing.name}`, time:new Date().toLocaleString(), ingredient_id:id });
      }
      if(outVal > 0){
        if(outVal > (ing.qty||0)) { notify('Not enough stock'); return; }
        ing.qty = +((ing.qty||0) - outVal).toFixed(3);
        DB.activity.push({ text:`Stock out ${outVal} ${ing.unit} — ${ing.name}`, time:new Date().toLocaleString(), ingredient_id:id });
      }
      ing.min = newMin;
      notify('Inventory updated (demo)');
      // re-render to reflect updated state and keep listeners fresh
      renderIngredientCards();
    };
  });

  // Details modal wiring
  container.querySelectorAll('.details-btn').forEach(btn=>{
    btn.onclick = ()=> {
      const id = Number(btn.dataset.id);
      const ing = DB.ingredients.find(i=>i.id===id);
      if(!ing) return;
      const history = (DB.activity || []).filter(a=> a.ingredient_id === id).slice().reverse();
      const histHtml = history.length ? history.map(h=> `<li>${escapeHtml(h.text)} <div class="muted small">${escapeHtml(h.time)}</div></li>`).join('') : '<li class="muted">No history</li>';
      const attrs = ing.attrs ? Object.keys(ing.attrs).map(k=> `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(ing.attrs[k]||''))}</div>`).join('') : '';
      const modalId = `ingredient-details-${ing.id}`;

      // accessible modal content (aria-labelledby)
      const modalHtml = `<h3 id="modalTitle-${ing.id}">${escapeHtml(ing.name)}</h3>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div><strong>${ing.qty} ${ing.unit}</strong><div class="muted small">Current qty</div></div>
          <div><strong>${ing.min || computeThresholdForIngredient(ing)}</strong><div class="muted small">Threshold / Min</div></div>
          <div><strong>${ing.max || '—'}</strong><div class="muted small">Max</div></div>
        </div>
        <div><h4>Attributes</h4>${attrs || '<div class="muted small">No attributes</div>'}</div>
        <div style="margin-top:12px"><h4>Stock History</h4><ul class="timeline">${histHtml}</ul></div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="closeDetails" type="button">Close</button></div>
      `;

      openModalHTML(modalHtml);

      // make the modal accessible
      const mc = document.querySelector('.modal-card');
      if(mc){
        mc.setAttribute('role','document');
        mc.setAttribute('aria-labelledby', `modalTitle-${ing.id}`);
      }
      // focus the close button so keyboard users can quickly dismiss
      setTimeout(()=> q('closeDetails')?.focus(), 80);
      q('closeDetails')?.addEventListener('click', closeModal, { once: true });
    };
  });

  // Edit button wiring
  container.querySelectorAll('.edit-btn').forEach(btn=>{
    btn.onclick = (e)=> {
      const tr = e.currentTarget.closest('tr'); if(!tr) return;
      const id = Number(tr.dataset.id);
      openEditIngredient(id);
    };
  });

  // Export / Print buttons — use assignment so repeated renders don't create stacked handlers
  const expBtn = q('exportInventoryCsvBtn');
  if(expBtn) expBtn.onclick = () => exportInventoryCSV();

  const printBtn = q('printInventoryBtn');
  if(printBtn) printBtn.onclick = () => printInventoryTable();

  // Keyboard accessibility: activate focused buttons on Space (and allow Enter naturally)
  // Use delegated handler attached to container (the container is replaced on re-render so no leaks)
  container.onkeydown = (e) => {
    const target = document.activeElement;
    if(!target) return;
    // If focus is on an input inside a row and user presses Enter, trigger save for that row
    if(e.key === 'Enter' && target.matches('.in-input, .out-input, .min-input')){
      e.preventDefault();
      const row = target.closest('tr');
      row?.querySelector('.save-row')?.click();
      return;
    }
    // Space or Enter on our buttons should activate them (native buttons already do this, but safe fallback)
    if((e.key === ' ' || e.key === 'Spacebar') && (target.matches('.save-row') || target.matches('.details-btn') || target.matches('.edit-btn'))){
      e.preventDefault();
      target.click();
      return;
    }
  };

  // small accessibility enhancement: announce number of visible items via aria-live region (create or update)
  let live = document.getElementById('inventory-live-count');
  if(!live){
    live = document.createElement('div');
    live.id = 'inventory-live-count';
    live.setAttribute('aria-live','polite');
    live.setAttribute('aria-atomic','true');
    live.style.position = 'absolute';
    live.style.left = '-9999px';
    live.style.width = '1px';
    live.style.height = '1px';
    live.style.overflow = 'hidden';
    document.body.appendChild(live);
  }
  const visibleCount = container.querySelectorAll('tbody tr:not([style*="display: none"])').length;
  live.textContent = `${visibleCount} inventory items shown`;
}


function renderOrders(){
  const container = q('ordersList');
  if(!container) return;
  const items = sampleOrders.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  container.innerHTML = items.map(o=>{
    const date = new Date(o.date).toLocaleString();
    const itemsText = o.items.map(it=> {
      const p = DB.products.find(pp=>pp.id===it.product_id);
      return `${p? p.name : 'Unknown'} x${it.qty}`;
    }).join(', ');
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.04);margin-bottom:8px;background:var(--card)"><div><strong>Order #${o.id}</strong><div class="muted small">${o.customer} • ${date}</div><div style="margin-top:6px" class="small">${itemsText}</div></div><div style="text-align:right"><div><strong>₱${o.total.toFixed(2)}</strong></div><div style="margin-top:8px"><button class="btn small" data-id="${o.id}" type="button">View</button></div></div></div>`;
  }).join('') || '<div class="muted small">No orders</div>';

  container.querySelectorAll('button[data-id]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const id = Number(btn.dataset.id);
      const order = sampleOrders.find(s=>s.id===id);
      if(!order) return notify('Order not found');
      openOrderDetailModal(order);
    });
  });
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
    notify('Order fulfilled (demo)');
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
    notify('Order created (demo)');
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

function renderStockChart(rangeStart, rangeEnd){
  const ctx = q('stockChart')?.getContext('2d');
  if(!ctx) return;
  let end = rangeEnd? new Date(rangeEnd) : new Date();
  end.setHours(0,0,0,0);
  let start = rangeStart? new Date(rangeStart) : new Date(end); start.setDate(end.getDate()-6);
  const agg = aggregateSalesRange(start.toISOString(), end.toISOString());
  if(chartStock) chartStock.destroy();
  chartStock = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: agg.labels,
      datasets: [{
        label: 'Items sold',
        data: agg.data,
        borderWidth: 0,
        backgroundColor: 'rgba(27,133,236,0.85)'
      }]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      scales: { y: { beginAtZero:true } },
      plugins:{ legend:{ display:false } }
    }
  });
}

function renderBestSellerChart(){
  const ctx = q('bestSellerChart')?.getContext('2d');
  if(!ctx) return;
  const map = {};
  DB.products.forEach(p=> map[p.id] = 0);
  sampleOrders.forEach(o=> {
    o.items.forEach(it => {
      if(map[it.product_id] !== undefined) map[it.product_id] += it.qty;
      else map[it.product_id] = it.qty;
    });
  });
  const labels = [];
  const data = [];
  Object.keys(map).forEach(pid=>{
    const p = DB.products.find(pp=>pp.id===Number(pid));
    if(p){
      labels.push(p.name);
      data.push(map[pid]);
    }
  });
  if(chartBestSeller) chartBestSeller.destroy();
  chartBestSeller = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets:[{ data, backgroundColor: generateColors(data.length) }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
  });
}

// ---------- REPLACE renderReports with this inventory-driven version ----------
function renderReports(rangeStart, rangeEnd, reportFilter) {
  // determine range
  const startInput = rangeStart || q('reportStart')?.value || null;
  const endInput = rangeEnd || q('reportEnd')?.value || null;
  const end = endInput ? new Date(endInput) : new Date();
  const start = startInput ? new Date(startInput) : new Date(end);
  if (!startInput) start.setDate(end.getDate() - 29);
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);

  const filter = reportFilter || q('reportFilter')?.value || 'usage';

  // remove sales timeline card entirely from DOM (user wanted it removed)
  try {
    const salesCard = q('salesTimelineChart') ? q('salesTimelineChart').closest('.card') : null;
    if (salesCard && salesCard.parentElement) salesCard.remove();
    // destroy any leftover chart instance
    try { chartSalesTimeline && chartSalesTimeline.destroy(); } catch(e){}
    chartSalesTimeline = null;
  } catch(e){/* ignore */ }

  // prepare ingredient usage data from activity (prefers aggregateUsageFromActivity if present)
  let agg;
  if (typeof aggregateUsageFromActivity === 'function') {
    agg = aggregateUsageFromActivity(start.toISOString(), end.toISOString(), 50);
  } else {
    // fallback: compute from DB.activity
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

  // ensure ingredientUsage chart area exists
  const ingCtx = q('ingredientUsageChart')?.getContext('2d');
  if(ingCtx){
    try { if(chartIngredientUsage) chartIngredientUsage.destroy(); } catch(e){}
    chartIngredientUsage = new Chart(ingCtx, {
      type: 'bar',
      data: { labels: agg.labels, datasets:[{ label:'Units used', data: agg.data, backgroundColor: generateColors(agg.data.length) }]},
      options: { indexAxis:'y', responsive:true, maintainAspectRatio:false, scales:{ x:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } }
    });
  }

  // build summary and table HTML inside #reportSummary
  const summaryEl = q('reportSummary');
  if(summaryEl){
    // summary text
    const totalUsed = (agg.raw || []).reduce((s,r)=> s + (r.qty||0), 0);
    const lowCount = (DB.ingredients || []).filter(i => i.type === 'ingredient' && (i.qty <= (i.min || computeThresholdForIngredient(i)))).length;
    const expiringCount = (DB.ingredients || []).filter(i => i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= 30).length;
    const best = (agg.raw && agg.raw.length) ? (DB.ingredients.find(i=>i.id===agg.raw[0].id)?.name || `#${agg.raw[0].id}`) : '—';

    // controls + table
    let tableRows = (DB.ingredients || []).map(i => {
      // if filter applied, skip
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

    // wire print/export buttons (idempotent)
    const prBtn = q('printReportsBtn');
    if(prBtn) prBtn.onclick = () => printReports(start.toISOString(), end.toISOString(), filter);
    const exBtn = q('exportReportsCsvBtn');
    if(exBtn) exBtn.onclick = () => exportReportsCSVReport(start.toISOString(), end.toISOString(), filter);
  }

  // ensure chart redraw/responsive
  try { chartIngredientUsage && chartIngredientUsage.resize && chartIngredientUsage.resize(); } catch(e){}
}

// Print reports using injected print-only container (no new window). Includes rows for Usage even if used=0.
function printReports(rangeStartISO, rangeEndISO, filter){
  try {
    const start = new Date(rangeStartISO); start.setHours(0,0,0,0);
    const end = new Date(rangeEndISO); end.setHours(23,59,59,999);
    const bakeryName = (q('bakeryName')?.value) || document.querySelector('.brand-name')?.innerText || "Eric's Bakery";

    // build usage map
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

    // build rows: for 'usage' include all items; for low/expiring include only matching
    const rowsHtml = (DB.ingredients || []).map(i => {
      if(filter === 'low' && !(i.type === 'ingredient' && i.qty <= (i.min || computeThresholdForIngredient(i)))) return '';
      if(filter === 'expiring' && !(i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= REPORT_EXPIRY_DAYS)) return '';
      const used = usageMap[i.id] || 0;
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd">${i.id}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.name)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${used}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${i.qty}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.unit||'')}</td>
        <td style="padding:8px;border:1px solid #ddd">${i.min || computeThresholdForIngredient(i)}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.type||'')}</td>
        <td style="padding:8px;border:1px solid #ddd">${i.expiry||''}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="8" style="padding:12px">No items match the selected filter/range</td></tr>`;

    const html = `
      <div style="padding:16px;font-family:Poppins,Inter,Arial,sans-serif;color:var(--text,#12202f)">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          ${document.querySelector('.sidebar-logo-img') ? `<img src="${document.querySelector('.sidebar-logo-img').src}" style="width:64px;height:64px;object-fit:cover;border-radius:8px" />` : ''}
          <div>
            <div style="font-weight:800;font-size:18px">${escapeHtml(bakeryName)}</div>
            <div style="color:rgba(0,0,0,0.54);font-size:12px">Report: ${filter} • ${start.toISOString().slice(0,10)} — ${end.toISOString().slice(0,10)}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="padding:8px;border:1px solid #ddd">ID</th>
            <th style="padding:8px;border:1px solid #ddd">Name</th>
            <th style="padding:8px;border:1px solid #ddd">Used</th>
            <th style="padding:8px;border:1px solid #ddd">Current Qty</th>
            <th style="padding:8px;border:1px solid #ddd">Unit</th>
            <th style="padding:8px;border:1px solid #ddd">Min</th>
            <th style="padding:8px;border:1px solid #ddd">Type</th>
            <th style="padding:8px;border:1px solid #ddd">Expiry</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    // insert print-only root and style
    const style = document.createElement('style');
    style.id = 'bakery-print-style';
    style.textContent = `
      .bakery-print-root { display:none; }
      @media print {
        body * { visibility: hidden !important; }
        .bakery-print-root, .bakery-print-root * { visibility: visible !important; }
        .bakery-print-root { position: fixed !important; left:0; top:0; width:100% !important; padding:8px; box-sizing:border-box; }
      }
    `;
    // remove any previous print style to avoid duplicates
    const prev = document.getElementById('bakery-print-style');
    if(prev) prev.remove();
    document.head.appendChild(style);

    // remove any previous print root
    const prevRoot = document.getElementById('bakery-print-root');
    if(prevRoot) prevRoot.remove();

    const container = document.createElement('div');
    container.className = 'bakery-print-root';
    container.id = 'bakery-print-root';
    container.innerHTML = html;
    document.body.appendChild(container);

    try { window.focus(); } catch(e){}
    window.print();

    // cleanup after a short delay
    setTimeout(()=> {
      try { document.getElementById('bakery-print-root')?.remove(); document.getElementById('bakery-print-style')?.remove(); } catch(e){}
    }, 800);

  } catch(err) {
    console.error('printReports error', err);
    notify('Unable to prepare print preview');
  }
}

// export CSV for reports (inventory-driven, includes rows for Usage even if used=0)
function exportReportsCSVReport(rangeStartISO, rangeEndISO, filter) {
  const start = new Date(rangeStartISO); start.setHours(0,0,0,0);
  const end = new Date(rangeEndISO); end.setHours(23,59,59,999);

  // build usage map (from DB.activity)
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
    // apply filter: usage -> include all (show used even if 0), low -> only low, expiring -> only expiring
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

// --- Inventory export & print helpers ---
function exportInventoryCSV(){
  const rows = [['id','name','type','supplier','qty','unit','min','expiry']];
  (DB.ingredients || []).forEach(i=>{
    rows.push([i.id, i.name, i.type || 'ingredient', i.supplier || '', i.qty, i.unit || '', i.min || 0, i.expiry || '']);
  });
  const csv = rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Replace or add this function in app.js
function printInventoryTable(){
  const logoSrc = document.querySelector('.sidebar-logo-img')?.src || '';
  const bakeryName = (q('bakeryName')?.value) || document.querySelector('.brand-name')?.innerText || "Eric's Bakery";
  const rows = (DB.ingredients || []).map(i=> {
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
  }).join('');

  const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Inventory — ${new Date().toLocaleDateString()}</title>
      <style>
        :root{font-family: Poppins, Inter, Arial, sans-serif; color:#12202f}
        body{margin:16px; font-size:13px; color:#12202f}
        .header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .logo{width:64px;height:64px;object-fit:cover;border-radius:8px}
        h1{margin:0;font-size:18px}
        .muted{color:#6b7a86;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
        th{background:#f6f7fb;font-weight:800}
        @media print {
          body{margin:8mm}
          th,td{font-size:11px}
          .no-print{display:none}
        }
        @media (max-width:600px){
          table, thead, tbody, th, td, tr { display:block; }
          thead { display:none; }
          tr { margin-bottom:12px; border:1px solid #eee; border-radius:8px; padding:8px; }
          td { border:none; display:flex; justify-content:space-between; padding:6px 8px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="logo" />` : ''}
        <div>
          <h1>${escapeHtml(bakeryName)}</h1>
          <div class="muted">Exported: ${new Date().toLocaleString()}</div>
        </div>
      </div>

      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Supplier</th><th style="text-align:right">Qty</th><th>Unit</th><th style="text-align:right">Min</th><th>Expiry</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:18px" class="no-print">
        <button onclick="window.print()" style="padding:10px 14px;border-radius:8px;cursor:pointer">Print</button>
      </div>
    </body>
    </html>
  `;

  // Fallback: use hidden iframe in current window (works when popups are blocked)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('aria-hidden','true');
  document.body.appendChild(iframe);

  const idoc = iframe.contentWindow.document;
  idoc.open();
  idoc.write(html);
  idoc.close();

  // Give the iframe a moment to render, then call print on its window
  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch(e){
      console.debug('iframe print error', e);
      // as a last resort call parent's print (will print current page)
      try { window.print(); } catch(e2){ console.debug('fallback print error', e2); }
    } finally {
      setTimeout(()=> { iframe.remove(); }, 600);
    }
  };

  // Some browsers don't reliably fire iframe.onload for document.write; set a timeout fallback
  setTimeout(()=> {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch(e){
      try { window.print(); } catch(_) {}
    } finally {
      setTimeout(()=> { iframe.remove(); }, 600);
    }
  }, 900);
}

function exportReportsCSV(rangeStartISO, rangeEndISO){
  const start = new Date(rangeStartISO); start.setHours(0,0,0,0);
  const end = new Date(rangeEndISO); end.setHours(23,59,59,999);
  const rows = [['order_id','order_date','customer','product','product_id','qty','line_total']];
  sampleOrders.forEach(o=>{
    const od = new Date(o.date);
    if(od < start || od > end) return;
    o.items.forEach(it=>{
      const p = DB.products.find(pp=>pp.id===it.product_id) || {name:'Unknown', price:0};
      rows.push([o.id, o.date, o.customer, p.name, it.product_id, it.qty, (p.price || 0) * it.qty]);
    });
  });
  const usageMap = {};
  DB.ingredients.forEach(ing => usageMap[ing.id] = 0);
  sampleOrders.forEach(o=>{
    const od = new Date(o.date);
    if(od < start || od > end) return;
    o.items.forEach(it=>{
      const product = DB.products.find(p=>p.id===it.product_id);
      if(product && product.recipe){
        product.recipe.forEach(r=> { usageMap[r.ingredient_id] = (usageMap[r.ingredient_id]||0) + r.qty_per_unit * it.qty; });
      }
    });
  });
  const usageRows = [['ingredient_id','ingredient','units_used']];
  Object.keys(usageMap).forEach(k=> {
    const ing = DB.ingredients.find(i=>i.id===Number(k)) || {name:'Unknown'};
    usageRows.push([k, ing.name, usageMap[k].toFixed(3)]);
  });

  let csvContent = 'Sales\n' + rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  csvContent += '\n\nIngredient Usage\n' + usageRows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bakery_reports_${rangeStartISO.slice(0,10)}_to_${rangeEndISO.slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
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

function openIngredientDetail(id){
  const ing = DB.ingredients.find(x=>x.id===id); if(!ing) return;
  openModalHTML(ingredientModalTemplate(ing));
  q('modalStockIn')?.addEventListener('click', ()=> openStockForm(id,'in'));
  q('modalStockOut')?.addEventListener('click', ()=> openStockForm(id,'out'));
}

function openEditIngredient(id){
  const ing = DB.ingredients.find(x=>x.id===id); if(!ing) return;
  openModalHTML(`<h3>Edit — ${escapeHtml(ing.name)}</h3>
    <form id="editIngForm" class="form">
      <label class="field"><span class="field-label">Name</span><input id="editName" type="text" value="${escapeHtml(ing.name)}" required/></label>
      <label class="field"><span class="field-label">Quantity</span><input id="editQty" type="number" step="0.01" value="${ing.qty}" required/></label>
      <label class="field"><span class="field-label">Unit</span><input id="editUnit" type="text" value="${escapeHtml(ing.unit||'kg')}" required/></label>
      <label class="field"><span class="field-label">Minimum</span><input id="editMin" type="number" step="0.01" value="${ing.min||0}" required/></label>
      <label class="field"><span class="field-label">Maximum</span><input id="editMax" type="number" step="0.01" value="${ing.max||0}" /></label>
      <div style="display:flex;gap:8px;margin-top:8px" class="modal-actions">
        <button class="btn primary" type="submit">Save</button>
        <button class="btn ghost" id="cancelEdit" type="button">Cancel</button>
      </div>
    </form>`);
  q('cancelEdit')?.addEventListener('click', closeModal);

  function tryRecalc(){
    const name = q('editName')?.value.trim();
    const unit = q('editUnit')?.value.trim();
    const qty = Number(q('editQty')?.value||0);
    const key = name.toLowerCase();
    if(PROGRAMMED_CONSUMPTION[key] && PROGRAMMED_CONSUMPTION[key].unit === unit){
      const suggested = +(PROGRAMMED_CONSUMPTION[key].dailyKg * 2).toFixed(3);
      q('editMin').value = suggested;
      return;
    }
    const tmp = { id: ing.id, name, unit, qty, type: ing.type };
    q('editMin').value = computeThresholdForIngredient(tmp);
  }

  q('editName')?.addEventListener('input', tryRecalc);
  q('editUnit')?.addEventListener('change', tryRecalc);
  q('editQty')?.addEventListener('input', tryRecalc);

  q('editIngForm')?.addEventListener('submit', (e)=>{ 
    e.preventDefault(); 
    ing.name = q('editName')?.value || ing.name; 
    ing.qty = Number(q('editQty')?.value) || ing.qty; 
    ing.unit = q('editUnit')?.value || ing.unit; 
    ing.min = Number(q('editMin')?.value) || ing.min; 
    ing.max = Number(q('editMax')?.value) || ing.max; 
    DB.activity.push({text:`Edited ingredient ${ing.name}`, time:new Date().toLocaleString(), ingredient_id:ing.id});
    closeModal(); renderIngredientCards(); renderDashboard(); notify('Ingredient updated'); 
  });
}

function openStockForm(id,type){
  const ing = DB.ingredients.find(x=>x.id===id); if(!ing) return;
  openModalHTML(`<h3>${type==='in'?'Stock In':'Stock Out'} — ${ing.name}</h3><form id="stockForm" class="form"><label class="field"><span class="field-label">Quantity (${ing.unit})</span><input id="stockQty" type="number" step="0.01" required/></label><label class="field"><span class="field-label">Note</span><input id="stockNote" type="text"/></label><div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary" type="submit">${type==='in'?'Add':'Remove'}</button><button class="btn ghost" id="cancelStock" type="button">Cancel</button></div></form>`);
  q('cancelStock')?.addEventListener('click', closeModal);
  q('stockForm')?.addEventListener('submit', (e)=>{ e.preventDefault(); const qty = Number(q('stockQty')?.value || 0); const note = q('stockNote')?.value || ''; applyStockChange(id,type,qty,note); closeModal(); });
}
function applyStockChange(id,type,qty,note){ const ing = DB.ingredients.find(x=>x.id===id); if(!ing) return; if(type==='out' && qty > ing.qty){ notify('Not enough stock'); return; } ing.qty = +(type==='in' ? ing.qty + qty : ing.qty - qty).toFixed(3); DB.activity.push({text:`${type==='in'?'Stock in':'Stock out'}: ${qty} ${ing.unit} — ${ing.name}${note? ' — '+note:''}`, time:new Date().toLocaleString(), ingredient_id:id}); renderIngredientCards(); renderDashboard(); }

function openAddIngredient(){
  // default heuristic values (kept small)
  const defaultUnit = 'kg';
  const suggestedMin = 1;

  openModalHTML(`
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">Add Inventory Item</h3>
    </div>
    <form id="addIngForm" class="form" style="margin-top:10px">
      <label class="field"><span class="field-label">Name</span><input id="ingName" type="text" required/></label>
      <label class="field"><span class="field-label">Type</span>
        <select id="ingType"><option value="ingredient">Ingredient</option><option value="packaging">Packaging</option><option value="equipment">Equipment</option><option value="maintenance">Maintenance</option></select>
      </label>
      <label class="field"><span class="field-label">Unit</span><input id="ingUnit" type="text" required value="${defaultUnit}"/></label>
      <label class="field"><span class="field-label">Quantity</span><input id="ingQty" type="number" step="0.01" value="0" required/></label>
      <label class="field"><span class="field-label">Minimum (threshold) — auto-suggested</span><input id="ingMin" type="number" step="0.01" value="${suggestedMin}" required/></label>
      <label class="field"><span class="field-label">Maximum</span><input id="ingMax" type="number" step="0.01" value="" /></label>
      <label class="field"><span class="field-label">Expiry date</span><input id="ingExpiry" type="date"/></label>
      <label class="field"><span class="field-label">Supplier</span><input id="ingSupplier" type="text"/></label>
      <div class="modal-actions" style="margin-top:8px">
        <button class="btn primary" type="submit">Save</button>
        <button class="btn ghost" id="cancelAdd" type="button">Cancel</button>
      </div>
    </form>
  `);

  const mc = document.querySelector('.modal-card');
  if(mc) mc.classList.add('modal-small');

  q('cancelAdd')?.addEventListener('click', closeModal);

  // helper to try auto-suggest min
  function tryAutoSuggestMin(){
    const name = (q('ingName')?.value || '').trim();
    const unit = (q('ingUnit')?.value || defaultUnit).trim();
    const qty = Number(q('ingQty')?.value || 0);
    const key = name.toLowerCase();
    if(PROGRAMMED_CONSUMPTION[key] && PROGRAMMED_CONSUMPTION[key].unit === unit){
      const suggested = +(PROGRAMMED_CONSUMPTION[key].dailyKg * 2).toFixed(3); // default leadDays = 2
      q('ingMin').value = suggested;
      return;
    }
    // fallback: use computeThresholdForIngredient using a temporary object
    const tmp = { id: nextIngredientId(), name, unit, qty, type: q('ingType')?.value || 'ingredient' };
    const thr = computeThresholdForIngredient(tmp);
    q('ingMin').value = thr;
  }

  q('ingName')?.addEventListener('input', tryAutoSuggestMin);
  q('ingUnit')?.addEventListener('change', tryAutoSuggestMin);
  q('ingQty')?.addEventListener('input', tryAutoSuggestMin);

  q('addIngForm')?.addEventListener('submit', (e)=>{ 
    e.preventDefault();
    const newIng = {
      id: nextIngredientId(),
      name: q('ingName')?.value.trim(),
      unit: q('ingUnit')?.value||'kg',
      qty: Number(q('ingQty')?.value)||0,
      min: Number(q('ingMin')?.value)||0,
      max: Number(q('ingMax')?.value)||0,
      expiry: q('ingExpiry')?.value||null,
      supplier: q('ingSupplier')?.value||'',
      type: q('ingType')?.value || 'ingredient',
      icon:'fa-box-open',
      attrs: {}
    };
    DB.ingredients.push(newIng);
    DB.activity.push({text:`Added ${newIng.type} ${newIng.name}`, time:new Date().toLocaleString(), ingredient_id:newIng.id});
    closeModal();
    renderIngredientCards();
    renderDashboard();
    notify(`${newIng.type === 'equipment' ? 'Equipment' : 'Ingredient'} added (demo)`);
  });

  // initial auto-suggest run
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
    notify('Product added (demo)');
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
    const rows=Object.keys(acc).map(u=>{ const role=acc[u].role||''; return `<div class="user-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:8px;background:var(--card);border:1px solid rgba(0,0,0,0.04)"><div><strong>${u}</strong><div class="muted small">${role}</div></div><div>${u!==curr?`<button class="btn small" data-del="${u}" type="button">Delete</button>`:`<span class="muted small">Signed in</span>`}</div></div>`}).join('');
    list.innerHTML = rows || '<div class="muted small">No users</div>';
    list.querySelectorAll('button[data-del]').forEach(b=> b.addEventListener('click', ()=> { const u=b.dataset.del; if(confirm(`Delete user ${u}?`)){ const ac=loadAccounts(); delete ac[u]; saveAccounts(ac); populateSettings(); notify('User deleted (demo)'); } }));
  }
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  if(q('themeToggle')) q('themeToggle').checked = theme === 'dark';
  const bakery = JSON.parse(localStorage.getItem('bakery_profile') || '{}');
  if(q('bakeryName')) q('bakeryName').value = bakery.name || '';
  if(q('bakeryAddress')) q('bakeryAddress').value = bakery.address || '';
  if(q('bakeryUnit')) q('bakeryUnit').value = bakery.unit || '';
}

function startApp(){
  showApp(true); showOverlay(false);
  const user=getSession()||{name:'Guest',role:'Baker'};
  if(q('sidebarUser')) q('sidebarUser').textContent = `${user.name} — ${user.role}`;
  if(q('userBadgeText')) q('userBadgeText').textContent = `${user.name}`;
  if(q('userMenuName')) q('userMenuName').textContent = user.name || '';
  if(q('userMenuRole')) q('userMenuRole').textContent = user.role || '';

  renderDashboard(); renderIngredientCards(); renderProductGrid(); renderActivity(); initSearchFeature();
  buildTopNav(); showView('dashboard');
  setupSidebarToggle();

  document.querySelectorAll('.nav-item').forEach(btn=>{ btn.onclick = ()=>{ if(!isLoggedIn()){ showOverlay(true,true); return; } const view=btn.dataset.view; if(view==='profile') { populateProfile(); bindProfileControls(); } if(view==='settings') populateSettings(); showView(view); const sb=q('sidebar'); if(sb && window.innerWidth <= 900) sb.classList.remove('open'); const overlay=document.getElementById('drawerOverlay'); if(overlay) overlay.remove(); }; });

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

  /* on('applyReportRange','click', ()=> {
    const presetDays = Number(q('reportPreset')?.value || 30);
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - (presetDays - 1));
    q('reportStart').value = start.toISOString().slice(0,10);
    q('reportEnd').value = end.toISOString().slice(0,10);
    renderReports(q('reportStart').value, q('reportEnd').value);
    renderStockChart(q('reportStart').value, q('reportEnd').value);
  }); */

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
  if(q('saveProfile')) q('saveProfile').addEventListener('click', (e)=>{ e.preventDefault(); const name=q('profileName')?.value||''; const sess=getSession(); if(sess){ sess.name=name; setSession(sess, !!getPersistentSession()); if(q('sidebarUser')) q('sidebarUser').textContent = `${name} — ${sess.role}`; notify('Profile saved (demo)'); } });
  if(q('saveBakery')) q('saveBakery').addEventListener('click', (e)=> { e.preventDefault(); const o={name:q('bakeryName')?.value||'', address:q('bakeryAddress')?.value||'', unit:q('bakeryUnit')?.value||''}; localStorage.setItem('bakery_profile', JSON.stringify(o)); notify('Bakery settings saved (demo)'); });
  if(q('modalClose')) q('modalClose').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e)=> { if(e.key === 'Escape') closeModal(); });

  if(q('themeToggle')) q('themeToggle').addEventListener('change', (e)=> applyTheme(e.target.checked ? 'dark' : 'light'));
  if(q('addIngredientBtn')) q('addIngredientBtn').addEventListener('click', openAddIngredient);
  if(q('addProductBtn')) q('addProductBtn').addEventListener('click', openAddProduct);
  
    // enforce UI permissions for role
  enforcePermissionsUI();

  // inject inventory buttons once
  if(q('view-inventory') && !q('exportInventoryCsvBtn')){
    renderIngredientCards(); // re-render to include the injected header controls
  }

  // inject reports filter select
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
  applyBtn.removeEventListener?.('click', ()=>{}); // harmless if undefined
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

function performLogout(){ clearSession(); destroyAllCharts(); showApp(false); showOverlay(true, true); if(q('overlay-username')) q('overlay-username').value=''; if(q('overlay-password')) q('overlay-password').value=''; if(q('overlaySignup')) q('overlaySignup').classList.add('hidden'); if(q('overlayLogin')) q('overlayLogin').classList.remove('hidden'); if(q('landingOverlay')) q('landingOverlay').classList.remove('signup-mode'); }

document.addEventListener('DOMContentLoaded', ()=> {
  const accounts = loadAccounts(); if(Object.keys(accounts).length === 0){ accounts['admin'] = { password:'admin', role:'Owner', name:'Admin' }; saveAccounts(accounts); }

  const splash=q('splash'), overlay=q('landingOverlay'), loginPanel=q('overlayLogin'), signupPanel=q('overlaySignup');
  const splashDuration=5200; if(splash) splash.classList.remove('hidden');
  setTimeout(()=>{ if(splash) splash.classList.add('hidden'); setTimeout(()=>{ const pers=getPersistentSession(); if(pers && pers.username){ setSession(pers, true); startApp(); applyTheme(localStorage.getItem(THEME_KEY) || 'light'); } else { showOverlay(true,true); } }, 260); }, splashDuration);

  on('overlayToSignup','click', ()=> { overlay && overlay.classList.add('signup-mode'); loginPanel && loginPanel.classList.add('hidden'); signupPanel && signupPanel.classList.remove('hidden'); setTimeout(()=> q('overlay-su-username')?.focus(), 240); });
  on('overlayBackToLogin','click', ()=> { overlay && overlay.classList.remove('signup-mode'); signupPanel && signupPanel.classList.add('hidden'); loginPanel && loginPanel.classList.remove('hidden'); setTimeout(()=> q('overlay-username')?.focus(), 160); });
  on('overlaySignInBtn','click',(e)=>{ e.preventDefault(); const username=q('overlay-username')?.value.trim(); const password=q('overlay-password')?.value||''; const remember=!!q('rememberMe')?.checked; if(!username){ notify('Enter username'); return; } const acc=loadAccounts(); if(!acc[username]){ if(confirm('Account not found. Would you like to sign up?')) q('overlayToSignup')?.click(); return; } if(acc[username].password !== password){ notify('Incorrect password'); return; } const userObj={username, role:acc[username].role, name:acc[username].name||username}; setSession(userObj, remember); startApp(); applyTheme(localStorage.getItem(THEME_KEY) || 'light'); });
  on('overlaySignUpBtn','click', (e)=>{ e.preventDefault(); const username=q('overlay-su-username')?.value.trim(); const password=q('overlay-su-password')?.value||''; const role=q('overlay-su-role')?.value||'Baker'; if(!username||!password){ notify('Provide username and password'); return; } const acc=loadAccounts(); if(acc[username]){ notify('Username exists. Choose another or sign in.'); overlay && overlay.classList.remove('signup-mode'); signupPanel && signupPanel.classList.add('hidden'); loginPanel && loginPanel.classList.remove('hidden'); return; } acc[username]={password, role, name:username}; saveAccounts(acc); const card=q('authCard'); if(card){ card.classList.add('signup-success'); card.style.transform='translateY(-6px) scale(.998)'; setTimeout(()=>{ card.style.transform=''; card.classList.remove('signup-success'); overlay && overlay.classList.remove('signup-mode'); signupPanel && signupPanel.classList.add('hidden'); loginPanel && loginPanel.classList.remove('hidden'); q('overlay-username') && (q('overlay-username').value=username); q('overlay-password') && (q('overlay-password').value=''); setTimeout(()=> q('overlay-password')?.focus(),220); notify('Account created. Please sign in.'); },700); } else { notify('Account created. Please sign in.'); overlay && overlay.classList.remove('signup-mode'); } });
  on('modalClose','click', closeModal);
  on('exportBtn','click', ()=>{ const payload={db:DB, accounts:loadAccounts(), meta:{exportedAt:new Date().toISOString()}}; const blob=new Blob([JSON.stringify(payload, null, 2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`bakery-backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });
  on('importBtn','click', ()=>{ const f=q('importInput')?.files?.[0]; if(!f) return notify('Choose a backup file first'); const reader=new FileReader(); reader.onload=(ev)=>{ try{ const data=JSON.parse(ev.target.result); if(!confirm('Import will replace current DB and accounts. Continue?')) return; if(data.db) DB = data.db; if(data.accounts) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data.accounts)); renderIngredientCards(); renderProductGrid(); renderDashboard(); notify('Import successful (demo)'); } catch(e){ notify('Invalid backup file'); } }; reader.readAsText(f); });
  const pers=getPersistentSession();
  if(pers && pers.username){ setSession(pers, true); startApp(); applyTheme(localStorage.getItem(THEME_KEY) || 'light'); }
});

function populateProfile(){
  const s = getSession();
  if(!s) return;
  if(q('profileName')) q('profileName').value = s.name || '';
  if(q('profileRole')) q('profileRole').value = s.role || '';
  if(q('profileUsername')) q('profileUsername').value = s.username || '';

  const prefsRaw = localStorage.getItem(prefsKeyFor(s.username)) || '{}';
  let prefs = {};
  try{ prefs = JSON.parse(prefsRaw); }catch(e){ prefs = {}; }

  if(q('profileEmail')) q('profileEmail').value = prefs.email || '';
  if(q('profilePhone')) q('profilePhone').value = prefs.phone || '';
  if(q('profileTimezone')) q('profileTimezone').value = prefs.timezone || 'Asia/Manila';
  if(q('prefEmailNotif')) q('prefEmailNotif').checked = !!prefs.emailNotifications;
  if(q('prefPushNotif')) q('prefPushNotif').checked = !!prefs.pushNotifications;

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
      notify('Avatar updated (demo)');
    };
    reader.readAsDataURL(file);
  });

  const rem = q('removeAvatar');
  if(rem) rem.addEventListener('click', ()=> {
    const s = getSession(); if(!s) return;
    localStorage.removeItem(avatarKeyFor(s.username));
    const wrap = q('profileAvatarPreview');
    if(wrap){ wrap.innerHTML = '<i class="fa fa-user fa-2x"></i>'; }
    notify('Avatar removed (demo)');
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

  const acc = loadAccounts();
  if(acc && acc[s.username]){ acc[s.username].name = name; acc[s.username].role = s.role; saveAccounts(acc); }

  const prefs = { email, phone, timezone, emailNotifications: emailNotif, pushNotifications: pushNotif };
  localStorage.setItem(prefsKeyFor(s.username), JSON.stringify(prefs));

  if(q('sidebarUser')) q('sidebarUser').textContent = `${s.name} — ${s.role}`;
  if(q('userBadgeText')) q('userBadgeText').textContent = `${s.name}`;

  notify('Profile saved (demo)');
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
  notify('Password changed (demo)');
}

function deleteAccountDemo(){
  const s = getSession(); if(!s) return;
  if(!confirm(`Delete account ${s.username}? This will remove local demo account.`)) return;
  const acc = loadAccounts();
  delete acc[s.username];
  saveAccounts(acc);
  notify('Account deleted (demo)');
  performLogout();
}

function bindProfileControls(){
  bindProfileAvatarUpload();

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