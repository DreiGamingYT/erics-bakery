(function () {
	'use strict';

	// ── API helpers ───────────────────────────────────────────────────────────

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

	async function changeUserRole(userId, newRole) {
		return apiFetch(`/api/admin/users/${userId}/role`, {
			method: 'PATCH',
			body: JSON.stringify({ role: newRole })
		});
	}

	// ── Role check ────────────────────────────────────────────────────────────

	function isAdminOrOwner() {
		try {
			const sess = typeof getSession === 'function' ? getSession() : null;
			if (!sess) return false;
			const r = String(sess.role || '').toLowerCase();
			return r === 'owner' || r === 'admin';
		} catch { return false; }
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	function escHtml(str) {
		return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	function fmt(isoStr) {
		if (!isoStr) return '—';
		try {
			return new Date(isoStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
		} catch { return isoStr; }
	}

	function timeAgo(isoStr) {
		if (!isoStr) return '—';
		try {
			const diff = Date.now() - new Date(isoStr).getTime();
			const mins = Math.floor(diff / 60000);
			if (mins < 1) return 'just now';
			if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
			const hrs = Math.floor(mins / 60);
			if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
			const days = Math.floor(hrs / 24);
			if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
			const months = Math.floor(days / 30);
			return `${months} month${months > 1 ? 's' : ''} ago`;
		} catch { return '—'; }
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

	function parseUA(ua) {
		if (!ua) return '';
		if (/iphone/i.test(ua)) return 'iPhone';
		if (/ipad/i.test(ua)) return 'iPad';
		if (/android/i.test(ua)) return 'Android';
		if (/windows/i.test(ua)) return 'Windows';
		if (/macintosh|mac os/i.test(ua)) return 'Mac';
		if (/linux/i.test(ua)) return 'Linux';
		return 'Desktop';
	}

	const AVATAR_COLORS = [
		'#4f8ef7','#e05c5c','#48b07c','#e8933a','#9b6cf7',
		'#e06cac','#3bbfbf','#c4a035','#6c8ecd','#d16b6b'
	];

	function avatarColor(str) {
		let h = 0;
		for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
		return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
	}

	function initials(user) {
		if (user.name) {
			const parts = user.name.trim().split(/\s+/);
			return parts.length > 1
				? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
				: parts[0].slice(0, 2).toUpperCase();
		}
		return (user.username || '?').slice(0, 2).toUpperCase();
	}

	// ── Styles ────────────────────────────────────────────────────────────────

	function injectStyles() {
		if (document.getElementById('uma2-styles')) return;
		const s = document.createElement('style');
		s.id = 'uma2-styles';
		s.textContent = `
			#uma2Wrap * { box-sizing: border-box; }
			#uma2Wrap {
				font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
				padding: 0;
			}
			.uma2-hero {
				text-align: center;
				padding: 28px 0 24px;
			}
			.uma2-hero h2 {
				margin: 0 0 6px;
				font-size: 28px;
				font-weight: 800;
				color: var(--text, #111);
				letter-spacing: -0.5px;
			}
			.uma2-hero p {
				margin: 0;
				font-size: 14px;
				color: var(--muted, #888);
			}
			.uma2-toolbar {
				display: flex;
				align-items: center;
				gap: 10px;
				flex-wrap: wrap;
				margin-bottom: 16px;
			}
			.uma2-search-wrap {
				position: relative;
				flex: 1;
				min-width: 180px;
				max-width: 280px;
			}
			.uma2-search-wrap svg {
				position: absolute;
				left: 11px;
				top: 50%;
				transform: translateY(-50%);
				color: var(--muted, #999);
				pointer-events: none;
			}
			.uma2-search {
				width: 100%;
				padding: 8px 12px 8px 34px;
				border: 1.5px solid var(--border, rgba(0,0,0,.1));
				border-radius: 8px;
				font-size: 13px;
				background: var(--card, #fff);
				color: var(--text, #111);
				outline: none;
				transition: border-color .15s;
			}
			.uma2-search:focus { border-color: var(--accent, #1b85ec); }
			.uma2-filter-btn {
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 7px 14px;
				border: 1.5px solid var(--border, rgba(0,0,0,.1));
				border-radius: 8px;
				background: var(--card, #fff);
				color: var(--text, #111);
				font-size: 13px;
				font-weight: 500;
				cursor: pointer;
				white-space: nowrap;
				position: relative;
				transition: border-color .15s, background .12s;
			}
			.uma2-filter-btn:hover { border-color: var(--accent, #1b85ec); background: var(--bg, #f8f8f8); }
			.uma2-filter-btn svg { color: var(--muted, #888); flex-shrink: 0; }
			.uma2-filter-btn.active { border-color: var(--accent, #1b85ec); color: var(--accent, #1b85ec); }
			.uma2-spacer { flex: 1; }
			.uma2-btn-export {
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 7px 16px;
				border: 1.5px solid var(--border, rgba(0,0,0,.1));
				border-radius: 8px;
				background: var(--blue-700, #063da2);
				color: #fff;
				font-size: 13px;
				font-weight: 600;
				cursor: pointer;
				transition: background .12s, border-color .15s;
				white-space: nowrap;
			}
			.uma2-btn-export:hover { background: var(--bg, #f5f5f5); border-color: var(--accent, #1b85ec); }
			.uma2-btn-add {
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 8px 18px;
				border: none;
				border-radius: 8px;
				background: var(--deep-navy, #1a2744);
				color: #fff;
				font-size: 13px;
				font-weight: 700;
				cursor: pointer;
				transition: opacity .12s, transform .1s;
				white-space: nowrap;
			}
			.uma2-btn-add:hover { opacity: .88; transform: translateY(-1px); }

			/* Dropdown */
			.uma2-dropdown {
				position: absolute;
				top: calc(100% + 6px);
				left: 0;
				min-width: 160px;
				background: var(--card, #fff);
				border: 1.5px solid var(--border, rgba(0,0,0,.1));
				border-radius: 10px;
				box-shadow: 0 8px 24px rgba(0,0,0,.1);
				z-index: 9999;
				overflow: hidden;
			}
			.uma2-dropdown.hidden { display: none; }
			.uma2-drop-item {
				padding: 9px 14px;
				font-size: 13px;
				cursor: pointer;
				color: var(--text, #111);
				transition: background .1s;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.uma2-drop-item:hover { background: var(--bg, #f5f5f5); }
			.uma2-drop-item.selected { color: var(--accent, #1b85ec); font-weight: 700; }
			.uma2-drop-sep { height: 1px; background: var(--border, rgba(0,0,0,.07)); margin: 4px 0; }

			/* Table */
			.uma2-table-wrap {
				border: 1.5px solid var(--border, rgba(0,0,0,.09));
				border-radius: 12px;
				overflow: hidden;
			}
			.uma2-table {
				width: 100%;
				border-collapse: collapse;
				font-size: 13px;
			}
			.uma2-table thead tr {
				background: var(--blue-700, #063da2);
				color: #fff;
			}
			.uma2-table thead th {
				padding: 12px 14px;
				text-align: left;
				font-weight: 700;
				font-size: 12.5px;
				white-space: nowrap;
				user-select: none;
			}
			.uma2-table thead th.sortable { cursor: pointer; }
			.uma2-table thead th.sortable:hover { opacity: .85; }
			.uma2-th-inner {
				display: flex;
				align-items: center;
				gap: 5px;
			}
			.uma2-sort-icon { opacity: .5; font-size: 10px; }
			.uma2-sort-icon.asc::after  { content: ' ↑'; }
			.uma2-sort-icon.desc::after { content: ' ↓'; }
			.uma2-sort-icon.none::after { content: ' ↕'; }
			.uma2-table thead th:first-child { width: 42px; }

			.uma2-table tbody tr {
				border-bottom: 1px solid var(--border, rgba(0,0,0,.07));
				transition: background .1s;
			}
			.uma2-table tbody tr:last-child { border-bottom: none; }
			.uma2-table tbody tr:hover { background: var(--bg, #f8fafc); }
			.uma2-table tbody tr.selected-row { background: rgba(27,133,236,.05); }
			.uma2-table td {
				padding: 12px 14px;
				vertical-align: middle;
				color: var(--text, #111);
			}

			/* Checkbox */
			.uma2-cb {
				width: 16px;
				height: 16px;
				cursor: pointer;
				accent-color: var(--accent, #1b85ec);
			}

			/* Avatar + name */
			.uma2-user-cell {
				display: flex;
				align-items: center;
				gap: 10px;
			}
			.uma2-avatar {
				width: 34px;
				height: 34px;
				border-radius: 50%;
				font-size: 12px;
				font-weight: 800;
				color: #fff;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
				letter-spacing: .03em;
			}
			.uma2-name { font-weight: 600; font-size: 13.5px; }
			.uma2-email-cell { color: var(--muted, #666); }

			/* Status badges */
			.uma2-badge {
				display: inline-flex;
				align-items: center;
				gap: 5px;
				padding: 4px 10px;
				border-radius: 999px;
				font-size: 12px;
				font-weight: 700;
				white-space: nowrap;
			}
			.uma2-badge::before {
				content: '';
				width: 6px;
				height: 6px;
				border-radius: 50%;
				flex-shrink: 0;
			}
			.uma2-badge-online  { background: rgba(34,197,94,.12);  color: #15803d; }
			.uma2-badge-online::before  { background: #22c55e; animation: uma2-pulse 1.8s ease-in-out infinite; }
			.uma2-badge-offline { background: rgba(148,163,184,.15); color: #64748b; }
			.uma2-badge-offline::before { background: #94a3b8; }
			@keyframes uma2-pulse {
				0%, 100% { opacity: 1; transform: scale(1); }
				50%       { opacity: .5; transform: scale(1.3); }
			}
			
			
			
			
			
			
			
			
			
			

			/* Actions */
			.uma2-actions-cell { display: flex; gap: 6px; align-items: center; }
			.uma2-action-btn {
				width: 30px; height: 30px;
				border-radius: 7px;
				border: 1px solid transparent;
				background: transparent;
				cursor: pointer;
				display: flex; align-items: center; justify-content: center;
				transition: background .12s, border-color .12s;
				color: var(--muted, #888);
				font-size: 14px;
			}
			.uma2-action-btn:hover { background: var(--bg, #f0f0f0); border-color: var(--border, rgba(0,0,0,.1)); }
			.uma2-action-btn.delete:hover { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.2); color: #dc2626; }

			/* Empty / loading */
			.uma2-state {
				text-align: center;
				padding: 40px 20px;
				color: var(--muted, #888);
				font-size: 14px;
			}
			.uma2-state svg { display: block; margin: 0 auto 12px; opacity: .35; }

			/* Pagination */
			.uma2-pagination {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-top: 16px;
				flex-wrap: wrap;
				gap: 10px;
			}
			.uma2-rpp {
				display: flex;
				align-items: center;
				gap: 8px;
				font-size: 13px;
				color: var(--muted, #888);
			}
			.uma2-rpp-select {
				padding: 4px 8px;
				border: 1.5px solid var(--border, rgba(0,0,0,.1));
				border-radius: 7px;
				font-size: 13px;
				background: var(--card, #fff);
				color: var(--text, #111);
				cursor: pointer;
			}
			.uma2-page-btns {
				display: flex;
				align-items: center;
				gap: 4px;
			}
			.uma2-pg {
				min-width: 34px; height: 34px;
				border-radius: 8px;
				border: 1.5px solid var(--border, rgba(0,0,0,.1));
				background: var(--card, #fff);
				color: var(--text, #111);
				font-size: 13px;
				font-weight: 600;
				cursor: pointer;
				display: flex; align-items: center; justify-content: center;
				padding: 0 6px;
				transition: background .12s, border-color .15s, color .12s;
			}
			.uma2-pg:hover:not(:disabled) { border-color: var(--accent, #1b85ec); }
			.uma2-pg.current { background: var(--deep-navy, #1a2744); color: #fff; border-color: var(--deep-navy, #1a2744); }
			.uma2-pg:disabled { opacity: .4; cursor: not-allowed; }
			.uma2-pg-dots { color: var(--muted, #aaa); font-size: 14px; padding: 0 4px; }

			/* History modal */
			#uma2Modal { position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.45); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
			#uma2Modal.hidden { display:none !important; }
			.uma2-modal-card { background:var(--card,#fff); border-radius:16px; width:100%; max-width:560px; max-height:82vh; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(0,0,0,.18); overflow:hidden; }
			.uma2-modal-head { padding:16px 20px; border-bottom:1px solid rgba(0,0,0,.06); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; background: var(--deep-navy, #1a2744); color: #fff; }
			.uma2-modal-head h4 { margin:0; font-size:15px; font-weight:700; }
			.uma2-modal-close { width:30px; height:30px; border-radius:8px; border:none; background:rgba(255,255,255,.15); color:#fff; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: background .12s; }
			.uma2-modal-close:hover { background:rgba(255,255,255,.28); }
			.uma2-modal-body { overflow-y:auto; padding:16px 20px; flex:1; }
			.uma2-hist-grid { display:grid; grid-template-columns:1fr 1fr auto; gap:4px 12px; margin-bottom:8px; }
			.uma2-hist-label { color:var(--muted,#888); font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
			.uma2-hist-row { display:grid; grid-template-columns:1fr 1fr auto; gap:4px 12px; padding:9px 11px; border-radius:9px; margin-bottom:6px; background:var(--bg,#f9f9f9); font-size:12px; border: 1px solid rgba(0,0,0,.05); }
			.uma2-hist-in  { color:#15803d; font-weight:700; }
			.uma2-hist-out { color:#dc2626; font-weight:700; }
			.uma2-hist-dur { color:var(--muted,#888); font-size:11px; align-self:center; white-space:nowrap; }
			.uma2-hist-meta { grid-column:1/-1; display:flex; gap:12px; flex-wrap:wrap; padding-top:4px; border-top:1px solid rgba(0,0,0,.04); margin-top:2px; }
			.uma2-hist-meta span { color:var(--muted,#888); font-size:10px; display:flex; align-items:center; gap:4px; }
			.uma2-no-hist  { color:var(--muted,#888); font-size:13px; text-align:center; padding:28px 0; }
			.uma2-loading  { color:var(--muted,#888); font-size:13px; text-align:center; padding:20px 0; }

			/* Delete modal */
			#uma2DeleteModal { position:fixed; inset:0; z-index:100000; background:rgba(0,0,0,.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
			#uma2DeleteModal.hidden { display:none !important; }
			.uma2-del-card { background:var(--card,#fff); border-radius:16px; width:100%; max-width:380px; box-shadow:0 24px 60px rgba(0,0,0,.2); overflow:hidden; }
			.uma2-del-icon { width:52px; height:52px; border-radius:50%; background:rgba(239,68,68,.1); display:flex; align-items:center; justify-content:center; margin:28px auto 0; font-size:22px; color:#dc2626; }
			.uma2-del-body { padding:16px 24px 24px; text-align:center; }
			.uma2-del-body h4 { margin:12px 0 6px; font-size:16px; }
			.uma2-del-body p { margin:0 0 20px; font-size:13px; color:var(--muted,#888); line-height:1.5; }
			.uma2-del-user { font-weight:800; color:var(--text,#111); }
			.uma2-del-actions { display:flex; gap:8px; }
			.uma2-del-cancel { flex:1; padding:9px; border-radius:9px; border:1px solid rgba(0,0,0,.1); background:var(--bg,#f5f5f5); color:var(--text,#111); font-size:13px; font-weight:700; cursor:pointer; }
			.uma2-del-cancel:hover { background:var(--card-hover,#eee); }
			.uma2-del-confirm { flex:1; padding:9px; border-radius:9px; border:none; background:#dc2626; color:#fff; font-size:13px; font-weight:700; cursor:pointer; }
			.uma2-del-confirm:hover { background:#b91c1c; }
			.uma2-del-confirm:disabled { opacity:.6; cursor:not-allowed; }
		`;
		document.head.appendChild(s);
	}

	// ── State ─────────────────────────────────────────────────────────────────

	let allUsers    = [];
	let filtered    = [];
	let sortCol     = '';
	let sortDir     = 'asc';
	let page        = 1;
	let rowsPerPage = 10;
	let searchQ     = '';
	let filterRole  = '';
		let selected    = new Set();

	// ── Status badge ──────────────────────────────────────────────────────────

	function statusKey(user) {
		return (user.is_online === 1 || user.is_online === true || user.is_online === '1') ? 'online' : 'offline';
	}

	function statusLabel(key) {
		return key === 'online' ? 'Online' : 'Offline';
	}

	function statusBadge(user) {
		const k = statusKey(user);
		return `<span class="uma2-badge uma2-badge-${k}">${statusLabel(k)}</span>`;
	}

	// ── Filter + sort + paginate ──────────────────────────────────────────────

	function applyFilters() {
		const q = searchQ.toLowerCase();
		filtered = allUsers.filter(u => {
			if (q) {
				const hay = `${u.name||''} ${u.username||''} ${u.email||''}`.toLowerCase();
				if (!hay.includes(q)) return false;
			}
			if (filterRole && String(u.role||'').toLowerCase() !== filterRole.toLowerCase()) return false;
				return true;
		});

		if (sortCol) {
			filtered.sort((a, b) => {
				let av = a[sortCol] || '', bv = b[sortCol] || '';
				if (sortCol === 'joined' || sortCol === 'created_at') {
					av = new Date(a.created_at || 0).getTime();
					bv = new Date(b.created_at || 0).getTime();
				} else if (sortCol === 'last_active') {
					av = new Date(a.last_active || a.last_login || 0).getTime();
					bv = new Date(b.last_active || b.last_login || 0).getTime();
				} else if (sortCol === 'name') {
					av = (a.name || a.username || '').toLowerCase();
					bv = (b.name || b.username || '').toLowerCase();
				} else {
					av = String(av).toLowerCase();
					bv = String(bv).toLowerCase();
				}
				if (av < bv) return sortDir === 'asc' ? -1 : 1;
				if (av > bv) return sortDir === 'asc' ? 1 : -1;
				return 0;
			});
		}

		page = 1;
	}

	function pageSlice() {
		const start = (page - 1) * rowsPerPage;
		return filtered.slice(start, start + rowsPerPage);
	}

	function totalPages() {
		return Math.max(1, Math.ceil(filtered.length / rowsPerPage));
	}

	// ── Render ────────────────────────────────────────────────────────────────

	function render() {
		const wrap = document.getElementById('uma2Wrap');
		if (!wrap) return;

		const sess     = typeof getSession === 'function' ? getSession() : null;
		const currId   = sess ? Number(sess.id) : null;
		const slice    = pageSlice();
		const tp       = totalPages();
		const allOnPageSelected = slice.length > 0 && slice.every(u => selected.has(u.id));

		// Build unique role list for filter
		const roles = [...new Set(allUsers.map(u => u.role).filter(Boolean))];

		// Table rows
		let rowsHtml = '';
		if (slice.length === 0) {
			rowsHtml = `<tr><td colspan="9">
				<div class="uma2-state">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
					No users found.
				</div>
			</td></tr>`;
		} else {
			slice.forEach(user => {
				const isSelf  = currId && Number(user.id) === currId;
				const ini     = initials(user);
				const color   = avatarColor(user.username || user.name || String(user.id));
				const lastAct = user.last_active || user.last_login || user.updated_at || '';
				const isSel   = selected.has(user.id);
				rowsHtml += `
				<tr data-uid="${user.id}" class="${isSel ? 'selected-row' : ''}">
					<td><input type="checkbox" class="uma2-cb uma2-row-cb" data-uid="${user.id}" ${isSel ? 'checked' : ''}></td>
					<td>
						<div class="uma2-user-cell">
							<div class="uma2-avatar" style="background:${color}">${escHtml(ini)}</div>
							<span class="uma2-name">${escHtml(user.name || user.username)}${isSelf ? ' <span style="font-size:11px;font-weight:500;color:var(--muted,#888)">(you)</span>' : ''}</span>
						</div>
					</td>
					<td class="uma2-email-cell">${escHtml(user.email || '—')}</td>
					<td>${escHtml(user.username || '—')}</td>
					<td>${statusBadge(user)}</td>
					<td>${escHtml(user.role || '—')}</td>
					<td>${fmt(user.created_at || user.joined_at || '')}</td>
					<td>${timeAgo(lastAct)}</td>
					<td>
						<div class="uma2-actions-cell">
							<button class="uma2-action-btn uma2-hist-btn" title="Login history" data-uid="${user.id}">
								<i class="fa fa-clock"></i>
							</button>
							${!isSelf ? `
							<button class="uma2-action-btn uma2-role-btn" title="Change role"
								data-uid="${user.id}" data-role="${escHtml(user.role || '')}">
								<i class="fa fa-user-pen"></i>
							</button>
							<button class="uma2-action-btn delete uma2-del-btn" title="Delete user" data-uid="${user.id}">
								<i class="fa fa-trash"></i>
							</button>` : ''}
						</div>
					</td>
				</tr>`;
			});
		}

		// Sort indicator
		function si(col) {
			if (sortCol !== col) return `<span class="uma2-sort-icon none"></span>`;
			return `<span class="uma2-sort-icon ${sortDir}"></span>`;
		}

		// Pagination buttons
		function pgBtns() {
			if (tp <= 1) return '';
			let html = '';
			// First / prev
			html += `<button class="uma2-pg" id="pgFirst" ${page===1?'disabled':''}title="First">«</button>`;
			html += `<button class="uma2-pg" id="pgPrev"  ${page===1?'disabled':''}title="Previous">‹</button>`;

			// Page numbers with ellipsis
			const pages = [];
			if (tp <= 7) {
				for (let i = 1; i <= tp; i++) pages.push(i);
			} else {
				pages.push(1);
				if (page > 3) pages.push('…');
				for (let i = Math.max(2, page-1); i <= Math.min(tp-1, page+1); i++) pages.push(i);
				if (page < tp - 2) pages.push('…');
				pages.push(tp);
			}
			pages.forEach(p => {
				if (p === '…') {
					html += `<span class="uma2-pg-dots">…</span>`;
				} else {
					html += `<button class="uma2-pg ${p===page?'current':''}" data-pg="${p}">${p}</button>`;
				}
			});

			html += `<button class="uma2-pg" id="pgNext" ${page===tp?'disabled':''}title="Next">›</button>`;
			html += `<button class="uma2-pg" id="pgLast" ${page===tp?'disabled':''}title="Last">»</button>`;
			return html;
		}

		wrap.innerHTML = `
		
			<div class="uma2-toolbar">
				<div class="uma2-search-wrap">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
					<input id="uma2Search" class="uma2-search" placeholder="Search" value="${escHtml(searchQ)}">
				</div>

				<div style="position:relative">
					<button class="uma2-filter-btn ${filterRole ? 'active' : ''}" id="uma2RoleBtn">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
						${filterRole || 'Role'}
						<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
					</button>
					<div class="uma2-dropdown hidden" id="uma2RoleDrop">
						<div class="uma2-drop-item ${!filterRole?'selected':''}" data-role="">All roles</div>
						<div class="uma2-drop-sep"></div>
						${roles.map(r => `<div class="uma2-drop-item ${filterRole===r?'selected':''}" data-role="${escHtml(r)}">${escHtml(r)}</div>`).join('')}
					</div>
				</div>

				<div class="uma2-spacer"></div>

				<button class="uma2-btn-export" id="uma2ExportBtn">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
					Export
				</button>
			</div>

			<div class="uma2-table-wrap">
				<table class="uma2-table">
					<thead>
						<tr>
							<th><input type="checkbox" class="uma2-cb" id="uma2SelectAll" ${allOnPageSelected ? 'checked' : ''}></th>
							<th class="sortable" data-sort="name"><div class="uma2-th-inner">Full Name ${si('name')}</div></th>
							<th class="sortable" data-sort="email"><div class="uma2-th-inner">Email ${si('email')}</div></th>
							<th class="sortable" data-sort="username"><div class="uma2-th-inner">Username ${si('username')}</div></th>
							<th class="sortable" data-sort="status"><div class="uma2-th-inner">Status ${si('status')}</div></th>
							<th class="sortable" data-sort="role"><div class="uma2-th-inner">Role ${si('role')}</div></th>
							<th class="sortable" data-sort="joined"><div class="uma2-th-inner">Joined Date ${si('joined')}</div></th>
							<th class="sortable" data-sort="last_active"><div class="uma2-th-inner">Last Active ${si('last_active')}</div></th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody id="uma2Tbody">${rowsHtml}</tbody>
				</table>
			</div>

			<div class="uma2-pagination">
				<div class="uma2-rpp">
					Rows per page
					<select class="uma2-rpp-select" id="uma2Rpp">
						${[5,10,25,50].map(n => `<option value="${n}" ${rowsPerPage===n?'selected':''}>${n}</option>`).join('')}
					</select>
					<span>of ${filtered.length} rows</span>
				</div>
				<div class="uma2-page-btns" id="uma2PgBtns">${pgBtns()}</div>
			</div>
		`;

		bindTableEvents(wrap);
	}

	// ── Event binding ─────────────────────────────────────────────────────────

	function bindTableEvents(wrap) {
		// Search
		const searchEl = wrap.querySelector('#uma2Search');
		if (searchEl) {
			searchEl.addEventListener('input', () => {
				searchQ = searchEl.value.trim();
				applyFilters();
				render();
			});
		}

		// Dropdowns toggle
		['uma2RoleBtn'].forEach(id => {
			const btn = wrap.querySelector(`#${id}`);
			if (!btn) return;
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const dropId = 'uma2RoleDrop';
				const drop = wrap.querySelector(`#${dropId}`);
				if (!drop) return;
				const isHidden = drop.classList.contains('hidden');
				// Close all
				wrap.querySelectorAll('.uma2-dropdown').forEach(d => d.classList.add('hidden'));
				if (isHidden) drop.classList.remove('hidden');
			});
		});
		document.addEventListener('click', () => {
			if (wrap) wrap.querySelectorAll('.uma2-dropdown').forEach(d => d.classList.add('hidden'));
		});

		// Role filter
		wrap.querySelectorAll('#uma2RoleDrop .uma2-drop-item').forEach(item => {
			item.addEventListener('click', (e) => {
				e.stopPropagation();
				filterRole = item.dataset.role;
				applyFilters();
				render();
			});
		});

		// Sort
		wrap.querySelectorAll('th.sortable').forEach(th => {
			th.addEventListener('click', () => {
				const col = th.dataset.sort;
				if (sortCol === col) {
					sortDir = sortDir === 'asc' ? 'desc' : 'asc';
				} else {
					sortCol = col;
					sortDir = 'asc';
				}
				applyFilters();
				render();
			});
		});

		// Select all
		const selectAll = wrap.querySelector('#uma2SelectAll');
		if (selectAll) {
			selectAll.addEventListener('change', () => {
				pageSlice().forEach(u => {
					if (selectAll.checked) selected.add(u.id);
					else selected.delete(u.id);
				});
				render();
			});
		}

		// Row checkboxes
		wrap.querySelectorAll('.uma2-row-cb').forEach(cb => {
			cb.addEventListener('change', () => {
				const uid = Number(cb.dataset.uid);
				if (cb.checked) selected.add(uid);
				else selected.delete(uid);
				render();
			});
		});

		// Pagination
		const rppEl = wrap.querySelector('#uma2Rpp');
		if (rppEl) {
			rppEl.addEventListener('change', () => {
				rowsPerPage = Number(rppEl.value);
				page = 1;
				render();
			});
		}

		wrap.querySelectorAll('[data-pg]').forEach(btn => {
			btn.addEventListener('click', () => { page = Number(btn.dataset.pg); render(); });
		});
		const pgFirst = wrap.querySelector('#pgFirst');
		const pgPrev  = wrap.querySelector('#pgPrev');
		const pgNext  = wrap.querySelector('#pgNext');
		const pgLast  = wrap.querySelector('#pgLast');
		if (pgFirst) pgFirst.addEventListener('click', () => { page = 1; render(); });
		if (pgPrev)  pgPrev.addEventListener('click',  () => { page = Math.max(1, page - 1); render(); });
		if (pgNext)  pgNext.addEventListener('click',  () => { page = Math.min(totalPages(), page + 1); render(); });
		if (pgLast)  pgLast.addEventListener('click',  () => { page = totalPages(); render(); });

		// History buttons
		wrap.querySelectorAll('.uma2-hist-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const uid = Number(btn.dataset.uid);
				const user = allUsers.find(u => u.id === uid || Number(u.id) === uid);
				if (user) openHistoryModal(user);
			});
		});

		// Delete buttons
		wrap.querySelectorAll('.uma2-del-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const uid = Number(btn.dataset.uid);
				const user = allUsers.find(u => u.id === uid || Number(u.id) === uid);
				if (user) openDeleteModal(user);
			});
		});

		// Role change buttons
		wrap.querySelectorAll('.uma2-role-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const uid  = Number(btn.dataset.uid);
				const user = allUsers.find(u => u.id === uid || Number(u.id) === uid);
				if (user) openRoleModal(user);
			});
		});

		// Export
		const exportBtn = wrap.querySelector('#uma2ExportBtn');
		if (exportBtn) exportBtn.addEventListener('click', exportCSV);

		// Add user — hook into existing createUserBtn if present, otherwise no-op
		const addBtn = wrap.querySelector('#uma2AddBtn');
		if (addBtn) {
			addBtn.addEventListener('click', () => {
				const existing = document.getElementById('createUserBtn');
				if (existing) existing.click();
				else if (typeof window.notify === 'function') window.notify('Add User coming soon');
			});
		}
	}

	// ── Export CSV ────────────────────────────────────────────────────────────

	function csvCell(v) {
		let s = String(v ?? '').replace(/\s+/g, ' ').trim();
		return (s.includes(',') || s.includes('"') || s.includes('\n'))
			? `"${s.replace(/"/g, '""')}"` : s;
	}

	function exportCSV() {
		const rows = [['ID','Full Name','Username','Email','Role','Status','Joined']];
		filtered.forEach(u => rows.push([
			u.id, u.name||u.username, u.username, u.email||'',
			u.role||'', statusLabel(statusKey(u)), u.created_at||''
		]));
		const csv = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
		const a   = document.createElement('a');
		a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
		a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
	}

	// ── History modal ─────────────────────────────────────────────────────────

	function openHistoryModal(user) {
		let modal = document.getElementById('uma2Modal');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'uma2Modal';
			modal.className = 'hidden';
			modal.innerHTML = `
				<div class="uma2-modal-card">
					<div class="uma2-modal-head">
						<h4 id="uma2ModalTitle"></h4>
						<button class="uma2-modal-close" id="uma2ModalClose" type="button">✕</button>
					</div>
					<div class="uma2-modal-body" id="uma2ModalBody"></div>
				</div>
			`;
			document.body.appendChild(modal);
			document.getElementById('uma2ModalClose').addEventListener('click', () => modal.classList.add('hidden'));
			modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
		}

		document.getElementById('uma2ModalTitle').textContent =
			`Login history — ${user.name || user.username} (${user.role})`;

		const body = document.getElementById('uma2ModalBody');
		body.innerHTML = '<div class="uma2-loading"><i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Loading sessions…</div>';
		modal.classList.remove('hidden');

		fetchSessions(user.id).then(sessions => {
			if (!sessions.length) {
				body.innerHTML = `<div class="uma2-no-hist"><i class="fa fa-clock-rotate-left" style="font-size:26px;opacity:.3;display:block;margin-bottom:10px"></i>No login sessions recorded yet.</div>`;
				return;
			}
			body.innerHTML = `
				<div class="uma2-hist-grid">
					<div class="uma2-hist-label">Login</div>
					<div class="uma2-hist-label">Logout</div>
					<div class="uma2-hist-label">Duration</div>
				</div>
				${sessions.map(s => `
					<div class="uma2-hist-row">
						<div class="uma2-hist-in">
							<i class="fa fa-arrow-right-to-bracket" style="margin-right:4px;font-size:10px"></i>${fmt(s.login)}
							<br><span style="font-weight:400;color:var(--muted,#888);font-size:10px">${timeAgo(s.login)}</span>
						</div>
						<div class="uma2-hist-out">
							${s.logout
								? `<i class="fa fa-arrow-right-from-bracket" style="margin-right:4px;font-size:10px"></i>${fmt(s.logout)}`
								: `<span style="color:#15803d;font-weight:700"><i class="fa fa-circle" style="font-size:7px;margin-right:4px"></i>Active now</span>`}
						</div>
						<div class="uma2-hist-dur">${duration(s.login, s.logout) || (s.logout ? '—' : 'ongoing')}</div>
						${(s.ip_address || s.user_agent) ? `
						<div class="uma2-hist-meta">
							${s.ip_address ? `<span><i class="fa fa-location-dot"></i> ${escHtml(s.ip_address)}</span>` : ''}
							${s.user_agent ? `<span><i class="fa fa-display"></i> ${escHtml(parseUA(s.user_agent))}</span>` : ''}
						</div>` : ''}
					</div>
				`).join('')}
			`;
		}).catch(err => {
			body.innerHTML = `<div class="uma2-no-hist" style="color:#dc2626">Failed to load sessions: ${escHtml(err.message)}</div>`;
		});
	}

	// ── Delete modal ──────────────────────────────────────────────────────────

	function openDeleteModal(user) {
		let modal = document.getElementById('uma2DeleteModal');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'uma2DeleteModal';
			modal.className = 'hidden';
			modal.innerHTML = `
				<div class="uma2-del-card">
					<div class="uma2-del-icon"><i class="fa fa-trash"></i></div>
					<div class="uma2-del-body">
						<h4>Delete account?</h4>
						<p id="uma2DelMsg"></p>
						<div class="uma2-del-actions">
							<button class="uma2-del-cancel" id="uma2DelCancel" type="button">Cancel</button>
							<button class="uma2-del-confirm" id="uma2DelConfirm" type="button">Delete</button>
						</div>
					</div>
				</div>
			`;
			document.body.appendChild(modal);
			document.getElementById('uma2DelCancel').addEventListener('click', () => modal.classList.add('hidden'));
			modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
		}

		document.getElementById('uma2DelMsg').innerHTML =
			`This will permanently delete <span class="uma2-del-user">@${escHtml(user.username)}</span>${user.name && user.name !== user.username ? ` (${escHtml(user.name)})` : ''}.<br>This action cannot be undone.`;

		const confirmBtn = document.getElementById('uma2DelConfirm');
		const freshBtn   = confirmBtn.cloneNode(true);
		confirmBtn.parentNode.replaceChild(freshBtn, confirmBtn);

		modal.classList.remove('hidden');
		setTimeout(() => freshBtn.focus(), 50);

		freshBtn.addEventListener('click', async () => {
			freshBtn.disabled = true;
			freshBtn.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Deleting…';
			try {
				await deleteUser(user.id);
				modal.classList.add('hidden');
				allUsers   = allUsers.filter(u => u.id !== user.id && Number(u.id) !== Number(user.id));
				selected.delete(user.id);
				applyFilters();
				render();
				if (typeof window.notify === 'function') window.notify(`User "${user.username}" deleted`);
			} catch (err) {
				modal.classList.add('hidden');
				if (typeof window.notify === 'function') window.notify(`Delete failed: ${err.message}`);
				freshBtn.disabled = false;
				freshBtn.textContent = 'Delete';
			}
		});
	}

	// ── Role change modal ─────────────────────────────────────────────────────

	function openRoleModal(user) {
		const ROLES = ['Owner', 'Admin', 'Baker', 'Assistant'];

		// Create modal overlay
		let modal = document.getElementById('uma2RoleModal');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'uma2RoleModal';
			modal.style.cssText = [
				'position:fixed;inset:0;z-index:9000',
				'background:rgba(0,0,0,0.55)',
				'display:flex;align-items:center;justify-content:center',
				'backdrop-filter:blur(2px)',
				'opacity:0;transition:opacity .18s ease'
			].join(';');
			modal.innerHTML = `
				<div class="uma2-modal-card" style="max-width:420px;animation:none">
					<div class="uma2-modal-head">
						<h4><i class="fa fa-user-pen" style="margin-right:8px"></i>Change Role</h4>
						<button class="uma2-modal-close" id="uma2RoleClose" aria-label="Close">&times;</button>
					</div>
					<div class="uma2-modal-body">
						<div id="uma2RoleUserInfo" style="display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid rgba(0,0,0,0.06)"></div>
						<label style="display:block;font-weight:700;font-size:.875rem;margin-bottom:8px;color:var(--text,#111)">
							New role
						</label>
						<div id="uma2RoleOptions" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px"></div>
						<div style="display:flex;gap:8px;justify-content:flex-end">
							<button class="btn ghost small" id="uma2RoleCancelBtn" type="button">Cancel</button>
							<button class="btn primary small" id="uma2RoleSaveBtn" type="button">
								<i class="fa fa-check" style="margin-right:6px"></i>Save change
							</button>
						</div>
						<div id="uma2RoleStatus" style="margin-top:10px;min-height:18px;font-size:.8rem"></div>
					</div>
				</div>`;
			document.body.appendChild(modal);

			// Close on backdrop click
			modal.addEventListener('click', e => { if (e.target === modal) closeRoleModal(); });
		}

		// Populate user info
		const userInfo = document.getElementById('uma2RoleUserInfo');
		const color    = typeof avatarColor === 'function' ? avatarColor(user.username || String(user.id)) : '#1b85ec';
		const ini      = typeof initials   === 'function' ? initials(user) : (user.username || '?').slice(0, 2).toUpperCase();
		userInfo.innerHTML = `
			<div style="width:40px;height:40px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;flex-shrink:0">${escHtml(ini)}</div>
			<div>
				<div style="font-weight:700">${escHtml(user.name || user.username)}</div>
				<div style="font-size:.8rem;color:var(--muted,#888)">@${escHtml(user.username)} · Current: <strong>${escHtml(user.role || 'Unknown')}</strong></div>
			</div>`;

		// Build role option cards
		const roleOpts = document.getElementById('uma2RoleOptions');
		const roleColors = { Owner: '#7c3aed', Admin: '#1b85ec', Baker: '#16a34a', Assistant: '#d97706' };
		const roleIcons  = { Owner: 'fa-crown', Admin: 'fa-shield-halved', Baker: 'fa-bread-slice', Assistant: 'fa-user-tie' };
		let selectedRole = user.role || ROLES[0];

		roleOpts.innerHTML = ROLES.map(r => `
			<button type="button" class="uma2-role-opt${r === selectedRole ? ' selected' : ''}" data-role="${escHtml(r)}"
				style="
					border:2px solid ${r === selectedRole ? roleColors[r] || '#1b85ec' : 'rgba(0,0,0,0.1)'};
					border-radius:10px;padding:10px 8px;background:${r === selectedRole ? (roleColors[r] || '#1b85ec') + '15' : 'transparent'};
					cursor:pointer;text-align:center;transition:all .14s ease;font-family:inherit">
				<i class="fa ${roleIcons[r] || 'fa-user'}" style="color:${roleColors[r] || '#888'};font-size:1.1rem;display:block;margin-bottom:5px"></i>
				<span style="font-size:.8rem;font-weight:700;color:var(--text,#111)">${escHtml(r)}</span>
			</button>`).join('');

		roleOpts.querySelectorAll('.uma2-role-opt').forEach(opt => {
			opt.addEventListener('click', () => {
				selectedRole = opt.dataset.role;
				roleOpts.querySelectorAll('.uma2-role-opt').forEach(o => {
					const c = roleColors[o.dataset.role] || '#1b85ec';
					const active = o.dataset.role === selectedRole;
					o.style.borderColor  = active ? c : 'rgba(0,0,0,0.1)';
					o.style.background   = active ? c + '15' : 'transparent';
					o.classList.toggle('selected', active);
				});
			});
		});

		// Status helper
		function setStatus(msg, type) {
			const el = document.getElementById('uma2RoleStatus');
			if (!el) return;
			el.textContent = msg;
			el.style.color = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#475569';
		}

		// Save button
		const saveBtn = document.getElementById('uma2RoleSaveBtn');
		// Replace to clear old listeners
		const freshSave = saveBtn.cloneNode(true);
		saveBtn.parentNode.replaceChild(freshSave, saveBtn);

		freshSave.addEventListener('click', async () => {
			if (selectedRole === user.role) {
				setStatus('Role is unchanged — please select a different role.', 'error');
				return;
			}
			freshSave.disabled  = true;
			freshSave.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Saving…';
			setStatus('', '');

			try {
				const result = await changeUserRole(user.id, selectedRole);
				// Update local cache
				const idx = allUsers.findIndex(u => u.id === user.id || Number(u.id) === Number(user.id));
				if (idx !== -1) allUsers[idx].role = selectedRole;
				applyFilters();
				render();

				setStatus(`Role updated to ${selectedRole}${result.user?.email ? ' — notification email sent' : ''}.`, 'success');
				freshSave.disabled  = false;
				freshSave.innerHTML = '<i class="fa fa-check" style="margin-right:6px"></i>Save change';
				if (typeof window.notify === 'function') {
					window.notify(`${user.name || user.username}'s role changed to ${selectedRole}`);
				}
				setTimeout(closeRoleModal, 1200);
			} catch (err) {
				setStatus(`Failed: ${err.message}`, 'error');
				freshSave.disabled  = false;
				freshSave.innerHTML = '<i class="fa fa-check" style="margin-right:6px"></i>Save change';
			}
		});

		// Close / cancel
		function closeRoleModal() {
			modal.style.opacity = '0';
			setTimeout(() => { modal.style.display = 'none'; }, 200);
		}
		document.getElementById('uma2RoleClose')?.addEventListener('click', closeRoleModal);
		document.getElementById('uma2RoleCancelBtn')?.addEventListener('click', closeRoleModal);

		// Show
		modal.style.display = 'flex';
		setTimeout(() => { modal.style.opacity = '1'; }, 20);
	}

	// ── Main render entry ─────────────────────────────────────────────────────

	async function renderAdminPanel() {
		const container = document.getElementById('usersPanel') || document.getElementById('usersList');
		if (!container) return;
		if (!isAdminOrOwner()) { container.style.display = ''; return; }

		injectStyles();

		let wrap = document.getElementById('uma2Wrap');
		if (!wrap) {
			wrap = document.createElement('div');
			wrap.id = 'uma2Wrap';
			if (container.parentElement) {
				container.parentElement.insertBefore(wrap, container);
				container.style.display = 'none';
			} else {
				document.body.appendChild(wrap);
			}
		}

		wrap.innerHTML = `<div class="uma2-state"><i class="fa fa-spinner fa-spin" style="font-size:20px"></i><br><br>Loading users…</div>`;

		try {
			allUsers = await fetchUsers();
		} catch (err) {
			wrap.innerHTML = `<div class="uma2-state" style="color:#dc2626"><i class="fa fa-triangle-exclamation" style="font-size:22px"></i><br><br>Could not load users: ${escHtml(err.message)}</div>`;
			return;
		}

		applyFilters();
		render();
	}

	// ── Nav watcher ───────────────────────────────────────────────────────────

	function watchNav() {
		document.addEventListener('click', e => {
			if (e.target.closest('[data-view="users"]')) setTimeout(tryRender, 100);
		});
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
		const section = document.getElementById('view-users');
		if (section && !section.classList.contains('hidden')) tryRender();
		const existingPanel = document.getElementById('usersPanel') || document.getElementById('usersList');
		if (existingPanel && !existingPanel.closest?.('.hidden')) tryRender();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();