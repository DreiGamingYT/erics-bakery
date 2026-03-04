(function() {

	const apiFetchSafe = async (url, opts = {}) => {
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
			const text = await res.text();
			throw new Error(`HTTP ${res.status}: ${text}`);
		}
		try {
			return await res.json();
		} catch (e) {
			return null;
		}
	};

	const listWrap = document.getElementById('inventoryReportList');
	const searchInput = document.getElementById('reportItemSearch');
	const exportInventoryBtn = document.getElementById('exportInventoryCSV');
	const exportStockBtn = document.getElementById('exportStockCSV');
	const selectedNameEl = document.getElementById('selectedIngredientName');
	const stockCtx = document.getElementById('inventoryStockChart');
	let inventoryChart = null;
	let ingredientsCache = [];
	let selectedIngredient = null;
	let activityCache = [];

	async function initInventoryReport() {
		if (!listWrap) return;
		attachUIEvents();
		await loadIngredients();

		await loadActivity();

		renderList();
	}

	// ── Highlight helpers ─────────────────────────────────────────────────────
	function isLowStock(it) {
		const min = Number(it.min_qty || it.min || 0);
		return Number(it.qty || 0) <= min;
	}

	function daysUntilExpiry(it) {
		if (!it.expiry) return null;
		const diff = new Date(it.expiry).getTime() - Date.now();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	}

	function isExpiringSoon(it) {
		const d = daysUntilExpiry(it);
		return d !== null && d >= 0 && d <= 7;
	}

	function getReportFilter() {
		return document.getElementById('reportFilter')?.value || 'all';
	}

	// ── Inject highlight styles once ───────────────────────────────────────────
	function injectHighlightStyles() {
		if (document.getElementById('rpt-highlight-styles')) return;
		const s = document.createElement('style');
		s.id = 'rpt-highlight-styles';
		s.textContent = `
			.rpt-row-low     { background: rgba(239,68,68,.07)  !important; border-left: 3px solid #ef4444 !important; }
			.rpt-row-expiring{ background: rgba(234,179,8,.09)  !important; border-left: 3px solid #eab308 !important; }
			.rpt-row-both    { background: rgba(249,115,22,.09) !important; border-left: 3px solid #f97316 !important; }
			.rpt-badge {
				display: inline-block; font-size: 10px; font-weight: 700;
				padding: 1px 6px; border-radius: 999px; margin-left: 5px; vertical-align: middle;
			}
			.rpt-badge-low      { background: rgba(239,68,68,.15); color: #dc2626; }
			.rpt-badge-expiring { background: rgba(234,179,8,.18); color: #a16207; }
		`;
		document.head.appendChild(s);
	}

	function attachUIEvents() {
		injectHighlightStyles();

		if (searchInput) {
			searchInput.addEventListener('input', () => renderList(searchInput.value.trim()));
		}
		if (exportInventoryBtn) exportInventoryBtn.addEventListener('click', exportIngredientsCSV);
		if (exportStockBtn) exportStockBtn.addEventListener('click', exportSelectedStockCSV);

		// Apply button — sync list, chart, and summary table
		const applyBtn = document.getElementById('applyReportRange');
		if (applyBtn) {
			applyBtn.addEventListener('click', () => {
				renderList(searchInput?.value.trim() || '');
				renderStockForSelected();
			});
		}

		// Preset change
		const preset = document.getElementById('reportPreset');
		if (preset) {
			preset.addEventListener('change', () => {
				renderList(searchInput?.value.trim() || '');
				renderStockForSelected();
			});
		}

		// Delegated listener for reportFilter (injected dynamically by renderReports in app.js)
		document.addEventListener('change', (e) => {
			if (e.target && e.target.id === 'reportFilter') {
				renderList(searchInput?.value.trim() || '');
			}
		});
	}

	async function loadIngredients() {
		try {

			const data = await apiFetchSafe('/api/ingredients?limit=2000&page=1');
			ingredientsCache = (data && data.items) ? data.items : [];
		} catch (e) {
			console.error('loadIngredients err', e);
			ingredientsCache = [];
		}
	}

	async function loadActivity() {
		try {

			const data = await apiFetchSafe('/api/activity?limit=2000&page=1');
			activityCache = (data && data.items) ? data.items : [];
		} catch (e) {
			console.error('loadActivity err', e);
			activityCache = [];
		}
	}

	function renderList(searchFilter = '') {
		if (!listWrap) return;
		const reportFilter = getReportFilter();

		// Apply both search filter and report filter
		const items = ingredientsCache.filter(it => {
			// Search
			if (searchFilter) {
				const q = searchFilter.toLowerCase();
				if (!(
					(it.name || '').toLowerCase().includes(q) ||
					(it.supplier || '').toLowerCase().includes(q) ||
					(String(it.id || '')).includes(q)
				)) return false;
			}
			// Report filter
			if (reportFilter === 'low')      return isLowStock(it);
			if (reportFilter === 'expiring') return isExpiringSoon(it);
			// 'all' and 'usage' — show everything
			return true;
		});

		if (items.length === 0) {
			listWrap.innerHTML = '<div class="muted small" style="padding:12px">No ingredients found.</div>';
			return;
		}

		const el = document.createElement('div');
		el.style.display = 'grid';
		el.style.gap = '8px';

		items.forEach(it => {
			const low      = isLowStock(it);
			const expiring = isExpiringSoon(it);
			const shouldHighlight = reportFilter === 'all' || reportFilter === 'low' || reportFilter === 'expiring';

			const row = document.createElement('div');
			row.className = 'small-card';
			row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;transition:background .15s,border-left .15s;border-left:3px solid transparent;border-radius:8px;';

			// Highlight class
			if (shouldHighlight) {
				if (low && expiring) row.classList.add('rpt-row-both');
				else if (low)        row.classList.add('rpt-row-low');
				else if (expiring)   row.classList.add('rpt-row-expiring');
			}

			const left = document.createElement('div');
			left.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;';

			const title = document.createElement('div');
			title.style.fontWeight = '800';
			title.textContent = `${it.name} ${it.unit ? '· '+it.unit : ''}`;

			// Append status badges next to title
			if (shouldHighlight) {
				if (low) {
					const b = document.createElement('span');
					b.className = 'rpt-badge rpt-badge-low';
					b.textContent = 'Low stock';
					title.appendChild(b);
				}
				if (expiring) {
					const d = daysUntilExpiry(it);
					const b = document.createElement('span');
					b.className = 'rpt-badge rpt-badge-expiring';
					b.textContent = d === 0 ? 'Expires today' : `Expires in ${d}d`;
					title.appendChild(b);
				}
			}

			const meta = document.createElement('div');
			meta.className = 'muted small';
			meta.textContent = `Qty: ${it.qty} · Min: ${it.min_qty || 0} · Supplier: ${it.supplier || '—'}`;

			left.appendChild(title);
			left.appendChild(meta);

			const actions = document.createElement('div');
			actions.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

			const viewBtn = document.createElement('button');
			viewBtn.className = 'btn small';
			viewBtn.type = 'button';
			viewBtn.textContent = 'View stock';
			viewBtn.addEventListener('click', () => selectIngredient(it));

			const csvBtn = document.createElement('button');
			csvBtn.className = 'btn ghost small';
			csvBtn.type = 'button';
			csvBtn.textContent = 'Export';
			csvBtn.addEventListener('click', () => exportStockCSVForIngredient(it.id));

			actions.appendChild(viewBtn);
			actions.appendChild(csvBtn);
			row.appendChild(left);
			row.appendChild(actions);
			el.appendChild(row);
		});

		listWrap.innerHTML = '';
		listWrap.appendChild(el);
	}

	function parseDateInputs() {
		const start = document.getElementById('reportStart')?.value;
		const end = document.getElementById('reportEnd')?.value;

		if (!start || !end) {
			const preset = Number(document.getElementById('reportPreset')?.value || 30);
			const endDate = new Date();
			const startDate = new Date(Date.now() - (preset * 24 * 60 * 60 * 1000));
			return {
				start: startDate.toISOString().slice(0, 10),
				end: endDate.toISOString().slice(0, 10)
			};
		}
		return {
			start,
			end
		};
	}

	function selectIngredient(it) {
		selectedIngredient = it;
		selectedNameEl.textContent = it.name;

		renderStockForSelected();
	}

	function filterActivityForIngredient(id, startIso, endIso) {
		if (!activityCache || !Array.isArray(activityCache)) return [];
		const s = startIso ? new Date(startIso + 'T00:00:00Z') : null;
		const e = endIso ? new Date(endIso + 'T23:59:59Z') : null;
		return activityCache.filter(a => {
			if (!a) return false;
			if (Number(a.ingredient_id) !== Number(id)) return false;

			const t = a.time ? new Date(a.time) : null;
			if (t && s && t < s) return false;
			if (t && e && t > e) return false;

			return true;
		}).sort((a, b) => new Date(a.time) - new Date(b.time));
	}

	function extractQtyFromActivityText(txt) {
		if (!txt) return 0;

		const m = txt.match(/([\d,.]+(?:\.\d+)?)/);
		if (!m) return 0;

		return Number(String(m[1]).replace(/,/g, ''));
	}

	function buildSeriesFromActivity(rows, currentQty) {
		const labels = [];
		const stockInData = [];
		const stockOutData = [];
		const netData = [];
		const currentQtyData = [];
		let running = 0;

		rows.forEach(r => {
			const isIn  = /stock_in/i.test(r.action)  || /stock in/i.test(r.text);
			const isOut = /stock_out/i.test(r.action) || /stock out/i.test(r.text);
			const qty   = extractQtyFromActivityText(r.text);
			const delta = isIn ? qty : isOut ? -qty : 0;
			running += delta;

			const d = r.time ? new Date(r.time) : new Date();
			labels.push(d.toLocaleString());
			stockInData.push(isIn  ? qty  : null);
			stockOutData.push(isOut ? qty  : null);
			netData.push(running);
			currentQtyData.push(currentQty != null ? currentQty : null);
		});

		return { labels, stockInData, stockOutData, netData, currentQtyData, final: running };
	}

	function ensureChart() {
		if (!stockCtx) return;
		if (inventoryChart) {
			inventoryChart.destroy();
			inventoryChart = null;
		}
		inventoryChart = new Chart(stockCtx.getContext('2d'), {
			type: 'bar',
			data: {
				labels: [],
				datasets: [
					{
						label: 'Net Running Total',
						data: [],
						fill: true,
						borderColor: 'rgba(99, 102, 241, 1)',
						backgroundColor: 'rgba(99, 102, 241, 0.15)',
						borderWidth: 2,
					},
					{
						label: 'Stock In',
						data: [],
						fill: true,
						borderColor: 'rgba(34, 197, 94, 1)',
						backgroundColor: 'rgba(34, 197, 94, 0.12)',
						borderWidth: 2,
					},
					{
						label: 'Stock Out',
						data: [],
						fill: true,
						borderColor: 'rgba(239, 68, 68, 1)',
						backgroundColor: 'rgba(239, 68, 68, 0.12)',
						borderWidth: 2,
					},
					{
						label: 'Current Qty',
						data: [],
						fill: false,
						borderColor: 'rgba(234, 179, 8, 1)',
						backgroundColor: 'rgba(234, 179, 8, 0)',
						borderWidth: 2,
					}
				]
			},
			options: {
				maintainAspectRatio: false,
				responsive: true,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: {
						display: true,
						position: 'top',
						labels: {
							usePointStyle: true,
							boxWidth: 8,
							padding: 14,
							font: { size: 12 }
						}
					},
					tooltip: {
						callbacks: {
							label: ctx => {
								if (ctx.parsed.y === null) return null;
								return ` ${ctx.dataset.label}: ${ctx.parsed.y}`;
							}
						}
					}
				},
				scales: {
					x: {
						display: true,
						ticks: {
							maxTicksLimit: 8,
							maxRotation: 30,
							font: { size: 11 }
						},
						grid: { display: false }
					},
					y: {
						display: true,
						beginAtZero: true,
						ticks: { font: { size: 11 } },
						grid: { color: 'rgba(0,0,0,0.05)' }
					}
				}
			}
		});
	}

	function renderStockChart(series) {
		if (!inventoryChart) ensureChart();
		if (!inventoryChart) return;
		inventoryChart.data.labels = series.labels;
		inventoryChart.data.datasets[0].data = series.netData;
		inventoryChart.data.datasets[1].data = series.stockInData;
		inventoryChart.data.datasets[2].data = series.stockOutData;
		inventoryChart.data.datasets[3].data = series.currentQtyData;
		inventoryChart.update();
	}

	async function renderStockForSelected() {
		if (!selectedIngredient) return;
		const {
			start,
			end
		} = parseDateInputs();

		if (!activityCache || activityCache.length === 0) {
			await loadActivity();
		}
		const rows = filterActivityForIngredient(selectedIngredient.id, start, end);
		const currentQty = selectedIngredient.qty != null ? Number(selectedIngredient.qty) : null;

		if (rows.length === 0) {
			const now = new Date();
			renderStockChart({
				labels: [now.toLocaleString()],
				netData: [currentQty || 0],
				stockInData: [null],
				stockOutData: [null],
				currentQtyData: [currentQty]
			});
		} else {
			const series = buildSeriesFromActivity(rows, currentQty);
			renderStockChart(series);
		}
	}

	function exportIngredientsCSV() {
		const headers = ['id', 'name', 'type', 'supplier', 'qty', 'unit', 'min_qty', 'max_qty', 'expiry'];
		const rows = ingredientsCache.map(r => [
			r.id, r.name, r.type, r.supplier, r.qty, r.unit, r.min_qty || '', r.max_qty || '', r.expiry || ''
		]);
		downloadCSV([headers].concat(rows), `inventory_${new Date().toISOString().slice(0,10)}.csv`);
	}

	function exportSelectedStockCSV() {
		if (!selectedIngredient) {
			alert('Select an ingredient first to export stock history');
			return;
		}
		exportStockCSVForIngredient(selectedIngredient.id);
	}

	function exportStockCSVForIngredient(id) {
		const {
			start,
			end
		} = parseDateInputs();
		const rows = filterActivityForIngredient(id, start, end);
		const csvRows = [
			['time', 'action', 'text']
		];
		rows.forEach(r => csvRows.push([r.time, r.action || '', r.text || '']));
		downloadCSV(csvRows, `${(selectedIngredient && selectedIngredient.name ? selectedIngredient.name.replace(/\s+/g,'_') : 'ingredient')}_stock_${start}_to_${end}.csv`);
	}

	function sanitizeCellValue(v) {
		if (v === null || typeof v === 'undefined') return '';
		let s = String(v);

		s = s.replace(/\u00A0/g, ' ');

		s = s.replace(/[\u2012\u2013\u2014\u2015]/g, ' - ');

		s = s.replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'"); 
		s = s.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"'); 
		s = s.replace(/\u2026/g, '...');

		s = s.replace(/\s+/g, ' ').trim();

		const needsQuote = s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r');
		return needsQuote ? `"${s.replace(/"/g,'""')}"` : s;
	}

	function downloadCSV(rows, filename) {

		const csvLines = rows.map(r => r.map(cell => sanitizeCellValue(cell)).join(','));
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

	function whenReady() {

		const reportsSection = document.getElementById('view-reports');
		if (!reportsSection) return;
		initInventoryReport();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', whenReady);
	} else {
		whenReady();
	}
})();