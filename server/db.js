// server/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const connStr = process.env.DATABASE_URL || process.env.MYSQL_URL || null;
if(!connStr) {
  console.error('Missing DATABASE_URL / MYSQL_URL in env');
  process.exit(1);
}

const pool = mysql.createPool(connStr);
module.exports = pool;
