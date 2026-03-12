/**
 * account-activation-backend.js
 * Backend routes + email functions for admin-gated account activation.
 *
 * USAGE — add two lines to index.js:
 *
 *   // Near the top (after pool, mailTransporter, buildEmailWrapper are defined):
 *   const registerActivationRoutes = require('./account-activation-backend');
 *
 *   // After your existing routes (e.g. after the magic-link routes):
 *   registerActivationRoutes(app, pool, {
 *     authMiddleware,
 *     mailTransporter,
 *     EMAIL_FROM,
 *     buildEmailWrapper,
 *     ADMIN_EMAIL: process.env.ADMIN_EMAIL || SMTP_USER,
 *     FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'https://erics-bakery.vercel.app'
 *   });
 *
 * Also apply the three small changes marked with ── CHANGE ── below to the
 * existing signup and login routes in index.js (see SETUP.md for line-by-line
 * instructions).
 */

'use strict';

module.exports = function registerActivationRoutes(app, pool, deps) {

	const {
		authMiddleware,
		mailTransporter,
		EMAIL_FROM,
		buildEmailWrapper,
		ADMIN_EMAIL,
		FRONTEND_ORIGIN
	} = deps;

	const LOGO_URL = process.env.RESET_EMAIL_LOGO_URL || 'https://i.ibb.co/9HshkkkB/logo.png';

	// ── Email helpers ─────────────────────────────────────────────────────────

	/**
	 * Notify the admin that a new account is waiting for approval.
	 */
	async function sendActivationRequestEmail(adminEmail, newName, newEmail, newRole) {
		if (!adminEmail) {
			console.warn('[activation] ADMIN_EMAIL not set — skipping admin notification.');
			return;
		}
		const loginUrl = FRONTEND_ORIGIN || 'https://erics-bakery.vercel.app';
		const subject  = `Eric's Bakery — New account pending approval`;
		const plain    = [
			`A new user has signed up and is awaiting your approval.`,
			``,
			`Name:  ${newName}`,
			`Email: ${newEmail}`,
			`Role:  ${newRole}`,
			``,
			`Log in to the admin panel to approve or reject this request:`,
			loginUrl
		].join('\n');

		const html = buildEmailWrapper(LOGO_URL, `
			<h1>New Account Request</h1>
			<p class="lead">A new user has registered and is waiting for your approval.</p>
			<table style="width:100%;border-collapse:collapse;margin:16px 0;text-align:left">
				<tr>
					<td style="padding:7px 0 7px 0;color:#888;font-size:13px;width:70px;vertical-align:top">Name</td>
					<td style="font-weight:700;font-size:14px">${esc(newName)}</td>
				</tr>
				<tr>
					<td style="padding:7px 0;color:#888;font-size:13px;vertical-align:top">Email</td>
					<td style="font-size:14px">${esc(newEmail)}</td>
				</tr>
				<tr>
					<td style="padding:7px 0;color:#888;font-size:13px;vertical-align:top">Role</td>
					<td>
						<span style="background:#e0e7ff;color:#3730a3;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700">
							${esc(newRole)}
						</span>
					</td>
				</tr>
			</table>
			<a href="${loginUrl}" class="cta">Review in Admin Panel &rarr;</a>
			<p style="color:#94a3b8;font-size:12px;margin-top:18px">
				Go to the <strong>Users</strong> section to approve or reject this account.
			</p>
			<div class="footer">Sent to ${esc(adminEmail)}</div>
		`);

		if (mailTransporter) {
			await mailTransporter.sendMail({ from: EMAIL_FROM, to: adminEmail, subject, text: plain, html });
			console.info('[activation] admin notification sent to', adminEmail);
		} else {
			console.info('[activation] SMTP not configured — new pending user:', newName, newEmail);
		}
	}

	/**
	 * Tell the user their account has been approved.
	 */
	async function sendAccountApprovedEmail(toEmail, userName) {
		if (!toEmail) return;
		const loginUrl = FRONTEND_ORIGIN || 'https://erics-bakery.vercel.app';
		const subject  = `Eric's Bakery — Your account has been approved! 🎉`;
		const plain    = `Hi ${userName},\n\nGreat news — your Eric's Bakery account has been approved by the admin.\n\nYou can now sign in at:\n${loginUrl}\n\nWelcome aboard!`;
		const html     = buildEmailWrapper(LOGO_URL, `
			<h1>Account Approved! 🎉</h1>
			<p class="lead">
				Hi <strong>${esc(userName)}</strong>,<br>
				your account has been approved. You can now sign in to Eric's Bakery.
			</p>
			<a href="${loginUrl}" class="cta">Sign in now &rarr;</a>
			<p style="color:#94a3b8;font-size:12px;margin-top:18px">Welcome to the team!</p>
			<div class="footer">Sent to ${esc(toEmail)}</div>
		`);

		if (mailTransporter) {
			await mailTransporter.sendMail({ from: EMAIL_FROM, to: toEmail, subject, text: plain, html });
			console.info('[activation] approval email sent to', toEmail);
		} else {
			console.info('[activation] SMTP not configured — would have emailed approval to', toEmail);
		}
	}

	/**
	 * Tell the user their account registration was rejected.
	 */
	async function sendAccountRejectedEmail(toEmail, userName, reason) {
		if (!toEmail) return;
		const subject = `Eric's Bakery — Account registration update`;
		const plain   = [
			`Hi ${userName},`,
			``,
			`Unfortunately, your Eric's Bakery account registration could not be approved at this time.`,
			reason ? `Reason: ${reason}` : '',
			``,
			`If you believe this is a mistake, please contact the bakery admin directly.`
		].filter(l => l !== undefined).join('\n');

		const html = buildEmailWrapper(LOGO_URL, `
			<h1>Account Update</h1>
			<p class="lead">
				Hi <strong>${esc(userName)}</strong>,<br>
				unfortunately your account registration could not be approved at this time.
			</p>
			${reason
				? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin:14px 0;text-align:left">
					<span style="color:#991b1b;font-size:13px"><strong>Reason:</strong> ${esc(reason)}</span>
				   </div>`
				: ''
			}
			<p style="color:#94a3b8;font-size:13px;margin-top:16px">
				If you believe this is a mistake, please contact the bakery directly.
			</p>
			<div class="footer">Sent to ${esc(toEmail)}</div>
		`);

		if (mailTransporter) {
			await mailTransporter.sendMail({ from: EMAIL_FROM, to: toEmail, subject, text: plain, html });
			console.info('[activation] rejection email sent to', toEmail);
		} else {
			console.info('[activation] SMTP not configured — would have emailed rejection to', toEmail);
		}
	}

	function esc(s) {
		return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	}

	// ── Routes ────────────────────────────────────────────────────────────────

	/**
	 * GET /api/admin/pending-users
	 * Returns all users with status = 'pending'. Admin / Owner only.
	 */
	app.get('/api/admin/pending-users', authMiddleware, async (req, res) => {
		try {
			const role = String((req.user && req.user.role) || '').toLowerCase();
			if (role !== 'admin' && role !== 'owner') {
				return res.status(403).json({ error: 'Forbidden' });
			}
			const [rows] = await pool.query(
				`SELECT id, username, name, email, role, created_at
				 FROM users
				 WHERE status = 'pending'
				 ORDER BY created_at ASC`
			);
			return res.json({ users: rows });
		} catch (e) {
			console.error('[activation] GET /api/admin/pending-users error', e);
			return res.status(500).json({ error: 'Server error' });
		}
	});

	/**
	 * POST /api/admin/users/:id/approve
	 * Sets a pending user's status to 'active' and emails them. Admin / Owner only.
	 */
	app.post('/api/admin/users/:id/approve', authMiddleware, async (req, res) => {
		try {
			const actorRole = String((req.user && req.user.role) || '').toLowerCase();
			if (actorRole !== 'admin' && actorRole !== 'owner') {
				return res.status(403).json({ error: 'Forbidden' });
			}

			const targetId = Number(req.params.id);
			if (!targetId) return res.status(400).json({ error: 'Invalid user id' });

			const [rows] = await pool.query(
				'SELECT id, name, username, email, status FROM users WHERE id = ? LIMIT 1',
				[targetId]
			);
			if (!rows || !rows[0]) return res.status(404).json({ error: 'User not found' });

			const user = rows[0];
			if (user.status !== 'pending') {
				return res.status(400).json({ error: 'User is not pending approval' });
			}

			await pool.query("UPDATE users SET status = 'active' WHERE id = ?", [targetId]);

			// Send approval email (non-blocking, best-effort)
			sendAccountApprovedEmail(user.email, user.name || user.username)
				.catch(e => console.warn('[activation] approval email failed:', e && e.message));

			const displayName = user.name || user.username;
			return res.json({ ok: true, message: `${displayName}'s account has been approved.` });

		} catch (e) {
			console.error('[activation] POST approve error', e);
			return res.status(500).json({ error: 'Server error' });
		}
	});

	/**
	 * POST /api/admin/users/:id/reject
	 * Sets a pending user's status to 'rejected' and emails them. Admin / Owner only.
	 * Body: { reason?: string }
	 */
	app.post('/api/admin/users/:id/reject', authMiddleware, async (req, res) => {
		try {
			const actorRole = String((req.user && req.user.role) || '').toLowerCase();
			if (actorRole !== 'admin' && actorRole !== 'owner') {
				return res.status(403).json({ error: 'Forbidden' });
			}

			const targetId = Number(req.params.id);
			if (!targetId) return res.status(400).json({ error: 'Invalid user id' });

			const reason = ((req.body && req.body.reason) || '').toString().trim().slice(0, 500);

			const [rows] = await pool.query(
				'SELECT id, name, username, email, status FROM users WHERE id = ? LIMIT 1',
				[targetId]
			);
			if (!rows || !rows[0]) return res.status(404).json({ error: 'User not found' });

			const user = rows[0];
			if (user.status !== 'pending') {
				return res.status(400).json({ error: 'User is not pending approval' });
			}

			await pool.query("UPDATE users SET status = 'rejected' WHERE id = ?", [targetId]);

			sendAccountRejectedEmail(user.email, user.name || user.username, reason)
				.catch(e => console.warn('[activation] rejection email failed:', e && e.message));

			const displayName = user.name || user.username;
			return res.json({ ok: true, message: `${displayName}'s account has been rejected.` });

		} catch (e) {
			console.error('[activation] POST reject error', e);
			return res.status(500).json({ error: 'Server error' });
		}
	});

	// Expose email helpers so they can be used from the modified signup route
	return { sendActivationRequestEmail };
};