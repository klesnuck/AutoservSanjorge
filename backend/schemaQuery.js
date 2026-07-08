require('dotenv').config();
const pool = require('./db.js');

async function run() {
  const tables = ['marca', 'modelos', 'anio', 'motores', 'modelos_has_motores'];
  for (const t of tables) {
    const res = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1', [t]);
    console.log(t, res.rows);
  }
  process.exit(0);
}
run();
