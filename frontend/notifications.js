(function () {
	'use strict';

	// ── API ───────────────────────────────────────────────────────────────────

	async function apiFetch(url, opts = {}) {
		const res = await fetch(url, Object.assign({
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' }
		}, opts));
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
		return data;
	}

	async function loadPrefs() {
		try {
			const d = await apiFetch('/api/notifications/prefs');
			return d.prefs || {};
		} catch (e) {
			console.warn('[notif] loadPrefs failed:', e.message);
			return {};
		}
	}

	async function savePrefs(prefs) {
		return apiFetch('/api/notifications/prefs', { method: 'PUT', body: JSON.stringify(prefs) });
	}

	async function fetchAlerts() {
		return apiFetch('/api/notifications/alerts');
	}

	async function sendEmail(type) {
		return apiFetch('/api/notifications/send-email', { method: 'POST', body: JSON.stringify({ type }) });
	}

	// ── Browser notification helpers ──────────────────────────────────────────

	function permissionStatus() {
		if (!('Notification' in window)) return 'unsupported';
		return Notification.permission;
	}

	async function requestPermission() {
		if (!('Notification' in window)) return 'unsupported';
		if (Notification.permission === 'granted') return 'granted';
		return Notification.requestPermission();
	}

	function showBrowserNotif(title, body) {
		if (permissionStatus() !== 'granted') return;
		try { new Notification(title, { body, icon: '/favicon.ico' }); } catch (e) {}
	}

	// ── Core alert checker ────────────────────────────────────────────────────

	let lastAlertKey = '';
	let lastEmailKey = '';
	let pollTimer    = null;
	let currentPrefs = {};

	async function checkAndFireAlerts(prefs, opts = {}) {
		const { forceRecheck = false } = opts;
		let alerts;
		try { alerts = await fetchAlerts(); } catch { return; }

		const alertKey = JSON.stringify({
			l: (alerts.lowStock     || []).map(i => i.id).sort(),
			e: (alerts.expiringSoon || []).map(i => i.id).sort()
		});

		const isNewAlert = alertKey !== lastAlertKey;
		if (!isNewAlert && !forceRecheck) return;
		lastAlertKey = alertKey;

		// Browser push
		if (prefs.pushEnabled && permissionStatus() === 'granted') {
			if (prefs.pushLowStock && alerts.lowStock?.length) {
				const names = alerts.lowStock.slice(0, 3).map(i => i.name).join(', ');
				const more  = alerts.lowStock.length > 3 ? ` +${alerts.lowStock.length - 3} more` : '';
				showBrowserNotif(
					`⚠️ Low stock — ${alerts.lowStock.length} item${alerts.lowStock.length > 1 ? 's' : ''}`,
					`${names}${more} need restocking`
				);
			}
			if (prefs.pushExpiring && alerts.expiringSoon?.length) {
				const names = alerts.expiringSoon.slice(0, 3).map(i => i.name).join(', ');
				const more  = alerts.expiringSoon.length > 3 ? ` +${alerts.expiringSoon.length - 3} more` : '';
				showBrowserNotif(
					`🕐 Expiring soon — ${alerts.expiringSoon.length} item${alerts.expiringSoon.length > 1 ? 's' : ''}`,
					`${names}${more} expire within 7 days`
				);
			}
		}

		// Auto email — only when alert set changes
		if (prefs.emailEnabled && isNewAlert && alertKey !== lastEmailKey) {
			lastEmailKey = alertKey;
			if (prefs.emailLowStock && alerts.lowStock?.length)
				sendEmail('low_stock').catch(e => console.warn('[notif] auto low-stock email:', e.message));
			if (prefs.emailExpiring && alerts.expiringSoon?.length)
				sendEmail('expiring').catch(e => console.warn('[notif] auto expiry email:', e.message));
		}
	}

	function restartPoll(prefs) {
		clearInterval(pollTimer);
		if (!prefs.pushEnabled && !prefs.emailEnabled) return;
		checkAndFireAlerts(prefs);
		pollTimer = setInterval(() => checkAndFireAlerts(prefs), 5 * 60 * 1000);
	}

	// ── Fetch interceptor — instant check after any stock change ─────────────

	const _origFetch = window.fetch.bind(window);
	const STOCK_RE   = /\/api\/ingredients\/\d+\/stock/;

	window.fetch = async function (input, init) {
		const url = typeof input === 'string' ? input : (input?.url || '');
		const res = await _origFetch(input, init);
		if (STOCK_RE.test(url) && res.ok) {
			res.clone().json().then(() => {
				lastAlertKey = '';
				checkAndFireAlerts(currentPrefs, { forceRecheck: true });
			}).catch(() => {});
		}
		return res;
	};

	// ── UI helpers ────────────────────────────────────────────────────────────

	function q(id) { return document.getElementById(id); }

	function setBanner(msg, type) {
		const el = q('notifStatusBanner');
		if (!el) return;
		el.textContent = msg;
		el.style.display = 'block';
		el.style.background = type === 'error'  ? 'rgba(239,68,68,.1)'  :
		                      type === 'success' ? 'rgba(34,197,94,.1)'  : 'rgba(99,102,241,.1)';
		el.style.color      = type === 'error'  ? '#dc2626'              :
		                      type === 'success' ? '#15803d'              : '#4338ca';
		clearTimeout(el._t);
		el._t = setTimeout(() => el.style.display = 'none', 4500);
	}

	function updatePermUI() {
		const el = q('pushPermStatus');
		if (!el) return;
		const p = permissionStatus();
		if      (p === 'granted')     { el.textContent = '✅ Browser permission granted';               el.style.color = '#15803d'; }
		else if (p === 'denied')      { el.textContent = '🚫 Blocked — allow in browser site settings'; el.style.color = '#dc2626'; }
		else if (p === 'unsupported') { el.textContent = '⚠️ Browser does not support notifications';   el.style.color = '#d97706'; }
		else                          { el.textContent = 'Permission not yet granted — enable the toggle to request'; el.style.color = 'var(--muted,#888)'; }
	}

	function syncSubOptions(prefs) {
		const pushOpts  = q('pushSubOptions');
		const emailOpts = q('emailSubOptions');
		if (pushOpts)  { pushOpts.style.display  = prefs.pushEnabled  ? 'flex' : 'none'; pushOpts.style.flexDirection  = 'column'; }
		if (emailOpts) { emailOpts.style.display = prefs.emailEnabled ? 'flex' : 'none'; emailOpts.style.flexDirection = 'column'; }
	}

	function prefsFromUI() {
		return {
			pushEnabled:   !!q('prefPushNotif')?.checked,
			pushLowStock:  !!q('pushNotifLowStock')?.checked,
			pushExpiring:  !!q('pushNotifExpiring')?.checked,
			emailEnabled:  !!q('prefEmailNotif')?.checked,
			emailLowStock: !!q('emailNotifLowStock')?.checked,
			emailExpiring: !!q('emailNotifExpiring')?.checked,
			emailDigest:   !!q('emailNotifDigest')?.checked,
		};
	}

	function applyPrefsToUI(prefs) {
		if (q('prefPushNotif'))      q('prefPushNotif').checked      = !!prefs.pushEnabled;
		if (q('pushNotifLowStock'))  q('pushNotifLowStock').checked  = prefs.pushLowStock  !== false;
		if (q('pushNotifExpiring'))  q('pushNotifExpiring').checked  = prefs.pushExpiring  !== false;
		if (q('prefEmailNotif'))     q('prefEmailNotif').checked     = !!prefs.emailEnabled;
		if (q('emailNotifLowStock')) q('emailNotifLowStock').checked = prefs.emailLowStock !== false;
		if (q('emailNotifExpiring')) q('emailNotifExpiring').checked = prefs.emailExpiring !== false;
		if (q('emailNotifDigest'))   q('emailNotifDigest').checked   = !!prefs.emailDigest;
		syncSubOptions(prefs);
		updatePermUI();
	}

	// ── Settings UI wiring ────────────────────────────────────────────────────
	// Called every time populateSettings runs (i.e. every time settings tab opens).
	// Uses .onclick assignment instead of addEventListener so there's
	// never a stale duplicate listener — assigning replaces the previous handler.

	async function initNotifSettings() {
		const saveBtn     = q('saveNotifPrefs');
		const pushToggle  = q('prefPushNotif');
		const emailToggle = q('prefEmailNotif');
		if (!saveBtn) return;

		// Always reload from server so toggles always reflect saved state
		currentPrefs = await loadPrefs();
		applyPrefsToUI(currentPrefs);

		// .onchange replaces any previous handler — no duplicate listeners
		if (pushToggle) {
			pushToggle.onchange = async (e) => {
				if (e.target.checked) {
					const perm = await requestPermission();
					updatePermUI();
					if (perm !== 'granted') {
						e.target.checked = false;
						setBanner('Browser permission denied — cannot enable in-app notifications.', 'error');
						return;
					}
				}
				syncSubOptions(prefsFromUI());
			};
		}

		if (emailToggle) {
			emailToggle.onchange = () => syncSubOptions(prefsFromUI());
		}

		saveBtn.onclick = async () => {
			saveBtn.disabled = true;
			saveBtn.textContent = 'Saving…';
			try {
				let prefs = prefsFromUI();
				if (prefs.pushEnabled && permissionStatus() !== 'granted') {
					const perm = await requestPermission();
					updatePermUI();
					if (perm !== 'granted') {
						if (pushToggle) pushToggle.checked = false;
						prefs.pushEnabled = false;
						setBanner('Browser permission denied — push notifications disabled.', 'error');
					}
				}
				await savePrefs(prefs);
				currentPrefs = prefs;
				syncSubOptions(prefs);
				lastAlertKey = '';
				lastEmailKey = '';
				restartPoll(prefs);
				setBanner('Preferences saved!', 'success');
			} catch (err) {
				setBanner(`Save failed: ${err.message}`, 'error');
			} finally {
				saveBtn.disabled = false;
				saveBtn.textContent = 'Save preferences';
			}
		};
	}

	// ── Patch populateSettings ────────────────────────────────────────────────
	// Wraps app.js's populateSettings so initNotifSettings runs after it every time.
	// Safe to call multiple times — _notifPatched flag prevents double-wrapping.

	function patchPopulateSettings() {
		if (window.populateSettings?._notifPatched) return;
		const orig = window.populateSettings;
		if (typeof orig !== 'function') return;
		window.populateSettings = function () {
			orig.apply(this, arguments);
			// app.js just overwrote our checkboxes from localStorage (always false).
			// Re-apply DB prefs on top, then re-wire listeners.
			setTimeout(() => {
				applyPrefsToUI(currentPrefs);
				initNotifSettings();
			}, 0);
		};
		window.populateSettings._notifPatched = true;
	}

	// ── Daily digest ──────────────────────────────────────────────────────────

	async function maybeSendDailyDigest(prefs) {
		if (!prefs.emailEnabled || !prefs.emailDigest) return;
		const today = new Date().toISOString().slice(0, 10);
		const sess  = typeof getSession === 'function' ? getSession() : null;
		if (!sess) return;
		const key = `notif_digest_${sess.username}_${today}`;
		if (localStorage.getItem(key)) return;
		try { await sendEmail('digest'); localStorage.setItem(key, '1'); } catch {}
	}

	// ── Init ──────────────────────────────────────────────────────────────────

	async function init() {
		patchPopulateSettings();

		// Load prefs and start background poll on every page load —
		// this is what keeps notifications alive after refresh without
		// needing the settings tab to be opened.
		const prefs = await loadPrefs();
		currentPrefs = prefs;
		restartPoll(prefs);
		await maybeSendDailyDigest(prefs);

		// If settings view is already visible on load, wire it up immediately
		const section = document.getElementById('view-settings');
		if (section && !section.classList.contains('hidden')) initNotifSettings();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();