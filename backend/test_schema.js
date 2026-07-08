const pool = require('./db.js');
pool.query("SELECT table_name, column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name ILIKE 'cita' OR table_name ILIKE 'cotizacion'", (err, res) => {
  if (err) console.error(err);
  else console.table(res.rows);
  pool.end();
});
