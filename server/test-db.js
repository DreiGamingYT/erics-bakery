// server/test-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    console.log('Using DATABASE_URL:', !!process.env.DATABASE_URL);
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('Connected to DB OK');
    const [rows] = await conn.query('SELECT DATABASE() AS db, VERSION() AS version, 1+1 AS ok');
    console.log(rows);
    const [tables] = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() LIMIT 20");
    console.log('Some tables in DB:', tables.slice(0,20));
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('DB connect error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
