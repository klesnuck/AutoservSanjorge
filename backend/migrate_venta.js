const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create DetalleVenta table
    await client.query(`
      CREATE TABLE IF NOT EXISTS DetalleVenta (
        idDetalleVenta SERIAL PRIMARY KEY,
        idVenta INTEGER REFERENCES Venta(idVenta) ON DELETE CASCADE,
        idProductos INTEGER REFERENCES Productos(idProductos),
        cantidad INTEGER NOT NULL DEFAULT 1,
        precio_unitario NUMERIC(10,2) NOT NULL,
        subtotal NUMERIC(10,2) NOT NULL
      )
    `);

    // We keep Venta table as is, but maybe we should allow idProductos to be NULL
    // since now it will be in DetalleVenta.
    await client.query('ALTER TABLE Venta ALTER COLUMN idProductos DROP NOT NULL');

    await client.query('COMMIT');
    console.log('Migration successful: DetalleVenta table created.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
