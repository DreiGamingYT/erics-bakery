// reports-enhancements.js
// Adds inventory list + stock graph to Reports view.
// Depends on Chart.js and expects a global apiFetch(url, opts) helper; falls back to fetch with credentials.

(function(){
  // Helpers
  const apiFetchSafe = async (url, opts={}) => {
    if (typeof window.apiFetch === 'function') {
      return window.apiFetch(url, opts);
    }
    const res = await fetch(url, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    try { return await res.json(); } catch(e){ return null; }
  };

  // Elements
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

  async function initInventoryReport(){
    if(!listWrap) return;
    attachUIEvents();
    await loadIngredients();
    // pre-load activity (may be large; we fetch a lot to cover range)
    await loadActivity(); // cache
    renderList();
  }

  function attachUIEvents(){
    if(searchInput) {
      searchInput.addEventListener('input', () => renderList(searchInput.value.trim()));
    }
    if(exportInventoryBtn) exportInventoryBtn.addEventListener('click', exportIngredientsCSV);
    if(exportStockBtn) exportStockBtn.addEventListener('click', exportSelectedStockCSV);
    const applyBtn = document.getElementById('applyReportRange');
    if(applyBtn) applyBtn.addEventListener('click', () => {
      // re-render graph for selected ingredient within selected date range
      renderStockForSelected();
    });
    // also re-render when preset changes
    const preset = document.getElementById('reportPreset');
    if(preset) preset.addEventListener('change', () => renderStockForSelected());
  }

  async function loadIngredients(){
    try {
      // fetch many items (server supports limit/page)
      const data = await apiFetchSafe('/api/ingredients?limit=2000&page=1');
      ingredientsCache = (data && data.items) ? data.items : [];
    } catch (e) {
      console.error('loadIngredients err', e);
      ingredientsCache = [];
    }
  }

  async function loadActivity(){
    try {
      // load a large number of records (server paginates; adjust if needed)
      const data = await apiFetchSafe('/api/activity?limit=2000&page=1');
      activityCache = (data && data.items) ? data.items : [];
    } catch (e) {
      console.error('loadActivity err', e);
      activityCache = [];
    }
  }

  function renderList(filter=''){
    if(!listWrap) return;
    const items = ingredientsCache.filter(it => {
      if(!filter) return true;
      const q = filter.toLowerCase();
      return (it.name||'').toLowerCase().includes(q) || (it.supplier||'').toLowerCase().includes(q) || (String(it.id||'')).includes(q);
    });
    if(items.length === 0){
      listWrap.innerHTML = '<div class="muted small" style="padding:12px">No ingredients found.</div>';
      return;
    }
    const el = document.createElement('div');
    el.style.display = 'grid';
    el.style.gap = '8px';
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
      title.textContent = `${it.name} ${it.unit ? '· '+it.unit : ''}`;
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
      viewBtn.addEventListener('click', () => {
        selectIngredient(it);
      });
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

  function parseDateInputs(){
    const start = document.getElementById('reportStart')?.value;
    const end = document.getElementById('reportEnd')?.value;
    // if empty, fallback to preset days
    if(!start || !end){
      const preset = Number(document.getElementById('reportPreset')?.value || 30);
      const endDate = new Date();
      const startDate = new Date(Date.now() - (preset * 24*60*60*1000));
      return { start: startDate.toISOString().slice(0,10), end: endDate.toISOString().slice(0,10) };
    }
    return { start, end };
  }

  function selectIngredient(it){
    selectedIngredient = it;
    selectedNameEl.textContent = it.name;
    // ensure report date range applied
    renderStockForSelected();
  }

  function filterActivityForIngredient(id, startIso, endIso){
    if(!activityCache || !Array.isArray(activityCache)) return [];
    const s = startIso ? new Date(startIso+'T00:00:00Z') : null;
    const e = endIso ? new Date(endIso+'T23:59:59Z') : null;
    return activityCache.filter(a => {
      if(!a) return false;
      if(Number(a.ingredient_id) !== Number(id)) return false;
      // if action or time missing, include only if time ok
      const t = a.time ? new Date(a.time) : null;
      if(t && s && t < s) return false;
      if(t && e && t > e) return false;
      // optionally filter action values stock_in/stock_out
      return true;
    }).sort((a,b)=> new Date(a.time) - new Date(b.time));
  }

  function extractQtyFromActivityText(txt){
    if(!txt) return 0;
    // find first number (integer or float) in the text
    const m = txt.match(/([\d,.]+(?:\.\d+)?)/);
    if(!m) return 0;
    // remove commas and parse
    return Number(String(m[1]).replace(/,/g,''));
  }

  function buildSeriesFromActivity(rows){
    // rows in ascending time order
    const labels = [];
    const values = [];
    let running = 0;
    rows.forEach(r => {
      const delta = (/stock_in/i.test(r.action) || /stock in/i.test(r.text)) ? extractQtyFromActivityText(r.text) :
                    (/stock_out/i.test(r.action) || /stock out/i.test(r.text)) ? -extractQtyFromActivityText(r.text) :
                    0;
      running += delta;
      const d = r.time ? new Date(r.time) : new Date();
      labels.push(d.toLocaleString());
      values.push(running);
    });
    return {labels, values, final: running};
  }

  function ensureChart(){
    if(!stockCtx) return;
    if(inventoryChart) {
      inventoryChart.destroy();
      inventoryChart = null;
    }
    inventoryChart = new Chart(stockCtx.getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Net stock change', data: [], tension: 0.3, fill: true }] },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          x: { display: true, title: { display: false } },
          y: { display: true, beginAtZero: true }
        }
      }
    });
  }

  function renderStockChart(labels, values){
    if(!inventoryChart) ensureChart();
    if(!inventoryChart) return;
    inventoryChart.data.labels = labels;
    inventoryChart.data.datasets[0].data = values;
    inventoryChart.update();
  }

  async function renderStockForSelected(){
    if(!selectedIngredient) return;
    const { start, end } = parseDateInputs();
    // ensure activity cache covers selected range; if not, reload activity (simple approach)
    if(!activityCache || activityCache.length === 0) {
      await loadActivity();
    }
    const rows = filterActivityForIngredient(selectedIngredient.id, start, end);
    const series = buildSeriesFromActivity(rows);
    // If no activity found, create a placeholder point at current time with 0 or current qty
    if(series.labels.length === 0){
      const now = new Date();
      renderStockChart([now.toLocaleString()], [selectedIngredient.qty || 0]);
    } else {
      renderStockChart(series.labels, series.values);
    }
  }

  function exportIngredientsCSV(){
    const headers = ['id','name','type','supplier','qty','unit','min_qty','max_qty','expiry'];
    const rows = ingredientsCache.map(r => [
      r.id, r.name, r.type, r.supplier, r.qty, r.unit, r.min_qty || '', r.max_qty || '', r.expiry || ''
    ]);
    downloadCSV([headers].concat(rows), `inventory_${new Date().toISOString().slice(0,10)}.csv`);
  }

  function exportSelectedStockCSV(){
    if(!selectedIngredient) { alert('Select an ingredient first to export stock history'); return; }
    exportStockCSVForIngredient(selectedIngredient.id);
  }

  function exportStockCSVForIngredient(id){
    const { start, end } = parseDateInputs();
    const rows = filterActivityForIngredient(id, start, end);
    const csvRows = [['time','action','text']];
    rows.forEach(r => csvRows.push([r.time, r.action || '', r.text || '']));
    downloadCSV(csvRows, `${(selectedIngredient && selectedIngredient.name ? selectedIngredient.name.replace(/\s+/g,'_') : 'ingredient')}_stock_${start}_to_${end}.csv`);
  }

  // safe CSV download with BOM+CRLF and unicode sanitization
function sanitizeCellValue(v){
  if (v === null || typeof v === 'undefined') return '';
  let s = String(v);

  // normalize common problematic punctuation to ASCII
  s = s.replace(/\u00A0/g, ' ');               // NBSP -> space
  s = s.replace(/[\u2012\u2013\u2014\u2015]/g, ' - '); // various dashes -> hyphen
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'"); // single quotes -> '
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"'); // double quotes -> "
  s = s.replace(/\u2026/g, '...');             // ellipsis
  // optionally collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();

  // escape quotes for CSV cell
  const needsQuote = s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r');
  return needsQuote ? `"${s.replace(/"/g,'""')}"` : s;
}

function downloadCSV(rows, filename){
  // rows: array of arrays
  const csvLines = rows.map(r => r.map(cell => sanitizeCellValue(cell)).join(','));
  const csvWithBom = '\uFEFF' + csvLines.join('\r\n'); // BOM + CRLF
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1000);
}


  // Init when reports view is present
  function whenReady(){
    // Run only if we're on the Reports view
    const reportsSection = document.getElementById('view-reports');
    if(!reportsSection) return;
    initInventoryReport();
  }

  // Run on DOMContentLoaded and also try later in case app dynamically loads views
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', whenReady);
  } else {
    whenReady();
  }
})();
