/**
 * export-enhancements.js
 * Adds Excel (.xlsx) export to the Reports section.
 * Exports a 3-sheet workbook: Inventory, Stock Activity, Summary.
 * Load AFTER reports-enhancements.js.
 */
(function () {
  'use strict';

  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  function loadScript(url) {
    if (document.querySelector(`script[src="${url}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function toast(msg, type) {
    if (typeof window.notify === 'function') window.notify(msg, { type: type || 'info' });
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right:5px"></i>Generating…';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.orig || 'Export Excel';
    }
	}

  function parseDateRange() {
		const start = document.getElementById('reportStart')?.value;
    const end   = document.getElementById('reportEnd')?.value;
		if (!start || !end) {
			const preset = Number(document.getElementById('reportPreset')?.value || 30);
			return {
        start: new Date(Date.now() - preset * 86400000).toISOString().slice(0, 10),
        end:   new Date().toISOString().slice(0, 10)
			};
		}
    return { start, end };
  }

  async function getData() {
    const [ingRes, actRes] = await Promise.all([
      fetch('/api/ingredients?limit=2000&page=1', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/activity?limit=2000',           { credentials: 'include' }).then(r => r.json())
    ]);
		return {
      ingredients: ingRes?.items || [],
      activity:    actRes?.items || []
		};
	}

  async function exportExcel(btn) {
    setLoading(btn, true);
    try {
      await loadScript(XLSX_URL);
      const { ingredients, activity } = await getData();
      const { start, end } = parseDateRange();
      const XLSX = window.XLSX;
      const wb   = XLSX.utils.book_new();

      // ── Sheet 1: Inventory ───────────────────────────────────────────────
      const invRows = ingredients.map(i => {
        const isLow      = i.qty <= (i.min_qty || 0);
        const isExpiring = i.expiry && new Date(i.expiry) <= new Date(Date.now() + 7 * 86400000);
        return {
          ID: i.id, Name: i.name || '', Type: i.type || '',
          Supplier: i.supplier || '', Qty: i.qty, Unit: i.unit || '',
          'Min Qty': i.min_qty || 0, 'Max Qty': i.max_qty || '',
          Expiry: i.expiry ? new Date(i.expiry).toLocaleDateString() : '',
          Status: isLow ? 'Low Stock' : isExpiring ? 'Expiring Soon' : 'OK'
        };
      });
      const wsInv = XLSX.utils.json_to_sheet(invRows);
      wsInv['!cols'] = [6,24,14,22,8,8,8,8,14,14].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsInv, 'Inventory');

      // ── Sheet 2: Stock Activity (filtered by date range) ─────────────────
      const s = new Date(start + 'T00:00:00Z');
      const e = new Date(end   + 'T23:59:59Z');
      const filtered = activity.filter(a => {
        if (!a.time) return false;
        const t = new Date(a.time);
        return t >= s && t <= e;
      });
      const actRows = (filtered.length ? filtered : [{}]).map(a => ({
        Time: a.time ? new Date(a.time).toLocaleString() : '',
        'Ingredient ID': a.ingredient_id || '',
        Action: a.action || '', Details: a.text || '',
        User: a.username || a.user || ''
      }));
      const wsAct = XLSX.utils.json_to_sheet(actRows);
      wsAct['!cols'] = [20,14,16,40,14].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsAct, 'Stock Activity');

      // ── Sheet 3: Summary ─────────────────────────────────────────────────
      const lowItems = ingredients.filter(i => i.qty <= (i.min_qty || 0));
      const expItems = ingredients.filter(i => i.expiry && new Date(i.expiry) <= new Date(Date.now() + 7 * 86400000));
      const summaryRows = [
        { Metric: 'Report period',          Value: `${start} to ${end}` },
        { Metric: 'Generated at',           Value: new Date().toLocaleString() },
        { Metric: 'Total ingredients',      Value: ingredients.length },
        { Metric: 'Low stock items',        Value: lowItems.length },
        { Metric: 'Expiring within 7 days', Value: expItems.length },
        { Metric: 'Activity entries',       Value: filtered.length },
        {},
        { Metric: 'Low Stock Items', Value: '' },
        ...lowItems.map(i => ({ Metric: `  ${i.name}`, Value: `${i.qty} ${i.unit || ''} (min: ${i.min_qty || 0})` })),
        {},
        { Metric: 'Expiring Soon', Value: '' },
        ...expItems.map(i => ({ Metric: `  ${i.name}`, Value: new Date(i.expiry).toLocaleDateString() }))
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = [30, 34].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      XLSX.writeFile(wb, `inventory_report_${start}_to_${end}.xlsx`);
      toast('Excel exported successfully!', 'success');

    } catch (err) {
      console.error('[export-excel]', err);
      toast('Excel export failed: ' + err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  function injectButton() {
    if (document.getElementById('exportExcelBtn')) return;
    const csvBtn = document.getElementById('exportInventoryCSV');
    if (!csvBtn) return;

    const btn = document.createElement('button');
    btn.id        = 'exportExcelBtn';
    btn.type      = 'button';
    btn.className = 'btn small';
    btn.style.cssText = 'background:rgba(34,197,94,.1);color:#15803d;border:1px solid rgba(34,197,94,.25)';
    btn.innerHTML = '<i class="fa fa-file-excel" style="margin-right:5px"></i>Export Excel';
    btn.addEventListener('click', () => exportExcel(btn));

    csvBtn.parentElement.insertBefore(btn, csvBtn.nextSibling);
  }

  function init() {
    if (document.getElementById('exportInventoryCSV')) {
      injectButton();
    } else {
      const obs = new MutationObserver(() => {
        if (document.getElementById('exportInventoryCSV')) {
          obs.disconnect();
          injectButton();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
	}

	if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
	} else {
    init();
	}

})();