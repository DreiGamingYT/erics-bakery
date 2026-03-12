/**
 * account-activation.js
 * Admin-gated account activation for Eric's Bakery.
 *
 * What this does:
 *   1. After signup  — shows a "Pending Approval" overlay instead of logging in.
 *   2. On login      — shows a clear message if the account is pending or rejected.
 *   3. Admin panel   — injects a "Pending Approvals" card above the user table so
 *                      admins can approve / reject new registrations in one click.
 *   4. Nav badge     — shows a live red counter on the Users nav item when there
 *                      are pending accounts.
 *
 * Load AFTER app.js, notifications.js, and auth-enhancements.js in index.html:
 *   <script src="/account-activation.js"></script>
 */
(function () {
	'use strict';

	const POLL_INTERVAL_MS = 60 * 1000; // refresh pending count every 60s (admin only)
	const LOGO_URL         = 'https://i.ibb.co/9HshkkkB/logo.png'; // matches existing email logo

	// ═══════════════════════════════════════════════════════════════════════════
	// 1. FETCH INTERCEPTOR
	//    Wraps window.fetch to react to signup/login activation responses.
	// ═══════════════════════════════════════════════════════════════════════════

	if (!window._activationFetchPatched) {
		window._activationFetchPatched = true;

		const _origFetch = window.fetch.bind(window);

		window.fetch = async function (input, init) {
			const url    = typeof input === 'string' ? input : (input?.url || '');
			const method = ((init && init.method) || 'GET').toUpperCase();

			const res = await _origFetch(input, init);

			// ── Intercept successful signup that results in a pending account ────
			if (method === 'POST' && /\/api\/auth\/signup$/.test(url) && res.ok) {
				try {
					const cloned = res.clone();
					const data   = await cloned.json();
					if (data && data.pending === true) {
						// Show our UI, then return a synthetic non-ok response so app.js
						// doesn't attempt setSession(undefined) and crash silently.
						setTimeout(() => showPendingApprovalOverlay(data.message), 60);
						return new Response(
							JSON.stringify({ message: '' }), // empty message suppresses the default toast
							{ status: 400, headers: { 'Content-Type': 'application/json' } }
						);
					}
				} catch (_) { /* non-JSON or already consumed — pass through */ }
			}

			// ── Intercept 403 login errors with activation codes ─────────────────
			if (method === 'POST' && /\/api\/auth\/login$/.test(url) && res.status === 403) {
				try {
					const cloned = res.clone();
					const data   = await cloned.json();
					if (data && data.code === 'ACCOUNT_PENDING') {
						setTimeout(() => notify(
							data.message || "Your account is awaiting admin approval. You'll be notified by email once activated.",
							{ type: 'info', duration: 7000 }
						), 60);
					} else if (data && data.code === 'ACCOUNT_REJECTED') {
						setTimeout(() => notify(
							data.message || 'Your account registration was not approved. Please contact the bakery admin.',
							{ type: 'error', duration: 9000 }
						), 60);
					}
				} catch (_) {}
			}

			return res;
		};
	}

	// ── Safe notify wrapper ───────────────────────────────────────────────────
	function notify(msg, opts) {
		if (typeof window.notify === 'function') window.notify(msg, opts || {});
		else console.info('[account-activation]', msg);
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// 2. PENDING APPROVAL OVERLAY  (shown to new users after successful signup)
	// ═══════════════════════════════════════════════════════════════════════════

	function injectKeyframes() {
		if (document.getElementById('actKf')) return;
		const s = document.createElement('style');
		s.id = 'actKf';
		s.textContent = `
			@keyframes actFadeIn  { from { opacity:0; transform:scale(.95) } to { opacity:1; transform:scale(1) } }
			@keyframes actBounce  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-9px) } }
		`;
		document.head.appendChild(s);
	}

	function showPendingApprovalOverlay(msg) {
		// Collapse the signup panel back to login mode
		const landing = document.getElementById('landingOverlay');
		if (landing) landing.classList.remove('signup-mode');

		if (document.getElementById('actApprovalOverlay')) return;
		injectKeyframes();

		const el = document.createElement('div');
		el.id = 'actApprovalOverlay';
		el.setAttribute('role', 'dialog');
		el.setAttribute('aria-modal', 'true');
		el.setAttribute('aria-labelledby', 'actApprovalTitle');
		el.style.cssText = [
			'position:fixed;inset:0;z-index:99600',
			'background:rgba(0,0,0,0.58)',
			'display:flex;align-items:center;justify-content:center',
			'backdrop-filter:blur(6px)',
			'animation:actFadeIn .25s ease'
		].join(';');

		el.innerHTML = `
			<div style="
				background:var(--card,#fff);
				border-radius:22px;
				padding:42px 34px 34px;
				max-width:420px;
				width:92%;
				box-shadow:0 32px 80px rgba(0,0,0,.28);
				text-align:center;
				border:1px solid rgba(0,0,0,.06)
			">
				<div style="font-size:3.2rem;margin-bottom:18px;display:inline-block;animation:actBounce 1.6s ease infinite">📬</div>
				<h2 id="actApprovalTitle" style="margin:0 0 12px;font-size:1.3rem;color:var(--text,#111)">
					Account Pending Approval
				</h2>
				<p style="color:var(--muted,#666);font-size:.9rem;line-height:1.7;margin:0 0 22px">
					${escHtml(msg || 'Your account has been created and is waiting for admin approval. You\'ll receive an email once your account is activated.')}
				</p>
				<div style="
					background:rgba(99,102,241,.07);
					border:1px solid rgba(99,102,241,.18);
					border-radius:12px;
					padding:14px 18px;
					margin-bottom:24px;
					text-align:left
				">
					<div style="font-size:.8rem;font-weight:700;color:#4338ca;margin-bottom:6px">
						<i class="fa fa-circle-info" style="margin-right:5px" aria-hidden="true"></i>What happens next?
					</div>
					<ul style="margin:0;padding:0 0 0 18px;color:#64748b;font-size:.82rem;line-height:1.9">
						<li>The admin will review your registration</li>
						<li>You'll get an email when your account is approved</li>
						<li>Then you can sign in with your credentials</li>
					</ul>
				</div>
				<button id="actApprovalDismiss" class="btn primary" type="button"
					style="width:100%;padding:12px;font-size:.95rem">
					Got it!
				</button>
			</div>`;

		document.body.appendChild(el);

		const dismiss = () => {
			el.style.transition = 'opacity .3s ease, transform .3s ease';
			el.style.opacity    = '0';
			el.style.transform  = 'scale(.97)';
			setTimeout(() => { try { el.remove(); } catch (_) {} }, 330);
		};

		document.getElementById('actApprovalDismiss').onclick = dismiss;

		// Also dismiss on backdrop click
		el.addEventListener('click', (e) => { if (e.target === el) dismiss(); });
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// 3. ADMIN: PENDING APPROVALS PANEL
	// ═══════════════════════════════════════════════════════════════════════════

	function isAdminOrOwner() {
		try {
			const sess = typeof getSession === 'function' ? getSession() : null;
			if (!sess) return false;
			const r = String(sess.role || '').toLowerCase();
			return r === 'owner' || r === 'admin';
		} catch (_) { return false; }
	}

	async function apiFetch(url, opts = {}) {
		const res  = await fetch(url, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
		return data;
	}

	async function fetchPendingUsers() {
		const d = await apiFetch('/api/admin/pending-users');
		return d.users || [];
	}

	async function approveUser(id) {
		return apiFetch(`/api/admin/users/${id}/approve`, { method: 'POST' });
	}

	async function rejectUser(id, reason) {
		return apiFetch(`/api/admin/users/${id}/reject`, {
			method: 'POST',
			body: JSON.stringify({ reason: reason || '' })
		});
	}

	function escHtml(s) {
		return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	}

	function fmtDate(iso) {
		if (!iso) return '—';
		try {
			return new Date(iso).toLocaleString(undefined, {
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		} catch (_) { return String(iso); }
	}

	function initials(u) {
		const n = u.name || u.username || '?';
		return n.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
	}

	// ── Styles ────────────────────────────────────────────────────────────────

	function injectPendingStyles() {
		if (document.getElementById('actPendingStyles')) return;
		const s = document.createElement('style');
		s.id = 'actPendingStyles';
		s.textContent = `
			#actPendingSection { margin-bottom: 16px; }

			.act-card {
				background: var(--card, #fff);
				border: 1.5px solid rgba(245, 158, 11, 0.38);
				border-radius: 14px;
				padding: 18px 20px 14px;
				box-shadow: 0 2px 14px rgba(245,158,11,.10);
			}

			.act-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 14px;
				flex-wrap: wrap;
				gap: 8px;
			}

			.act-title {
				font-size: .96rem;
				font-weight: 700;
				color: var(--text, #111);
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.act-count-badge {
				background: #f59e0b;
				color: #fff;
				font-size: .72rem;
				font-weight: 800;
				padding: 2px 9px;
				border-radius: 20px;
			}

			.act-badge-nav {
				background: #ef4444;
				color: #fff;
				font-size: .65rem;
				font-weight: 800;
				padding: 1px 6px;
				border-radius: 10px;
				margin-left: 5px;
				vertical-align: middle;
				line-height: 1.4;
			}

			.act-user-row {
				display: flex;
				align-items: center;
				gap: 12px;
				padding: 11px 0;
				border-bottom: 1px solid rgba(0,0,0,.055);
				flex-wrap: wrap;
				transition: opacity .35s ease;
			}
			.act-user-row:last-child  { border-bottom: none; padding-bottom: 2px; }
			.act-user-row:first-child { padding-top: 2px; }

			.act-avatar {
				width: 38px;
				height: 38px;
				border-radius: 50%;
				background: linear-gradient(135deg, #f59e0b, #d97706);
				color: #fff;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: .85rem;
				font-weight: 800;
				flex-shrink: 0;
				letter-spacing: .02em;
			}

			.act-user-info        { flex: 1; min-width: 150px; }
			.act-user-name        { font-weight: 700; font-size: .875rem; color: var(--text, #111); }
			.act-user-meta        { font-size: .76rem; color: var(--muted, #888); margin-top: 2px; line-height: 1.6; }

			.act-actions          { display: flex; gap: 6px; flex-shrink: 0; }

			.act-btn-approve, .act-btn-reject {
				border: none;
				border-radius: 8px;
				padding: 7px 13px;
				font-size: .78rem;
				font-weight: 700;
				cursor: pointer;
				display: inline-flex;
				align-items: center;
				gap: 5px;
				transition: opacity .15s, background .15s, color .15s;
				white-space: nowrap;
			}
			.act-btn-approve               { background: #16a34a; color: #fff; }
			.act-btn-approve:hover         { opacity: .85; }
			.act-btn-approve:disabled      { opacity: .5; cursor: default; }
			.act-btn-reject                { background: transparent; color: #dc2626; border: 1.5px solid #dc2626; }
			.act-btn-reject:hover          { background: #dc2626; color: #fff; }
			.act-btn-reject:disabled       { opacity: .5; cursor: default; }

			.act-row-status {
				font-size: .79rem;
				font-weight: 600;
				padding: 4px 0 2px;
				width: 100%;
			}

			.act-empty {
				text-align: center;
				padding: 18px 0 6px;
				color: var(--muted, #888);
				font-size: .875rem;
				line-height: 1.7;
			}
		`;
		document.head.appendChild(s);
	}

	// ── Render pending panel ──────────────────────────────────────────────────

	async function renderPendingPanel(force) {
		if (!isAdminOrOwner()) return;

		const wrap = document.getElementById('uma2Wrap');
		if (!wrap) return;

		injectPendingStyles();

		// Mount or reuse section
		let section = document.getElementById('actPendingSection');
		if (!section) {
			section = document.createElement('div');
			section.id = 'actPendingSection';
			wrap.parentElement?.insertBefore(section, wrap);
		}

		if (!force && section._loaded) return;
		section._loaded = true;

		// Loading state
		section.innerHTML = `
			<div class="act-card">
				<div class="act-header">
					<div class="act-title">
						<i class="fa fa-user-clock" style="color:#f59e0b" aria-hidden="true"></i>
						Pending Account Approvals
					</div>
				</div>
				<div class="act-empty" aria-live="polite">
					<i class="fa fa-spinner fa-spin" style="font-size:1.3rem;margin-bottom:6px;display:block" aria-hidden="true"></i>
					Loading…
				</div>
			</div>`;

		let users;
		try {
			users = await fetchPendingUsers();
		} catch (e) {
			section.innerHTML = `
				<div class="act-card">
					<div class="act-empty" style="color:#dc2626">
						<i class="fa fa-circle-exclamation" style="font-size:1.2rem;display:block;margin-bottom:6px" aria-hidden="true"></i>
						Could not load pending approvals.<br>
						<span class="muted small">${escHtml(e.message)}</span>
					</div>
				</div>`;
			return;
		}

		updateNavBadge(users.length);

		if (users.length === 0) {
			section.innerHTML = `
				<div class="act-card">
					<div class="act-header">
						<div class="act-title">
							<i class="fa fa-user-clock" style="color:#f59e0b" aria-hidden="true"></i>
							Pending Account Approvals
						</div>
					</div>
					<div class="act-empty">
						<i class="fa fa-circle-check" style="color:#16a34a;font-size:1.5rem;margin-bottom:8px;display:block" aria-hidden="true"></i>
						All caught up — no accounts awaiting approval.
					</div>
				</div>`;
			return;
		}

		const rowsHtml = users.map(u => `
			<div class="act-user-row" data-uid="${escHtml(u.id)}">
				<div class="act-avatar" aria-hidden="true">${escHtml(initials(u))}</div>
				<div class="act-user-info">
					<div class="act-user-name">${escHtml(u.name || u.username)}</div>
					<div class="act-user-meta">
						@${escHtml(u.username)} &middot; ${escHtml(u.email || '—')} &middot;
						<span style="background:rgba(99,102,241,.1);color:#4338ca;border-radius:10px;padding:1px 7px;font-size:.72rem;font-weight:700">${escHtml(u.role)}</span><br>
						Registered ${escHtml(fmtDate(u.created_at))}
					</div>
				</div>
				<div class="act-actions">
					<button class="act-btn-approve" data-uid="${escHtml(u.id)}" type="button"
						aria-label="Approve ${escHtml(u.name || u.username)}">
						<i class="fa fa-check" aria-hidden="true"></i> Approve
					</button>
					<button class="act-btn-reject" data-uid="${escHtml(u.id)}" type="button"
						aria-label="Reject ${escHtml(u.name || u.username)}">
						<i class="fa fa-xmark" aria-hidden="true"></i> Reject
					</button>
				</div>
				<div class="act-row-status" id="actRowStatus_${escHtml(u.id)}" aria-live="polite" style="display:none"></div>
			</div>`).join('');

		section.innerHTML = `
			<div class="act-card">
				<div class="act-header">
					<div class="act-title">
						<i class="fa fa-user-clock" style="color:#f59e0b" aria-hidden="true"></i>
						Pending Account Approvals
						<span class="act-count-badge" aria-label="${users.length} pending">${users.length}</span>
					</div>
					<button id="actRefreshBtn" class="btn ghost small" type="button" title="Refresh list">
						<i class="fa fa-rotate-right" aria-hidden="true"></i> Refresh
					</button>
				</div>
				<div id="actPendingList">${rowsHtml}</div>
			</div>`;

		section.querySelector('#actRefreshBtn').onclick = () => {
			section._loaded = false;
			renderPendingPanel(true);
		};

		section.querySelectorAll('.act-btn-approve').forEach(btn => {
			btn.onclick = () => handleApprove(btn.dataset.uid, section);
		});

		section.querySelectorAll('.act-btn-reject').forEach(btn => {
			btn.onclick = () => handleReject(btn.dataset.uid, section);
		});
	}

	// ── Approve flow ──────────────────────────────────────────────────────────

	async function handleApprove(uid, section) {
		const row       = section.querySelector(`.act-user-row[data-uid="${uid}"]`);
		const statusEl  = document.getElementById(`actRowStatus_${uid}`);
		const approveBtn = row?.querySelector('.act-btn-approve');
		const rejectBtn  = row?.querySelector('.act-btn-reject');

		setRowBusy(row, approveBtn, rejectBtn, true);
		if (approveBtn) approveBtn.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i> Approving…';

		try {
			const result = await approveUser(uid);
			showRowStatus(statusEl, '✅ ' + (result.message || 'Approved — notification email sent.'), '#16a34a');
			collapseRow(row, () => { section._loaded = false; renderPendingPanel(true); });
		} catch (e) {
			showRowStatus(statusEl, '❌ ' + e.message, '#dc2626');
			setRowBusy(row, approveBtn, rejectBtn, false);
			if (approveBtn) approveBtn.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i> Approve';
		}
	}

	// ── Reject flow ───────────────────────────────────────────────────────────

	function handleReject(uid, section) {
		const row      = section.querySelector(`.act-user-row[data-uid="${uid}"]`);
		const userName = row?.querySelector('.act-user-name')?.textContent || 'this user';

		if (typeof openModalHTML === 'function') {
			// Use the app's existing modal infrastructure
			openModalHTML(`
				<h3 style="margin:0 0 8px">Reject Account</h3>
				<p class="muted small" style="margin:0 0 14px;line-height:1.55">
					Are you sure you want to reject
					<strong>${escHtml(userName)}</strong>'s registration?
					An optional reason will be included in the email sent to them.
				</p>
				<label class="field">
					<span class="field-label">Reason <span class="muted small">(optional)</span></span>
					<input id="actRejectReason" type="text"
						placeholder="e.g. Unrecognized email domain, duplicate account…"
						style="width:100%" maxlength="200"/>
				</label>
				<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
					<button class="btn ghost" id="actRejectCancel" type="button">Cancel</button>
					<button id="actRejectConfirm" type="button"
						style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-weight:700;cursor:pointer;font-size:.875rem;display:inline-flex;align-items:center;gap:6px">
						<i class="fa fa-xmark" aria-hidden="true"></i>Reject Account
					</button>
				</div>`
			);

			document.getElementById('actRejectCancel')?.addEventListener('click', () => {
				if (typeof closeModal === 'function') closeModal();
			});

			document.getElementById('actRejectConfirm')?.addEventListener('click', async () => {
				const reason = (document.getElementById('actRejectReason')?.value || '').trim();
				if (typeof closeModal === 'function') closeModal();
				await doReject(uid, reason, row, section);
			});

		} else {
			// Fallback: native prompt
			const reason = window.prompt(`Reject "${userName}"? Optionally enter a reason:`);
			if (reason === null) return; // user cancelled
			doReject(uid, reason, row, section);
		}
	}

	async function doReject(uid, reason, row, section) {
		const statusEl   = document.getElementById(`actRowStatus_${uid}`);
		const approveBtn = row?.querySelector('.act-btn-approve');
		const rejectBtn  = row?.querySelector('.act-btn-reject');

		setRowBusy(row, approveBtn, rejectBtn, true);
		if (rejectBtn) rejectBtn.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i> Rejecting…';

		try {
			const result = await rejectUser(uid, reason);
			showRowStatus(statusEl, '🚫 ' + (result.message || 'Account rejected — user notified.'), '#dc2626');
			collapseRow(row, () => { section._loaded = false; renderPendingPanel(true); });
		} catch (e) {
			showRowStatus(statusEl, '❌ ' + e.message, '#dc2626');
			setRowBusy(row, approveBtn, rejectBtn, false);
			if (rejectBtn) rejectBtn.innerHTML = '<i class="fa fa-xmark" aria-hidden="true"></i> Reject';
		}
	}

	// ── UI helpers ────────────────────────────────────────────────────────────

	function setRowBusy(row, approveBtn, rejectBtn, busy) {
		if (approveBtn) approveBtn.disabled = busy;
		if (rejectBtn)  rejectBtn.disabled  = busy;
	}

	function showRowStatus(el, msg, color) {
		if (!el) return;
		el.style.display = 'block';
		el.style.color   = color || 'var(--text,#111)';
		el.textContent   = msg;
	}

	function collapseRow(row, cb) {
		if (!row) { cb && cb(); return; }
		row.style.opacity  = '0';
		row.style.transform = 'translateX(12px)';
		setTimeout(cb, 500);
	}

	// ── Nav badge ─────────────────────────────────────────────────────────────

	function updateNavBadge(count) {
		document.querySelectorAll('.act-badge-nav').forEach(el => el.remove());
		if (count <= 0) return;
		const navItem = document.querySelector('.nav-item[data-view="users"], [data-view="users"]');
		if (!navItem) return;
		const badge = document.createElement('span');
		badge.className  = 'act-badge-nav';
		badge.textContent = count > 9 ? '9+' : String(count);
		badge.setAttribute('aria-label', `${count} pending`);
		navItem.appendChild(badge);
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// 4. ADMIN POLL  +  PANEL WATCHER
	// ═══════════════════════════════════════════════════════════════════════════

	let _pollTimer = null;

	function startAdminPoll() {
		if (_pollTimer) return;
		const tick = async () => {
			try {
				const users = await fetchPendingUsers();
				updateNavBadge(users.length);
			} catch (_) {}
		};
		tick();
		_pollTimer = setInterval(tick, POLL_INTERVAL_MS);
	}

	function hookAdminPanel() {
		// Inject panel whenever uma2Wrap appears (user mgmt section opens)
		const obs = new MutationObserver(() => {
			if (document.getElementById('uma2Wrap') && !document.getElementById('actPendingSection')) {
				renderPendingPanel(false);
			}
		});
		obs.observe(document.body, { childList: true, subtree: true });

		// Already rendered?
		if (document.getElementById('uma2Wrap')) renderPendingPanel(false);

		// Also re-render when Users nav is clicked
		document.addEventListener('click', (e) => {
			if (e.target.closest('[data-view="users"]')) {
				setTimeout(() => {
					const s = document.getElementById('actPendingSection');
					if (s) { s._loaded = false; renderPendingPanel(true); }
				}, 200);
			}
		}, true);
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// INIT
	// ═══════════════════════════════════════════════════════════════════════════

	function init() {
		if (!isAdminOrOwner()) return; // fetch intercept already active for everyone
		hookAdminPanel();
		startAdminPoll();
	}

	// Wait for getSession to be defined by app.js before checking role
	let _attempts = 0;
	const _tryInit = setInterval(() => {
		if (typeof getSession === 'function' || ++_attempts > 120) {
			clearInterval(_tryInit);
			init();
		}
	}, 50);

	// Stop the poll timer on logout
	const _origLogout = window.performLogout;
	if (typeof _origLogout === 'function' && !_origLogout._actPatched) {
		window.performLogout = function () {
			if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
			// Remove nav badge
			document.querySelectorAll('.act-badge-nav').forEach(el => el.remove());
			return _origLogout.apply(this, arguments);
		};
		window.performLogout._actPatched = true;
	}

	// Also re-init if session changes (e.g. user logs in as admin)
	const _origStartApp = window.startApp;
	if (typeof _origStartApp === 'function' && !_origStartApp._actPatched) {
		window.startApp = function () {
			const r = _origStartApp.apply(this, arguments);
			setTimeout(init, 300);
			return r;
		};
		window.startApp._actPatched = true;
	}

})();