(function () {
	'use strict';

	// ── API helpers ──────────────────────────────────────────────────────────

	async function apiFetch(url, opts = {}) {
		const res = await fetch(url, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
		return data;
	}

	async function fetchUsers() { return (await apiFetch('/api/admin/users')).users || []; }
	async function fetchSessions(id) { return (await apiFetch(`/api/admin/users/${id}/sessions`)).sessions || []; }
	async function deleteUser(id) { return apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }); }

	// ── Role helpers ─────────────────────────────────────────────────────────

	function isOwnerOrAdmin() {
		try {
			const s = typeof getSession === 'function' ? getSession() : null;
			if (!s) return false;
			return ['owner','admin'].includes(String(s.role||'').toLowerCase());
		} catch { return false; }
	}

	function getCurrentUserId() {
		try {
			const s = typeof getSession === 'function' ? getSession() : null;
			return s ? Number(s.id) : null;
		} catch { return null; }
	}

	// ── Format helpers ───────────────────────────────────────────────────────

	function fmt(iso) {
		if (!iso) return '—';
		return new Date(iso).toLocaleString(undefined, { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
	}
	function timeAgo(iso) {
		if (!iso) return '';
		const m = Math.floor((Date.now() - new Date(iso)) / 60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m/60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h/24)}d ago`;
	}
	function dur(a, b) {
		if (!a || !b) return '';
		const m = Math.floor((new Date(b)-new Date(a))/60000);
		if (m < 1) return '<1m';
		if (m < 60) return `${m}m`;
		return `${Math.floor(m/60)}h ${m%60}m`;
	}
	function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

	function roleCls(role) {
		const r = String(role||'').toLowerCase();
		return r==='owner'?'uma-role-owner':r==='admin'?'uma-role-admin':r==='baker'?'uma-role-baker':r==='assistant'?'uma-role-assistant':'uma-role-default';
	}

	// ── Styles ───────────────────────────────────────────────────────────────

	function injectStyles() {
		if (document.getElementById('uma-styles')) return;
		const s = document.createElement('style');
		s.id = 'uma-styles';
		s.textContent = `
			.uma-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
			.uma-user-row { background:var(--card,#fff); border:1px solid rgba(0,0,0,.06); border-radius:12px; padding:14px 16px; transition:box-shadow .15s; }
			.uma-user-row:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
			.uma-user-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
			.uma-user-left { display:flex; align-items:center; gap:10px; }
			.uma-avatar { width:38px; height:38px; border-radius:50%; background:var(--accent,#1b85ec); color:#fff; font-weight:800; font-size:15px; text-transform:uppercase; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
			.uma-username { font-weight:800; font-size:14px; }
			.uma-role { font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px; display:inline-block; margin-top:3px; }
			.uma-role-owner     { background:rgba(234,179,8,.15);  color:#a16207; }
			.uma-role-admin     { background:rgba(99,102,241,.15); color:#4338ca; }
			.uma-role-baker     { background:rgba(34,197,94,.15);  color:#15803d; }
			.uma-role-assistant { background:rgba(148,163,184,.15);color:#475569; }
			.uma-role-default   { background:rgba(0,0,0,.06);      color:var(--muted,#888); }
			.uma-actions { display:flex; gap:6px; align-items:center; flex-shrink:0; }
			.uma-btn-hist { padding:5px 10px; border-radius:7px; font-size:12px; font-weight:700; border:1px solid rgba(0,0,0,.1); background:var(--bg,#f5f5f5); color:var(--text,#111); cursor:pointer; }
			.uma-btn-hist:hover { background:var(--card-hover,#eee); }
			.uma-btn-del { padding:5px 10px; border-radius:7px; font-size:12px; font-weight:700; border:1px solid rgba(239,68,68,.2); background:rgba(239,68,68,.07); color:#dc2626; cursor:pointer; }
			.uma-btn-del:hover { background:rgba(239,68,68,.15); }
			.uma-btn-del:disabled { opacity:.5; cursor:not-allowed; }
			.uma-meta { font-size:11px; color:var(--muted,#888); margin-top:6px; display:flex; gap:8px; flex-wrap:wrap; }
			.uma-loading { color:var(--muted,#888); font-size:13px; padding:32px 0; text-align:center; }

			/* Delete modal */
			#umaDeleteModal { position:fixed; inset:0; z-index:100000; background:rgba(0,0,0,.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
			#umaDeleteModal.hidden { display:none !important; }
			.uma-del-card { background:var(--card,#fff); border-radius:16px; width:100%; max-width:380px; box-shadow:0 24px 60px rgba(0,0,0,.2); overflow:hidden; }
			.uma-del-icon { width:52px; height:52px; border-radius:50%; background:rgba(239,68,68,.1); display:flex; align-items:center; justify-content:center; margin:28px auto 0; font-size:22px; color:#dc2626; }
			.uma-del-body { padding:16px 24px 24px; text-align:center; }
			.uma-del-body h4 { margin:12px 0 6px; font-size:16px; }
			.uma-del-body p { margin:0 0 20px; font-size:13px; color:var(--muted,#888); line-height:1.5; }
			.uma-del-user { font-weight:800; color:var(--text,#111); }
			.uma-del-actions { display:flex; gap:8px; }
			.uma-del-cancel { flex:1; padding:9px; border-radius:9px; border:1px solid rgba(0,0,0,.1); background:var(--bg,#f5f5f5); color:var(--text,#111); font-size:13px; font-weight:700; cursor:pointer; }
			.uma-del-confirm { flex:1; padding:9px; border-radius:9px; border:none; background:#dc2626; color:#fff; font-size:13px; font-weight:700; cursor:pointer; }
			.uma-del-confirm:hover { background:#b91c1c; }
			.uma-del-confirm:disabled { opacity:.6; cursor:not-allowed; }

			/* History modal */
			#umaModal { position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.45); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
			#umaModal.hidden { display:none !important; }
			.uma-modal-card { background:var(--card,#fff); border-radius:16px; width:100%; max-width:540px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(0,0,0,.18); overflow:hidden; }
			.uma-modal-head { padding:16px 20px; border-bottom:1px solid rgba(0,0,0,.06); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
			.uma-modal-head h4 { margin:0; font-size:15px; }
			.uma-modal-close { width:30px; height:30px; border-radius:8px; border:none; background:rgba(0,0,0,.06); color:var(--text,#111); font-size:16px; cursor:pointer; }
			.uma-modal-body { overflow-y:auto; padding:16px 20px; flex:1; }
			.uma-hist-grid { display:grid; grid-template-columns:1fr 1fr auto; gap:4px 12px; margin-bottom:8px; }
			.uma-hist-label { color:var(--muted,#888); font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
			.uma-hist-row { display:grid; grid-template-columns:1fr 1fr auto; gap:6px 12px; padding:8px 10px; border-radius:8px; margin-bottom:6px; background:var(--bg,#f9f9f9); font-size:12px; }
			.uma-hist-in  { color:#15803d; font-weight:700; }
			.uma-hist-out { color:#dc2626; font-weight:700; }
			.uma-hist-dur { color:var(--muted,#888); font-size:11px; align-self:center; white-space:nowrap; }
			.uma-no-hist  { color:var(--muted,#888); font-size:13px; text-align:center; padding:28px 0; }
		`;
		document.head.appendChild(s);
	}

	// ── Render the user grid ─────────────────────────────────────────────────

	let rendered = false;

	async function renderUsersView() {
		const container = document.getElementById('umaViewContainer');
		if (!container) return;

		injectStyles();
		container.innerHTML = `<div class="uma-loading"><i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Loading accounts…</div>`;

		let users;
		try { users = await fetchUsers(); }
		catch (err) {
			container.innerHTML = `<div class="uma-loading" style="color:#dc2626"><i class="fa fa-triangle-exclamation" style="margin-right:6px"></i>Could not load users: ${esc(err.message)}</div>`;
			return;
		}

		const currId = getCurrentUserId();
		const grid = document.createElement('div');
		grid.className = 'uma-grid';

		users.forEach(user => {
			const isSelf = currId && Number(user.id) === currId;
			const row = document.createElement('div');
			row.className = 'uma-user-row';
			row.innerHTML = `
				<div class="uma-user-top">
					<div class="uma-user-left">
						<div class="uma-avatar">${esc((user.username||'?').charAt(0))}</div>
						<div>
							<div class="uma-username">
								${esc(user.name || user.username)}
								${user.name && user.name !== user.username ? `<span style="font-weight:500;color:var(--muted,#888);font-size:12px"> @${esc(user.username)}</span>` : ''}
								${isSelf ? `<span style="font-size:11px;color:var(--muted,#888)"> (you)</span>` : ''}
							</div>
							<span class="uma-role ${roleCls(user.role)}">${esc(user.role)}</span>
						</div>
					</div>
					<div class="uma-actions">
						<button class="uma-btn-hist" type="button"><i class="fa fa-clock" style="margin-right:4px"></i>History</button>
						${!isSelf ? `<button class="uma-btn-del" type="button"><i class="fa fa-trash" style="margin-right:4px"></i>Delete</button>` : ''}
					</div>
				</div>
				<div class="uma-meta">
					${user.email ? `<span><i class="fa fa-envelope" style="margin-right:4px;font-size:10px"></i>${esc(user.email)}</span>` : ''}
					${user.phone ? `<span><i class="fa fa-phone" style="margin-right:4px;font-size:10px"></i>${esc(user.phone)}</span>` : ''}
					${user.created_at ? `<span>Joined ${fmt(user.created_at)}</span>` : ''}
				</div>`;

			row.querySelector('.uma-btn-hist').onclick = () => openHistoryModal(user);

			const delBtn = row.querySelector('.uma-btn-del');
			if (delBtn) delBtn.onclick = () => openDeleteModal(user, row, delBtn);

			grid.appendChild(row);
		});

		container.innerHTML = `<p class="muted small" style="margin:0 0 14px 0">${users.length} account${users.length !== 1 ? 's' : ''}</p>`;
		container.appendChild(grid);
		rendered = true;
	}

	// ── Delete modal ─────────────────────────────────────────────────────────

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
				</div>`;
			document.body.appendChild(modal);
			document.getElementById('umaDelCancel').onclick = () => modal.classList.add('hidden');
			modal.onclick = e => { if (e.target === modal) modal.classList.add('hidden'); };
		}

		document.getElementById('umaDelMsg').innerHTML =
			`This will permanently delete <span class="uma-del-user">@${esc(user.username)}</span>${user.name && user.name !== user.username ? ` (${esc(user.name)})` : ''}.<br>This action cannot be undone.`;

		const old = document.getElementById('umaDelConfirm');
		const btn = old.cloneNode(true);
		old.parentNode.replaceChild(btn, old);
		modal.classList.remove('hidden');
		setTimeout(() => btn.focus(), 50);

		btn.onclick = async () => {
			btn.disabled = true;
			btn.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Deleting…';
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
		};
	}

	// ── History modal ────────────────────────────────────────────────────────

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
				</div>`;
			document.body.appendChild(modal);
			document.getElementById('umaModalClose').onclick = () => modal.classList.add('hidden');
			modal.onclick = e => { if (e.target === modal) modal.classList.add('hidden'); };
		}

		document.getElementById('umaModalTitle').textContent = `Login history — ${user.name || user.username} (${user.role})`;
		const body = document.getElementById('umaModalBody');
		body.innerHTML = '<div class="uma-loading"><i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Loading…</div>';
		modal.classList.remove('hidden');

		fetchSessions(user.id).then(sessions => {
			if (!sessions.length) {
				body.innerHTML = `<div class="uma-no-hist"><i class="fa fa-clock-rotate-left" style="font-size:26px;opacity:.3;display:block;margin-bottom:10px"></i>No sessions recorded yet.</div>`;
				return;
			}
			body.innerHTML = `
				<div class="uma-hist-grid"><div class="uma-hist-label">Login</div><div class="uma-hist-label">Logout</div><div class="uma-hist-label">Duration</div></div>
				${sessions.map(s => `
					<div class="uma-hist-row">
						<div class="uma-hist-in"><i class="fa fa-arrow-right-to-bracket" style="margin-right:4px;font-size:10px"></i>${fmt(s.login)}<br><span style="font-weight:400;color:var(--muted,#888);font-size:10px">${timeAgo(s.login)}</span></div>
						<div class="uma-hist-out">${s.logout ? `<i class="fa fa-arrow-right-from-bracket" style="margin-right:4px;font-size:10px"></i>${fmt(s.logout)}` : `<span style="color:var(--muted,#888);font-weight:400">Still active</span>`}</div>
						<div class="uma-hist-dur">${dur(s.login, s.logout) || '—'}</div>
					</div>`).join('')}`;
		}).catch(err => {
			body.innerHTML = `<div class="uma-no-hist" style="color:#dc2626">Failed: ${esc(err.message)}</div>`;
		});
	}

	// ── Nav + view wiring ────────────────────────────────────────────────────

	function init() {
		if (!isOwnerOrAdmin()) return;

		// Show the Users nav button
		const navBtn = document.getElementById('navUsers');
		if (navBtn) navBtn.style.display = '';

		// Inject 'users' into app.js's views array so showView() hides all other
		// sections correctly when navigating to Users
		if (typeof views !== 'undefined' && Array.isArray(views) && !views.includes('users')) {
			views.push('users');
		}

		// Wire the nav button — use onclick so repeated calls don't stack listeners
		if (navBtn) {
			navBtn.onclick = () => {
				if (typeof showView === 'function') showView('users');
				renderUsersView();
			};
		}

		// If view-users is already visible on load, render immediately
		const section = document.getElementById('view-users');
		if (section && !section.classList.contains('hidden')) renderUsersView();
	}

	// Wait for full DOM + app.js to be ready before wiring
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		// app.js loads after us — defer so it has time to define showView & views
		setTimeout(init, 0);
	}

})();