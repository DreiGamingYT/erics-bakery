/**
 * auth-enhancements.js
 * Adds three security features to the bakery app:
 *   1. Idle auto-logout  — warns at 25 min, logs out at 30 min
 *   2. Password strength meter — on profile change-password + signup modal
 *   3. Own sessions view — "Login Sessions" card injected into the profile page
 *
 * Works alongside notifications.js without conflicts.
 * Load this AFTER app.js and notifications.js in index.html.
 */
(function () {
	'use strict';

	// ═══════════════════════════════════════════════════════════════════════════
	// 1. IDLE AUTO-LOGOUT
	// ═══════════════════════════════════════════════════════════════════════════

	const IDLE_WARN_MS  = 1 * 60 * 1000; // 25 minutes → show warning modal
	const IDLE_LIMIT_MS = 5 * 60 * 1000; // 30 minutes → force logout
	const WARN_SECONDS  = Math.round((IDLE_LIMIT_MS - IDLE_WARN_MS) / 1000); // countdown start (300s)

	let idleWarnTimer     = null;
	let idleLogoutTimer   = null;
	let warnModalEl       = null;
	let countdownInterval = null;

	/* Check login state via app.js helper if available */
	function userIsLoggedIn() {
		try {
			if (typeof isLoggedIn === 'function') return isLoggedIn();
			return !!sessionStorage.getItem('user');
		} catch (e) { return false; }
	}

	function clearIdleTimers() {
		clearTimeout(idleWarnTimer);
		clearTimeout(idleLogoutTimer);
		clearInterval(countdownInterval);
	}

	function dismissIdleWarning() {
		clearInterval(countdownInterval);
		if (warnModalEl) { warnModalEl.remove(); warnModalEl = null; }
	}

	function resetIdleTimers() {
		clearIdleTimers();
		if (warnModalEl) return; // don't reset while warning is visible — user must click "I'm still here"
		if (!userIsLoggedIn()) return;

		idleWarnTimer   = setTimeout(showIdleWarning, IDLE_WARN_MS);
		idleLogoutTimer = setTimeout(doIdleLogout,    IDLE_LIMIT_MS);
	}

	function doIdleLogout() {
		dismissIdleWarning();
		if (!userIsLoggedIn()) return;
		if (typeof notify === 'function') notify('Signed out due to inactivity.', { type: 'info' });
		setTimeout(() => {
			if (typeof performLogout === 'function') performLogout();
		}, 900);
	}

	function formatCountdown(secs) {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function showIdleWarning() {
		if (!userIsLoggedIn() || warnModalEl) return;

		let secondsLeft = WARN_SECONDS;

		warnModalEl = document.createElement('div');
		warnModalEl.id = 'idleWarnOverlay';
		warnModalEl.setAttribute('role', 'alertdialog');
		warnModalEl.setAttribute('aria-modal', 'true');
		warnModalEl.setAttribute('aria-labelledby', 'idleWarnTitle');
		warnModalEl.style.cssText = [
			'position:fixed;inset:0;z-index:99000',
			'background:rgba(0,0,0,0.6)',
			'display:flex;align-items:center;justify-content:center',
			'backdrop-filter:blur(3px)',
			'animation:idleFadeIn .2s ease'
		].join(';');

		// Inject keyframe once
		if (!document.getElementById('idleKf')) {
			const kf = document.createElement('style');
			kf.id = 'idleKf';
			kf.textContent = '@keyframes idleFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}';
			document.head.appendChild(kf);
		}

		warnModalEl.innerHTML = `
			<div style="
				background:var(--card,#fff);
				border-radius:18px;
				padding:32px 28px;
				max-width:360px;
				width:90%;
				box-shadow:0 28px 70px rgba(0,0,0,.22);
				text-align:center;
				border:1px solid rgba(0,0,0,.06)">
				<div style="font-size:2.4rem;line-height:1;margin-bottom:12px">⏱️</div>
				<h3 id="idleWarnTitle" style="margin:0 0 8px;font-size:1.1rem;color:var(--text,#111)">
					Still there?
				</h3>
				<p style="color:var(--muted,#666);font-size:.875rem;margin:0 0 18px;line-height:1.55">
					You've been inactive. You'll be signed out automatically in
				</p>
				<div id="idleCountdown" style="
					font-size:2.4rem;
					font-weight:800;
					color:#ef4444;
					margin-bottom:22px;
					font-variant-numeric:tabular-nums;
					letter-spacing:-1px">
					${formatCountdown(secondsLeft)}
				</div>
				<button id="idleStayBtn" class="btn primary" type="button"
					style="width:100%;padding:11px;font-size:.95rem">
					I'm still here
				</button>
			</div>`;

		document.body.appendChild(warnModalEl);
		document.getElementById('idleStayBtn').focus();

		// "I'm still here" — dismiss and reset all timers
		document.getElementById('idleStayBtn').onclick = () => {
			dismissIdleWarning();
			resetIdleTimers();
		};

		// Update countdown every second
		const countEl = document.getElementById('idleCountdown');
		countdownInterval = setInterval(() => {
			secondsLeft = Math.max(0, secondsLeft - 1);
			if (countEl) countEl.textContent = formatCountdown(secondsLeft);
		}, 1000);
	}

	function initIdleTimer() {
		const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
		let throttle = null;

		function onActivity() {
			if (throttle) return;
			throttle = setTimeout(() => {
				throttle = null;
				if (!warnModalEl) resetIdleTimers(); // only reset if warning isn't showing
			}, 400);
		}

		EVENTS.forEach(evt => document.addEventListener(evt, onActivity, { passive: true }));

		// Start timers if user is already logged in on page load
		if (userIsLoggedIn()) resetIdleTimers();

		// Restart when user logs in
		const _origStart = window.startApp;
		if (typeof _origStart === 'function' && !_origStart._idlePatched) {
			window.startApp = function () {
				const r = _origStart.apply(this, arguments);
				resetIdleTimers();
				return r;
			};
			window.startApp._idlePatched = true;
		}

		// Stop timers cleanly on logout
		const _origLogout = window.performLogout;
		if (typeof _origLogout === 'function' && !_origLogout._idlePatched) {
			window.performLogout = function () {
				clearIdleTimers();
				dismissIdleWarning();
				return _origLogout.apply(this, arguments);
			};
			window.performLogout._idlePatched = true;
		}

		// Also handle SESSION_INVALIDATED 401 responses (from token_version mismatch)
		const _origFetch = window.fetch.bind(window);
		if (!window.fetch._idlePatched) {
			window.fetch = async function (input, init) {
				const res = await _origFetch(input, init);
				if (res.status === 401) {
					res.clone().json().then(body => {
						if (body && body.code === 'SESSION_INVALIDATED') {
							dismissIdleWarning();
							clearIdleTimers();
							if (typeof notify === 'function') {
								notify('Your session was invalidated — please sign in again.', { type: 'warn' });
							}
							setTimeout(() => {
								if (typeof performLogout === 'function') performLogout();
							}, 1200);
						}
					}).catch(() => {});
				}
				return res;
			};
			window.fetch._idlePatched = true;
		}
	}


	// ═══════════════════════════════════════════════════════════════════════════
	// 2. PASSWORD STRENGTH METER
	// ═══════════════════════════════════════════════════════════════════════════

	const STRENGTH_TIERS = [
		{ maxScore: 1, label: 'Very weak',  color: '#ef4444', pct: 14  },
		{ maxScore: 2, label: 'Weak',       color: '#f97316', pct: 30  },
		{ maxScore: 3, label: 'Fair',       color: '#eab308', pct: 54  },
		{ maxScore: 4, label: 'Good',       color: '#22c55e', pct: 74  },
		{ maxScore: 6, label: 'Strong 💪', color: '#16a34a', pct: 100 },
	];

	function scorePassword(pw) {
		if (!pw) return null;
		let score = 0;
		if (pw.length >= 8)          score++;
		if (pw.length >= 12)         score++;
		if (/[a-z]/.test(pw))        score++;
		if (/[A-Z]/.test(pw))        score++;
		if (/\d/.test(pw))           score++;
		if (/[^A-Za-z0-9]/.test(pw)) score++;
		return STRENGTH_TIERS.find(t => score <= t.maxScore) || STRENGTH_TIERS[STRENGTH_TIERS.length - 1];
	}

	/* Wire up the strength meter that already exists in the profile HTML */
	function wireProfileStrengthMeter() {
		const input = document.getElementById('newPassword');
		const bar   = document.getElementById('passStrengthBar');
		const fill  = document.getElementById('passStrengthFill');
		const lbl   = document.getElementById('passStrengthLabel');
		if (!input || !bar || input._strengthWired) return;
		input._strengthWired = true;

		input.addEventListener('input', () => {
			const tier = scorePassword(input.value);
			if (!tier) {
				bar.style.display = 'none';
				if (lbl) lbl.style.display = 'none';
				return;
			}
			bar.style.display = 'block';
			if (fill) { fill.style.width = tier.pct + '%'; fill.style.background = tier.color; }
			if (lbl)  { lbl.style.display = 'block'; lbl.textContent = tier.label; lbl.style.color = tier.color; }
		});
	}

	/* Inject an inline strength meter next to any password input that lacks one */
	function injectStrengthMeter(input) {
		if (!input || input._strengthWired) return;
		input._strengthWired = true;

		const bar  = document.createElement('div');
		bar.style.cssText = 'margin-top:5px;height:4px;border-radius:4px;background:rgba(128,128,128,0.18);display:none;overflow:hidden';
		const fill = document.createElement('div');
		fill.style.cssText = 'height:100%;border-radius:4px;width:0;transition:width .22s ease,background .22s ease';
		bar.appendChild(fill);

		const lbl = document.createElement('div');
		lbl.style.cssText = 'font-size:.75rem;margin-top:3px;display:none;font-weight:600';

		const parent = input.parentNode;
		parent.insertBefore(bar, input.nextSibling);
		parent.insertBefore(lbl, bar.nextSibling);

		input.addEventListener('input', () => {
			const tier = scorePassword(input.value);
			if (!tier) { bar.style.display = 'none'; lbl.style.display = 'none'; return; }
			bar.style.display = 'block';
			fill.style.width  = tier.pct + '%';
			fill.style.background = tier.color;
			lbl.style.display = 'block';
			lbl.textContent   = tier.label;
			lbl.style.color   = tier.color;
		});
	}

	/* Watch for dynamically created password inputs (signup modal, reset modal) */
	function watchForModalPasswords() {
		const observer = new MutationObserver(() => {
			// Signup overlay (always present in DOM)
			const suPass = document.getElementById('overlay-su-password');
			if (suPass && !suPass._strengthWired) injectStrengthMeter(suPass);

			// Reset-password modal (injected by openResetPasswordModal)
			const resetPass = document.getElementById('resetNewPassword');
			if (resetPass && !resetPass._strengthWired) injectStrengthMeter(resetPass);
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}


	// ═══════════════════════════════════════════════════════════════════════════
	// 3. OWN SESSIONS VIEW (injected into Profile page)
	// ═══════════════════════════════════════════════════════════════════════════

	async function fetchMySessions() {
		try {
			const res = await fetch('/api/users/me/sessions', { credentials: 'include' });
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const data = await res.json();
			return data.sessions || [];
		} catch (e) {
			console.warn('[auth-enhancements] fetchMySessions failed:', e.message);
			return null; // null = error, [] = empty
		}
	}

	function parseUserAgent(ua) {
		if (!ua) return { browser: 'Unknown browser', os: 'Unknown OS', icon: '💻' };

		let browser = 'Unknown browser';
		let icon    = '💻';
		let os      = 'Unknown OS';

		// Browser (order matters — check Edge before Chrome, Opera before Chrome)
		if (/Edg\//.test(ua))             { browser = 'Edge';              icon = '🌐'; }
		else if (/OPR\//.test(ua))        { browser = 'Opera';             icon = '🎭'; }
		else if (/Chrome\//.test(ua))     { browser = 'Chrome';            icon = '🌐'; }
		else if (/Firefox\//.test(ua))    { browser = 'Firefox';           icon = '🦊'; }
		else if (/Safari\//.test(ua))     { browser = 'Safari';            icon = '🧭'; }
		else if (/MSIE|Trident/.test(ua)) { browser = 'Internet Explorer'; icon = '🌐'; }

		// OS
		if (/Windows NT/.test(ua))             os = 'Windows';
		else if (/Mac OS X/.test(ua))          os = 'macOS';
		else if (/Android/.test(ua))           os = 'Android';
		else if (/iPhone|iPad|iPod/.test(ua))  os = 'iOS';
		else if (/CrOS/.test(ua))              os = 'ChromeOS';
		else if (/Linux/.test(ua))             os = 'Linux';

		return { browser, os, icon };
	}

	function fmtSessionDate(iso) {
		if (!iso) return '—';
		try {
			return new Date(iso).toLocaleString('en-PH', {
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		} catch { return String(iso); }
	}

	function renderSessionsList(sessions, container) {
		if (!container) return;
		if (sessions === null) {
			container.innerHTML = '<div class="muted small" style="padding:4px 0">Could not load session history. Are you connected?</div>';
			return;
		}
		if (!sessions.length) {
			container.innerHTML = '<div class="muted small" style="padding:4px 0">No session records found.</div>';
			return;
		}

		container.innerHTML = sessions.map((s, i) => {
			const { browser, os, icon } = parseUserAgent(s.user_agent || '');
			const isActive  = !s.logout;
			const lastSeen  = s.last_active_at || s.login;
			const separator = i < sessions.length - 1
				? 'border-bottom:1px solid rgba(0,0,0,0.06);'
				: '';

			return `
				<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;${separator}">
					<div style="font-size:1.4rem;margin-top:1px;flex-shrink:0">${icon}</div>
					<div style="flex:1;min-width:0">
						<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
							<span style="font-weight:700;font-size:.875rem">${browser} on ${os}</span>
							${isActive
								? '<span style="font-size:.72rem;font-weight:700;color:#16a34a;background:rgba(34,197,94,.1);padding:2px 7px;border-radius:20px">● Active</span>'
								: '<span style="font-size:.72rem;color:var(--muted,#888)">Ended</span>'
							}
						</div>
						<div class="muted small" style="margin-top:3px;line-height:1.6">
							<span title="Signed in"><i class="fa fa-right-to-bracket" style="width:13px;margin-right:3px;opacity:.6"></i>${fmtSessionDate(s.login)}</span>
							${s.logout ? `<br><span title="Signed out"><i class="fa fa-right-from-bracket" style="width:13px;margin-right:3px;opacity:.6"></i>${fmtSessionDate(s.logout)}</span>` : ''}
							${lastSeen && lastSeen !== s.login ? `<br><span title="Last active"><i class="fa fa-clock" style="width:13px;margin-right:3px;opacity:.6"></i>Last active: ${fmtSessionDate(lastSeen)}</span>` : ''}
							${s.ip_address ? `<br><span title="IP address"><i class="fa fa-globe" style="width:13px;margin-right:3px;opacity:.6"></i>${s.ip_address}</span>` : ''}
						</div>
					</div>
				</div>`;
		}).join('');
	}

	function injectSessionsCard() {
		// Only inject once; anchor after the #action card inside the profile-right column
		if (document.getElementById('mySessionsSection')) return;
		const actionCard = document.getElementById('action');
		if (!actionCard) return;

		const section = document.createElement('div');
		section.id = 'mySessionsSection';
		section.className = 'card small-card';
		section.style.marginTop = '12px';
		section.innerHTML = `
			<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
				<h3 style="margin:0;font-size:1rem">
					<i class="fa fa-desktop" style="margin-right:7px;opacity:.55"></i>Login Sessions
				</h3>
				<button id="refreshSessionsBtn" class="btn ghost small" type="button"
					title="Refresh sessions" style="padding:4px 8px">
					<i class="fa fa-rotate-right"></i>
				</button>
			</div>
			<div class="muted small" style="margin-bottom:8px">
				Your last 20 sign-in records
			</div>
			<div id="mySessionsList">
				<div class="muted small">Loading…</div>
			</div>`;

		actionCard.parentNode.insertBefore(section, actionCard.nextSibling);

		document.getElementById('refreshSessionsBtn').onclick = () => refreshSessions(true);
	}

	async function refreshSessions(showLoading = false) {
		const list = document.getElementById('mySessionsList');
		if (!list) return;
		if (showLoading) list.innerHTML = '<div class="muted small">Refreshing…</div>';
		const sessions = await fetchMySessions();
		renderSessionsList(sessions, list);
	}

	async function initSessionsCard() {
		injectSessionsCard();
		await refreshSessions();
	}

	// Re-load sessions every time the profile view is opened
	function hookProfileNav() {
		document.addEventListener('click', (e) => {
			const navBtn = e.target.closest('.nav-item[data-view="profile"]');
			if (navBtn) {
				// Small delay so populateProfile() has time to run first
				setTimeout(initSessionsCard, 250);
			}
		}, true);
	}


	// ═══════════════════════════════════════════════════════════════════════════
	// INIT
	// ═══════════════════════════════════════════════════════════════════════════

	function init() {
		// ── 1. Idle timer ──────────────────────────────────────────────────────
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', initIdleTimer);
		} else {
			initIdleTimer();
		}

		// ── 2. Password strength ──────────────────────────────────────────────
		// Profile page elements are static — wire them up as soon as DOM is ready
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', wireProfileStrengthMeter);
		} else {
			wireProfileStrengthMeter();
		}
		// Signup and reset password inputs are created dynamically — watch for them
		watchForModalPasswords();

		// ── 3. Sessions card ──────────────────────────────────────────────────
		hookProfileNav();

		// If profile is already visible on load (rare but possible), inject immediately
		if (document.readyState !== 'loading') {
			const profileView = document.getElementById('view-profile');
			if (profileView && !profileView.classList.contains('hidden')) {
				initSessionsCard();
			}
		}
	}

	init();

})();