require('dotenv').config();
const path = require('path');
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_strong_secret';
const TOKEN_NAME = process.env.COOKIE_NAME || 'bakery_token';

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

let mailer = null;
if(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS){
  mailer = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: (process.env.MAIL_SECURE === 'true') || false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
}

app.post('/api/auth/signup', async (req, res) => {
    try {
        const {
            username,
            password,
            role = 'Baker',
            name = null
        } = req.body;
        if (!username || !password) return res.status(400).json({
            message: 'username & password required'
        });
        const existing = await getUserByUsername(username);
        if (existing) return res.status(409).json({
            message: 'Username exists'
        });
        const hash = await bcrypt.hash(password, 10);
        const [r] = await pool.query(
            'INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, ?, ?)', [
                username, hash, role, name || username
            ]);
        const user = {
            id: r.insertId,
            username,
            role,
            name: name || username
        };
        const token = signToken(user);
        res.cookie(TOKEN_NAME, token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });
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
        res.cookie(TOKEN_NAME, token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });
        res.json({
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
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10')));
        const offset = (page - 1) * limit;
        const type = (req.query.type || 'all');
        const filter = (req.query.filter || 'all');
        const search = (req.query.search || '').trim();
        const sort = (['name', 'qty', 'expiry'].includes(req.query.sort) ? req.query.sort :
            'name');
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

        const q = `SELECT id,name,type,supplier,qty,unit,min_qty,max_qty,expiry,attrs,created_at,updated_at
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
// POST /api/ingredients  (replace existing handler)
app.post('/api/ingredients', authMiddleware, async (req, res) => {
  try {
    const data = req.body || {};
    const name = (data.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name required' });

    const type = data.type || 'ingredient';
    const supplier = data.supplier || '';
    const qty = Number(data.qty || 0);

    // Default unit only for actual 'ingredient' types. For equipment/packaging/maintenance leave empty unless provided.
    const unit = (typeof data.unit === 'string' && data.unit.trim() !== '') 
      ? data.unit.trim()
      : (type === 'ingredient' ? 'kg' : '');

    const min_qty = Number(data.min_qty || 0);
    const max_qty = data.max_qty == null ? null : data.max_qty;
    const expiry = data.expiry || null;
    const attrs = data.attrs ? JSON.stringify(data.attrs) : null;

    const [r] = await pool.query(
      `INSERT INTO ingredients (name, type, supplier, qty, unit, min_qty, max_qty, expiry, attrs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, type, supplier, qty, unit, min_qty, max_qty, expiry, attrs]
    );

    // fetch the inserted row (so we rely on the DB value for unit etc.)
    const [rows] = await pool.query('SELECT * FROM ingredients WHERE id = ?', [r.insertId]);
    const created = rows && rows[0] ? rows[0] : null;

    // respond with the created row
    res.status(201).json({ ingredient: created });

    // log initial stock (non-blocking) — use the saved row's unit to ensure correctness
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
    return res.status(500).json({ error: 'Server error', detail: err && err.message ? err.message : String(err) });
  }
});

// GET single ingredient by id
app.get('/api/ingredients/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const [rows] = await pool.query('SELECT id,name,type,supplier,qty,unit,min_qty,max_qty,expiry,attrs,created_at,updated_at FROM ingredients WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const row = rows[0];
    // try to parse attrs if string
    if (typeof row.attrs === 'string' && row.attrs) {
      try { row.attrs = JSON.parse(row.attrs); } catch(e){ /* leave as string */ }
    }

    return res.json({ ingredient: row });
  } catch (e) {
    console.error('GET /api/ingredients/:id err', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/ingredients/:id/stock', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const type = req.body.type;
    const qty = Number(req.body.qty || 0);
    const note = req.body.note || '';
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
            `SELECT id,name,type,supplier,qty,unit,min_qty,max_qty,expiry FROM ingredients ${whereSql} ORDER BY name ASC`,
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API + static server listening on', PORT));