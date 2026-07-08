/**
 * Migration: creates Productos_compatibilidad table
 * Run once: node migrations/add_compatibilidad.js
 */
const pool = require('../db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Productos_compatibilidad (
      id SERIAL PRIMARY KEY,
      idProductos INT NOT NULL REFERENCES Productos(idProductos) ON DELETE CASCADE,
      idMarcas INT REFERENCES Marca(idMarcas) ON DELETE CASCADE,
      idModelos INT REFERENCES Modelos(idModelos) ON DELETE CASCADE,
      cantidad INT NOT NULL DEFAULT 1,
      precio_especial NUMERIC(10,2) DEFAULT NULL
    )
  `);

  // Index for fast lookup by modelo
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_compatibilidad_modelos
    ON Productos_compatibilidad(idModelos)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_compatibilidad_marcas
    ON Productos_compatibilidad(idMarcas)
  `);

  console.log('✅ Tabla Productos_compatibilidad creada correctamente.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
