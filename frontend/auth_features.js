/**
 * auth-features.js
 * Implements:
 *   1. Idle Warning Modal — warns user before auto-logout
 *   2. Magic Link / Passwordless Login — "Send me a sign-in link" on the login overlay
 *   3. Own Sessions View — "My Active Sessions" panel in the Profile view
 *   4. Auth Audit Log View — "Security Log" panel in the Profile view
 */
(function () {
	'use strict';

	// ── Shared API helper ─────────────────────────────────────────────────────

	async function apiFetch(url, opts = {}) {
		const res = await fetch(url, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
		return data;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 1. IDLE WARNING MODAL
	// ─────────────────────────────────────────────────────────────────────────

	const IDLE_WARN_MS      = (Number(localStorage.getItem('idle_warn_minutes'))  || 2) * 60 * 1000; //25
	const IDLE_LOGOUT_MS    = (Number(localStorage.getItem('idle_logout_minutes'))|| 30) * 60 * 1000;
	const IDLE_COUNTDOWN_S  = Math.round((IDLE_LOGOUT_MS - IDLE_WARN_MS) / 1000);

	let idleWarnTimer   = null;
	let idleLogoutTimer = null;
	let countdownInterval = null;
	let idleModalEl     = null;

	function resetIdleTimers() {
		clearTimeout(idleWarnTimer);
		clearTimeout(idleLogoutTimer);
		clearInterval(countdownInterval);
		dismissIdleModal();

		idleWarnTimer   = setTimeout(showIdleWarning, IDLE_WARN_MS);
		idleLogoutTimer = setTimeout(idleAutoLogout,  IDLE_LOGOUT_MS);
	}

	function showIdleWarning() {
		// Don't show if not logged in
		if (typeof getSession === 'function' && !getSession()) return;
		if (typeof isLoggedIn === 'function' && !isLoggedIn()) return;

		let remaining = IDLE_COUNTDOWN_S;

		idleModalEl = document.createElement('div');
		idleModalEl.id = 'idleWarningModal';
		idleModalEl.setAttribute('role', 'alertdialog');
		idleModalEl.setAttribute('aria-modal', 'true');
		idleModalEl.setAttribute('aria-label', 'Session timeout warning');
		idleModalEl.innerHTML = `
			<div class="idle-backdrop"></div>
			<div class="idle-card">
				<div class="idle-icon">⏱️</div>
				<h3 class="idle-title">Still there?</h3>
				<p class="idle-body">You've been inactive for a while. For your security, you'll be signed out automatically.</p>
				<div class="idle-countdown" id="idleCountdownNum">${remaining}</div>
				<p class="idle-unit">seconds remaining</p>
				<div class="idle-actions">
					<button id="idleStayBtn" class="btn primary" type="button">Keep me signed in</button>
					<button id="idleLogoutBtn" class="btn ghost" type="button">Sign out now</button>
				</div>
			</div>`;

		// Inline styles so the modal works regardless of CSS load order
		const style = document.createElement('style');
		style.textContent = `
			#idleWarningModal { position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center; }
			#idleWarningModal .idle-backdrop { position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px); }
			#idleWarningModal .idle-card { position:relative;background:var(--card,#fff);border-radius:18px;padding:32px 28px;width:min(92vw,380px);text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.22);animation:idleIn .22s ease; }
			@keyframes idleIn { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }
			#idleWarningModal .idle-icon { font-size:42px;line-height:1;margin-bottom:12px; }
			#idleWarningModal .idle-title { margin:0 0 8px;font-size:20px;font-weight:800;color:var(--text,#111); }
			#idleWarningModal .idle-body { color:var(--muted,#666);font-size:14px;margin:0 0 20px;line-height:1.5; }
			#idleWarningModal .idle-countdown { font-size:48px;font-weight:900;color:#dc2626;line-height:1;margin:0 0 4px; }
			#idleWarningModal .idle-unit { color:var(--muted,#888);font-size:13px;margin:0 0 24px; }
			#idleWarningModal .idle-actions { display:flex;gap:10px;justify-content:center;flex-wrap:wrap; }
			#idleWarningModal .idle-actions .btn { min-width:140px; }
		`;
		document.head.appendChild(style);
		document.body.appendChild(idleModalEl);

		document.getElementById('idleStayBtn')?.addEventListener('click', () => {
			resetIdleTimers();
			// Send a heartbeat so the server also resets
			fetch('/api/auth/heartbeat', { method: 'PUT', credentials: 'include' }).catch(() => {});
		});
		document.getElementById('idleLogoutBtn')?.addEventListener('click', () => {
			clearInterval(countdownInterval);
			idleAutoLogout();
		});

		// Focus the stay button for accessibility
		setTimeout(() => document.getElementById('idleStayBtn')?.focus(), 50);

		// Start countdown display
		countdownInterval = setInterval(() => {
			remaining = Math.max(0, remaining - 1);
			const el = document.getElementById('idleCountdownNum');
			if (el) el.textContent = remaining;
		}, 1000);
	}

	function dismissIdleModal() {
		if (idleModalEl) { idleModalEl.remove(); idleModalEl = null; }
		clearInterval(countdownInterval);
	}

	function idleAutoLogout() {
		dismissIdleModal();
		// Use app.js's performLogout if available, otherwise do it manually
		if (typeof performLogout === 'function') {
			performLogout();
		} else {
			fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
				.finally(() => { location.reload(); });
		}
	}

	function initIdleTracking() {
		// Only track when the user is logged in
		if (typeof isLoggedIn === 'function' && !isLoggedIn()) return;

		const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
		const throttled = (() => {
			let last = 0;
			return () => {
				const now = Date.now();
				if (now - last > 15_000) { last = now; resetIdleTimers(); }
			};
		})();

		EVENTS.forEach(ev => document.addEventListener(ev, throttled, { passive: true }));
		resetIdleTimers();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 2. MAGIC LINK — Login overlay injection
	// ─────────────────────────────────────────────────────────────────────────

	function injectMagicLinkUI() {
		// Try to inject a "Sign in with email link" section into the login overlay form
		const loginForm = document.getElementById('loginForm') || document.querySelector('.login-form, .overlay-form, #overlay-form');
		if (!loginForm || loginForm._magicLinkInjected) return;
		loginForm._magicLinkInjected = true;

		const divider = document.createElement('div');
		divider.innerHTML = `
			<div id="magicLinkSection" style="margin-top:18px">
				<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
					<div style="flex:1;height:1px;background:var(--border,rgba(0,0,0,.1))"></div>
					<span style="font-size:12px;color:var(--muted,#888);white-space:nowrap">or sign in without a password</span>
					<div style="flex:1;height:1px;background:var(--border,rgba(0,0,0,.1))"></div>
				</div>
				<div id="magicLinkForm">
					<input id="magicLinkEmail" type="email" placeholder="Enter your email address"
						autocomplete="email" style="width:100%;box-sizing:border-box;margin-bottom:8px"
						class="form-input" />
					<button id="magicLinkSendBtn" type="button" class="btn ghost" style="width:100%">
						<i class="fa fa-magic" style="margin-right:6px"></i>Send me a sign-in link
					</button>
				</div>
				<div id="magicLinkSent" style="display:none;padding:14px;border-radius:10px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#15803d;font-size:13px;text-align:center">
					<strong>✅ Link sent!</strong><br/>Check your email for a sign-in link. It expires in 15 minutes.
					<br/><button id="magicLinkResendBtn" type="button" style="margin-top:8px;background:none;border:none;color:#15803d;cursor:pointer;font-size:12px;text-decoration:underline">Send another link</button>
				</div>
			</div>`;
		loginForm.appendChild(divider);

		document.getElementById('magicLinkSendBtn')?.addEventListener('click', handleMagicLinkRequest);
		document.getElementById('magicLinkEmail')?.addEventListener('keydown', e => {
			if (e.key === 'Enter') handleMagicLinkRequest();
		});
		document.getElementById('magicLinkResendBtn')?.addEventListener('click', () => {
			document.getElementById('magicLinkSent').style.display = 'none';
			document.getElementById('magicLinkForm').style.display = '';
			document.getElementById('magicLinkEmail').value = '';
			document.getElementById('magicLinkEmail').focus();
		});
	}

	async function handleMagicLinkRequest() {
		const emailInput = document.getElementById('magicLinkEmail');
		const sendBtn    = document.getElementById('magicLinkSendBtn');
		const email      = (emailInput?.value || '').trim();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			emailInput?.focus();
			emailInput?.classList.add('input-error');
			setTimeout(() => emailInput?.classList.remove('input-error'), 1500);
			return;
		}

		if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; }
		try {
			await apiFetch('/api/auth/magic-link/request', {
				method: 'POST',
				body: JSON.stringify({ email })
			});
			document.getElementById('magicLinkForm').style.display  = 'none';
			document.getElementById('magicLinkSent').style.display  = '';
		} catch (err) {
			if (typeof notify === 'function') notify(`Failed to send link: ${err.message}`, { type: 'error' });
		} finally {
			if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fa fa-magic" style="margin-right:6px"></i>Send me a sign-in link'; }
		}
	}

	// Handle the magic link token that's in the URL when user clicks the email link
	async function handleMagicLinkInUrl() {
		const params = new URLSearchParams(window.location.search);
		const token  = params.get('magic');
		if (!token) return;

		// Clean the URL immediately so refresh doesn't re-trigger
		const cleanUrl = window.location.pathname;
		window.history.replaceState({}, document.title, cleanUrl);

		// Show a loading state
		if (typeof showGlobalLoader === 'function') showGlobalLoader(true, 'Signing you in…', 'Verifying your magic link');

		try {
			const data = await apiFetch(`/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`);
			if (data.ok && data.user) {
				if (typeof setSession === 'function') setSession(data.user, false);
				if (typeof window.currentUser !== 'undefined') window.currentUser = data.user;
				if (typeof showGlobalLoader === 'function') showGlobalLoader(false);
				if (typeof showApp === 'function') showApp(true);
				if (typeof startApp === 'function') startApp();
				if (typeof notify === 'function') notify(`Welcome back, ${data.user.name || data.user.username}!`, { type: 'success' });
			}
		} catch (err) {
			if (typeof showGlobalLoader === 'function') showGlobalLoader(false);
			// Show error on the login overlay
			const errEl = document.getElementById('loginError') || document.getElementById('overlay-error');
			if (errEl) {
				errEl.textContent = `Sign-in link error: ${err.message}`;
				errEl.style.display = 'block';
			} else if (typeof notify === 'function') {
				notify(`Sign-in link error: ${err.message}`, { type: 'error' });
			}
			if (typeof showOverlay === 'function') showOverlay(true, true);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 3. OWN SESSIONS VIEW — injected into Profile tab
	// ─────────────────────────────────────────────────────────────────────────

	async function renderOwnSessions(container) {
		container.innerHTML = `<div style="padding:16px;color:var(--muted,#888);font-size:13px">Loading sessions…</div>`;
		try {
			const data = await apiFetch('/api/auth/sessions/me');
			const sessions = data.sessions || [];
			if (sessions.length === 0) {
				container.innerHTML = `<div style="color:var(--muted,#888);font-size:13px;padding:12px">No session records found.</div>`;
				return;
			}
			const now = Date.now();
			container.innerHTML = sessions.map(s => {
				const loginTime  = s.logged_in_at  ? new Date(s.logged_in_at).toLocaleString()  : '—';
				const logoutTime = s.logged_out_at ? new Date(s.logged_out_at).toLocaleString() : null;
				const lastActive = s.last_active_at ? new Date(s.last_active_at) : null;
				const isActive   = !s.logged_out_at && lastActive && (now - lastActive.getTime()) < 12 * 60 * 1000;
				const ua         = parseUA(s.user_agent || '');
				return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:12px;border-radius:10px;background:var(--bg,#f8fafc);margin-bottom:8px;gap:12px;flex-wrap:wrap">
					<div style="display:flex;align-items:center;gap:12px">
						<div style="font-size:22px;line-height:1">${ua.icon}</div>
						<div>
							<div style="font-weight:700;font-size:13px">${escH(ua.browser)} on ${escH(ua.os)}</div>
							<div style="font-size:12px;color:var(--muted,#888)">IP: ${escH(s.ip_address || 'Unknown')} &nbsp;·&nbsp; Signed in: ${loginTime}</div>
							${logoutTime ? `<div style="font-size:12px;color:var(--muted,#888)">Signed out: ${logoutTime}</div>` : ''}
						</div>
					</div>
					<div>
						${isActive
							? `<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:rgba(34,197,94,.12);color:#15803d;font-size:11px;font-weight:700">● Active now</span>`
							: logoutTime
								? `<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:rgba(0,0,0,.06);color:var(--muted,#888);font-size:11px;font-weight:600">Ended</span>`
								: `<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:rgba(234,179,8,.12);color:#a16207;font-size:11px;font-weight:600">Idle</span>`
						}
					</div>
				</div>`;
			}).join('');
		} catch (err) {
			container.innerHTML = `<div style="color:#dc2626;font-size:13px;padding:12px">Failed to load sessions: ${escH(err.message)}</div>`;
		}
	}

	function parseUA(ua) {
		const browsers = [
			{ re: /Edg\//i,           name: 'Edge',    icon: '🌐' },
			{ re: /OPR\//i,           name: 'Opera',   icon: '🌐' },
			{ re: /Chrome\//i,        name: 'Chrome',  icon: '🌐' },
			{ re: /Firefox\//i,       name: 'Firefox', icon: '🦊' },
			{ re: /Safari\//i,        name: 'Safari',  icon: '🧭' },
		];
		const oses = [
			{ re: /Windows NT/i,      name: 'Windows' },
			{ re: /Mac OS X/i,        name: 'macOS'   },
			{ re: /Android/i,         name: 'Android' },
			{ re: /iPhone|iPad/i,     name: 'iOS'     },
			{ re: /Linux/i,           name: 'Linux'   },
		];
		const browser = browsers.find(b => b.re.test(ua)) || { name: 'Unknown browser', icon: '💻' };
		const os      = oses.find(o => o.re.test(ua))      || { name: 'Unknown OS' };
		return { browser: browser.name, os: os.name, icon: browser.icon };
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 4. AUTH AUDIT LOG VIEW — injected into Profile tab
	// ─────────────────────────────────────────────────────────────────────────

	const EVENT_META = {
		login_success:        { label: 'Signed in',              icon: '✅', color: '#15803d' },
		login_failed:         { label: 'Failed sign-in attempt', icon: '⚠️', color: '#b45309' },
		logout:               { label: 'Signed out',             icon: '🚪', color: '#4338ca' },
		password_changed:     { label: 'Password changed',       icon: '🔑', color: '#0369a1' },
		magic_link_requested: { label: 'Magic link requested',   icon: '✉️',  color: '#6d28d9' },
		magic_link_used:      { label: 'Signed in via magic link', icon: '🔗', color: '#0891b2' },
		role_changed:         { label: 'Role changed',           icon: '🛡️', color: '#c2410c' },
	};

	async function renderAuthAuditLog(container) {
		container.innerHTML = `<div style="padding:16px;color:var(--muted,#888);font-size:13px">Loading security log…</div>`;
		try {
			const data = await apiFetch('/api/auth/audit-log/me?limit=50');
			const logs = data.logs || [];
			if (logs.length === 0) {
				container.innerHTML = `<div style="color:var(--muted,#888);font-size:13px;padding:12px">No security events recorded yet.</div>`;
				return;
			}
			container.innerHTML = logs.map(log => {
				const meta    = EVENT_META[log.event_type] || { label: log.event_type, icon: 'ℹ️', color: 'var(--muted,#888)' };
				const timeStr = log.created_at ? new Date(log.created_at).toLocaleString() : '—';
				const ua      = parseUA(log.user_agent || '');
				let extraInfo = '';
				try {
					const m = typeof log.meta === 'string' ? JSON.parse(log.meta) : (log.meta || {});
					if (log.event_type === 'role_changed') {
						extraInfo = `<span style="font-size:11px;background:rgba(0,0,0,.05);border-radius:4px;padding:2px 6px">${escH(m.from_role || '?')} → ${escH(m.to_role || '?')}</span>`;
					}
				} catch {}
				return `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:10px;background:var(--bg,#f8fafc);margin-bottom:6px">
					<div style="font-size:18px;line-height:1.4;min-width:24px;text-align:center">${meta.icon}</div>
					<div style="flex:1;min-width:0">
						<div style="font-weight:700;font-size:13px;color:${meta.color}">${meta.label} ${extraInfo}</div>
						<div style="font-size:12px;color:var(--muted,#888)">${timeStr} &nbsp;·&nbsp; IP: ${escH(log.ip_address || 'Unknown')}</div>
						<div style="font-size:11px;color:var(--muted,#999)">${escH(ua.browser)} on ${escH(ua.os)}</div>
					</div>
				</div>`;
			}).join('');
		} catch (err) {
			container.innerHTML = `<div style="color:#dc2626;font-size:13px;padding:12px">Failed to load security log: ${escH(err.message)}</div>`;
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Profile tab injection
	// ─────────────────────────────────────────────────────────────────────────

	function injectProfilePanels() {
		// Find the profile view container
		const profileView = document.getElementById('view-profile');
		if (!profileView || profileView._authFeaturesInjected) return;
		profileView._authFeaturesInjected = true;

		// --- My Sessions card ---
		const sessCard = document.createElement('div');
		sessCard.className = 'card';
		sessCard.style.marginTop = '20px';
		sessCard.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:8px;flex-wrap:wrap">
				<h3 style="margin:0;font-size:15px;font-weight:800"><i class="fa fa-laptop" style="margin-right:8px;color:var(--accent,#1b85ec)"></i>My Active Sessions</h3>
				<button id="refreshSessionsBtn" class="btn ghost small" type="button">
					<i class="fa fa-rotate-right" style="margin-right:5px"></i>Refresh
				</button>
			</div>
			<p style="font-size:13px;color:var(--muted,#888);margin:0 0 12px">Devices and browsers where you are currently or recently signed in.</p>
			<div id="ownSessionsList"></div>`;
		profileView.appendChild(sessCard);

		document.getElementById('refreshSessionsBtn')?.addEventListener('click', () => {
			renderOwnSessions(document.getElementById('ownSessionsList'));
		});

		// --- Security Log card ---
		const auditCard = document.createElement('div');
		auditCard.className = 'card';
		auditCard.style.marginTop = '20px';
		auditCard.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:8px;flex-wrap:wrap">
				<h3 style="margin:0;font-size:15px;font-weight:800"><i class="fa fa-shield-halved" style="margin-right:8px;color:var(--accent,#1b85ec)"></i>Security Log</h3>
				<button id="refreshAuditBtn" class="btn ghost small" type="button">
					<i class="fa fa-rotate-right" style="margin-right:5px"></i>Refresh
				</button>
			</div>
			<p style="font-size:13px;color:var(--muted,#888);margin:0 0 12px">Your recent account security events — sign-ins, password changes, and more.</p>
			<div id="ownAuditLog"></div>`;
		profileView.appendChild(auditCard);

		document.getElementById('refreshAuditBtn')?.addEventListener('click', () => {
			renderAuthAuditLog(document.getElementById('ownAuditLog'));
		});

		// Load both immediately
		renderOwnSessions(document.getElementById('ownSessionsList'));
		renderAuthAuditLog(document.getElementById('ownAuditLog'));
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Utilities
	// ─────────────────────────────────────────────────────────────────────────

	function escH(s) {
		if (s == null) return '';
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Init — wires everything up once the app is ready
	// ─────────────────────────────────────────────────────────────────────────

	function init() {
		// Handle magic link token in URL as early as possible
		handleMagicLinkInUrl();

		// Inject magic link UI into login overlay once DOM is ready
		const tryInjectLogin = () => {
			const overlay = document.getElementById('loginOverlay')
				|| document.getElementById('overlay')
				|| document.querySelector('.login-overlay, .auth-overlay');
			if (overlay) {
				injectMagicLinkUI();
			}
		};

		// Patch populateProfile so we inject profile panels after it runs
		const patchPopulate = () => {
			if (!window.populateProfile || window.populateProfile._authFeatPatched) return;
			const orig = window.populateProfile;
			window.populateProfile = async function (...args) {
				await orig.apply(this, args);
				injectProfilePanels();
				// Also re-inject each time (handles view switches)
				const profileView = document.getElementById('view-profile');
				if (profileView) {
					const sessEl  = document.getElementById('ownSessionsList');
					const auditEl = document.getElementById('ownAuditLog');
					if (sessEl)  renderOwnSessions(sessEl);
					if (auditEl) renderAuthAuditLog(auditEl);
				}
			};
			window.populateProfile._authFeatPatched = true;
		};

		// Start idle tracking after login (watch for app becoming visible)
		const patchStartApp = () => {
			if (!window.startApp || window.startApp._idlePatched) return;
			const origStart = window.startApp;
			window.startApp = function (...args) {
				const result = origStart.apply(this, args);
				initIdleTracking();
				return result;
			};
			window.startApp._idlePatched = true;
		};

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => {
				tryInjectLogin();
				patchPopulate();
				patchStartApp();
			});
		} else {
			tryInjectLogin();
			patchPopulate();
			patchStartApp();
		}

		// Polling fallback — in case app.js defines functions after this script runs
		let attempts = 0;
		const tryPatch = setInterval(() => {
			patchPopulate();
			patchStartApp();
			tryInjectLogin();
			if (++attempts > 40) clearInterval(tryPatch);
		}, 100);
	}

	init();

})();