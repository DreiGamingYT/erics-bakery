const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, qty, price FROM products LIMIT 200');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// POST /api/products (example creating product)
router.post('/', async (req, res) => {
  try {
    const { name, qty, price } = req.body;
    const [result] = await db.execute(
      'INSERT INTO products (name, qty, price) VALUES (?, ?, ?)',
      [name, qty, price]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
