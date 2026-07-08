const pool = require('./db.js');
async function fix() {
  try {
    await pool.query("ALTER TABLE Cita ADD COLUMN estado VARCHAR(50) DEFAULT 'Pendiente'");
    console.log("Column 'estado' added successfully.");
  } catch (err) {
    console.error("Error adding column:", err.message);
  } finally {
    pool.end();
  }
}
fix();
