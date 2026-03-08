/* app.js */

const INVENTORY_PAGE_LIMIT = 10;

(function() {
	const DISABLED = '[features-disabled]';
	console.info(DISABLED, 'Product & Order features disabled');

	const noops = [
		'applySearch', 'attachTopSearchHandlers', 'ensureOrdersView', 'highlightSearchResultInProducts',
		'initSearchFeature', 'injectSearchHighlightStyle', 'loadSearchHistory', 'nextOrderId', 'nextProductId',
		'openAddProduct', 'openNewOrderModal', 'openOrderDetailModal', 'pushSearchQuery', 'renderProductGrid', 'saveSearchHistory'
	];
	try {
		noops.forEach(fn => {
			if (typeof window !== 'undefined' && typeof window[fn] !== 'function') {
				window[fn] = function() {
					console.info(DISABLED, fn + '() called — feature disabled.');
				};
			}
		});
	} catch (e) {
		console.warn(DISABLED, 'stub install failed', e);
	}

	function hideProductOrderUI() {
		try {
			const sel = [
				'#view-products', '#view-orders', '#productsView', '#ordersView',
				'[data-section="products"]', '[data-section="orders"]',
				'.product-grid', '.orders-panel', '#productsList', '#ordersList',
				'[data-nav="products"]', '[data-nav="orders"]', '.nav-item[data-view="products"]', '.nav-item[data-view="orders"]'
			];
			sel.forEach(s => document.querySelectorAll(s).forEach(el => {
				if (!el) return;
				try {
					el.remove();
				} catch (_) {
					el.style.display = 'none';
				}
			}));
		} catch (e) {
			console.warn(DISABLED, 'hide UI failed', e);
		}
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideProductOrderUI);
	else hideProductOrderUI();

	function wrapApiFetchIfPresent() {
		try {
			if (typeof window.apiFetch === 'function' && !window.apiFetch._disabledPatch) {
				const original = window.apiFetch;
				window.apiFetch = async function(path, opts) {
					try {
						const p = String(path || '');
						if (/\/api\/products/i.test(p) || /\/api\/product/i.test(p) || /\/api\/orders/i.test(p) || /\/api\/order/i.test(p)) {
							console.info(DISABLED, 'blocked API call to', p);
							return {
								items: [],
								meta: {
									total: 0,
									page: 1,
									limit: 0
								}
							};
						}
					} catch (e) {}
					return original.apply(this, arguments);
				};
				window.apiFetch._disabledPatch = true;
			}
		} catch (e) {
			console.warn(DISABLED, 'wrapApiFetchIfPresent err', e);
		}
	}

	try {
		wrapApiFetchIfPresent();
	} catch (e) {}
	const _watch = setInterval(() => {
		try {
			wrapApiFetchIfPresent();
		} catch (e) {}
	}, 200);
	setTimeout(() => clearInterval(_watch), 3000);
})();

async function fetchIngredientsAPI({
	page = 1,
	limit = INVENTORY_PAGE_LIMIT,
	type = 'all',
	filter = 'all',
	search = '',
	sort = 'name',
	order = 'asc'
} = {}) {
	const qs = new URLSearchParams({
		page,
		limit,
		type,
		filter,
		search,
		sort,
		order
	});
	const res = await fetch('/api/ingredients?' + qs.toString(), {
		credentials: 'include'
	});
	if (!res.ok) throw new Error('Failed to fetch ingredients');
	return res.json();
}

async function fetchIngredient(id) {
	if (!id) return null;
	const res = await apiFetch(`/api/ingredients/${id}`);
	return res && res.ingredient ? res.ingredient : null;
}

async function createIngredientAPI(payload) {
	const res = await fetch('/api/ingredients', {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error || body.message || 'Create failed');
	}
	return res.json();
}

async function updateIngredientAPI(id, payload) {
	const res = await fetch(`/api/ingredients/${id}`, {
		method: 'PUT',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error || body.message || 'Update failed');
	}
	return res.json();
}

async function changeStockAPI(id, type, qty, note = '') {
	const res = await fetch(`/api/ingredients/${id}/stock`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			type,
			qty,
			note
		})
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error || body.message || 'Stock change failed');
	}
	return res.json();
}

async function deleteIngredientAPI(id) {
	const res = await fetch(`/api/ingredients/${id}`, {
		method: 'DELETE',
		credentials: 'include'
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error || body.message || 'Delete failed');
	}
	return res.json().catch(() => ({}));
}

/* ── Delete mode helpers ── */
const DELETE_MODE_KEY = 'bakery_inv_delete_mode';
function isDeleteModeEnabled() {
	return localStorage.getItem(DELETE_MODE_KEY) === 'true';
}
function canUseDeleteMode() {
	const role = (window.currentUser?.role || getSession()?.role || '').toLowerCase();
	return role === 'owner' || role === 'admin';
}

/* ── Day-scoped inventory history key ── */
const INV_HIST_DAY_KEY = 'bakery_inv_hist_day';
function todayDateStr() {
	return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

const sampleIngredients = [{
		id: 1,
		name: 'Flour',
		unit: 'kg',
		qty: 250,
		min: 62.5,
		max: 300,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-wheat',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 1
		}
	},
	{
		id: 2,
		name: 'Sugar',
		unit: 'kg',
		qty: 80,
		min: 16,
		max: 120,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-cubes-stacked',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 365
		}
	},
	{
		id: 3,
		name: 'Yeast',
		unit: 'kg',
		qty: 5,
		min: 1,
		max: 10,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-seedling',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 90
		}
	},
	{
		id: 4,
		name: 'Baking powder',
		unit: 'kg',
		qty: 6,
		min: 1,
		max: 12,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-flask',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 365
		}
	},
	{
		id: 5,
		name: 'Salt',
		unit: 'kg',
		qty: 12,
		min: 2,
		max: 24,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-salt-shaker',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 365
		}
	},
	{
		id: 6,
		name: 'Eggs',
		unit: 'pcs',
		qty: 300,
		min: 100,
		max: 600,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-egg',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 7
		}
	},
	{
		id: 7,
		name: 'Milk / Cream',
		unit: 'L',
		qty: 50,
		min: 10,
		max: 100,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-bottle-droplet',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 3
		}
	},
	{
		id: 8,
		name: 'Butter',
		unit: 'kg',
		qty: 40,
		min: 8,
		max: 80,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-bottle-droplet',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 90
		}
	},
	{
		id: 9,
		name: 'Margarine',
		unit: 'kg',
		qty: 40,
		min: 8,
		max: 80,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-bottle-droplet',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 90
		}
	},
	{
		id: 10,
		name: 'Oil',
		unit: 'kg',
		qty: 40,
		min: 8,
		max: 80,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-bottle-droplet',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 90
		}
	},
	{
		id: 11,
		name: 'Shortening',
		unit: 'kg',
		qty: 40,
		min: 8,
		max: 80,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-bottle-droplet',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 90
		}
	},
	{
		id: 12,
		name: 'Cocoa powder',
		unit: 'kg',
		qty: 20,
		min: 5,
		max: 40,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-chocolate-bar',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 365
		}
	},
	{
		id: 13,
		name: 'Vanilla',
		unit: 'L',
		qty: 4,
		min: 1,
		max: 8,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-wine-bottle',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 365
		}
	},
	{
		id: 14,
		name: 'Sesame seeds',
		unit: 'kg',
		qty: 6,
		min: 1,
		max: 12,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-seedling',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 365
		}
	},
	{
		id: 15,
		name: 'Food coloring',
		unit: 'mL',
		qty: 500,
		min: 100,
		max: 2000,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-palette',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 365
		}
	},
	{
		id: 16,
		name: 'Dobrim',
		unit: 'kg',
		qty: 8,
		min: 2,
		max: 16,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-boxes-stacked',
		type: 'ingredient',
		attrs: {
			antiAmag: false,
			shelfLifeDays: 365
		}
	},

	{
		id: 20,
		name: 'Paper bags',
		unit: 'pcs',
		qty: 1000,
		min: 200,
		max: 2000,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-box',
		type: 'packaging',
		attrs: {}
	},
	{
		id: 21,
		name: 'Plastics',
		unit: 'pcs',
		qty: 500,
		min: 100,
		max: 1000,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-box',
		type: 'packaging',
		attrs: {}
	},
	{
		id: 22,
		name: 'Wrapping paper',
		unit: 'roll',
		qty: 30,
		min: 6,
		max: 60,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-box',
		type: 'packaging',
		attrs: {}
	},

	{
		id: 30,
		name: 'Oven',
		unit: 'unit',
		qty: 2,
		min: 1,
		max: 4,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-fire',
		type: 'equipment',
		attrs: {
			serial: null,
			warrantyYears: 2
		}
	},
	{
		id: 31,
		name: 'Mixer',
		unit: 'unit',
		qty: 1,
		min: 1,
		max: 2,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-cogs',
		type: 'equipment',
		attrs: {
			serial: null,
			warrantyYears: 2
		}
	},
	{
		id: 32,
		name: 'Baking trays',
		unit: 'pcs',
		qty: 40,
		min: 10,
		max: 100,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-pan-food',
		type: 'equipment',
		attrs: {}
	},
  {
		id: 32,
		name: 'Baking Pans',
		unit: 'pcs',
		qty: 40,
		min: 10,
		max: 100,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-pan-food',
		type: 'equipment',
		attrs: {}
	},
  {
		id: 32,
		name: 'Baking molder',
		unit: 'pcs',
		qty: 40,
		min: 10,
		max: 100,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-pan-food',
		type: 'equipment',
		attrs: {}
	},
	{
		id: 33,
		name: 'Measuring cups',
		unit: 'pcs',
		qty: 12,
		min: 3,
		max: 30,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-weight-scale',
		type: 'equipment',
		attrs: {}
	},
  {
		id: 33,
		name: 'Measuring spoons',
		unit: 'pcs',
		qty: 12,
		min: 3,
		max: 30,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-weight-scale',
		type: 'equipment',
		attrs: {}
	},
  {
		id: 33,
		name: 'Measuring scales',
		unit: 'pcs',
		qty: 12,
		min: 3,
		max: 30,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-weight-scale',
		type: 'equipment',
		attrs: {}
	},
	{
		id: 34,
		name: 'Rolling pins',
		unit: 'pcs',
		qty: 8,
		min: 2,
		max: 20,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-broom',
		type: 'equipment',
		attrs: {}
	},
	{
		id: 35,
		name: 'Egg beater',
		unit: 'pcs',
		qty: 4,
		min: 1,
		max: 10,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-whisk',
		type: 'equipment',
		attrs: {}
	},
	{
		id: 36,
		name: 'Knives',
		unit: 'pcs',
		qty: 30,
		min: 6,
		max: 60,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-utensils',
		type: 'equipment',
		attrs: {}
	},
  {
		id: 36,
		name: 'Spatulas',
		unit: 'pcs',
		qty: 30,
		min: 6,
		max: 60,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-utensils',
		type: 'equipment',
		attrs: {}
	},
	{
		id: 40,
		name: 'Hairnet',
		unit: 'pcs',
		qty: 200,
		min: 50,
		max: 500,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-user-gear',
		type: 'maintenance',
		attrs: {}
	},
	{
		id: 41,
		name: 'Gloves',
		unit: 'box',
		qty: 40,
		min: 10,
		max: 120,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-hand-holding',
		type: 'maintenance',
		attrs: {}
	},
	{
		id: 42,
		name: 'Aprons',
		unit: 'pcs',
		qty: 10,
		min: 3,
		max: 30,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-user-tie',
		type: 'maintenance',
		attrs: {}
	},
	{
		id: 43,
		name: 'Trash bags',
		unit: 'roll',
		qty: 50,
		min: 12,
		max: 150,
		expiry: null,
		supplier: 'Protego Inc.',
		icon: 'fa-trash',
		type: 'maintenance',
		attrs: {}
	},
];

const sampleProducts = [];

let DB = {
	ingredients: structuredClone(sampleIngredients),
	products: structuredClone(sampleProducts),
	activity: []
};

const sampleOrders = [];

let chartStock = null;
let chartBestSeller = null;
let chartSalesTimeline = null;
let chartIngredientUsage = null;

const ACCOUNTS_KEY = 'bakery_accounts';
const SESSION_KEY = 'bakery_session';
const THEME_KEY = 'bakery_theme';

// Apply theme early to avoid FOUC
(function() {
	const _t = localStorage.getItem('bakery_theme') || 'light';
	const _darkIds = ['dark','forest','sunset','ocean','mocha','charcoal'];
	const _all = ['theme-dark','theme-forest','theme-sunset','theme-ocean','theme-lavender','theme-rose','theme-mocha','theme-mint','theme-charcoal','theme-is-dark'];
	document.documentElement.classList.remove(..._all);
	if (_t === 'dark') document.documentElement.classList.add('theme-dark', 'theme-is-dark');
	else if (_t !== 'light') {
		document.documentElement.classList.add('theme-' + _t);
		if (_darkIds.includes(_t)) document.documentElement.classList.add('theme-is-dark');
	}
})();

function q(id) {
	return document.getElementById(id) || null;
}

function on(id, ev, fn) {
	const el = q(id);
	if (el) el.addEventListener(ev, fn);
	else console.debug(`[on] missing #${id}`);
}

function offsetDateISO(days) {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString();
}

function loadAccounts() {
	try {
		return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
	} catch (e) {
		return {};
	}
}

function saveAccounts(obj) {
	localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(obj));
}

function getPersistentSession() {
	try {
		return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
	} catch (e) {
		return null;
	}
}

function setPersistentSession(o) {
	try {
		localStorage.setItem(SESSION_KEY, JSON.stringify(o));
	} catch (e) {}
}

function clearPersistentSession() {
	try {
		localStorage.removeItem(SESSION_KEY);
	} catch (e) {}
}

function setSession(obj, persist = false) {
	try {
		sessionStorage.setItem('user', JSON.stringify(obj));
	} catch (e) {}
	if (persist) setPersistentSession(obj);
}

function clearSession() {
	try {
		sessionStorage.removeItem('user');
	} catch (e) {}
	clearPersistentSession();
}

function getSession() {
	try {
		return JSON.parse(sessionStorage.getItem('user') || JSON.stringify(getPersistentSession() || null));
	} catch (e) {
		return null;
	}
}

function isLoggedIn() {
	return !!getSession();
}

function daysUntil(dateStr) {
	if (!dateStr) return Infinity;
	const t = new Date();
	t.setHours(0, 0, 0, 0);
	const d = new Date(dateStr);
	d.setHours(0, 0, 0, 0);
	return Math.ceil((d - t) / (1000 * 60 * 60 * 24));
}

document.querySelectorAll('.app-toast, .toast, .notification').forEach(t => {
	t.remove();
});

function notify(msg, opts = {}) {
	try {
		const timeout = Number(opts.timeout) || 3500;
		const type    = opts.type || 'info';   // 'info' | 'success' | 'error' | 'warn'
		const onUndo  = opts.onUndo || null;   // callback for undo action

		let wrap = document.getElementById('app-toast-wrap');
		if (!wrap) {
			wrap = document.createElement('div');
			wrap.id = 'app-toast-wrap';
			wrap.style.cssText = 'position:fixed;right:18px;bottom:20px;z-index:16000;display:flex;flex-direction:column;gap:8px;pointer-events:none';
			document.body.appendChild(wrap);
		}

		const accent = type === 'success' ? '#16a34a'
		             : type === 'error'   ? '#dc2626'
		             : type === 'warn'    ? '#d97706'
		             : 'var(--accent,#1b85ec)';

		const t = document.createElement('div');
		t.className = 'app-toast';
		t.setAttribute('role', 'status');
		t.setAttribute('aria-live', 'polite');
		t.style.cssText = `background:var(--card,#fff);color:var(--text,#12202f);padding:10px 14px;border-radius:12px;box-shadow:0 12px 30px rgba(19,28,38,0.13);font-weight:600;min-width:180px;max-width:340px;opacity:0;transform:translateY(8px);transition:all .25s ease;pointer-events:auto;display:flex;align-items:center;gap:10px`;

		const msgSpan = document.createElement('span');
		msgSpan.style.flex = '1';
		msgSpan.textContent = String(msg || '');
		t.appendChild(msgSpan);

		if (onUndo) {
			const undoBtn = document.createElement('button');
			undoBtn.textContent = 'Undo';
			undoBtn.style.cssText = `background:${accent};color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap`;
			let undone = false;
			undoBtn.onclick = () => {
				if (undone) return;
				undone = true;
				onUndo();
		t.style.opacity = '0';
				setTimeout(() => { try { t.remove(); } catch (_) {} }, 260);
			};
			t.appendChild(undoBtn);
		}

		wrap.appendChild(t);
		requestAnimationFrame(() => {
			t.style.opacity = '1';
			t.style.transform = 'translateY(0)';
		});

		const hide = () => {
			t.style.opacity = '0';
			t.style.transform = 'translateY(8px)';
			setTimeout(() => { try { t.remove(); } catch (_) {} }, 260);
		};
		const tid = setTimeout(hide, timeout);
		t.onclick = (e) => { if (e.target !== t) return; clearTimeout(tid); hide(); };
	} catch (e) {
		console.warn('notify failed', msg);
	}
}
// Mark so the settings-block override doesn't replace our enhanced version
notify._overrideBySettings = true;
window.notify = notify;

const PERMISSIONS = {
	Owner: {
		help: true,
		dashboard: true,
		calendar: true,
		profile: true,
		inventory: true,
		reports: true,
		settings: true,
		users: true
	},
	Baker: {
		help: true,
		dashboard: true,
		calendar: true,   // Bakers need to see the schedule
		profile: true,    // Bakers should manage their own profile/password
		inventory: true,
		reports: false,
		settings: true,
		users: false
	},
	Assistant: {
		help: true,
		dashboard: true,
		calendar: true,
		profile: true,    // Assistants should manage their own profile
		inventory: true,
		reports: true,
		settings: true,
		users: true
	},
};

function getCurrentRole() {
	const s = getSession();
	return s?.role || 'Baker';
}

function hasPermission(feature) {
	const role = getCurrentRole();
	const perms = PERMISSIONS[role] || {};
	return !!perms[feature];
}

function enforcePermissionsUI() {
	const map = {
		products: 'products',
		orders: 'orders'
	};
	document.querySelectorAll('#sideNav .nav-item').forEach(btn => {
		const view = btn.dataset.view;
		if (view && !hasPermission(view)) {
			btn.style.display = 'none';
		} else {
			btn.style.display = '';
		}
	});

	if (!hasPermission('products')) {
		const el = q('view-products');
		if (el) el.classList.add('hidden');
		const prodBtn = q('addProductBtn');
		if (prodBtn) prodBtn.style.display = 'none';
	} else {
		if (q('addProductBtn')) q('addProductBtn').style.display = '';
	}

	if (!hasPermission('orders')) {
		const el = q('view-orders');
		if (el) el.classList.add('hidden');
		const orderBtn = q('createOrderBtn');
		if (orderBtn) orderBtn.style.display = 'none';
	} else {
		if (q('createOrderBtn')) q('createOrderBtn').style.display = '';
	}

	const quickBakeBtn = q('quickBake');
	if (quickBakeBtn) quickBakeBtn.style.display = hasPermission('bake') ? '' : 'none';

	const addProd = q('addProductBtn');
	if (addProd) addProd.style.display = hasPermission('addProduct') ? '' : 'none';
}

function nextIngredientId() {
	const arr = DB.ingredients.map(i => i.id || 0);
	return (arr.length ? Math.max(...arr) : 0) + 1;
}

function nextProductId() {
	const arr = DB.products.map(p => p.id || 0);
	return (arr.length ? Math.max(...arr) : 0) + 1;
}

function nextOrderId() {
	const arr = sampleOrders.map(o => o.id || 0);
	return (arr.length ? Math.max(...arr) : 1000) + 1;
}

const PROGRAMMED_CONSUMPTION = {
	'flour': {
		dailyAmount: 62.5,
		unit: 'kg'
	},
	'sugar': {
		dailyAmount: 8,
		unit: 'kg'
	},
	'butter': {
		dailyAmount: 10,
		unit: 'kg'
	},
	'margarine': {
		dailyAmount: 10,
		unit: 'kg'
	},
	'oil': {
		dailyAmount: 10,
		unit: 'kg'
	},
	'shortening': {
		dailyAmount: 10,
		unit: 'kg'
	},
	'eggs': {
		dailyAmount: 200,
		unit: 'pcs'
	},
	'milk / cream': {
		dailyAmount: 15,
		unit: 'L'
	},
	'yeast': {
		dailyAmount: 2,
		unit: 'kg'
	},
	'baking powder': {
		dailyAmount: 1,
		unit: 'kg'
	},
	'salt': {
		dailyAmount: 2,
		unit: 'kg'
	},
	'cocoa powder': {
		dailyAmount: 1,
		unit: 'kg'
	},
	'vanilla': {
		dailyAmount: 0.1,
		unit: 'L'
	},
	'sesame seeds': {
		dailyAmount: 1,
		unit: 'kg'
	},
	'food coloring': {
		dailyAmount: 50,
		unit: 'mL'
	},
	'dobrim': {
		dailyAmount: 2,
		unit: 'kg'
	}
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

	const fallback = ing.qty ? Math.max(+(ing.qty * 0.2).toFixed(3), (ing.unit === 'kg' ? 1 : 1)) : 1;
	return fallback;
}

function aggregateUsageFromActivity(startISO, endISO, maxItems = 12) {
	const start = startISO ? new Date(startISO) : new Date(new Date().getTime() - (30 * 24 * 60 * 60 * 1000));
	const end = endISO ? new Date(endISO) : new Date();
	start.setHours(0, 0, 0, 0);
	end.setHours(23, 59, 59, 999);

	const usageMap = {};
	(DB.ingredients || []).forEach(ing => usageMap[ing.id] = 0);

	(DB.activity || []).forEach(rec => {
		if (!rec || !rec.time) return;
		const t = new Date(rec.time);
		if (t < start || t > end) return;
		const iid = rec.ingredient_id;
		if (!iid) return;
		const text = String(rec.text || '').toLowerCase();
		if (!(text.includes('used') || text.includes('stock out') || text.includes('used for'))) return;
		const m = String(rec.text || '').match(/([0-9]*\.?[0-9]+)/g);
		if (!m) return;
		const v = Number(m[0]) || 0;
		usageMap[iid] = (usageMap[iid] || 0) + v;
	});

	const arr = Object.keys(usageMap).map(k => ({
		id: Number(k),
		qty: usageMap[k]
	})).sort((a, b) => b.qty - a.qty).slice(0, maxItems);
	const labels = arr.map(x => (DB.ingredients.find(i => i.id === x.id)?.name) || `#${x.id}`);
	const data = arr.map(x => +(x.qty.toFixed(3)));
	return {
		labels,
		data,
		raw: arr
	};
}

function showApp(flag) {
	const app = q('app');
	if (!app) return;
	app.classList.toggle('hidden', !flag);
	app.setAttribute('aria-hidden', String(!flag));
}

function showOverlay(flag, focus = false) {
	const overlay = q('landingOverlay');
	if (!overlay) return;
	overlay.classList.toggle('hidden', !flag);
	overlay.setAttribute('aria-hidden', String(!flag));
	if (flag && focus) setTimeout(() => q('overlay-username')?.focus(), 160);
}

function avatarKeyFor(username) {
	return `profile_avatar_${username}`;
}

function prefsKeyFor(username) {
	return `profile_prefs_${username}`;
}

function openModal() {
	const m = q('modal');
	if (!m) return;
	m.classList.remove('hidden');
	m.setAttribute('aria-hidden', 'false');
	setTimeout(() => m.querySelector('input,button,textarea,select')?.focus(), 120);
}

function closeModal() {
	const m = q('modal');
	if (!m) return;
	m.classList.add('hidden');
	m.setAttribute('aria-hidden', 'true');
	const c = q('modalContent');
	if (c) c.innerHTML = '';
	const mc = document.querySelector('.modal-card');
	if (mc && mc.classList.contains('modal-small')) mc.classList.remove('modal-small');
}

function showGlobalLoader(show, title = 'Working', subtitle = 'Please wait...', minMs = 600) {
	const id = 'globalLoader';
	if (show) {
		if (document.getElementById(id)) return;
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
		document.body.style.overflow = 'hidden';
	} else {
		const el = document.getElementById(id);
		if (!el) return;
		const start = Number(el.dataset._glStart || 0);
		const min = Number(el.dataset._glMin || minMs || 0);
		const elapsed = Date.now() - start;
		const remain = Math.max(0, min - elapsed);
		setTimeout(() => {
			const n = document.getElementById(id);
			if (n) n.remove();
			document.body.style.overflow = '';
		}, remain);
	}
}

function setButtonLoadingWithMin(btn, loading, minMs = 450) {
	if (!btn) return;
	if (loading) {
		btn.dataset._btnStart = String(Date.now());
		if (!btn.dataset._origHtml) btn.dataset._origHtml = btn.innerHTML;
		btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> ${escapeHtml((btn.dataset._origLabel || btn.innerText).trim())}`;
		btn.classList.add('loading');
		btn.disabled = true;
	} else {
		const start = Number(btn.dataset._btnStart || 0);
		const elapsed = Date.now() - start;
		const remain = Math.max(0, (minMs || 0) - elapsed);
		setTimeout(() => {
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

function showOverlayLoader(show, text = '') {
	let el = document.getElementById('overlayLoader');
	if (!el) {
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
	if (show) q('overlayLoaderText').textContent = text || '';
}

function openForgotPasswordModal() {
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
		if (!email) return notify('Enter your email');
		showOverlayLoader(true, 'Sending reset code…');
		try {
			const r = await fetch('/api/auth/forgot', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email
				})
			});
			const txt = await r.text();
			let data = null;
			try {
				data = txt ? JSON.parse(txt) : null;
			} catch (e) {}
			if (!r.ok) {
				notify(data?.error || data?.message || txt || `Error: ${r.status}`);
				showOverlayLoader(false);
				return;
			}
			showOverlayLoader(false);
			notify(data?.message || 'If the email exists, a code was sent.');
			closeModal();
			openVerifyResetModal(email);
		} catch (err) {
			console.error('forgot fetch err', err);
			showOverlayLoader(false);
			notify('Network error sending code — check server & Network tab.');
		}
	});
}

function openVerifyResetModal(email = '') {
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
	q('verifyForm')?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const email = (q('verifyEmail')?.value || '').trim();
		const code = (q('verifyCode')?.value || '').trim();
		if (!email || !code) return notify('Email and code required');
		showOverlayLoader(true, 'Verifying...');
		try {
			const r = await fetch('/api/auth/forgot/verify', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email,
					code
				})
			});
			const txt = await r.text();
			let data = null;
			try {
				data = txt ? JSON.parse(txt) : null
			} catch (e) {}
			showOverlayLoader(false);
			if (!r.ok) {
				notify(data?.error || data?.message || txt || `Error ${r.status}`);
				return;
			}
			notify('Code verified — set new password');
			closeModal();
			openResetPasswordModal(email, code);
		} catch (err) {
			showOverlayLoader(false);
			console.error('verify err', err);
			notify('Network error verifying code');
		}
	});
}

function openResetPasswordModal(email = '', code = '') {
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
	q('resetForm')?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const email = (q('resetEmail')?.value || '').trim();
		const code = (q('resetCode')?.value || '').trim();
		const pw = q('resetPassword')?.value || '';
		if (!email || !code || !pw) return notify('Complete the form');
		showOverlayLoader(true, 'Resetting password…');
		try {
			const r = await fetch('/api/auth/forgot/reset', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email,
					code,
					password: pw
				})
			});
			const txt = await r.text();
			let data = null;
			try {
				data = txt ? JSON.parse(txt) : null
			} catch (e) {}
			showOverlayLoader(false);
			if (!r.ok) {
				notify(data?.error || data?.message || txt || `Error ${r.status}`);
				return;
			}
			notify('Password changed — you can sign in now');
			closeModal();
		} catch (err) {
			showOverlayLoader(false);
			console.error('reset err', err);
			notify('Network error resetting password');
		}
	});
}

/* ── Color palette definitions ── */
const COLOR_PALETTES = [
	{ id: 'light',     label: 'Sky',      bg: '#eeeeee', accent: '#1b85ec', dark: false },
	{ id: 'dark',      label: 'Night',    bg: '#06101a', accent: '#ffb366', dark: true  },
	{ id: 'forest',    label: 'Forest',   bg: '#0b1a10', accent: '#3ecf6f', dark: true  },
	{ id: 'sunset',    label: 'Sunset',   bg: '#1a0d0a', accent: '#f5824e', dark: true  },
	{ id: 'ocean',     label: 'Ocean',    bg: '#071b26', accent: '#00c8dc', dark: true  },
	{ id: 'lavender',  label: 'Lavender', bg: '#f0ecff', accent: '#7c3aed', dark: false },
	{ id: 'rose',      label: 'Rose',     bg: '#fff0f3', accent: '#e11d6a', dark: false },
	{ id: 'mocha',     label: 'Mocha',    bg: '#18110d', accent: '#c98a58', dark: true  },
	{ id: 'mint',      label: 'Mint',     bg: '#edfaf5', accent: '#059669', dark: false },
	{ id: 'charcoal',  label: 'Charcoal', bg: '#111214', accent: '#a0aec0', dark: true  },
];

const ALL_THEME_CLASSES = COLOR_PALETTES.map(p => p.id === 'light' ? null : (p.id === 'dark' ? 'theme-dark' : `theme-${p.id}`)).filter(Boolean);

function applyTheme(theme) {
	localStorage.setItem(THEME_KEY, theme);
	// Remove all theme classes, then apply the right one
	document.documentElement.classList.remove(...ALL_THEME_CLASSES, 'theme-is-dark');
	const palette = COLOR_PALETTES.find(p => p.id === theme);
	if (theme === 'dark') {
		document.documentElement.classList.add('theme-dark', 'theme-is-dark');
	} else if (theme !== 'light') {
		document.documentElement.classList.add(`theme-${theme}`);
		if (palette && palette.dark) document.documentElement.classList.add('theme-is-dark');
	}
	// Keep hidden legacy checkbox in sync (dark = checked)
	const tt = q('themeToggle');
	if (tt) tt.checked = theme === 'dark';
	// Update palette grid active state
	document.querySelectorAll('.palette-swatch').forEach(sw => {
		sw.classList.toggle('active', sw.dataset.palette === theme);
	});
}

function renderColorPaletteGrid() {
	const grid = document.getElementById('colorPaletteGrid');
	if (!grid) return;
	const current = localStorage.getItem(THEME_KEY) || 'light';
	grid.innerHTML = COLOR_PALETTES.map(p => `
		<div class="palette-swatch${p.id === current ? ' active' : ''}" data-palette="${p.id}" title="${p.label}" role="button" tabindex="0" aria-label="${p.label} theme">
			<div class="swatch-bg" style="background:${p.bg}"></div>
			<div class="swatch-accent" style="background:${p.accent}"></div>
			<div class="swatch-check">✓</div>
			<div class="swatch-label">${p.label}</div>
		</div>
	`).join('');
	grid.querySelectorAll('.palette-swatch').forEach(sw => {
		const activate = () => {
			applyTheme(sw.dataset.palette);
			notify(`Theme: ${sw.title}`);
		};
		sw.addEventListener('click', activate);
		sw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
	});
}

const SEARCH_HISTORY_KEY = 'bakery_search_history_v1';
const MAX_SEARCH_HISTORY = 25;

if (!Array.isArray(DB.orders)) DB.orders = [];

function loadSearchHistory() {
	try {
		return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
	} catch (e) {
		return [];
	}
}

function saveSearchHistory(arr) {
	try {
		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(arr.slice(0, MAX_SEARCH_HISTORY)));
	} catch (e) {}
}

function pushSearchQuery(q) {
	if (!q) return;
	const arr = loadSearchHistory();
	const idx = arr.findIndex(x => x.toLowerCase() === q.toLowerCase());
	if (idx !== -1) arr.splice(idx, 1);
	arr.unshift(q);
	saveSearchHistory(arr);
}

function ensureSuggestionContainer() {
	let wrap = document.querySelector('.search-suggestions');
	const input = q('topSearch');
	if (!input) return null;
	if (wrap) return wrap;
	wrap = document.createElement('div');
	wrap.className = 'search-suggestions hidden';
	wrap.innerHTML = '<ul></ul>';
	input.parentElement.appendChild(wrap);
	document.addEventListener('click', (e) => {
		if (!wrap) return;
		if (!wrap.contains(e.target) && e.target !== input) wrap.classList.add('hidden');
	});
	return wrap;
}

function showSuggestions(filter = '') {
	const wrap = ensureSuggestionContainer();
	if (!wrap) return;
	const ul = wrap.querySelector('ul');
	const hist = loadSearchHistory();
	const qf = (filter || '').trim().toLowerCase();
	const historyMatches = hist.filter(h => h.toLowerCase().includes(qf));
	const prodMatches = DB.products.filter(p => p.name.toLowerCase().includes(qf)).slice(0, 6).map(p => ({
		label: p.name,
		type: 'Product'
	}));
	const ingMatches = DB.ingredients.filter(i => i.name.toLowerCase().includes(qf)).slice(0, 6).map(i => ({
		label: i.name,
		type: 'Ingredient'
	}));
	const orderMatches = (DB.orders || []).filter(o => (o.id && String(o.id).includes(qf)) || (o.customer && o.customer.toLowerCase().includes(qf))).slice(0, 6).map(o => ({
		label: o.id ? `Order #${o.id}` : (o.customer || 'Order'),
		type: 'Order'
	}));
	const seen = new Set();
	const rows = [];
	historyMatches.forEach(h => {
		if (!seen.has(h.toLowerCase())) {
			rows.push({
				label: h,
				type: 'Recent'
			});
			seen.add(h.toLowerCase());
		}
	});
	[...prodMatches, ...ingMatches, ...orderMatches].forEach(m => {
		if (!seen.has(m.label.toLowerCase())) {
			rows.push(m);
			seen.add(m.label.toLowerCase());
		}
	});

	if (qf === '' && hist.length === 0) {
		wrap.classList.add('hidden');
		return;
	}
	if (rows.length === 0) {
		wrap.classList.add('hidden');
		return;
	}
	ul.innerHTML = rows.map((r, idx) => `<li data-idx="${idx}" data-label="${encodeURIComponent(r.label)}" data-type="${r.type}"><span>${escapeHtml(r.label)}</span><span class="meta">${escapeHtml(r.type)}</span></li>`).join('');
	wrap.classList.remove('hidden');
	wrap.querySelectorAll('li').forEach(li => li.addEventListener('click', () => {
		const label = decodeURIComponent(li.dataset.label);
		applySearch(label);
		wrap.classList.add('hidden');
	}));
	let current = 0;
	wrap.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === current));
	wrap._current = current;
}

function escapeHtml(s) {
	return String(s || '').replace(/[&<>"']/g, (m) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	})[m]);
}

function applySearch(query) {
	if (!query) return;
	pushSearchQuery(query);
	const ql = query.toLowerCase();
	const prodMatches = DB.products.filter(p => p.name.toLowerCase().includes(ql));
	const ingMatches = DB.ingredients.filter(i => i.name.toLowerCase().includes(ql));
	const orderMatches = (DB.orders || []).filter(o => (o.id && String(o.id).includes(ql)) || (o.customer && o.customer.toLowerCase().includes(ql)));

	if (prodMatches.length) {
		showView('products');
		if (q('searchProd')) q('searchProd').value = query;
		renderProductGrid();
		highlightSearchResultInProducts(query);
		return;
	}
	if (ingMatches.length) {
		showView('inventory');
		if (q('searchIng')) q('searchIng').value = query;
		renderIngredientCards();
		return;
	}
	if (orderMatches.length) {
		ensureOrdersView();
		showView('orders');
		if (q('searchOrders')) q('searchOrders').value = query;
		renderOrders();
		return;
	}
	showView('activity');
	if (q('activityFilter')) q('activityFilter').value = 'all';
	filterActivityByQuery(query);
}

function highlightSearchResultInProducts(query) {
	const ql = query.toLowerCase();
	setTimeout(() => {
		const matches = Array.from(document.querySelectorAll('#productGrid .product-card')).filter(card => card.innerText.toLowerCase().includes(ql));
		if (matches.length) {
			matches[0].scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			});
			matches[0].classList.add('search-highlight');
			setTimeout(() => matches[0].classList.remove('search-highlight'), 2200);
		}
	}, 120);
}

(function injectSearchHighlightStyle() {
	if (document.getElementById('search-highlight-style')) return;
	const st = document.createElement('style');
	st.id = 'search-highlight-style';
	st.textContent = `.search-highlight{ box-shadow: 0 8px 30px rgba(28,120,220,0.12) !important; transform: translateY(-2px); transition: all .28s ease; }`;
	document.head.appendChild(st);
})();

function filterActivityByQuery(query) {
	const ql = (query || '').toLowerCase();
	const items = DB.activity.filter(a => a.text && a.text.toLowerCase().includes(ql));
	const act = q('activityList');
	if (!act) return;
	if (items.length === 0) {
		act.innerHTML = '<li class="muted">No activity matches</li>';
		return;
	}
	act.innerHTML = items.map(a => `<li><div>${a.text}</div><div class="muted small">${a.time}</div></li>`).join('');
}

function attachTopSearchHandlers() {
	const input = q('topSearch');
	const wrap = ensureSuggestionContainer();
	if (!input) return;
	input.addEventListener('input', (e) => {
		const v = input.value || '';
		showSuggestions(v);
	});
	input.addEventListener('keydown', (e) => {
		const wrap = document.querySelector('.search-suggestions');
		if (!wrap || wrap.classList.contains('hidden')) {
			if (e.key === 'Enter') {
				e.preventDefault();
				applySearch(input.value.trim());
			}
			return;
		}
		const items = Array.from(wrap.querySelectorAll('li'));
		if (items.length === 0) return;
		let current = items.findIndex(i => i.classList.contains('active'));
		if (current < 0) current = 0;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			items[current]?.classList.remove('active');
			current = (current + 1) % items.length;
			items[current].classList.add('active');
			items[current].scrollIntoView({
				block: 'nearest'
			});
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			items[current]?.classList.remove('active');
			current = (current - 1 + items.length) % items.length;
			items[current].classList.add('active');
			items[current].scrollIntoView({
				block: 'nearest'
			});
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const lab = decodeURIComponent(items[current].dataset.label);
			applySearch(lab);
			wrap.classList.add('hidden');
		} else if (e.key === 'Escape') {
			wrap.classList.add('hidden');
		}
	});
	input.addEventListener('blur', () => setTimeout(() => {
		const w = document.querySelector('.search-suggestions');
		if (w) w.classList.add('hidden');
	}, 180));
}

function ensureOrdersView() {
	if (q('view-orders')) return;
	const main = document.querySelector('main.main');
	if (!main) return;
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
	if (so) {
		so.addEventListener('input', () => renderOrders());
		so.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				pushSearchQuery(so.value.trim());
			}
		});
	}
	renderOrders();
}

function updateDateTime() {
	const d = new Date();
	if (q('dateText')) q('dateText').textContent = d.toLocaleDateString();
	if (q('timeText')) q('timeText').textContent = d.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit'
	});
}
setInterval(updateDateTime, 1000);
updateDateTime();

function setupSidebarToggle() {
	const hb = q('hamburger'),
		sb = q('sidebar');
	if (!hb || !sb) return;
	hb.onclick = () => {
		if (sb.classList.contains('open')) {
			sb.classList.remove('open');
			const overlay = document.getElementById('drawerOverlay');
			if (overlay) overlay.remove();
			return;
		}
		const o = document.createElement('div');
		o.id = 'drawerOverlay';
		o.style.position = 'fixed';
		o.style.inset = '0';
		o.style.zIndex = '9998';
		o.style.background = 'rgba(0,0,0,0.18)';
		o.addEventListener('click', () => {
			sb.classList.remove('open');
			o.remove();
		});
		document.body.appendChild(o);
		sb.classList.add('open');
	};
}

function buildTopNav() {
	const top = q('topNav');
	if (!top) return;
	top.innerHTML = '';
	const items = Array.from(document.querySelectorAll('#sideNav .nav-item'));
	items.forEach(b => {
		const btn = document.createElement('button');
		btn.className = 'nav-btn';
		btn.dataset.view = b.dataset.view;
		btn.textContent = b.innerText.trim();
		btn.type = 'button';
		btn.addEventListener('click', () => {
			if (!isLoggedIn()) {
				showOverlay(true, true);
				return;
			}
			if (btn.dataset.view === 'profile') {
				populateProfile();
				bindProfileControls();
			}
			if (btn.dataset.view === 'settings') populateSettings();
			showView(btn.dataset.view);
		});
		top.appendChild(btn);
	});
}

const views = ['dashboard', 'inventory', 'profile', 'settings', 'reports', 'calendar', 'users'];

function showView(name) {
	if (!isLoggedIn()) {
		showOverlay(true, true);
		return;
	}
	views.forEach(v => {
		const el = q('view-' + v);
		if (el) el.classList.toggle('hidden', v !== name);
	});
	document.querySelectorAll('#sideNav .nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
	document.querySelectorAll('#topNav .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));

	if (name === 'dashboard') {
		renderStockChart();
		renderBestSellerChart();
		renderDashboard();
		setTimeout(addAllChartDownloadBtns, 300);
	}
	if (name === 'reports') {
		renderReports();
	}
	if (name === 'orders') {
		renderOrders();
	}
	if (name === 'calendar') {
		renderCalendar();
		renderCalendarForMonth(currentCalendarYear, currentCalendarMonth);
	}
	if (name === 'profile') {
		populateProfile();
		bindProfileControls();
	}
}

async function fetchAllIngredientsMap() {
	try {
		const resp = await apiFetch('/api/ingredients?limit=1000&page=1');
		const items = (resp && resp.items) ? resp.items : [];
		const map = {};
		items.forEach(i => {
			map[i.id] = i;
		});
		return {
			items,
			map
		};
	} catch (e) {
		console.error('fetchAllIngredientsMap err', e);
		const fallback = (DB && DB.ingredients) ? DB.ingredients : [];
		const map = {};
		fallback.forEach(i => map[i.id] = i);
		return {
			items: fallback,
			map
		};
	}
}
async function renderActivity(limit = 6) {
	const container = q('recentActivity');
	if (!container) return;

	const sess = getSession();
	if (!sess || !sess.username) {
		container.innerHTML = `
      <li class="muted" style="padding:12px">
        Sign in to see recent activity.
        <div style="margin-top:8px">
          <button id="ctaSignInForActivity" class="btn small primary" type="button">Sign in</button>
          <button id="ctaShowLocalActivity" class="btn small ghost" type="button" style="margin-left:8px">Show local demo</button>
        </div>
      </li>`;
		q('ctaSignInForActivity')?.addEventListener('click', () => showOverlay(true, true));
		q('ctaShowLocalActivity')?.addEventListener('click', () => {
			const items = (DB && Array.isArray(DB.activity)) ? DB.activity.slice(0, limit) : [];
			if (!items.length) {
				container.innerHTML = '<li class="muted">No local activity available.</li>';
				return;
			}
			container.innerHTML = items.map(a => {
				const time = a.time ? new Date(a.time).toLocaleString() : '';
				return `<li><div>${escapeHtml(a.text||a.ingredient_name||'')}</div><div class="muted small">${escapeHtml(time)}</div></li>`;
			}).join('');
		});
		return;
	}

	container.innerHTML = '<li class="muted">Loading…</li>';
	try {
		const resp = await apiFetch(`/api/activity?limit=${limit}`);
		const items = (resp && resp.items) ? resp.items : [];
		if (!items.length) {
			const fallback = (DB && Array.isArray(DB.activity)) ? DB.activity.slice(0, limit) : [];
			if (fallback.length) {
				container.innerHTML = fallback.map(a => {
					const time = a.time ? new Date(a.time).toLocaleString() : '';
					return `<li><div>${escapeHtml(a.text||a.ingredient_name||'')}</div><div class="muted small">${escapeHtml(time)}</div></li>`;
				}).join('');
				return;
			}
			container.innerHTML = '<li class="muted">No recent activity</li>';
			return;
		}

		container.innerHTML = items.slice(0, limit).map(a => {
			const time = a.time ? new Date(a.time).toLocaleString() : '';
			const left = escapeHtml(a.text || a.ingredient_name || (a.username ? `${a.username}` : ''));
			return `<li><div>${left}</div><div class="muted small">${escapeHtml(time)}</div></li>`;
		}).join('');

	} catch (err) {
		console.error('renderActivity error:', err);
		if (err && err.status === 401) {
			container.innerHTML = '<li class="muted">You must sign in to view activity. <button class="btn small primary" id="act-signin">Sign in</button></li>';
			q('act-signin')?.addEventListener('click', () => showOverlay(true, true));
			return;
		}
		const fallback = (DB && Array.isArray(DB.activity)) ? DB.activity.slice(0, limit) : [];
		if (fallback.length) {
			container.innerHTML = fallback.map(a => {
				const time = a.time ? new Date(a.time).toLocaleString() : '';
				return `<li><div>${escapeHtml(a.text||a.ingredient_name||'')}</div><div class="muted small">${escapeHtml(time)}</div></li>`;
			}).join('');
			notify('Showing local demo activity (server failed).');
			return;
		}

		container.innerHTML = '<li class="muted">Failed to load activity</li>';
	}
}

function _parseQtyFromText(text) {
	if (!text) return 0;
	const m = text.match(/(\d+(?:\.\d+)?)/);
	if (!m) return 0;
	return parseFloat(m[1]) || 0;
}

// NOTE: renderStockChart is defined below (live version). The old duplicate has been removed.


async function renderBestSellerChart() {

	const ctx = q('bestSellerChart')?.getContext('2d');
	if (!ctx) return;
	try {
		const [ingsResp, actResp] = await Promise.all([
			apiFetch('/api/ingredients?limit=1000&page=1'),
			apiFetch('/api/activity?limit=2000')
		]);
		const ingredients = (ingsResp && ingsResp.items) ? ingsResp.items : [];
		const act = (actResp && actResp.items) ? actResp.items : [];

		const usageMap = {};

		act.forEach(a => {
			const txt = (a.text || '').toLowerCase();
			const qty = _parseQtyFromText(a.text || '') || 0;
			if (qty === 0) return;
			if (!a.ingredient_id) return;

			if (txt.includes('used') || txt.includes('stock out')) {
				usageMap[a.ingredient_id] = (usageMap[a.ingredient_id] || 0) + qty;
			}
		});

		const usageArr = Object.keys(usageMap).map(k => ({
			id: Number(k),
			qty: usageMap[k]
		}));
		usageArr.sort((a, b) => b.qty - a.qty);
		const top = usageArr.slice(0, 8);
		const labels = top.map(x => {
			const ing = ingredients.find(i => Number(i.id) === Number(x.id));
			return ing ? (ing.name || `#${x.id}`) : `#${x.id}`;
		});
		const data = top.map(x => +(x.qty.toFixed(3)));

		if (chartBestSeller) try {
			chartBestSeller.destroy();
		} catch (e) {}
		chartBestSeller = new Chart(ctx, {
			type: 'pie',
			data: {
				labels,
				datasets: [{
					data,
					backgroundColor: generateColors(data.length)
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'bottom'
					}
				}
			}
		});

	} catch (e) {
		console.error('renderBestSellerChart err', e);
		if (chartBestSeller) try {
			chartBestSeller.destroy();
			chartBestSeller = null;
		} catch (e) {}
	}
}

async function renderDashboard() {
	try {
		const [totalResp, lowResp, expResp, equipResp] = await Promise.all([
			apiFetch('/api/ingredients?type=ingredient&limit=1&page=1'),
			apiFetch('/api/ingredients?filter=low&limit=1&page=1'),
			apiFetch('/api/ingredients?filter=expiring&limit=1&page=1'),
			apiFetch('/api/ingredients?type=equipment&limit=1&page=1')
		].map(p => p.catch(e => null)).map(async req => req ? req : null).map(x => x));

		const total = totalResp && totalResp.meta ? totalResp.meta.total : ((DB.ingredients && DB.ingredients.length) || 0);
		const low = lowResp && lowResp.meta ? lowResp.meta.total : 0;
		const exp = expResp && expResp.meta ? expResp.meta.total : 0;
		const equipmentCount = equipResp && equipResp.meta ? equipResp.meta.total : 0;

		if (q('kpi-total-ing')) q('kpi-total-ing').textContent = total;
		if (q('kpi-low')) q('kpi-low').textContent = low;
		if (q('kpi-exp')) q('kpi-exp').textContent = exp;
		if (q('kpi-equipment')) q('kpi-equipment').textContent = equipmentCount;

		// #6 — Calculate total inventory value (requires unit_cost set on ingredients)
		try {
			const valResp = await apiFetch('/api/ingredients?type=ingredient&limit=1000&page=1');
			const allIngs = (valResp && valResp.items) ? valResp.items : [];
			const total_val = allIngs.reduce((sum, i) => {
				if (i.unit_cost != null && i.qty != null) return sum + (Number(i.unit_cost) * Number(i.qty));
				return sum;
			}, 0);
			if (q('kpi-inv-value')) {
				q('kpi-inv-value').textContent = total_val > 0 ? `₱${total_val.toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '—';
			}
		} catch (_) {}
		const emptyEl = document.getElementById('dashboardEmptyState');
		if (total === 0) {
			if (!emptyEl) {
				const kpiRow = document.querySelector('#view-dashboard .kpi-row');
				if (kpiRow) {
					const div = document.createElement('div');
					div.id = 'dashboardEmptyState';
					div.className = 'card';
					div.style.cssText = 'text-align:center;padding:40px 24px;margin-top:16px';
					div.innerHTML = `
						<div style="font-size:48px;margin-bottom:12px">🥐</div>
						<h3 style="margin:0 0 8px;font-size:18px">Welcome to Eric's Bakery!</h3>
						<p class="muted" style="margin:0 0 20px;max-width:400px;display:inline-block">Your inventory is empty. Get started by adding your first ingredient, then set a minimum quantity to enable low-stock alerts.</p>
						<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
							<button class="btn primary" id="emptyStateAddBtn" type="button"><i class="fa fa-plus" style="margin-right:6px"></i>Add first ingredient</button>
							<button class="btn ghost" id="emptyStateInvBtn" type="button"><i class="fa fa-boxes-stacked" style="margin-right:6px"></i>Go to Inventory</button>
						</div>
						<div class="muted small" style="margin-top:20px;opacity:.7">Quick start: Add Ingredient → Set Min Qty → Do a Stock-In</div>`;
					kpiRow.insertAdjacentElement('afterend', div);
					document.getElementById('emptyStateAddBtn')?.addEventListener('click', () => {
						showView('inventory');
						setTimeout(openAddIngredient, 120);
					});
					document.getElementById('emptyStateInvBtn')?.addEventListener('click', () => showView('inventory'));
				}
			} else {
				emptyEl.style.display = '';
			}
		} else if (emptyEl) {
			emptyEl.style.display = 'none';
		}
		const kpiNav = [
			{ id: 'kpi-total-ing', filter: 'all', type: 'ingredient' },
			{ id: 'kpi-low', filter: 'low', type: null },
			{ id: 'kpi-exp', filter: 'expiring', type: null },
			{ id: 'kpi-equipment', filter: 'all', type: 'equipment' }
		];
		kpiNav.forEach(({ id, filter, type }) => {
			const card = q(id)?.closest('.kpi-card');
			if (!card) return;
			card.style.cursor = 'pointer';
			card.title = 'Click to view in Inventory';
			card.onclick = () => {
				showView('inventory');
				setTimeout(() => {
					// Set type radio
					if (type) {
						const radio = document.querySelector(`input[name="invType"][value="${type}"]`);
						if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
					}
					// Set chip filter
					document.querySelectorAll('.filter-chips .chip').forEach(c => {
						c.classList.toggle('active', c.dataset.filter === filter);
					});
					renderIngredientCards(1, INVENTORY_PAGE_LIMIT);
				}, 80);
			};
		});

		await renderStockChart();
		await renderBestSellerChart();
		await renderActivity(6);

	} catch (e) {
		console.error('renderDashboard err', e);

		try {
			if (q('kpi-total-ing')) q('kpi-total-ing').textContent = (DB.ingredients || []).length;
			if (q('kpi-low')) q('kpi-low').textContent = (DB.ingredients || []).filter(i => i.qty <= i.min).length;
			renderStockChart();
			renderBestSellerChart();
			renderActivity(6);
		} catch (_) {}
	}
}

/* async function fetchAllIngredientsMap() {
	try {
		const resp = await apiFetch('/api/ingredients?limit=1000&page=1');
		const items = (resp && resp.items) ? resp.items : [];
		const map = {};
		items.forEach(i => {
			map[i.id] = i;
		});
		return {
			items,
			map
		};
	} catch (e) {
		console.error('fetchAllIngredientsMap err', e);

		const fallback = (DB && DB.ingredients) ? DB.ingredients : [];
		const map = {};
		fallback.forEach(i => map[i.id] = i);
		return {
			items: fallback,
			map
		};
	}
} */

/* async function renderActivity(limit = 6) {

	const container = q('recentActivity');
	if (!container) return;
	container.innerHTML = '<li class="muted">Loading…</li>';
	try {
		const resp = await apiFetch(`/api/activity?limit=${limit}`);
		const items = (resp && resp.items) ? resp.items : [];
		if (items.length === 0) {
			container.innerHTML = '<li class="muted">No recent activity</li>';
			return;
		}
		container.innerHTML = items.slice(0, limit).map(a => {
			const time = a.time ? new Date(a.time).toLocaleString() : '';

			const left = escapeHtml(a.text || a.ingredient_name || '');
			return `<li><div>${left}</div><div class="muted small">${escapeHtml(time)}</div></li>`;
		}).join('');
	} catch (e) {
		console.error('renderActivity err', e);
		container.innerHTML = '<li class="muted">Failed to load activity</li>';
	}
} */

/* function _parseQtyFromText(text) {
	if (!text) return 0;

	const m = text.match(/(\d+(?:\.\d+)?)/);
	if (!m) return 0;
	return parseFloat(m[1]) || 0;
} */

function debounce(fn, wait = 250) {
	let t = null;
	return function(...args) {
		clearTimeout(t);
		t = setTimeout(() => fn.apply(this, args), wait);
	};
}

function renderPaginationControls(container, meta, onPageClick) {

	const pages = meta.totalPages || 1;
	const current = meta.page || 1;
	const maxButtons = 4;

	if (!container) return;

	if (pages <= 1) {
		container.innerHTML = '';
		return;
	}

	let start = Math.max(1, current - Math.floor(maxButtons / 2));
	let end = start + maxButtons - 1;
	if (end > pages) {
		end = pages;
		start = Math.max(1, end - maxButtons + 1);
	}

	const btns = [];

	btns.push(`<button class="btn small" data-page="${Math.max(1, current-1)}" ${current===1? 'disabled':''}>&lt;</button>`);
	if (start > 1) btns.push(`<button class="btn small" data-page="1">1</button>${start>2?'<span class="muted small" style="padding:0 6px">…</span>':''}`);
	for (let p = start; p <= end; p++) {
		btns.push(`<button class="btn small" data-page="${p}" ${p===current? 'aria-current="true" style="font-weight:900;"':''}>${p}</button>`);
	}
	if (end < pages) btns.push(`${end < pages-1?'<span class="muted small" style="padding:0 6px">…</span>':''}<button class="btn small" data-page="${pages}">${pages}</button>`);

	btns.push(`<button class="btn small" data-page="${Math.min(pages, current+1)}" ${current===pages? 'disabled':''}>&gt;</button>`);

	container.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${btns.join('')}</div>`;

	for (const b of Array.from(container.querySelectorAll('button[data-page]'))) {
		b.addEventListener('click', (e) => {
			const p = Number(e.currentTarget.dataset.page || 1);
			if (onPageClick) onPageClick(p);
		});
	}
}

async function renderIngredientCards(page = 1, limit = INVENTORY_PAGE_LIMIT) {
	const container = q('ingredientList');
	if (!container) return;

	const qv = (q('searchIng')?.value || '').trim();
	const chip = document.querySelector('.filter-chips .chip.active')?.dataset.filter || 'all';
	const invType = document.querySelector('input[name="invType"]:checked')?.value || 'all';

	// Responsive table styles are in styles.css — no JS injection needed

	container.innerHTML = `<div class="card muted">Loading inventory…</div>`;

	try {
		const params = new URLSearchParams();
		params.set('page', String(page));
		params.set('limit', String(limit));
		if (invType && invType !== 'all') params.set('type', invType);
		if (chip && chip !== 'all') params.set('filter', chip);
		if (qv) params.set('search', qv);

		const res = await apiFetch(`/api/ingredients?${params.toString()}`);
    let items = (res && res.items) ? res.items : [];

    items.sort((a, b) => {
      const ia = Number(a?.id ?? 0);
      const ib = Number(b?.id ?? 0);
      if (Number.isFinite(ia) && Number.isFinite(ib)) return ia - ib;
      
      return String(a?.id || '').localeCompare(String(b?.id || ''), undefined, { numeric: true });
    });

    const meta = (res && res.meta) ? res.meta : {
			total: items.length,
			page: page,
			limit,
			totalPages: Math.ceil(items.length / limit)
		};

		const header = `
      <div class="inv-header">
        <div class="inv-filters">
          <label><input type="radio" name="invType" value="all" ${invType==='all'?'checked':''}/> All</label>
          <label><input type="radio" name="invType" value="ingredient" ${invType==='ingredient'?'checked':''}/> Ingredients</label>
          <label><input type="radio" name="invType" value="packaging" ${invType==='packaging'?'checked':''}/> Packaging</label>
          <label><input type="radio" name="invType" value="equipment" ${invType==='equipment'?'checked':''}/> Equipment</label>
          <label><input type="radio" name="invType" value="maintenance" ${invType==='maintenance'?'checked':''}/> Maintenance</label>
        </div>
        <div class="inv-actions">
          <button class="btn small" id="exportInventoryCsvBtn" type="button">Export CSV</button>
          <button class="btn small" id="printInventoryBtn" type="button">Print / Save PDF</button>
        </div>
      </div>
    `;

		const showDelete = isDeleteModeEnabled() && canUseDeleteMode();

		const tableHead = `
      <div class="inv-table-wrap">
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
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Cost/unit</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">In</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Out</th>
            <th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)">Actions</th>
            ${showDelete ? '<th style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)"></th>' : ''}
          </tr>
        </thead>
      <tbody>
    `;

		const rowsHtml = items.map(i => {
			const isMaterial = (i.type === 'ingredient');
			const threshold = isMaterial ? computeThresholdForIngredient(i) : '';
			const lowBadge = (isMaterial && (Number(i.qty || 0) <= (Number(i.min_qty || 0) || threshold))) ? '<span class="badge low">Low</span>' : '';

			// #7 — Expiry urgency: critical (≤3d) / expiring (≤7d) / soon (≤30d)
			let expiryNote = '';
			if (isMaterial && i.expiry) {
				const dLeft = daysUntil(i.expiry);
				if (dLeft <= 3 && dLeft >= 0) {
					expiryNote = `<div style="font-size:11px;font-weight:800;color:#dc2626">⚠ CRITICAL ${dLeft}d</div>`;
				} else if (dLeft <= 7 && dLeft >= 0) {
					expiryNote = `<div style="font-size:11px;font-weight:700;color:#dc2626">${dLeft}d left</div>`;
				} else if (dLeft <= 30 && dLeft >= 0) {
					expiryNote = `<div style="font-size:11px;color:#b45309">${dLeft}d left</div>`;
				} else if (dLeft < 0) {
					expiryNote = `<div style="font-size:11px;font-weight:800;color:#7f1d1d">EXPIRED</div>`;
				}
			}

			// #8 — Days until stockout forecast
			let forecastNote = '';
			if (isMaterial && typeof computeThresholdForIngredient === 'function') {
				try {
					const dailyRate = (() => {
						const now = new Date();
						const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
						const hist = (DB.activity || []).filter(a => a.ingredient_id === i.id && new Date(a.time) >= cutoff);
						let total = 0;
						hist.forEach(a => {
							const textL = String(a.text || '').toLowerCase();
							const m = String(a.text || '').match(/([0-9]*\.?[0-9]+)/);
							if (m && (textL.includes('stock out') || textL.includes('used'))) total += Number(m[0]) || 0;
						});
						return total / 7;
					})();
					if (dailyRate > 0.001) {
						const daysLeft = Math.floor(Number(i.qty || 0) / dailyRate);
						if (daysLeft <= 14) {
							const color = daysLeft <= 3 ? '#dc2626' : daysLeft <= 7 ? '#b45309' : '#16a34a';
							forecastNote = `<div style="font-size:11px;color:${color};font-weight:600">~${daysLeft}d stock</div>`;
						}
					}
				} catch (_) {}
			}

			return `<tr data-id="${i.id}" data-type="${escapeHtml(i.type||'')}" style="background:var(--card);border-bottom:1px solid rgba(0,0,0,0.04)">
        <td data-label="ID" style="padding:10px;vertical-align:middle">${i.id}</td>
        <td data-label="Name" style="padding:10px;vertical-align:middle"><strong>${escapeHtml(i.name)}</strong><div class="muted small">${escapeHtml(i.type)}</div></td>
        <td data-label="Supplier" style="padding:10px;vertical-align:middle">${isMaterial ? escapeHtml(i.supplier||'—') : ''}</td>
        <td data-label="Qty" style="padding:10px;vertical-align:middle"><span class="qty-value">${i.qty}</span>${expiryNote}${forecastNote}${lowBadge ? ' '+lowBadge : ''}</td>
        <td data-label="Unit" style="padding:10px;vertical-align:middle">${isMaterial ? escapeHtml(i.unit||'') : ''}</td>
        <td data-label="Threshold" style="padding:10px;vertical-align:middle">${isMaterial ? threshold : ''}</td>
        <td data-label="Min" style="padding:10px;vertical-align:middle">${isMaterial ? `<input class="min-input" type="number" value="${i.min_qty||0}" step="0.01" style="width:80px" />` : ''}</td>
        <td data-label="Cost/unit" style="padding:10px;vertical-align:middle">${isMaterial && i.unit_cost != null ? `<span class="muted small">₱${Number(i.unit_cost).toFixed(2)}</span>` : (isMaterial ? '<span class="muted small" style="opacity:.4">—</span>' : '')}</td>
        <td data-label="In" style="padding:10px;vertical-align:middle"><input class="in-input" type="number" step="0.01" style="width:90px" /></td>
        <td data-label="Out" style="padding:10px;vertical-align:middle"><input class="out-input" type="number" step="0.01" style="width:90px" /></td>
        <td data-label="Actions" style="padding:10px;vertical-align:middle">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <button class="btn small save-row" type="button">Save</button>
            <button class="btn small soft details-btn" data-id="${i.id}" type="button">Details</button>
            <button class="btn small soft edit-btn" type="button">Edit</button>
          </div>
        </td>
        ${showDelete ? `<td data-label="Delete" style="padding:10px;vertical-align:middle"><button class="btn small danger delete-row" data-id="${i.id}" data-name="${escapeHtml(i.name)}" type="button" title="Delete ${escapeHtml(i.name)}"><i class="fa fa-trash"></i></button></td>` : ''}
      </tr>`;
		}).join('') || `<tr><td colspan="${showDelete ? 12 : 11}" class="muted" style="padding:12px">No inventory items</td></tr>`;

		const tableFooter = `</tbody></table></div>`;

		const paginationWrap = `<div id="invPagination" style="margin-top:12px;display:flex;justify-content:center"></div>`;

		container.innerHTML = header + tableHead + rowsHtml + tableFooter + paginationWrap;

		// #18 — Debounce invType radio so rapid switching doesn't hammer the API
		const _debouncedRender = debounce(() => renderIngredientCards(1, limit), 200);
		Array.from(container.querySelectorAll('input[name="invType"]')).forEach(r => {
			r.addEventListener('change', _debouncedRender);
		});

		container.querySelectorAll('button.save-row').forEach(btn => {
			btn.addEventListener('click', async (ev) => {
				const tr = ev.currentTarget.closest('tr');
				if (!tr) return;
				const id = Number(tr.dataset.id);
				const inVal = Number(tr.querySelector('.in-input')?.value || 0);
				const outVal = Number(tr.querySelector('.out-input')?.value || 0);
				const minInput = tr.querySelector('.min-input');
				const newMin = minInput ? Number(minInput.value || 0) : null;

				try {
					if (newMin !== null && !Number.isNaN(newMin)) {
						await apiFetch(`/api/ingredients/${id}`, {
							method: 'PUT',
							body: {
								min_qty: Number(newMin)
							}
						});
					}
					if (inVal > 0) {
						// Use applyStockChange so the undo bar appears
						applyStockChange(id, 'in', Number(inVal), 'Stock-in');
					} else if (outVal > 0) {
						// Use applyStockChange so the undo bar appears
							applyStockChange(id, 'out', Number(outVal), 'Stock-out');
					} else {
						// Only min threshold changed — no stock movement
						notify('Min threshold updated');
					await renderIngredientCards(meta.page || page, limit);
					await renderInventoryActivity();
					}
				} catch (err) {
					console.error('save-row api error', err);
					notify(err.message || 'Server error');
				}
			});
		});

		container.querySelectorAll('.details-btn').forEach(btn => {
			btn.addEventListener('click', async () => {
				const id = Number(btn.dataset.id);
				try {
					const ing = items.find(x => Number(x.id) === id) || {};
					const historyResp = await apiFetch(`/api/activity?limit=50`);

					const history = (historyResp && historyResp.items) ? historyResp.items.filter(a => Number(a.ingredient_id) === id) : [];
					const histHtml = history.length ? history.slice().map(h => `<li>${escapeHtml(h.text)} <div class="muted small">${escapeHtml(new Date(h.time).toLocaleString())}</div></li>`).join('') : '<li class="muted">No history</li>';
					const attrs = ing.attrs ? (typeof ing.attrs === 'string' ? (() => {
						try {
							return JSON.parse(ing.attrs)
						} catch (e) {
							return {};
						}
					})() : ing.attrs) : {};
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
					q('closeDetails')?.addEventListener('click', closeModal, {
						once: true
					});
				} catch (err) {
					console.error('details fetch error', err);
					notify('Could not load details');
				}
			});
		});

		container.querySelectorAll('.edit-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const tr = e.currentTarget.closest('tr');
				if (!tr) return;
				const id = Number(tr.dataset.id);
				openEditIngredient(id);
			});
		});

		// ── Delete row ──────────────────────────────────────
		container.querySelectorAll('.delete-row').forEach(btn => {
			btn.addEventListener('click', async (e) => {
				const id = Number(btn.dataset.id);
				const name = btn.dataset.name || `#${id}`;
				if (!canUseDeleteMode()) { notify('Only Owners can delete items.'); return; }
				if (!confirm(`Permanently delete "${name}"?\nThis cannot be undone.`)) return;
				try {
					btn.disabled = true;
					btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
					await deleteIngredientAPI(id);
					notify(`"${name}" deleted`);
					await renderIngredientCards(meta.page || page, limit);
					await renderInventoryActivity();
				} catch (err) {
					btn.disabled = false;
					btn.innerHTML = '<i class="fa fa-trash"></i>';
					notify(err.message || 'Delete failed');
				}
			});
		});

		q('exportInventoryCsvBtn')?.addEventListener('click', () => {
			const qs = new URLSearchParams();
			if (invType && invType !== 'all') qs.set('type', invType);
			if (chip && chip !== 'all') qs.set('filter', chip);
			if (qv) qs.set('search', qv);
			window.open(`/api/ingredients/export/csv?${qs.toString()}`, '_self');
		});

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
				iframe.style.position = 'fixed';
				iframe.style.right = '0';
				iframe.style.bottom = '0';
				iframe.style.width = '0';
				iframe.style.height = '0';
				iframe.style.border = '0';
				iframe.setAttribute('aria-hidden', 'true');
				document.body.appendChild(iframe);
				try {
					iframe.srcdoc = html;
				} catch (e) {
					const idoc = iframe.contentWindow.document;
					idoc.open();
					idoc.write(html);
					idoc.close();
				}
				setTimeout(() => {
					try {
						iframe.contentWindow.focus();
						iframe.contentWindow.print();
					} catch (e) {
						try {
							window.print();
						} catch (e2) {}
					}
					setTimeout(() => iframe.remove(), 800);
				}, 500);
			} catch (err) {
				console.error('print error', err);
				notify('Could not prepare print');
			}
		});

		const pagWrap = q('invPagination');
		renderPaginationControls(pagWrap, meta, (p) => {
			renderIngredientCards(p, limit);
			const top = container.getBoundingClientRect().top + window.scrollY - 80;
			window.scrollTo({
				top,
				behavior: 'smooth'
			});
		});

		const searchEl = q('searchIng');
		if (searchEl) {
			searchEl.oninput = debounce(() => {
				renderIngredientCards(1, limit);
			}, 300);
		}

	} catch (err) {
		console.error('renderIngredientCards error', err);
		container.innerHTML = `<div class="card muted">Failed to load inventory</div>`;
	}
}

function initSearchFeature() {
	const wrap = ensureSuggestionContainer();
	attachTopSearchHandlers();
	if (q('view-orders')) ensureOrdersView();
}

function openOrderDetailModal(order) {
	const date = new Date(order.date).toLocaleString();
	const itemsHtml = order.items.map(i => {
		const p = DB.products.find(pp => pp.id === i.product_id) || {
			name: 'Unknown'
		};
		return `<li>${p.name} — ${i.qty}pcs</li>`;
	}).join('');
	openModalHTML(`<h3>Order #${order.id}</h3><div class="muted small">${order.customer} • ${date}</div><div style="margin-top:10px"><h4>Items</h4><ul>${itemsHtml}</ul></div><div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button class="btn primary" id="fulfillOrderBtn" type="button">Mark fulfilled</button><button class="btn ghost" id="cancelOrderView" type="button">Close</button></div>`);
	q('cancelOrderView')?.addEventListener('click', closeModal);
	q('fulfillOrderBtn')?.addEventListener('click', () => {
		DB.activity.push({
			text: `Order #${order.id} fulfilled`,
			time: new Date().toLocaleString()
		});
		order.items.forEach(it => {
			const p = DB.products.find(pp => pp.id === it.product_id);
			if (p) p.stock = Math.max(0, (p.stock || 0) - it.qty);
			const prod = DB.products.find(pp => pp.id === it.product_id);
			if (prod && prod.recipe) {
				prod.recipe.forEach(r => {
					const ing = DB.ingredients.find(ii => ii.id === r.ingredient_id);
					if (ing) {
						const used = +(r.qty_per_unit * it.qty);
						ing.qty = +(Math.max(0, ing.qty - used)).toFixed(3);
						DB.activity.push({
							text: `Used ${used} ${ing.unit} — ${ing.name}`,
							time: new Date().toLocaleString(),
							ingredient_id: ing.id
						});
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

function openNewOrderModal() {
	const prodOptions = DB.products.map(p => `<option value="${p.id}">${p.name} (₱${p.price})</option>`).join('');
	openModalHTML(`<h3>New Order</h3>
    <form id="newOrderForm" class="form">
      <label class="field"><span class="field-label">Customer</span><input id="orderCustomer" type="text" placeholder="Customer name" /></label>
      <label class="field"><span class="field-label">Product</span><div style="display:flex;gap:8px"><select id="orderProd">${prodOptions}</select><input id="orderQty" type="number" value="1" min="1" style="width:90px" /></div></label>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px"><button class="btn primary" type="submit">Create</button><button class="btn ghost" id="cancelNewOrder" type="button">Cancel</button></div>
    </form>`);
	q('cancelNewOrder')?.addEventListener('click', closeModal);
	q('newOrderForm')?.addEventListener('submit', (e) => {
		e.preventDefault();
		const cust = q('orderCustomer')?.value || 'Walk-in';
		const pid = Number(q('orderProd')?.value);
		const qty = Number(q('orderQty')?.value) || 1;
		const prod = DB.products.find(p => p.id === pid);
		const total = (prod?.price || 0) * qty;
		const newOrder = {
			id: nextOrderId(),
			date: new Date().toISOString(),
			items: [{
				product_id: pid,
				qty
			}],
			customer: cust,
			total
		};
		sampleOrders.push(newOrder);
		DB.activity.push({
			text: `Order #${newOrder.id} created (${cust})`,
			time: new Date().toLocaleString()
		});
		closeModal();
		renderOrders();
		notify('Order created');
		renderReports();
		renderStockChart();
		renderBestSellerChart();
	});
}

function aggregateSalesRange(startISO, endISO) {
	const start = new Date(startISO);
	start.setHours(0, 0, 0, 0);
	const end = new Date(endISO);
	end.setHours(0, 0, 0, 0);
	const days = [];
	const map = {};
	const cur = new Date(start);
	while (cur <= end) {
		const key = cur.toISOString().slice(0, 10);
		days.push(key);
		map[key] = 0;
		cur.setDate(cur.getDate() + 1);
	}
	sampleOrders.forEach(o => {
		const day = o.date.slice(0, 10);
		if (map[day] !== undefined) {
			const s = o.items.reduce((acc, i) => acc + (i.qty || 0), 0);
			map[day] += s;
		}
	});
	return {
		labels: days,
		data: days.map(d => map[d] || 0)
	};
}

async function renderStockChart(rangeStart, rangeEnd) {
	const ctx = q('stockChart')?.getContext('2d');
	if (!ctx) return;
	const end = rangeEnd ? new Date(rangeEnd) : new Date();
	end.setHours(0, 0, 0, 0);
	const start = rangeStart ? new Date(rangeStart) : new Date(end);
	start.setDate(end.getDate() - 6);
	start.setHours(0, 0, 0, 0);

	const days = [];
	const map = {};
	const cur = new Date(start);
	while (cur <= end) {
		const key = cur.toISOString().slice(0, 10);
		days.push(key);
		map[key] = 0;
		cur.setDate(cur.getDate() + 1);
	}

	try {
		const resp = await apiFetch('/api/activity?limit=2000');
		const items = (resp && resp.items) ? resp.items : [];

		items.forEach(a => {
			if (!a.time) return;
			const d = new Date(a.time);
			d.setHours(0, 0, 0, 0);
			const key = d.toISOString().slice(0, 10);
			if (map[key] === undefined) return;
			const txt = (a.text || '').toLowerCase();
			const qty = _parseQtyFromText(a.text || '') || 0;
			if (qty === 0) return;
			if (txt.includes('stock out') || txt.includes('used')) map[key] -= qty;
			else if (txt.includes('stock in')) map[key] += qty;
		});

		const labels = days;
		const data = days.map(d => Math.max(0, Math.round((map[d] || 0) * 100) / 100));

		if (chartStock) try {
			chartStock.destroy();
		} catch (e) {}
		chartStock = new Chart(ctx, {
			type: 'bar',
			data: {
				labels,
				datasets: [{
					label: 'Net units (in-out)',
					data,
					borderWidth: 0,
					backgroundColor: 'rgba(27,133,236,0.85)'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true
					}
				},
				plugins: {
					legend: {
						display: false
					}
				}
			}
		});

	} catch (e) {
		console.error('renderStockChart err', e);

		if (chartStock) try {
			chartStock.destroy();
			chartStock = null;
		} catch (e) {}
	}
}

/* async function renderBestSellerChart() {

	const ctx = q('bestSellerChart')?.getContext('2d');
	if (!ctx) return;
	try {
		const [ingsResp, actResp] = await Promise.all([
			apiFetch('/api/ingredients?limit=1000&page=1'),
			apiFetch('/api/activity?limit=2000')
		]);
		const ingredients = (ingsResp && ingsResp.items) ? ingsResp.items : [];
		const act = (actResp && actResp.items) ? actResp.items : [];

		const usageMap = {};

		act.forEach(a => {
			const txt = (a.text || '').toLowerCase();
			const qty = _parseQtyFromText(a.text || '') || 0;
			if (qty === 0) return;
			if (!a.ingredient_id) return;

			if (txt.includes('used') || txt.includes('stock out')) {
				usageMap[a.ingredient_id] = (usageMap[a.ingredient_id] || 0) + qty;
			}
		});

		const usageArr = Object.keys(usageMap).map(k => ({
			id: Number(k),
			qty: usageMap[k]
		}));
		usageArr.sort((a, b) => b.qty - a.qty);
		const top = usageArr.slice(0, 8);
		const labels = top.map(x => {
			const ing = ingredients.find(i => Number(i.id) === Number(x.id));
			return ing ? (ing.name || `#${x.id}`) : `#${x.id}`;
		});
		const data = top.map(x => +(x.qty.toFixed(3)));

		if (chartBestSeller) try {
			chartBestSeller.destroy();
		} catch (e) {}
		chartBestSeller = new Chart(ctx, {
			type: 'pie',
			data: {
				labels,
				datasets: [{
					data,
					backgroundColor: generateColors(data.length)
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'bottom'
					}
				}
			}
		});

	} catch (e) {
		console.error('renderBestSellerChart err', e);
		if (chartBestSeller) try {
			chartBestSeller.destroy();
			chartBestSeller = null;
		} catch (e) {}
	}
} */

async function apiFetch(path, opts = {}) {
	const cfg = Object.assign({}, opts);
	cfg.headers = Object.assign({}, cfg.headers || {}, {
		'Content-Type': 'application/json'
	});
	cfg.credentials = 'include';

	if (cfg.body && typeof cfg.body !== 'string') cfg.body = JSON.stringify(cfg.body);

	try {
		const pathStr = String(path || '');
		if (/\/api\/products/i.test(pathStr) || /\/api\/product/i.test(pathStr) || /\/api\/orders/i.test(pathStr) || /\/api\/order/i.test(pathStr)) {
			console.info('[apiFetch-block] Request to', pathStr, 'blocked by disabled-features patch.');
			return {
				items: [],
				meta: {
					total: 0,
					page: 1,
					limit: 0
				}
			};
		}
	} catch (e) {}

	const res = await fetch(path, cfg);

	const text = await res.text().catch(() => '');
	let json = null;
	try {
		json = text ? JSON.parse(text) : null;
	} catch (e) {
		json = null;
	}
	if (!res.ok) {
		const msg = (json && (json.error || json.message)) ? (json.error || json.message) : res.statusText || 'Request failed';
		const e = new Error(msg);
		e.status = res.status;
		e.body = json;
		throw e;
	}
	return json;
}

async function renderInventoryActivity(limit = 30) {
	const el = q('inventoryRecentActivity');
	if (!el) return;

	// #11 — Use date picker if present, otherwise default to today
	const picker = q('invHistoryDatePicker');
	const today = todayDateStr();
	const selectedDate = (picker && picker.value) ? picker.value : today;

	// Wire up date picker and Today button once
	if (picker && !picker._wired) {
		picker._wired = true;
		picker.value = today;
		picker.max = today;
		picker.addEventListener('change', () => renderInventoryActivity(limit));
		q('invHistoryTodayBtn')?.addEventListener('click', () => {
			picker.value = today;
			renderInventoryActivity(limit);
		});
	}

	const dateLabel = q('invHistoryDateLabel');
	if (dateLabel) dateLabel.textContent = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});

	const sess = getSession();
	if (!sess || !sess.username) {
		el.innerHTML = `
      <li class="muted" style="padding:12px">
        Sign in to view inventory activity.
        <div style="margin-top:8px"><button id="signInForInvActivity" class="btn small primary">Sign in</button></div>
      </li>`;
		q('signInForInvActivity')?.addEventListener('click', () => showOverlay(true, true));
		return;
	}

	el.innerHTML = '<li class="muted">Loading…</li>';
	try {
		const resp = await apiFetch(`/api/activity?limit=${limit}&start=${selectedDate}&end=${selectedDate}`);
		const allItems = (resp && resp.items) ? resp.items : [];

		const dayStart = new Date(selectedDate + 'T00:00:00');
		const dayEnd   = new Date(selectedDate + 'T23:59:59.999');
		const items = allItems.filter(it => {
			if (!it.time) return false;
			const d = new Date(it.time);
			return d >= dayStart && d <= dayEnd;
		}).slice(0, limit);

		if (!items.length) {
			const isToday = selectedDate === today;
			el.innerHTML = `<li class="muted" style="padding:10px">${isToday ? 'No activity yet today — edits you make will appear here.' : 'No activity on this day.'}</li>`;
			return;
		}
		el.innerHTML = items.map(it => {
			const time = it.time ? new Date(it.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
			const badge = it.action ? `<span class="inv-hist-badge inv-hist-badge--${(it.action||'').toLowerCase().replace(/\s+/g,'-')}">${escapeHtml(it.action)}</span>` : '';
			return `<li tabindex="0" role="listitem" style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.05);display:flex;align-items:flex-start;gap:8px">
				<div style="flex:1;min-width:0">
					<div style="font-size:13px">${badge} ${escapeHtml(it.text)}</div>
					${it.username ? `<div class="muted small" style="margin-top:2px">by <strong>${escapeHtml(it.username)}</strong></div>` : ''}
				</div>
				<div class="muted small" style="white-space:nowrap;padding-top:2px">${escapeHtml(time)}</div>
			</li>`;
		}).join('');
	} catch (err) {
		console.error('renderInventoryActivity err:', err);
		if (err && err.status === 401) {
			el.innerHTML = '<li class="muted">You must sign in to view activity. <button class="btn small primary" id="invact-signin">Sign in</button></li>';
			q('invact-signin')?.addEventListener('click', () => showOverlay(true, true));
			return;
		}
		el.innerHTML = '<li class="muted">Could not load activity.</li>';
	}
}


async function renderReports(rangeStart, rangeEnd, reportFilter) {
	const startInput = rangeStart || q('reportStart')?.value || null;
	const endInput = rangeEnd || q('reportEnd')?.value || null;
	const presetDays = Number(q('reportPreset')?.value || 30);
	const end = endInput ? new Date(endInput) : new Date();
	const start = startInput ? new Date(startInput) : new Date(end);
	if (!startInput) start.setDate(end.getDate() - (presetDays - 1));
	start.setHours(0, 0, 0, 0);
	end.setHours(23, 59, 59, 999);

	const filter = reportFilter || q('reportFilter')?.value || 'usage';

	try {
		const salesCard = q('salesTimelineChart') ? q('salesTimelineChart').closest('.card') : null;
		if (salesCard && salesCard.parentElement) salesCard.remove();
		try { chartSalesTimeline && chartSalesTimeline.destroy(); } catch (e) {}
		chartSalesTimeline = null;
	} catch (e) {}

	// Build per-ingredient stock-in and stock-out totals — fetch live from API
	const stockInMap  = {};
	const stockOutMap = {};
	try {
		const _startQ = start ? start.toISOString().slice(0,10) : '';
		const _endQ = end ? end.toISOString().slice(0,10) : '';
		const actResp = await apiFetch('/api/activity?limit=200' + (_startQ ? '&start='+_startQ+'&end='+_endQ : ''));
		const liveActivity = (actResp && actResp.items) ? actResp.items : [];
		if (actResp && actResp.meta && actResp.meta.total > 200) console.warn('[reports] activity truncated at 200 — consider a shorter date range');
		liveActivity.forEach(a => {
			const t = new Date(a.time || null);
			if (!t || t < start || t > end) return;
			const iid = Number(a.ingredient_id || 0);
		if (!iid) return;
		const action = String(a.action || '').toLowerCase();
		const text   = String(a.text   || '').toLowerCase();
			const m = String(a.text || '').match(/([0-9]*\.?[0-9]+)/g);
		const v = m ? (Number(m[0]) || 0) : 0;
			const isIn  = action === 'stock_in'  || text.includes('stock in');
			const isOut = action === 'stock_out' || text.includes('stock out') || text.includes('used for');
		if (isIn)  stockInMap[iid]  = (stockInMap[iid]  || 0) + v;
		if (isOut) stockOutMap[iid] = (stockOutMap[iid] || 0) + v;
		});
	} catch (e) {
		console.warn('[renderReports] could not fetch live activity:', e);
	}

	// Keep agg for the bar chart (stock-out totals used as "usage")
	let agg;
	if (typeof aggregateUsageFromActivity === 'function') {
		agg = aggregateUsageFromActivity(start.toISOString(), end.toISOString(), 50);
	} else {
		const arr = Object.keys(stockOutMap).map(k => ({
			id: Number(k),
			qty: stockOutMap[k]
		})).sort((a, b) => b.qty - a.qty).slice(0, 50);
		agg = {
			labels: arr.map(x => (DB.ingredients.find(i => i.id === x.id)?.name) || `#${x.id}`),
			data: arr.map(x => +(x.qty.toFixed(3))),
			raw: arr
		};
	}

	const ingCtx = q('ingredientUsageChart')?.getContext('2d');
	if (ingCtx) {
		try { if (chartIngredientUsage) chartIngredientUsage.destroy(); } catch (e) {}
		chartIngredientUsage = new Chart(ingCtx, {
			type: 'bar',
			data: {
				labels: agg.labels,
				datasets: [{
					label: 'Units used',
					data: agg.data,
					backgroundColor: generateColors(agg.data.length)
				}]
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				scales: { x: { beginAtZero: true } },
				plugins: { legend: { display: false } }
			}
		});
	}

	const summaryEl = q('reportSummary');
	if (summaryEl) {
		const totalStockIn  = +Object.values(stockInMap).reduce((s, v) => s + v, 0).toFixed(3);
		const totalStockOut = +Object.values(stockOutMap).reduce((s, v) => s + v, 0).toFixed(3);

		// ── Low stock alert list ──────────────────────────────────
		const lowItems = (DB.ingredients || []).filter(i => {
			if (!i) return false;
			const minVal = (i.min != null) ? i.min : computeThresholdForIngredient(i);
			return Number(i.qty || 0) <= Number(minVal || 0);
		});
		const criticalItems = lowItems.filter(i => Number(i.qty || 0) === 0);
		const lowAlertHTML = lowItems.length ? `
			<div style="margin-bottom:14px;border-radius:10px;overflow:hidden;border:1.5px solid rgba(249,115,22,.35)">
				<div style="background:rgba(249,115,22,.12);padding:8px 14px;display:flex;align-items:center;gap:8px">
					<span style="font-size:16px">⚠️</span>
      <span style="font-weight:800;color:#c2410c">
        ${lowItems.length} item${lowItems.length > 1 ? 's' : ''} at or below minimum stock${(criticalItems && criticalItems.length) ? ` · ${criticalItems.length} completely out` : ''}
      </span>
				</div>

				<div style="display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px;background:rgba(249,115,22,.04)">
					${lowItems.map(i => {
        const isEmpty = Number(i.qty || 0) === 0;
        // build the span with string concatenation to avoid nested backtick conflicts
        return (
          '<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;' +
          'background:' + (isEmpty ? 'rgba(239,68,68,.15)' : 'rgba(249,115,22,.15)') + ';' +
          'color:' + (isEmpty ? '#dc2626' : '#c2410c') + '">' +
            escapeHtml(i.name) + ' — ' + (i.qty ?? 0) + ' ' + escapeHtml(i.unit || '') + ' ' +
            (isEmpty ? '⛔' : '⚠️') +
          '</span>'
        );
					}).join('')}
				</div>
  </div>
` : '';

		const lowCount = (DB.ingredients || []).filter(i => {
			const minVal = (i && (i.min != null)) ? i.min : computeThresholdForIngredient(i);
			return Number(i.qty || 0) <= Number(minVal || 0);
		}).length;

		const expiringCount = (DB.ingredients || []).filter(i =>
			String(i.type || '').toLowerCase() === 'ingredient' &&
			i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= 30
		).length;

		const best = (agg.raw && agg.raw.length) ? (DB.ingredients.find(i => i.id === agg.raw[0].id)?.name || `#${agg.raw[0].id}`) : '—';

		let tableRows = (DB.ingredients || []).map(i => {
			if (!i) return null;

			const isIngredient   = String(i.type || '').toLowerCase() === 'ingredient';
			const minVal         = (i.min != null) ? i.min : computeThresholdForIngredient(i);
			const days           = i.expiry ? daysUntil(i.expiry) : null;
			const isLow          = Number(i.qty || 0) <= Number(minVal || 0);
			const isExpiring     = isIngredient && days !== null && days >= 0 && days <= 7;
			const isExpiringSoon = isIngredient && days !== null && days > 7 && days <= 30;

			if (filter === 'usage') {
				if (!isIngredient) return null;
				if (!((agg.raw || []).some(r => r.id === i.id))) return null;
			} else if (filter === 'low') {
				if (!isLow) return null;
			} else if (filter === 'expiring') {
				if (!isIngredient) return null;
				if (!(i.expiry && days >= 0 && days <= 30)) return null;
			} else if (filter === 'all') {
			} else {
				if (!isIngredient) return null;
				if (!((agg.raw || []).some(r => r.id === i.id))) return null;
			}

			const stockIn  = +(stockInMap[i.id]  || 0).toFixed(3);
			const stockOut = +(stockOutMap[i.id] || 0).toFixed(3);

			// Row background: expiring urgent (red) > low stock (orange) > expiring soon (yellow)
			const rowBg = isExpiring     ? 'background:rgba(239,68,68,.08);'
			            : isLow          ? 'background:rgba(249,115,22,.08);'
			            : isExpiringSoon  ? 'background:rgba(234,179,8,.07);'
			            : '';

			// Inline badges for name cell
			const lowBadge    = isLow         ? ' <span style="font-size:10px;font-weight:800;padding:2px 6px;border-radius:999px;background:rgba(249,115,22,.18);color:#c2410c">LOW</span>' : '';
			const expiryBadge = isExpiring    ? ' <span style="font-size:10px;font-weight:800;padding:2px 6px;border-radius:999px;background:rgba(239,68,68,.18);color:#dc2626">EXPIRING</span>'
			                  : isExpiringSoon ? ' <span style="font-size:10px;font-weight:800;padding:2px 6px;border-radius:999px;background:rgba(234,179,8,.18);color:#b45309">SOON</span>' : '';

			// Qty cell — bold + coloured when low
			const qtyDisplay = `<span style="font-weight:${isLow?'700':'400'};color:${isLow?'#c2410c':'inherit'}">${+Number(i.qty||0).toFixed(3)}</span>`;

			// Expiry cell — days countdown coloured by urgency
			const expiryDisplay = i.expiry
				? `${i.expiry} <span style="font-size:11px;color:${days<=7?'#dc2626':days<=30?'#b45309':'var(--muted,#888)'}">(${days}d)</span>${expiryBadge}`
				: '—';

			return `<tr style="${rowBg}">
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07)">${i.id}</td>
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07);font-weight:600">${escapeHtml(i.name)}${lowBadge}</td>
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07);text-align:right;color:#16a34a;font-weight:600">${stockIn}</td>
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07);text-align:right;color:#dc2626;font-weight:600">${stockOut}</td>
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07);text-align:right">${qtyDisplay}</td>
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07)">${escapeHtml(i.unit||'')}</td>
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07)">${minVal != null ? minVal : ''}</td>
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07)">${escapeHtml(i.type||'')}</td>
        ${hasPermission('settings') ? `<td style="padding:8px;border:1px solid rgba(0,0,0,.07);font-size:12px">${escapeHtml(i.supplier||'—')}</td>` : ''}
        <td style="padding:8px;border:1px solid rgba(0,0,0,.07)">${expiryDisplay}</td>
      </tr>`;
		}).filter(Boolean).join('') || `<tr><td colspan="10" style="padding:12px" class="muted">No items match the selected filter/range</td></tr>`;
		const startISO = start.toISOString().slice(0,10);
		const endISO   = end.toISOString().slice(0,10);
		summaryEl.innerHTML = `
      ${lowAlertHTML}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
        <div>
          <div style="font-weight:800">Reports — ${filter === 'usage' ? 'Ingredient Usage' : filter === 'low' ? 'Low stock' : filter === 'expiring' ? 'Expiring items' : 'All items'}</div>
          <div class="muted small" id="summaryPeriodLabel">Period: ${startISO} to ${endISO} • Stock In: ${totalStockIn} • Stock Out: ${totalStockOut} • Low items: ${lowCount} • Expiring: ${expiringCount}</div>
        </div>
        <div id="summarybtns" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <div style="display:flex;gap:4px;align-items:center;background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.08);border-radius:8px;padding:4px 8px;flex-wrap:wrap">
            <label style="font-size:11px;font-weight:700;color:var(--muted,#888);white-space:nowrap">From</label>
            <input id="reportStart" type="date" value="${startISO}" style="height:30px;padding:0 6px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);font-size:12px;background:var(--bg,#fff);color:var(--text);" />
            <label style="font-size:11px;font-weight:700;color:var(--muted,#888);white-space:nowrap">To</label>
            <input id="reportEnd" type="date" value="${endISO}" style="height:30px;padding:0 6px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);font-size:12px;background:var(--bg,#fff);color:var(--text);" />
            <select id="reportPreset" style="height:30px;padding:0 6px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);font-size:12px;background:var(--bg,#fff);color:var(--text);">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button id="applyReportRange" class="btn small" type="button" style="height:30px;white-space:nowrap">Apply</button>
          </div>
          <select id="reportFilter" title="Filter report" style="height:30px;padding:0 6px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);font-size:12px;background:var(--bg,#fff)">
            <option value="all">All items</option>
            <option value="usage">Ingredient usage</option>
            <option value="low">Low stock</option>
            <option value="expiring">Expiring</option>
          </select>
          <button id="printReportsBtn" class="btn small">Print / Save PDF</button>
          <button id="exportReportsCsvBtn" class="btn small">Export CSV</button>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;margin-bottom:6px;font-size:12px;align-items:center">
        <span style="font-weight:700;color:var(--muted,#888)">Legend:</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(239,68,68,.18);display:inline-block"></span>Expiring within 7 days</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(249,115,22,.18);display:inline-block"></span>Low stock</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:rgba(234,179,8,.18);display:inline-block"></span>Expiring within 30 days</span>
      </div>
      <div style="margin-top:4px;overflow:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="padding:8px;border:1px solid #eee">ID</th>
            <th style="padding:8px;border:1px solid #eee">Name</th>
            <th style="padding:8px;border:1px solid #eee;color:#16a34a">↑ Stock In</th>
            <th style="padding:8px;border:1px solid #eee;color:#dc2626">↓ Stock Out</th>
            <th style="padding:8px;border:1px solid #eee">Current Qty</th>
            <th style="padding:8px;border:1px solid #eee">Unit</th>
            <th style="padding:8px;border:1px solid #eee">Min</th>
            <th style="padding:8px;border:1px solid #eee">Type</th>
            ${hasPermission('settings') ? '<th style="padding:8px;border:1px solid #eee">Supplier</th>' : ''}
            <th style="padding:8px;border:1px solid #eee">Expiry</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;

		const prBtn = q('printReportsBtn');
		if (prBtn) prBtn.onclick = () => printReports(start.toISOString(), end.toISOString(), filter);
		const exBtn = q('exportReportsCsvBtn');
		if (exBtn) exBtn.onclick = () => exportReportsCSVReport(start.toISOString(), end.toISOString(), filter);

		// Restore filter select and wire change handler
		const filterSel = q('reportFilter');
		if (filterSel) {
			filterSel.value = filter;
			filterSel.onchange = () => renderReports(q('reportStart')?.value || null, q('reportEnd')?.value || null, filterSel.value);
		}

		// Restore preset select to the closest matching value
		const presetSel = q('reportPreset');
		if (presetSel) {
			presetSel.value = String(presetDays);
			// Preset change: update date inputs and re-render
			presetSel.onchange = () => {
				const days = Number(presetSel.value || 30);
				const eDate = new Date();
				const sDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
				const sEl = q('reportStart'), eEl = q('reportEnd');
				if (sEl) sEl.value = sDate.toISOString().slice(0, 10);
				if (eEl) eEl.value = eDate.toISOString().slice(0, 10);
				renderReports(sEl?.value || null, eEl?.value || null, q('reportFilter')?.value || filter);
			};
		}

		// Apply button: re-render with the manually chosen dates
		const applyBtn = q('applyReportRange');
		if (applyBtn) {
			applyBtn.onclick = () => {
				const sVal = q('reportStart')?.value || null;
				const eVal = q('reportEnd')?.value || null;
				renderReports(sVal, eVal, q('reportFilter')?.value || filter);
				if (typeof renderStockChart === 'function') renderStockChart(sVal, eVal);
				if (typeof window.__reportRangeChanged === 'function') window.__reportRangeChanged();
			};
		}
	}

	try { chartIngredientUsage && chartIngredientUsage.resize && chartIngredientUsage.resize(); } catch (e) {}
	setTimeout(addAllChartDownloadBtns, 200);
}

async function printReports(rangeStartISO, rangeEndISO, filter) {
	try {

		const selFilter = filter || q('reportFilter')?.value || 'usage';
		const startISO = rangeStartISO || q('reportStart')?.value || null;
		const endISO = rangeEndISO || q('reportEnd')?.value || null;
		const end = endISO ? new Date(endISO) : new Date();
		const start = startISO ? new Date(startISO) : new Date(end);
		if (!startISO) start.setDate(end.getDate() - 29);
		start.setHours(0, 0, 0, 0);
		end.setHours(23, 59, 59, 999);

		const bakeryName = (q('bakeryName')?.value) || document.querySelector('.brand-name')?.innerText || "Eric's Bakery";

		// Fetch live activity from API for accurate stock in/out data
		const printStockInMap  = {};
		const printStockOutMap = {};
		try {
			const actResp = await apiFetch('/api/activity?limit=200' + (start ? '&start='+start.toISOString().slice(0,10)+'&end='+end.toISOString().slice(0,10) : ''));
			const liveAct = (actResp && actResp.items) ? actResp.items : [];
			liveAct.forEach(a => {
				const t = new Date(a.time || null);
				if (!t || t < start || t > end) return;
				const iid = Number(a.ingredient_id || 0);
				if (!iid) return;
				const action = String(a.action || '').toLowerCase();
				const text   = String(a.text   || '').toLowerCase();
			const m = String(a.text || '').match(/([0-9]*\.?[0-9]+)/g);
				const v = m ? (Number(m[0]) || 0) : 0;
				if (action === 'stock_in'  || text.includes('stock in'))  printStockInMap[iid]  = (printStockInMap[iid]  || 0) + v;
				if (action === 'stock_out' || text.includes('stock out') || text.includes('used for')) printStockOutMap[iid] = (printStockOutMap[iid] || 0) + v;
		});
		} catch (e) { console.warn('[printReports] activity fetch failed', e); }

		const expiryWindow = (typeof REPORT_EXPIRY_DAYS !== 'undefined' ? REPORT_EXPIRY_DAYS : 7);
		const rows = (DB.ingredients || []).map(i => {
			const isIngredient = String(i.type || '').toLowerCase() === 'ingredient';
			const minVal       = (i.min != null) ? i.min : computeThresholdForIngredient(i);
			const days         = i.expiry ? daysUntil(i.expiry) : null;
			const sIn  = +(printStockInMap[i.id]  || 0).toFixed(3);
			const sOut = +(printStockOutMap[i.id] || 0).toFixed(3);
			// Apply same filter logic as renderReports
			if (selFilter === 'usage') {
				if (!isIngredient) return '';
				if (!(sIn > 0 || sOut > 0)) return '';
			} else if (selFilter === 'low') {
				if (!(Number(i.qty || 0) <= Number(minVal || 0))) return '';
			} else if (selFilter === 'expiring') {
				if (!isIngredient) return '';
				if (!(i.expiry && days !== null && days >= 0 && days <= 30)) return '';
			}
			// 'all' — no filter
			return `<tr>
        <td style="padding:8px;border:1px solid #ddd">${i.id}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.name)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#16a34a">${sIn}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#dc2626">${sOut}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${i.qty}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.unit||'')}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${i.min || computeThresholdForIngredient(i)}</td>
        <td style="padding:8px;border:1px solid #ddd">${escapeHtml(i.type||'')}</td>
        <td style="padding:8px;border:1px solid #ddd">${i.expiry||''}</td>
      </tr>`;
		}).filter(Boolean).join('');

		const finalRows = rows || `<tr><td colspan="9" style="padding:12px;border:1px solid #ddd" class="muted">No items match the selected filter/range</td></tr>`;

		const printableHTML = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>Report — ${selFilter === 'usage' ? 'Ingredient Usage' : selFilter === 'low' ? 'Low Stock' : selFilter === 'expiring' ? 'Expiring Items' : 'All Items'} — ${start.toISOString().slice(0,10)} to ${end.toISOString().slice(0,10)}</title>
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
            <div class="meta">Report: ${selFilter === 'usage' ? 'Ingredient Usage' : selFilter === 'low' ? 'Low Stock' : selFilter === 'expiring' ? 'Expiring Items' : 'All Items'} • ${start.toISOString().slice(0,10)} — ${end.toISOString().slice(0,10)}</div>
            <div class="meta">Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th style="color:#16a34a">↑ Stock In</th>
              <th style="color:#dc2626">↓ Stock Out</th>
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

		const ua = navigator.userAgent || '';
		const isChrome = /Chrome/.test(ua) && !/Edg|OPR|Brave/.test(ua);

		if (isChrome) {

			const iframe = document.createElement('iframe');
			iframe.style.position = 'fixed';
			iframe.style.right = '0';
			iframe.style.bottom = '0';
			iframe.style.width = '0';
			iframe.style.height = '0';
			iframe.style.border = '0';
			iframe.setAttribute('aria-hidden', 'true');
			document.body.appendChild(iframe);

			const idoc = iframe.contentWindow.document;
			idoc.open();
			idoc.write(printableHTML);
			idoc.close();

			const finish = () => {
				try {
					iframe.contentWindow.focus();
					setTimeout(() => {
						try {
							iframe.contentWindow.print();
						} catch (e) {
							console.warn('iframe.print failed', e);
							try {
								window.print();
							} catch (_) {}
						}
						setTimeout(() => {
							try {
								iframe.remove();
							} catch (_) {}
						}, 600);
					}, 160);
				} catch (e) {
					try {
						window.print();
					} catch (_) {}
					try {
						iframe.remove();
					} catch (_) {}
				}
			};

			try {
				if (iframe.contentWindow.document.readyState === 'complete') finish();
				else iframe.onload = finish;
				setTimeout(() => {
					if (document.body.contains(iframe)) finish();
				}, 900);
			} catch (e) {
				setTimeout(() => {
					try {
						window.print();
					} catch (_) {}
					if (document.body.contains(iframe)) iframe.remove();
				}, 400);
			}
			return;
		}

		const prevRoot = document.getElementById('bakery-report-print-root');
		if (prevRoot) prevRoot.remove();
		const prevStyle = document.getElementById('bakery-report-print-style');
		if (prevStyle) prevStyle.remove();

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

		setTimeout(() => {
			try {
				window.focus();
			} catch (e) {}
			try {
				window.print();
			} catch (e) {
				console.warn('print failed', e);
				notify('Print failed');
			}
			setTimeout(() => {
				try {
					document.getElementById('bakery-report-print-root')?.remove();
					document.getElementById('bakery-report-print-style')?.remove();
				} catch (_) {}
			}, 700);
		}, 180);

	} catch (err) {
		console.error('printReports error', err);
		notify('Unable to prepare print preview');
	}
}

async function exportReportsCSVReport(rangeStartISO, rangeEndISO, filter) {
	const start = new Date(rangeStartISO);
	start.setHours(0, 0, 0, 0);
	const end = new Date(rangeEndISO);
	end.setHours(23, 59, 59, 999);

	// Fetch live activity for accurate stock in/out
	const csvStockInMap  = {};
	const csvStockOutMap = {};
	try {
		const actResp = await apiFetch('/api/activity?limit=200' + (start ? '&start='+start.toISOString().slice(0,10)+'&end='+end.toISOString().slice(0,10) : ''));
		const liveAct = (actResp && actResp.items) ? actResp.items : [];
		liveAct.forEach(a => {
			const t = new Date(a.time || null);
			if (!t || t < start || t > end) return;
			const iid = Number(a.ingredient_id || 0);
			if (!iid) return;
			const action = String(a.action || '').toLowerCase();
			const text   = String(a.text   || '').toLowerCase();
		const m = String(a.text || '').match(/([0-9]*\.?[0-9]+)/g);
			const v = m ? (Number(m[0]) || 0) : 0;
			if (action === 'stock_in'  || text.includes('stock in'))  csvStockInMap[iid]  = (csvStockInMap[iid]  || 0) + v;
			if (action === 'stock_out' || text.includes('stock out') || text.includes('used for')) csvStockOutMap[iid] = (csvStockOutMap[iid] || 0) + v;
	});
	} catch (e) { console.warn('[exportReportsCSV] activity fetch failed', e); }

	const rows = [
		['ingredient_id', 'name', 'stock_in', 'stock_out', 'current_qty', 'unit', 'min', 'type', 'expiry']
	];

	(DB.ingredients || []).forEach(i => {
		const isIngredient = String(i.type || '').toLowerCase() === 'ingredient';
		const minVal       = (i.min != null) ? i.min : computeThresholdForIngredient(i);
		const days         = i.expiry ? daysUntil(i.expiry) : null;
		const sIn  = +(csvStockInMap[i.id]  || 0).toFixed(3);
		const sOut = +(csvStockOutMap[i.id] || 0).toFixed(3);
		// Apply same filter logic as renderReports
		if (filter === 'usage') {
			if (!isIngredient) return;
			if (!(sIn > 0 || sOut > 0)) return;
		} else if (filter === 'low') {
			if (!(Number(i.qty || 0) <= Number(minVal || 0))) return;
		} else if (filter === 'expiring') {
			if (!isIngredient) return;
			if (!(i.expiry && days !== null && days >= 0 && days <= 30)) return;
		}
		// 'all' — no filter

		rows.push([i.id, i.name, sIn, sOut, i.qty, i.unit || '', i.min || '', i.type || '', i.expiry || '']);
	});

	const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
	const blob = new Blob([csv], {
		type: 'text/csv;charset=utf-8;'
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `bakery_report_${rangeStartISO.slice(0,10)}_to_${rangeEndISO.slice(0,10)}.csv`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

function computeBestSelling() {
	const map = {};
	DB.products.forEach(p => map[p.id] = 0);
	sampleOrders.forEach(o => o.items.forEach(it => {
		map[it.product_id] = (map[it.product_id] || 0) + (it.qty || 0);
	}));
	let bestId = null;
	let bestQty = 0;
	Object.keys(map).forEach(k => {
		if (map[k] > bestQty) {
			bestQty = map[k];
			bestId = Number(k);
		}
	});
	const p = DB.products.find(pp => pp.id === bestId) || {
		name: '—'
	};
	return {
		id: bestId,
		name: p.name,
		qty: bestQty
	};
}

function computeBestSellingInRange(start, end) {
	const map = {};
	DB.products.forEach(p => map[p.id] = 0);
	sampleOrders.forEach(o => {
		const od = new Date(o.date);
		od.setHours(0, 0, 0, 0);
		if (od < start || od > end) return;
		o.items.forEach(it => {
			map[it.product_id] = (map[it.product_id] || 0) + (it.qty || 0);
		});
	});
	let bestId = null,
		bestQty = 0;
	Object.keys(map).forEach(k => {
		if (map[k] > bestQty) {
			bestQty = map[k];
			bestId = Number(k);
		}
	});
	const p = DB.products.find(pp => pp.id === bestId) || {
		name: '—'
	};
	return {
		id: bestId,
		name: p.name,
		qty: bestQty
	};
}

function generateColors(n) {
	const base = ['#1b85ec', '#3ea9f5', '#ffb366', '#8B5E3C', '#47C278', '#C07A3A', '#9b59b6', '#e74c3c', '#2ecc71'];
	const out = [];
	for (let i = 0; i < n; i++) out.push(base[i % base.length]);
	return out;
}

function exportInventoryCSV() {
	const activeChip = document.querySelector('.filter-chips .chip.active')?.dataset.filter || 'all';
	const invType = document.querySelector('input[name="invType"]:checked')?.value || 'all';

	const rows = [
		['id', 'name', 'type', 'supplier', 'qty', 'unit', 'min', 'expiry']
	];

	(DB.ingredients || []).forEach(i => {
		if (invType !== 'all' && (i.type || 'ingredient') !== invType) return;
		if (activeChip === 'low') {
			if (!(i.type === 'ingredient' && i.qty <= (i.min || computeThresholdForIngredient(i)))) return;
		} else if (activeChip === 'expiring') {
			if (!(i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= (typeof REPORT_EXPIRY_DAYS !== 'undefined' ? REPORT_EXPIRY_DAYS : 7))) return;
		}
		rows.push([i.id, i.name, i.type || 'ingredient', i.supplier || '', i.qty, i.unit || '', i.min || 0, i.expiry || '']);
	});

	const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
	const blob = new Blob([csv], {
		type: 'text/csv;charset=utf-8;'
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

function printInventoryTable() {
	try {
		const activeChip = document.querySelector('.filter-chips .chip.active')?.dataset.filter || 'all';
		const invType = document.querySelector('input[name="invType"]:checked')?.value || 'all';

		const logoSrc = document.querySelector('.sidebar-logo-img')?.src || '';
		const bakeryName = (q('bakeryName')?.value) || document.querySelector('.brand-name')?.innerText || "Eric's Bakery";

		const rows = (DB.ingredients || []).map(i => {
			if (invType !== 'all' && (i.type || 'ingredient') !== invType) return '';
			if (activeChip === 'low') {
				if (!(i.type === 'ingredient' && i.qty <= (i.min || computeThresholdForIngredient(i)))) return '';
			} else if (activeChip === 'expiring') {
				const expiryWindow = (typeof REPORT_EXPIRY_DAYS !== 'undefined' ? REPORT_EXPIRY_DAYS : 7);
				if (!(i.type === 'ingredient' && i.expiry && daysUntil(i.expiry) >= 0 && daysUntil(i.expiry) <= expiryWindow)) return '';
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
            ::-webkit-scrollbar { display: none; }
          }
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

		if (isChrome) {
			const iframe = document.createElement('iframe');
			iframe.style.position = 'fixed';
			iframe.style.right = '0';
			iframe.style.bottom = '0';
			iframe.style.width = '0';
			iframe.style.height = '0';
			iframe.style.border = '0';
			iframe.setAttribute('aria-hidden', 'true');
			document.body.appendChild(iframe);

			const idoc = iframe.contentWindow.document;
			idoc.open();
			idoc.write(printableHTML);
			idoc.close();
			const finish = () => {
				try {
					iframe.contentWindow.focus();
					setTimeout(() => {
						try {
							iframe.contentWindow.print();
						} catch (e) {
							console.warn('iframe.print failed', e);
							try {
								window.print();
							} catch (_) {}
						}
						setTimeout(() => {
							try {
								iframe.remove();
							} catch (_) {}
						}, 600);
					}, 160);
				} catch (e) {
					try {
						window.print();
					} catch (_) {}
					try {
						iframe.remove();
					} catch (_) {}
				}
			};

			try {
				if (iframe.contentWindow.document.readyState === 'complete') finish();
				else iframe.onload = finish;
				setTimeout(() => {
					if (document.body.contains(iframe)) finish();
				}, 900);
			} catch (e) {
				setTimeout(() => {
					try {
						window.print();
					} catch (_) {}
					if (document.body.contains(iframe)) iframe.remove();
				}, 400);
			}

			return;
		}

		const prevRoot = document.getElementById('bakery-print-root');
		if (prevRoot) prevRoot.remove();
		const prevStyle = document.getElementById('bakery-print-style');
		if (prevStyle) prevStyle.remove();

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

		setTimeout(() => {
			try {
				window.focus();
			} catch (e) {}
			try {
				window.print();
			} catch (e) {
				console.warn('print failed', e);
				notify('Print failed');
			}
			setTimeout(() => {
				try {
					document.getElementById('bakery-print-root')?.remove();
					document.getElementById('bakery-print-style')?.remove();
				} catch (_) {}
			}, 700);
		}, 180);

	} catch (err) {
		console.error('printInventoryTable error', err);
		notify('Unable to prepare print preview');
	}
}
let currentCalendarYear = (new Date()).getFullYear();
let currentCalendarMonth = (new Date()).getMonth();

/* ================================================================
   SCHEDULING ENGINE  (localStorage cache + server sync)
   ================================================================ */
const SCHED_KEY = 'bakery_schedules_v1';

// #4 — Schedule functions now sync to server via /api/schedules.
// localStorage is used as a fast local cache; server is source of truth.

function getAllSchedules() {
	try { return JSON.parse(localStorage.getItem(SCHED_KEY) || '[]'); } catch(e) { return []; }
}
function saveAllSchedules(arr) {
	localStorage.setItem(SCHED_KEY, JSON.stringify(arr));
}
function getSchedulesForDate(dateStr) {
	return getAllSchedules().filter(s => s.date === dateStr);
}
async function addSchedule(sched) {
	sched.id = Date.now() + '_' + Math.random().toString(36).slice(2);
	sched.createdAt = new Date().toISOString();
	sched.notified  = false;
	// Optimistic local save
	const all = getAllSchedules();
	all.push(sched);
	saveAllSchedules(all);
	// Sync to server (non-blocking)
	try {
		const res = await apiFetch('/api/schedules', { method: 'POST', body: sched });
		if (res && res.id) {
			// Replace local entry with server-assigned id
			const local = getAllSchedules();
			const idx = local.findIndex(s => s.id === sched.id);
			if (idx !== -1) { local[idx].id = res.id; saveAllSchedules(local); sched.id = res.id; }
		}
	} catch (e) { console.warn('[schedules] server sync failed (offline?):', e.message); }
	return sched;
}
async function deleteSchedule(id) {
	const snapshot = getAllSchedules();
	saveAllSchedules(snapshot.filter(s => s.id !== id));
	try {
		await apiFetch('/api/schedules/' + id, { method: 'DELETE' });
	} catch (e) {
		// Server delete failed — restore local state so ghost resurrection can't happen
		saveAllSchedules(snapshot);
		console.warn('[schedules] server delete failed (rolled back):', e.message);
		throw e; // re-throw so the UI caller can show an error
	}
}
// Pull schedules from server into localStorage on load
async function syncSchedulesFromServer() {
	try {
		const res = await apiFetch('/api/schedules');
		if (res && Array.isArray(res.items)) {
			// Server is the source of truth — replace local cache entirely.
			// Preserve any locally-added entries whose temp id hasn't synced yet
			// (those have string ids like "1234567890_abc", not numeric).
			const local = getAllSchedules();
			const pendingLocal = local.filter(s => isNaN(Number(s.id)));
			saveAllSchedules(pendingLocal.concat(res.items));
		}
	} catch (e) { console.warn('[schedules] sync from server failed:', e.message); }
}

/* ── Reminder checker — runs every 30 s ── */
function checkScheduleReminders() {
	const now      = new Date();
	const todayStr = now.toISOString().slice(0, 10);
	const all      = getAllSchedules();
	let changed    = false;
	all.forEach(s => {
		if (s.notified || s.date !== todayStr || !s.time) return;
		const [hh, mm] = (s.time || '00:00').split(':').map(Number);
		const target   = new Date(now); target.setHours(hh, mm, 0, 0);
		const diff     = target - now;            // ms until scheduled time
		if (diff <= 0 && diff > -120000) {        // within 2-min window after
			s.notified = true; changed = true;
			// Persist notified flag to server so it survives across sessions/devices
			if (!isNaN(Number(s.id))) {
				apiFetch('/api/schedules/' + s.id + '/notified', { method: 'PATCH' }).catch(() => {});
			}
			pushInAppNotif({
				type: 'reminder',
				title: `🔔 Reminder: ${s.title}`,
				sub:   s.note || `Scheduled at ${s.time}`,
				icon:  'fa-bell',
			});
			if (typeof notify === 'function') notify(`🔔 ${s.title}`);
		}
	});
	if (changed) saveAllSchedules(all);
}
setInterval(checkScheduleReminders, 30000);
document.addEventListener('DOMContentLoaded', () => setTimeout(checkScheduleReminders, 2000));

/* ── Open schedule modal for a date ── */
function openScheduleModal(dateStr) {
	const scheds = getSchedulesForDate(dateStr);
	const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
		weekday:'long', month:'long', day:'numeric', year:'numeric'
	});

	const listHtml = scheds.length
		? scheds.map(s => `
			<div class="sched-modal-item" style="display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(0,0,0,0.05)">
				<div style="flex:1;min-width:0">
					<div style="font-weight:700;font-size:13px">${escapeHtml(s.title)}</div>
					${s.time ? `<div class="muted small"><i class="fa fa-clock" style="margin-right:3px;opacity:.6"></i>${escapeHtml(s.time)}</div>` : ''}
					${s.note ? `<div class="muted small">${escapeHtml(s.note)}</div>` : ''}
				</div>
				<button class="btn small danger sched-delete-btn" data-id="${s.id}" type="button" title="Remove"><i class="fa fa-trash"></i></button>
			</div>`).join('')
		: `<div class="muted small" style="padding:8px 0 12px">No schedules yet for this day.</div>`;

	if (typeof openModalHTML === 'function') {
		openModalHTML(`
			<div style="padding:4px">
				<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
					<i class="fa fa-calendar-check" style="color:var(--accent);font-size:18px"></i>
					<h3 style="margin:0;font-size:15px">${escapeHtml(displayDate)}</h3>
				</div>
				<div id="schedModalList" style="margin-bottom:16px">${listHtml}</div>
				<div style="background:var(--surface,#f6f7fb);border-radius:10px;padding:12px">
					<div style="font-weight:800;font-size:13px;margin-bottom:10px"><i class="fa fa-plus" style="margin-right:5px;opacity:.7"></i>Add new schedule</div>
					<label class="field"><span class="field-label">Title <span style="color:#e11d6a">*</span></span><input id="newSchedTitle" type="text" placeholder="e.g. Bread baking batch" /></label>
					<label class="field" style="margin-top:6px"><span class="field-label">Time</span><input id="newSchedTime" type="time" /></label>
					<label class="field" style="margin-top:6px"><span class="field-label">Note</span><input id="newSchedNote" type="text" placeholder="Optional note…" /></label>
					<div style="display:flex;gap:8px;margin-top:12px">
						<button id="saveSchedBtn" class="btn primary small" type="button"><i class="fa fa-check" style="margin-right:4px"></i>Add Schedule</button>
						<button id="closeSchedBtn" class="btn ghost small" type="button">Close</button>
					</div>
				</div>
			</div>
		`);
	}

	document.querySelectorAll('.sched-delete-btn').forEach(btn => {
		btn.addEventListener('click', async e => {
			e.stopPropagation();
			if (!confirm('Remove this schedule?')) return;
			try {
				await deleteSchedule(btn.dataset.id);
			pushInAppNotif({ type: 'info', title: 'Schedule removed', sub: displayDate, icon: 'fa-calendar-xmark' });
			closeModal();
			refreshCalendarCell(dateStr);
			} catch (err) {
				if (typeof notify === 'function') notify('Failed to remove schedule — please try again.');
			}
		});
	});

	const saveBtn = document.getElementById('saveSchedBtn');
	if (saveBtn) {
		saveBtn.addEventListener('click', async () => {
			const title = (document.getElementById('newSchedTitle')?.value || '').trim();
			if (!title) { if (typeof notify === 'function') notify('Title is required'); return; }
			const time  = document.getElementById('newSchedTime')?.value  || '';
			const note  = (document.getElementById('newSchedNote')?.value || '').trim();
			saveBtn.disabled = true;
			await addSchedule({ date: dateStr, title, time, note });
			saveBtn.disabled = false;
			pushInAppNotif({
				type:  'schedule',
				title: `Scheduled: ${title}`,
				sub:   displayDate + (time ? ' at ' + time : ''),
				icon:  'fa-calendar-plus',
			});
			if (typeof notify === 'function') notify(`Schedule added`);
			closeModal();
			refreshCalendarCell(dateStr);
		});
	}
	const closeBtn = document.getElementById('closeSchedBtn');
	if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

/* ── Refresh just one cell after schedule change ── */
function refreshCalendarCell(dateStr) {
	document.querySelectorAll(`.calendar-cell[data-date="${dateStr}"]`).forEach(cell => {
		renderScheduleChipsInCell(cell, dateStr);
	});
}

/* ── Render schedule chips inside a cell ── */
const CAL_SHOW_MAX = 2;   // show first 2 items, then "+N more"

function renderScheduleChipsInCell(cell, dateStr) {
	cell.querySelectorAll('.sched-chip, .cal-more-pill, .cell-add-btn, .sched-section').forEach(el => el.remove());
	const scheds = getSchedulesForDate(dateStr);

	// Quick-add "+" button (appears on hover via CSS)
	const addBtn = document.createElement('button');
	addBtn.className = 'cell-add-btn';
	addBtn.title = 'Add schedule';
	addBtn.innerHTML = '<i class="fa fa-plus" style="font-size:10px"></i>';
	addBtn.addEventListener('click', e => { e.stopPropagation(); openScheduleModal(dateStr); });
	cell.appendChild(addBtn);

	if (!scheds.length) return;

	const section = document.createElement('div');
	section.className = 'sched-section';
	section.style.cssText = 'display:flex;flex-direction:column;gap:3px;margin-top:3px;width:100%';

	scheds.slice(0, CAL_SHOW_MAX).forEach(s => {
		const chip = document.createElement('div');
		chip.className = 'sched-chip';
		chip.innerHTML = `<i class="fa fa-clock" style="font-size:9px;opacity:.6;flex-shrink:0"></i><span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(s.title)}</span>${s.time ? `<span class="sched-chip-time">${escapeHtml(s.time)}</span>` : ''}`;
		chip.title = s.title + (s.note ? ' — ' + s.note : '');
		chip.addEventListener('click', e => { e.stopPropagation(); openScheduleModal(dateStr); });
		section.appendChild(chip);
	});

	if (scheds.length > CAL_SHOW_MAX) {
		const pill = document.createElement('button');
		pill.className = 'cal-more-pill';
		pill.type = 'button';
		pill.textContent = `+${scheds.length - CAL_SHOW_MAX} more`;
		pill.addEventListener('click', e => { e.stopPropagation(); openScheduleModal(dateStr); });
		section.appendChild(pill);
	}

	cell.appendChild(section);
}

/* ── Apply today highlight to a cell ── */
function applyTodayHighlight(cell, dateStr) {
	const todayStr = new Date().toISOString().slice(0, 10);
	if (dateStr === todayStr) cell.classList.add('is-today');
}

/* ================================================================
   IN-APP NOTIFICATION PANEL
   Integrates with notifications.js alerts; also used by schedule system
   ================================================================ */
const INAPP_KEY     = 'bakery_inapp_notifs_v1';
const INAPP_MAX     = 50;
let   _notifPanelOpen = false;

function _getNotifs()     { try { return JSON.parse(localStorage.getItem(INAPP_KEY) || '[]'); } catch(e) { return []; } }
function _saveNotifs(arr) { localStorage.setItem(INAPP_KEY, JSON.stringify(arr.slice(0, INAPP_MAX))); }

function pushInAppNotif({ type = 'info', title = '', sub = '', icon = 'fa-bell' }) {
	const n = { id: Date.now() + '_' + Math.random().toString(36).slice(2), type, title, sub, icon, time: new Date().toISOString(), read: false };
	_saveNotifs([n, ..._getNotifs()]);
	_renderNotifPanel();
}
window.pushInAppNotif = pushInAppNotif;   // expose for notifications.js

function _relTime(iso) {
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60000);
	if (m < 1)  return 'just now';
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}

function _iconClass(type) {
	return ({ schedule:'notif-icon--schedule', reminder:'notif-icon--reminder',
	          alert:'notif-icon--alert', info:'notif-icon--info' })[type] || 'notif-icon--info';
}

function _renderNotifPanel() {
	const list  = document.getElementById('notifList');
	const empty = document.getElementById('notifEmpty');
	const badge = document.getElementById('notifBadge');
	if (!list) return;

	const notifs = _getNotifs();
	const unread = notifs.filter(n => !n.read).length;

	// badge
	if (badge) {
		if (unread > 0) {
			badge.textContent = unread > 99 ? '99+' : unread;
			badge.style.display = 'block';
		} else {
			badge.style.display = 'none';
		}
	}

	// list
	if (!notifs.length) {
		list.innerHTML = '';
		if (empty) empty.style.display = 'block';
		return;
	}
	if (empty) empty.style.display = 'none';

	list.innerHTML = notifs.map(n => `
		<li class="notif-item${n.read ? '' : ' unread'}" data-id="${n.id}">
			<div class="notif-icon ${_iconClass(n.type)}"><i class="fa ${escapeHtml(n.icon)}"></i></div>
			<div class="notif-item-body">
				<div class="notif-item-title">${escapeHtml(n.title)}</div>
				${n.sub ? `<div class="notif-item-sub">${escapeHtml(n.sub)}</div>` : ''}
			</div>
			<div class="notif-item-time">${_relTime(n.time)}</div>
		</li>`).join('');
}

function _initNotifBell() {
	const btn   = document.getElementById('notifBellBtn');
	const panel = document.getElementById('notifPanel');
	const clear = document.getElementById('notifClearAll');
	if (!btn || !panel) return;

	btn.addEventListener('click', e => {
		e.stopPropagation();
		_notifPanelOpen = !_notifPanelOpen;
		panel.style.display = _notifPanelOpen ? 'block' : 'none';
		btn.setAttribute('aria-expanded', _notifPanelOpen);
		if (_notifPanelOpen) {
			// mark all read
			const notifs = _getNotifs().map(n => ({ ...n, read: true }));
			_saveNotifs(notifs);
			_renderNotifPanel();
		}
	});

	document.addEventListener('click', e => {
		if (_notifPanelOpen && !document.getElementById('notifBellWrap')?.contains(e.target)) {
			_notifPanelOpen = false;
			panel.style.display = 'none';
			btn.setAttribute('aria-expanded', 'false');
		}
	});

	if (clear) {
		clear.addEventListener('click', e => {
			e.stopPropagation();
			_saveNotifs([]);
			_renderNotifPanel();
		});
	}

	// Re-render every 60 s to keep relative timestamps fresh
	setInterval(_renderNotifPanel, 60000);
	_renderNotifPanel();
}

document.addEventListener('DOMContentLoaded', _initNotifBell);

function isAgendaMode() {
	return window.matchMedia('(max-width: 640px)').matches;
}

async function renderCalendarForMonth(year, month) {

	const grid = document.getElementById('calendarGrid');
	if (!grid) return;
	grid.innerHTML = '';

	const isMobile = window.matchMedia && window.matchMedia('(max-width:640px)').matches;
	const todayStr = new Date().toISOString().slice(0, 10);

	const first = new Date(year, month, 1);
	const last  = new Date(year, month + 1, 0);
	const daysInMonth   = last.getDate();
	const startWeekday  = first.getDay();
	const pad = n => String(n).padStart(2, '0');
	const totalCells = isAgendaMode() ? daysInMonth : 42;

	const cells = [];
	for (let i = 0; i < totalCells; i++) {
		const dayIndex = i - startWeekday + 1;
		const cell = document.createElement('div');
		cell.className = 'calendar-cell';
		cell.style.minHeight   = '80px';
		cell.style.padding     = '8px';
		cell.style.boxSizing   = 'border-box';
		cell.style.borderRadius = '8px';
		cell.style.background  = 'var(--card, #fff)';
		cell.style.border      = '1px solid rgba(0,0,0,0.04)';
		cell.style.cursor      = 'pointer';
		cell.style.display     = 'flex';
		cell.style.flexDirection = 'column';
		cell.style.overflow    = 'hidden';

		if (dayIndex >= 1 && dayIndex <= daysInMonth) {
			const date = new Date(year, month, dayIndex);
			const iso  = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
			cell.dataset.date = iso;

			const dateNum = document.createElement('div');
			dateNum.className   = 'date-num';
			dateNum.textContent = dayIndex;
			cell.appendChild(dateNum);

			const eventListWrap = document.createElement('div');
			eventListWrap.className = 'calendar-events';
			eventListWrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;margin-top:4px;width:100%;overflow:hidden;flex:1 1 auto';
			cell.appendChild(eventListWrap);

			// Today ring
			if (iso === todayStr) cell.classList.add('is-today');
		} else {
			cell.style.visibility    = 'hidden';
			cell.style.pointerEvents = 'none';
		}
		grid.appendChild(cell);
		cells.push(cell);
	}

	// ── Shared day-events modal ──
	function showDayEventsModal(dateIso, items) {
		const displayDate = new Date(dateIso + 'T00:00:00').toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
		let html = `<div style="padding:4px">
			<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
				<i class="fa fa-calendar-day" style="color:var(--accent);font-size:18px"></i>
				<h3 style="margin:0;font-size:15px">${escapeHtml(displayDate)}</h3>
			</div>`;

		if (!items || items.length === 0) {
			html += `<div class="muted small" style="padding:8px 0">No activity for this day.</div>`;
		} else {
			html += `<div style="max-height:52vh;overflow-y:auto">`;
			html += items.map(it => {
				const time   = it.time ? new Date(it.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
				const who    = it.username ? escapeHtml(it.username) : (it.user_id ? `User ${escapeHtml(String(it.user_id))}` : 'system');
				const ing    = it.ingredient_name ? `<div style="font-size:12px"><strong>Item:</strong> ${escapeHtml(it.ingredient_name)}</div>` : '';
				const action = it.action ? `<span style="font-size:10px;font-weight:800;text-transform:uppercase;opacity:.7">${escapeHtml(it.action)}</span> ` : '';
				return `<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.05)">
					<div style="font-weight:700;font-size:13px">${action}${escapeHtml((it.text||'').slice(0,120))}</div>
                  ${ing}
					<div class="muted small" style="margin-top:4px">By ${who}${time ? ' · ' + time : ''}</div>
                </div>`;
			}).join('');
			html += `</div>`;
		}
		// Schedule section inside modal
		const scheds = getSchedulesForDate(dateIso);
		if (scheds.length) {
			html += `<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.07)">
				<div style="font-weight:800;font-size:12px;text-transform:uppercase;opacity:.6;margin-bottom:8px">Schedules</div>`;
			html += scheds.map(s => `<div style="display:flex;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.04)">
				<i class="fa fa-clock" style="color:var(--accent);opacity:.7;font-size:11px"></i>
				<span style="font-weight:700;font-size:13px">${escapeHtml(s.title)}</span>
				${s.time ? `<span class="muted small">${escapeHtml(s.time)}</span>` : ''}
			</div>`).join('');
			html += `</div>`;
		}
		html += `<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
			<button class="btn small primary" id="modalAddSched" type="button"><i class="fa fa-plus" style="margin-right:4px"></i>Add Schedule</button>
			<button class="btn ghost small" id="closeDayEvents" type="button">Close</button>
		</div></div>`;

		openModalHTML(html);

		document.getElementById('closeDayEvents')?.addEventListener('click', closeModal, { once: true });
		document.getElementById('modalAddSched')?.addEventListener('click', () => { closeModal(); openScheduleModal(dateIso); });
	}

	// ── Fetch activity events per cell ──
	const dayCells = Array.from(grid.querySelectorAll('.calendar-cell[data-date]'));
	await Promise.all(dayCells.map(async (cell) => {
		const d = cell.dataset.date;
		try {
			const res   = await (typeof apiFetch === 'function'
				? apiFetch(`/api/events?date=${d}`)
				: fetch(`/api/events?date=${d}`, { credentials:'include' }).then(r => r.json()));
			const items = Array.isArray(res) ? res : ((res && res.items) ? res.items : []);
			const listWrap = cell.querySelector('.calendar-events');
			if (!listWrap) return;

			// Show first CAL_SHOW_MAX items as chips, then "+N more" pill
			const visItems = items.slice(0, CAL_SHOW_MAX);
			const extra    = items.length - visItems.length;

			visItems.forEach(it => {
				const chip = document.createElement('div');
				chip.className   = 'event-chip';
				chip.textContent = (it.action || it.text || '').slice(0, 38);
				chip.title       = it.text || '';
				listWrap.appendChild(chip);
			});

			if (extra > 0) {
				const pill = document.createElement('button');
				pill.className   = 'cal-more-pill';
				pill.type        = 'button';
				pill.textContent = `+${extra} more`;
				pill.addEventListener('click', e => { e.stopPropagation(); showDayEventsModal(d, items); });
				listWrap.appendChild(pill);
			}

			cell.addEventListener('click', e => { e.stopPropagation(); showDayEventsModal(d, items); });

		} catch (err) {
			console.warn('calendar fetch day err', d, err);
		}

		// Render schedule chips after activity chips
		renderScheduleChipsInCell(cell, d);
	}));
}

(function wireCalendarButtons() {
	const prev = document.getElementById('calendarPrev');
	const next = document.getElementById('calendarNext');
	const today = document.getElementById('calendarToday');

	let focusDate = new Date();
	async function refresh() {

		currentCalendarYear = focusDate.getFullYear();
		currentCalendarMonth = focusDate.getMonth();

		const header = q('view-calendar')?.querySelector('.page-header h2');
		if (header) {
			header.textContent = `Calendar — ${new Date(currentCalendarYear, currentCalendarMonth).toLocaleString([], { month:'long', year:'numeric' })}`;
		}
		await renderCalendarForMonth(currentCalendarYear, currentCalendarMonth);
	}

	if (prev) prev.addEventListener('click', (e) => {
		e.stopImmediatePropagation();
		focusDate.setMonth(focusDate.getMonth() - 1);
		refresh();
	}, {
		capture: true
	});

	if (next) next.addEventListener('click', (e) => {
		e.stopImmediatePropagation();
		focusDate.setMonth(focusDate.getMonth() + 1);
		refresh();
	}, {
		capture: true
	});

	if (today) today.addEventListener('click', (e) => {
		e.stopImmediatePropagation();
		focusDate = new Date();
		refresh();
	}, {
		capture: true
	});

	setTimeout(refresh, 250);
})();

function buildCsvWithBom(rows, headerRow) {

	const lines = [];
	if (headerRow) lines.push(headerRow.map(h => `"${String(h).replace(/"/g,'""')}"`).join('\t'));
	rows.forEach(r => {
		lines.push(r.map(c => `"${String(c==null?'':c).replace(/"/g,'""')}"`).join('\t'));
	});

	return '\uFEFF' + lines.join('\r\n');
}

function setCurrentUser(user) {
	window.currentUser = user || null;

	const userBadgeText = document.getElementById('userBadgeText');
	if (userBadgeText) userBadgeText.textContent = user ? (user.name || user.username) : '';
}

window.renderActivity = renderActivity;
window.openEventModal = openEventModal;
window.setCurrentUser = setCurrentUser;
window.buildCsvWithBom = buildCsvWithBom;


function renderCalendar() {
	const header = q('view-calendar')?.querySelector('.page-header h2');
	if (header && q('calendarGrid')) {
		header.textContent = `Calendar — ${new Date(currentCalendarYear, currentCalendarMonth).toLocaleString([], {month:'long', year:'numeric'})}`;
	}
	// #4 — Sync schedules from server, then re-render cells
	syncSchedulesFromServer()
		.then(() => {
	renderCalendarForMonth(currentCalendarYear, currentCalendarMonth);
		})
		.catch(() => {
		renderCalendarForMonth(currentCalendarYear, currentCalendarMonth);
	});
}

(function() {
	const timeZone = 'Asia/Manila';

	const calendarGrid = document.getElementById('calendarGrid');
	const prevBtn = document.getElementById('calendarPrev');
	const nextBtn = document.getElementById('calendarNext');
	const todayBtn = document.getElementById('calendarToday');
	const dateText = document.getElementById('dateText');

	if (!calendarGrid) {
		console.warn('Calendar element not found (#calendarGrid)');
		return;
	}

	const state = {
		viewDate: null
	};

	function nowInTZ(tz) {

		const s = new Date().toLocaleString('en-US', {
			timeZone: tz
		});
		return new Date(s);
	}

	function startOfMonth(date) {
		return new Date(date.getFullYear(), date.getMonth(), 1);
	}

	function formatMonthYear(date) {
		return date.toLocaleString('en-US', {
			month: 'long',
			year: 'numeric',
			timeZone
		});
	}

	function pad(n) {
		return String(n).padStart(2, '0');
	}

	function toYYYYMMDD(d) {

		return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
	}

	function renderEmptyGrid() {
		calendarGrid.innerHTML = '';
	}

	function renderCalendarFor(viewDate) {
		renderEmptyGrid();
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();

		const firstDayWeekday = new Date(year, month, 1).getDay();

		const daysInMonth = new Date(year, month + 1, 0).getDate();

		const prevMonthDays = new Date(year, month, 0).getDate();

		if (dateText) dateText.textContent = formatMonthYear(viewDate);

		const totalCells = 42;
		for (let i = 0; i < totalCells; i++) {
			const cell = document.createElement('div');
			cell.className = 'calendar-cell';

			const cellIndex = i;
			const dayOffset = cellIndex - firstDayWeekday + 1;

			let cellDate;
			let isCurrentMonth = true;
			if (dayOffset < 1) {

				isCurrentMonth = false;
				const d = prevMonthDays + dayOffset;
				const prev = new Date(year, month - 1, d);
				cellDate = prev;
			} else if (dayOffset > daysInMonth) {

				isCurrentMonth = false;
				const d = dayOffset - daysInMonth;
				const next = new Date(year, month + 1, d);
				cellDate = next;
			} else {
				cellDate = new Date(year, month, dayOffset);
			}

			const dayNum = document.createElement('div');
			dayNum.className = 'date-num';
			dayNum.textContent = String(cellDate.getDate());
			cell.appendChild(dayNum);

			const eventsCont = document.createElement('div');
			eventsCont.className = 'day-events';
			eventsCont.style.marginTop = '6px';
			eventsCont.style.display = 'flex';
			eventsCont.style.flexDirection = 'column';
			eventsCont.style.gap = '4px';
			eventsCont.style.overflow = 'hidden';
			eventsCont.style.maxHeight = '4.6rem';
			cell.appendChild(eventsCont);

			if (!isCurrentMonth) {
				cell.style.opacity = '0.42';
			}

			cell.addEventListener('click', (ev) => {
				ev.stopPropagation();
				const dStr = toYYYYMMDD(cellDate);
				openDayEvents(dStr, cellDate);
			});

			const dStr = toYYYYMMDD(cellDate);
			cell.setAttribute('data-date', dStr);

			// Today ring
			if (dStr === new Date().toISOString().slice(0, 10)) cell.classList.add('is-today');

			calendarGrid.appendChild(cell);
		}

		prefetchMonthEvents(year, month);

		// Render schedule chips after grid is built
		calendarGrid.querySelectorAll('.calendar-cell[data-date]').forEach(c => {
			renderScheduleChipsInCell(c, c.dataset.date);
		});
	}

	async function prefetchMonthEvents(year, month) {
		const todayStr = new Date().toISOString().slice(0, 10);
		const days = new Date(year, month + 1, 0).getDate();
		for (let d = 1; d <= days; d++) {
			const dateObj = new Date(year, month, d);
			const dateStr = toYYYYMMDD(dateObj);

			fetch(`/api/events?date=${dateStr}`, { credentials: 'include' })
				.then(r => r.json())
				.then(payload => {
					if (!payload || !Array.isArray(payload.items)) return;
					const items    = payload.items;
					const cell     = calendarGrid.querySelector(`[data-date="${dateStr}"]`);
					if (!cell) return;

					// Today ring
					if (dateStr === todayStr) cell.classList.add('is-today');

					const eventsCont = cell.querySelector('.day-events');
					if (!eventsCont) return;
					eventsCont.innerHTML = '';

					// First CAL_SHOW_MAX chips, then "+N more" pill
					const visItems = items.slice(0, CAL_SHOW_MAX);
					const extra    = items.length - visItems.length;

					visItems.forEach(it => {
						const chip = document.createElement('div');
						chip.className   = 'event-chip';
						chip.textContent = (it.action || it.text || '').slice(0, 38);
						chip.title       = it.text || '';
						eventsCont.appendChild(chip);
					});

					if (extra > 0) {
						const pill = document.createElement('button');
						pill.className   = 'cal-more-pill';
						pill.type        = 'button';
						pill.textContent = `+${extra} more`;
						pill.addEventListener('click', e => { e.stopPropagation(); openDayEvents(dateStr, dateObj); });
						eventsCont.appendChild(pill);
					}

					// Schedule chips below activity chips
					renderScheduleChipsInCell(cell, dateStr);
				})
				.catch(() => {
					// Still render schedule chips even if events fail
					const cell = calendarGrid.querySelector(`[data-date="${dateStr}"]`);
					if (cell) renderScheduleChipsInCell(cell, dateStr);
				});
		}
	}

	async function openDayEvents(dateStr, dateObj) {
		try {
			const res = await fetch(`/api/events?date=${dateStr}`, { credentials: 'include' });
			if (!res.ok) { const t = await res.text().catch(() => 'Server error'); return showModal(`Could not load events: ${t}`); }
			const data  = await res.json();
			const items = data.items || [];

			const displayDate = dateObj.toLocaleDateString('en-US', { timeZone, weekday:'long', month:'long', day:'numeric' });

			const content = document.createElement('div');
			content.style.padding = '4px';

			// Header
			const hRow = document.createElement('div');
			hRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px';
			hRow.innerHTML = `<i class="fa fa-calendar-day" style="color:var(--accent);font-size:18px"></i>`;
			const h = document.createElement('h3');
			h.textContent = displayDate;
			h.style.cssText = 'margin:0;font-size:15px';
			hRow.appendChild(h);
			content.appendChild(hRow);

			if (items.length === 0) {
				const p = document.createElement('div');
				p.className   = 'muted small';
				p.textContent = 'No activity for this day.';
				content.appendChild(p);
			} else {
				const listWrap = document.createElement('div');
				listWrap.style.cssText = 'max-height:52vh;overflow-y:auto';
				for (const it of items) {
					const wrap = document.createElement('div');
					wrap.style.cssText = 'padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.05)';
					const who    = (it.username && it.username !== 'unknown') ? it.username : (it.user_id ? `User ${it.user_id}` : 'unknown');
					const action = it.action ? `<span style="font-size:10px;font-weight:800;text-transform:uppercase;opacity:.7">${escapeHtml(it.action)} </span>` : '';
					const time   = it.time ? new Date(it.time).toLocaleTimeString('en-US', { timeZone, hour:'2-digit', minute:'2-digit' }) : '';
					wrap.innerHTML = `
						<div style="font-weight:700;font-size:13px">${action}${escapeHtml(it.text || '')}</div>
						${it.ingredient_name ? `<div style="font-size:12px"><strong>Item:</strong> ${escapeHtml(it.ingredient_name)}</div>` : ''}
						<div class="muted small" style="margin-top:4px">By ${escapeHtml(who)}${time ? ' · ' + time : ''}</div>`;
					listWrap.appendChild(wrap);
				}
				content.appendChild(listWrap);
					}

			// Schedule section
			const scheds = getSchedulesForDate(dateStr);
			if (scheds.length) {
				const schedDiv = document.createElement('div');
				schedDiv.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.07)';
				schedDiv.innerHTML = `<div style="font-weight:800;font-size:11px;text-transform:uppercase;opacity:.6;margin-bottom:8px">Schedules</div>`
					+ scheds.map(s => `<div style="display:flex;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.04)">
						<i class="fa fa-clock" style="color:var(--accent);opacity:.7;font-size:11px"></i>
						<span style="font-weight:700;font-size:13px">${escapeHtml(s.title)}</span>
						${s.time ? `<span class="muted small">${escapeHtml(s.time)}</span>` : ''}
					</div>`).join('');
				content.appendChild(schedDiv);
			}

			// Actions
			const actions = document.createElement('div');
			actions.style.cssText = 'display:flex;gap:8px;margin-top:14px;justify-content:flex-end';
			actions.innerHTML = `<button class="btn small primary" id="ddAddSched" type="button"><i class="fa fa-plus" style="margin-right:4px"></i>Add Schedule</button>
				<button class="btn ghost small" id="ddClose" type="button">Close</button>`;
			content.appendChild(actions);

			showModalElement(content);

			document.getElementById('ddClose')?.addEventListener('click', closeModal, { once: true });
			document.getElementById('ddAddSched')?.addEventListener('click', () => { closeModal(); openScheduleModal(dateStr); });

		} catch (err) {
			console.error('openDayEvents err', err);
			showModal('Failed to load events');
		}
	}

	function showModalElement(node) {
		if (typeof openEventModal === 'function') {

			const modal = document.getElementById('modal');
			const modalContent = document.getElementById('modalContent');
			modalContent.innerHTML = '';
			modalContent.appendChild(node);
			modal.classList.remove('hidden');
			modal.setAttribute('aria-hidden', 'false');
		} else {
			showModal(node.innerHTML || String(node));
		}
	}

	function showModal(htmlOrText) {
		const modal = document.getElementById('modal');
		const modalContent = document.getElementById('modalContent');
		if (!modal || !modalContent) {
			alert(typeof htmlOrText === 'string' ? htmlOrText : 'Modal missing');
			return;
		}
		modalContent.innerHTML = (typeof htmlOrText === 'string') ? htmlOrText : '';
		modal.classList.remove('hidden');
		modal.setAttribute('aria-hidden', 'false');
	}

	function escapeHtml(s) {
		if (!s && s !== 0) return '';
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function changeMonth(delta) {

		const v = state.viewDate;
		v.setMonth(v.getMonth() + delta);
		state.viewDate = startOfMonth(v);
		renderCalendarFor(state.viewDate);
	}

	function goToday() {
		const manilaNow = nowInTZ(timeZone);
		state.viewDate = startOfMonth(manilaNow);
		renderCalendarFor(state.viewDate);
	}

	if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
	if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));
	if (todayBtn) todayBtn.addEventListener('click', () => goToday());

	const manila = nowInTZ(timeZone);
	state.viewDate = startOfMonth(manila);
	renderCalendarFor(state.viewDate);

})();

function destroyAllCharts() {
	[chartStock, chartBestSeller, chartSalesTimeline, chartIngredientUsage].forEach(c => {
		try {
			c && c.destroy();
		} catch (e) {}
	});
}

function renderProductGrid() {
	const qv = (q('searchProd')?.value || '').trim().toLowerCase();
	const grid = q('productGrid');
	if (!grid) return;
	const items = DB.products.filter(p => !qv || p.name.toLowerCase().includes(qv));
	grid.innerHTML = items.map(p => `<div class="product-card card"><div class="img" style="background:var(--card);display:flex;align-items:center;justify-content:center">${p.image||'<i class="fa fa-bread-slice fa-2x"></i>'}</div><div class="pbody"><div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${p.name}</strong><div class="muted small">${p.category}</div></div><div style="text-align:right"><div><strong>₱${p.price}</strong></div><div class="muted small">${p.stock || 0} in stock</div></div></div><div style="margin-top:8px;display:flex;gap:8px"><button class="btn small p-bake" data-id="${p.id}" type="button"><i class="fa fa-fire"></i> Bake</button></div></div></div>`).join('') || '<div class="card muted">No products</div>';
	grid.querySelectorAll('.p-bake').forEach(btn => btn.addEventListener('click', () => openBakeModal(Number(btn.dataset.id))));
}

function openModalHTML(html) {
	const c = q('modalContent');
	if (!c) return;
	c.innerHTML = html;
	openModal();
}

function ingredientModalTemplate(ing) {
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

async function openIngredientDetail(id) {
	try {
		const ing = await fetchIngredient(id);
		if (!ing) return notify('Ingredient not found');
		const actResp = await apiFetch(`/api/activity?limit=50`);
		const history = (actResp && actResp.items) ? actResp.items.filter(a => Number(a.ingredient_id) === Number(id)) : [];
		const histHtml = history.length ? history.slice().map(h => `<li>${escapeHtml(h.text)} <div class="muted small">${escapeHtml(new Date(h.time).toLocaleString())}</div></li>`).join('') : '<li class="muted">No history</li>';
		const attrs = (ing.attrs && typeof ing.attrs === 'string') ? (() => {
			try {
				return JSON.parse(ing.attrs);
			} catch (e) {
				return {};
			}
		})() : (ing.attrs || {});
		const attrsHtml = Object.keys(attrs || {}).length ? Object.keys(attrs).map(k => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(attrs[k]||''))}</div>`).join('') : '<div class="muted small">No attributes</div>';

		openModalHTML(ingredientModalTemplate(Object.assign({}, ing, {
			min: ing.min_qty,
			max: ing.max_qty
		})));

		q('modalStockIn')?.addEventListener('click', () => openStockForm(id, 'in'));
		q('modalStockOut')?.addEventListener('click', () => openStockForm(id, 'out'));
	} catch (e) {
		console.error('openIngredientDetail err', e);
		notify('Could not load ingredient details');
	}
}

async function openEditIngredient(id) {
	try {
		const ing = await fetchIngredient(id);
		if (!ing) return notify('Ingredient not found');

		openModalHTML(`<h3>Edit — ${escapeHtml(ing.name)}</h3>
      <form id="editIngForm" class="form">
        <label class="field"><span class="field-label">Name</span><input id="editName" type="text" value="${escapeHtml(ing.name)}" required/></label>
        <label class="field"><span class="field-label">Quantity</span><input id="editQty" type="number" step="0.01" value="${ing.qty||0}" required/></label>
        <label class="field"><span class="field-label">Minimum</span><input id="editMin" type="number" step="0.01" value="${ing.min_qty||0}" required/></label>
        <label class="field"><span class="field-label">Unit cost (₱)</span><input id="editUnitCost" type="number" step="0.01" min="0" value="${ing.unit_cost != null ? ing.unit_cost : ''}" placeholder="e.g. 85.00"/></label>
        <div style="display:flex;gap:8px;margin-top:8px" class="modal-actions"><button class="btn primary" type="submit">Save</button><button class="btn ghost" id="cancelEdit" type="button">Cancel</button></div>
      </form>`);

		q('cancelEdit')?.addEventListener('click', closeModal);
		q('editIngForm')?.addEventListener('submit', async (e) => {
			e.preventDefault();
			const body = {
				name: q('editName')?.value || ing.name,

				qty: Number(q('editQty')?.value || ing.qty || 0),
				min_qty: Number(q('editMin')?.value || ing.min_qty || 0),
				unit_cost: q('editUnitCost')?.value ? Number(q('editUnitCost').value) : null
			};

			try {

				await apiFetch(`/api/ingredients/${id}`, {
					method: 'PUT',
					body: {
						name: body.name,
						min_qty: body.min_qty,
						unit_cost: body.unit_cost,
						attrs: ing.attrs || null
					}
				});

				if (Number(body.qty) !== Number(ing.qty || 0)) {
					const diff = Number(body.qty) - Number(ing.qty || 0);
					if (diff > 0) {
						await apiFetch(`/api/ingredients/${id}/stock`, {
							method: 'POST',
							body: {
								type: 'in',
								qty: Math.abs(diff),
								note: 'Quantity adjusted (edit)'
							}
						});
					} else if (diff < 0) {
						await apiFetch(`/api/ingredients/${id}/stock`, {
							method: 'POST',
							body: {
								type: 'out',
								qty: Math.abs(diff),
								note: 'Quantity adjusted (edit)'
							}
						});
					}
				}
				closeModal();

				await renderIngredientCards();
				await renderInventoryActivity();
				notify('Ingredient updated');
			} catch (err) {
				console.error('edit save err', err);
				notify(err.message || 'Could not update ingredient');
			}
		}, {
			once: true
		});
	} catch (err) {
		console.error('openEditIngredient err', err);
		notify('Could not open edit dialog');
	}
}

function openStockForm(id, type) {
	const ing = DB.ingredients.find(x => x.id === id);
	if (!ing) return;
	const isIn = type === 'in';
	const accentColor = isIn ? '#16a34a' : '#dc2626';
	const icon = isIn ? '↑' : '↓';

	// Quick-amount presets
	const presets = [1, 5, 10, 25, 50].map(v =>
		`<button type="button" class="stock-preset-btn" data-val="${v}"
			style="flex:1;min-width:44px;min-height:44px;font-size:15px;font-weight:800;border:1.5px solid ${accentColor};color:${accentColor};background:transparent;border-radius:8px;cursor:pointer;touch-action:manipulation"
		>${v}</button>`
	).join('');

	openModalHTML(`
		<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
			<div style="width:36px;height:36px;border-radius:50%;background:${accentColor}20;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:${accentColor}">${icon}</div>
			<div>
				<div style="font-weight:800;font-size:16px">${isIn?'Stock In':'Stock Out'}</div>
				<div style="font-weight:600;font-size:13px;color:var(--muted,#888)">${escapeHtml(ing.name)} · Current: <strong>${ing.qty} ${ing.unit}</strong></div>
			</div>
		</div>
		<form id="stockForm" class="form">
			<label class="field">
				<span class="field-label">Quantity (${escapeHtml(ing.unit)})</span>
				<input id="stockQty" type="number" inputmode="decimal" step="0.01" min="0.01"
					style="font-size:24px;font-weight:800;text-align:center;height:56px;letter-spacing:1px"
					placeholder="0" required autocomplete="off"/>
			</label>
			<div style="display:flex;gap:6px;margin:-4px 0 10px">
				${presets}
			</div>
			<label class="field">
				<span class="field-label">Note (optional)</span>
				<input id="stockNote" type="text" placeholder="e.g. Delivery from supplier" inputmode="text"/>
			</label>
			<div style="display:flex;gap:8px;margin-top:12px">
				<button class="btn primary" type="submit" style="flex:1;height:48px;font-size:15px;font-weight:800;background:${accentColor};border-color:${accentColor}">${isIn?'Add Stock':'Remove Stock'}</button>
				<button class="btn ghost" id="cancelStock" type="button" style="height:48px;padding:0 20px">Cancel</button>
			</div>
		</form>`);

	// Preset buttons fill the qty input
	document.querySelectorAll('.stock-preset-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const qtyEl = q('stockQty');
			if (qtyEl) { qtyEl.value = btn.dataset.val; qtyEl.focus(); }
		});
	});

	q('cancelStock')?.addEventListener('click', closeModal);
	q('stockForm')?.addEventListener('submit', (e) => {
		e.preventDefault();
		const qty = Number(q('stockQty')?.value || 0);
		const note = q('stockNote')?.value || '';
		if (qty <= 0) { notify('Enter a quantity greater than 0', { type: 'error' }); return; }
		applyStockChange(id, type, qty, note);
		closeModal();
	});

	// Auto-focus the qty input
	setTimeout(() => { q('stockQty')?.focus(); q('stockQty')?.select(); }, 80);
}


// ── CHART EXPORT ─────────────────────────────────────────────────────────────
function addChartDownloadBtn(canvasId, filename) {
	const canvas = document.getElementById(canvasId);
	if (!canvas) return;
	const wrap = canvas.closest('.chart-container') || canvas.parentElement;
	if (!wrap) return;
	// Remove any existing button
	const old = wrap.querySelector('.chart-dl-btn');
	if (old) old.remove();

	wrap.style.position = 'relative';
	const btn = document.createElement('button');
	btn.className = 'chart-dl-btn';
	btn.title = 'Download chart as PNG';
	btn.innerHTML = '<i class="fa fa-download"></i>';
	btn.style.cssText = 'position:absolute;top:6px;right:6px;z-index:10;width:30px;height:30px;border-radius:6px;border:1px solid rgba(0,0,0,.1);background:var(--card,#fff);color:var(--muted,#888);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:.7;transition:opacity .2s';
	btn.onmouseenter = () => btn.style.opacity = '1';
	btn.onmouseleave = () => btn.style.opacity = '.7';
	btn.onclick = () => {
		const link = document.createElement('a');
		link.download = filename || (canvasId + '.png');
		link.href = canvas.toDataURL('image/png');
		link.click();
		notify('Chart downloaded', { type: 'success', timeout: 2000 });
	};
	wrap.appendChild(btn);
}

function addAllChartDownloadBtns() {
	const charts = [
		{ id: 'stockChart',           name: 'stock-movement.png' },
		{ id: 'bestSellerChart',      name: 'top-ingredients.png' },
		{ id: 'ingredientUsageChart', name: 'ingredient-usage.png' },
		{ id: 'inventoryStockChart',  name: 'stock-history.png' },
		{ id: 'salesTimelineChart',   name: 'sales-timeline.png' },
	];
	charts.forEach(c => addChartDownloadBtn(c.id, c.name));
}

// ── UNDO BAR — fully independent of notify/toast, always visible ─────────────
function showUndoBar(message, onUndo, timeout) {
	timeout = timeout || 6000;
	var old = document.getElementById('bakery-undo-bar');
	if (old) { try { old.remove(); } catch (_) {} }

	var bar = document.createElement('div');
	bar.id = 'bakery-undo-bar';
	bar.setAttribute('style', [
		'position:fixed',
		'bottom:24px',
		'left:50%',
		'transform:translateX(-50%) translateY(120px)',
		'background:#1e293b',
		'color:#ffffff',
		'padding:12px 16px 15px 20px',
		'border-radius:999px',
		'display:flex',
		'align-items:center',
		'gap:14px',
		'z-index:99999',
		'box-shadow:0 8px 32px rgba(0,0,0,0.32)',
		'transition:transform 0.35s cubic-bezier(0.34,1.4,0.64,1)',
		'pointer-events:auto',
		'min-width:280px',
		'max-width:90vw',
		'overflow:hidden',
		'box-sizing:border-box',
		'font-family:inherit'
	].join(';'));

	var msgEl = document.createElement('span');
	msgEl.setAttribute('style', 'flex:1;font-size:13px;font-weight:600;color:#ffffff;line-height:1.3');
	msgEl.textContent = String(message || '');

	var btn = document.createElement('button');
	btn.textContent = 'Undo';
	btn.setAttribute('style', [
		'background:#3b82f6',
		'color:#ffffff',
		'border:none',
		'border-radius:999px',
		'padding:6px 18px',
		'font-size:13px',
		'font-weight:800',
		'cursor:pointer',
		'flex-shrink:0',
		'font-family:inherit',
		'line-height:1.4',
		'display:inline-block'
	].join(';'));

	var progress = document.createElement('div');
	progress.setAttribute('style',
		'position:absolute;bottom:0;left:0;height:3px;background:rgba(59,130,246,0.7);' +
		'width:100%;border-radius:0;transition:width ' + timeout + 'ms linear'
	);

	bar.appendChild(msgEl);
	bar.appendChild(btn);
	bar.appendChild(progress);
	document.body.appendChild(bar);

	// Double rAF to ensure transition triggers
	requestAnimationFrame(function() {
		requestAnimationFrame(function() {
			bar.style.transform = 'translateX(-50%) translateY(0)';
			progress.style.width = '0%';
		});
	});

	var done = false;
	function hide() {
		if (done) return;
		done = true;
		bar.style.transform = 'translateX(-50%) translateY(120px)';
		setTimeout(function() { try { bar.remove(); } catch (_) {} }, 400);
	}

	var tid = setTimeout(hide, timeout);

	btn.addEventListener('click', function(e) {
		e.stopPropagation();
		clearTimeout(tid);
		hide();
		try { onUndo(); } catch (err) { console.error('[undoBar] onUndo error', err); }
	});

	bar.addEventListener('click', function(e) {
		if (e.target === btn) return;
		clearTimeout(tid);
		hide();
	});
}

async function applyStockChange(id, type, qty, note) {
	if (!id || !['in', 'out'].includes(type) || !(qty > 0)) {
		notify('Invalid stock change');
		return;
	}

	// ── Optimistic UI update ─────────────────────────────────────────────────
	const ing = DB.ingredients.find(x => x.id === id);
	const prevQty = ing ? ing.qty : null;
	if (ing) {
		const delta = type === 'in' ? +qty : -qty;
		ing.qty = +(Math.max(0, (ing.qty || 0) + delta)).toFixed(3);
		renderIngredientCards();
		renderDashboard();
	}

	// ── Show undo bar (independent UI, always visible) ───────────────────────
	const label = type === 'in' ? '\u2191 Stock In' : '\u2193 Stock Out';
	const undoMsg = label + ': ' + qty + ' ' + (ing ? (ing.unit || '') : '') + ' \u2014 ' + (ing ? (ing.name || '') : '');
	let serverDone = false;

	showUndoBar(undoMsg, async function() {
		// Revert optimistic update
		if (ing && prevQty !== null) {
			ing.qty = prevQty;
			renderIngredientCards();
			renderDashboard();
		}
		// If server already saved, reverse it
		if (serverDone) {
			try {
				await apiFetch('/api/ingredients/' + id + '/stock', {
			method: 'POST',
					body: { type: type === 'in' ? 'out' : 'in', qty: Number(qty), note: '(undo)' }
				});
				await renderIngredientCards();
				await renderInventoryActivity();
				renderDashboard();
			} catch (_) {}
		}
		notify('Stock change undone');
	});

	try {
		await apiFetch('/api/ingredients/' + id + '/stock', {
			method: 'POST',
			body: { type: type, qty: Number(qty), note: note || '' }
		});
		serverDone = true;
		await renderIngredientCards();
		await renderInventoryActivity();
		renderStockChart();
		const reportsVisible = !document.getElementById('view-reports')?.classList.contains('hidden');
		if (reportsVisible) renderReports();
	} catch (e) {
		console.error('applyStockChange err', e);
		if (ing && prevQty !== null) {
			ing.qty = prevQty;
			renderIngredientCards();
			renderDashboard();
		}
		notify(e.message || 'Server error');
	}
}



// ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────────
(function initKeyboardShortcuts() {
	let shownHint = false;

	const SHORTCUTS = [
		{ key: '/', label: 'Focus search' },
		{ key: 'I', label: 'Go to Inventory' },
		{ key: 'R', label: 'Go to Reports' },
		{ key: 'D', label: 'Go to Dashboard' },
		{ key: 'B', label: 'Batch stock update' },
		{ key: '?', label: 'Show shortcuts' },
	];

	function showShortcutsHelp() {
		const rows = SHORTCUTS.map(s =>
			`<tr><td style="padding:6px 12px;font-weight:800;font-family:monospace;font-size:14px;background:rgba(0,0,0,.05);border-radius:4px;text-align:center">${s.key}</td><td style="padding:6px 12px">${s.label}</td></tr>`
		).join('');
		if (typeof openModalHTML === 'function') {
			openModalHTML(`<h3 style="margin:0 0 12px">Keyboard Shortcuts</h3>
				<table style="border-collapse:separate;border-spacing:0 4px;width:100%">${rows}</table>
				<div class="muted small" style="margin-top:12px">Shortcuts are disabled while typing in input fields.</div>`);
		}
	}

	document.addEventListener('keydown', (e) => {
		// Skip if typing in an input
		const tag = (e.target?.tagName || '').toLowerCase();
		if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
		// Skip if a modal is open
		const modal = document.getElementById('modal');
		if (modal && !modal.classList.contains('hidden')) return;
		// Skip with modifiers
		if (e.ctrlKey || e.metaKey || e.altKey) return;

		switch (e.key) {
			case '/':
				e.preventDefault();
				(document.getElementById('topSearch') || document.getElementById('searchIng'))?.focus();
				break;
			case 'i': case 'I':
				e.preventDefault();
				if (typeof showView === 'function') showView('inventory');
				break;
			case 'r': case 'R':
				e.preventDefault();
				if (typeof showView === 'function') showView('reports');
				break;
			case 'd': case 'D':
				e.preventDefault();
				if (typeof showView === 'function') showView('dashboard');
				break;
			case 'b': case 'B':
				e.preventDefault();
				if (typeof openBatchStockModal === 'function') openBatchStockModal();
				break;
			case '?':
				e.preventDefault();
				showShortcutsHelp();
				break;
			case 'Escape':
				if (typeof closeModal === 'function') closeModal();
				break;
		}

		if (!shownHint) {
			shownHint = true;
			setTimeout(() => {
				if (typeof notify === 'function') notify('Tip: Press ? to see keyboard shortcuts', { timeout: 4000 });
			}, 3000);
		}
	});
})();

// ── BATCH STOCK UPDATE ────────────────────────────────────────────────────────
// #9 — async so we can fetch fresh ingredients from server, not stale DB.ingredients
async function openBatchStockModal() {
	let ings;
	try {
		const resp = await apiFetch('/api/ingredients?type=ingredient&limit=200&page=1');
		ings = (resp && resp.items) ? resp.items.filter(i => i && String(i.type||'').toLowerCase() === 'ingredient') : [];
	} catch (_) {
		ings = (DB.ingredients || []).filter(i => i && String(i.type||'').toLowerCase() === 'ingredient');
	}
	if (!ings.length) { notify('No ingredients found', { type: 'warn' }); return; }

	const rows = ings.map(i => `
		<tr data-id="${i.id}" data-name="${escapeHtml(i.name)}" data-unit="${escapeHtml(i.unit||'')}">
			<td style="padding:6px 8px;font-weight:700">${escapeHtml(i.name)}</td>
			<td style="padding:6px 8px;color:var(--muted,#888);font-size:12px">${i.qty} ${escapeHtml(i.unit||'')}</td>
			<td style="padding:4px 6px">
				<select class="batch-type" style="height:34px;padding:0 6px;border-radius:6px;border:1px solid rgba(0,0,0,.12);font-size:12px">
					<option value="">—</option>
					<option value="in">Stock In</option>
					<option value="out">Stock Out</option>
				</select>
			</td>
			<td style="padding:4px 6px">
				<input class="batch-qty" type="number" inputmode="decimal" step="0.01" min="0.01" placeholder="qty"
					style="width:80px;height:34px;padding:0 8px;border-radius:6px;border:1px solid rgba(0,0,0,.12);font-size:13px;font-weight:700"/>
			</td>
			<td style="padding:4px 6px">
				<input class="batch-note" type="text" placeholder="note" style="width:80px;height:34px;padding:0 8px;border-radius:6px;border:1px solid rgba(0,0,0,.12);font-size:12px"/>
			</td>
		</tr>`).join('');

	openModalHTML(`
		<h3 style="margin:0 0 10px">Batch Stock Update</h3>
		<div class="muted small" style="margin-bottom:10px">Set type + qty for each item you want to update. Leave blank to skip.</div>
		<div style="overflow:auto;max-height:55vh">
		<table style="width:100%;border-collapse:collapse">
			<thead><tr style="font-size:12px;font-weight:800;color:var(--muted,#888)">
				<th style="padding:6px 8px;text-align:left">Item</th>
				<th style="padding:6px 8px;text-align:left">Current</th>
				<th style="padding:6px 8px;text-align:left">Type</th>
				<th style="padding:6px 8px;text-align:left">Qty</th>
				<th style="padding:6px 8px;text-align:left">Note</th>
			</tr></thead>
			<tbody>${rows}</tbody>
		</table>
		</div>
		<div style="display:flex;gap:8px;margin-top:14px">
			<button class="btn primary" id="batchReviewBtn" type="button" style="flex:1;height:44px;font-weight:800"><i class="fa fa-eye" style="margin-right:6px"></i>Review Changes</button>
			<button class="btn ghost" id="batchCancelBtn" type="button" style="height:44px;padding:0 20px">Cancel</button>
		</div>`);

	q('batchCancelBtn')?.addEventListener('click', closeModal);

	// #12 — Collect tasks first, show summary, then apply
	q('batchReviewBtn')?.addEventListener('click', async () => {
		const modal = document.querySelector('.modal-card');
		const rowEls = modal ? modal.querySelectorAll('tr[data-id]') : [];
		const tasks = [];
		rowEls.forEach(row => {
			const id   = Number(row.dataset.id);
			const name = row.dataset.name || `#${id}`;
			const unit = row.dataset.unit || '';
			const type = row.querySelector('.batch-type')?.value;
			const qty  = Number(row.querySelector('.batch-qty')?.value || 0);
			const note = (row.querySelector('.batch-note')?.value || '').trim();
			if (id && type && qty > 0) tasks.push({ id, name, unit, type, qty, note });
		});
		if (!tasks.length) { notify('No items to update', { type: 'warn' }); return; }

		// Show confirmation summary
		const summaryRows = tasks.map(t =>
			`<tr><td style="padding:6px 10px;font-weight:700">${escapeHtml(t.name)}</td>
			<td style="padding:6px 10px;color:${t.type==='in'?'#16a34a':'#dc2626'};font-weight:700">${t.type === 'in' ? '↑ In' : '↓ Out'}</td>
			<td style="padding:6px 10px;font-weight:700">${t.qty} ${escapeHtml(t.unit)}</td>
			<td style="padding:6px 10px;color:var(--muted,#888);font-size:12px">${escapeHtml(t.note)}</td></tr>`
		).join('');

		openModalHTML(`
			<h3 style="margin:0 0 10px"><i class="fa fa-clipboard-check" style="margin-right:6px;color:var(--accent)"></i>Confirm Batch Update</h3>
			<div class="muted small" style="margin-bottom:12px">${tasks.length} item${tasks.length>1?'s':''} will be updated. Review before applying.</div>
			<div style="overflow:auto;max-height:50vh">
			<table style="width:100%;border-collapse:collapse">
				<thead><tr style="font-size:11px;font-weight:800;color:var(--muted,#888)">
					<th style="padding:6px 10px;text-align:left">Item</th>
					<th style="padding:6px 10px;text-align:left">Direction</th>
					<th style="padding:6px 10px;text-align:left">Qty</th>
					<th style="padding:6px 10px;text-align:left">Note</th>
				</tr></thead>
				<tbody>${summaryRows}</tbody>
			</table>
			</div>
			<div style="display:flex;gap:8px;margin-top:14px">
				<button class="btn primary" id="batchSubmitBtn" type="button" style="flex:1;height:44px;font-weight:800"><i class="fa fa-check" style="margin-right:6px"></i>Apply All (${tasks.length})</button>
				<button class="btn ghost" id="batchBackBtn" type="button" style="height:44px;padding:0 20px">Back</button>
			</div>`);

		q('batchBackBtn')?.addEventListener('click', () => openBatchStockModal());

		q('batchSubmitBtn')?.addEventListener('click', async () => {
		const btn = q('batchSubmitBtn');
		if (btn) { btn.disabled = true; btn.textContent = `Saving ${tasks.length} items…`; }

		let ok = 0, fail = 0;
		for (const t of tasks) {
			try {
				const ing = DB.ingredients.find(x => x.id === t.id);
				if (ing) {
					const delta = t.type === 'in' ? +t.qty : -t.qty;
					ing.qty = +(Math.max(0, (ing.qty||0) + delta)).toFixed(3);
				}
				await apiFetch(`/api/ingredients/${t.id}/stock`, {
					method: 'POST',
						body: { type: t.type, qty: t.qty, note: t.note || '(batch update)' }
				});
				ok++;
			} catch (_) { fail++; }
		}
		closeModal();
		notify(`Batch done: ${ok} updated${fail ? `, ${fail} failed` : ''}`, { type: ok > 0 ? 'success' : 'error' });
		await renderIngredientCards();
		renderDashboard();
		renderStockChart();
		const reportsVisible = !document.getElementById('view-reports')?.classList.contains('hidden');
		if (reportsVisible) renderReports();
	});
	});
}
function openAddIngredient() {
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

      <label class="field field-cost"><span class="field-label">Unit cost (₱)</span><input id="ingUnitCost" type="number" step="0.01" min="0" placeholder="e.g. 85.00"/></label>

      <div class="modal-actions" style="margin-top:8px">
        <button class="btn primary" type="submit">Save</button>
        <button class="btn ghost" id="cancelAdd" type="button">Cancel</button>
      </div>
    </form>
  `);

	const mc = document.querySelector('.modal-card');
	if (mc) mc.classList.add('modal-small');

	const toggleMaterialFields = () => {
		const type = (q('ingType')?.value || 'ingredient');
		const isMaterial = type === 'ingredient';
		['field-min', 'field-max', 'field-supplier', 'field-expiry'].forEach(cls => {
			const el = document.querySelector(`#modalContent .${cls}`) || document.querySelector(`.${cls}`);
			if (el) el.style.display = isMaterial ? '' : 'none';
		});

		if (q('ingUnit')) q('ingUnit').required = isMaterial;
		if (q('ingMin')) q('ingMin').required = isMaterial;
	};

	q('ingType')?.addEventListener('change', toggleMaterialFields);

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
			unit_cost: q('ingUnitCost')?.value ? Number(q('ingUnitCost')?.value) : null,
			attrs: {}

		};

		try {

			const res = await apiFetch('/api/ingredients', {
				method: 'POST',
				body: payload
			});

			const created = res && res.ingredient ? res.ingredient : null;

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
					attrs: (typeof created.attrs === 'string' ? (() => {
						try {
							return JSON.parse(created.attrs);
						} catch (e) {
							return null;
						}
					})() : created.attrs) || null,
					icon: created.icon || 'fa-box-open'
				};

				DB.ingredients = DB.ingredients || [];

				DB.ingredients.unshift(local);
			}

			closeModal();
			await renderIngredientCards();

			await renderInventoryActivity();

			renderDashboard();
			notify('Ingredient added');
		} catch (err) {
			console.error('add ingredient err', err);
			notify(err.message || 'Could not add ingredient');
		}
	});

	function tryAutoSuggestMin() {
		const name = (q('ingName')?.value || '').trim();
		const unit = (q('ingUnit')?.value || defaultUnit).trim();
		const qty = Number(q('ingQty')?.value || 0);
		const key = name.toLowerCase();
		if (PROGRAMMED_CONSUMPTION[key] && PROGRAMMED_CONSUMPTION[key].unit === unit) {
			const suggested = +(PROGRAMMED_CONSUMPTION[key].dailyKg * 2).toFixed(3);
			q('ingMin').value = suggested;
			return;
		}
		const tmp = {
			id: nextIngredientId(),
			name,
			unit,
			qty,
			type: q('ingType')?.value || 'ingredient'
		};
		const thr = computeThresholdForIngredient(tmp);
		q('ingMin').value = thr;
	}

	q('ingName')?.addEventListener('input', tryAutoSuggestMin);
	q('ingUnit')?.addEventListener('change', tryAutoSuggestMin);
	q('ingQty')?.addEventListener('input', tryAutoSuggestMin);

	tryAutoSuggestMin();
}

function openAddProduct() {
	const ingOptions = DB.ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
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
	if (mc) mc.classList.add('modal-small');

	q('cancelAddProd')?.addEventListener('click', closeModal);

	const recipe = [];

	function renderRecipeList() {
		const list = q('recipeList');
		if (!list) return;
		list.innerHTML = recipe.map((r, idx) => {
			const n = DB.ingredients.find(i => i.id === r.ingredient_id)?.name || 'Unknown';
			return `<div data-idx="${idx}" style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-radius:6px;background:var(--card);border:1px solid rgba(0,0,0,0.04);margin-bottom:6px">
                <div style="flex:1">${n} — <strong>${r.qty_per_unit}</strong></div>
                <div><button class="btn small remove-recipe" data-idx="${idx}" type="button">Remove</button></div>
              </div>`;
		}).join('');
		list.querySelectorAll('button.remove-recipe').forEach(btn => btn.addEventListener('click', () => {
			const idx = Number(btn.dataset.idx);
			if (!Number.isFinite(idx)) return;
			recipe.splice(idx, 1);
			renderRecipeList();
		}));
	}

	q('addRecipeLine')?.addEventListener('click', () => {
		const iid = Number(q('recipeIng')?.value || 0);
		const qty = Number(q('recipeQty')?.value || 0);
		if (!iid || qty <= 0) {
			notify('Pick ingredient and qty');
			return;
		}
		recipe.push({
			ingredient_id: iid,
			qty_per_unit: qty
		});
		renderRecipeList();
		if (q('recipeQty')) q('recipeQty').value = '';
	});

	q('addProdForm')?.addEventListener('submit', (e) => {
		e.preventDefault();
		const name = q('prodName')?.value.trim();
		if (!name) {
			notify('Product name required');
			return;
		}
		const category = q('prodCategory')?.value || '';
		const price = Number(q('prodPrice')?.value) || 0;
		const stock = Number(q('prodStock')?.value) || 0;
		const normalizedRecipe = (recipe || []).map(r => ({
			ingredient_id: Number(r.ingredient_id),
			qty_per_unit: Number(r.qty_per_unit) || 0
		}));
		const newP = {
			id: nextProductId(),
			name,
			category,
			price,
			stock,
			recipe: normalizedRecipe
		};
		DB.products.push(newP);
		DB.activity.push({
			text: `Added product ${name}`,
			time: new Date().toLocaleString()
		});
		closeModal();
		renderProductGrid();
		renderDashboard();
		notify('Product added');
	});
}

function openBakeModal(productId) {
	const product = DB.products.find(p => p.id === productId) || DB.products[0];
	if (!product) return;
	const recipeLines = (product.recipe || []).map(r => {
		const ing = DB.ingredients.find(i => i.id === r.ingredient_id) || {
			name: 'Unknown',
			qty: 0,
			unit: 'u',
			id: null
		};
		return `<tr><td>${ing.name}</td><td class="req" data-ingredient="${ing.id}">${r.qty_per_unit}</td><td class="avail">${ing.qty}</td></tr>`;
	}).join('');
	openModalHTML(`<h3>Bake — ${product.name}</h3><div class="muted small">Recipe summary</div><table style="width:100%;margin-top:8px;border-collapse:collapse"><thead><tr style="text-align:left"><th>Ingredient</th><th>Per unit</th><th>Available</th></tr></thead><tbody>${recipeLines}</tbody></table><form id="bakeForm" style="margin-top:12px"><label class="field"><span class="field-label">Quantity to bake</span><input id="bakeQty" type="number" value="1" min="1" required/></label><div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary" type="submit">Confirm Bake</button><button class="btn ghost" id="cancelBake" type="button">Cancel</button></div></form>`);
	q('cancelBake')?.addEventListener('click', closeModal);
	q('bakeForm')?.addEventListener('submit', (e) => {
		e.preventDefault();
		const qty = Number(q('bakeQty')?.value) || 1;
		const shortages = [];
		(product.recipe || []).forEach(r => {
			const ing = DB.ingredients.find(i => i.id === r.ingredient_id);
			const required = +(r.qty_per_unit * qty);
			if (!ing || ing.qty < required) shortages.push({
				ingredient: ing ? ing.name : 'Unknown',
				required,
				available: ing ? ing.qty : 0
			});
		});
		if (shortages.length) {
			notify('Shortage:\n' + shortages.map(s => `${s.ingredient}: need ${s.required}, have ${s.available}`).join('\n'));
			return;
		}
		(product.recipe || []).forEach(r => {
			const ing = DB.ingredients.find(i => i.id === r.ingredient_id);
			if (!ing) return;
			const required = +(r.qty_per_unit * qty);
			ing.qty = +(Math.max(0, ing.qty - required)).toFixed(3);
			DB.activity.push({
				text: `Used ${required} ${ing.unit} for ${product.name}`,
				time: new Date().toLocaleString(),
				ingredient_id: ing.id
			});
		});
		product.stock = (product.stock || 0) + qty;
		DB.activity.push({
			text: `Baked ${qty} x ${product.name}`,
			time: new Date().toLocaleString()
		});
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

function populateSettings() {

	const list = q('usersList');
	if (list) {
		const acc = loadAccounts();
		const curr = getSession()?.username;
		const rows = Object.keys(acc || {}).map(u => {
			const role = acc[u].role || '';
			return `<div class="user-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:8px;background:var(--card);border:1px solid rgba(0,0,0,0.04)">
        <div><strong>${escapeHtml(u)}</strong><div class="muted small">${escapeHtml(role)}</div></div>
        <div>${u!==curr?`<button class="btn small" data-del="${escapeHtml(u)}" type="button">Delete</button>`:`<span class="muted small">Signed in</span>`}</div>
      </div>`;
		}).join('');
		list.innerHTML = rows || '<div class="muted small">No users</div>';
		list.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', () => {
			const u = b.dataset.del;
			if (!u) return;
			if (confirm(`Delete user ${u}?`)) {
				const ac = loadAccounts();
				delete ac[u];
				saveAccounts(ac);
				populateSettings();
				notify('User deleted');
			}
		}));
	}

	if (!document.getElementById('settings-toggle-style')) {
		const st = document.createElement('style');
		st.id = 'settings-toggle-style';
		st.textContent = `
      .switch { display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
      .switch input { display:none; }
      .switch .slider { width:44px; height:24px; background:#ddd; border-radius:24px; position:relative; transition:background .18s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
      .switch .slider::after { content:''; position:absolute; left:4px; top:4px; width:16px; height:16px; background:#fff; border-radius:50%; transition: transform .18s ease; box-shadow:0 1px 2px rgba(0,0,0,0.12); }
      .switch input:checked + .slider { background: #1b85ec; }
      .switch input:checked + .slider::after { transform: translateX(20px); }

      #app-toast-wrap { position:fixed; right:18px; bottom:20px; z-index:16000; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
      .app-toast { pointer-events:auto; background:var(--card); color:var(--text); padding:10px 12px; border-radius:10px; box-shadow:0 12px 30px rgba(19,28,38,0.08); font-weight:700; min-width:180px; max-width:320px; border:1px solid rgba(0,0,0,0.06); opacity:0; transform:translateY(8px); transition:all .28s ease; }
      .app-toast.show { opacity:1; transform:translateY(0); }

      .custom-cursor, .custom-cursor * { cursor: url("./default.png") 14 14, auto !important; }
      .custom-cursor a,
      .custom-cursor button,
      .custom-cursor input,
      .custom-cursor textarea,
      .custom-cursor select,
      .custom-cursor label,
      .custom-cursor [role="button"],
      .custom-cursor .btn { cursor: auto !important; }
    `;
		document.head.appendChild(st);
	}

	if (typeof window.notify !== 'function' || !window.notify._overrideBySettings) {
		window.notify = function(message, opts) {
			try {
				const timeout = (opts && Number(opts.timeout)) ? Number(opts.timeout) : 3000;
				const maxToasts = (opts && Number(opts.max)) ? Number(opts.max) : 4;

				let wrap = document.getElementById('app-toast-wrap');
				if (!wrap) {
					wrap = document.createElement('div');
					wrap.id = 'app-toast-wrap';
					document.body.appendChild(wrap);
				}

				while (wrap.children.length >= maxToasts) {
					const oldest = wrap.firstElementChild;
					if (!oldest) break;
					oldest.classList.remove('show');

					setTimeout(() => {
						try {
							oldest.remove();
						} catch (e) {}
					}, 260);
				}

				const t = document.createElement('div');
				t.className = 'app-toast';
				t.setAttribute('role', 'status');
				t.setAttribute('aria-live', 'polite');
				t.textContent = String(message || '');
				wrap.appendChild(t);

				setTimeout(() => t.classList.add('show'), 20);

				setTimeout(() => {
					t.classList.remove('show');
					setTimeout(() => {
						try {
							t.remove();
						} catch (e) {}
					}, 260);
				}, Math.max(1200, timeout));
			} catch (e) {
				try {
					alert(message);
				} catch (_) {}
			}
		};
		window.notify._overrideBySettings = true;
	}

	const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
	// Re-apply theme in case page reloaded
	applyTheme(currentTheme);

	// Render the color palette grid (replaces old dark-mode toggle)
	renderColorPaletteGrid();

	// Also re-render grid whenever the settings view is shown
	document.querySelectorAll('.nav-item').forEach(btn => {
		if (btn.dataset && btn.dataset.view === 'settings') {
			btn.addEventListener('click', () => setTimeout(renderColorPaletteGrid, 60));
		}
	});

	// ── Delete mode toggle (Owner only) ──────────────────────────────
	function initDeleteModeToggle() {
		const wrap     = q('deleteToggleWrap');
		const noAccess = q('deleteToggleNoAccess');
		const tog      = q('allowDeleteToggle');
		if (!wrap || !noAccess || !tog) return;

		if (canUseDeleteMode()) {
			wrap.style.display = 'block';
			noAccess.style.display = 'none';
			tog.checked = isDeleteModeEnabled();
			tog.addEventListener('change', () => {
				localStorage.setItem(DELETE_MODE_KEY, tog.checked ? 'true' : 'false');
				notify('Delete mode ' + (tog.checked ? 'enabled' : 'disabled'));
				// Refresh inventory table so delete buttons appear/disappear instantly
				if (document.querySelector('#view-inventory:not(.hidden)')) {
					renderIngredientCards();
				}
			});
		} else {
			wrap.style.display = 'none';
			noAccess.style.display = 'block';
		}
	}
	initDeleteModeToggle();
	// Re-check role every time settings tab is opened (in case user just logged in)
	document.querySelectorAll('.nav-item').forEach(btn => {
		if (btn.dataset && btn.dataset.view === 'settings') {
			btn.addEventListener('click', () => setTimeout(initDeleteModeToggle, 80));
		}
	});

	if (!document.getElementById('customCursorToggle')) {
		const container = q('settingsControls') || q('usersList')?.parentElement;
		if (container) {
			const row = document.createElement('div');
			row.style.margin = '8px 0';
			row.innerHTML = `<label class="switch"><input id="customCursorToggle" type="checkbox" ${(localStorage.getItem('bakery_custom_cursor') === 'true') ? 'checked':''} /><span class="slider" aria-hidden="true"></span><span class="switch-label"> Custom cursor</span></label>`;
			container.insertBefore(row, container.firstChild);
		}
	}

	// themeToggle is now a hidden legacy element; palette swatches handle theme changes.

	const curToggle = document.getElementById('customCursorToggle');
	if (curToggle) {
		const apply = (flag) => {
			if (flag) document.documentElement.classList.add('custom-cursor');
			else document.documentElement.classList.remove('custom-cursor');
			localStorage.setItem('bakery_custom_cursor', flag ? 'true' : 'false');
		};

		apply(localStorage.getItem('bakery_custom_cursor') === 'true');
		curToggle.addEventListener('change', (e) => {
			apply(!!e.target.checked);
			notify('Custom cursor ' + (e.target.checked ? 'enabled' : 'disabled'));
		});
	}

	const oldSave = q('saveBakery');
	if (oldSave) {
		try {
			oldSave.replaceWith(oldSave.cloneNode(true));
		} catch (e) {}

	}
}

async function loadRemoteInventory() {
  try {
    let allItems = [];
    let page = 1;
    const perPage = 500;

    while (true) {
      const res = await fetch(`/api/ingredients?limit=${perPage}&page=${page}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        console.debug('loadRemoteInventory failed for page', page, res.status);
        break;
      }

      const json = await res.json().catch(() => null);
      const pageItems = json && (json.items || json.data) ? (json.items || json.data) : [];
      if (!Array.isArray(pageItems) || pageItems.length === 0) break;

      allItems = allItems.concat(pageItems);

      if (json && json.meta && typeof json.meta.total === 'number') {
        const totalPages = Math.ceil((json.meta.total || 0) / perPage);
        if (page >= totalPages) break;
      } else if (pageItems.length < perPage) {
        
        break;
      }

      page++;
    }

    if (!Array.isArray(allItems) || allItems.length === 0) return;

    DB.ingredients = allItems.map(i => ({
      id: i.id,
      name: i.name,
      unit: (i.unit && String(i.unit).trim()) || (i.unit_name && String(i.unit_name).trim()) || ((i.type === 'ingredient') ? 'kg' : ''),
      qty: Number(i.qty || i.quantity || 0),
      min: Number(i.min_qty || i.min || 0),
      max: i.max_qty || i.max || null,
      expiry: i.expiry || null,
      supplier: i.supplier || '',
      type: i.type || 'ingredient',
      attrs: (typeof i.attrs === 'string' ? (() => { try { return JSON.parse(i.attrs); } catch (e) { return null; } })() : i.attrs) || null,
      icon: i.icon || 'fa-box-open'
    }));

    renderIngredientCards();
    renderDashboard();
  } catch (err) {
    console.error('loadRemoteInventory error', err);
  }
}


function startApp() {
	showApp(true);
	showOverlay(false);
	loadRemoteInventory().catch(() => {});
	const user = getSession() || {
		name: 'Guest',
		role: 'Baker'
	};
	if (q('sidebarUser')) q('sidebarUser').textContent = `${user.name} — ${user.role}`;
	if (q('userBadgeText')) q('userBadgeText').textContent = `${user.name}`;
	if (q('userMenuName')) q('userMenuName').textContent = user.name || '';
	if (q('userMenuRole')) q('userMenuRole').textContent = user.role || '';

	renderDashboard();
	renderIngredientCards();
	renderProductGrid();
	renderActivity();
	initSearchFeature();
	buildTopNav();
	showView('dashboard');
	setupSidebarToggle();

	document.querySelectorAll('.nav-item').forEach(btn => {
		btn.onclick = () => {
			if (!isLoggedIn()) {
				showOverlay(true, true);
				return;
			}
			const view = btn.dataset.view;
			if (view === 'profile') {
				populateProfile();
				bindProfileControls();
			}
			if (view === 'settings') populateSettings();
			showView(view);
			const sb = q('sidebar');
			if (sb && window.innerWidth <= 900) sb.classList.remove('open');
			const overlay = document.getElementById('drawerOverlay');
			if (overlay) overlay.remove();
		};
	});

	on('addProductBtn', 'click', openAddProduct);
	on('addIngredientBtn', 'click', openAddIngredient);
	on('quickAddIng', 'click', openAddIngredient);
	on('searchIng', 'input', renderIngredientCards);
	on('searchProd', 'input', renderProductGrid);
	document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', (e) => {
		document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
		e.currentTarget.classList.add('active');
		renderIngredientCards();
	}));

	on('createOrderBtn', 'click', openNewOrderModal);
	on('refreshReports', 'click', () => renderReports());
	on('batchStockBtn', 'click', () => openBatchStockModal());
	on('reportPeriod', 'change', () => renderReports());
	on('searchOrder', 'input', () => renderOrders());

	on('applyReportRange', 'click', () => {});

	on('exportReportsBtn', 'click', () => {
		const start = q('reportStart')?.value;
		const end = q('reportEnd')?.value;
		if (!start || !end) {
			notify('Choose a date range first');
			return;
		}
		exportReportsCSV(start + 'T00:00:00Z', end + 'T23:59:59Z');
	});

	on('calendarPrev', 'click', () => {
		currentCalendarMonth--;
		if (currentCalendarMonth < 0) {
			currentCalendarMonth = 11;
			currentCalendarYear--;
		}
		renderCalendar();
	});
	on('calendarNext', 'click', () => {
		currentCalendarMonth++;
		if (currentCalendarMonth > 11) {
			currentCalendarMonth = 0;
			currentCalendarYear++;
		}
		renderCalendar();
	});
	on('calendarToday', 'click', () => {
		const now = new Date();
		currentCalendarYear = now.getFullYear();
		currentCalendarMonth = now.getMonth();
		renderCalendar();
	});

	on('addScheduleBtn', 'click', () => {
		const todayStr = new Date().toISOString().slice(0, 10);
		openScheduleModal(todayStr);
	});

	const hb = q('hamburger');
	if (hb) {
		hb.onclick = () => {
			const sb = q('sidebar');
			if (!sb) return;
			if (sb.classList.contains('open')) {
				sb.classList.remove('open');
				const overlay = document.getElementById('drawerOverlay');
				if (overlay) overlay.remove();
				return;
			}
			const o = document.createElement('div');
			o.id = 'drawerOverlay';
			o.style.position = 'fixed';
			o.style.inset = '0';
			o.style.zIndex = '9998';
			o.style.background = 'rgba(0,0,0,0.18)';
			o.addEventListener('click', () => {
				sb.classList.remove('open');
				o.remove();
			});
			document.body.appendChild(o);
			sb.classList.add('open');
		};
	}

	if (q('userBadge')) q('userBadge').onclick = (e) => {
		const um = q('userMenu');
		if (!um) return;
		const next = um.classList.toggle('hidden');
		um.setAttribute('aria-hidden', next);
	};
	document.addEventListener('click', (e) => {
		const um = q('userMenu'),
			badge = q('userBadge');
		if (!um || !badge) return;
		if (!um.classList.contains('hidden') && !um.contains(e.target) && !badge.contains(e.target)) {
			um.classList.add('hidden');
			um.setAttribute('aria-hidden', 'true');
		}
	});

	if (q('userMenuLogout')) q('userMenuLogout').onclick = performLogout;
	if (q('userMenuProfile')) q('userMenuProfile').onclick = () => {
		populateProfile();
		showView('profile');
		q('userMenu') && q('userMenu').classList.add('hidden');
	};
	if (q('logoutBtn')) q('logoutBtn').addEventListener('click', performLogout);
	// saveProfile is bound in bindProfileControls — do not add a second listener here
	if (q('saveBakery')) q('saveBakery').addEventListener('click', (e) => {
		e.preventDefault();
		const o = {
			name: q('bakeryName')?.value || '',
			address: q('bakeryAddress')?.value || '',
			unit: q('bakeryUnit')?.value || ''
		};
		localStorage.setItem('bakery_profile', JSON.stringify(o));
		notify('Bakery settings saved');
	});
	if (q('modalClose')) q('modalClose').addEventListener('click', closeModal);
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') closeModal();
	});

	// themeToggle is now hidden; color palette swatches handle theme switching.
	if (q('addIngredientBtn')) q('addIngredientBtn').addEventListener('click', openAddIngredient);
	if (q('addProductBtn')) q('addProductBtn').addEventListener('click', openAddProduct);

	enforcePermissionsUI();

	if (q('view-inventory') && !q('exportInventoryCsvBtn')) {
		renderIngredientCards();
	}
	
	const applyBtn = q('applyReportRange');
	if (applyBtn) {
		applyBtn.removeEventListener?.('click', () => {});
		applyBtn.addEventListener('click', () => {
			const presetDays = Number(q('reportPreset')?.value || 30);
			const end = new Date();
			const start = new Date();
			start.setDate(end.getDate() - (presetDays - 1));
			q('reportStart').value = start.toISOString().slice(0, 10);
			q('reportEnd').value = end.toISOString().slice(0, 10);
			const filter = q('reportFilter')?.value || 'usage';
			renderReports(q('reportStart').value, q('reportEnd').value, filter);
			renderStockChart(q('reportStart').value, q('reportEnd').value);
		});
	}

	if (typeof populateProfile === 'function') populateProfile();
	if (typeof bindProfileControls === 'function') bindProfileControls();

	renderStockChart();
	renderBestSellerChart();
	initSearchFeature();
}
async function performLogout() {
	try {
		await fetch('/api/auth/logout', {
			method: 'POST',
			credentials: 'include'
		});
	} catch (e) {}
	clearSession();
	destroyAllCharts();
	showApp(false);
	showOverlay(true, true);
	if (q('overlay-username')) q('overlay-username').value = '';
	if (q('overlay-password')) q('overlay-password').value = '';
}

const RECENT_LOGINS_KEY = 'bakery_recent_logins_v1';

function loadRecentProfiles() {
	try {
		return JSON.parse(localStorage.getItem(RECENT_LOGINS_KEY) || '[]');
	} catch (e) {
		return [];
	}
}

function saveRecentProfileLocally(username) {
	if (!username) return;
	const arr = loadRecentProfiles().filter(u => u.toLowerCase() !== username.toLowerCase());
	arr.unshift(username);
	localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(arr.slice(0, 6)));
	renderRecentProfiles();
}

function removeRecentProfile(username) {
	const arr = loadRecentProfiles().filter(u => u.toLowerCase() !== username.toLowerCase());
	localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(arr.slice(0, 6)));
	renderRecentProfiles();
}

function renderRecentProfiles() {
	const wrap = q('recentProfiles');
	if (!wrap) return;
	const list = loadRecentProfiles();
	if (!list || list.length === 0) {
		wrap.innerHTML = '';
		return;
	}

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
	wrap.querySelectorAll('.recent-profile').forEach(el => {
		const user = el.dataset.user;
		el.addEventListener('click', (ev) => {
			if (ev.target && ev.target.classList && ev.target.classList.contains('rp-remove')) return;
			const u = el.dataset.user;
			if (q('overlay-username')) q('overlay-username').value = u;
			if (q('overlay-password')) {
				q('overlay-password').value = '';
				q('overlay-password').focus();
			}
		});

		el.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				el.click();
			}
		});
	});
	wrap.querySelectorAll('.rp-remove').forEach(btn => {
		btn.addEventListener('click', (ev) => {
			ev.stopPropagation();
			const u = btn.dataset.user;
			if (!u) return;
			removeRecentProfile(u);
		});
	});
}

document.addEventListener('DOMContentLoaded', () => {
	renderRecentProfiles();
});

function updateSwapShift() {
  const overlay = q('landingOverlay');
  const visual = q('.landing-visual');
  const forms = q('.landing-forms');
  if (!overlay || !visual || !forms) return;

  const rectV = visual.getBoundingClientRect();
  const rectF = forms.getBoundingClientRect();

  // distance from visual.left to forms.left (can be negative on small screens)
  const shift = rectF.left - rectV.left;

  // set on the overlay or documentElement so CSS can read it
  overlay.style.setProperty('--swap-shift', `${shift}px`);
}

// call once on load and on resize so the pixel value is accurate
window.addEventListener('load', updateSwapShift);
window.addEventListener('resize', () => {
  // throttle lightly if needed; this is fine for most apps
  updateSwapShift();
});

document.addEventListener('DOMContentLoaded', () => {
	const accounts = loadAccounts();
	if (Object.keys(accounts).length === 0) {
		accounts['admin'] = {
			password: 'admin',
			role: 'Owner',
			name: 'Admin'
		};
		saveAccounts(accounts);
	}

	const splash = q('splash'),
		overlay = q('landingOverlay'),
		loginPanel = q('overlayLogin'),
		signupPanel = q('overlaySignup');
	const splashDuration = 5200;
	if (splash) {
		splash.style.background = splash.style.background || '#fff';
		splash.style.transition = splash.style.transition || 'opacity 700ms ease, visibility 700ms ease';
		splash.style.opacity = '1';
		splash.style.visibility = 'visible';
		splash.classList.remove('hidden');
	}

	setTimeout(() => {
		if (splash) {
			splash.style.opacity = '0';
			setTimeout(() => {
				try {
					splash.classList.add('hidden');
					splash.style.visibility = 'hidden';
				} catch (e) {}
				const pers = getPersistentSession();
				if (pers && pers.username) {
					setSession(pers, true);
					startApp();
					applyTheme(localStorage.getItem(THEME_KEY) || 'light');
				} else {
					showOverlay(true, true);
				}
			}, 760);
			return;
		}
		const pers = getPersistentSession();
		if (pers && pers.username) {
			setSession(pers, true);
			startApp();
			applyTheme(localStorage.getItem(THEME_KEY) || 'light');
		} else {
			showOverlay(true, true);
		}
	}, splashDuration);

	on('overlayToSignup', 'click', () => {
  const overlay = q('landingOverlay');
  if (!overlay) return;
  updateSwapShift();               // compute pixel shift for current layout
  overlay.classList.add('signup-mode');

  // update aria-hidden for screen readers (keep DOM present for animation)
  q('.landing-forms')?.setAttribute('aria-hidden', 'false');
  q('.landing-visual')?.setAttribute('aria-hidden', 'false');

  // focus signup field after animation completes (match CSS 520ms)
  setTimeout(() => q('overlay-su-username')?.focus(), 560);
});

	on('overlayBackToLogin', 'click', () => {
  const overlay = q('landingOverlay');
  if (!overlay) return;
  updateSwapShift();
  overlay.classList.remove('signup-mode');

  // focus sign-in username after animation completes
  setTimeout(() => q('overlay-username')?.focus(), 420);
});

	on('forgotPasswordBtn', 'click', (e) => {
		openForgotPasswordModal();
	});

	on('overlaySignInBtn', 'click', async (e) => {
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
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({
						username,
						password
					})
				});
				const data = await res.json();
				if (!res.ok) {
					notify(data?.message || data?.error || 'Login failed');
					setButtonLoadingWithMin(btn, false, 600);
					showGlobalLoader(false);
					return;
				}

				const userObj = {
					username: data.user.username,
					role: data.user.role,
					name: data.user.name || data.user.username,
					id: data.user.id
				};
				setSession(userObj, remember);
				if (typeof saveRecentProfileLocally === 'function') saveRecentProfileLocally(username);

				setSession({
					username: data.user.username,
					role: data.user.role,
					name: data.user.name
				}, remember);
				saveRecentProfileLocally(username);
				setButtonLoadingWithMin(btn, false, 600);
				showGlobalLoader(false);
				startApp();
				applyTheme(localStorage.getItem(THEME_KEY) || 'light');
				return;
			} catch (innerErr) {
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
					const userObj = {
						username,
						role: acc[username].role,
						name: acc[username].name || username
					};
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

	on('overlaySignUpBtn', 'click', async (e) => {
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
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({
						username,
						password,
						role,
						email: document.getElementById('overlay-su-email')?.value || null,
						name: username
					})
				});
				const data = await res.json();
				if (!res.ok) {
					notify(data?.message || data?.error || 'Signup failed');
					setButtonLoadingWithMin(btn, false, 600);
					showGlobalLoader(false);
					return;
				}
				setSession({
					username: data.user.username,
					role: data.user.role,
					name: data.user.name
				}, true);
				notify('Account created. Please sign in.');
				q('overlay-username') && (q('overlay-username').value = username);
				q('overlay-password') && (q('overlay-password').value = '');

				const overlay = q('landingOverlay');
				if (overlay) overlay.classList.remove('signup-mode');

				// keep panels visible and focus the username field
				q('overlaySignup') && q('overlaySignup').classList.remove('hidden');
				q('overlayLogin') && q('overlayLogin').classList.remove('hidden');
				setTimeout(() => q('overlay-username')?.focus(), 320);

				setButtonLoadingWithMin(btn, false, 600);
				showGlobalLoader(false);
				return;
			} catch (innerErr) {
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
				acc[username] = {
					password,
					role,
					name: username
				};
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

	on('modalClose', 'click', closeModal);
	on('exportBtn', 'click', () => {
		const payload = {
			db: DB,
			accounts: loadAccounts(),
			meta: {
				exportedAt: new Date().toISOString()
			}
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `bakery-backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	});
	on('importBtn', 'click', () => {
		const f = q('importInput')?.files?.[0];
		if (!f) return notify('Choose a backup file first');
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const data = JSON.parse(ev.target.result);
				if (!confirm('Import will replace current DB and accounts. Continue?')) return;
				if (data.db) DB = data.db;
				if (data.accounts) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data.accounts));
				renderIngredientCards();
				renderProductGrid();
				renderDashboard();
				notify('Import successful');
			} catch (e) {
				notify('Invalid backup file');
			}
		};
		reader.readAsText(f);
	});
	const pers = getPersistentSession();
	if (pers && pers.username) {
		setSession(pers, true);
		startApp();
		applyTheme(localStorage.getItem(THEME_KEY) || 'light');
	}

	(async function tryServerSession() {
		try {
			const res = await fetch('/api/auth/me', {
				credentials: 'include'
			});
			if (res.ok) {
				const data = await res.json();
				setSession({
					username: data.user.username,
					name: data.user.name,
					role: data.user.role
				}, true);
				startApp();
				applyTheme(localStorage.getItem(THEME_KEY) || 'light');
				return;
			}
		} catch (e) {}
		showOverlay(true, true);
	})();

});

async function populateProfile() {
	let s = getSession();
	try {
		const res = await fetch('/api/auth/me', {
			credentials: 'include'
		});
		if (res.ok) {
			const data = await res.json();
			if (data && data.user) {
				s = data.user;
				setSession(s, !!getPersistentSession());
			}
		}
	} catch (e) {
		console.debug('populateProfile: no server /api/auth/me', e && e.message ? e.message : e);
	}

	if (!s) return;
	if (q('profileName')) q('profileName').value = s.name || '';
	if (q('profileRole')) q('profileRole').value = s.role || '';
	if (q('profileUsername')) q('profileUsername').value = s.username || '';

	const prefsRaw = localStorage.getItem(prefsKeyFor(s.username)) || '{}';
	let prefs = {};
	try {
		prefs = JSON.parse(prefsRaw);
	} catch (e) {
		prefs = {};
	}

	if (q('profileEmail')) q('profileEmail').value = prefs.email || s.email || '';
	if (q('profilePhone')) q('profilePhone').value = prefs.phone || '';
	if (q('profileTimezone')) q('profileTimezone').value = prefs.timezone || 'Asia/Manila';
	// Note: prefEmailNotif and prefPushNotif are intentionally NOT set here —
	// they live in view-settings and are managed by notifications.js

	const avatarData = localStorage.getItem(avatarKeyFor(s.username));
	const avatarWrap = q('profileAvatarPreview');
	if (avatarWrap) {
		avatarWrap.innerHTML = '';
		if (avatarData) {
			const img = document.createElement('img');
			img.src = avatarData;
			avatarWrap.appendChild(img);
		} else {
			avatarWrap.innerHTML = '<i class="fa fa-user fa-2x"></i>';
		}
	}

	renderRecentLogins();

	const current = getSession();
	if (current && current.role === 'Owner') {
		if (q('profileRole')) q('profileRole').removeAttribute('readonly');
	} else {
		if (q('profileRole')) q('profileRole').setAttribute('readonly', 'true');
	}

	if (q('changePassStatus')) q('changePassStatus').textContent = '';
	if (q('curPassword')) q('curPassword').value = '';
	if (q('newPassword')) q('newPassword').value = '';
	if (q('confirmPassword')) q('confirmPassword').value = '';
}

function renderRecentLogins() {
	const listEl = q('recentLogins');
	if (!listEl) return;
	const raw = localStorage.getItem('recent_logins') || '[]';
	let arr = [];
	try {
		arr = JSON.parse(raw)
	} catch (e) {
		arr = [];
	}
	listEl.innerHTML = arr.slice().reverse().slice(0, 6).map(r => {
		return `<li style="padding:8px;border-radius:8px;margin-bottom:8px;background:var(--card);display:flex;justify-content:space-between;gap:8px;align-items:center">
      <div><strong>${escapeHtml(r.username)}</strong><div class="muted small">${escapeHtml(r.time)}</div></div>
      <div><button class="btn small" data-username="${escapeHtml(r.username)}">Use</button></div>
    </li>`;
	}).join('') || '<div class="muted small">No recent logins</div>';
	listEl.querySelectorAll('button[data-username]').forEach(b => {
		b.addEventListener('click', () => {
			const u = b.dataset.username;

			const ou = q('overlay-username');
			const op = q('overlay-password');
			if (ou) {
				ou.value = u;
				ou.focus();
			}
			if (op) {
				setTimeout(() => op.focus(), 120);
			}
			showView('');
		});
	});
}

function bindProfileAvatarUpload() {
	const input = q('profileAvatarInput');
	if (!input) return;
	input.addEventListener('change', (e) => {
		const file = input.files && input.files[0];
		if (!file) return;
		if (file.size > 1_500_000) {
			notify('Avatar too large (max ~1.5MB)');
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			const s = getSession();
			if (!s) return;
			const dataURL = ev.target.result;
			const wrap = q('profileAvatarPreview');
			if (wrap) {
				wrap.innerHTML = '';
				const img = document.createElement('img');
				img.src = dataURL;
				wrap.appendChild(img);
			}
			localStorage.setItem(avatarKeyFor(s.username), dataURL);
			notify('Avatar updated');
		};
		reader.readAsDataURL(file);
	});

	const rem = q('removeAvatar');
	if (rem) rem.addEventListener('click', () => {
		const s = getSession();
		if (!s) return;
		localStorage.removeItem(avatarKeyFor(s.username));
		const wrap = q('profileAvatarPreview');
		if (wrap) {
			wrap.innerHTML = '<i class="fa fa-user fa-2x"></i>';
		}
		notify('Avatar removed');
	});
}

async function saveProfile() {
	const s = getSession();
	if (!s) {
		notify('Not signed in');
		return;
	}

	const saveBtn = q('saveProfile');
	if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

	const name     = q('profileName')?.value?.trim() || s.name || '';
	const role     = q('profileRole')?.value?.trim() || s.role || '';
	const email    = q('profileEmail')?.value?.trim() || '';
	const phone    = q('profilePhone')?.value?.trim() || '';
	const timezone = q('profileTimezone')?.value || 'Asia/Manila';

	// Update local session
	s.name = name;
	const sess = getSession();
	if (sess && sess.role === 'Owner') s.role = role;
	setSession(s, !!getPersistentSession());

	try {
		const acc = loadAccounts();
		if (acc && acc[s.username]) {
			acc[s.username].name = name;
			acc[s.username].role = s.role;
			saveAccounts(acc);
		}
	} catch (e) {}

	// Save prefs to localStorage — deliberately NOT touching notification prefs
	// (those are managed by notifications.js and saved separately to the server)
	const existingPrefs = JSON.parse(localStorage.getItem(prefsKeyFor(s.username)) || '{}');
	const prefs = Object.assign({}, existingPrefs, { email, phone, timezone });
	localStorage.setItem(prefsKeyFor(s.username), JSON.stringify(prefs));

	if (q('sidebarUser')) q('sidebarUser').textContent = `${s.name} — ${s.role}`;
	if (q('userBadgeText')) q('userBadgeText').textContent = `${s.name}`;

	// Push to server
	let serverOk = false;
	try {
		const payload = { name, email, phone };
		if (sess && sess.role === 'Owner') payload.role = role;
		const res = await fetch('/api/users/me', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(payload)
		});
		if (res.ok) {
			serverOk = true;
			const data = await res.json().catch(() => null);
			if (data && data.user) setSession(data.user, !!getPersistentSession());
			const syncEl = q('profileSyncStatus');
			if (syncEl) {
				syncEl.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
				syncEl.style.display = 'block';
			}
		} else {
			const body = await res.json().catch(() => null);
			notify((body && (body.error || body.message)) || 'Server update failed — changes saved locally only', { type: 'warn' });
		}
	} catch (e) {
		notify('Server unreachable — changes saved locally only', { type: 'warn' });
	}

	if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Profile'; }
	notify(serverOk ? 'Profile saved' : 'Saved locally', { type: serverOk ? 'success' : 'info' });
}

async function changePassword() {
	const s = getSession();
	if (!s) {
		notify('Not signed in');
		return;
	}

	const cur = (q('curPassword')?.value || '').toString();
	const nw = (q('newPassword')?.value || '').toString();
	const cnf = (q('confirmPassword')?.value || '').toString();

	if (!cur || !nw || !cnf) {
		notify('Fill all password fields');
		return;
	}
	if (nw.length < 6) {
		notify('New password should be at least 6 characters');
		return;
	}
	if (nw !== cnf) {
		notify('New password and confirmation do not match');
		return;
	}

	if (s.id || s.username && s.username.includes('@')) {
		try {
			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					currentPassword: cur,
					newPassword: nw
				})
			});
			const body = await res.json().catch(() => null);
			if (res.ok) {
				q('curPassword').value = q('newPassword').value = q('confirmPassword').value = '';
				if (q('changePassStatus')) q('changePassStatus').textContent = 'Password updated';
				notify('Password changed');
			} else {
				notify((body && (body.error || body.message)) || 'Password change failed');
			}
		} catch (e) {
			console.error('changePassword (server) error', e);
			notify('Server error while changing password');
		}
		return;
	}

	const acc = loadAccounts() || {};
	const lookup = (s.username || '').toString().toLowerCase();

	const key = Object.keys(acc).find(k => {
		const a = acc[k] || {};
		if (!k) return false;
		if (k.toLowerCase() === lookup) return true;
		if ((a.username || '').toString().toLowerCase() === lookup) return true;
		if ((a.email || '').toString().toLowerCase() === lookup) return true;
		return false;
	});

	if (!key) {
		notify('Account not found');
		return;
	}

	const account = acc[key];
	if (typeof account.password === 'undefined') {
		notify('Account does not have a local password (use server login).');
		return;
	}

	if (account.password !== cur) {
		notify('Current password is incorrect');
		return;
	}

	account.password = nw;
	acc[key] = account;
	saveAccounts(acc);

	q('curPassword').value = q('newPassword').value = q('confirmPassword').value = '';
	if (q('changePassStatus')) q('changePassStatus').textContent = 'Password updated';
	notify('Password changed');
}


async function deleteAccountDemo() {
	const s = getSession();
	if (!s) return;
	if (!confirm(`Delete account "${s.username}"?\nThis will permanently remove your account and cannot be undone.`)) return;

	// Try server deletion first (admin endpoint only works for Owner — falls back to local gracefully)
	let serverDeleted = false;
	try {
		if (s.id) {
			const res = await fetch(`/api/admin/users/${s.id}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (res.ok) serverDeleted = true;
		}
	} catch (e) {}

	// Always clean up locally
	try {
	const acc = loadAccounts();
	delete acc[s.username];
	saveAccounts(acc);
	} catch (e) {}

	notify(serverDeleted ? 'Account deleted' : 'Local account removed');
	performLogout();
}

function bindProfileControls() {
	if (bindProfileControls._bound) return;
	bindProfileControls._bound = true;

	const input = q('profileAvatarInput');

	const onAvatarChange = (e) => {
		const file = input.files && input.files[0];
		if (!file) return;
		if (file.size > 1_800_000) {
			notify('Avatar too large (max ~1.8MB)');
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			const s = getSession();
			if (!s) return;
			const dataURL = ev.target.result;
			const wrap = q('profileAvatarPreview');
			if (wrap) {
				wrap.innerHTML = '';
				const img = document.createElement('img');
				img.src = dataURL;
				wrap.appendChild(img);
			}
			localStorage.setItem(avatarKeyFor(s.username), dataURL);
			notify('Avatar updated', 1);
		};
		reader.readAsDataURL(file);
	};

	const onRemoveAvatar = () => {
		const s = getSession();
		if (!s) return;
		localStorage.removeItem(avatarKeyFor(s.username));
		const wrap = q('profileAvatarPreview');
		if (wrap) {
			wrap.innerHTML = '<i class="fa fa-user fa-2x"></i>';
		}
		notify('Avatar removed', 1);
	};

	const onSaveServer = async () => {
		const s = getSession();
		if (!s) {
			notify('Sign in first');
			return;
		}
		const payload = {
			name: q('profileName')?.value || s.name,
			phone: q('profilePhone')?.value || '',
			email: q('profileEmail')?.value || ''
		};
		try {
			const res = await fetch('/api/users/me', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				notify('Profile updated on server', 1);
				const data = await res.json().catch(() => null);
				if (data && data.user) {
					setSession(data.user, !!getPersistentSession());
					populateProfile();
				}
			} else {
				const text = await res.text().catch(() => null);
				notify('Server update failed');
				console.debug('profileSaveServer failed', res.status, text);
			}
		} catch (e) {
			notify('Server update failed');
			console.debug('profileSaveServer error', e && e.message ? e.message : e);
		}
	};

	if (input) {
		input.addEventListener('change', onAvatarChange);
	}

	const removeBtn = q('removeAvatar');
	if (removeBtn) {
		removeBtn.addEventListener('click', onRemoveAvatar);
	}

	// "Save to server" button removed — main Save Profile now handles both local + server

	const saveBtn = q('saveProfile');
	if (saveBtn) {
		saveBtn.onclick = (e) => {
			e.preventDefault();
			saveProfile();
		};
	}

	const cancelBtn = q('profileCancel');
	if (cancelBtn) {
		cancelBtn.onclick = (e) => {
			e.preventDefault();
			populateProfile();
			notify('Changes reverted');
		};
	}

	// Password strength indicator
	const newPwInput = q('newPassword');
	if (newPwInput) {
		newPwInput.addEventListener('input', () => {
			const bar   = q('passStrengthBar');
			const fill  = q('passStrengthFill');
			const label = q('passStrengthLabel');
			if (!bar || !fill || !label) return;
			const v = newPwInput.value;
			if (!v) { bar.style.display = 'none'; label.style.display = 'none'; return; }
			bar.style.display = 'block'; label.style.display = 'block';
			let score = 0;
			if (v.length >= 8)  score++;
			if (v.length >= 12) score++;
			if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
			if (/[0-9]/.test(v)) score++;
			if (/[^A-Za-z0-9]/.test(v)) score++;
			const levels = [
				{ pct: '20%',  bg: '#ef4444', txt: 'Very weak'  },
				{ pct: '40%',  bg: '#f97316', txt: 'Weak'       },
				{ pct: '60%',  bg: '#eab308', txt: 'Fair'       },
				{ pct: '80%',  bg: '#22c55e', txt: 'Strong'     },
				{ pct: '100%', bg: '#15803d', txt: 'Very strong' },
			];
			const lvl = levels[Math.min(score, 4)];
			fill.style.width      = lvl.pct;
			fill.style.background = lvl.bg;
			label.textContent     = lvl.txt;
			label.style.color     = lvl.bg;
		});
	}

	const cpb = q('changePassBtn');
	if (cpb) cpb.onclick = (e) => {
		e.preventDefault();
		changePassword();
	};

	const outBtn = q('signOutBtn');
	if (outBtn) outBtn.onclick = (e) => {
		e.preventDefault();
		performLogout();
	};

	const delBtn = q('deleteAccountBtn');
	if (delBtn) delBtn.onclick = (e) => {
		e.preventDefault();
		deleteAccountDemo();
	};

	['prefEmailNotif', 'prefPushNotif', 'profileTimezone', 'profileEmail', 'profilePhone'].forEach(id => {
		const el = q(id);
		if (!el) return;
		if (el._prefHandler) return;
		el._prefHandler = function() {
			const s = getSession();
			if (!s) return;
			const p = JSON.parse(localStorage.getItem(prefsKeyFor(s.username)) || '{}');
			p.email = q('profileEmail')?.value || p.email || '';
			p.phone = q('profilePhone')?.value || p.phone || '';
			p.timezone = q('profileTimezone')?.value || p.timezone || 'Asia/Manila';
			p.emailNotifications = !!q('prefEmailNotif')?.checked;
			p.pushNotifications = !!q('prefPushNotif')?.checked;
			localStorage.setItem(prefsKeyFor(s.username), JSON.stringify(p));
		};
		el.addEventListener('change', el._prefHandler);
	});
}


let resizeTimer = null;
window.addEventListener('resize', () => {
	if (resizeTimer) clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => {
		[chartStock, chartBestSeller, chartSalesTimeline, chartIngredientUsage].forEach(c => {
			try {
				c && c.resize();
			} catch (e) {}
		});
	}, 120);
});

function addPasswordToggles() {
	const ids = ['overlay-password', 'overlay-su-password', 'curPassword', 'newPassword', 'confirmPassword'];
	ids.forEach(id => {
		const input = document.getElementById(id);
		if (!input) return;
		const wrapper = input.closest('.field') || input.parentElement;
		if (!wrapper) return;
		if (wrapper.querySelector('.pwd-toggle')) return;

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
			btn.innerHTML = isPassword ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
			btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
			btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
			try {
				input.focus();
			} catch (e) {}
		};

		wrapper.appendChild(btn);

		if (input.type === 'text') {
			btn.innerHTML = '<i class="fa fa-eye-slash"></i>';
			btn.setAttribute('aria-label', 'Hide password');
			btn.setAttribute('title', 'Hide password');
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	addPasswordToggles();
	setTimeout(addPasswordToggles, 300);
});

const HELP_STEPS = {
	dashboard: [{
			sel: '#topSearch',
			title: 'Global search',
			text: 'Search ingredients, activity and history from here.',
			pos: 'bottom'
		},
		{
			sel: '#kpi-total-ing',
			title: 'Total ingredients',
			text: 'Total number of inventory items tracked.',
			pos: 'right'
		},
		{
			sel: '#kpi-low',
			title: 'Low stock',
			text: 'Items at or below their minimum threshold. Prioritize restocking them.',
			pos: 'right'
		},
		{
			sel: '#kpi-exp',
			title: 'Expiring soon',
			text: 'Shows items expiring within the selected period.',
			pos: 'right'
		},
		{
			sel: '#kpi-equipment',
			title: 'Equipments / Tools',
			text: 'Total number of equipments/tools tracked.',
			pos: 'left'
		},
		{
			sel: '#stockChart',
			title: 'Stock Movement',
			text: 'View stock-in and stock-out trends over time.',
			pos: 'left'
		},
		{
			sel: '#bestSellerChart',
			title: 'Used ingredients',
			text: 'View inventory used items trends.',
			pos: 'left'
		},
		{
			sel: '#recentActivity',
			title: 'Recent activity',
			text: 'See recent inventory actions, edits, and production logs.',
			pos: 'left'
		}
	],
	inventory: [{
			sel: '#searchIng',
			title: 'Search inventory',
			text: 'Type to find an ingredient quickly. Press Enter to apply.',
			pos: 'bottom'
		},
		{
			sel: '.filter-chips',
			title: 'Filters',
			text: 'Filter the list by All / Low stock / Expiring.',
			pos: 'bottom'
		},
		{
			sel: '#addIngredientBtn',
			title: 'Add ingredient',
			text: 'Add new ingredients, tools, or packaging items here.',
			pos: 'left'
		},
		{
			sel: '#ingredientList',
			title: 'Inventory table',
			text: 'Edit quantities inline, then Save to record the change to history.',
			pos: 'top'
		},
    {
			sel: '#invPagination',
			title: 'Pagination',
			text: 'Navigate pages; export and print use the complete filtered list.',
			pos: 'top'
		},
		{
			sel: '#inventoryRecentActivity',
			title: 'Recent inventory history',
			text: 'Shows the latest stock in/out and edits.',
			pos: 'left'
		},
		{
			sel: '#printInventoryBtn, #exportInventoryBtn',
			title: 'Export / Print',
			text: 'Export or print the currently filtered inventory view.',
			pos: 'bottom'
		}
	],
	reports: [{
			sel: '#reportStart',
			title: 'From date',
			text: 'Pick a start date for your report range.',
			pos: 'bottom'
		},
		{
			sel: '#reportEnd',
			title: 'To date',
			text: 'Pick an end date then click Apply to refresh charts.',
			pos: 'bottom'
		},
		{
			sel: '#reportPreset',
			title: 'Date presets',
			text: 'Choose quick date ranges like 7/30/90 days.',
			pos: 'bottom'
		},
		{
			sel: '#reportFilter, #reportFilterSelect',
			title: 'Report filter',
			text: 'Switch between Inventory / Usage / Low stock reports.',
			pos: 'left'
		},
		{
			sel: '#applyReportRange',
			title: 'Apply',
			text: 'Apply the selected range and filters to update charts and CSV export.',
			pos: 'bottom'
		},
		{
			sel: '#inventoryGraph',
			title: 'Inventory Items',
			text: 'Check the inventory items stock history.',
			pos: 'right'
		},
		{
			sel: '#itemGraph',
			title: 'Items Graph',
			text: 'Item graph history.',
			pos: 'left'
		},
		{
			sel: '#reportSummary',
			title: 'Summary of items',
			text: 'Check the inventory items stock history.',
			pos: 'top'
		},
		{
			sel: '#exportInventoryCSV',
			title: 'Export CSV',
			text: 'Export the inventory list and stocks.',
			pos: 'left'
		},
		{
			sel: '#exportStockCSV',
			title: 'Export Stock CSV',
			text: 'Export the currently filtered item.',
			pos: 'bottom'
		},
		{
			sel: '#summarybtns',
			title: 'Export / Print',
			text: 'Export or print the summary of inventory.',
			pos: 'left'
		}

	],
	calendar: [{
			sel: '#calendarPrev',
			title: 'Previous month',
			text: 'Navigate back by one month.',
			pos: 'bottom'
		},
		{
			sel: '#calendarToday',
			title: 'Today',
			text: 'Return to current month and day.',
			pos: 'bottom'
		},
		{
			sel: '#calendarNext',
			title: 'Next month',
			text: 'Navigate forward by one month.',
			pos: 'bottom'
		},
		{
			sel: '#calendarGrid',
			title: 'Month view',
			text: 'Days display stock-in / stock-out events and add-ingredient entries. Tap a day to open details.',
			pos: 'top'
		},
		{
			sel: '#addScheduleBtn',
			title: 'Schedule',
			text: 'Schedule events.',
			pos: 'right'
		}
	],
	profile: [{
			sel: '#profileAvatarPreview',
			title: 'Avatar',
			text: 'Upload a square avatar (JPEG/PNG, ~1.5MB max).',
			pos: 'right'
		},
		{
			sel: '#recent',
			title: 'Saved profile logins',
			text: 'Use to load profile.',
			pos: 'right'
		},
		{
			sel: '#profileName',
			title: 'Display name',
			text: 'Edit your visible name in the app.',
			pos: 'right'
		},
		{
			sel: '#profileRole',
			title: 'Role',
			text: 'Your role (Owner/Baker/Assistant) — affects permissions.',
			pos: 'right'
		},
		{
			sel: '#security',
			title: 'Change password',
			text: 'Use this to update your password. Current password is required.',
			pos: 'bottom'
		},
		{
			sel: '#action',
			title: 'Delete / Sign out',
			text: 'Remove or Sign out your account.',
			pos: 'bottom'
		},
		{
			sel: '#saveProfile',
			title: 'Save profile',
			text: 'Remove or Sign out your account.',
			pos: 'bottom'
		},
	],
	settings: [{
			sel: '#bakeryName',
			title: 'Bakery profile',
			text: 'Update bakery name, address and default unit.',
			pos: 'bottom'
		},
		{
			sel: '#themeToggle',
			title: 'Appearance',
			text: 'Toggle light / dark mode; this persists per user.',
			pos: 'left'
		},
		{
			sel: '#prefEmailNotif, #prefPushNotif',
			title: 'Notifications',
			text: 'Enable in-app or email notifications for events.',
			pos: 'left'
		},
		{
			sel: '#cursorSelect',
			title: 'Cursor design',
			text: 'Choose a custom cursor for the application.',
			pos: 'left'
		}
	],
	sidebar: [{
		sel: '#sideNav',
		title: 'Main navigation',
		text: 'Use these to switch views: Dashboard, Inventory, Reports, History, Calendar, Profile, Settings.',
		pos: 'right'
	}],
	topbar: [{
			sel: '#hamburger',
			title: 'Menu',
			text: 'Open the side menu on small screens.',
			pos: 'bottom'
		},
		{
			sel: '#userBadge',
			title: 'User menu',
			text: 'Profile, logout and account options.',
			pos: 'left'
		}
	]
};

function waitForElement(selector, timeout = 3000) {
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
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	});
}

let _helpState = {
	overlay: null,
	spotlight: null,
	tooltip: null,
	steps: [],
	idx: 0,
	view: '',
	keyHandler: null
};

function startHelp(viewName) {
	const steps = Array.isArray(HELP_STEPS[viewName]) ? HELP_STEPS[viewName] : [];
	if (steps.length === 0) {
		notify('No help steps defined for this view.');
		return;
	}

	cleanupHelp();
	_helpState.view = viewName;
	_helpState.steps = steps;
	_helpState.idx = 0;

	const overlay = document.createElement('div');
	overlay.className = 'help-overlay';
	overlay.setAttribute('role', 'dialog');
	overlay.setAttribute('aria-modal', 'true');
	overlay.setAttribute('aria-label', 'Help overlay');

	overlay.tabIndex = 0;

	overlay.addEventListener('click', (e) => {
		e.stopPropagation();
	});

	const blocker = document.createElement('div');
	blocker.className = 'help-blocker';
	overlay.appendChild(blocker);

	const spotlight = document.createElement('div');
	spotlight.className = 'help-spotlight';
	overlay.appendChild(spotlight);

	const tooltip = document.createElement('div');
	tooltip.className = 'help-tooltip';
	tooltip.tabIndex = 0;
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

	tooltip.querySelector('#helpPrev').addEventListener('click', () => moveHelp(-1));
	tooltip.querySelector('#helpNext').addEventListener('click', () => moveHelp(1));
	tooltip.querySelector('#helpClose').addEventListener('click', () => cleanupHelp(true));

	const keyHandler = (e) => {
		if (!_helpState.overlay) return;
		if (e.key === 'ArrowRight') {
			moveHelp(1);
			e.preventDefault();
		} else if (e.key === 'ArrowLeft') {
			moveHelp(-1);
			e.preventDefault();
		} else if (e.key === 'Escape') {
			cleanupHelp(true);
			e.preventDefault();
		}
	};
	_helpState.keyHandler = keyHandler;
	document.addEventListener('keydown', keyHandler, {
		capture: true
	});

	setTimeout(() => {
		try {
			overlay.focus();
		} catch (e) {}
	}, 40);

	setTimeout(() => showHelpStep(0), 80);
}

async function showHelpStep(index) {
	const steps = _helpState.steps || [];
	if (index < 0) index = 0;
	if (index >= steps.length) index = steps.length - 1;
	_helpState.idx = index;
	const step = steps[index];
	if (!step) return;

	const tip = _helpState.tooltip;
	tip.querySelector('h4').textContent = step.title || '';
	tip.querySelector('p').textContent = step.text || '';

	let el = document.querySelector(step.sel);
	if (!el) el = await waitForElement(step.sel, 3000);

	if (!el) {
		if (_helpState.spotlight) {
			_helpState.spotlight.style.width = '0px';
			_helpState.spotlight.classList.remove('pulse');
		}
		tip.classList.remove('top', 'right', 'left', 'bottom');
		tip.style.left = '50%';
		tip.style.top = '12%';
		tip.style.transform = 'translateX(-50%)';
		tip.focus();
		updateHelpControls();
		return;
	}

	try {
		el.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
			inline: 'nearest'
		});
	} catch (e) {}

	await new Promise(r => setTimeout(r, 260));

	const rect = el.getBoundingClientRect();
	const padding = 12;
	const left = Math.max(8, Math.round(rect.left - padding + window.scrollX));
	const top = Math.max(8, Math.round(rect.top - padding + window.scrollY));
	const width = Math.max(36, Math.round(rect.width + padding * 2));
	const height = Math.max(24, Math.round(rect.height + padding * 2));

	const sp = _helpState.spotlight;
	sp.style.left = `${left}px`;
	sp.style.top = `${top}px`;
	sp.style.width = `${width}px`;
	sp.style.height = `${height}px`;
	try {
		sp.style.borderRadius = window.getComputedStyle(el).borderRadius || '10px';
	} catch (e) {
		sp.style.borderRadius = '10px';
	}
	sp.classList.add('pulse');

	tip.classList.remove('top', 'right', 'left', 'bottom');
	tip.style.transform = '';
	tip.style.left = '';
	tip.style.top = '';
	tip.style.right = '';
	tip.style.bottom = '';

	const tooltipMaxW = Math.min(420, window.innerWidth - 40);
	const prefer = step.pos || (window.innerWidth <= 420 ? 'bottom' : 'right');
	let tx, ty, cls;
	const estH = Math.min(200, window.innerHeight * 0.4);

	if (prefer === 'bottom') {
		tx = left + (width / 2) - (tooltipMaxW / 2);
		ty = top + height + 12;
		cls = 'bottom';
	} else if (prefer === 'top') {
		tx = left + (width / 2) - (tooltipMaxW / 2);
		ty = top - estH - 12;
		cls = 'top';
	} else if (prefer === 'left') {
		tx = left - tooltipMaxW - 12;
		ty = top + (height / 2) - (estH / 2);
		cls = 'left';
	} else {
		tx = left + width + 12;
		ty = top + (height / 2) - (estH / 2);
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

function moveHelp(dir) {
	const idx = _helpState.idx + dir;
	if (idx < 0) return;
	if (idx >= (_helpState.steps || []).length) return;
	showHelpStep(idx);
}

function updateHelpControls() {
	const idx = _helpState.idx || 0;
	const len = (_helpState.steps || []).length || 0;
	const prevBtn = document.getElementById('helpPrev');
	const nextBtn = document.getElementById('helpNext');
	if (prevBtn) prevBtn.disabled = idx === 0;
	if (nextBtn) nextBtn.disabled = idx === (len - 1);
}

function cleanupHelp(closedByUser) {
	if (_helpState.overlay) {
		try {
			_helpState.overlay.remove();
		} catch (e) {}
	}
	if (_helpState.keyHandler) {
		try {
			document.removeEventListener('keydown', _helpState.keyHandler, {
				capture: true
			});
		} catch (e) {
			try {
				document.removeEventListener('keydown', _helpState.keyHandler);
			} catch (e) {}
		}
	}
	_helpState = {
		overlay: null,
		spotlight: null,
		tooltip: null,
		steps: [],
		idx: 0,
		view: '',
		keyHandler: null
	};

	try {
		const mainView = document.querySelector('.view:not(.hidden)');
		if (mainView) {
			mainView.focus?.();
		}
	} catch (e) {}
}

function attachHelpButtons() {
	document.querySelectorAll('.page-header').forEach(ph => {
		const pa = ph.querySelector('.page-actions');
		if (!pa) return;
		if (pa.querySelector('.page-help')) return;

		const hb = document.createElement('button');
		hb.type = 'button';
		hb.className = 'page-help btn ghost small';
		hb.setAttribute('aria-haspopup', 'dialog');
		hb.setAttribute('title', 'Guide me');
		hb.style.marginLeft = '6px';
		hb.innerHTML = '<i class="fa fa-question"></i> Help';

		hb.addEventListener('click', (e) => {
			e.preventDefault();
			const view = ph.closest('.view');
			const id = view?.id?.replace('view-', '') || 'dashboard';
			startHelp(id);
		});

		pa.appendChild(hb);
	});

	document.querySelectorAll('.page-help').forEach(btn => {
		const closestPa = btn.closest('.page-header')?.querySelector('.page-actions');
		if (closestPa && btn.parentElement !== closestPa) {
			try {
				closestPa.appendChild(btn);
			} catch (e) {}
		}
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => setTimeout(attachHelpButtons, 420));
} else {
	setTimeout(attachHelpButtons, 420);
}

(function() {
	function escapeHtml(s) {
		return String(s || '').replace(/[&<>"']/g, c => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		} [c] || c));
	}
	async function fetchJson(url) {
		try {
			const res = await fetch(url, {
				credentials: 'include'
			});
			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw new Error(`${res.status} ${res.statusText} ${text ? '- '+text : ''}`);
			}
			return await res.json();
		} catch (e) {
			console.warn('fetchJson error', url, e && e.message ? e.message : e);
			throw e;
		}
	}

	function ensureKpiPopContainers(card) {
		if (!card) return;
		if (!card.querySelector('.kpi-popover')) {
			const dp = document.createElement('div');
			dp.className = 'kpi-popover';
			dp.setAttribute('aria-hidden', 'true');
			card.appendChild(dp);
		}
		if (!card.querySelector('.kpi-popover-mobile')) {
			const mp = document.createElement('div');
			mp.className = 'kpi-popover-mobile';
			mp.setAttribute('aria-hidden', 'true');
			card.appendChild(mp);
		}
	}

	function renderKpiList(container, items) {
		if (!container) return;
		container.innerHTML = '';
		const list = document.createElement('div');
		list.style.padding = '6px';
		list.style.maxHeight = '260px';
		list.style.overflow = 'auto';
		items.slice(0, 10).forEach(it => {
			const row = document.createElement('div');
			row.style.display = 'flex';
			row.style.justifyContent = 'space-between';
			row.style.alignItems = 'center';
			row.style.padding = '8px';
			row.style.borderBottom = '1px solid rgba(0,0,0,0.04)';
			row.style.fontWeight = '700';
			const left = document.createElement('div');
			left.textContent = it.name || '(unnamed)';
			left.style.whiteSpace = 'nowrap';
			left.style.overflow = 'hidden';
			left.style.textOverflow = 'ellipsis';
			left.style.maxWidth = '65%';
			const right = document.createElement('div');
			const qtyText = (typeof it.qty !== 'undefined') ? `${it.qty}${it.unit ? ' ' + it.unit : ''}` : '';
			right.textContent = qtyText;
			right.style.opacity = '0.9';
			right.style.fontWeight = '800';
			row.appendChild(left);
			row.appendChild(right);
			list.appendChild(row);
		});
		if (items.length === 0) {
			const empty = document.createElement('div');
			empty.textContent = 'No items to show';
			empty.className = 'muted small';
			empty.style.padding = '8px';
			list.appendChild(empty);
		}
		container.appendChild(list);
	}

	function showKpiPopover(card) {
		const d = card.querySelector('.kpi-popover');
		if (d) {
			d.style.display = 'block';
			d.setAttribute('aria-hidden', 'false');
		}
	}

	function hideKpiPopover(card) {
		const d = card.querySelector('.kpi-popover');
		if (d) {
			d.style.display = 'none';
			d.setAttribute('aria-hidden', 'true');
		}
	}

	function toggleKpiPopoverMobile(card) {
		const m = card.querySelector('.kpi-popover-mobile');
		if (!m) return;
		const hidden = m.getAttribute('aria-hidden') === 'true';
		m.style.display = hidden ? 'block' : 'none';
		m.setAttribute('aria-hidden', hidden ? 'false' : 'true');
	}

	function attachKpiHover(card) {
		if (!card || card.__kpiHandlersAttached) return;
		card.addEventListener('mouseenter', () => showKpiPopover(card));
		card.addEventListener('mouseleave', () => hideKpiPopover(card));

		card.addEventListener('click', (ev) => {
			if (ev.target && (ev.target.tagName === 'BUTTON' || ev.target.closest('button'))) return;
			toggleKpiPopoverMobile(card);
		}, {
			passive: true
		});
		card.__kpiHandlersAttached = true;
	}

	async function initEquipmentKpi() {
		try {
			const el = document.querySelector('#kpi-equipment');
			if (!el) return;
			const card = el.closest('.kpi-card') || el.parentElement;
			ensureKpiPopContainers(card);
			attachKpiHover(card);

			let items = [];
			try {

				const res = await fetch('/api/ingredients?limit=50&page=1');
				if (res.ok) {
					const json = await res.json();
					if (json && Array.isArray(json.items)) {

						items = json.items.filter(i => (i.type && String(i.type).toLowerCase().includes('equip')) || (i.type && String(i.type).toLowerCase() === 'equipment'));

						if (items.length === 0) {
							items = json.items.filter(i => String(i.name || '').toLowerCase().includes('tool') || String(i.name || '').toLowerCase().includes('equipment'));
						}
					}
				}

				const count = items.length > 0 ? items.length : (json && json.meta ? Number(json.meta.total) : 0);
				el.textContent = count || 0;
			} catch (e) {
				console.warn('initEquipmentKpi fetch failed', e);
				el.textContent = '—';
			}

			renderKpiList(card.querySelector('.kpi-popover'), items);
			renderKpiList(card.querySelector('.kpi-popover-mobile'), items);

		} catch (err) {
			console.error('initEquipmentKpi err', err);
		}
	}

	document.addEventListener('DOMContentLoaded', () => {

		initEquipmentKpi().catch(() => {});

		document.querySelectorAll('.kpi-card').forEach(c => {
			ensureKpiPopContainers(c);
			attachKpiHover(c);
		});

		document.addEventListener('click', (ev) => {
			if (ev.target.closest && ev.target.closest('.kpi-card')) return;
			document.querySelectorAll('.kpi-popover-mobile').forEach(p => {
				p.style.display = 'none';
				p.setAttribute('aria-hidden', 'true');
			});
		});
	});

	const KPI_MAP = {
		'kpi-total-ing': async (el, card) => {
			try {

				const [metaJson, sampleJson] = await Promise.all([
					fetchJson('/api/ingredients?limit=1&page=1'),

					fetchJson('/api/ingredients?limit=10&page=1')

				]);

				const total = metaJson && metaJson.meta && Number(metaJson.meta.total) ? Number(metaJson.meta.total) : (Array.isArray(metaJson.items) ? metaJson.items.length : 0);
				el.textContent = total;

				ensurePopContainers(card);
				const items = (sampleJson && sampleJson.items) ? sampleJson.items : [];

				renderKpiList(card.querySelector('.kpi-popover'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
				renderKpiList(card.querySelector('.kpi-popover-mobile'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));

				const desktopPop = card.querySelector('.kpi-popover');
				if (desktopPop) {
					const footer = document.createElement('div');
					footer.style.padding = '8px';
					footer.style.fontSize = '12px';
					footer.style.color = 'var(--muted)';
					footer.style.textAlign = 'center';
					if (total > items.length) footer.textContent = `Showing ${items.length} of ${total} items — view Inventory for the full list`;
					else footer.textContent = `Showing ${items.length} item${items.length !== 1 ? 's' : ''}`;

					const old = desktopPop.querySelector('.kpi-popover-footer');
					if (old) old.remove();
					footer.className = 'kpi-popover-footer';
					desktopPop.appendChild(footer);
				}

			} catch (e) {
				el.textContent = '—';
				console.warn('kpi-total-ing fetch error', e && e.message ? e.message : e);
			}
		},

		'kpi-low': async (el, card) => {
			try {
				const json = await fetchJson('/api/ingredients?filter=low&limit=20');
				const items = json.items || [];
				el.textContent = items.length;

				ensurePopContainers(card);
				renderKpiList(card.querySelector('.kpi-popover'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
				renderKpiList(card.querySelector('.kpi-popover-mobile'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
			} catch (e) {
				el.textContent = '—';
			}
		},
		'kpi-exp': async (el, card) => {
			try {
				const json = await fetchJson('/api/ingredients?filter=expiring&limit=20');
				const items = json.items || [];
				el.textContent = items.length;
				ensurePopContainers(card);
				renderKpiList(card.querySelector('.kpi-popover'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
				renderKpiList(card.querySelector('.kpi-popover-mobile'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
			} catch (e) {
				el.textContent = '—';
			}
		},
		'kpi-equipment': async (el, card) => {
			try {

				const json = await fetchJson('/api/ingredients?type=equipment&limit=20');
				const items = json.items || [];
				el.textContent = items.length;
				ensurePopContainers(card);
				renderKpiList(card.querySelector('.kpi-popover'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
				renderKpiList(card.querySelector('.kpi-popover-mobile'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
			} catch (e) {
				el.textContent = '—';
			}
		}
	};

	function ensurePopContainers(card) {
		if (!card) return;
		if (!card.querySelector('.kpi-popover')) {
			const dp = document.createElement('div');
			dp.className = 'kpi-popover';
			dp.setAttribute('aria-hidden', 'true');
			card.appendChild(dp);
		}
		if (!card.querySelector('.kpi-popover-mobile')) {
			const mp = document.createElement('div');
			mp.className = 'kpi-popover-mobile';
			mp.setAttribute('aria-hidden', 'true');
			card.appendChild(mp);
		}
	}

	function attachInteractions() {
		const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
		document.querySelectorAll('.kpi-card').forEach(card => {

			ensurePopContainers(card);

			if (!isTouch) {
				card.addEventListener('mouseenter', () => {
					card.classList.add('hover');
					const dp = card.querySelector('.kpi-popover');
					if (dp) dp.setAttribute('aria-hidden', 'false');
				});
				card.addEventListener('mouseleave', () => {
					card.classList.remove('hover');
					const dp = card.querySelector('.kpi-popover');
					if (dp) dp.setAttribute('aria-hidden', 'true');
				});
				card.addEventListener('keydown', (ev) => {
					if (ev.key === 'Enter' || ev.key === ' ') {
						ev.preventDefault();
						card.classList.toggle('hover');
						const dp = card.querySelector('.kpi-popover');
						if (dp) dp.setAttribute('aria-hidden', card.classList.contains('hover') ? 'false' : 'true');
					}
				});
			} else {

				card.addEventListener('click', (ev) => {
					if (ev.target.closest('button, input, a, select')) return;

					const open = card.classList.contains('expanded');

					document.querySelectorAll('.kpi-card.expanded').forEach(c => {
						if (c !== card) c.classList.remove('expanded');
					});
					if (open) card.classList.remove('expanded');
					else card.classList.add('expanded');
				});
			}
		});

		document.addEventListener('click', (e) => {
			if (e.target.closest('.kpi-card')) return;
			document.querySelectorAll('.kpi-card.expanded').forEach(c => c.classList.remove('expanded'));
		});
	}

	async function initKpiLists() {

		attachInteractions();

		for (const [id, fn] of Object.entries(KPI_MAP)) {
			const el = document.getElementById(id);
			if (!el) continue;
			const card = el.closest('.kpi-card') || el.parentElement;
			try {
				await fn(el, card);
			} catch (e) {
				console.warn('initKpiLists error for', id, e && e.message ? e.message : e);
			}
		}

		document.querySelectorAll('.kpi-card').forEach(card => {
			const itemsAttr = card.getAttribute('data-items');
			if (itemsAttr) {
				try {
					const items = JSON.parse(itemsAttr);
					ensurePopContainers(card);
					renderKpiList(card.querySelector('.kpi-popover'), items);
					renderKpiList(card.querySelector('.kpi-popover-mobile'), items);
				} catch (e) {}
			}
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => setTimeout(initKpiLists, 40));
	} else {
		setTimeout(initKpiLists, 40);
	}

	window.initKpiLists = initKpiLists;
})();

(function() {
	function createSpinnerEl() {
		const s = document.createElement('div');
		s.className = 'btn-spinner';
		s.style.width = '18px';
		s.style.height = '18px';
		s.style.borderWidth = '2px';
		s.style.display = 'inline-block';
		s.style.verticalAlign = 'middle';
		return s;
	}

	function renderList(container, items, emptyMessage = 'No items') {
		container.innerHTML = '';
		const ul = document.createElement('ul');
		ul.style.listStyle = 'none';
		ul.style.margin = '0';
		ul.style.padding = '6px 4px';
		ul.style.maxHeight = '38vh';
		ul.style.overflow = 'auto';
		if (!items || items.length === 0) {
			const li = document.createElement('li');
			li.className = 'muted';
			li.style.padding = '8px';
			li.textContent = emptyMessage;
			ul.appendChild(li);
		} else {
			items.slice(0, 200).forEach(it => {
				const li = document.createElement('li');
				li.style.padding = '8px';
				li.style.borderRadius = '8px';
				li.style.fontWeight = '700';
				li.style.display = 'flex';
				li.style.justifyContent = 'space-between';
				li.style.gap = '12px';
				li.style.alignItems = 'center';
				li.style.borderBottom = '1px solid rgba(0,0,0,0.04)';
				const left = document.createElement('div');
				left.style.overflow = 'hidden';
				left.style.textOverflow = 'ellipsis';
				left.style.whiteSpace = 'nowrap';
				left.textContent = it.name || '(unnamed)';
				const right = document.createElement('div');
				right.style.opacity = '0.95';
				right.textContent = (typeof it.qty !== 'undefined' ? `${it.qty}${it.unit ? ' ' + it.unit : ''}` : '');
				li.appendChild(left);
				li.appendChild(right);
				ul.appendChild(li);
			});
		}
		container.appendChild(ul);
	}

	async function fetchIngredients() {
		try {
			const res = await fetch('/api/ingredients?limit=1000&page=1', {
				credentials: 'include'
			});
			if (!res.ok) {
				return {
					ok: false,
					status: res.status,
					body: null
				};
			}
			const json = await res.json();
			return {
				ok: true,
				status: 200,
				body: Array.isArray(json.items) ? json.items : (json.items || [])
			};
		} catch (e) {
			return {
				ok: false,
				status: 0,
				body: null,
				error: e && e.message ? e.message : String(e)
			};
		}
	}

	function filterFor(type, items) {
		if (!items) return [];
		const now = new Date();
		const expiryDays = Number(window.__REPORT_EXPIRY_DAYS || 7);
		const lower = s => (s || '').toString().toLowerCase();
		if (type === 'low') return items.filter(i => Number(i.qty || 0) <= Number(i.min_qty || 0));
		if (type === 'exp') return items.filter(i => {
			if (!i.expiry) return false;
			const e = new Date(i.expiry);
			const diff = (e - now) / (1000 * 60 * 60 * 24);
			return diff >= 0 && diff <= expiryDays;
		});
		if (type === 'equipment') {
			const a = items.filter(i => lower(i.type || '').includes('equip') || lower(i.type || '').includes('tool'));
			if (a.length) return a;
			return items.filter(i => lower(i.name || '').includes('tool') || lower(i.name || '').includes('equipment'));
		}
		if (type === 'total') return items;
		return [];
	}

	const KPI_MAP = {
		'kpi-total-ing': 'total',
		'kpi-low': 'low',
		'kpi-exp': 'exp',
		'kpi-equipment': 'equipment'
	};

	function ensurePopovers() {
		Object.keys(KPI_MAP).forEach(kid => {
			const valEl = document.getElementById(kid);
			if (!valEl) return;
			const card = valEl.closest('.kpi-card') || valEl.parentElement;
			if (!card) return;

			const oldDesktop = card.querySelector('.kpi-popover');
			if (oldDesktop) oldDesktop.remove();
			const next = card.nextElementSibling;
			if (next && next.classList && next.classList.contains('kpi-popover-mobile') && next._createdByScript) next.remove();

			const desktop = document.createElement('div');
			desktop.className = 'kpi-popover';
			desktop.style.display = 'none';
			desktop.style.position = 'absolute';
			desktop.style.top = 'calc(100% + 10px)';
			desktop.style.left = '8px';
			desktop.style.minWidth = '220px';
			desktop.style.maxWidth = '420px';
			desktop.style.padding = '8px';
			desktop.style.zIndex = '400';
			desktop.style.boxSizing = 'border-box';
			card.appendChild(desktop);

			const mobile = document.createElement('div');
			mobile.className = 'kpi-popover-mobile';
			mobile._createdByScript = true;
			mobile.style.display = 'none';
			mobile.style.boxSizing = 'border-box';
			mobile.style.marginTop = '8px';
			mobile.style.padding = '8px';
			mobile.style.zIndex = '200';
			mobile.style.background = getComputedStyle(document.documentElement).getPropertyValue('--card') || '#fff';
			mobile.style.border = '1px solid rgba(0,0,0,0.06)';
			mobile.style.borderRadius = '10px';
			mobile.style.boxShadow = '0 12px 30px rgba(19,28,38,0.08)';
			card.insertAdjacentElement('afterend', mobile);

			function showLoading(targetEl) {
				targetEl.innerHTML = '';
				const wrap = document.createElement('div');
				wrap.style.display = 'flex';
				wrap.style.alignItems = 'center';
				wrap.style.gap = '8px';
				wrap.style.padding = '10px';
				const spinner = createSpinnerEl();
				wrap.appendChild(spinner);
				const t = document.createElement('div');
				t.textContent = 'Loading…';
				t.style.fontWeight = '700';
				wrap.appendChild(t);
				targetEl.appendChild(wrap);
			}

			async function loadAndRender(targetEl) {
				showLoading(targetEl);
				const res = await fetchIngredients();
				if (!res.ok) {
					if (res.status === 401) {
						targetEl.innerHTML = '';
						const p = document.createElement('div');
						p.className = 'muted';
						p.style.padding = '10px';
						p.style.fontWeight = '700';
						p.textContent = 'Sign in to view the items';
						targetEl.appendChild(p);
						return [];
					} else {
						targetEl.innerHTML = '';
						const p = document.createElement('div');
						p.className = 'muted';
						p.style.padding = '10px';
						p.style.fontWeight = '700';
						p.textContent = 'Could not load items';
						if (res.error) {
							const e = document.createElement('div');
							e.className = 'small muted';
							e.style.marginTop = '6px';
							e.textContent = res.error;
							targetEl.appendChild(e);
						}
						targetEl.appendChild(p);
						return [];
					}
				}
				const items = res.body || [];
				renderList(targetEl, items, 'No items');
				return items;
			}

			let lastPointerWasTouch = false;
			card.addEventListener('pointerdown', (ev) => {
				lastPointerWasTouch = ev.pointerType === 'touch' || ev.pointerType === 'pen';
			}, {
				passive: true
			});

			card.addEventListener('click', async (ev) => {
				if (ev.target.closest('button') || ev.target.tagName === 'BUTTON' || ev.target.closest('a')) return;
				const isSmall = window.matchMedia && window.matchMedia('(max-width:900px)').matches;
				const ktype = KPI_MAP[kid];
				if (isSmall || lastPointerWasTouch) {
					const expanded = card.classList.toggle('expanded');
					mobile.style.display = expanded ? 'block' : 'none';
					if (expanded) {
						document.querySelectorAll('.kpi-card.expanded').forEach(c => {
							if (c !== card) {
								c.classList.remove('expanded');
								const s = c.nextElementSibling;
								if (s && s.classList && s.classList.contains('kpi-popover-mobile')) s.style.display = 'none';
							}
						});
						const items = await loadAndRender(mobile);
						const filtered = filterFor(ktype, items);
						renderList(mobile, filtered, 'No items');
						valEl.textContent = filtered.length;
						setTimeout(() => card.scrollIntoView({
							behavior: 'smooth',
							block: 'center'
						}), 70);
					} else {
						mobile.innerHTML = '';
					}
				} else {
					if (desktop.innerHTML.trim().length === 0) {
						const items = await loadAndRender(desktop);
						const filtered = filterFor(ktype, items);
						renderList(desktop, filtered, 'No items');
						valEl.textContent = filtered.length;
					}
					desktop.style.display = 'block';
					setTimeout(() => desktop.style.display = 'none', 3500);
				}
			}, {
				passive: true
			});

			card.addEventListener('mouseenter', async () => {
				if (window.matchMedia && window.matchMedia('(max-width:900px)').matches) return;
				if (desktop.innerHTML.trim().length === 0) {
					const items = await loadAndRender(desktop);
					const filtered = filterFor(KPI_MAP[kid], items);
					renderList(desktop, filtered, 'No items');
					valEl.textContent = filtered.length;
				}
				desktop.style.display = 'block';
			});
			card.addEventListener('mouseleave', () => {
				desktop.style.display = 'none';
			});

		});
	}

	document.addEventListener('click', (ev) => {
		if (ev.target.closest && ev.target.closest('.kpi-card')) return;
		document.querySelectorAll('.kpi-card.expanded').forEach(c => {
			c.classList.remove('expanded');
			const s = c.nextElementSibling;
			if (s && s.classList && s.classList.contains('kpi-popover-mobile')) s.style.display = 'none';
		});
		document.querySelectorAll('.kpi-popover').forEach(p => p.style.display = 'none');
	});

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', ensurePopovers);
	} else {
		ensurePopovers();
	}

	window.addEventListener('load', ensurePopovers);
	window.addEventListener('resize', () => {
		if (window.matchMedia && window.matchMedia('(max-width:900px)').matches) {
			document.querySelectorAll('.kpi-popover').forEach(p => p.style.display = 'none');
		} else {
			document.querySelectorAll('.kpi-popover-mobile').forEach(m => m.style.display = 'none');
			document.querySelectorAll('.kpi-card.expanded').forEach(c => c.classList.remove('expanded'));
		}
	});

})();

function renderKpiList(container, items) {
	container.innerHTML = '';
	const list = document.createElement('ul');
	list.style.listStyle = 'none';
	list.style.margin = '0';
	list.style.padding = '6px 4px';
	list.style.maxHeight = '38vh';
	list.style.overflow = 'auto';
	if (!items || items.length === 0) {
		const li = document.createElement('li');
		li.className = 'muted';
		li.style.padding = '8px';
		li.textContent = 'No items';
		list.appendChild(li);
	} else {
		items.slice(0, 200).forEach(it => {
			const li = document.createElement('li');
			li.style.padding = '8px';
			li.style.borderRadius = '8px';
			li.style.fontWeight = '700';
			li.style.display = 'flex';
			li.style.justifyContent = 'space-between';
			li.style.gap = '12px';
			li.style.alignItems = 'center';
			li.style.borderBottom = '1px solid rgba(0,0,0,0.04)';
			const left = document.createElement('div');
			left.style.overflow = 'hidden';
			left.style.textOverflow = 'ellipsis';
			left.style.whiteSpace = 'nowrap';
			left.textContent = it.name || '(unnamed)';
			const right = document.createElement('div');
			right.style.opacity = '0.95';
			right.textContent = (typeof it.qty !== 'undefined' ? `${it.qty}${it.unit ? ' ' + it.unit : ''}` : '');
			li.appendChild(left);
			li.appendChild(right);
			list.appendChild(li);
		});
	}
	container.appendChild(list);
}
async function initEquipmentKpi() {
	try {
		const el = document.getElementById('kpi-equipment');
		if (!el) return;
		const card = el.closest('.kpi-card') ||
			el.parentElement;
		ensureKpiPopContainers(card);
		let items = [];
		try {
			const res = await fetch('/api/ingredients?limit=1000&page=1', {
				credentials: 'include'
			});
			let json = null;
			if (res.ok) {
				json = await res.json();
				if (Array.isArray(json.items)) {
					items = json.items.filter(i => (i.type && String(i.type).toLowerCase() === 'equipment'));
				}
			}
		} catch (e) {
			console.error('Failed to fetch equipment items:', e);
		}
		renderKpiList(el, items);
		try {
			if (items.length === 0) {
				const res = await fetch('/api/ingredients?limit=1000&page=1', {
					credentials: 'include'
				});
				let json = null;
				if (res.ok) {
					json = await res.json();
					if (Array.isArray(json.items)) {
						items = json.items.filter(i => {
							const name = (i.name || '').toString().toLowerCase();
							return name.includes('tool') || name.includes('equipment');
						});
					}
				}
			}
		} catch (e) {
			console.error('Failed to fetch equipment items (fallback):', e);
		}
		el.textContent = items.length;
		renderKpiList(card.querySelector('.kpi-popover'), items);
		renderKpiList(card.querySelector('.kpi-popover-mobile'), items);
	} catch (e) {
		console.error('initEquipmentKpi error:', e);
	}
}
document.addEventListener('DOMContentLoaded', () => {
	initEquipmentKpi();
	window.addEventListener('load', initEquipmentKpi);
	window.addEventListener('resize', initEquipmentKpi);
});
(function() {
	async function fetchJson(url) {
		const res = await fetch(url, {
			credentials: 'include'
		});
		if (!res.ok) throw new Error(`Fetch error: ${res.status} ${res.statusText}`);
		return await res.json();
	}
	const KPI_MAP = {
		'kpi-total-ing': async (el, card) => {
			try {
				const [metaJson, sampleJson] = await Promise.all([
					fetchJson('/api/ingredients?limit=1&page=1'),
					fetchJson('/api/ingredients?limit=10&page=1')
				]);
				const total = metaJson && metaJson.meta && Number(metaJson.meta.total) ? Number(metaJson.meta.total) : (Array.isArray(metaJson.items) ? metaJson.items.length : 0);
				el.textContent = '';
				el.textContent = total;

				ensurePopContainers(card);
				const items = Array.isArray(sampleJson.items) ? sampleJson.items : [];

				renderKpiList(card.querySelector('.kpi-popover'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
				renderKpiList(card.querySelector('.kpi-popover-mobile'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));

				const desktopPop = card.querySelector('.kpi-popover');
				if (desktopPop) {
					const footer = document.createElement('div');
					footer.style.marginTop = '8px';
					footer.style.paddingTop = '8px';
					footer.style.borderTop = '1px solid rgba(0,0,0,0.04)';
					footer.style.fontWeight = '600';
					footer.textContent = `Showing ${items.length} of ${total} items`;
					desktopPop.appendChild(footer);
				}
				const mobilePop = card.querySelector('.kpi-popover-mobile');
				if (mobilePop) {
					const footer = document.createElement('div');
					footer.style.marginTop = '8px';
					footer.style.paddingTop = '8px';
					footer.style.borderTop = '1px solid rgba(0,0,0,0.04)';
					footer.style.fontWeight = '600';
					footer.textContent = `Showing ${items.length} of ${total} items`;
					const old = mobilePop.querySelector('.kpi-popover-footer');
					if (old) old.remove();
					mobilePop.appendChild(footer);
				}
			} catch (e) {
				el.textContent = '—';
			}
		},
		'kpi-low': async (el, card) => {
			try {
				const json = await fetchJson('/api/ingredients?filter=low&limit=20');
				const items = json.items || [];
				el.textContent = items.length;
				ensurePopContainers(card);
				renderKpiList(card.querySelector('.kpi-popover'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
				renderKpiList(card.querySelector('.kpi-popover-mobile'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
			} catch (e) {
				el.textContent = '—';
			}
		},
		'kpi-exp': async (el, card) => {
			try {
				const json = await fetchJson('/api/ingredients?filter=expiring&limit=20');
				const items = json.items || [];
				el.textContent = items.length;
				ensurePopContainers(card);
				renderKpiList(card.querySelector('.kpi-popover'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
				renderKpiList(card.querySelector('.kpi-popover-mobile'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
			} catch (e) {
				el.textContent = '—';
			}
		},
		'kpi-equipment': async (el, card) => {
			try {
				const json = await fetchJson('/api/ingredients?filter=equipment&limit=20');
				const items = json.items || [];
				el.textContent = items.length;
				ensurePopContainers(card);
				renderKpiList(card.querySelector('.kpi-popover'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
				renderKpiList(card.querySelector('.kpi-popover-mobile'), items.map(i => ({
					name: i.name,
					qty: i.qty,
					unit: i.unit
				})));
			} catch (e) {
				el.textContent = '—';
			}
		}
	};

	function ensurePopContainers(card) {
		if (!card.querySelector('.kpi-popover')) {
			const dp = document.createElement('div');
			dp.className = 'kpi-popover';
			dp.setAttribute('aria-hidden', 'true');
			card.appendChild(dp);
		}
		if (!card.querySelector('.kpi-popover-mobile')) {
			const mp = document.createElement('div');
			mp.className = 'kpi-popover-mobile';
			card.insertAdjacentElement('afterend', mp);
		}
	}

	function attachInteractions() {
		const isTouch = ('ontouchstart' in window) || (navigator.msMaxTouchPoints || 0) > 0;
		document.querySelectorAll('.kpi-card').forEach(card => {
			if (card._kpiInteractionsAttached) return;
			card._kpiInteractionsAttached = true;
			if (!isTouch) {
				card.addEventListener('mouseenter', () => {
					card.classList.add('hover');
					const dp = card.querySelector('.kpi-popover');
					if (dp) dp.setAttribute('aria-hidden', 'false');
				});
				card.addEventListener('mouseleave', () => {
					card.classList.remove('hover');
					const dp = card.querySelector('.kpi-popover');
					if (dp) dp.setAttribute('aria-hidden', 'true');
				});
				card.addEventListener('focusin', () => {
					card.classList.add('hover');
					const dp = card.querySelector('.kpi-popover');
					if (dp) dp.setAttribute('aria-hidden', 'false');
				});
				card.addEventListener('focusout', () => {
					card.classList.remove('hover');
					const dp = card.querySelector('.kpi-popover');
					if (dp) dp.setAttribute('aria-hidden', 'true');
				});
			} else {
				card.addEventListener('click', (e) => {
					if (e.target.closest('button') || e.target.tagName === 'BUTTON' || e.target.closest('a')) return;
					const expanded = card.classList.toggle('expanded');
					const mp = card.nextElementSibling;
					if (mp && mp.classList && mp.classList.contains('kpi-popover-mobile')) {
						mp.style.display = expanded ? 'block' : 'none';
					}
				});
				document.addEventListener('click', (e) => {
					if (e.target.closest && e.target.closest('.kpi-card')) return;
					document.querySelectorAll('.kpi-card.expanded').forEach(c => {
						c.classList.remove('expanded');
						const mp = c.nextElementSibling;
						if (mp && mp.classList && mp.classList.contains('kpi-popover-mobile')) {
							mp.style.display = 'none';
						}
					});
				});
			}
		});
	}

	function initKpiLists() {
		attachInteractions();
		Object.keys(KPI_MAP).forEach(async kid => {
			const el = document.getElementById(kid);
			if (!el) return;
			const card = el.closest('.kpi-card') ||
				el.parentElement;
			if (!card) return;
			const fetcher = KPI_MAP[kid];
			if (typeof fetcher === 'function') {
				try {
					await fetcher(el, card);
				} catch (e) {
					console.error(`Error initializing KPI ${kid}:`, e);
				}
			}
		});
	}
	if (document.readyState ===
		'loading') {
		document.addEventListener('DOMContentLoaded', () => setTimeout(initKpiLists, 40));
	} else {
		setTimeout(initKpiLists, 40);
	}
	window.initKpiLists = initKpiLists;
})();

(function() {
	function createSpinnerEl() {
		const s = document.createElement('span');
		s.className = 'spinner';
		s.style.width = '18px';
		s.style.height = '18px';
		s.style.borderWidth = '2px';
		s.style.marginRight = '6px';
		s.style.display = 'inline-block';
		return s;
	}

	function renderList(container, items, emptyMessage) {
		container.innerHTML = '';
		emptyMessage = emptyMessage || 'No items';
		const ul = document.createElement('ul');
		ul.style.listStyle = 'none';
		ul.style.margin = '0';
		ul.style.padding = '6px 4px';
		ul.style.maxHeight = '38vh';
		ul.style.overflow = 'auto';
		if (!items || items.length === 0) {
			const li = document.createElement('li');
			li.className = 'muted';
			li.style.padding = '8px';
			li.textContent = emptyMessage;
			ul.appendChild(li);
		} else {
			items.slice(0, 200).forEach(it => {
				const li = document.createElement('li');
				li.style.padding = '8px';
				li.style.borderRadius = '8px';
				li.style.fontWeight = '700';
				li.style.display = 'flex';
				li.style.justifyContent = 'space-between';
				li.style.gap = '12px';
				li.style.alignItems = 'center';
				li.style.borderBottom = '1px solid rgba(0,0,0,0.04)';
				const left = document.createElement('div');
				left.style.overflow = 'hidden';
				left.style.textOverflow = 'ellipsis';
				left.style.whiteSpace = 'nowrap';
				left.textContent = it.name || '(unnamed)';
				const right = document.createElement('div');
				right.style.opacity = '0.95';
				right.textContent = (typeof it.qty !== 'undefined' ? `${it.qty}${it.unit ? ' ' + it.unit : ''}` : '');
				li.appendChild(left);
				li.appendChild(right);
				ul.appendChild(li);
			});
		}
		container.appendChild(ul);
	}

})

(function() {
	async function apiFetchSafe(url, opts = {}) {
		if (typeof window.apiFetch === 'function') {
			return window.apiFetch(url, opts);
		}
		const res = await fetch(url, Object.assign({
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		}, opts));
		if (!res.ok) {
			const txt = await res.text().catch(() => '');
			throw new Error(`HTTP ${res.status}: ${txt}`);
		}
		try {
			return await res.json();
		} catch (e) {
			return null;
		}
	}

	const listWrap = document.getElementById('inventoryReportList');
	const searchInput = document.getElementById('reportItemSearch');
	const exportInventoryBtn = document.getElementById('exportInventoryCSV');
	const exportStockBtn = document.getElementById('exportStockCSV');
	const selectedNameEl = document.getElementById('selectedIngredientName');
	const stockCanvas = document.getElementById('inventoryStockChart');

	let ingredientsCache = [];
	let activityCache = [];
	let selectedIngredient = null;
	let inventoryChart = null;

	function extractQtyFromActivityRow(r) {
		if (r == null) return 0;
		if (typeof r.qty === 'number' && !Number.isNaN(r.qty)) return Number(r.qty);
		if (typeof r.delta === 'number' && !Number.isNaN(r.delta)) return Number(Math.abs(r.delta));

		const txt = String(r.text || '');
		const m = txt.match(/-?[\d,.]+(?:\.\d+)?/);
		if (!m) return 0;
		return Number(m[0].replace(/,/g, ''));
	}

	function detectDeltaSign(r) {
		if (!r) return 0;
		const action = (r.action || '').toString().toLowerCase();
		const txt = (r.text || '').toString().toLowerCase();
		if (action.includes('in') || /stock in/i.test(txt) || /stock_in/i.test(action) || /stock in/i.test(action)) return +1;
		if (action.includes('out') || /stock out/i.test(txt) || /stock_out/i.test(action) || /stock out/i.test(action)) return -1;

		if (txt.includes('in')) return +1;
		if (txt.includes('out')) return -1;
		return 0;
	}

	function getSignedDelta(r) {
		const q = extractQtyFromActivityRow(r);
		const sign = detectDeltaSign(r);
		if (sign === 0) return 0;
		return sign * q;
	}

	async function loadIngredients() {
		try {
			const data = await apiFetchSafe('/api/ingredients?limit=2000&page=1');
			ingredientsCache = (data && data.items) ? data.items : [];
		} catch (e) {
			console.error('[reports] loadIngredients err', e);
			ingredientsCache = [];
		}
	}

	async function loadActivity() {
		try {
			const data = await apiFetchSafe('/api/activity?limit=2000&page=1');
			activityCache = (data && data.items) ? data.items : [];
		} catch (e) {
			console.error('[reports] loadActivity err', e);
			activityCache = [];
		}
	}

	function renderList(filter = '') {
		if (!listWrap) return;
		const q = (filter || '').toString().trim().toLowerCase();
		const items = ingredientsCache.filter(it => {
			if (!q) return true;
			return (it.name || '').toString().toLowerCase().includes(q) ||
				(it.supplier || '').toString().toLowerCase().includes(q) ||
				(String(it.id || '')).includes(q);
		});
		if (items.length === 0) {
			listWrap.innerHTML = '<div class="muted small" style="padding:12px">No ingredients found.</div>';
			return;
		}
		const cont = document.createElement('div');
		cont.style.display = 'grid';
		cont.style.gap = '8px';
		items.forEach(it => {
			const row = document.createElement('div');
			row.className = 'small-card';
			row.style.display = 'flex';
			row.style.justifyContent = 'space-between';
			row.style.alignItems = 'center';
			row.style.padding = '8px';
			const left = document.createElement('div');
			left.style.display = 'flex';
			left.style.flexDirection = 'column';
			left.style.gap = '4px';
			const title = document.createElement('div');
			title.style.fontWeight = '800';
			title.textContent = `${it.name}${it.unit ? ' · ' + it.unit : ''}`;
			const meta = document.createElement('div');
			meta.className = 'muted small';
			meta.textContent = `Qty: ${it.qty} · Min: ${it.min_qty || 0} · Supplier: ${it.supplier || '—'}`;
			left.appendChild(title);
			left.appendChild(meta);

			const actions = document.createElement('div');
			actions.style.display = 'flex';
			actions.style.gap = '8px';
			const viewBtn = document.createElement('button');
			viewBtn.className = 'btn small';
			viewBtn.type = 'button';
			viewBtn.textContent = 'View stock';
			viewBtn.addEventListener('click', () => selectIngredient(it));
			actions.appendChild(viewBtn);

			row.appendChild(left);
			row.appendChild(actions);
			cont.appendChild(row);
		});
		listWrap.innerHTML = '';
		listWrap.appendChild(cont);
	}

	function parseDateInputs() {
		const startVal = document.getElementById('reportStart')?.value;
		const endVal = document.getElementById('reportEnd')?.value;
		if (!startVal || !endVal) {
			const preset = Number(document.getElementById('reportPreset')?.value || 30);
			const endDate = new Date();
			const startDate = new Date(Date.now() - preset * 24 * 60 * 60 * 1000);
			return {
				start: startDate.toISOString().slice(0, 10),
				end: endDate.toISOString().slice(0, 10)
			};
		}
		return {
			start: startVal,
			end: endVal
		};
	}

	function filterActivitiesForIngredientUpTo(id, endIso) {
		if (!activityCache || !Array.isArray(activityCache)) return [];
		const endT = endIso ? new Date(endIso + 'T23:59:59') : null;
		return activityCache.filter(a => {
			if (!a) return false;
			if (Number(a.ingredient_id) !== Number(id)) return false;
			if (a.time && endT && new Date(a.time) > endT) return false;
			return true;
		}).sort((a, b) => new Date(a.time) - new Date(b.time));
	}

	function filterActivitiesForIngredientInRange(id, startIso, endIso) {
		if (!activityCache || !Array.isArray(activityCache)) return [];
		const s = startIso ? new Date(startIso + 'T00:00:00') : null;
		const e = endIso ? new Date(endIso + 'T23:59:59') : null;
		return activityCache.filter(a => {
			if (!a) return false;
			if (Number(a.ingredient_id) !== Number(id)) return false;
			if (a.time) {
				const t = new Date(a.time);
				if (s && t < s) return false;
				if (e && t > e) return false;
			}
			return true;
		}).sort((a, b) => new Date(a.time) - new Date(b.time));
	}

	function buildAbsoluteSeries(ingredient, activitiesUpToEnd, rangeStartIso, rangeEndIso) {
		const deltas = activitiesUpToEnd.map(r => ({
			row: r,
			delta: getSignedDelta(r)
		}));
		const totalDelta = deltas.reduce((acc, x) => acc + (Number(x.delta) || 0), 0);
		const currentQty = Number(ingredient.qty || 0);
		const initialQty = currentQty - totalDelta;
		const points = [];
		let running = initialQty;

		if (deltas.length > 0) {
			const firstTime = new Date(deltas[0].row.time);
			points.push({
				time: new Date(firstTime.getTime() - 1),
				qty: running
			});
		} else {
			points.push({
				time: new Date(),
				qty: currentQty
			});
		}

		deltas.forEach(d => {
			running += Number(d.delta || 0);
			const t = d.row.time ? new Date(d.row.time) : new Date();
			points.push({
				time: t,
				qty: running
			});
		});

		const {
			start: sIso,
			end: eIso
		} = parseDateInputs();
		const eDate = eIso ? new Date(eIso + 'T23:59:59') : null;
		if (eDate && points.length > 0) {
			const last = points[points.length - 1];
			if (last.time < eDate) {
				points.push({
					time: eDate,
					qty: points[points.length - 1].qty
				});
			}
		}

		const start = rangeStartIso ? new Date(rangeStartIso + 'T00:00:00') : null;
		const end = rangeEndIso ? new Date(rangeEndIso + 'T23:59:59') : null;
		const filtered = points.filter(p => {
			if (start && p.time < start) return false;
			if (end && p.time > end) return false;
			return true;
		});

		const labels = filtered.map(p => p.time.toLocaleString());
		const values = filtered.map(p => Number(p.qty));

		return {
			labels,
			values
		};
	}

	function ensureChart() {
		if (!stockCanvas) return;
		if (inventoryChart) {
			try {
				inventoryChart.destroy();
			} catch (e) {}
			inventoryChart = null;
		}
		const ctx = stockCanvas.getContext('2d');
		inventoryChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: [],
				datasets: [{
					label: 'Inventory level',
					data: [],
					tension: 0.25,
					fill: true
				}]
			},
			options: {
				maintainAspectRatio: false,
				responsive: true,
				plugins: {
					legend: {
						display: true
					}
				},
				scales: {
					x: {
						display: true,
						title: {
							display: false
						}
					},
					y: {
						display: true,
						beginAtZero: true
					}
				}
			}
		});
	}

	function renderStockChart(labels, values) {
		if (!stockCanvas) return;
		if (!inventoryChart) ensureChart();
		if (!inventoryChart) return;
		inventoryChart.data.labels = labels;
		inventoryChart.data.datasets[0].data = values;
		inventoryChart.update();
	}

	async function selectIngredient(it) {
		selectedIngredient = it;
		if (selectedNameEl) selectedNameEl.textContent = it.name;
		await renderStockForSelected();
	}

	async function renderStockForSelected() {
		if (!selectedIngredient) return;
		if (!ingredientsCache || ingredientsCache.length === 0) await loadIngredients();
		if (!activityCache || activityCache.length === 0) await loadActivity();

		const {
			start,
			end
		} = parseDateInputs();

		const activitiesUpToEnd = filterActivitiesForIngredientUpTo(selectedIngredient.id, end);

		const series = buildAbsoluteSeries(selectedIngredient, activitiesUpToEnd, start, end);

		if (series.labels.length === 0) {
			renderStockChart([new Date().toLocaleString()], [Number(selectedIngredient.qty || 0)]);
		} else {
			renderStockChart(series.labels, series.values);
		}
	}

	function downloadCSV(rows, filename) {
		const csv = rows.map(r => r.map(cell => {
			if (cell == null) return '';
			const s = String(cell);
			if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g,'""')}"`;
			return s;
		}).join(',')).join('\n');
		const blob = new Blob([csv], {
			type: 'text/csv;charset=utf-8;'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			URL.revokeObjectURL(url);
			a.remove();
		}, 1500);
	}

	function exportIngredientsCSV() {
		const headers = ['id', 'name', 'type', 'supplier', 'qty', 'unit', 'min_qty', 'max_qty', 'expiry'];
		const rows = ingredientsCache.map(r => [r.id, r.name, r.type, r.supplier, r.qty, r.unit, r.min_qty || '', r.max_qty || '', r.expiry || '']);
		downloadCSV([headers].concat(rows), `inventory_${(new Date()).toISOString().slice(0,10)}.csv`);
	}

	function exportStockCSVForIngredient(id, name) {
		if (!id) {
			alert('No ingredient selected');
			return;
		}
		const {
			start,
			end
		} = parseDateInputs();
		const rows = filterActivitiesForIngredientInRange(id, start, end);
		const csvRows = [
			['time', 'action', 'text', 'delta']
		];
		rows.forEach(r => {
			csvRows.push([r.time || '', r.action || '', (r.text || '').replace(/\r?\n/g, ' '), getSignedDelta(r)]);
		});
		const safeName = (name || `ing_${id}`).replace(/\s+/g, '_');
		downloadCSV(csvRows, `${safeName}_stock_${start}_to_${end}.csv`);
	}

	function attachUI() {
		if (searchInput) searchInput.addEventListener('input', () => renderList(searchInput.value));
		if (exportInventoryBtn) exportInventoryBtn.addEventListener('click', exportIngredientsCSV);
		if (exportStockBtn) exportStockBtn.addEventListener('click', () => {
			if (!selectedIngredient) return alert('Select an ingredient first');
			exportStockCSVForIngredient(selectedIngredient.id, selectedIngredient.name);
		});

		const applyBtn = document.getElementById('applyReportRange');
		if (applyBtn) applyBtn.addEventListener('click', () => renderStockForSelected());
		const presetEl = document.getElementById('reportPreset');
		if (presetEl) presetEl.addEventListener('change', () => renderStockForSelected());
	}

	async function init() {
		const reportsSection = document.getElementById('view-reports');
		if (!reportsSection) return;
		attachUI();
		await loadIngredients();
		await loadActivity();
		renderList();
		ensureChart();
		if (ingredientsCache && ingredientsCache.length > 0) {
			const pick = ingredientsCache.find(x => Number(x.qty) !== 0) || ingredientsCache[0];
			selectIngredient(pick);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();

(function() {
	async function fetchJSON(url, opts = {}) {
		const res = await fetch(url, Object.assign({
			credentials: 'include',
			headers: {
				'Accept': 'application/json'
			}
		}, opts));
		if (!res.ok) {
			const txt = await res.text().catch(() => '');
			const err = new Error(`HTTP ${res.status}: ${txt}`);
			err.status = res.status;
			throw err;
		}
		return res.json().catch(() => {
			return null;
		});
	}

	function downloadCSV(rows, filename) {
		const csvLines = rows.map(r => r.map(cell => {
			if (cell === null || typeof cell === 'undefined') return '';
			const s = String(cell);
			const needsQuote = s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r');
			return needsQuote ? `"${s.replace(/"/g,'""')}"` : s;
		}).join(','));
		const csvWithBom = '\uFEFF' + csvLines.join('\r\n');
		const blob = new Blob([csvWithBom], {
			type: 'text/csv;charset=utf-8;'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			URL.revokeObjectURL(url);
			a.remove();
		}, 1000);
	}

	const startEl = document.getElementById('reportStart');
	const endEl = document.getElementById('reportEnd');
	const presetEl = document.getElementById('reportPreset');
	const applyBtn = document.getElementById('applyReportRange');
	const exportReportsBtn = document.getElementById('exportReportsBtn');
	const exportInventoryBtn = document.getElementById('exportInventoryCSV');
	const exportStockBtn = document.getElementById('exportStockCSV');
	const selectedNameEl = document.getElementById('selectedIngredientName');
	const reportSummaryEl = document.getElementById('reportSummary');

	function getDateRange() {
		const start = (startEl && startEl.value) ? startEl.value : '';
		const end = (endEl && endEl.value) ? endEl.value : '';
		if (start && end) return {
			start,
			end
		};
		const days = Number((presetEl && presetEl.value) || 30);
		const e = new Date();
		const s = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
		return {
			start: s.toISOString().slice(0, 10),
			end: e.toISOString().slice(0, 10)
		};
	}

	async function updateReportSummary() {
		if (!reportSummaryEl) return;
		reportSummaryEl.textContent = 'Loading summary…';

		const {
			start,
			end
		} = getDateRange();
		try {
			const ingResp = await fetchJSON(`/api/ingredients?limit=2000&page=1`);
			const activityResp = await fetchJSON(`/api/activity?limit=2000&page=1`);
			const ingredients = (ingResp && ingResp.items) ? ingResp.items : [];
			const activities = (activityResp && activityResp.items) ? activityResp.items : [];

			const totalIngredients = ingredients.length;
			const lowStockCount = ingredients.filter(i => {
				const qty = Number(i.qty || 0);
				const minq = Number(i.min_qty || 0);
				return qty <= minq;
			}).length;

			const s = new Date(start + 'T00:00:00');
			const e = new Date(end + 'T23:59:59');

			let stockInCount = 0,
				stockOutCount = 0,
				netChange = 0;
			for (const a of activities) {
				if (!a.time) continue;
				const t = new Date(a.time);
				if (t < s || t > e) continue;
				let qty = 0;
				if (typeof a.qty === 'number' && !Number.isNaN(a.qty)) qty = Number(a.qty);
				else {
					const m = String(a.text || '').match(/-?[\d,.]+(?:\.\d+)?/);
					if (m) qty = Number(m[0].replace(/,/g, ''));
				}
				const action = (a.action || '').toString().toLowerCase();
				const txt = (a.text || '').toString().toLowerCase();
				let sign = 0;
				if (action.includes('in') || txt.includes('stock in')) sign = +1;
				else if (action.includes('out') || txt.includes('stock out')) sign = -1;
				else {
					if (txt.includes('in')) sign = +1;
					else if (txt.includes('out')) sign = -1;
				}

				if (sign > 0) {
					stockInCount++;
					netChange += qty;
				} else if (sign < 0) {
					stockOutCount++;
					netChange -= qty;
				}
			}

			const niceStart = new Date(start).toLocaleDateString();
			const niceEnd = new Date(end).toLocaleDateString();
			const netSign = netChange >= 0 ? '+' : '';
			reportSummaryEl.textContent =
				`Range: ${niceStart} — ${niceEnd} · Ingredients: ${totalIngredients} · Low stock: ${lowStockCount} · Stock in: ${stockInCount} · Stock out: ${stockOutCount} · Net change: ${netSign}${Number(netChange).toFixed(3)}`;
		} catch (err) {
			console.error('updateReportSummary err', err);
			if (err && err.status === 401) {
				reportSummaryEl.textContent = 'Not authenticated — please sign in to view the report summary.';
			} else {
				reportSummaryEl.textContent = 'Could not load summary (server error).';
			}
		}
	}

	async function exportInventoryCSV() {
		try {
			const resp = await fetchJSON(`/api/ingredients?limit=2000&page=1`);
			const items = (resp && resp.items) ? resp.items : [];
			const header = ['id', 'name', 'type', 'supplier', 'qty', 'unit', 'min_qty', 'max_qty', 'expiry'];
			const rows = [header];
			for (const r of items) {
				rows.push([r.id, r.name, r.type, r.supplier || '', r.qty, r.unit || '', r.min_qty || '', r.max_qty || '', r.expiry || '']);
			}
			downloadCSV(rows, `inventory_${(new Date()).toISOString().slice(0,10)}.csv`);
		} catch (err) {
			console.error('exportInventoryCSV err', err);
			alert('Failed to export inventory CSV. Check console for details.');
		}
	}

	async function exportStockCSVForIngredientId(ingId, ingName) {
		if (!ingId) {
			alert('No ingredient selected');
			return;
		}
		const {
			start,
			end
		} = getDateRange();
		try {
			const resp = await fetchJSON(`/api/activity?limit=2000&page=1`);
			const items = (resp && resp.items) ? resp.items.filter(x => Number(x.ingredient_id) === Number(ingId)) : [];

			const s = new Date(start + 'T00:00:00');
			const e = new Date(end + 'T23:59:59');
			const rows = [
				['time', 'action', 'text', 'delta']
			];
			items.forEach(r => {
				const t = r.time ? new Date(r.time) : null;
				if (t && (t < s || t > e)) return;

				let qty = 0;
				if (typeof r.qty === 'number' && !Number.isNaN(r.qty)) qty = Number(r.qty);
				else {
					const m = String(r.text || '').match(/-?[\d,.]+(?:\.\d+)?/);
					if (m) qty = Number(m[0].replace(/,/g, ''));
				}
				const action = r.action || '';
				let sign = 0;
				const txt = (r.text || '').toString().toLowerCase();
				if ((action + '').toLowerCase().includes('in') || txt.includes('stock in')) sign = +1;
				else if ((action + '').toLowerCase().includes('out') || txt.includes('stock out')) sign = -1;
				else {
					if (txt.includes('in')) sign = +1;
					else if (txt.includes('out')) sign = -1;
				}
				const delta = sign === 0 ? '' : (sign * qty);
				rows.push([r.time || '', action || '', (r.text || '').replace(/\r?\n/g, ' '), delta]);
			});
			const safeName = (ingName || `ingredient_${ingId}`).replace(/\s+/g, '_').replace(/[^\w\-_.]/g, '');
			downloadCSV(rows, `${safeName}_stock_${start}_to_${end}.csv`);
		} catch (err) {
			console.error('exportStockCSVForIngredientId err', err);
			alert('Failed to export stock CSV. Check console for details.');
		}
	}

	function attachControls() {
		if (startEl) startEl.addEventListener('change', updateReportSummary);
		if (endEl) endEl.addEventListener('change', updateReportSummary);
		if (presetEl) presetEl.addEventListener('change', () => {
			const days = Number(presetEl.value || 30);
			const e = new Date();
			const s = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
			if (startEl) startEl.value = s.toISOString().slice(0, 10);
			if (endEl) endEl.value = e.toISOString().slice(0, 10);
			updateReportSummary();
		});
		if (applyBtn) applyBtn.addEventListener('click', updateReportSummary);
		if (exportReportsBtn) exportReportsBtn.addEventListener('click', exportInventoryCSV);
		if (exportInventoryBtn) exportInventoryBtn.addEventListener('click', exportInventoryCSV);
		if (exportStockBtn) exportStockBtn.addEventListener('click', () => {
			let id = null,
				name = null;
			try {
				if (window.selectedIngredient && window.selectedIngredient.id) {
					id = window.selectedIngredient.id;
					name = window.selectedIngredient.name;
				} else if (window._selectedIngredient && window._selectedIngredient.id) {
					id = window._selectedIngredient.id;
					name = window._selectedIngredient.name;
				}
			} catch (e) {}
			if (!id) {
				const sel = document.getElementById('selectedIngredientId');
				if (sel && sel.value) id = sel.value;
			}
			if (!id) {
				const answer = prompt('Enter ingredient id to export stock CSV (or cancel):');
				if (!answer) return;
				id = answer.trim();
			}
			exportStockCSVForIngredientId(id, name || '');
		});
		updateReportSummary();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', attachControls);
	} else {
		attachControls();
	}

})();

/* function escapeHtml(str) {
	if (str == null) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
} */

function frontendHasRole(roles = []) {
	if (!window.currentUser || !window.currentUser.role) return false;
	const my = String(window.currentUser.role || '').toLowerCase();
	return roles.map(r => String(r).toLowerCase()).includes(my);
}

function openEventModal(eventItem) {
	const modal = document.getElementById('modal');
	const modalContent = document.getElementById('modalContent');

	const who = (eventItem.username && eventItem.username !== 'unknown') ? escapeHtml(eventItem.username) : 'unknown';
	const when = eventItem.time ? (new Date(eventItem.time)).toLocaleString() : '—';
	const ingredient = eventItem.ingredient_name ? `<div><strong>Ingredient:</strong> ${escapeHtml(eventItem.ingredient_name)}</div>` : '';
	const action = eventItem.action ? `<div><strong>Action:</strong> ${escapeHtml(eventItem.action)}</div>` : '';

	modalContent.innerHTML = `
    <div style="padding:8px;">
      <h3 style="margin:0 0 8px 0;">Event</h3>
      <div class="muted small" style="margin-bottom:8px">By: <strong>${who}</strong></div>
      <div class="muted small" style="margin-bottom:8px">When: ${escapeHtml(when)}</div>
      ${ingredient}
      ${action}
      <div style="margin-top:8px;color:var(--text)">${escapeHtml(eventItem.text || '')}</div>
    </div>
  `;

	modal.classList.remove('hidden');
	modal.setAttribute('aria-hidden', 'false');
}


async function fetchHistory(limit = 200, page = 1) {
	try {
		const res = await apiFetch(`/api/activity?limit=${encodeURIComponent(limit)}&page=${encodeURIComponent(page)}`);
		return res;
	} catch (err) {
		console.warn('fetchHistory err', err);
		return {
			items: [],
			meta: {
				total: 0,
				page: 1,
				limit: 0
			}
		};
	}
}

function formatTime(ts) {
	try {
		const d = new Date(ts);
		return d.toISOString();
	} catch (e) {
		return String(ts || '');
	}
}

function makeHistoryItemHtml(it) {
	const who = it.username ? `<strong>${escapeHtml(it.username)}</strong>` : '<em>system</em>';
	const what = it.ingredient_name ? `<strong>${escapeHtml(it.ingredient_name)}</strong>` : '';
	const action = it.action ? escapeHtml(it.action) : '';
	const text = escapeHtml(it.text || '');
	const time = formatTime(it.time);
	return `
    <li style="padding:10px;border-radius:8px;margin-bottom:8px;background:var(--card);border:1px solid rgba(0,0,0,0.04);box-shadow:var(--shadow);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="min-width:0;flex:1">
          <div style="font-weight:800">${who} ${action ? `• ${action}` : ''} ${what}</div>
          <div class="muted small" style="margin-top:6px">${text}</div>
        </div>
        <div class="muted small" style="white-space:nowrap;margin-left:8px">${time}</div>
      </div>
    </li>
  `;
}

/* function escapeHtml(s) {
	if (!s && s !== 0) return '';
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
} */

async function renderHistory(opts = {}) {
	const limit = opts.limit || 50;  // #17 — reduced from 200; paginate instead
	const page = opts.page || 1;
	const wrapper = document.getElementById('activityList');
	if (!wrapper) return;

	wrapper.innerHTML = '<li class="muted small" style="padding:10px">Loading history…</li>';
	const resp = await fetchHistory(limit, page);
	const items = resp && resp.items ? resp.items : [];
	const meta  = resp && resp.meta  ? resp.meta  : { total: items.length, page, limit };

	if (!items || items.length === 0) {
		wrapper.innerHTML = '<li class="muted small" style="padding:10px">No history yet.</li>';
	} else {
	const html = items.map(it => makeHistoryItemHtml(it)).join('\n');
	wrapper.innerHTML = html;
}

	// #17 — Pagination controls below the list
	let pagEl = document.getElementById('activityPagination');
	if (!pagEl) {
		pagEl = document.createElement('div');
		pagEl.id = 'activityPagination';
		pagEl.style.cssText = 'display:flex;justify-content:center;gap:8px;margin-top:14px;flex-wrap:wrap;';
		wrapper.parentElement?.appendChild(pagEl);
	}
	const totalPages = Math.max(1, Math.ceil((meta.total || 0) / limit));
	if (totalPages <= 1) { pagEl.innerHTML = ''; return; }

	let pagHtml = '';
	if (page > 1) pagHtml += `<button class="btn small ghost act-page-btn" data-page="${page-1}">&lt; Prev</button>`;
	// Show up to 5 page buttons centred around current
	const start = Math.max(1, page - 2);
	const end   = Math.min(totalPages, start + 4);
	for (let p = start; p <= end; p++) {
		pagHtml += `<button class="btn small ${p===page?'primary':'ghost'} act-page-btn" data-page="${p}">${p}</button>`;
	}
	if (page < totalPages) pagHtml += `<button class="btn small ghost act-page-btn" data-page="${page+1}">Next &gt;</button>`;
	pagEl.innerHTML = pagHtml;
	pagEl.querySelectorAll('.act-page-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			renderHistory({ limit, page: Number(btn.dataset.page) });
			wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	});
}

document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('.nav-item').forEach(btn => {
		btn.addEventListener('click', (ev) => {
			const view = btn.getAttribute('data-view');
			if (view === 'activity' || view === 'history') {
				setTimeout(() => renderHistory({ limit: 50 }), 40);
			}
		});
	});

	if (!document.getElementById('app').classList.contains('hidden')) {
		const activeNav = document.querySelector('.nav-item.active');
		if (activeNav && (activeNav.dataset.view === 'activity' || activeNav.dataset.view === 'history')) {
			renderHistory({ limit: 50 });
		}
	}
});

async function logClientActivity({
	ingredient_id = null,
	action = '',
	text = ''
}) {
	try {
		await apiFetch('/api/activity', {
			method: 'POST',
			body: {
				ingredient_id,
				action,
				text
			}
		});
		const activeNav = document.querySelector('.nav-item.active');
		if (activeNav && (activeNav.dataset.view === 'activity' || activeNav.dataset.view === 'history')) {
			renderHistory({ limit: 50 });
		}
	} catch (e) {
		console.warn('logClientActivity failed', e);
	}
}

async function populateUserMenu() {
	const userMenuName = q('userMenuName');
	const userMenuRole = q('userMenuRole');
	const userMenu = q('userMenu');

	let s = getSession();
	try {
		const res = await fetch('/api/auth/me', { credentials: 'include' });
		if (res.ok) {
			const data = await res.json();
			if (data && data.user) {
				s = data.user;
				setSession(s, !!getPersistentSession());
			}
		}
	} catch (e) {
		console.debug('populateUserMenu: no server /api/auth/me', e?.message || e);
	}
	if (!s) return;

	// Update menu name & role
	if (userMenuName) userMenuName.textContent = s.name || s.username || 'User';
	if (userMenuRole) userMenuRole.textContent = s.role || '—';

	// Avatar inside menu (prepend avatar if not exists)
	let avatarHtml = '<i class="fa fa-user fa-2x"></i>'; // placeholder
	const avatarData = localStorage.getItem(avatarKeyFor(s.username));
	if (avatarData) {
		avatarHtml = `<img src="${avatarData}" alt="avatar" class="user-menu-avatar">`;
	}

	if (userMenuName) {
		const wrap = userMenuName.closest('.user-menu-top');
		if (wrap) {
			let avatarEl = wrap.querySelector('.user-menu-avatar');
			if (!avatarEl) {
				const div = document.createElement('div');
				div.className = 'user-menu-avatar-wrap';
				div.innerHTML = avatarHtml;
				wrap.insertBefore(div, userMenuName);
			} else {
				avatarEl.src = avatarData;
			}
		}
	}

	// Show the menu
	if (userMenu) userMenu.classList.remove('hidden');

	// Wire buttons (use the real function names that exist in this file)
	const btnProfile = q('userMenuProfile');
	if (btnProfile) btnProfile.onclick = () => {
		showProfileModal(); // your existing profile modal function
	};

	const btnLogout = q('userMenuLogout');
	if (btnLogout) btnLogout.onclick = () => {
		logoutUser(); // your existing logout function
	};
}

document.addEventListener('DOMContentLoaded', () => {
	populateUserMenu();
});

(function () {
	const INTERVAL = 4 * 60 * 1000; // every 4 minutes (well within the 10-min window)

	function sendHeartbeat() {
		if (!isLoggedIn()) return;
		fetch('/api/auth/heartbeat', {
			method: 'PUT',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' }
		}).catch(() => {}); // silent — non-critical
	}

	// Fire immediately on load, then on a timer
	document.addEventListener('DOMContentLoaded', () => {
		sendHeartbeat();
		setInterval(sendHeartbeat, INTERVAL);
	});

	// Also fire when the tab becomes visible again after being hidden
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') sendHeartbeat();
	});
})();

// ── SERVICE WORKER REGISTRATION (offline support) ────────────────────────────
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js')
			.then(reg => {
				console.info('[SW] registered', reg.scope);
				reg.addEventListener('updatefound', () => {
					const newWorker = reg.installing;
					if (!newWorker) return;
					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							if (typeof notify === 'function') {
								notify('App updated — reload to get the latest version', { timeout: 8000, type: 'info' });
							}
						}
					});
				});
			})
			.catch(err => console.warn('[SW] registration failed', err));
	});

	// Detect going offline / online
	window.addEventListener('offline', () => {
		if (typeof notify === 'function') notify('You are offline — viewing cached data', { type: 'warn', timeout: 5000 });
		document.getElementById('app')?.setAttribute('data-offline', '1');
	});
	window.addEventListener('online', () => {
		if (typeof notify === 'function') notify('Back online ✓', { type: 'success', timeout: 3000 });
		document.getElementById('app')?.removeAttribute('data-offline');
	});
}