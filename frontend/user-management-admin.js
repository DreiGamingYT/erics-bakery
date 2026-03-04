(function () {
	'use strict';

	// ── API helpers ──────────────────────────────────────────────────────────

	async function apiFetch(url, opts = {}) {
		const res = await fetch(url, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
		return data;
	}

	async function fetchUsers() {
		const data = await apiFetch('/api/admin/users');
		return data.users || [];
	}

	async function fetchSessions(userId) {
		const data = await apiFetch(`/api/admin/users/${userId}/sessions`);
		return data.sessions || [];
	}

	async function deleteUser(userId) {
		return apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
	}

	// ── Role check ───────────────────────────────────────────────────────────

	function isAdminOrOwner() {
		try {
			const sess = typeof getSession === 'function' ? getSession() : null;
			if (!sess) return false;
			const r = String(sess.role || '').toLowerCase();
			return r === 'owner' || r === 'admin';
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

	function escHtml(str) {
		return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	}

	// ── Styles ───────────────────────────────────────────────────────────────

	function injectStyles() {
		if (document.getElementById('uma-styles')) return;
		const s = document.createElement('style');
		s.id = 'uma-styles';
		s.textContent = `
			#umaPanel { margin-top: 0; }
			.uma-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
			.uma-header h3 { margin:0; font-size:15px; }
			.uma-owner-badge { font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; background:var(--accent,#1b85ec); color:#fff; letter-spacing:.03em; }
			.uma-user-row { background:var(--card,#fff); border:1px solid rgba(0,0,0,.06); border-radius:10px; padding:10px 12px; margin-bottom:8px; transition:box-shadow .15s; }
			.uma-user-row:hover { box-shadow:0 4px 14px rgba(0,0,0,.07); }
			.uma-user-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
			.uma-user-left { display:flex; align-items:center; gap:10px; }
			.uma-avatar { width:34px; height:34px; border-radius:50%; background:var(--accent,#1b85ec); color:#fff; font-weight:800; font-size:14px; text-transform:uppercase; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
			.uma-username { font-weight:800; font-size:14px; }
			.uma-role { font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px; display:inline-block; margin-top:2px; }
			.uma-role-owner     { background:rgba(234,179,8,.15);  color:#a16207; }
			.uma-role-admin     { background:rgba(99,102,241,.15); color:#4338ca; }
			.uma-role-baker     { background:rgba(34,197,94,.15);  color:#15803d; }
			.uma-role-assistant { background:rgba(148,163,184,.15);color:#475569; }
			.uma-role-default   { background:rgba(0,0,0,.06);      color:var(--muted,#888); }
			.uma-actions { display:flex; gap:6px; align-items:center; }
			.uma-btn-hist { padding:5px 10px; border-radius:7px; font-size:12px; font-weight:700; border:1px solid rgba(0,0,0,.1); background:var(--bg,#f5f5f5); color:var(--text,#111); cursor:pointer; transition:background .12s; }
			.uma-btn-hist:hover { background:var(--card-hover,#eee); }
			.uma-btn-del { padding:5px 10px; border-radius:7px; font-size:12px; font-weight:700; border:1px solid rgba(239,68,68,.2); background:rgba(239,68,68,.07); color:#dc2626; cursor:pointer; transition:background .12s; }
			.uma-btn-del:hover { background:rgba(239,68,68,.15); }
			.uma-btn-del:disabled { opacity:.5; cursor:not-allowed; }
			.uma-meta { font-size:11px; color:var(--muted,#888); margin-top:5px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
			#umaModal { position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.45); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
			#umaModal.hidden { display:none !important; }
			.uma-modal-card { background:var(--card,#fff); border-radius:16px; width:100%; max-width:540px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(0,0,0,.18); overflow:hidden; }
			.uma-modal-head { padding:16px 20px; border-bottom:1px solid rgba(0,0,0,.06); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
			.uma-modal-head h4 { margin:0; font-size:15px; }
			.uma-modal-close { width:30px; height:30px; border-radius:8px; border:none; background:rgba(0,0,0,.06); color:var(--text,#111); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
			.uma-modal-body { overflow-y:auto; padding:16px 20px; flex:1; }
			.uma-hist-grid { display:grid; grid-template-columns:1fr 1fr auto; gap:4px 12px; margin-bottom:8px; }
			.uma-hist-label { color:var(--muted,#888); font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
			.uma-hist-row { display:grid; grid-template-columns:1fr 1fr auto; gap:4px 12px; padding:8px 10px; border-radius:8px; margin-bottom:6px; background:var(--bg,#f9f9f9); font-size:12px; }
			.uma-hist-row:nth-child(even) { background:rgba(0,0,0,.025); }
			.uma-hist-in  { color:#15803d; font-weight:700; }
			.uma-hist-out { color:#dc2626; font-weight:700; }
			.uma-hist-dur { color:var(--muted,#888); font-size:11px; align-self:center; white-space:nowrap; }
            .uma-hist-meta { grid-column:1/-1; display:flex; gap:12px; flex-wrap:wrap; padding-top:2px; border-top:1px solid rgba(0,0,0,.04); margin-top:2px; }
			.uma-hist-meta span { color:var(--muted,#888); font-size:10px; display:flex; align-items:center; gap:4px; }
			.uma-no-hist  { color:var(--muted,#888); font-size:13px; text-align:center; padding:28px 0; }
			.uma-loading  { color:var(--muted,#888); font-size:13px; text-align:center; padding:20px 0; }
			#umaDeleteModal { position:fixed; inset:0; z-index:100000; background:rgba(0,0,0,.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
			#umaDeleteModal.hidden { display:none !important; }
			.uma-del-card { background:var(--card,#fff); border-radius:16px; width:100%; max-width:380px; box-shadow:0 24px 60px rgba(0,0,0,.2); overflow:hidden; }
			.uma-del-icon { width:52px; height:52px; border-radius:50%; background:rgba(239,68,68,.1); display:flex; align-items:center; justify-content:center; margin:28px auto 0; font-size:22px; color:#dc2626; }
			.uma-del-body { padding:16px 24px 24px; text-align:center; }
			.uma-del-body h4 { margin:12px 0 6px; font-size:16px; }
			.uma-del-body p { margin:0 0 20px; font-size:13px; color:var(--muted,#888); line-height:1.5; }
			.uma-del-user { font-weight:800; color:var(--text,#111); }
			.uma-del-actions { display:flex; gap:8px; }
			.uma-del-cancel { flex:1; padding:9px; border-radius:9px; border:1px solid rgba(0,0,0,.1); background:var(--bg,#f5f5f5); color:var(--text,#111); font-size:13px; font-weight:700; cursor:pointer; transition:background .12s; }
			.uma-del-cancel:hover { background:var(--card-hover,#eee); }
			.uma-del-confirm { flex:1; padding:9px; border-radius:9px; border:none; background:#dc2626; color:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:background .12s; }
			.uma-del-confirm:hover { background:#b91c1c; }
			.uma-del-confirm:disabled { opacity:.6; cursor:not-allowed; }
		`;
		document.head.appendChild(s);
	}

	function roleCls(role) {
		const r = String(role || '').toLowerCase();
		if (r === 'owner') return 'uma-role-owner';
		if (r === 'admin') return 'uma-role-admin';
		if (r === 'baker') return 'uma-role-baker';
		if (r === 'assistant') return 'uma-role-assistant';
		return 'uma-role-default';
	}

    function updateUsersNav() {
    const navBtn = document.querySelector('[data-view="users"]');
    if (!navBtn) return;
        try {
            // show only if current session is owner or admin
            if (isAdminOrOwner()) {
            navBtn.style.display = '';
            navBtn.removeAttribute('aria-hidden');
            } else {
            navBtn.style.display = 'none';
            navBtn.setAttribute('aria-hidden', 'true');
            }
        } catch (e) {
            navBtn.style.display = 'none';
            navBtn.setAttribute('aria-hidden', 'true');
        }
    }

	// ── Render panel ──────────────────────────────────────────────────────────

	async function renderAdminPanel() {
		// prefer the new usersPanel container, fall back to old usersList for backwards compatibility
		const container = document.getElementById('usersPanel') || document.getElementById('usersList');
		if (!container) return;
		if (!isAdminOrOwner()) { container.style.display = ''; return; }

		injectStyles();

		let panel = document.getElementById('umaPanel');
		if (!panel) {
			panel = document.createElement('div');
			panel.id = 'umaPanel';
			// if the container has a parent, insert into it; otherwise append to body
			if (container.parentElement) {
				container.parentElement.insertBefore(panel, container);
				container.style.display = 'none';
			} else {
				document.body.appendChild(panel);
			}
		}

		panel.innerHTML = `
			<div class="uma-header">
				<h3 style="margin:0 0 8px 0">User Management</h3>
				<span class="uma-owner-badge">Owner view</span>
			</div>
			<div class="uma-loading"><i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Loading accounts…</div>
		`;

		let users;
		try {
			users = await fetchUsers();
		} catch (err) {
			panel.querySelector('.uma-loading').innerHTML =
				`<span style="color:#dc2626"><i class="fa fa-triangle-exclamation" style="margin-right:6px"></i>Could not load users: ${escHtml(err.message)}</span>`;
			return;
		}

		const sess = typeof getSession === 'function' ? getSession() : null;
		const currId = sess ? Number(sess.id) : null;

		const listEl = document.createElement('div');

		if (!users.length) {
			listEl.innerHTML = '<div class="muted small">No accounts found.</div>';
		}

		users.forEach(user => {
			const isSelf = currId && Number(user.id) === currId;
			const row = document.createElement('div');
			row.className = 'uma-user-row';
			row.innerHTML = `
				<div class="uma-user-top">
					<div class="uma-user-left">
						<div class="uma-avatar">${escHtml((user.username || '?').charAt(0))}</div>
						<div>
							<div class="uma-username">
								${escHtml(user.name || user.username)}
								${user.name && user.name !== user.username ? `<span style="font-weight:500;color:var(--muted,#888);font-size:12px"> @${escHtml(user.username)}</span>` : ''}
								${isSelf ? `<span style="font-size:11px;font-weight:700;color:var(--muted,#888)"> (you)</span>` : ''}
							</div>
							<span class="uma-role ${roleCls(user.role)}">${escHtml(user.role)}</span>
						</div>
					</div>
					<div class="uma-actions">
						<button class="uma-btn-hist" type="button"><i class="fa fa-clock" style="margin-right:4px"></i>History</button>
						${!isSelf ? `<button class="uma-btn-del" type="button"><i class="fa fa-trash" style="margin-right:4px"></i>Delete</button>` : ''}
					</div>
				</div>
				<div class="uma-meta">
					${user.email ? `<span><i class="fa fa-envelope" style="margin-right:4px;font-size:10px"></i>${escHtml(user.email)}</span>` : ''}
					${user.phone ? `<span><i class="fa fa-phone" style="margin-right:4px;font-size:10px"></i>${escHtml(user.phone)}</span>` : ''}
					${user.created_at ? `<span>Joined ${fmt(user.created_at)}</span>` : ''}
				</div>
			`;

			row.querySelector('.uma-btn-hist').addEventListener('click', () => openHistoryModal(user));

			const delBtn = row.querySelector('.uma-btn-del');
			if (delBtn) {
				delBtn.addEventListener('click', () => {
					openDeleteModal(user, row, delBtn);
				});
			}

			listEl.appendChild(row);
		});

		panel.innerHTML = `
			<div class="uma-header">
				<h3 style="margin:0 0 8px 0">User Management</h3>
				<span class="uma-owner-badge">${users.length} account${users.length !== 1 ? 's' : ''}</span>
			</div>
		`;
		panel.appendChild(listEl);
	}

	// ── Delete confirmation modal ────────────────────────────────────────────

	function openDeleteModal(user, row, triggerBtn) {
		let modal = document.getElementById('umaDeleteModal');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'umaDeleteModal';
			modal.className = 'hidden';
			modal.innerHTML = `
				<div class="uma-del-card">
					<div class="uma-del-icon"><i class="fa fa-trash"></i></div>
					<div class="uma-del-body">
						<h4>Delete account?</h4>
						<p id="umaDelMsg"></p>
						<div class="uma-del-actions">
							<button class="uma-del-cancel" id="umaDelCancel" type="button">Cancel</button>
							<button class="uma-del-confirm" id="umaDelConfirm" type="button">Delete</button>
						</div>
					</div>
				</div>
			`;
			document.body.appendChild(modal);
			document.getElementById('umaDelCancel').addEventListener('click', () => modal.classList.add('hidden'));
			modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
		}

		document.getElementById('umaDelMsg').innerHTML =
			`This will permanently delete <span class="uma-del-user">@${escHtml(user.username)}</span>${user.name && user.name !== user.username ? ` (${escHtml(user.name)})` : ''}.<br>This action cannot be undone.`;

		const confirmBtn = document.getElementById('umaDelConfirm');
		// Clone to remove old event listeners
		const freshBtn = confirmBtn.cloneNode(true);
		confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);

		modal.classList.remove('hidden');
		setTimeout(() => freshBtn.focus(), 50);

		freshBtn.addEventListener('click', async () => {
			freshBtn.disabled = true;
			freshBtn.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Deleting…';
			try {
				await deleteUser(user.id);
				modal.classList.add('hidden');
				if (typeof window.notify === 'function') window.notify(`User "${user.username}" deleted`);
				row.remove();
			} catch (err) {
				modal.classList.add('hidden');
				if (typeof window.notify === 'function') window.notify(`Delete failed: ${err.message}`);
				triggerBtn.disabled = false;
				triggerBtn.innerHTML = '<i class="fa fa-trash" style="margin-right:4px"></i>Delete';
			}
		});
	}

	// ── UA parser (minimal) ──────────────────────────────────────────────────

	function parseUA(ua) {
		if (!ua) return '';
		if (/mobile|android|iphone|ipad/i.test(ua)) {
			if (/iphone/i.test(ua)) return 'iPhone';
			if (/ipad/i.test(ua)) return 'iPad';
			if (/android/i.test(ua)) return 'Android';
			return 'Mobile';
		}
		if (/windows/i.test(ua)) return 'Windows';
		if (/macintosh|mac os/i.test(ua)) return 'Mac';
		if (/linux/i.test(ua)) return 'Linux';
		return 'Desktop';
	}

	// ── History modal ─────────────────────────────────────────────────────────

	function openHistoryModal(user) {
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
			modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
		}

		document.getElementById('umaModalTitle').textContent =
			`Login history — ${user.name || user.username} (${user.role})`;

		const body = document.getElementById('umaModalBody');
		body.innerHTML = '<div class="uma-loading"><i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Loading sessions…</div>';
		modal.classList.remove('hidden');

		fetchSessions(user.id).then(sessions => {
			if (!sessions.length) {
				body.innerHTML = `<div class="uma-no-hist"><i class="fa fa-clock-rotate-left" style="font-size:26px;opacity:.3;display:block;margin-bottom:10px"></i>No login sessions recorded yet.</div>`;
				return;
			}
			body.innerHTML = `
				<div class="uma-hist-grid">
					<div class="uma-hist-label">Login</div>
					<div class="uma-hist-label">Logout</div>
					<div class="uma-hist-label">Duration</div>
				</div>
				${sessions.map(s => `
					<div class="uma-hist-row">
						<div class="uma-hist-in">
							<i class="fa fa-arrow-right-to-bracket" style="margin-right:4px;font-size:10px"></i>${fmt(s.login)}
							<br><span style="font-weight:400;color:var(--muted,#888);font-size:10px">${timeAgo(s.login)}</span>
						</div>
						<div class="uma-hist-out">
							${s.logout
								? `<i class="fa fa-arrow-right-from-bracket" style="margin-right:4px;font-size:10px"></i>${fmt(s.logout)}`
								: `<span style="color:#15803d;font-weight:700"><i class="fa fa-circle" style="font-size:7px;margin-right:4px"></i>Active now</span>`}
						</div>
						<div class="uma-hist-dur">${duration(s.login, s.logout) || (s.logout ? '—' : 'ongoing')}</div>
						${(s.ip_address || s.user_agent) ? `
						<div class="uma-hist-meta">
							${s.ip_address ? `<span><i class="fa fa-location-dot"></i> ${escHtml(s.ip_address)}</span>` : ''}
							${s.user_agent ? `<span><i class="fa fa-display"></i> ${escHtml(parseUA(s.user_agent))}</span>` : ''}
						</div>` : ''}
					</div>
				`).join('')}
			`;
		}).catch(err => {
			body.innerHTML = `<div class="uma-no-hist" style="color:#dc2626">Failed to load sessions: ${escHtml(err.message)}</div>`;
		});
	}

	// ── Watch nav/view ────────────────────────────────────────────────────────

	function watchNav() {
		// render when user clicks the Users nav-item
		document.addEventListener('click', e => {
			if (e.target.closest('[data-view="users"]')) setTimeout(tryRender, 100);
		});
		// watch the view-users section for visibility changes
		const section = document.getElementById('view-users');
		if (section && window.MutationObserver) {
			new MutationObserver(() => {
				if (!section.classList.contains('hidden')) tryRender();
			}).observe(section, { attributes: true, attributeFilter: ['class'] });
		}
	}

	function tryRender() {
		if (!isAdminOrOwner()) return;
		renderAdminPanel();
	}

	function init() {
  watchNav();

  // existing render logic (keeps current behaviour)
  const section = document.getElementById('view-users');
  if (section && !section.classList.contains('hidden')) tryRender();
  const existingPanel = document.getElementById('usersPanel') || document.getElementById('usersList');
  if (existingPanel && !existingPanel.closest('.hidden')) tryRender();

  // run once now to hide/show the Users nav item
  updateUsersNav();

  // keep it responsive to SPA-style auth changes:
  // If your app changes session without page reload, dispatch `window.dispatchEvent(new Event('sessionchange'))`
  // after login/logout to force UI update.
  window.addEventListener('sessionchange', updateUsersNav);

  // also ensure after DOMContentLoaded it runs (defensive)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateUsersNav);
  } else {
    setTimeout(updateUsersNav, 0);
  }
}}
)();