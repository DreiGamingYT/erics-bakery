/**
 * auth-features.js  — v2
 * Load AFTER app.js in index.html:
 *   <script src="auth-features.js"></script>
 *
 * Implements:
 *   1. Idle Warning Modal  (MutationObserver on #app .hidden removal)
 *   2. Magic Link Login    (injected into #loginForm + ?magic= URL handler)
 *   3. Own Sessions panel  (appended to #view-profile)
 *   4. Security Audit Log  (appended to #view-profile)
 */
(function () {
	'use strict';

	/* ── tiny helpers ─────────────────────────────────────────────────────── */

	function escH(s) {
		if (s == null) return '';
		return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
			.replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	}

	async function apiFetch(url, opts = {}) {
		const res = await fetch(url, Object.assign(
			{ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || data.message || 'HTTP ' + res.status);
		return data;
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   1.  IDLE WARNING MODAL
	   ═══════════════════════════════════════════════════════════════════════ */

	var IDLE_WARN_MS   = 25 * 60 * 1000;
	var IDLE_TOTAL_MS  = 30 * 60 * 1000;
	var COUNTDOWN_SECS = Math.round((IDLE_TOTAL_MS - IDLE_WARN_MS) / 1000);

	var _warnTimer    = null;
	var _logoutTimer  = null;
	var _countdownInt = null;
	var _idleModal    = null;
	var _idleActive   = false;

	function _resetIdle() {
		clearTimeout(_warnTimer);
		clearTimeout(_logoutTimer);
		clearInterval(_countdownInt);
		_dismissIdle();
		_warnTimer   = setTimeout(_showIdleWarning, IDLE_WARN_MS);
		_logoutTimer = setTimeout(_doIdleLogout,    IDLE_TOTAL_MS);
	}

	function _showIdleWarning() {
		if (_idleModal) return;
		var secs = COUNTDOWN_SECS;

		if (!document.getElementById('_idleStyles')) {
			var st = document.createElement('style');
			st.id = '_idleStyles';
			st.textContent = [
				'#_idleModal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center}',
				'#_idleModal ._bd{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px)}',
				'#_idleModal ._box{position:relative;background:var(--card,#fff);border-radius:18px;padding:32px 28px;',
				'  width:min(92vw,380px);text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.22);animation:_idleIn .2s ease}',
				'@keyframes _idleIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}',
				'#_idleModal h3{margin:0 0 8px;font-size:20px;font-weight:800;color:var(--text,#111)}',
				'#_idleModal p{color:var(--muted,#666);font-size:14px;margin:0 0 18px;line-height:1.5}',
				'#_idleModal ._num{font-size:52px;font-weight:900;color:#dc2626;line-height:1}',
				'#_idleModal ._unit{color:var(--muted,#888);font-size:13px;margin:2px 0 22px}',
				'#_idleModal ._btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}',
				'#_idleModal ._btns button{min-width:140px}'
			].join('');
			document.head.appendChild(st);
		}

		_idleModal = document.createElement('div');
		_idleModal.id = '_idleModal';
		_idleModal.setAttribute('role', 'alertdialog');
		_idleModal.setAttribute('aria-modal', 'true');
		_idleModal.innerHTML = '<div class="_bd"></div>'
			+ '<div class="_box">'
			+ '<div style="font-size:40px;margin-bottom:10px">&#x23F1;&#xFE0F;</div>'
			+ '<h3>Still there?</h3>'
			+ '<p>You\'ve been inactive. For your security, you\'ll be signed out automatically.</p>'
			+ '<div class="_num" id="_idleSecs">' + secs + '</div>'
			+ '<div class="_unit">seconds remaining</div>'
			+ '<div class="_btns">'
			+ '<button id="_idleStay"    class="btn primary" type="button">Keep me signed in</button>'
			+ '<button id="_idleSignOut" class="btn ghost"   type="button">Sign out now</button>'
			+ '</div></div>';
		document.body.appendChild(_idleModal);

		document.getElementById('_idleStay').addEventListener('click', function () {
			_resetIdle();
			fetch('/api/auth/heartbeat', { method: 'PUT', credentials: 'include' }).catch(function(){});
		});
		document.getElementById('_idleSignOut').addEventListener('click', function () {
			clearInterval(_countdownInt);
			_doIdleLogout();
		});
		setTimeout(function () { var el = document.getElementById('_idleStay'); if (el) el.focus(); }, 50);

		_countdownInt = setInterval(function () {
			secs = Math.max(0, secs - 1);
			var el = document.getElementById('_idleSecs');
			if (el) el.textContent = secs;
		}, 1000);
	}

	function _dismissIdle() {
		if (_idleModal) { _idleModal.remove(); _idleModal = null; }
		clearInterval(_countdownInt);
	}

	function _doIdleLogout() {
		_dismissIdle();
		if (typeof performLogout === 'function') {
			performLogout();
		} else {
			fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
				.finally(function () { location.reload(); });
		}
	}

	function startIdleTracking() {
		if (_idleActive) return;
		_idleActive = true;
		var EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
		var _last = 0;
		function throttled() {
			var now = Date.now();
			if (now - _last > 10000) { _last = now; _resetIdle(); }
		}
		EVENTS.forEach(function (ev) { document.addEventListener(ev, throttled, { passive: true }); });
		_resetIdle();
		console.log('[auth-features] Idle tracking started');
	}

	// Watch #app for its "hidden" class being removed → user just logged in
	function watchForLogin() {
		var appEl = document.getElementById('app');
		if (!appEl) { setTimeout(watchForLogin, 200); return; }

		// If the app is already visible (persistent session auto-login)
		if (!appEl.classList.contains('hidden')) {
			startIdleTracking();
			return;
		}

		var obs = new MutationObserver(function () {
			if (!appEl.classList.contains('hidden')) {
				obs.disconnect();
				startIdleTracking();
			}
		});
		obs.observe(appEl, { attributes: true, attributeFilter: ['class'] });
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   2.  MAGIC LINK
	   ═══════════════════════════════════════════════════════════════════════ */

	function injectMagicLinkUI() {
		var form = document.getElementById('loginForm');
		if (!form || form._magicInjected) return;
		form._magicInjected = true;

		var wrap = document.createElement('div');
		wrap.id = '_magicWrap';
		wrap.innerHTML = ''
			+ '<div style="display:flex;align-items:center;gap:10px;margin:18px 0 14px">'
			+   '<div style="flex:1;height:1px;background:rgba(255,255,255,.15)"></div>'
			+   '<span style="font-size:12px;color:rgba(255,255,255,.55);white-space:nowrap">or sign in without a password</span>'
			+   '<div style="flex:1;height:1px;background:rgba(255,255,255,.15)"></div>'
			+ '</div>'
			+ '<div id="_mlForm">'
			+   '<input id="_mlEmail" type="email" placeholder="Enter your email address" autocomplete="email"'
			+     ' style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:10px 14px;border-radius:10px;'
			+     'border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font-size:14px;outline:none" />'
			+   '<button id="_mlSendBtn" type="button"'
			+     ' style="width:100%;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.25);'
			+     'background:rgba(255,255,255,.1);color:#fff;font-size:13px;font-weight:700;cursor:pointer;'
			+     'display:flex;align-items:center;justify-content:center;gap:8px">'
			+     '<i class="fa fa-envelope"></i> Send me a sign-in link'
			+   '</button>'
			+ '</div>'
			+ '<div id="_mlSent" style="display:none;padding:14px;border-radius:10px;margin-top:4px;'
			+   'background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);color:#86efac;font-size:13px;text-align:center">'
			+   '<strong>&#x2705; Link sent!</strong><br/>'
			+   'Check your email — the link expires in 15 minutes.<br/>'
			+   '<button id="_mlResend" type="button"'
			+     ' style="margin-top:8px;background:none;border:none;color:#86efac;cursor:pointer;font-size:12px;text-decoration:underline">'
			+     'Send another</button>'
			+ '</div>';

		form.appendChild(wrap);

		document.getElementById('_mlSendBtn').addEventListener('click', _sendMagicLink);
		document.getElementById('_mlEmail').addEventListener('keydown', function (e) {
			if (e.key === 'Enter') _sendMagicLink();
		});
		document.getElementById('_mlResend').addEventListener('click', function () {
			document.getElementById('_mlSent').style.display = 'none';
			document.getElementById('_mlForm').style.display = '';
			var inp = document.getElementById('_mlEmail');
			if (inp) { inp.value = ''; inp.focus(); }
		});
	}

	async function _sendMagicLink() {
		var inp   = document.getElementById('_mlEmail');
		var btn   = document.getElementById('_mlSendBtn');
		var email = (inp ? inp.value : '').trim();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			if (inp) {
				inp.style.outline = '2px solid #f87171';
				setTimeout(function () { inp.style.outline = ''; }, 1500);
				inp.focus();
			}
			return;
		}

		if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending\u2026'; }
		try {
			await apiFetch('/api/auth/magic-link/request', {
				method: 'POST',
				body: JSON.stringify({ email: email })
			});
			document.getElementById('_mlForm').style.display = 'none';
			document.getElementById('_mlSent').style.display = '';
		} catch (err) {
			if (typeof notify === 'function') {
				notify('Couldn\'t send link: ' + err.message, { type: 'error' });
			} else {
				alert('Couldn\'t send link: ' + err.message);
			}
		} finally {
			if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-envelope"></i> Send me a sign-in link'; }
		}
	}

	async function handleMagicLinkInUrl() {
		var token = new URLSearchParams(window.location.search).get('magic');
		if (!token) return;

		// Strip the token from the URL immediately
		window.history.replaceState({}, document.title, window.location.pathname);

		// Show loader
		if (typeof showGlobalLoader === 'function') {
			showGlobalLoader(true, 'Signing you in\u2026', 'Verifying your magic link');
		}

		try {
			var data = await apiFetch('/api/auth/magic-link/verify?token=' + encodeURIComponent(token));
			if (!data.ok || !data.user) throw new Error('Verification failed');

			if (typeof setSession    === 'function') setSession(data.user, false);
			if (typeof setPersistentSession === 'function') setPersistentSession(null); // don't persist
			window.currentUser = data.user;

			if (typeof showGlobalLoader === 'function') showGlobalLoader(false);
			if (typeof startApp         === 'function') startApp();
			if (typeof applyTheme       === 'function') applyTheme(localStorage.getItem('bakery_theme') || 'light');
			if (typeof notify           === 'function')
				notify('Welcome back, ' + (data.user.name || data.user.username) + '! \uD83D\uDC4B', { type: 'success' });

		} catch (err) {
			if (typeof showGlobalLoader === 'function') showGlobalLoader(false);

			// Show login overlay with an error banner
			if (typeof showOverlay === 'function') {
				showOverlay(true, true);
			} else {
				var ov = document.getElementById('landingOverlay');
				if (ov) ov.classList.remove('hidden');
			}

			setTimeout(function () {
				var errDiv = document.createElement('div');
				errDiv.style.cssText = 'margin:0 0 12px;padding:10px 14px;border-radius:8px;'
					+ 'background:rgba(239,68,68,.12);color:#fca5a5;font-size:13px;font-weight:700';
				errDiv.textContent = '\u26A0\uFE0F Sign-in link error: ' + err.message;
				var form = document.getElementById('loginForm');
				if (form) form.insertBefore(errDiv, form.firstChild);
			}, 200);
		}
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   3.  OWN SESSIONS PANEL
	   ═══════════════════════════════════════════════════════════════════════ */

	async function renderOwnSessions(container) {
		container.innerHTML = '<p style="color:var(--muted,#888);font-size:13px;padding:8px 0">Loading\u2026</p>';
		try {
			var d = await apiFetch('/api/auth/sessions/me');
			var sessions = d.sessions || [];
			if (!sessions.length) {
				container.innerHTML = '<p style="color:var(--muted,#888);font-size:13px">No sessions found.</p>';
				return;
			}
			var now = Date.now();
			container.innerHTML = sessions.map(function (s) {
				var loginStr  = s.logged_in_at  ? new Date(s.logged_in_at).toLocaleString()  : '\u2014';
				var logoutStr = s.logged_out_at ? new Date(s.logged_out_at).toLocaleString() : null;
				var lastAt    = s.last_active_at ? new Date(s.last_active_at) : null;
				var active    = !s.logged_out_at && lastAt && (now - lastAt.getTime()) < 12 * 60 * 1000;
				var ua        = _parseUA(s.user_agent || '');
				var badge     = active
					? '<span style="padding:3px 10px;border-radius:20px;background:rgba(34,197,94,.12);color:#15803d;font-size:11px;font-weight:700">\u25CF Active</span>'
					: logoutStr
						? '<span style="padding:3px 10px;border-radius:20px;background:rgba(0,0,0,.06);color:var(--muted,#888);font-size:11px">Ended</span>'
						: '<span style="padding:3px 10px;border-radius:20px;background:rgba(234,179,8,.12);color:#a16207;font-size:11px">Idle</span>';
				return '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;'
					+ 'gap:10px;padding:12px;border-radius:10px;background:var(--bg,#f8fafc);margin-bottom:8px">'
					+ '<div style="display:flex;gap:12px;align-items:center">'
					+ '<span style="font-size:22px">' + ua.icon + '</span>'
					+ '<div>'
					+ '<div style="font-weight:700;font-size:13px">' + escH(ua.browser) + ' on ' + escH(ua.os) + '</div>'
					+ '<div style="font-size:12px;color:var(--muted,#888)">IP: ' + escH(s.ip_address || 'Unknown') + ' \u00B7 Signed in: ' + loginStr + '</div>'
					+ (logoutStr ? '<div style="font-size:12px;color:var(--muted,#888)">Signed out: ' + logoutStr + '</div>' : '')
					+ '</div></div>'
					+ '<div>' + badge + '</div></div>';
			}).join('');
		} catch (e) {
			container.innerHTML = '<p style="color:#dc2626;font-size:13px">Failed to load sessions: ' + escH(e.message) + '</p>';
		}
	}

	function _parseUA(ua) {
		var B = [
			{ re: /Edg\//i,     name: 'Edge',    icon: '\uD83C\uDF10' },
			{ re: /OPR\//i,     name: 'Opera',   icon: '\uD83C\uDF10' },
			{ re: /Chrome\//i,  name: 'Chrome',  icon: '\uD83C\uDF10' },
			{ re: /Firefox\//i, name: 'Firefox', icon: '\uD83E\uDD8A' },
			{ re: /Safari\//i,  name: 'Safari',  icon: '\uD83E\uDDED' },
		];
		var O = [
			{ re: /Windows NT/i,  name: 'Windows' },
			{ re: /Mac OS X/i,    name: 'macOS'   },
			{ re: /Android/i,     name: 'Android' },
			{ re: /iPhone|iPad/i, name: 'iOS'     },
			{ re: /Linux/i,       name: 'Linux'   },
		];
		var browser = B.find(function (b) { return b.re.test(ua); }) || { name: 'Unknown', icon: '\uD83D\uDCBB' };
		var os      = O.find(function (o) { return o.re.test(ua); }) || { name: 'Unknown OS' };
		return { browser: browser.name, os: os.name, icon: browser.icon };
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   4.  SECURITY AUDIT LOG PANEL
	   ═══════════════════════════════════════════════════════════════════════ */

	var EVENT_LABELS = {
		login_success:        { label: 'Signed in',                icon: '\u2705', color: '#15803d' },
		login_failed:         { label: 'Failed sign-in attempt',   icon: '\u26A0\uFE0F', color: '#b45309' },
		logout:               { label: 'Signed out',               icon: '\uD83D\uDEAA', color: '#4338ca' },
		password_changed:     { label: 'Password changed',         icon: '\uD83D\uDD11', color: '#0369a1' },
		magic_link_requested: { label: 'Magic link requested',     icon: '\u2709\uFE0F', color: '#6d28d9' },
		magic_link_used:      { label: 'Signed in via magic link', icon: '\uD83D\uDD17', color: '#0891b2' },
		role_changed:         { label: 'Role changed',             icon: '\uD83D\uDEE1\uFE0F', color: '#c2410c' },
	};

	async function renderAuditLog(container) {
		container.innerHTML = '<p style="color:var(--muted,#888);font-size:13px;padding:8px 0">Loading\u2026</p>';
		try {
			var d = await apiFetch('/api/auth/audit-log/me?limit=50');
			var logs = d.logs || [];
			if (!logs.length) {
				container.innerHTML = '<p style="color:var(--muted,#888);font-size:13px">No security events recorded yet.</p>';
				return;
			}
			container.innerHTML = logs.map(function (log) {
				var meta    = EVENT_LABELS[log.event_type] || { label: log.event_type, icon: '\u2139\uFE0F', color: 'var(--muted,#888)' };
				var timeStr = log.created_at ? new Date(log.created_at).toLocaleString() : '\u2014';
				var ua      = _parseUA(log.user_agent || '');
				var extra   = '';
				try {
					var m = typeof log.meta === 'string' ? JSON.parse(log.meta) : (log.meta || {});
					if (log.event_type === 'role_changed') {
						extra = '&nbsp;<span style="font-size:11px;background:rgba(0,0,0,.06);border-radius:4px;padding:2px 6px">'
							+ escH(m.from_role || '?') + ' \u2192 ' + escH(m.to_role || '?') + '</span>';
					}
				} catch (ex) {}

				return '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;'
					+ 'border-radius:10px;background:var(--bg,#f8fafc);margin-bottom:6px">'
					+ '<div style="font-size:18px;min-width:24px;text-align:center;line-height:1.5">' + meta.icon + '</div>'
					+ '<div style="flex:1;min-width:0">'
					+ '<div style="font-weight:700;font-size:13px;color:' + meta.color + '">' + meta.label + extra + '</div>'
					+ '<div style="font-size:12px;color:var(--muted,#888)">' + timeStr + ' \u00B7 IP: ' + escH(log.ip_address || 'Unknown') + '</div>'
					+ '<div style="font-size:11px;color:var(--muted,#999)">' + escH(ua.browser) + ' on ' + escH(ua.os) + '</div>'
					+ '</div></div>';
			}).join('');
		} catch (e) {
			container.innerHTML = '<p style="color:#dc2626;font-size:13px">Failed to load security log: ' + escH(e.message) + '</p>';
		}
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Profile panel injector  (called every time populateProfile runs)
	   ═══════════════════════════════════════════════════════════════════════ */

	function ensureProfilePanels() {
		var profileView = document.getElementById('view-profile');
		if (!profileView) return;

		// Inject Sessions card once
		if (!document.getElementById('_sessCard')) {
			var sessCard = document.createElement('div');
			sessCard.id = '_sessCard';
			sessCard.className = 'card';
			sessCard.style.marginTop = '20px';
			sessCard.innerHTML = ''
				+ '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">'
				+   '<h3 style="margin:0;font-size:15px;font-weight:800">'
				+     '<i class="fa fa-laptop" style="margin-right:8px;color:var(--accent,#1b85ec)"></i>My Active Sessions'
				+   '</h3>'
				+   '<button id="_sessRefresh" class="btn ghost small" type="button">'
				+     '<i class="fa fa-rotate-right" style="margin-right:5px"></i>Refresh'
				+   '</button>'
				+ '</div>'
				+ '<p style="font-size:13px;color:var(--muted,#888);margin:0 0 10px">'
				+   'Devices and browsers where you are currently or recently signed in.'
				+ '</p>'
				+ '<div id="_sessList"></div>';
			profileView.appendChild(sessCard);
			document.getElementById('_sessRefresh').addEventListener('click', function () {
				renderOwnSessions(document.getElementById('_sessList'));
			});
		}

		// Inject Audit Log card once
		if (!document.getElementById('_auditCard')) {
			var auditCard = document.createElement('div');
			auditCard.id = '_auditCard';
			auditCard.className = 'card';
			auditCard.style.marginTop = '20px';
			auditCard.innerHTML = ''
				+ '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">'
				+   '<h3 style="margin:0;font-size:15px;font-weight:800">'
				+     '<i class="fa fa-shield-halved" style="margin-right:8px;color:var(--accent,#1b85ec)"></i>Security Log'
				+   '</h3>'
				+   '<button id="_auditRefresh" class="btn ghost small" type="button">'
				+     '<i class="fa fa-rotate-right" style="margin-right:5px"></i>Refresh'
				+   '</button>'
				+ '</div>'
				+ '<p style="font-size:13px;color:var(--muted,#888);margin:0 0 10px">'
				+   'Your recent account security events.'
				+ '</p>'
				+ '<div id="_auditList"></div>';
			profileView.appendChild(auditCard);
			document.getElementById('_auditRefresh').addEventListener('click', function () {
				renderAuditLog(document.getElementById('_auditList'));
			});
		}

		// Refresh data every time this runs (i.e. every time the profile view opens)
		renderOwnSessions(document.getElementById('_sessList'));
		renderAuditLog(document.getElementById('_auditList'));
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   Patch populateProfile to call ensureProfilePanels after it resolves
	   ═══════════════════════════════════════════════════════════════════════ */

	function patchPopulateProfile() {
		if (!window.populateProfile || window.populateProfile._authFeatPatched) return;
		var orig = window.populateProfile;
		window.populateProfile = async function () {
			await orig.apply(this, arguments);
			ensureProfilePanels();
		};
		window.populateProfile._authFeatPatched = true;
		console.log('[auth-features] populateProfile patched');
	}

	/* ═══════════════════════════════════════════════════════════════════════
	   INIT
	   ═══════════════════════════════════════════════════════════════════════ */

	function init() {
		// Handle ?magic= token in URL immediately (before DOM is fully ready)
		handleMagicLinkInUrl();

		function onReady() {
			// Inject magic link section into #loginForm (always in DOM, just hidden)
			injectMagicLinkUI();

			// Start watching for #app.hidden removal (= login completed)
			watchForLogin();

			// Patch populateProfile if already available
			patchPopulateProfile();
		}

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', onReady);
		} else {
			onReady();
		}

		// Polling fallback: app.js and notifications.js may define/re-wrap
		// populateProfile after our script runs — keep retrying for a few seconds
		var attempts = 0;
		var poll = setInterval(function () {
			patchPopulateProfile();
			injectMagicLinkUI();
			if (++attempts >= 60) clearInterval(poll);
		}, 100);
	}

	init();

})();