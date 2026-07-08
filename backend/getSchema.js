const pool = require('./db');
const tables = ['productos', 'productos_has_servicios', 'modelos', 'marca', 'vehiculos'];
async function run() {
  for (const t of tables) {
    const res = await pool.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position',
      [t]
    );
    console.log(`\n=== ${t} ===`);
    console.log(res.rows.map(r => `  ${r.column_name} (${r.data_type})`).join('\n'));
  }
  process.exit();
}
run().catch(e => { console.error(e); process.exit(1); });
