// server/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const connStr = process.env.DATABASE_URL || process.env.MYSQL_URL || null;

function buildConfigFromEnv() {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
  const user = process.env.DB_USER || process.env.MYSQL_USER || process.env.DB_USERNAME;
  const password = process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD;
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.DB_DATABASE;
  if (!host || !user || !database) return null;
  return {
    host, port, user, password, database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    decimalNumbers: true
  };
}

let pool;
try {
  if (connStr) {
    // mysql2 accepts a connection URI as createPool argument
    pool = mysql.createPool(connStr);
    console.info('[db] created pool from connection string');
  } else {
    const cfg = buildConfigFromEnv();
    if (!cfg) {
      console.warn('[db] no DATABASE_URL and insufficient DB_* env vars found. DB operations will fail until env vars are provided.');
      // create a harmless pool (will error when used) but won't crash process at import time.
      pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        database: 'none',
        waitForConnections: true,
        connectionLimit: 1
      });
    } else {
      pool = mysql.createPool(cfg);
      console.info('[db] created pool from DB_* env vars');
    }
  }
} catch (err) {
  console.error('[db] createPool error', err && err.stack ? err.stack : err);
  // rethrow so server startup fails visibly (only if you prefer)
  throw err;
}

module.exports = pool;
