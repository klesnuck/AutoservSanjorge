const pool = require('./db');
pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema=$1', ['public'])
  .then(res => console.log(res.rows.map(r => r.table_name)))
  .catch(console.error)
  .finally(() => process.exit());
