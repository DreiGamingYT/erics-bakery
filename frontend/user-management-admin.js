(function () {
	'use strict';

	const SESSIONS_KEY = 'bakery_user_sessions_v1';
	const SESSION_ACTIVE_KEY = 'bakery_active_session_ts';

	// ── Storage helpers ──────────────────────────────────────────────────────

	function loadSessionHistory() {
		try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '{}'); } catch { return {}; }
	}

	function saveSessionHistory(obj) {
		try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(obj)); } catch {}
	}

	function recordLogin(username) {
		if (!username) return;
		const now = new Date().toISOString();
		const history = loadSessionHistory();
		if (!Array.isArray(history[username])) history[username] = [];
		history[username].unshift({ login: now, logout: null });
		if (history[username].length > 50) history[username].length = 50; // cap per user
		saveSessionHistory(history);
		localStorage.setItem(SESSION_ACTIVE_KEY, JSON.stringify({ username, login: now }));
	}

	function recordLogout(username) {
		if (!username) return;
		const history = loadSessionHistory();
		if (Array.isArray(history[username]) && history[username].length > 0) {
			const latest = history[username][0];
			if (!latest.logout) latest.logout = new Date().toISOString();
		}
		saveSessionHistory(history);
		localStorage.removeItem(SESSION_ACTIVE_KEY);
	}

	// ── Patch setSession & performLogout ─────────────────────────────────────

	function patchLoginLogout() {
		// Patch setSession to record login timestamp
		const origSetSession = window.setSession;
		if (typeof origSetSession === 'function' && !origSetSession._patched) {
			window.setSession = function (obj, persist) {
				origSetSession.call(this, obj, persist);
				if (obj && obj.username) recordLogin(obj.username);
			};
			window.setSession._patched = true;
		}

		// Patch performLogout to record logout timestamp
		const origLogout = window.performLogout;
		if (typeof origLogout === 'function' && !origLogout._patched) {
			window.performLogout = async function () {
				try {
					const sess = typeof getSession === 'function' ? getSession() : null;
					if (sess && sess.username) recordLogout(sess.username);
				} catch {}
				return origLogout.apply(this, arguments);
			};
			window.performLogout._patched = true;
		}
	}

	// Detect if a session already exists when page loads (e.g. persistent login)
	// and stamp it if there's no active session token recorded yet
	function detectExistingSession() {
		try {
			const getSession = window.getSession;
			if (typeof getSession !== 'function') return;
			const sess = getSession();
			if (!sess || !sess.username) return;
			const active = JSON.parse(localStorage.getItem(SESSION_ACTIVE_KEY) || 'null');
			if (!active || active.username !== sess.username) {
				recordLogin(sess.username);
			}
		} catch {}
	}

	// ── Role check ───────────────────────────────────────────────────────────

	function isAdminOrOwner() {
		try {
			const getSession = window.getSession;
			const sess = typeof getSession === 'function' ? getSession() : null;
			if (!sess) return false;
			const role = String(sess.role || '').toLowerCase();
			return role === 'owner' || role === 'admin';
		} catch { return false; }
	}

	// ── Format helpers ───────────────────────────────────────────────────────

	function fmt(isoStr) {
		if (!isoStr) return '—';
		try {
			return new Date(isoStr).toLocaleString(undefined, {
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		} catch { return isoStr; }
	}

	function timeAgo(isoStr) {
		if (!isoStr) return '';
		try {
			const diff = Date.now() - new Date(isoStr).getTime();
			const mins = Math.floor(diff / 60000);
			if (mins < 1) return 'just now';
			if (mins < 60) return `${mins}m ago`;
			const hrs = Math.floor(mins / 60);
			if (hrs < 24) return `${hrs}h ago`;
			return `${Math.floor(hrs / 24)}d ago`;
		} catch { return ''; }
	}

	function duration(login, logout) {
		if (!login || !logout) return '';
		try {
			const ms = new Date(logout) - new Date(login);
			if (ms < 0) return '';
			const mins = Math.floor(ms / 60000);
			if (mins < 1) return '<1m';
			if (mins < 60) return `${mins}m`;
			return `${Math.floor(mins / 60)}h ${mins % 60}m`;
		} catch { return ''; }
	}

	// ── Inject styles ────────────────────────────────────────────────────────

	function injectStyles() {
		if (document.getElementById('uma-styles')) return;
		const style = document.createElement('style');
		style.id = 'uma-styles';
		style.textContent = `
			#umaPanel { margin-top: 12px; }
			#umaPanel .uma-header {
				display: flex; align-items: center; justify-content: space-between;
				margin-bottom: 10px;
			}
			#umaPanel h3 { margin: 0; font-size: 15px; }
			.uma-badge {
				font-size: 11px; font-weight: 700; padding: 2px 8px;
				border-radius: 999px; background: var(--accent, #1b85ec);
				color: #fff; letter-spacing: 0.03em;
			}
			.uma-user-row {
				background: var(--card, #fff);
				border: 1px solid rgba(0,0,0,0.06);
				border-radius: 10px;
				padding: 10px 12px;
				margin-bottom: 8px;
				transition: box-shadow .15s;
			}
			.uma-user-row:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.07); }
			.uma-user-top {
				display: flex; align-items: center;
				justify-content: space-between; gap: 8px;
			}
			.uma-user-left { display: flex; align-items: center; gap: 10px; }
			.uma-avatar {
				width: 34px; height: 34px; border-radius: 50%;
				background: var(--accent, #1b85ec);
				color: #fff; font-weight: 800; font-size: 14px;
				display: flex; align-items: center; justify-content: center;
				flex-shrink: 0; text-transform: uppercase;
			}
			.uma-username { font-weight: 800; font-size: 14px; }
			.uma-role {
				font-size: 11px; font-weight: 700; padding: 2px 7px;
				border-radius: 999px; display: inline-block; margin-top: 2px;
			}
			.uma-role-owner  { background: rgba(234,179,8,.15);  color: #a16207; }
			.uma-role-admin  { background: rgba(99,102,241,.15); color: #4338ca; }
			.uma-role-baker  { background: rgba(34,197,94,.15);  color: #15803d; }
			.uma-role-assistant { background: rgba(148,163,184,.15); color: #475569; }
			.uma-role-default { background: rgba(0,0,0,.06); color: var(--muted, #888); }
			.uma-status-dot {
				width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
				display: inline-block;
			}
			.uma-status-dot.online  { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.25); }
			.uma-status-dot.offline { background: #94a3b8; }
			.uma-actions { display: flex; gap: 6px; align-items: center; }
			.uma-btn-hist {
				padding: 5px 10px; border-radius: 7px; font-size: 12px; font-weight: 700;
				border: 1px solid rgba(0,0,0,0.1); background: var(--bg, #f5f5f5);
				color: var(--text, #111); cursor: pointer; transition: background .12s;
			}
			.uma-btn-hist:hover { background: var(--card-hover, #eee); }
			.uma-btn-del {
				padding: 5px 10px; border-radius: 7px; font-size: 12px; font-weight: 700;
				border: 1px solid rgba(239,68,68,.2); background: rgba(239,68,68,.07);
				color: #dc2626; cursor: pointer; transition: background .12s;
			}
			.uma-btn-del:hover { background: rgba(239,68,68,.15); }
			.uma-last-seen {
				font-size: 11px; color: var(--muted, #888);
				margin-top: 5px; display: flex; align-items: center; gap: 6px;
			}

			/* History modal */
			#umaModal {
				position: fixed; inset: 0; z-index: 99999;
				background: rgba(0,0,0,.45); backdrop-filter: blur(4px);
				display: flex; align-items: center; justify-content: center;
				padding: 20px;
			}
			#umaModal.hidden { display: none !important; }
			.uma-modal-card {
				background: var(--card, #fff); border-radius: 16px;
				width: 100%; max-width: 520px; max-height: 80vh;
				display: flex; flex-direction: column;
				box-shadow: 0 24px 60px rgba(0,0,0,.18);
				overflow: hidden;
			}
			.uma-modal-head {
				padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,.06);
				display: flex; align-items: center; justify-content: space-between;
				flex-shrink: 0;
			}
			.uma-modal-head h4 { margin: 0; font-size: 15px; }
			.uma-modal-close {
				width: 30px; height: 30px; border-radius: 8px; border: none;
				background: rgba(0,0,0,.06); color: var(--text,#111);
				font-size: 16px; cursor: pointer; display: flex;
				align-items: center; justify-content: center;
			}
			.uma-modal-body { overflow-y: auto; padding: 16px 20px; flex: 1; }
			.uma-hist-row {
				display: grid;
				grid-template-columns: 1fr 1fr auto;
				gap: 6px 12px;
				padding: 8px 10px;
				border-radius: 8px;
				margin-bottom: 6px;
				background: var(--bg, #f9f9f9);
				font-size: 12px;
			}
			.uma-hist-row:nth-child(even) { background: rgba(0,0,0,.025); }
			.uma-hist-label { color: var(--muted, #888); font-size: 11px; font-weight: 700; letter-spacing:.04em; text-transform: uppercase; margin-bottom: 6px; }
			.uma-hist-in  { color: #15803d; font-weight: 700; }
			.uma-hist-out { color: #dc2626; font-weight: 700; }
			.uma-hist-dur { color: var(--muted, #888); font-size: 11px; align-self: center; }
			.uma-no-hist { color: var(--muted, #888); font-size: 13px; text-align: center; padding: 24px 0; }
		`;
		document.head.appendChild(style);
	}

	// ── Build the admin panel ─────────────────────────────────────────────────

	function roleBadgeClass(role) {
		const r = String(role || '').toLowerCase();
		if (r === 'owner') return 'uma-role-owner';
		if (r === 'admin') return 'uma-role-admin';
		if (r === 'baker') return 'uma-role-baker';
		if (r === 'assistant') return 'uma-role-assistant';
		return 'uma-role-default';
	}

	function isCurrentlyOnline(username) {
		try {
			const active = JSON.parse(localStorage.getItem(SESSION_ACTIVE_KEY) || 'null');
			return active && active.username === username;
		} catch { return false; }
	}

	function renderAdminPanel() {
		const container = document.getElementById('usersList');
		if (!container) return;
		if (!isAdminOrOwner()) return;

		const sess = typeof getSession === 'function' ? getSession() : null;
		const currUser = sess?.username || '';

		let loadAccounts;
		try { loadAccounts = window.loadAccounts; } catch {}
		const accounts = (typeof loadAccounts === 'function') ? loadAccounts() : {};
		const history = loadSessionHistory();

		const userKeys = Object.keys(accounts);

		// Build panel wrapper
		let panel = document.getElementById('umaPanel');
		if (!panel) {
			panel = document.createElement('div');
			panel.id = 'umaPanel';
			container.parentElement.insertBefore(panel, container);
			container.style.display = 'none'; // hide the original plain list
		}

		panel.innerHTML = `
			<div class="uma-header">
				<h3>User Management</h3>
				<span class="uma-badge">Owner view</span>
			</div>
			<div id="umaUserList"></div>
		`;

		const listEl = panel.querySelector('#umaUserList');

		if (userKeys.length === 0) {
			listEl.innerHTML = '<div class="muted small">No accounts found.</div>';
			return;
		}

		userKeys.forEach(username => {
			const acc = accounts[username];
			const role = acc.role || 'Baker';
			const userHistory = history[username] || [];
			const lastEntry = userHistory[0] || null;
			const lastLogin = lastEntry ? lastEntry.login : null;
			const online = isCurrentlyOnline(username);
			const isSelf = username === currUser;

			const row = document.createElement('div');
			row.className = 'uma-user-row';

			row.innerHTML = `
				<div class="uma-user-top">
					<div class="uma-user-left">
						<div class="uma-avatar">${username.charAt(0)}</div>
						<div>
							<div class="uma-username">${escHtml(username)}${isSelf ? ' <span style="font-size:11px;font-weight:700;color:var(--muted,#888)">(you)</span>' : ''}</div>
							<span class="uma-role ${roleBadgeClass(role)}">${escHtml(role)}</span>
						</div>
					</div>
					<div class="uma-actions">
						<button class="uma-btn-hist" data-hist="${escHtml(username)}" type="button">
							<i class="fa fa-clock" style="margin-right:4px"></i>History
						</button>
						${!isSelf ? `<button class="uma-btn-del" data-del="${escHtml(username)}" type="button">
							<i class="fa fa-trash" style="margin-right:4px"></i>Delete
						</button>` : ''}
					</div>
				</div>
				<div class="uma-last-seen">
					<span class="uma-status-dot ${online ? 'online' : 'offline'}"></span>
					${online
						? `<span style="color:#15803d;font-weight:700">Online now</span>`
						: lastLogin
							? `Last login: <strong>${fmt(lastLogin)}</strong> <span>(${timeAgo(lastLogin)})</span>`
							: `<span>No login recorded</span>`
					}
					${userHistory.length ? `<span style="margin-left:auto">${userHistory.length} session${userHistory.length !== 1 ? 's' : ''}</span>` : ''}
				</div>
			`;

			// Delete handler
			const delBtn = row.querySelector('[data-del]');
			if (delBtn) {
				delBtn.addEventListener('click', () => {
					const u = delBtn.dataset.del;
					if (!u) return;
					if (!confirm(`Delete account "${u}"? This cannot be undone.`)) return;
					const ac = typeof window.loadAccounts === 'function' ? window.loadAccounts() : {};
					delete ac[u];
					if (typeof window.saveAccounts === 'function') window.saveAccounts(ac);
					const h = loadSessionHistory();
					delete h[u];
					saveSessionHistory(h);
					if (typeof window.notify === 'function') window.notify(`User "${u}" deleted`);
					renderAdminPanel();
				});
			}

			// History handler
			const histBtn = row.querySelector('[data-hist]');
			if (histBtn) {
				histBtn.addEventListener('click', () => openHistoryModal(username, role, history[username] || []));
			}

			listEl.appendChild(row);
		});
	}

	// ── History modal ────────────────────────────────────────────────────────

	function openHistoryModal(username, role, entries) {
		let modal = document.getElementById('umaModal');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'umaModal';
			modal.className = 'hidden';
			modal.innerHTML = `
				<div class="uma-modal-card">
					<div class="uma-modal-head">
						<h4 id="umaModalTitle"></h4>
						<button class="uma-modal-close" id="umaModalClose" type="button">✕</button>
					</div>
					<div class="uma-modal-body" id="umaModalBody"></div>
				</div>
			`;
			document.body.appendChild(modal);
			document.getElementById('umaModalClose').addEventListener('click', () => modal.classList.add('hidden'));
			modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
		}

		document.getElementById('umaModalTitle').textContent = `Login history — ${username} (${role})`;

		const body = document.getElementById('umaModalBody');
		if (!entries || entries.length === 0) {
			body.innerHTML = '<div class="uma-no-hist"><i class="fa fa-clock-rotate-left" style="font-size:24px;opacity:.3;display:block;margin-bottom:8px"></i>No sessions recorded yet.</div>';
		} else {
			body.innerHTML = `
				<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:4px 12px;margin-bottom:10px">
					<div class="uma-hist-label">Login</div>
					<div class="uma-hist-label">Logout</div>
					<div class="uma-hist-label">Duration</div>
				</div>
				${entries.map(e => `
					<div class="uma-hist-row">
						<div class="uma-hist-in"><i class="fa fa-arrow-right-to-bracket" style="margin-right:4px;font-size:10px"></i>${fmt(e.login)}</div>
						<div class="uma-hist-out">${e.logout ? `<i class="fa fa-arrow-right-from-bracket" style="margin-right:4px;font-size:10px"></i>${fmt(e.logout)}` : '<span style="color:var(--muted,#888)">Still active / not recorded</span>'}</div>
						<div class="uma-hist-dur">${duration(e.login, e.logout)}</div>
					</div>
				`).join('')}
			`;
		}

		modal.classList.remove('hidden');
	}

	// ── Tiny HTML escape ──────────────────────────────────────────────────────

	function escHtml(str) {
		return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	}

	// ── Hook into settings tab navigation ────────────────────────────────────

	function watchSettingsNav() {
		// Re-render whenever the settings view becomes visible (tab switch)
		document.addEventListener('click', (e) => {
			const target = e.target.closest('[data-view="settings"]');
			if (target) setTimeout(tryRender, 80);
		});

		// Also observe class changes on the settings section in case it's toggled programmatically
		const settingsSection = document.getElementById('view-settings');
		if (settingsSection && window.MutationObserver) {
			new MutationObserver(() => {
				if (!settingsSection.classList.contains('hidden')) tryRender();
			}).observe(settingsSection, { attributes: true, attributeFilter: ['class'] });
		}
	}

	function tryRender() {
		if (!isAdminOrOwner()) return;
		injectStyles();
		renderAdminPanel();
	}

	// ── Init ─────────────────────────────────────────────────────────────────

	function init() {
		patchLoginLogout();
		detectExistingSession();
		watchSettingsNav();

		// Initial render if already on settings view
		const settingsSection = document.getElementById('view-settings');
		if (settingsSection && !settingsSection.classList.contains('hidden')) {
			tryRender();
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();