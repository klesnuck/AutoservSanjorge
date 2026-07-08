const pool = require('./db.js');
async function run() {
  try {
    await pool.query('ALTER TABLE cotizacion ADD COLUMN detalles TEXT;');
    console.log('Added detalles');
  } catch(e) { console.log('detalles exists or err:', e.message); }
  
  try {
    await pool.query("ALTER TABLE cotizacion ADD COLUMN estado VARCHAR(50) DEFAULT 'Pendiente';");
    console.log('Added estado');
  } catch(e) { console.log('estado exists or err:', e.message); }
  
  process.exit(0);
}
run();
