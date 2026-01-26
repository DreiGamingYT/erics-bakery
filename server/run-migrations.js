// server/run-migrations.js
const fs = require('fs');
const pool = require('./db');

(async function(){
  try {
    const sql = fs.readFileSync(__dirname + '/migrations.sql', 'utf8');
    const stmts = sql.split(/;\s*$/m).map(s=>s.trim()).filter(Boolean);
    for(const s of stmts){
      console.log('RUN:', s.split('\n')[0].slice(0,120));
      await pool.query(s);
    }
    console.log('Migrations ran OK');
    process.exit(0);
  } catch(e) {
    console.error('Migration error', e);
    process.exit(1);
  }
})();
