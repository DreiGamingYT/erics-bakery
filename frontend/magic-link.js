/**
 * magic-link.js
 * Passwordless / magic-link sign-in for Eric's Bakery.
 *
 * Responsibilities:
 *   1. On page load: detect ?mltoken= in the URL, auto-verify and log the user in.
 *   2. Inject an "✉ Email me a sign-in link" button into the login form.
 *   3. Handle the request modal: collect email → POST → show confirmation.
 *
 * Load this AFTER app.js in index.html:
 *   <script src="/magic-link.js"></script>
 */
(function () {
	'use strict';

	// ── Helpers ────────────────────────────────────────────────────────────────

	function esc(str) {
		return String(str || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function toast(msg, type) {
		if (typeof window.notify === 'function') {
			window.notify(msg, { type: type || 'info' });
		} else {
			console.log('[magic-link]', msg);
		}
	}

	// ── Auto-verify token from URL ─────────────────────────────────────────────

	function getTokenFromURL() {
		try {
			const p = new URLSearchParams(window.location.search);
			return p.get('mltoken') || null;
		} catch (e) { return null; }
	}

	function cleanURL() {
		try {
			const url = new URL(window.location.href);
			url.searchParams.delete('mltoken');
			window.history.replaceState({}, '', url.pathname + (url.search === '?' ? '' : url.search));
		} catch (e) {}
	}

	function showVerifyingOverlay() {
		if (document.getElementById('mlVerifyingOverlay')) return;
		const el = document.createElement('div');
		el.id = 'mlVerifyingOverlay';
		el.setAttribute('role', 'status');
		el.setAttribute('aria-live', 'polite');
		el.style.cssText = [
			'position:fixed;inset:0;z-index:99500',
			'background:linear-gradient(135deg,#0f2b4b 0%,#1b85ec 100%)',
			'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px',
			'color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
		].join(';');
		el.innerHTML = `
			<svg width="54" height="54" viewBox="0 0 50 50" fill="none" aria-hidden="true">
				<circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>
				<path d="M25 5 a20 20 0 0 1 0 40" stroke="#fff" stroke-width="4" stroke-linecap="round">
					<animateTransform attributeName="transform" type="rotate" dur="0.9s"
						from="0 25 25" to="360 25 25" repeatCount="indefinite"/>
				</path>
			</svg>
			<div style="text-align:center">
				<div style="font-size:1.3rem;font-weight:700;margin-bottom:6px">Signing you in…</div>
				<div id="mlVerifyMsg" style="opacity:.75;font-size:.9rem">Verifying your sign-in link</div>
			</div>`;
		document.body.appendChild(el);
		return el;
	}

	function updateVerifyMsg(msg) {
		const el = document.getElementById('mlVerifyMsg');
		if (el) el.textContent = msg;
	}

	function removeVerifyingOverlay() {
		const el = document.getElementById('mlVerifyingOverlay');
		if (el) {
			el.style.transition = 'opacity 0.4s ease';
			el.style.opacity = '0';
			setTimeout(() => { try { el.remove(); } catch (e) {} }, 450);
		}
	}

	async function verifyMagicToken(rawToken) {
		showVerifyingOverlay();
		cleanURL(); // remove token from URL immediately — before any async work

		try {
			const res = await fetch('/api/auth/magic-link/verify', {
				method:      'POST',
				credentials: 'include',
				headers:     { 'Content-Type': 'application/json' },
				body:        JSON.stringify({ token: rawToken })
			});
			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				removeVerifyingOverlay();
				// Wait a moment for the login UI to be ready, then show the error
				setTimeout(() => {
					toast(data.error || 'Sign-in link is invalid or has expired. Please request a new one.', 'error');
					// Make sure the overlay (login screen) is visible
					if (typeof showOverlay === 'function') showOverlay(true, true);
				}, 500);
				return;
			}

			// Success — build session exactly like the normal login handler does
			const user = data.user;
			updateVerifyMsg('Signed in! Loading your dashboard…');

			if (typeof setSession === 'function') {
				setSession({
					id:       user.id,
					username: user.username,
					role:     user.role,
					name:     user.name || user.username
				}, true); // persist = true
			}
			if (typeof saveRecentProfileLocally === 'function') {
				saveRecentProfileLocally(user.username);
			}

			// Small delay so the "Signed in" message is readable
			setTimeout(() => {
				removeVerifyingOverlay();
				if (typeof startApp === 'function')     startApp();
				if (typeof applyTheme === 'function')   applyTheme(localStorage.getItem('bakery_theme') || 'light');
			}, 700);

		} catch (networkErr) {
			console.error('[magic-link] verify network error', networkErr);
			removeVerifyingOverlay();
			setTimeout(() => {
				toast('Network error — could not verify sign-in link. Please try again.', 'error');
				if (typeof showOverlay === 'function') showOverlay(true, true);
			}, 500);
		}
	}

	// ── Inject "Email me a sign-in link" button into login form ───────────────

	function injectMagicLinkButton() {
		if (document.getElementById('magicLinkBtn')) return;
		const forgotBtn = document.getElementById('forgotPasswordBtn');
		if (!forgotBtn) return;

		// ── Inject scoped CSS once ─────────────────────────────────────────────
		if (!document.getElementById('mlBtnStyles')) {
			const style = document.createElement('style');
			style.id = 'mlBtnStyles';
			style.textContent = `
				/* Magic-link login button layout */
				#loginForm .form-actions {
					display: flex !important;
					flex-direction: column !important;
					gap: 8px !important;
					padding-top: 12px !important;
				}
				#overlaySignInBtn {
					width: 100% !important;
				}
				#ml-secondary-row {
					display: flex;
					flex-wrap: wrap;
					gap: 6px;
					width: 100%;
				}
				#forgotPasswordBtn,
				#magicLinkBtn {
					flex: 1 1 0;
					min-width: 130px;
					justify-content: center;
					display: inline-flex !important;
					align-items: center;
					gap: 6px;
					padding: 10px 10px !important;
					font-size: 13px;
					white-space: nowrap;
					text-align: center;
				}
				@media (max-width: 380px) {
					#forgotPasswordBtn,
					#magicLinkBtn {
						flex: 1 1 100%;
					}
				}
			`;
			document.head.appendChild(style);
		}

		// ── Build the magic link button ────────────────────────────────────────
		const btn = document.createElement('button');
		btn.id        = 'magicLinkBtn';
		btn.type      = 'button';
		btn.className = 'btn ghost small';
		btn.innerHTML = '<i class="fa fa-envelope" aria-hidden="true"></i> Email sign-in';
		btn.addEventListener('click', openMagicLinkModal);

		// ── Restructure: pull forgotBtn out of its wrapper div,
		//    put both secondary buttons in a new #ml-secondary-row div ───────────
		const forgotParent = forgotBtn.parentElement;
		const formActions  = forgotBtn.closest('.form-actions');

		// Create the secondary row container
		const row = document.createElement('div');
		row.id = 'ml-secondary-row';
		row.appendChild(forgotBtn);   // move forgotBtn into row
		row.appendChild(btn);         // add magic link btn into row

		if (forgotParent && forgotParent !== formActions) {
			// forgotBtn was inside a wrapper <div> — replace that div with our row
			forgotParent.replaceWith(row);
		} else if (formActions) {
			// forgotBtn was directly in form-actions — just append the row
			formActions.appendChild(row);
		}
	}

	// ── Magic link request modal ───────────────────────────────────────────────

	function openMagicLinkModal() {
		// Use the existing modal infrastructure from app.js if available
		if (typeof openModalHTML === 'function') {
			openModalHTML(`
				<h3 style="margin:0 0 6px">Email sign-in link</h3>
				<p class="muted small" style="margin:0 0 16px;line-height:1.5">
					Enter your registered email address. We'll send you a one-click sign-in link valid for 15 minutes.
				</p>
				<div id="mlRequestForm" class="form">
					<label class="field">
						<span class="field-label">Email address</span>
						<input id="mlEmailInput" type="email" placeholder="you@example.com"
							autocomplete="email" style="width:100%"/>
					</label>
					<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
						<button class="btn ghost" id="mlCancelBtn" type="button">Cancel</button>
						<button class="btn primary" id="mlSendBtn" type="button">
							<i class="fa fa-paper-plane" style="margin-right:6px"></i>Send link
						</button>
					</div>
					<div id="mlModalStatus" style="margin-top:10px;min-height:20px"></div>
				</div>`
			);

			document.getElementById('mlCancelBtn')?.addEventListener('click', () => {
				if (typeof closeModal === 'function') closeModal();
			});

			const emailInput = document.getElementById('mlEmailInput');
			const sendBtn    = document.getElementById('mlSendBtn');

			if (emailInput) {
				emailInput.focus();
				// Allow pressing Enter to submit
				emailInput.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') { e.preventDefault(); sendBtn?.click(); }
				});
			}

			sendBtn?.addEventListener('click', () => submitMagicLinkRequest(emailInput, sendBtn));
		} else {
			// Fallback: simple prompt
			const email = window.prompt('Enter your registered email address:');
			if (email && email.trim()) submitMagicLinkRequestFallback(email.trim());
		}
	}

	function setModalStatus(msg, type) {
		const el = document.getElementById('mlModalStatus');
		if (!el) return;
		el.textContent = msg;
		el.style.color  = type === 'error'   ? '#dc2626'
		                : type === 'success'  ? '#16a34a'
		                :                       '#475569';
		el.style.fontWeight = type === 'success' ? '600' : '400';
	}

	async function submitMagicLinkRequest(emailInput, sendBtn) {
		const email = (emailInput?.value || '').trim();
		if (!email) {
			setModalStatus('Please enter your email address.', 'error');
			emailInput?.focus();
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			setModalStatus('Please enter a valid email address.', 'error');
			emailInput?.focus();
			return;
		}

		if (sendBtn) {
			sendBtn.disabled  = true;
			sendBtn.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right:6px"></i>Sending…';
		}
		setModalStatus('', '');

		try {
			const res  = await fetch('/api/auth/magic-link/request', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ email })
			});
			const rawText = await res.text();
			let data = {};
			try { data = JSON.parse(rawText); } catch (e) {
				console.error('[magic-link] Server returned non-JSON:', res.status, rawText.slice(0, 500));
			}

			if (!res.ok) {
				const msg = data.error || `Server error ${res.status}: ${rawText.slice(0, 200)}`;
				setModalStatus(msg, 'error');
				if (sendBtn) {
					sendBtn.disabled  = false;
					sendBtn.innerHTML = '<i class="fa fa-paper-plane" style="margin-right:6px"></i>Send link';
				}
				return;
			}

			// Replace form with success message
			const form = document.getElementById('mlRequestForm');
			if (form) {
				form.innerHTML = `
					<div style="text-align:center;padding:10px 0 6px">
						<div style="font-size:2rem;margin-bottom:10px">📬</div>
						<div style="font-weight:700;font-size:1rem;margin-bottom:8px;color:var(--text,#111)">
							Check your inbox
						</div>
						<div class="muted small" style="line-height:1.6;max-width:280px;margin:0 auto">
							If <strong>${esc(email)}</strong> is registered, a sign-in link has been sent.
							The link expires in <strong>15 minutes</strong>.
						</div>
						<button class="btn ghost small" id="mlDoneBtn" type="button" style="margin-top:16px">
							Close
						</button>
					</div>`;
				document.getElementById('mlDoneBtn')?.addEventListener('click', () => {
					if (typeof closeModal === 'function') closeModal();
				});
			}
		} catch (err) {
			console.error('[magic-link] request error', err);
			setModalStatus('Network error — please check your connection and try again.', 'error');
			if (sendBtn) {
				sendBtn.disabled  = false;
				sendBtn.innerHTML = '<i class="fa fa-paper-plane" style="margin-right:6px"></i>Send link';
			}
		}
	}

	async function submitMagicLinkRequestFallback(email) {
		try {
			const res  = await fetch('/api/auth/magic-link/request', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ email })
			});
			const data = await res.json().catch(() => ({}));
			toast(res.ok ? (data.message || 'Sign-in link sent — check your email.') : (data.error || 'Failed to send link.'), res.ok ? 'success' : 'error');
		} catch (e) {
			toast('Network error sending sign-in link.', 'error');
		}
	}

	// ── Init ───────────────────────────────────────────────────────────────────

	function init() {
		// 1. Check for magic token in URL — do this before the splash screen fades
		const rawToken = getTokenFromURL();
		if (rawToken) {
			// Wait for DOM + app.js to be ready, then verify
			const doVerify = () => verifyMagicToken(rawToken);
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', doVerify);
			} else {
				// Give app.js ~200ms to finish defining startApp/setSession
				setTimeout(doVerify, 200);
			}
			return; // no need to inject the button if we're auto-signing in
		}

		// 2. Inject the magic link button into the login form
		const inject = () => {
			// Retry until forgotPasswordBtn is in DOM (it's static HTML, so should be immediate)
			if (document.getElementById('forgotPasswordBtn')) {
				injectMagicLinkButton();
			} else {
				// Button not found yet — watch for it
				const obs = new MutationObserver(() => {
					if (document.getElementById('forgotPasswordBtn')) {
						obs.disconnect();
						injectMagicLinkButton();
					}
				});
				obs.observe(document.body, { childList: true, subtree: true });
			}
		};

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', inject);
		} else {
			inject();
		}
	}

	init();

})();