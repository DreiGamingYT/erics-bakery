// server/db.js
// MySQL pool that supports Railway's DATABASE_URL or individual env vars.
// Uses mysql2/promise.

const mysql = require('mysql2/promise');
require('dotenv').config();

function createPoolFromEnv() {
  // If Railway or other providers give a single DATABASE_URL, use it.
  // Expected format: mysql://user:pass@host:port/dbname
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (databaseUrl) {
    // Simple parser
    const m = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (m) {
      const [, user, password, host, port, database] = m;
      return mysql.createPool({
        host,
        user,
        password,
        database,
        port: Number(port),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    }
    // fallback to letting mysql2 parse URL directly
    return mysql.createPool(databaseUrl);
  }

  // Otherwise use explicit env vars
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'test',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

const pool = createPoolFromEnv();

module.exports = pool;
