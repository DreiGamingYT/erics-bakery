// server/test-db.js
require('dotenv').config();
const pool = require('./db');

(async () => {
  try {
    console.log('ENV preview:', {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME
    });

    // Try to get a connection
    const conn = await pool.getConnection();
    console.log('Connected to DB OK');

    // basic query
    const [r] = await conn.query('SELECT 1+1 AS result');
    console.log('SELECT 1+1 ->', r);

    // test products table existence
    try {
      const [rows] = await conn.query('SELECT * FROM products LIMIT 1');
      console.log('Products table OK. Sample rows:', rows);
    } catch (e) {
      console.error('Error when querying products table:', e.code, e.message);
    }

    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Connection test failed:', err.code, err.message);
    console.error(err);
    process.exit(1);
  }
})();
