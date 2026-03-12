require('dotenv').config();
const path = require('path');
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcryptjs');

const {
	promisify
} = require('util');

const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'frontend')));

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'https://erics-bakery.vercel.app';

app.use(cors({
	origin: frontendOrigin, 

	credentials: true
}));

function buildCookieOptions() {
	const isProd = process.env.NODE_ENV === 'production';

	const sameSite = process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax');
	const opts = {
		httpOnly: true,
		sameSite, 

		secure: isProd, 

		maxAge: 7 * 24 * 60 * 60 * 1000 

	};
	if (process.env.COOKIE_DOMAIN) opts.domain = process.env.COOKIE_DOMAIN; 

	return opts;
}

// FIX #1 — Refuse to start if JWT_SECRET is missing or using the unsafe default
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'replace_with_strong_secret') {
	console.error(
		'\n❌  STARTUP ERROR: JWT_SECRET is not set or is using the unsafe default.\n' +
		'    Generate a strong secret and add it to your .env file:\n\n' +
		'    node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n'
	);
	process.exit(1);
}
const TOKEN_NAME = process.env.COOKIE_NAME || 'bakery_token';

const crypto = require('crypto');
let nodemailer;
try {
	nodemailer = require('nodemailer');
} catch (e) {
	nodemailer = null;
}

const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number((process.env.SMTP_PORT || '587').trim());
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').trim();
// EMAIL_FROM must use the authenticated SMTP_USER address for Gmail.
// Fall back to SMTP_USER if EMAIL_FROM is missing or still uses a placeholder.
const _rawFrom = (process.env.EMAIL_FROM || '').trim();
const _fromHasPlaceholder = _rawFrom.includes('archlinux@google.com') || !_rawFrom;
const EMAIL_FROM = (!_fromHasPlaceholder ? _rawFrom : `"Eric's Bakery" <${SMTP_USER}>`);
const ADMIN_EMAIL     = (process.env.ADMIN_EMAIL       || SMTP_USER || "").trim();
const SUPERADMIN_USER = (process.env.SUPERADMIN_USERNAME || "").trim();
const SUPERADMIN_PASS = (process.env.SUPERADMIN_PASSWORD || "").trim();



app.all(['/api/products', '/api/products/*', '/api/product', '/api/product/*', '/api/orders', '/api/orders/*', '/api/order', '/api/order/*'], (req, res) => {
	return res.status(404).json({
		error: 'Not found'
	});
});

let mailTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
	mailTransporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_PORT === 465, 

		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS
		}
	});
} else {
	console.warn('SMTP not configured — forgot-password emails will not be sent.');
}

function signToken(user) {
	return jwt.sign({
		id: user.id,
		username: user.username,
		role: user.role,
		name: user.name,
		tv: user.token_version != null ? Number(user.token_version) : 0  // token version for session invalidation
	}, JWT_SECRET, {
		expiresIn: '7d'
	});
}
async function getUserByUsername(username) {
	const [rows] = await pool.query(
		"SELECT id, username, password_hash, role, name, is_superadmin, COALESCE(token_version, 0) AS token_version, COALESCE(status, 'active') AS status FROM users WHERE username = ?", [username]);
	return rows[0];
}

async function authMiddleware(req, res, next) {
	try {
		const token = req.cookies[TOKEN_NAME] || (req.headers.authorization && req.headers.authorization
			.split(' ')[1]);
		if (!token) return res.status(401).json({
			message: 'Not authenticated'
		});
		const data = jwt.verify(token, JWT_SECRET);
		req.user = data;

		// ── Token-version check: invalidate old tokens after password change ──
		// Only run this check if the token carries a 'tv' claim (new tokens do).
		if (typeof data.tv !== 'undefined' && data.id) {
			try {
				const [rows] = await pool.query(
					'SELECT COALESCE(token_version, 0) AS token_version FROM users WHERE id = ? LIMIT 1',
					[data.id]
				);
				if (!rows || !rows[0]) {
					return res.status(401).json({ message: 'User not found', code: 'SESSION_INVALIDATED' });
				}
				if (Number(rows[0].token_version) !== Number(data.tv)) {
					res.clearCookie(TOKEN_NAME, buildCookieOptions());
					return res.status(401).json({
						message: 'Your session has expired — please sign in again.',
						code: 'SESSION_INVALIDATED'
					});
				}
			} catch (dbErr) {
				// Fail open on DB error so a DB hiccup doesn't lock everyone out
				console.warn('[auth] token_version check failed (non-blocking):', dbErr && dbErr.message);
			}
		}

		next();
	} catch (e) {
		return res.status(401).json({
			message: 'Invalid token'
		});
	}
}

function hasRole(user, roles) {
	if (!user || !user.role) return false;
	const r = String(user.role || '').toLowerCase();
	return roles.map(x => String(x).toLowerCase()).includes(r);
}

app.post('/api/auth/signup', async (req, res) => {
	try {
		const {
			username,
			password,
			role = 'Baker',
			name = null,
			email = ''
		} = req.body;
		if (!email) return res.status(400).json({
			message: 'Email required'
		});
		if (!username || !password) return res.status(400).json({
			message: 'username & password required'
		});
		const existing = await getUserByUsername(username);
		if (existing) return res.status(409).json({
			message: 'Username exists'
		});
		// Block anyone trying to claim the superadmin username via the signup form
		if (SUPERADMIN_USER && username.toLowerCase() === SUPERADMIN_USER.toLowerCase()) {
			return res.status(409).json({ message: 'Username exists' });
		}
		const hash = await bcrypt.hash(password, 10);
		const [r] = await pool.query(
			"INSERT INTO users (username, password_hash, role, name, email, status) VALUES (?, ?, ?, ?, ?, 'pending')", [
				username, hash, role, name || username, email
			]);
		// Notify admin that a new account is waiting for approval (non-blocking)
		sendActivationRequestEmail(ADMIN_EMAIL, name || username, email, role)
			.catch(e => console.warn('[activation] admin notify failed:', e && e.message));
		return res.json({
			pending: true,
			message: "Your account has been created and is awaiting admin approval. You\'ll receive an email once your account is activated."
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: 'Signup failed'
		});
	}
});

app.post('/api/auth/login', async (req, res) => {
	try {
		const {
			username,
			password
		} = req.body;
		const user = await getUserByUsername(username);
		if (!user) return res.status(401).json({
			message: 'Invalid credentials'
		});

		const ok = await bcrypt.compare(password, user.password_hash);
		if (!ok) return res.status(401).json({
			message: 'Invalid credentials'
		});

		// Block pending or rejected accounts (superadmin bypasses — always active)
		if (!user.is_superadmin) {
		if (user.status === 'pending') {
			return res.status(403).json({
				message: "Your account is awaiting admin approval. You'll be notified by email once it's activated.",
				code: 'ACCOUNT_PENDING'
			});
		}
		if (user.status === 'rejected') {
			return res.status(403).json({
				message: 'Your account registration was not approved. Please contact the bakery admin.',
				code: 'ACCOUNT_REJECTED'
			});
		}
		}

		const token = signToken({
			id: user.id,
			username: user.username,
			role: user.role,
			name: user.name,
			token_version: user.token_version || 0
		});

		res.cookie(TOKEN_NAME, token, buildCookieOptions());

		// Record session start in user_sessions (non-blocking, best-effort)
		setImmediate(async () => {
			try {
				const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
				const ua = req.headers['user-agent']?.slice(0, 255) || null;
				await pool.query(
					'INSERT INTO user_sessions (user_id, ip_address, user_agent) VALUES (?, ?, ?)',
					[user.id, ip, ua]
				);
			} catch (e) { console.warn('[sessions] login insert failed', e && e.message); }
		});

		return res.json({
			user: {
				id: user.id,
				username: user.username,
				role: user.role,
				name: user.name
			}
		});
	} catch (e) {
		console.error('login error', e);
		res.status(500).json({
			message: 'Login error'
		});
	}
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
	res.json({
		user: req.user
	});
});

app.put('/api/users/me', authMiddleware, async (req, res) => {
	try {
		const uid = Number(req.user && req.user.id);
		if (!uid) return res.status(401).json({
			error: 'Not authenticated'
		});

		const body = req.body || {};
		const newName = typeof body.name === 'string' ? body.name.trim() : undefined;
		const newEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
		const newPhone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
		const requestedRole = typeof body.role === 'string' ? body.role.trim() : undefined;

		const fields = [];
		const params = [];

		// Fetch current state so we can detect role change for notification
		const [currentRows] = await pool.query('SELECT role, email, name, username FROM users WHERE id = ? LIMIT 1', [uid]);
		const currentUser   = currentRows && currentRows[0];
		const oldRole       = currentUser ? currentUser.role : null;

		if (typeof newEmail === 'string' && newEmail.length > 0) {
			const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRe.test(newEmail)) return res.status(400).json({
				error: 'Invalid email'
			});

			const [ex] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1', [newEmail, uid]);
			if (ex && ex.length > 0) return res.status(409).json({
				error: 'Email already in use'
			});
			fields.push('email = ?');
			params.push(newEmail);
		}

		if (typeof newName === 'string' && newName.length > 0) {
			fields.push('name = ?');
			params.push(newName);
		}

		if (typeof newPhone === 'string') {
			fields.push('phone = ?');
			params.push(newPhone);
		}

		if (requestedRole && req.user && req.user.role === 'Owner') {

			const allowedRoles = ['Owner', 'Baker', 'Assistant'];
			if (!allowedRoles.includes(requestedRole)) return res.status(400).json({
				error: 'Invalid role'
			});
			fields.push('role = ?');
			params.push(requestedRole);
		}

		if (fields.length === 0) return res.status(400).json({
			error: 'No updatable fields provided'
		});

		params.push(uid);
		const q = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
		await pool.query(q, params);

		const [rows] = await pool.query('SELECT id, username, role, name, email, phone FROM users WHERE id = ? LIMIT 1', [uid]);
		if (!rows || rows.length === 0) return res.status(404).json({
			error: 'User not found'
		});
		const user = rows[0];

		try {
			const isProd = process.env.NODE_ENV === 'production';
			const token = signToken({
				id: user.id,
				username: user.username,
				role: user.role,
				name: user.name
			});
			res.cookie(TOKEN_NAME, token, buildCookieOptions());
		} catch (e) {
			console.warn('Could not reissue token after profile update', e && e.message ? e.message : e);
		}

		(async () => {
			try {
				const text = `Profile updated — ${user.name || user.username}`;
				await pool.query('INSERT INTO activity (user_id, action, text) VALUES (?, ?, ?)', [user.id, 'profile_update', text]);
				console.info('[activity] profile update logged for user', user.id);
			} catch (actErr) {
				console.warn('[activity] failed to log profile update (non-blocking):', actErr && actErr.message ? actErr.message : actErr);
			}
		})();

		// Send role-change notification email if role was actually changed
		if (requestedRole && oldRole && requestedRole !== oldRole && user.email) {
			sendRoleChangeEmail(user.email, user.name || user.username, oldRole, requestedRole, user.name || user.username)
				.catch(e => console.warn('[role-change] self-change email failed', e && e.message));
		}

		return res.json({
			user
		});
	} catch (err) {
		console.error('PUT /api/users/me err', err && err.stack ? err.stack : err);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

app.post('/api/auth/logout', async (req, res) => {
	// Always clear the cookie — logout must never require a valid token.
	// Try to record the session end if the token is still readable (non-blocking).
	try {
		const token = req.cookies[TOKEN_NAME] || (req.headers.authorization?.split(' ')[1]);
		if (token) {
			const data = jwt.verify(token, JWT_SECRET);
			if (data && data.id) {
				pool.query(
					`UPDATE user_sessions SET logged_out_at = CURRENT_TIMESTAMP WHERE user_id = ? AND logged_out_at IS NULL ORDER BY logged_in_at DESC LIMIT 1`,
					[data.id]
				).catch(e => console.warn('[sessions] logout update failed', e && e.message));
			}
		}
	} catch {} // expired / missing token — that's fine, just clear the cookie
	res.clearCookie(TOKEN_NAME, buildCookieOptions());
	res.json({ ok: true });
});

app.put('/api/auth/heartbeat', authMiddleware, async (req, res) => {
	try {
		await pool.query(
			`UPDATE user_sessions
			 SET last_active_at = CURRENT_TIMESTAMP
			 WHERE user_id = ? AND logged_out_at IS NULL
			 ORDER BY logged_in_at DESC
			 LIMIT 1`,
			[req.user.id]
		);
		return res.json({ ok: true });
	} catch (err) {
		console.warn('[heartbeat] update failed:', err && err.message);
		return res.json({ ok: false });
	}
});

// ── Admin: list all users ──────────────────────────────────────────────────
app.get('/api/admin/users', authMiddleware, async (req, res) => {
	if (!hasRole(req.user, ['Owner', 'Admin'])) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	try {
		const [rows] = await pool.query(
			`SELECT u.id, u.username, u.role, u.name, u.email, u.phone, u.created_at, u.updated_at,
				CASE WHEN s.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_online,
				act.last_active
			 FROM users u
			 LEFT JOIN (
				 SELECT DISTINCT user_id FROM user_sessions
				 WHERE logged_out_at IS NULL
				   AND COALESCE(last_active_at, logged_in_at) >= NOW() - INTERVAL 10 MINUTE
			 ) s ON s.user_id = u.id
			 LEFT JOIN (
				 SELECT user_id,
				        MAX(COALESCE(last_active_at, logged_in_at)) AS last_active
				 FROM user_sessions
				 GROUP BY user_id
			 ) act ON act.user_id = u.id
			 ORDER BY u.created_at ASC`
		);
		return res.json({ users: rows });
	} catch (err) {
		console.error('GET /api/admin/users err', err && err.stack ? err.stack : err);
		return res.status(500).json({ error: 'Server error' });
	}
});

// ── Admin: delete a user ───────────────────────────────────────────────────
app.delete('/api/admin/users/:id', authMiddleware, async (req, res) => {
	if (!hasRole(req.user, ['Owner', 'Admin'])) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	const targetId = Number(req.params.id);
	if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
	if (targetId === Number(req.user.id)) {
		return res.status(400).json({ error: 'Cannot delete your own account' });
	}
	try {
		const [rows] = await pool.query('SELECT id, username, is_superadmin FROM users WHERE id = ? LIMIT 1', [targetId]);
		if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
		if (rows[0].is_superadmin) {
			return res.status(403).json({ error: 'The superadmin account cannot be deleted.' });
		}
		await pool.query('DELETE FROM users WHERE id = ?', [targetId]);
		return res.json({ ok: true, deleted: rows[0].username });
	} catch (err) {
		console.error('DELETE /api/admin/users/:id err', err && err.stack ? err.stack : err);
		return res.status(500).json({ error: 'Server error' });
	}
});

// ── Admin: get login/logout history for a user ─────────────────────────────
app.get('/api/admin/users/:id/sessions', authMiddleware, async (req, res) => {
	if (!hasRole(req.user, ['Owner', 'Admin'])) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	const targetId = Number(req.params.id);
	if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
	try {
		const [rows] = await pool.query(
			`SELECT id, logged_in_at AS login, logged_out_at AS logout, ip_address, user_agent
			 FROM user_sessions
			 WHERE user_id = ?
			 ORDER BY logged_in_at DESC
			 LIMIT 100`,
			[targetId]
		);
		return res.json({ sessions: rows });
	} catch (err) {
		console.error('GET /api/admin/users/:id/sessions err', err && err.stack ? err.stack : err);
		return res.status(500).json({ error: 'Server error' });
	}
});

// ── Current user: own session history ─────────────────────────────────────
app.get('/api/users/me/sessions', authMiddleware, async (req, res) => {
	const uid = req.user && req.user.id;
	if (!uid) return res.status(401).json({ error: 'Not authenticated' });
	try {
		const [rows] = await pool.query(
			`SELECT id,
			        logged_in_at    AS login,
			        logged_out_at   AS logout,
			        ip_address,
			        user_agent,
			        last_active_at
			 FROM user_sessions
			 WHERE user_id = ?
			 ORDER BY logged_in_at DESC
			 LIMIT 20`,
			[uid]
		);
		return res.json({ sessions: rows });
	} catch (err) {
		console.error('GET /api/users/me/sessions err', err && err.stack ? err.stack : err);
		return res.status(500).json({ error: 'Server error' });
	}
});

app.get('/api/ingredients', authMiddleware, async (req, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page || '1'));
		const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit || '100')));
		const offset = (page - 1) * limit;
		const type = (req.query.type || 'all');
		const filter = (req.query.filter || 'all');
		const search = (req.query.search || '').trim();
		const sort = (['id', 'name', 'qty', 'expiry'].includes(req.query.sort) ? req.query.sort : 'id');
		const order = (req.query.order === 'desc' ? 'DESC' : 'ASC');
		const where = [];
		const params = [];
		if (type && type !== 'all') {
			where.push('`type` = ?');
			params.push(type);
		}
		if (search) {
			where.push('(name LIKE ? OR supplier LIKE ?)');
			params.push(`%${search}%`, `%${search}%`);
		}
		if (filter === 'low') {

			where.push('qty <= COALESCE(min_qty, 0)');
		} else if (filter === 'expiring') {

			const days = process.env.REPORT_EXPIRY_DAYS ? Number(process.env.REPORT_EXPIRY_DAYS) :
				7;
			where.push('expiry IS NOT NULL AND DATEDIFF(expiry, CURDATE()) BETWEEN 0 AND ?');
			params.push(days);
		}
		const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

		const [countRows] = await pool.query(
			`SELECT COUNT(*) as cnt FROM ingredients ${whereSql}`, params);
		const total = countRows && countRows[0] ? Number(countRows[0].cnt) : 0;

		const q = `SELECT id,name,type,supplier,qty,unit,min_qty,max_qty,expiry,attrs,created_at,updated_at,created_by
               FROM ingredients
               ${whereSql}
               ORDER BY \`${sort}\` ${order}
               LIMIT ? OFFSET ?`;
		const finalParams = params.concat([limit, offset]);

		const [rows] = await pool.query(q, finalParams);

		const items = rows.map(r => ({
			...r,
			attrs: (typeof r.attrs === 'string' && r.attrs) ? (() => {
				try {
					return JSON.parse(r.attrs)
				} catch (e) {
					return null
				}
			})() : r.attrs
		}));
		res.json({
			items,
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
				filter,
				type,
				search,
				sort,
				order
			}
		});
	} catch (e) {
		console.error('GET /api/ingredients err', e);
		res.status(500).json({
			error: 'Server error'
		});
	}
});

app.post('/api/ingredients', authMiddleware, async (req, res) => {
	try {
		const data = req.body || {};
		if (!hasRole(req.user, ['Owner', 'Baker', 'Admin'])) {
			return res.status(403).json({
				error: 'Forbidden: insufficient permissions to create items'
			});
		}

		const name = (data.name || '').trim();
		if (!name) return res.status(400).json({
			error: 'Name required'
		});

		const type = data.type || 'ingredient';
		const supplier = data.supplier || '';
		const qty = Number(data.qty || 0);

		const unit = (typeof data.unit === 'string' && data.unit.trim() !== '') ?
			data.unit.trim() :
			(type === 'ingredient' ? 'kg' : '');

		const min_qty = Number(data.min_qty || 0);
		const max_qty = data.max_qty == null ? null : data.max_qty;
		const expiry = data.expiry || null;
		const attrs = data.attrs ? JSON.stringify(data.attrs) : null;
		const userId = (req.user && req.user.id) ? req.user.id : null;

		const [r] = await pool.query(
			`INSERT INTO ingredients (name, type, supplier, qty, unit, min_qty, max_qty, expiry, attrs, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[name, type, supplier, qty, unit, min_qty, max_qty, expiry, attrs, userId]
		);

		const [rows] = await pool.query('SELECT * FROM ingredients WHERE id = ?', [r.insertId]);
		const created = rows && rows[0] ? rows[0] : null;

		res.status(201).json({
			ingredient: created
		});

		if (qty > 0 && created) {
			(async () => {
				try {
					const userId = (req.user && req.user.id) ? req.user.id : null;
					const unitText = created.unit ? ` ${created.unit}` : '';
					const text = `Initial stock ${qty}${unitText} — ${created.name}`;
					await pool.query('INSERT INTO activity (ingredient_id, user_id, text) VALUES (?, ?, ?)', [r.insertId, userId, text]);
					console.info(`[activity] initial stock logged: ingredient=${r.insertId} user=${userId}`);
				} catch (actErr) {
					console.error('[activity] failed to log initial stock (non-blocking):', actErr && actErr.message ? actErr.message : actErr);
				}
			})();
		}

		return;
	} catch (err) {
		console.error('POST /api/ingredients (create) error:', err && err.message ? err.message : err);
		return res.status(500).json({
			error: 'Server error',
			detail: err && err.message ? err.message : String(err)
		});
	}
});

app.get('/api/ingredients/export/csv', authMiddleware, async (req, res) => {
	try {
		const type = (req.query.type || 'all');
		const filter = (req.query.filter || 'all');
		const search = (req.query.search || '').trim();
		const where = [];
		const params = [];
		if (type !== 'all') {
			where.push('`type` = ?');
			params.push(type);
		}
		if (search) {
			where.push('(name LIKE ? OR supplier LIKE ?)');
			params.push(`%${search}%`, `%${search}%`);
		}
		if (filter === 'low') {
			where.push('qty <= COALESCE(min_qty, 0)');
		} else if (filter === 'expiring') {
			const days = process.env.REPORT_EXPIRY_DAYS ? Number(process.env.REPORT_EXPIRY_DAYS) :
				7;
			where.push('expiry IS NOT NULL AND DATEDIFF(expiry, CURDATE()) BETWEEN 0 AND ?');
			params.push(days);
		}
		const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
		const [rows] = await pool.query(
			`SELECT id,name,type,supplier,qty,unit,min_qty,max_qty,expiry FROM ingredients ${whereSql} ORDER BY id ASC`,
			params);
		let csv = 'id,name,type,supplier,qty,unit,min_qty,max_qty,expiry\n';
		for (const r of rows) {
			csv +=
				`${r.id},"${(r.name||'').replace(/"/g,'""')}",${r.type},"${(r.supplier||'').replace(/"/g,'""')}",${r.qty},${r.unit},${r.min_qty||0},${r.max_qty||''},${r.expiry||''}\n`;
		}
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition',
			`attachment; filename="inventory_${new Date().toISOString().slice(0,10)}.csv"`);
		res.send(csv);
	} catch (e) {
		console.error('export csv err', e);
		res.status(500).send('Server error');
	}
});

app.get('/api/ingredients/:id', authMiddleware, async (req, res) => {
	try {
		const id = Number(req.params.id || 0);
		if (!id) return res.status(400).json({
			error: 'Invalid id'
		});

		const [rows] = await pool.query('SELECT id,name,type,supplier,qty,unit,min_qty,max_qty,expiry,attrs,created_at,updated_at FROM ingredients WHERE id = ?', [id]);
		if (!rows || rows.length === 0) return res.status(404).json({
			error: 'Not found'
		});

		const row = rows[0];

		if (typeof row.attrs === 'string' && row.attrs) {
			try {
				row.attrs = JSON.parse(row.attrs);
			} catch (e) {
				 }
		}

		return res.json({
			ingredient: row
		});
	} catch (e) {
		console.error('GET /api/ingredients/:id err', e);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

app.put('/api/ingredients/:id', authMiddleware, async (req, res) => {
	try {
		const id = Number(req.params.id);
		if (!id) return res.status(400).json({
			error: 'Invalid id'
		});

		if (!hasRole(req.user, ['Owner', 'Baker', 'Admin'])) {
			return res.status(403).json({
				error: 'Forbidden: insufficient permissions to edit items'
			});
		}

		const body = req.body || {};
		const updates = [];
		const params = [];

		if (typeof body.name === 'string') {
			updates.push('name = ?');
			params.push(body.name.trim());
		}
		if (typeof body.type === 'string') {
			updates.push('type = ?');
			params.push(body.type.trim());
		}
		if (typeof body.supplier === 'string') {
			updates.push('supplier = ?');
			params.push(body.supplier.trim());
		}
		if (body.unit !== undefined) {
			updates.push('unit = ?');
			params.push(body.unit ? String(body.unit).trim() : '');
		}
		if (body.qty !== undefined) {
			updates.push('qty = ?');
			params.push(Number(body.qty || 0));
		}
		if (body.min_qty !== undefined) {
			updates.push('min_qty = ?');
			params.push(Number(body.min_qty || 0));
		}
		if (body.max_qty !== undefined) {
			updates.push('max_qty = ?');
			params.push(body.max_qty == null ? null : Number(body.max_qty));
		}
		if (body.expiry !== undefined) {
			updates.push('expiry = ?');
			params.push(body.expiry || null);
		}
		if (body.attrs !== undefined) {
			updates.push('attrs = ?');
			params.push(body.attrs ? JSON.stringify(body.attrs) : null);
		}

		if (updates.length === 0) return res.status(400).json({
			error: 'No fields to update'
		});

		params.push(id);
		const q = `UPDATE ingredients SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
		await pool.query(q, params);

		const [rows] = await pool.query('SELECT * FROM ingredients WHERE id = ?', [id]);
		return res.json({
			ingredient: rows && rows[0] ? rows[0] : null
		});
	} catch (err) {
		console.error('PUT /api/ingredients/:id err', err);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

app.delete('/api/ingredients/:id', authMiddleware, async (req, res) => {
	try {
		const id = Number(req.params.id);
		if (!id) return res.status(400).json({
			error: 'Invalid id'
		});

		// Only Owners can permanently delete ingredients
		if (!hasRole(req.user, ['Owner', 'Admin'])) {
			return res.status(403).json({
				error: 'Forbidden: only Owners can delete items'
			});
		}

		// Fetch ingredient first so we can log its name in activity
		const [rows] = await pool.query(
			'SELECT id, name, type FROM ingredients WHERE id = ? LIMIT 1', [id]
		);
		if (!rows || rows.length === 0) return res.status(404).json({
			error: 'Ingredient not found'
		});
		const ing = rows[0];

		// Nullify ingredient_id in activity so history rows are kept but not orphaned
		await pool.query(
			'UPDATE activity SET ingredient_id = NULL WHERE ingredient_id = ?', [id]
		);

		await pool.query('DELETE FROM ingredients WHERE id = ?', [id]);

		// Log the deletion as an activity entry
		(async () => {
			try {
				const userId = (req.user && req.user.id) ? req.user.id : null;
				const text = `Deleted ${ing.type || 'item'}: ${ing.name}`;
				await pool.query(
					'INSERT INTO activity (ingredient_id, user_id, action, text) VALUES (?, ?, ?, ?)',
					[null, userId, 'delete', text]
				);
				console.info(`[activity] delete logged: ingredient=${id} user=${userId}`);
			} catch (actErr) {
				console.error('[activity] failed to log delete (non-blocking):', actErr && actErr.message ? actErr.message : actErr);
			}
		})();

		return res.json({
			ok: true,
			deleted: { id, name: ing.name }
		});
	} catch (err) {
		console.error('DELETE /api/ingredients/:id err', err && err.stack ? err.stack : err);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

app.post('/api/ingredients/:id/stock', authMiddleware, async (req, res) => {
	const id = Number(req.params.id);
	const type = req.body.type;
	const qty = Number(req.body.qty || 0);
	const note = req.body.note || '';

	if (!hasRole(req.user, ['Owner', 'Baker', 'Assistant', 'Admin'])) {
		return res.status(403).json({
			error: 'Forbidden: insufficient permissions to update stock'
		});
	}

	if (!id || !['in', 'out'].includes(type) || qty <= 0) {
		return res.status(400).json({
			error: 'Invalid request (id/type/qty)'
		});
	}

	try {

		const [rows] = await pool.query('SELECT qty, unit, name FROM ingredients WHERE id = ?', [
			id
		]);
		if (!rows || rows.length === 0) return res.status(404).json({
			error: 'Ingredient not found'
		});
		const ing = rows[0];
		const current = Number(ing.qty || 0);
		let newQty = current;
		if (type === 'in') newQty = +(current + qty).toFixed(3);
		else {
			if (qty > current) return res.status(400).json({
				error: 'Not enough stock'
			});
			newQty = +(current - qty).toFixed(3);
		}

		await pool.query(
			'UPDATE ingredients SET qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
				newQty, id
			]);

		res.json({
			ok: true,
			ingredient: {
				id,
				qty: newQty
			}
		});

		(async () => {
			try {
				const actionText = type === 'in' ?
					`Stock in ${qty} ${ing.unit} — ${ing.name}` :
					`Stock out ${qty} ${ing.unit} — ${ing.name}`;
				const txt = note ? `${actionText} — ${note}` : actionText;
				const userId = (req.user && req.user.id) ? req.user.id : null;

				const action = (type === 'in') ? 'stock_in' : 'stock_out';
				await pool.query(
					'INSERT INTO activity (ingredient_id, user_id, action, text) VALUES (?, ?, ?, ?)',
					[id, userId, action, txt]);
				console.info(
					`[activity] logged: ingredient=${id} user=${userId} type=${type} qty=${qty}`
				);
			} catch (actErr) {

				console.error('[activity] failed to log (non-blocking):', actErr && actErr
					.message ? actErr.message : actErr);
			}
		})();
		return;
	} catch (err) {
		console.error('POST /api/ingredients/:id/stock error:', err && err.message ? err.message :
			err);

		return res.status(500).json({
			error: 'Server error',
			detail: err && err.message ? err.message : String(err)
		});
	}
});
app.get('/api/activity', authMiddleware, async (req, res) => {
	try {
		const page  = Math.max(1, Number(req.query.page  || 1));
		const limit = Math.max(1, Math.min(2000, Number(req.query.limit || 50)));
		const offset = (page - 1) * limit;

		// Optional date-range filter (YYYY-MM-DD strings sent by the frontend)
		const startParam = req.query.start || null; // e.g. '2026-03-09'
		const endParam   = req.query.end   || null;

		const conditions = [];
		const params     = [];

		if (startParam) {
			// Cover the whole start day in UTC
			conditions.push('a.time >= ?');
			params.push(startParam + ' 00:00:00');
		}
		if (endParam) {
			conditions.push('a.time <= ?');
			params.push(endParam + ' 23:59:59');
		}

		const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

		const [rows] = await pool.query(
			`SELECT a.id, a.ingredient_id, a.user_id, a.action, a.text, a.time,
			        u.username AS username, i.name AS ingredient_name
       FROM activity a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN ingredients i ON i.id = a.ingredient_id
			 ${where}
       ORDER BY a.time DESC
			 LIMIT ? OFFSET ?`,
			[...params, limit, offset]
		);

		const [count] = await pool.query(
			`SELECT COUNT(*) AS cnt FROM activity a ${where}`,
			params
		);

		res.json({
			items: rows,
			meta: {
				total: count && count[0] ? count[0].cnt : 0,
				page,
				limit,
				totalPages: Math.ceil((count && count[0] ? count[0].cnt : 0) / limit)
			}
		});
	} catch (e) {
		console.error('GET /api/activity err', e);
		res.status(500).json({ error: 'Server error' });
	}
});

app.post('/api/activity', authMiddleware, async (req, res) => {
	try {
		const uid = (req.user && req.user.id) ? Number(req.user.id) : null;
		const {
			ingredient_id = null, action = null, text = ''
		} = req.body || {};

		if (!text && !action) return res.status(400).json({
			error: 'action or text required'
		});

		await pool.query(
			'INSERT INTO activity (ingredient_id, user_id, action, text) VALUES (?, ?, ?, ?)',
			[ingredient_id || null, uid, action || null, text]
		);

		return res.json({
			ok: true
		});
	} catch (err) {
		console.error('POST /api/activity err', err && err.stack ? err.stack : err);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

app.post('/api/auth/forgot', async (req, res) => {
	try {
		const emailOrUsername = (req.body && (req.body.email || '')).toString().trim();
		if (!emailOrUsername) return res.status(400).json({
			error: 'email required'
		});

		console.info('[forgot] request for', emailOrUsername);

		let user = null;
		try {
			const [byEmail] = await pool.query('SELECT id, username, email FROM users WHERE email = ? LIMIT 1', [emailOrUsername]);
			user = byEmail && byEmail[0] ? byEmail[0] : null;
		} catch (e) {

			console.warn('[forgot] SELECT by email failed (continuing):', e && e.message ? e.message : e);
			user = null;
		}
		if (!user) {
			const [byUser] = await pool.query('SELECT id, username, email FROM users WHERE username = ? LIMIT 1', [emailOrUsername]);
			user = byUser && byUser[0] ? byUser[0] : null;
		}

		const code = String(Math.floor(100000 + Math.random() * 900000));
		const expiresAt = new Date(Date.now() + (Number(process.env.RESET_CODE_EXPIRE_MIN || 15) * 60 * 1000));
		const userId = user ? user.id : null;
		const emailToStore = user ? (user.email || emailOrUsername) : emailOrUsername;

		const hashed = await bcrypt.hash(code, 10);

		await pool.query(
			`INSERT INTO password_resets (user_id, email, token, expires_at, used, consumed, created_at)
       VALUES (?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP)`,
			[userId, emailToStore, hashed, expiresAt]
		);

		console.info('[forgot] inserted reset row for', emailToStore);

		try {
			await sendResetEmail(emailToStore, code);
			console.info('[forgot] sendResetEmail completed for', emailToStore);
		} catch (e) {

			console.warn('[forgot] sendResetEmail failed (will still return OK):', e && e.message ? e.message : e);
		}

		return res.json({
			ok: true,
			message: 'Reset code created (if the address exists).'
		});
	} catch (err) {
		console.error('POST /api/auth/forgot error', err && err.stack ? err.stack : err);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

app.post('/api/auth/forgot/verify', async (req, res) => {
	try {
		const email = (req.body && (req.body.email || '')).trim();
		const code = (req.body && (req.body.code || '')).trim();
		if (!email || !code) return res.status(400).json({
			error: 'email & code required'
		});

		const [rows] = await pool.query(
			`SELECT id, token, used, consumed, expires_at
       FROM password_resets
       WHERE email = ?
       ORDER BY created_at DESC
       LIMIT 1`,
			[email]
		);
		const row = rows && rows[0] ? rows[0] : null;
		if (!row) return res.status(400).json({
			error: 'Invalid code'
		});
		if (row.used || row.consumed) return res.status(400).json({
			error: 'Code already used'
		});
		if (new Date(row.expires_at) < new Date()) return res.status(400).json({
			error: 'Code expired'
		});

		const ok = await bcrypt.compare(code, row.token);
		if (!ok) return res.status(400).json({
			error: 'Invalid code'
		});

		return res.json({
			ok: true,
			message: 'Code verified'
		});
	} catch (err) {
		console.error('POST /api/auth/forgot/verify err', err && err.stack ? err.stack : err);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

app.post('/api/auth/forgot/reset', async (req, res) => {
	try {
		const email = (req.body && (req.body.email || '')).trim();
		const code = (req.body && (req.body.code || '')).trim();
		const password = req.body && req.body.password;
		if (!email || !code || !password) return res.status(400).json({
			error: 'email/code/password required'
		});
		if (typeof password !== 'string' || password.length < 6) return res.status(400).json({
			error: 'password too short'
		});

		const [rows] = await pool.query(
			`SELECT id, user_id, token, expires_at, used, consumed
       FROM password_resets
       WHERE email = ?
       ORDER BY created_at DESC
       LIMIT 1`,
			[email]
		);
		const pr = rows && rows[0] ? rows[0] : null;
		if (!pr) return res.status(400).json({
			error: 'Invalid code'
		});
		if (pr.used || pr.consumed) return res.status(400).json({
			error: 'Code already used'
		});
		if (new Date(pr.expires_at) < new Date()) return res.status(400).json({
			error: 'Code expired'
		});

		const ok = await bcrypt.compare(code, pr.token);
		if (!ok) return res.status(400).json({
			error: 'Invalid code'
		});

		let userId = pr.user_id;
		if (!userId) {
			const [uRows] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [email, email]);
			if (uRows && uRows[0]) userId = uRows[0].id;
		}
		if (!userId) return res.status(404).json({
			error: 'User not found for email'
		});

		const hash = await bcrypt.hash(password, 10);
		await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

		await pool.query('UPDATE password_resets SET used = 1, consumed = 1 WHERE id = ?', [pr.id]);

		return res.json({
			ok: true,
			message: 'Password updated'
		});
	} catch (err) {
		console.error('POST /api/auth/forgot/reset err', err && err.stack ? err.stack : err);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

// REMOVED: Duplicate /api/auth/verify-reset and /api/auth/reset routes.
// These referenced a non-existent `code_hash` column and would crash at runtime.
// Use the /api/auth/forgot/* flow below instead (forgot → forgot/verify → forgot/reset).

async function hasColumn(tableName, columnName) {
	try {
		const [rows] = await pool.query(
			`SELECT COUNT(*) as c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
			[tableName, columnName]
		);
		return !!(rows && rows[0] && rows[0].c);
	} catch (err) {
		console.error('hasColumn error', err && err.stack ? err.stack : err);
		return false;
	}
}

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
	try {
		const uid = req.user && req.user.id;
		if (!uid) return res.status(401).json({
			error: 'Not authenticated'
		});

		const {
			currentPassword,
			newPassword
		} = req.body || {};
		if (!currentPassword || !newPassword) return res.status(400).json({
			error: 'Current and new password required'
		});
		if (typeof newPassword !== 'string' || newPassword.length < 6) return res.status(400).json({
			error: 'New password too short'
		});

		const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [uid]);
		if (!rows || rows.length === 0) return res.status(404).json({
			error: 'User not found'
		});

		const hash = rows[0].password_hash;
		const ok = await bcrypt.compare(currentPassword, hash);
		if (!ok) return res.status(400).json({
			error: 'Current password is incorrect'
		});

		const newHash = await bcrypt.hash(newPassword, 10);
		// Increment token_version — this invalidates ALL other active sessions immediately
		await pool.query(
			'UPDATE users SET password_hash = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?',
			[newHash, uid]
		);

		// Re-issue a fresh token for this device so the current session continues working
		try {
			const [updatedRows] = await pool.query(
				'SELECT COALESCE(token_version, 0) AS token_version, username, role, name FROM users WHERE id = ? LIMIT 1',
				[uid]
			);
			if (updatedRows && updatedRows[0]) {
				const newToken = signToken({
					id: uid,
					username: updatedRows[0].username,
					role:     updatedRows[0].role,
					name:     updatedRows[0].name,
					token_version: updatedRows[0].token_version
				});
				res.cookie(TOKEN_NAME, newToken, buildCookieOptions());
			}
		} catch (reissueErr) {
			console.warn('[change-password] token reissue failed:', reissueErr && reissueErr.message);
		}

		return res.json({
			ok: true,
			message: 'Password updated'
		});
	} catch (err) {
		console.error('POST /api/auth/change-password err', err);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

async function sendResetEmail(toEmail, code) {
	try {

		const logoUrl = process.env.RESET_EMAIL_LOGO_URL || `https://i.ibb.co/9HshkkkB/logo.png`;
		const expiresMinutes = Number(process.env.RESET_CODE_EXPIRE_MIN || 15);
		const subject = `Eric's Bakery — Password reset code`;
		const plain = `Your password reset code: ${code}\n\nThis code will expire in ${expiresMinutes} minutes.\n\nIf you did not request this, ignore this message.`;

		const html = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Password reset</title>
    <style>
      body{background:#f3f6fb;margin:0;padding:24px;font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;color:#12202f}
      .wrapper{max-width:600px;margin:20px auto}
      .card{background:#fff;border-radius:12px;padding:26px;text-align:center;border:1px solid rgba(0,0,0,0.06);box-shadow:0 10px 30px rgba(16,24,40,0.06)}
      .logo{width:84px;height:84px;border-radius:12px;margin:0 auto 14px;object-fit:cover}
      h1{margin:6px 0 8px;font-size:20px;color:#0f2b4b}
      .lead{color:#475569;font-size:14px;margin:0 0 18px}
      .code{display:inline-block;padding:18px 14px;background:linear-gradient(180deg,
#fff);border-radius:10px;font-weight:800;font-size:28px;letter-spacing:4px;color:#112233;border:1px solid rgba(0,0,0,0.06);min-width:220px}

      .footer{margin-top:20px;font-size:12px;color:#555;text-align:center}
      @media (max-width:420px){.code{font-size:22px;min-width:180px}.card{padding:18px}}
    </style>
    </head><body>
      <div class="wrapper" role="article" aria-label="Password reset email">
        <div class="card">
          <img src="${logoUrl}" alt="Eric's Bakery" class="logo" />
          <h1>Password reset code</h1>
          <p class="lead">Use the code below to reset your account password. The code expires in ${expiresMinutes} minutes.</p>
          <div class="code" aria-live="polite" aria-atomic="true">${code}</div>
          <p style="margin-top:12px;color:#666;font-size:13px">If you did not request this, ignore this message.</p>
          <div style="margin-top:18px"><a href="${(process.env.FRONTEND_ORIGIN||'https://erics-bakery.vercel.app')}" target="_blank" rel="noreferrer noopener" style="display:inline-block;background:#1b85ec;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">Open Eric's Bakery</a></div>
          <div class="footer">Sent to ${toEmail}</div>
        </div>
      </div>
    </body></html>`;

		if (mailTransporter) {
			const fromAddress = (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) ? process.env.EMAIL_FROM.trim() : process.env.SMTP_USER;

			const info = await mailTransporter.sendMail({
				from: fromAddress,
				to: toEmail,
				subject,
				text: plain,
				html
			});

			console.info('[sendResetEmail] SMTP send info:', {
				accepted: info.accepted,
				rejected: info.rejected,
				envelope: info.envelope,
				messageId: info.messageId,
				response: info.response
			});
			return;
		}

		console.info('[sendResetEmail] SMTP not configured — printing fallback HTML preview for', toEmail);
		console.info('==== TEXT ====\n', plain);
		console.info('==== HTML PREVIEW ====\n', html);
		return;
	} catch (err) {
		console.error('sendResetEmail: error', err && err.stack ? err.stack : err);

	}
}

// ── Shared email helper ────────────────────────────────────────────────────
function sha256(str) {
	return crypto.createHash('sha256').update(str).digest('hex');
}

function buildEmailWrapper(logoUrl, bodyHtml) {
	const logo = logoUrl || process.env.RESET_EMAIL_LOGO_URL || 'https://i.ibb.co/9HshkkkB/logo.png';
	return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{background:#f3f6fb;margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;color:#12202f}
  .wrapper{max-width:600px;margin:20px auto}
  .card{background:#fff;border-radius:12px;padding:28px;text-align:center;border:1px solid rgba(0,0,0,0.06);box-shadow:0 10px 30px rgba(16,24,40,0.06)}
  .logo{width:84px;height:84px;border-radius:12px;margin:0 auto 16px;object-fit:cover;display:block}
  h1{margin:4px 0 10px;font-size:20px;color:#0f2b4b}
  .lead{color:#475569;font-size:14px;margin:0 0 20px;line-height:1.6}
  .cta{display:inline-block;background:#1b85ec;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.01em;margin-bottom:4px}
  .footer{margin-top:20px;font-size:12px;color:#888;text-align:center}
  @media(max-width:420px){.card{padding:18px}}
</style>
</head><body>
<div class="wrapper" role="article">
  <div class="card">
    <img src="${logo}" alt="Eric's Bakery" class="logo"/>
    ${bodyHtml}
  </div>
</div>
</body></html>`;
}

async function sendMagicLinkEmail(toEmail, name, magicLink) {
	name = (name || toEmail || 'there');
	const subject = `Eric's Bakery — Your sign-in link`;
	const plain   = `Hi ${name},\n\nClick the link below to sign in (valid for 15 minutes, single-use):\n\n${magicLink}\n\nIf you did not request this, ignore this message.`;
	const html    = buildEmailWrapper(
		process.env.RESET_EMAIL_LOGO_URL || 'https://i.ibb.co/9HshkkkB/logo.png',
		`<h1>Sign in to Eric's Bakery</h1>
		 <p class="lead">Hi <strong>${name.replace(/</g,'&lt;')}</strong>, click the button below to sign in instantly.<br>
		 This link expires in <strong>15 minutes</strong> and can only be used once.</p>
		 <a href="${magicLink}" class="cta">Sign in now &rarr;</a>
		 <p style="margin-top:16px;color:#888;font-size:12px">Or copy this link:<br>
		 <span style="word-break:break-all;color:#475569;font-size:11px">${magicLink}</span></p>
		 <p style="color:#94a3b8;font-size:12px;margin-top:16px">If you didn't request this, you can safely ignore this email.</p>
		 <div class="footer">Sent to ${toEmail}</div>`
	);
	if (mailTransporter) {
		await mailTransporter.sendMail({ from: EMAIL_FROM, to: toEmail, subject, text: plain, html });
		console.info('[magic-link] email sent to', toEmail);
	} else {
		console.info('[magic-link] SMTP not configured. Magic link for', toEmail, ':', magicLink);
	}
}

async function sendRoleChangeEmail(toEmail, userName, oldRole, newRole, changedByName) {
	if (!toEmail) return;
	const subject = `Eric's Bakery — Your role has been updated`;
	const plain   = `Hi ${userName},\n\nYour role has been updated from "${oldRole}" to "${newRole}" by ${changedByName}.\n\nIf you believe this is an error, please contact the system owner.`;
	const roleColor = { Owner: '#7c3aed', Admin: '#1b85ec', Baker: '#16a34a', Assistant: '#d97706' };
	const badge = (r) => `<span style="background:${roleColor[r]||'#888'};color:#fff;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:700">${r}</span>`;
	const html  = buildEmailWrapper(
		process.env.RESET_EMAIL_LOGO_URL || 'https://i.ibb.co/9HshkkkB/logo.png',
		`<h1>Role Updated</h1>
		 <p class="lead">Hi <strong>${userName.replace(/</g,'&lt;')}</strong>, your role in Eric's Bakery has been changed.</p>
		 <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin:18px 0;flex-wrap:wrap">
		   <div style="text-align:center"><div style="color:#888;font-size:12px;margin-bottom:4px">Previous role</div>${badge(oldRole)}</div>
		   <div style="font-size:22px;color:#94a3b8">→</div>
		   <div style="text-align:center"><div style="color:#888;font-size:12px;margin-bottom:4px">New role</div>${badge(newRole)}</div>
		 </div>
		 <p style="color:#64748b;font-size:13px">Changed by: <strong>${changedByName.replace(/</g,'&lt;')}</strong></p>
		 <p style="color:#94a3b8;font-size:12px;margin-top:16px">If you believe this is a mistake, please contact the system owner.</p>
		 <div class="footer">Sent to ${toEmail}</div>`
	);
	if (mailTransporter) {
		await mailTransporter.sendMail({ from: EMAIL_FROM, to: toEmail, subject, text: plain, html });
		console.info('[role-change] email sent to', toEmail);
	} else {
		console.info('[role-change] SMTP not configured. Would have emailed', toEmail, '— role:', oldRole, '->', newRole);
	}
}

// ── Magic link: request ────────────────────────────────────────────────────
app.post('/api/auth/magic-link/request', async (req, res) => {
	const email = ((req.body && req.body.email) || '').trim().toLowerCase();
	if (!email) return res.status(400).json({ error: 'Email is required.' });

	const SAFE_RESPONSE = { ok: true, message: 'If this email is registered, a sign-in link has been sent.' };

	try {
		// ── 1. Look up user by email ──────────────────────────────────────────
		let user = null;
		try {
		const [rows] = await pool.query(
			'SELECT id, username, name, email FROM users WHERE email = ? LIMIT 1',
			[email]
		);
			user = rows && rows[0] ? rows[0] : null;
		} catch (e) {
			console.error('[magic-link] user lookup error:', e.message);
			return res.status(500).json({ error: `DB error (user lookup): ${e.message}` });
		}
		if (!user) return res.json(SAFE_RESPONSE);

		// ── 2. Ensure magic_links table exists ────────────────────────────────
		try {
			await pool.query(`CREATE TABLE IF NOT EXISTS magic_links (
				id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id    INT NOT NULL,
				token_hash CHAR(64)     NOT NULL,
				expires_at DATETIME     NOT NULL,
				used       TINYINT(1)   NOT NULL DEFAULT 0,
				created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
				UNIQUE INDEX idx_ml_token (token_hash),
				INDEX idx_ml_user (user_id),
				       INDEX idx_ml_expire (expires_at)
			)`);
		} catch (e) {
			console.warn('[magic-link] CREATE TABLE (non-fatal):', e.message);
		}

		// ── 3. Rate-limit: max 1 request per 60 seconds ───────────────────────
		try {
			const [rr] = await pool.query(
				'SELECT COUNT(*) AS n FROM magic_links WHERE user_id = ? AND created_at > NOW() - INTERVAL 60 SECOND AND used = 0',
			[user.id]
		);
			if (rr && rr[0] && Number(rr[0].n) > 0) {
				return res.status(429).json({ error: 'A sign-in link was sent recently — please wait a minute.' });
			}
		} catch (e) {
			if (e.code !== 'ER_NO_SUCH_TABLE') {
				console.warn('[magic-link] rate-limit check error (non-fatal):', e.message);
			}
		}

		// ── 4. Invalidate old tokens ──────────────────────────────────────────
		try {
			await pool.query('UPDATE magic_links SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);
		} catch (e) {
			if (e.code !== 'ER_NO_SUCH_TABLE') console.warn('[magic-link] invalidate old tokens (non-fatal):', e.message);
		}

		// ── 5. Generate and store token ───────────────────────────────────────
		const rawToken  = crypto.randomBytes(32).toString('hex');
		const tokenHash = sha256(rawToken);
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
		try {
		await pool.query(
				'INSERT INTO magic_links (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
				[user.id, tokenHash, expiresAt]
		);
		} catch (e) {
			console.error('[magic-link] INSERT token error:', e.message);
			return res.status(500).json({ error: `DB error (insert token): ${e.message}` });
		}

		// ── 6. Send email ───────────────────────────────────────────────────────
		const frontendBase = (process.env.FRONTEND_ORIGIN || 'https://erics-bakery.vercel.app').replace(/\/$/, '');
		const magicLink    = `${frontendBase}/?mltoken=${rawToken}`;
		let emailError = null;
		try {
			await sendMagicLinkEmail(email, user.name || user.username, magicLink);
		} catch (e) {
			emailError = e && e.message ? e.message : String(e);
			console.error('[magic-link] sendMagicLinkEmail FAILED:', emailError);
		}

		if (emailError) {
			// Token was saved — user can retry. Surface the real error.
			return res.status(500).json({ error: `Sign-in link created but email failed to send: ${emailError}` });
		}
		return res.json(SAFE_RESPONSE);

	} catch (err) {
		const detail = err && err.message ? err.message : String(err);
		console.error('[magic-link/request] UNHANDLED:', detail, err && err.stack ? '\n' + err.stack : '');
		return res.status(500).json({ error: `Server error: ${detail}` });
	}
});
// ── Magic link: verify (called by frontend when token is in URL) ───────────
app.post('/api/auth/magic-link/verify', async (req, res) => {
	const rawToken = ((req.body && req.body.token) || '').trim();
	if (!rawToken || rawToken.length !== 64) {
		return res.status(400).json({ error: 'Invalid token format.' });
	}

	const tokenHash = sha256(rawToken);

	try {
		const [rows] = await pool.query(
			`SELECT ml.id, ml.expires_at, ml.used,
			        u.id AS uid, u.username, u.role, u.name,
			        COALESCE(u.token_version, 0) AS token_version
			 FROM magic_links ml
			 JOIN users u ON u.id = ml.user_id
			 WHERE ml.token_hash = ?
			 LIMIT 1`,
			[tokenHash]
		);
		const ml = rows && rows[0];

		if (!ml)             return res.status(400).json({ error: 'Invalid or expired sign-in link.' });
		if (ml.used)         return res.status(400).json({ error: 'This sign-in link has already been used. Please request a new one.' });
		if (new Date(ml.expires_at) < new Date()) {
			return res.status(400).json({ error: 'This sign-in link has expired. Please request a new one.' });
		}

		// Consume the token
		await pool.query('UPDATE magic_links SET used = 1 WHERE id = ?', [ml.id]);

		// Issue JWT + record session
		const token = signToken({ id: ml.uid, username: ml.username, role: ml.role, name: ml.name, token_version: ml.token_version });
		res.cookie(TOKEN_NAME, token, buildCookieOptions());

		setImmediate(async () => {
			try {
				const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
				const ua = req.headers['user-agent']?.slice(0, 255) || null;
				await pool.query('INSERT INTO user_sessions (user_id, ip_address, user_agent) VALUES (?, ?, ?)', [ml.uid, ip, ua]);
			} catch (e) { console.warn('[magic-link] session insert failed', e && e.message); }
		});

		return res.json({ ok: true, user: { id: ml.uid, username: ml.username, role: ml.role, name: ml.name } });
	} catch (err) {
		console.error('[magic-link/verify] ERROR:', err && err.message ? err.message : err, err && err.stack ? '\n' + err.stack : '');
		const isDev = process.env.NODE_ENV !== 'production';
		return res.status(500).json({ error: isDev ? `Server error: ${err && err.message}` : 'Server error' });
	}
});

// ── Admin: change a user's role ────────────────────────────────────────────
app.patch('/api/admin/users/:id/role', authMiddleware, async (req, res) => {
	if (!hasRole(req.user, ['Owner', 'Admin'])) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	const targetId  = Number(req.params.id);
	const newRole   = (req.body && req.body.role || '').trim();
	const ALLOWED   = ['Owner', 'Admin', 'Baker', 'Assistant'];

	if (!targetId)              return res.status(400).json({ error: 'Invalid user id' });
	if (!ALLOWED.includes(newRole)) return res.status(400).json({ error: `Role must be one of: ${ALLOWED.join(', ')}` });

	// Non-owners cannot elevate anyone to Owner
	if (newRole === 'Owner' && req.user.role !== 'Owner') {
		return res.status(403).json({ error: 'Only Owners can assign the Owner role.' });
	}

	try {
		const [rows] = await pool.query(
			'SELECT id, username, name, email, role, is_superadmin FROM users WHERE id = ? LIMIT 1',
			[targetId]
		);
		if (!rows || !rows[0]) return res.status(404).json({ error: 'User not found' });
		const target  = rows[0];
		const oldRole = target.role;

		if (target.is_superadmin) {
			return res.status(403).json({ error: 'The superadmin role cannot be changed.' });
		}

		if (oldRole === newRole) return res.json({ ok: true, message: 'Role unchanged', user: target });

		await pool.query('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newRole, targetId]);

		// Log to activity (non-blocking)
		pool.query('INSERT INTO activity (user_id, action, text) VALUES (?, ?, ?)', [
			req.user.id,
			'role_change',
			`Role changed for ${target.name || target.username}: ${oldRole} → ${newRole} (by ${req.user.name || req.user.username})`
		]).catch(e => console.warn('[role-change] activity log failed', e && e.message));

		// Send notification email to the affected user (non-blocking)
		if (target.email) {
			sendRoleChangeEmail(
				target.email,
				target.name || target.username,
				oldRole,
				newRole,
				req.user.name || req.user.username
			).catch(e => console.warn('[role-change] email failed', e && e.message));
		}

		return res.json({ ok: true, oldRole, newRole, user: { ...target, role: newRole } });
	} catch (err) {
		console.error('PATCH /api/admin/users/:id/role err', err && err.stack ? err.stack : err);
		return res.status(500).json({ error: 'Server error' });
	}
});

app.get('/api/events', authMiddleware, async (req, res) => {
	const date = (req.query.date || '').slice(0, 10);
	try {
		if (!date) return res.json({
			items: []
		});

		const [rows] = await pool.query(
			`SELECT
         a.id,
         a.text,
         a.time,
         a.ingredient_id,
         a.action,
         i.name AS ingredient_name,
         u.id AS user_id,
         COALESCE(u.name, u.username, 'unknown') AS username
       FROM activity a
       LEFT JOIN ingredients i ON i.id = a.ingredient_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE DATE(a.time) = ?
       ORDER BY a.time DESC`,
			[date]
		);

		res.json({
			items: rows
		});
	} catch (e) {
		console.error('GET /api/events err', e);
		res.status(500).json({
			error: 'Server error'
		});
	}
});

const PORT = process.env.PORT || 3000;

// ── Notification prefs ───────────────────────────────────────────────────────

app.get('/api/notifications/prefs', authMiddleware, async (req, res) => {
	try {
		const [rows] = await pool.query('SELECT notif_prefs FROM users WHERE id = ? LIMIT 1', [req.user.id]);
		const raw = rows[0]?.notif_prefs ?? null;
		let prefs = {};
		if (raw !== null && raw !== undefined) {
			// mysql2 auto-parses JSON columns into JS objects — handle both cases
			if (typeof raw === 'object') {
				prefs = raw;
			} else {
				try { prefs = JSON.parse(String(raw)); } catch {}
			}
		}
		return res.json({ prefs });
	} catch (err) {
		console.error('GET /api/notifications/prefs err', err && err.message);
		return res.status(500).json({ error: 'Server error' });
	}
});

app.put('/api/notifications/prefs', authMiddleware, async (req, res) => {
	try {
		const prefs = req.body || {};
		await pool.query('UPDATE users SET notif_prefs = ? WHERE id = ?', [JSON.stringify(prefs), req.user.id]);
		return res.json({ ok: true });
	} catch (err) {
		console.error('PUT /api/notifications/prefs err', err && err.message);
		return res.status(500).json({ error: 'Server error' });
	}
});

// ── Get current alerts (low stock + expiring) for in-app use ─────────────────
app.get('/api/notifications/alerts', authMiddleware, async (req, res) => {
	try {
		const [ingredients] = await pool.query(
			'SELECT id, name, qty, min_qty, expiry, unit FROM ingredients ORDER BY name ASC'
		);

		const now = new Date();
		const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

		const lowStock = ingredients.filter(i => {
			const min = Number(i.min_qty || 0);
			const qty = Number(i.qty || 0);
			return min > 0 && qty <= min;
		});

		const expiringSoon = ingredients.filter(i => {
			if (!i.expiry) return false;
			const exp = new Date(i.expiry);
			return exp >= now && exp <= soon;
		});

		return res.json({ lowStock, expiringSoon });
	} catch (err) {
		console.error('GET /api/notifications/alerts err', err && err.message);
		return res.status(500).json({ error: 'Server error' });
	}
});

// ── Send email alert to the requesting user ───────────────────────────────────
app.post('/api/notifications/send-email', authMiddleware, async (req, res) => {
	try {
		const { type } = req.body || {};

		// Look up this user's email
		const [rows] = await pool.query('SELECT email, name, username FROM users WHERE id = ? LIMIT 1', [req.user.id]);
		const user = rows[0];
		const toEmail = user?.email;

		if (!toEmail) {
			return res.status(400).json({ error: 'No email address on your account. Add one in Profile first.' });
		}
		if (!mailTransporter) {
			return res.status(503).json({ error: 'Email is not configured on this server (SMTP_HOST missing).' });
		}

	try {
		const [ingredients] = await pool.query(
			'SELECT id, name, qty, min_qty, expiry, unit FROM ingredients ORDER BY name ASC'
		);

		const now = new Date();
		const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

		const lowStock = ingredients.filter(i => Number(i.qty || 0) <= Number(i.min_qty || 0));
		const expiringSoon = ingredients.filter(i => {
			if (!i.expiry) return false;
			const exp = new Date(i.expiry);
			return exp >= now && exp <= soon;
		});

		let subject, htmlBody;

		if (type === 'test') {
			subject = "✅ Test notification — Eric's Bakery";
			htmlBody = `<p>Hi ${user.name || user.username},</p><p>This is a test email from your bakery management system. Email notifications are working correctly!</p>`;
		} else if (type === 'low_stock') {
			if (!lowStock.length) return res.json({ ok: true, skipped: true, reason: 'No low stock items' });
			subject = `⚠️ Low stock alert — ${lowStock.length} item${lowStock.length > 1 ? 's' : ''} need restocking`;
			htmlBody = `<p>Hi ${user.name || user.username},</p><p>The following ingredients are at or below their minimum quantity:</p>
				<table style="border-collapse:collapse;width:100%">
					<tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Ingredient</th><th style="padding:8px;border:1px solid #ddd">Current Qty</th><th style="padding:8px;border:1px solid #ddd">Min Qty</th><th style="padding:8px;border:1px solid #ddd">Unit</th></tr>
					${lowStock.map(i => `<tr><td style="padding:8px;border:1px solid #ddd">${i.name}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;color:#dc2626"><strong>${i.qty}</strong></td><td style="padding:8px;border:1px solid #ddd;text-align:center">${i.min_qty || 0}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${i.unit || '—'}</td></tr>`).join('')}
				</table>`;
		} else if (type === 'expiring') {
			if (!expiringSoon.length) return res.json({ ok: true, skipped: true, reason: 'No expiring items' });
			subject = `🕐 Expiry alert — ${expiringSoon.length} item${expiringSoon.length > 1 ? 's' : ''} expiring within 7 days`;
			htmlBody = `<p>Hi ${user.name || user.username},</p><p>The following ingredients will expire within the next 7 days:</p>
				<table style="border-collapse:collapse;width:100%">
					<tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Ingredient</th><th style="padding:8px;border:1px solid #ddd">Expiry Date</th><th style="padding:8px;border:1px solid #ddd">Qty Left</th></tr>
					${expiringSoon.map(i => `<tr><td style="padding:8px;border:1px solid #ddd">${i.name}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;color:#d97706"><strong>${i.expiry}</strong></td><td style="padding:8px;border:1px solid #ddd;text-align:center">${i.qty} ${i.unit || ''}</td></tr>`).join('')}
				</table>`;
		} else if (type === 'digest') {
			subject = `📊 Daily digest — Eric's Bakery`;
			htmlBody = `<p>Hi ${user.name || user.username},</p>
				<h3>Daily Inventory Summary</h3>
				<p><strong>Total ingredients:</strong> ${ingredients.length}</p>
				<p><strong>Low stock items:</strong> ${lowStock.length}</p>
				<p><strong>Expiring within 7 days:</strong> ${expiringSoon.length}</p>
				${lowStock.length ? `<p style="color:#dc2626">⚠️ Items needing restock: ${lowStock.map(i => i.name).join(', ')}</p>` : '<p style="color:#15803d">✅ All stock levels are healthy.</p>'}
				${expiringSoon.length ? `<p style="color:#d97706">🕐 Expiring soon: ${expiringSoon.map(i => i.name).join(', ')}</p>` : ''}`;
		} else {
			return res.status(400).json({ error: 'Unknown notification type' });
		}

		await mailTransporter.sendMail({
			from: EMAIL_FROM,
			to: toEmail,
			subject,
			html: `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${htmlBody}<hr style="margin-top:30px"><p style="color:#888;font-size:12px">Eric's Bakery Management System — <a href="#">Manage notification preferences</a></p></body></html>`
		});

		return res.json({ ok: true, sent: true, to: toEmail });
		} catch (innerErr) {
			console.error('POST /api/notifications/send-email (send) err', innerErr && innerErr.message);
			return res.status(500).json({ error: `Email failed: ${innerErr.message}` });
		}
	} catch (err) {
		console.error('POST /api/notifications/send-email err', err && err.message);
		return res.status(500).json({ error: err.message || 'Server error' });
	}
});

// ── Schedules ─────────────────────────────────────────────────────────────────
app.get('/api/schedules', authMiddleware, async (req, res) => {
	try {
		const date = (req.query.date || '').slice(0, 10);
		let rows;
		if (date) {
			[rows] = await pool.query(
				`SELECT id, user_id, date, title, time, note, notified, created_at FROM schedules WHERE date = ? ORDER BY time ASC, created_at ASC`,
				[date]
			);
		} else {
			[rows] = await pool.query(
				`SELECT id, user_id, date, title, time, note, notified, created_at FROM schedules ORDER BY date ASC, time ASC, created_at ASC`
			);
		}
		res.json({ items: rows });
	} catch (e) {
		console.error('GET /api/schedules err', e);
		res.status(500).json({ error: 'Server error' });
	}
});

app.post('/api/schedules', authMiddleware, async (req, res) => {
	try {
		const { date, title, time, note } = req.body || {};
		if (!date || !title) return res.status(400).json({ error: 'date and title required' });
		const dateStr = String(date).slice(0, 10);
		const titleStr = String(title).slice(0, 200).trim();
		const timeStr = time ? String(time).slice(0, 10).trim() : null;
		const noteStr = note ? String(note).slice(0, 500).trim() : null;
		const [result] = await pool.query(
			`INSERT INTO schedules (user_id, date, title, time, note) VALUES (?, ?, ?, ?, ?)`,
			[req.user.id, dateStr, titleStr, timeStr, noteStr]
		);
		res.json({ id: result.insertId, date: dateStr, title: titleStr, time: timeStr, note: noteStr });
	} catch (e) {
		console.error('POST /api/schedules err', e);
		res.status(500).json({ error: 'Server error' });
	}
});

app.patch('/api/schedules/:id/notified', authMiddleware, async (req, res) => {
	try {
		const id = Number(req.params.id);
		if (!id) return res.status(400).json({ error: 'Invalid id' });
		await pool.query(`UPDATE schedules SET notified = 1 WHERE id = ?`, [id]);
		res.json({ ok: true });
	} catch (e) {
		console.error('PATCH /api/schedules/:id/notified err', e);
		res.status(500).json({ error: 'Server error' });
	}
});

app.delete('/api/schedules/:id', authMiddleware, async (req, res) => {
	try {
		const id = Number(req.params.id);
		if (!id) return res.status(400).json({ error: 'Invalid id' });
		await pool.query(`DELETE FROM schedules WHERE id = ?`, [id]);
		res.json({ ok: true });
	} catch (e) {
		console.error('DELETE /api/schedules/:id err', e);
		res.status(500).json({ error: 'Server error' });
	}
});

async function runStartupMigrations() {
	const conn = await pool.getConnection();
	try {
		// 1. user_sessions table
		await conn.query(`
			CREATE TABLE IF NOT EXISTS user_sessions (
				id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id       INT NOT NULL,
				logged_in_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				logged_out_at DATETIME DEFAULT NULL,
				ip_address    VARCHAR(64) DEFAULT NULL,
				user_agent    VARCHAR(255) DEFAULT NULL,
				INDEX idx_user_sessions_user_id (user_id),
				INDEX idx_user_sessions_logged_in (logged_in_at)
			)
		`);
		console.log('[startup] user_sessions table ready');

		// 2. Optional user columns — add if missing, each isolated so one failure can't block others
		try {
			await conn.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT NULL`);
			console.log('[startup] users.email column added');
		} catch (e) {
			if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[startup] users.email:', e.message);
		}
		try {
			await conn.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT NULL`);
			console.log('[startup] users.phone column added');
		} catch (e) {
			if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[startup] users.phone:', e.message);
		}
		try {
			await conn.query(`ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT NULL`);
			console.log('[startup] users.updated_at column added');
		} catch (e) {
			if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[startup] users.updated_at:', e.message);
		}
		try {
			await conn.query(`ALTER TABLE users ADD COLUMN notif_prefs JSON DEFAULT NULL`);
			console.log('[startup] users.notif_prefs column added');
		} catch (e) {
			if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[startup] users.notif_prefs:', e.message);
		}

		// 2b. token_version — used to invalidate all other sessions on password change
		try {
			await conn.query(`ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0`);
			console.log('[startup] token_version column added to users');
		} catch (e) {
			if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[startup] token_version:', e.message);
		}

		try {
			await conn.query(`ALTER TABLE user_sessions ADD COLUMN last_active_at DATETIME DEFAULT NULL`);
			await conn.query(`ALTER TABLE user_sessions ADD INDEX idx_user_sessions_active (last_active_at)`);
			console.log('[startup] last_active_at column added to user_sessions');
		} catch (e) {
			if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[startup] last_active_at:', e.message);
		}

		// 3. schedules table
		await conn.query(`
			CREATE TABLE IF NOT EXISTS schedules (
				id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id    INT NOT NULL,
				date       DATE NOT NULL,
				title      VARCHAR(200) NOT NULL,
				time       VARCHAR(10) DEFAULT NULL,
				note       VARCHAR(500) DEFAULT NULL,
				notified   TINYINT(1) NOT NULL DEFAULT 0,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				INDEX idx_schedules_date (date),
				INDEX idx_schedules_user (user_id)
			)
		`);
		console.log('[startup] schedules table ready');

		// 4. magic_links table — passwordless sign-in (isolated so any earlier error can't skip it)
		// If table exists with old 'email NOT NULL' schema, make it nullable so INSERTs work
		try {
			await conn.query(`ALTER TABLE magic_links MODIFY COLUMN email VARCHAR(255) DEFAULT NULL`);
			console.log('[startup] magic_links.email made nullable');
		} catch (e) {
			// ER_BAD_FIELD_ERROR = column doesn't exist (already dropped/never added) — fine
			if (e.code !== 'ER_BAD_FIELD_ERROR' && e.code !== 'ER_NO_SUCH_TABLE') {
				console.warn('[startup] magic_links email alter (non-fatal):', e.message);
			}
		}
		try {
		await conn.query(`
			CREATE TABLE IF NOT EXISTS magic_links (
				id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id    INT NOT NULL,
				token_hash CHAR(64)     NOT NULL,
				expires_at DATETIME     NOT NULL,
				used       TINYINT(1)   NOT NULL DEFAULT 0,
				created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
				UNIQUE INDEX idx_ml_token  (token_hash),
				       INDEX idx_ml_user   (user_id),
				       INDEX idx_ml_expire (expires_at)
			)
		`);
		console.log('[startup] magic_links table ready');
		} catch (e) {
			console.error('[startup] magic_links table creation failed:', e && e.message ? e.message : e);
		}
		// ── superadmin: add is_superadmin column if missing ─────────────────
		try {
			await conn.query(`ALTER TABLE users ADD COLUMN is_superadmin TINYINT(1) NOT NULL DEFAULT 0`);
			console.log('[startup] is_superadmin column added to users');
		} catch (e) {
			if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[startup] is_superadmin:', e.message);
		}

		// ── superadmin: add status column if missing ─────────────────────────
		try {
			await conn.query(`ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'`);
			console.log('[startup] status column added to users');
		} catch (e) {
			if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[startup] status:', e.message);
		}

		// ── superadmin: upsert account from env vars ──────────────────────────
		if (SUPERADMIN_USER && SUPERADMIN_PASS) {
			try {
				const bcryptLib = require('bcryptjs');
				const saEmail   = (process.env.SUPERADMIN_EMAIL || SMTP_USER || '').trim();
				const [saRows]  = await conn.query('SELECT id, password_hash FROM users WHERE username = ? LIMIT 1', [SUPERADMIN_USER]);
				if (saRows && saRows[0]) {
					// Account exists — ensure it stays superadmin + active, update password if env changed
					const pwMatch = await bcryptLib.compare(SUPERADMIN_PASS, saRows[0].password_hash);
					const updates = ["is_superadmin = 1", "status = 'active'", "role = 'Owner'"];
					const params  = [];
					if (!pwMatch) {
						const newHash = await bcryptLib.hash(SUPERADMIN_PASS, 10);
						updates.unshift('password_hash = ?');
						params.push(newHash);
						console.log('[startup] superadmin password updated from env');
					}
					params.push(saRows[0].id);
					await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
					console.log('[startup] superadmin account verified:', SUPERADMIN_USER);
				} else {
					// Create fresh superadmin account
					const saHash = await bcryptLib.hash(SUPERADMIN_PASS, 10);
					await conn.query(
						"INSERT INTO users (username, password_hash, role, name, email, is_superadmin, status) VALUES (?, ?, 'Owner', ?, ?, 1, 'active')",
						[SUPERADMIN_USER, saHash, SUPERADMIN_USER, saEmail]
					);
					console.log('[startup] superadmin account created:', SUPERADMIN_USER);
				}
			} catch (e) {
				console.error('[startup] superadmin seed failed:', e && e.message ? e.message : e);
			}
		} else {
			console.warn('[startup] SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD not set — no superadmin seeded.');
		}

	} catch (err) {
		console.error('[startup] migration error:', err && err.message ? err.message : err);
	} finally {
		conn.release();
	}
}

// ── Global Express error handler — ensures every crash returns JSON, never HTML ──
app.use((err, req, res, next) => {
	const detail = err && err.message ? err.message : String(err);
	console.error('[express] unhandled error:', detail, err && err.stack ? '\n' + err.stack : '');
	if (res.headersSent) return next(err);
	res.status(err.status || 500).json({ error: `Server error: ${detail}` });
});

// ── Account Activation — email helpers ────────────────────────────────────

async function sendActivationRequestEmail(adminEmail, newName, newEmail, newRole) {
	if (!adminEmail) { console.warn('[activation] ADMIN_EMAIL not set'); return; }
	const loginUrl = process.env.FRONTEND_ORIGIN || 'https://erics-bakery.vercel.app';
	const subject  = `Eric's Bakery — New account pending approval`;
	const plain    = `New signup awaiting approval.\n\nName: ${newName}\nEmail: ${newEmail}\nRole: ${newRole}\n\nApprove/reject at: ${loginUrl}`;
	const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	const html = buildEmailWrapper(
		process.env.RESET_EMAIL_LOGO_URL || 'https://i.ibb.co/9HshkkkB/logo.png',
		`<h1>New Account Request</h1>
		 <p class="lead">A new user has registered and is waiting for your approval.</p>
		 <table style="width:100%;border-collapse:collapse;margin:16px 0;text-align:left">
		   <tr><td style="padding:6px 0;color:#888;font-size:13px;width:60px">Name</td><td style="font-weight:700">${esc(newName)}</td></tr>
		   <tr><td style="padding:6px 0;color:#888;font-size:13px">Email</td><td>${esc(newEmail)}</td></tr>
		   <tr><td style="padding:6px 0;color:#888;font-size:13px">Role</td><td><span style="background:#e0e7ff;color:#3730a3;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700">${esc(newRole)}</span></td></tr>
		 </table>
		 <a href="${loginUrl}" class="cta">Review in Admin Panel &rarr;</a>
		 <div class="footer">Sent to ${esc(adminEmail)}</div>`
	);
	if (mailTransporter) {
		await mailTransporter.sendMail({ from: EMAIL_FROM, to: adminEmail, subject, text: plain, html });
		console.info('[activation] admin notified:', adminEmail);
	} else { console.warn('[activation] SMTP not configured. Pending:', newName, newEmail); }
}

async function sendAccountApprovedEmail(toEmail, userName) {
	if (!toEmail) return;
	const loginUrl = process.env.FRONTEND_ORIGIN || 'https://erics-bakery.vercel.app';
	const subject  = `Eric's Bakery — Your account has been approved! 🎉`;
	const plain    = `Hi ${userName},\n\nYour account has been approved! Sign in at: ${loginUrl}`;
	const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	const html = buildEmailWrapper(
		process.env.RESET_EMAIL_LOGO_URL || 'https://i.ibb.co/9HshkkkB/logo.png',
		`<h1>Account Approved! 🎉</h1>
		 <p class="lead">Hi <strong>${esc(userName)}</strong>, your account has been approved. You can now sign in.</p>
		 <a href="${loginUrl}" class="cta">Sign in now &rarr;</a>
		 <div class="footer">Sent to ${esc(toEmail)}</div>`
	);
	if (mailTransporter) {
		await mailTransporter.sendMail({ from: EMAIL_FROM, to: toEmail, subject, text: plain, html });
		console.info('[activation] approval email sent to', toEmail);
	} else { console.info('[activation] SMTP not configured — would have approved', toEmail); }
}

async function sendAccountRejectedEmail(toEmail, userName, reason) {
	if (!toEmail) return;
	const subject = `Eric's Bakery — Account registration update`;
	const plain   = `Hi ${userName},\n\nYour registration could not be approved.${reason ? '\nReason: '+reason : ''}\n\nContact the bakery admin if this is a mistake.`;
	const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	const html = buildEmailWrapper(
		process.env.RESET_EMAIL_LOGO_URL || 'https://i.ibb.co/9HshkkkB/logo.png',
		`<h1>Account Update</h1>
		 <p class="lead">Hi <strong>${esc(userName)}</strong>, unfortunately your registration could not be approved.</p>
		 ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin:14px 0;text-align:left"><strong>Reason:</strong> ${esc(reason)}</div>` : ''}
		 <p style="color:#94a3b8;font-size:13px">Contact the bakery admin if this is a mistake.</p>
		 <div class="footer">Sent to ${esc(toEmail)}</div>`
	);
	if (mailTransporter) {
		await mailTransporter.sendMail({ from: EMAIL_FROM, to: toEmail, subject, text: plain, html });
		console.info('[activation] rejection email sent to', toEmail);
	} else { console.info('[activation] SMTP not configured — would have rejected', toEmail); }
}

// ── Account Activation — admin routes ─────────────────────────────────────

app.get('/api/admin/pending-users', authMiddleware, async (req, res) => {
	try {
		if (!hasRole(req.user, ['Owner', 'Admin'])) return res.status(403).json({ error: 'Forbidden' });
		const [rows] = await pool.query(
			"SELECT id, username, name, email, role, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC"
		);
		return res.json({ users: rows });
	} catch (e) { console.error('[activation] GET pending-users', e); return res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/users/:id/approve', authMiddleware, async (req, res) => {
	try {
		if (!hasRole(req.user, ['Owner', 'Admin'])) return res.status(403).json({ error: 'Forbidden' });
		const targetId = Number(req.params.id);
		if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
		const [rows] = await pool.query('SELECT id, name, username, email, status, is_superadmin FROM users WHERE id = ? LIMIT 1', [targetId]);
		if (!rows || !rows[0]) return res.status(404).json({ error: 'User not found' });
		const user = rows[0];
		if (user.status !== 'pending') return res.status(400).json({ error: 'User is not pending approval' });
		await pool.query("UPDATE users SET status = 'active' WHERE id = ?", [targetId]);
		sendAccountApprovedEmail(user.email, user.name || user.username)
			.catch(e => console.warn('[activation] approval email failed:', e && e.message));
		return res.json({ ok: true, message: `${user.name || user.username}'s account has been approved.` });
	} catch (e) { console.error('[activation] approve error', e); return res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/users/:id/reject', authMiddleware, async (req, res) => {
	try {
		if (!hasRole(req.user, ['Owner', 'Admin'])) return res.status(403).json({ error: 'Forbidden' });
		const targetId = Number(req.params.id);
		if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
		const reason = ((req.body && req.body.reason) || '').toString().trim().slice(0, 500);
		const [rows] = await pool.query('SELECT id, name, username, email, status, is_superadmin FROM users WHERE id = ? LIMIT 1', [targetId]);
		if (!rows || !rows[0]) return res.status(404).json({ error: 'User not found' });
		const user = rows[0];
		if (user.status !== 'pending') return res.status(400).json({ error: 'User is not pending approval' });
		await pool.query("UPDATE users SET status = 'rejected' WHERE id = ?", [targetId]);
		sendAccountRejectedEmail(user.email, user.name || user.username, reason)
			.catch(e => console.warn('[activation] rejection email failed:', e && e.message));
		return res.json({ ok: true, message: `${user.name || user.username}'s account has been rejected.` });
	} catch (e) { console.error('[activation] reject error', e); return res.status(500).json({ error: 'Server error' }); }
});

// Safety net: log unhandled promise rejections (don't crash on Vercel serverless)
process.on('unhandledRejection', (reason) => {
	console.error('[unhandledRejection]', reason && reason.message ? reason.message : reason);
});

runStartupMigrations().then(() => {
	app.listen(PORT, () => console.log('API + static server listening on', PORT));
});