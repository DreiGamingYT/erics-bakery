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

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

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

const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_strong_secret';
const TOKEN_NAME = process.env.COOKIE_NAME || 'bakery_token';

const crypto = require('crypto');
let nodemailer;
try {
	nodemailer = require('nodemailer');
} catch (e) {
	nodemailer = null;
}

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || `"Eric's Bakery" <archlinux@google.com>`;

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
		name: user.name
	}, JWT_SECRET, {
		expiresIn: '7d'
	});
}
async function getUserByUsername(username) {
	const [rows] = await pool.query(
		'SELECT id, username, password_hash, role, name FROM users WHERE username = ?', [username]);
	return rows[0];
}

function authMiddleware(req, res, next) {
	try {
		const token = req.cookies[TOKEN_NAME] || (req.headers.authorization && req.headers.authorization
			.split(' ')[1]);
		if (!token) return res.status(401).json({
			message: 'Not authenticated'
		});
		const data = jwt.verify(token, JWT_SECRET);
		req.user = data;
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

let mailer = null;
if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
	mailer = nodemailer.createTransport({
		host: process.env.MAIL_HOST,
		port: Number(process.env.MAIL_PORT || 587),
		secure: (process.env.MAIL_SECURE === 'true') || false,
		auth: {
			user: process.env.MAIL_USER,
			pass: process.env.MAIL_PASS
		}
	});
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
		const hash = await bcrypt.hash(password, 10);
		const [r] = await pool.query(
			'INSERT INTO users (username, password_hash, role, name, email) VALUES (?, ?, ?, ?, ?)', [
				username, hash, role, name || username, email
			]);
		const user = {
			id: r.insertId,
			username,
			role,
			name: name || username
		};
		const token = signToken(user);
		res.cookie(TOKEN_NAME, token, buildCookieOptions());
		res.json({
			user
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

		const token = signToken({
			id: user.id,
			username: user.username,
			role: user.role,
			name: user.name
		});

		res.cookie(TOKEN_NAME, token, buildCookieOptions());

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

app.post('/api/auth/logout', (req, res) => {
	res.clearCookie(TOKEN_NAME, {
		httpOnly: true
	});
	res.json({
		ok: true
	});
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
               ORDER BY ${pool.escapeId ? pool.escapeId(sort) : sort} ${order}
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
		const page = Math.max(1, Number(req.query.page || 1));
		const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
		const offset = (page - 1) * limit;
		const [rows] = await pool.query(`SELECT a.id, a.ingredient_id, a.user_id, a.text, a.time, u.username as username, i.name as ingredient_name
       FROM activity a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN ingredients i ON i.id = a.ingredient_id
       ORDER BY a.time DESC
       LIMIT ? OFFSET ?`, [limit, offset]);
		const [count] = await pool.query('SELECT COUNT(*) as cnt FROM activity');
		res.json({
			items: rows,
			meta: {
				total: (count && count[0] ? count[0].cnt : 0),
				page,
				limit
			}
		});
	} catch (e) {
		console.error('GET /api/activity err', e);
		res.status(500).json({
			error: 'Server error'
		});
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

app.post('/api/auth/verify-reset', async (req, res) => {
	try {
		const email = (req.body.email || '').trim().toLowerCase();
		const code = (req.body.code || '').trim();
		if (!email || !code) return res.status(400).json({
			error: 'Email and code required'
		});

		const [urows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
		if (!urows || urows.length === 0) return res.status(400).json({
			error: 'Invalid email or code'
		});
		const uid = urows[0].id;

		const [resRows] = await pool.query(
			'SELECT id, code_hash, expires_at, used FROM password_resets WHERE user_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
			[uid]
		);
		if (!resRows || resRows.length === 0) return res.status(400).json({
			error: 'Invalid or expired code'
		});

		const rec = resRows[0];
		if (new Date(rec.expires_at) < new Date()) return res.status(400).json({
			error: 'Code expired'
		});

		const ok = await bcrypt.compare(code, rec.code_hash);
		if (!ok) return res.status(400).json({
			error: 'Invalid code'
		});

		const token = signResetToken({
			uid,
			rid: rec.id
		});
		return res.json({
			ok: true,
			resetToken: token
		});
	} catch (e) {
		console.error('POST /api/auth/verify-reset err', e);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

app.post('/api/auth/reset', async (req, res) => {
	try {
		const {
			resetToken,
			newPassword
		} = req.body || {};
		if (!resetToken || !newPassword) return res.status(400).json({
			error: 'Token and new password required'
		});

		let payload;
		try {
			payload = jwt.verify(resetToken, JWT_SECRET);
		} catch (e) {
			return res.status(400).json({
				error: 'Invalid or expired reset token'
			});
		}
		const uid = payload.uid;
		const rid = payload.rid;
		if (!uid || !rid) return res.status(400).json({
			error: 'Invalid token payload'
		});

		const [rows] = await pool.query('SELECT id, used, expires_at FROM password_resets WHERE id = ? AND user_id = ?', [rid, uid]);
		if (!rows || rows.length === 0) return res.status(400).json({
			error: 'Reset request not found'
		});
		const rec = rows[0];
		if (rec.used) return res.status(400).json({
			error: 'This reset code has already been used'
		});
		if (new Date(rec.expires_at) < new Date()) return res.status(400).json({
			error: 'Reset code expired'
		});

		const newHash = await bcrypt.hash(newPassword, 10);
		await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, uid]);

		await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [rid]);

		return res.json({
			ok: true,
			message: 'Password updated'
		});
	} catch (e) {
		console.error('POST /api/auth/reset err', e);
		return res.status(500).json({
			error: 'Server error'
		});
	}
});

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
		await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, uid]);

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

		if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
			const nodemailer = require('nodemailer');
			const transporter = nodemailer.createTransport({
				host: process.env.SMTP_HOST,
				port: Number(process.env.SMTP_PORT || 587),
				secure: (String(process.env.SMTP_PORT || '587') === '465'), 

				auth: {
					user: process.env.SMTP_USER,
					pass: process.env.SMTP_PASS
				}
			});

			try {
				await transporter.verify();
				console.info('[sendResetEmail] SMTP transporter verified');
			} catch (verr) {
				console.warn('[sendResetEmail] transporter verify failed (continuing):', verr && verr.message ? verr.message : verr);
			}

			const fromAddress = (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) ? process.env.EMAIL_FROM.trim() : process.env.SMTP_USER;

			const info = await transporter.sendMail({
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

function signResetToken(payload) {

	const expires = (process.env.RESET_TOKEN_EXPIRE_MIN ? Number(process.env.RESET_TOKEN_EXPIRE_MIN) : 10);
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: `${expires}m`
	});
}

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
app.listen(PORT, () => console.log('API + static server listening on', PORT));