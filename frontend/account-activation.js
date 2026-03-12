/**
 * account-activation.js
 * Handles two features:
 *
 *  1. ADMIN APPROVAL PANEL — injects a "Pending Approvals" card into the User
 *     Management / Settings view so admins can approve or reject new signups.
 *
 *  2. LOGOUT CONFIRMATION MODAL — replaces the instant logout with a polished
 *     confirmation popup; the API call fires in the background so there's zero
 *     lag on the UI side.
 *
 *  3. SIGNUP PENDING SCREEN — after signup, instead of auto-logging in, shows
 *     a friendly "pending approval" banner and returns to the login panel.
 *
 * Load AFTER app.js in index.html:
 *   <script src="/account-activation.js"></script>
 */
(function () {
	'use strict';

	// ── Helpers ────────────────────────────────────────────────────────────────

	function esc(s) {
		return String(s || '')
			.replace(/&/g, '&amp;').replace(/</g, '&lt;')
			.replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	function isAdminOrOwner() {
		try {
			const s = typeof getSession === 'function' ? getSession() : null;
			if (!s) return false;
			const r = String(s.role || '').toLowerCase();
			return r === 'owner' || r === 'admin' || r === 'sysadmin';
		} catch { return false; }
	}

	async function apiFetch(url, opts = {}) {
		const res = await fetch(url, Object.assign({
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' }
		}, opts));
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
		return data;
	}

	function toast(msg, type) {
		if (typeof window.notify === 'function') window.notify(msg, { type: type || 'info' });
		else alert(msg);
	}

	// ── Inject CSS once ────────────────────────────────────────────────────────

	function injectStyles() {
		if (document.getElementById('actStyles')) return;
		const s = document.createElement('style');
		s.id = 'actStyles';
		s.textContent = `
			/* ── Pending approval badge ── */
			#pendingApprovalsCard { margin-bottom: 20px; }
			#pendingApprovalsCard .act-badge {
				display: inline-flex; align-items: center; gap: 5px;
				background: #fef3c7; color: #92400e;
				border: 1px solid #fcd34d; border-radius: 20px;
				padding: 3px 10px; font-size: 12px; font-weight: 700;
			}
			.act-user-row {
				display: flex; align-items: center; gap: 12px;
				padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);
			}
			.act-user-row:last-child { border-bottom: none; }
			.act-avatar {
				width: 38px; height: 38px; border-radius: 50%;
				background: linear-gradient(135deg,#1b85ec,#7c3aed);
				color: #fff; display: flex; align-items: center;
				justify-content: center; font-weight: 700; font-size: 15px;
				flex-shrink: 0;
			}
			.act-user-info { flex: 1; min-width: 0; }
			.act-user-info strong { display: block; font-size: 14px; }
			.act-user-info span { font-size: 12px; color: var(--muted,#888); }
			.act-actions { display: flex; gap: 6px; flex-shrink: 0; }

			/* ── Logout confirmation modal ── */
			#logoutConfirmOverlay {
				position: fixed; inset: 0; z-index: 99800;
				background: rgba(0,0,0,.55);
				display: flex; align-items: center; justify-content: center;
				backdrop-filter: blur(4px);
				animation: actFadeIn .18s ease;
			}
			@keyframes actFadeIn {
				from { opacity: 0; transform: scale(.96); }
				to   { opacity: 1; transform: scale(1); }
			}
			#logoutConfirmBox {
				background: var(--card,#fff);
				border-radius: 18px; padding: 32px 28px 24px;
				max-width: 360px; width: 90%; text-align: center;
				box-shadow: 0 20px 60px rgba(0,0,0,.2);
			}
			#logoutConfirmBox .logout-icon {
				font-size: 2.4rem; margin-bottom: 12px; line-height: 1;
			}
			#logoutConfirmBox h3 { margin: 0 0 8px; font-size: 1.15rem; }
			#logoutConfirmBox p  { margin: 0 0 22px; color: var(--muted,#666); font-size: .9rem; }
			#logoutConfirmBox .act-btn-row {
				display: flex; gap: 10px; justify-content: center;
			}

			/* ── Pending signup notice ── */
			#pendingSignupNotice {
				background: linear-gradient(135deg, #fffbeb, #fef3c7);
				border: 1px solid #fcd34d; border-radius: 14px;
				padding: 20px; text-align: center; margin: 16px 0;
			}
			#pendingSignupNotice .notice-icon { font-size: 2rem; margin-bottom: 8px; }
			#pendingSignupNotice h4 { margin: 0 0 6px; color: #92400e; }
			#pendingSignupNotice p  { margin: 0; font-size: 13px; color: #78350f; line-height: 1.5; }
		`;
		document.head.appendChild(s);
	}

	// ══════════════════════════════════════════════════════════════════════════
	// 1.  ADMIN PENDING APPROVALS PANEL
	// ══════════════════════════════════════════════════════════════════════════

	async function loadAndRenderPendingUsers(container) {
		container.innerHTML = '<div class="muted small" style="padding:8px 0">Loading…</div>';
		try {
			const data = await apiFetch('/api/admin/pending-users');
			const users = data.users || [];
			if (users.length === 0) {
				container.innerHTML = '<div class="muted small" style="padding:8px 0">✓ No accounts pending approval.</div>';
				// Update badge
				const badge = document.getElementById('pendingCountBadge');
				if (badge) badge.style.display = 'none';
				return;
			}
			// Update badge
			const badge = document.getElementById('pendingCountBadge');
			if (badge) { badge.textContent = `${users.length} pending`; badge.style.display = ''; }

			container.innerHTML = '';
			users.forEach(u => {
				const row = document.createElement('div');
				row.className = 'act-user-row';
				row.id = `actRow_${u.id}`;
				const initial = (u.name || u.username || '?').charAt(0).toUpperCase();
				row.innerHTML = `
					<div class="act-avatar">${esc(initial)}</div>
					<div class="act-user-info">
						<strong>${esc(u.username)}</strong>
						<span>${esc(u.name || '')}${u.email ? ' · ' + esc(u.email) : ''} · <em>${esc(u.role || 'Baker')}</em></span>
					</div>
					<div class="act-actions">
						<button class="btn small" style="background:#16a34a;color:#fff;border-color:#16a34a"
							data-act="approve" data-id="${u.id}" data-name="${esc(u.username)}">
							<i class="fa fa-check" aria-hidden="true"></i> Approve
						</button>
						<button class="btn ghost small" style="color:#dc2626;border-color:#dc2626"
							data-act="reject" data-id="${u.id}" data-name="${esc(u.username)}">
							<i class="fa fa-xmark" aria-hidden="true"></i> Reject
						</button>
					</div>`;
				container.appendChild(row);
			});

			// Event delegation
			container.addEventListener('click', async (e) => {
				const btn = e.target.closest('[data-act]');
				if (!btn) return;
				const act  = btn.dataset.act;
				const id   = btn.dataset.id;
				const name = btn.dataset.name;
				btn.disabled = true;
				btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
				try {
					const result = await apiFetch(`/api/admin/users/${id}/${act}`, { method: 'POST' });
					toast(result.message || (act === 'approve' ? 'User approved!' : 'User rejected.'),
						act === 'approve' ? 'success' : 'info');
					const rowEl = document.getElementById(`actRow_${id}`);
					if (rowEl) {
						rowEl.style.transition = 'opacity .35s ease';
						rowEl.style.opacity = '0';
						setTimeout(() => {
							rowEl.remove();
							// Check if list is now empty
							if (container.querySelectorAll('.act-user-row').length === 0) {
								container.innerHTML = '<div class="muted small" style="padding:8px 0">✓ No accounts pending approval.</div>';
								const badge2 = document.getElementById('pendingCountBadge');
								if (badge2) badge2.style.display = 'none';
							}
						}, 380);
					}
				} catch (err) {
					toast(err.message || 'Action failed.', 'error');
					btn.disabled = false;
					btn.innerHTML = act === 'approve'
						? '<i class="fa fa-check"></i> Approve'
						: '<i class="fa fa-xmark"></i> Reject';
				}
			}, { once: false });

		} catch (err) {
			container.innerHTML = `<div class="muted small" style="color:#dc2626;padding:8px 0">Failed to load: ${esc(err.message)}</div>`;
		}
	}

	function injectPendingApprovalsCard(targetEl) {
		if (!targetEl || !isAdminOrOwner()) return;
		if (document.getElementById('pendingApprovalsCard')) {
			// Already injected — just refresh
			const container = document.getElementById('actPendingList');
			if (container) loadAndRenderPendingUsers(container);
			return;
		}

		const card = document.createElement('div');
		card.id = 'pendingApprovalsCard';
		card.className = 'card';
		card.innerHTML = `
			<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
				<div style="display:flex;align-items:center;gap:10px">
					<i class="fa fa-user-clock" style="color:#d97706;font-size:1.1rem"></i>
					<strong style="font-size:1rem">Pending Account Approvals</strong>
					<span id="pendingCountBadge" class="act-badge" style="display:none">0 pending</span>
				</div>
				<button class="btn ghost small" id="actRefreshBtn" type="button">
					<i class="fa fa-rotate-right" style="margin-right:4px"></i>Refresh
				</button>
			</div>
			<div id="actPendingList"></div>`;
		targetEl.insertBefore(card, targetEl.firstChild);

		document.getElementById('actRefreshBtn')?.addEventListener('click', () => {
			const c = document.getElementById('actPendingList');
			if (c) loadAndRenderPendingUsers(c);
		});

		loadAndRenderPendingUsers(document.getElementById('actPendingList'));
	}

	// ══════════════════════════════════════════════════════════════════════════
	// 2.  LOGOUT CONFIRMATION MODAL  (replaces browser-lag behavior)
	// ══════════════════════════════════════════════════════════════════════════

	function showLogoutConfirm() {
		if (document.getElementById('logoutConfirmOverlay')) return;

		const overlay = document.createElement('div');
		overlay.id = 'logoutConfirmOverlay';
		overlay.setAttribute('role', 'alertdialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.innerHTML = `
			<div id="logoutConfirmBox">
				<div class="logout-icon">👋</div>
				<h3>Sign out?</h3>
				<p>You'll need to sign in again to access the bakery dashboard.</p>
				<div class="act-btn-row">
					<button class="btn ghost" id="logoutCancelBtn" type="button">Cancel</button>
					<button class="btn primary" id="logoutConfirmBtn" type="button"
						style="background:#dc2626;border-color:#dc2626">
						<i class="fa fa-right-from-bracket" style="margin-right:6px"></i>Sign out
					</button>
				</div>
			</div>`;
		document.body.appendChild(overlay);

		const remove = () => {
			overlay.style.transition = 'opacity .18s ease';
			overlay.style.opacity = '0';
			setTimeout(() => overlay.remove(), 200);
		};

		document.getElementById('logoutCancelBtn').addEventListener('click', remove);
		overlay.addEventListener('click', (e) => { if (e.target === overlay) remove(); });
		document.addEventListener('keydown', function esc(e) {
			if (e.key === 'Escape') { remove(); document.removeEventListener('keydown', esc); }
		});

		document.getElementById('logoutConfirmBtn').addEventListener('click', async () => {
			// 1. Immediately clear the UI — no waiting for API
			remove();
			if (typeof clearSession === 'function')     clearSession();
			if (typeof destroyAllCharts === 'function') destroyAllCharts();
			if (typeof showApp === 'function')          showApp(false);
			if (typeof showOverlay === 'function')      showOverlay(true, true);
			const u = document.getElementById('overlay-username');
			const p = document.getElementById('overlay-password');
			if (u) u.value = '';
			if (p) p.value = '';
			// 2. Fire API logout then refresh the page
			fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
				.catch(() => {})
				.finally(() => window.location.reload());
		});
	}

	function patchLogoutButtons() {
		// Replace all logout button listeners by cloning them (removes existing listeners)
		['logoutBtn', 'userMenuLogout'].forEach(id => {
			const el = document.getElementById(id);
			if (!el || el._actPatched) return;
			// Clone to strip original listeners, then re-add ours
			const clone = el.cloneNode(true);
			el.parentNode?.replaceChild(clone, el);
			clone._actPatched = true;
			clone.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopImmediatePropagation();
				showLogoutConfirm();
			});
		});
	}

	// ══════════════════════════════════════════════════════════════════════════
	// 3.  SIGNUP — intercept and show "pending" notice
	// ══════════════════════════════════════════════════════════════════════════

	function patchSignupHandler() {
		const btn = document.getElementById('overlaySignUpBtn');
		if (!btn || btn._actPatched) return;
		btn._actPatched = true;

		// Wrap the original click listener: if the server returns 202 + pending:true
		// we show the pending notice instead of trying to log in.
		const origClick = btn.onclick;
		btn.addEventListener('click', async function interceptor(e) {
			// We observe the network call by monkey-patching fetch temporarily
			// — actually, we hook *after* the original handler fires via a response check.
			// Simplest: override the overlaySignUpBtn click entirely.
		}, { capture: true });

		// The cleanest approach: clone and re-add our own full handler
		const clone = btn.cloneNode(true);
		btn.parentNode?.replaceChild(clone, btn);
		clone._actPatched = true;

		clone.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();

			const username = document.getElementById('overlay-su-username')?.value.trim();
			const password = document.getElementById('overlay-su-password')?.value || '';
			const email    = document.getElementById('overlay-su-email')?.value || '';
			const role     = document.getElementById('overlay-su-role')?.value || 'Baker';

			if (!username || !password) {
				if (typeof notify === 'function') notify('Please enter a username and password');
				return;
			}
			if (!email) {
				if (typeof notify === 'function') notify('Email is required for account activation');
				return;
			}

			clone.disabled = true;
			clone.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Creating account…';
			if (typeof showGlobalLoader === 'function') showGlobalLoader(true, 'Creating account', 'Setting things up…', 700);

			try {
				const res  = await fetch('/api/auth/signup', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ username, password, email, role, name: username })
				});
				const data = await res.json().catch(() => ({}));

				if (typeof showGlobalLoader === 'function') showGlobalLoader(false);
				clone.disabled = false;
				clone.innerHTML = 'Create account';

				if (!res.ok) {
					if (typeof notify === 'function') notify(data.message || data.error || 'Signup failed');
					return;
				}

				if (data.pending) {
					// Show success/pending screen
					showPendingNotice(username, email);
				}
			} catch (err) {
				if (typeof showGlobalLoader === 'function') showGlobalLoader(false);
				clone.disabled = false;
				clone.innerHTML = 'Create account';
				if (typeof notify === 'function') notify('Network error — please try again');
			}
		});
	}

	function showPendingNotice(username, email) {
		// Switch back to login panel, show a friendly notice
		const overlay = document.getElementById('landingOverlay');
		if (overlay) overlay.classList.remove('signup-mode');

		// Insert notice into login form area
		const loginPanel = document.getElementById('overlayLogin') || document.getElementById('loginForm');
		if (!loginPanel) return;

		// Remove any old notice
		document.getElementById('pendingSignupNotice')?.remove();

		const notice = document.createElement('div');
		notice.id = 'pendingSignupNotice';
		notice.innerHTML = `
			<div class="notice-icon">📬</div>
			<h4>Account pending approval</h4>
			<p>
				<strong>${esc(username)}</strong>, your account has been created and is awaiting
				admin approval. You'll receive an email at <strong>${esc(email)}</strong> once it's activated.
			</p>`;
		loginPanel.insertBefore(notice, loginPanel.firstChild);

		// Auto-dismiss after 12 seconds
		setTimeout(() => {
			notice.style.transition = 'opacity .4s ease';
			notice.style.opacity = '0';
			setTimeout(() => notice.remove(), 450);
		}, 12000);

		// Pre-fill username
		const uInput = document.getElementById('overlay-username');
		if (uInput) uInput.value = username;
	}

	// ══════════════════════════════════════════════════════════════════════════
	// 4.  HOOK INTO populateSettings / startApp
	// ══════════════════════════════════════════════════════════════════════════

	function tryInjectApprovalPanel() {
		if (!isAdminOrOwner()) return;
		// Look for the user management section in settings/admin view
		const candidates = [
			document.getElementById('userManagementSection'),
			document.getElementById('view-settings'),
			document.querySelector('[data-section="users"]'),
			document.querySelector('.user-management-wrap')
		];
		const target = candidates.find(Boolean);
		if (target) injectPendingApprovalsCard(target);
	}

	function patchPopulateSettings() {
		if (window.populateSettings?._actPatched) return;
		const orig = window.populateSettings;
		if (typeof orig !== 'function') return;
		window.populateSettings = function () {
			orig.apply(this, arguments);
			setTimeout(tryInjectApprovalPanel, 100);
		};
		window.populateSettings._actPatched = true;
	}

	// ══════════════════════════════════════════════════════════════════════════
	// 5.  INIT
	// ══════════════════════════════════════════════════════════════════════════

	function init() {
		injectStyles();

		// Patch logout buttons once DOM is ready
		const patchLogout = () => patchLogoutButtons();
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', patchLogout);
		} else {
			patchLogout();
			// Also try after a short delay in case startApp re-renders the sidebar
			setTimeout(patchLogout, 800);
			setTimeout(patchLogout, 2000);
		}

		// Patch signup button
		const patchSignup = () => patchSignupHandler();
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', patchSignup);
		} else {
			patchSignup();
			setTimeout(patchSignup, 500);
		}

		// Poll until app.js functions exist, then patch
		let attempts = 0;
		const poll = setInterval(() => {
			if (window.populateSettings && !window.populateSettings._actPatched) patchPopulateSettings();
			const logoutPatched = document.getElementById('logoutBtn')?._actPatched;
			const signupPatched = document.getElementById('overlaySignUpBtn')?._actPatched;
			if (!signupPatched) patchSignupHandler();
			if (!logoutPatched) patchLogoutButtons();
			if ((window.populateSettings?._actPatched) || ++attempts > 200) clearInterval(poll);
		}, 100);
	}

	init();

})();