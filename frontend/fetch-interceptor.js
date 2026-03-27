(function () {
	'use strict';

	if (window._bakeryFetchPatched) return;
	window._bakeryFetchPatched = true;

	const _orig    = window.fetch.bind(window);
	const STOCK_RE = /\/api\/ingredients\/\d+\/stock/;

	window.fetch = async function (input, init) {
		const url    = typeof input === 'string' ? input : (input?.url || '');
		const method = ((init && init.method) || 'GET').toUpperCase();

		const res = await _orig(input, init);

		if (res.status === 401) {
			res.clone().json().then(body => {
				if (body && body.code === 'SESSION_INVALIDATED') {
					if (typeof dismissIdleWarning === 'function') dismissIdleWarning();
					if (typeof clearIdleTimers   === 'function') clearIdleTimers();
					if (typeof notify === 'function')
						notify('Your session was invalidated — please sign in again.', { type: 'warn' });
					setTimeout(() => {
						if (typeof performLogout === 'function') performLogout();
					}, 1200);
				}
			}).catch(() => {});
		}

		if (STOCK_RE.test(url) && res.ok) {
			res.clone().json().then(() => {
				if (typeof window._checkAlertsNow === 'function') window._checkAlertsNow();
			}).catch(() => {});
		}

		if (method === 'POST' && /\/api\/auth\/login$/.test(url) && res.status === 403) {
			res.clone().json().then(data => {
				if (!data) return;
				if (data.code === 'ACCOUNT_PENDING') {
					setTimeout(() => {
						if (typeof notify === 'function')
							notify(data.message || "Your account is awaiting admin approval. You'll be notified by email once activated.", { type: 'info', duration: 7000 });
					}, 60);
				} else if (data.code === 'ACCOUNT_REJECTED') {
					setTimeout(() => {
						if (typeof notify === 'function')
							notify(data.message || 'Your account registration was not approved. Please contact the bakery admin.', { type: 'error', duration: 9000 });
					}, 60);
				}
			}).catch(() => {});
		}

		return res;
	};
})();