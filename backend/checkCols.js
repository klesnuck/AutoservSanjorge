const pool = require('./db');
pool.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'mantenimiento'
`)
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => process.exit());
