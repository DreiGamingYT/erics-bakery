(function () {
	'use strict';

	// ── API ──────────────────────────────────────────────────────────────────

	async function apiFetch(url, opts = {}) {
		const res = await fetch(url, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
		return data;
	}

	async function loadPrefs() {
		try {
			const d = await apiFetch('/api/notifications/prefs');
			return d.prefs || {};
		} catch { return {}; }
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

	// ── Browser Notification permission ──────────────────────────────────────

	function permissionStatus() {
		if (!('Notification' in window)) return 'unsupported';
		return Notification.permission; // 'default' | 'granted' | 'denied'
	}

	async function requestPermission() {
		if (!('Notification' in window)) return 'unsupported';
		if (Notification.permission === 'granted') return 'granted';
		return Notification.requestPermission();
	}

	function showBrowserNotif(title, body, icon = '🍞') {
		if (permissionStatus() !== 'granted') return;
		try { new Notification(title, { body, icon: '/favicon.ico' }); } catch {}
	}

	// ── Check & fire alerts ──────────────────────────────────────────────────

	let lastAlertKey = '';

	async function checkAndFireAlerts(prefs) {
		if (!prefs.pushEnabled) return;
		if (permissionStatus() !== 'granted') return;

		let alerts;
		try { alerts = await fetchAlerts(); } catch { return; }

		const alertKey = JSON.stringify({ l: alerts.lowStock?.map(i => i.id), e: alerts.expiringSoon?.map(i => i.id) });
		if (alertKey === lastAlertKey) return; // already notified for this exact state
		lastAlertKey = alertKey;

		if (prefs.pushLowStock && alerts.lowStock?.length) {
			const names = alerts.lowStock.slice(0, 3).map(i => i.name).join(', ');
			const more = alerts.lowStock.length > 3 ? ` +${alerts.lowStock.length - 3} more` : '';
			showBrowserNotif(
				`⚠️ Low stock — ${alerts.lowStock.length} item${alerts.lowStock.length > 1 ? 's' : ''}`,
				`${names}${more} need restocking`
			);
		}

		if (prefs.pushExpiring && alerts.expiringSoon?.length) {
			const names = alerts.expiringSoon.slice(0, 3).map(i => i.name).join(', ');
			const more = alerts.expiringSoon.length > 3 ? ` +${alerts.expiringSoon.length - 3} more` : '';
			showBrowserNotif(
				`🕐 Expiring soon — ${alerts.expiringSoon.length} item${alerts.expiringSoon.length > 1 ? 's' : ''}`,
				`${names}${more} expire within 7 days`
			);
		}
	}

	// ── UI helpers ────────────────────────────────────────────────────────────

	function q(id) { return document.getElementById(id); }

	function setBanner(msg, type = 'info') {
		const el = q('notifStatusBanner');
		if (!el) return;
		el.textContent = msg;
		el.style.display = 'block';
		el.style.background = type === 'error' ? 'rgba(239,68,68,.1)' : type === 'success' ? 'rgba(34,197,94,.1)' : 'rgba(99,102,241,.1)';
		el.style.color = type === 'error' ? '#dc2626' : type === 'success' ? '#15803d' : '#4338ca';
		clearTimeout(el._timer);
		el._timer = setTimeout(() => { el.style.display = 'none'; }, 4000);
	}

	function updatePermUI(perm) {
		const statusEl = q('pushPermStatus');
		if (!statusEl) return;
		if (perm === 'granted') {
			statusEl.textContent = '✅ Browser permission granted';
			statusEl.style.color = '#15803d';
		} else if (perm === 'denied') {
			statusEl.textContent = '🚫 Blocked — enable in browser site settings';
			statusEl.style.color = '#dc2626';
		} else if (perm === 'unsupported') {
			statusEl.textContent = '⚠️ Browser does not support notifications';
			statusEl.style.color = '#d97706';
		} else {
			statusEl.textContent = 'Permission not yet granted — click the toggle to request';
			statusEl.style.color = 'var(--muted,#888)';
		}
	}

	function syncSubOptions(prefs) {
		const pushOpts = q('pushSubOptions');
		const emailOpts = q('emailSubOptions');
		if (pushOpts) pushOpts.style.display = prefs.pushEnabled ? 'flex' : 'none';
		if (emailOpts) emailOpts.style.display = prefs.emailEnabled ? 'flex' : 'none';
	}

	function prefsFromUI() {
		return {
			pushEnabled:    !!q('prefPushNotif')?.checked,
			pushLowStock:   !!q('pushNotifLowStock')?.checked,
			pushExpiring:   !!q('pushNotifExpiring')?.checked,
			emailEnabled:   !!q('prefEmailNotif')?.checked,
			emailLowStock:  !!q('emailNotifLowStock')?.checked,
			emailExpiring:  !!q('emailNotifExpiring')?.checked,
			emailDigest:    !!q('emailNotifDigest')?.checked,
		};
	}

	function applyPrefsToUI(prefs) {
		if (q('prefPushNotif'))      q('prefPushNotif').checked      = !!prefs.pushEnabled;
		if (q('pushNotifLowStock'))  q('pushNotifLowStock').checked  = prefs.pushLowStock !== false;
		if (q('pushNotifExpiring'))  q('pushNotifExpiring').checked  = prefs.pushExpiring !== false;
		if (q('prefEmailNotif'))     q('prefEmailNotif').checked     = !!prefs.emailEnabled;
		if (q('emailNotifLowStock')) q('emailNotifLowStock').checked = prefs.emailLowStock !== false;
		if (q('emailNotifExpiring')) q('emailNotifExpiring').checked = prefs.emailExpiring !== false;
		if (q('emailNotifDigest'))   q('emailNotifDigest').checked   = !!prefs.emailDigest;
		syncSubOptions(prefs);
		updatePermUI(permissionStatus());
	}

	// ── Wire settings UI ──────────────────────────────────────────────────────

	let currentPrefs = {};
	let pollTimer = null;

	async function initNotifSettings() {
		currentPrefs = await loadPrefs();
		applyPrefsToUI(currentPrefs);

		// Push toggle
		q('prefPushNotif')?.addEventListener('change', async (e) => {
			if (e.target.checked) {
				const perm = await requestPermission();
				updatePermUI(perm);
				if (perm !== 'granted') {
					e.target.checked = false;
					setBanner('Browser permission denied — cannot enable in-app notifications.', 'error');
					return;
				}
			}
			syncSubOptions(prefsFromUI());
		});

		// Email toggle
		q('prefEmailNotif')?.addEventListener('change', () => syncSubOptions(prefsFromUI()));

		// Save button
		q('saveNotifPrefs')?.addEventListener('click', async () => {
			const btn = q('saveNotifPrefs');
			btn.disabled = true;
			btn.textContent = 'Saving…';
			try {
				const prefs = prefsFromUI();

				// If push is being enabled, ensure we have permission
				if (prefs.pushEnabled && permissionStatus() !== 'granted') {
					const perm = await requestPermission();
					updatePermUI(perm);
					if (perm !== 'granted') {
						if (q('prefPushNotif')) q('prefPushNotif').checked = false;
						prefs.pushEnabled = false;
						setBanner('Browser permission denied — push notifications disabled.', 'error');
					}
				}

				await savePrefs(prefs);
				currentPrefs = prefs;
				syncSubOptions(prefs);
				setBanner('Notification preferences saved!', 'success');
				restartPoll(prefs);
			} catch (err) {
				setBanner(`Save failed: ${err.message}`, 'error');
			} finally {
				btn.disabled = false;
				btn.textContent = 'Save notification preferences';
			}
		});

		// Test push
		q('testPushNotif')?.addEventListener('click', async () => {
			const btn = q('testPushNotif');
			btn.disabled = true;
			try {
				const perm = await requestPermission();
				updatePermUI(perm);
				if (perm !== 'granted') {
					setBanner('Browser permission not granted.', 'error');
					return;
				}
				showBrowserNotif("🍞 Test notification", "In-app notifications are working correctly!");
				setBanner('Test notification sent!', 'success');
			} finally {
				btn.disabled = false;
			}
		});

		// Test email
		q('testEmailNotif')?.addEventListener('click', async () => {
			const btn = q('testEmailNotif');
			btn.disabled = true;
			btn.textContent = 'Sending…';
			try {
				const data = await sendEmail('test');
				setBanner(data.sent ? `Test email sent to ${data.to}` : 'Skipped — nothing to report', 'success');
			} catch (err) {
				setBanner(`${err.message}`, 'error');
			} finally {
				btn.disabled = false;
				btn.textContent = 'Test';
			}
		});

		// Start polling if push is already enabled
		restartPoll(currentPrefs);
	}

	// ── Background polling (every 15 min) ────────────────────────────────────

	function restartPoll(prefs) {
		clearInterval(pollTimer);
		if (!prefs.pushEnabled) return;
		// Fire once immediately then every 15 minutes
		checkAndFireAlerts(prefs);
		pollTimer = setInterval(() => checkAndFireAlerts(prefs), 15 * 60 * 1000);
	}

	// ── Email digest trigger (on login, once per day) ─────────────────────────

	async function maybeSendDailyDigest(prefs) {
		if (!prefs.emailEnabled || !prefs.emailDigest) return;
		const today = new Date().toISOString().slice(0, 10);
		const sess = typeof getSession === 'function' ? getSession() : null;
		if (!sess) return;
		const key = `notif_digest_sent_${sess.username}_${today}`;
		if (localStorage.getItem(key)) return; // already sent today
		try {
			await sendEmail('digest');
			localStorage.setItem(key, '1');
		} catch {}
	}

	// ── Watch settings nav ────────────────────────────────────────────────────

	let settingsInited = false;

	function watchSettingsNav() {
		document.addEventListener('click', e => {
			if (e.target.closest('[data-view="settings"]')) {
				setTimeout(() => {
					if (!settingsInited) { settingsInited = true; initNotifSettings(); }
				}, 80);
			}
		});
		const section = document.getElementById('view-settings');
		if (section && window.MutationObserver) {
			new MutationObserver(() => {
				if (!section.classList.contains('hidden') && !settingsInited) {
					settingsInited = true;
					initNotifSettings();
				}
			}).observe(section, { attributes: true, attributeFilter: ['class'] });
		}
	}

	// ── Init on load ──────────────────────────────────────────────────────────

	async function init() {
		watchSettingsNav();

		// If settings already visible on load
		const section = document.getElementById('view-settings');
		if (section && !section.classList.contains('hidden')) {
			settingsInited = true;
			initNotifSettings();
		}

		// On login: load prefs, start polling, maybe send digest
		const prefs = await loadPrefs();
		currentPrefs = prefs;
		restartPoll(prefs);
		await maybeSendDailyDigest(prefs);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();