require('dotenv').config();
const mysql = require('mysql2/promise');

const connStr = process.env.DATABASE_URL || process.env.MYSQL_URL || null;
if(!connStr) {
  console.error('Missing DATABASE_URL / MYSQL_URL in env');
  process.exit(1);
}

const pool = mysql.createPool(connStr);

pool.getConnection()
  .then(conn => {
    console.log('[db] Connected to database successfully');
    conn.release();
  })
  .catch(err => {
    console.error('[db] Failed to connect to database:', err.message);
    process.exit(1);
  });

module.exports = pool;

