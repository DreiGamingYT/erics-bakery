// server/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./server/db');

const app = express();
app.use(cors()); // during dev; tighten in production
app.use(express.json());

// Serve frontend static files (assumes ../frontend/index.html)
const staticDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(staticDir));

// Replace your existing GET /api/products catch with this:
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, qty, price FROM products ORDER BY id DESC LIMIT 1000');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/products error:', err);
    // dev: include the message/code so browser shows the root cause
    res.status(500).json({ error: 'DB error', message: err.message, code: err.code });
  }
});

// Replace your existing POST /api/products catch with this:
app.post('/api/products', async (req, res) => {
  try {
    const { name, qty = 0, price = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const [result] = await pool.execute(
      'INSERT INTO products (name, qty, price) VALUES (?, ?, ?)',
      [name, Number(qty), Number(price)]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('POST /api/products error:', err);
    res.status(500).json({ error: 'DB error', message: err.message, code: err.code });
  }
});

// Fallback to index.html for SPA routes
app.use((req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
