require('dotenv').config();
const pool = require('./db.js');

async function cleanAndSetup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Borrando detalles de mantenimiento y mantenimientos...');
    await client.query('DELETE FROM detallemantenimientoproductos');
    await client.query('DELETE FROM detallemantenimientoservicios');
    await client.query('DELETE FROM mantenimiento');

    console.log('Borrando citas...');
    await client.query('DELETE FROM cita');

    console.log('Borrando vehiculos de prueba...');
    await client.query('DELETE FROM vehiculos');

    console.log('Borrando modelos de marcas ingresadas manualmente (IDs <= 4)...');
    await client.query('DELETE FROM modelos WHERE idmarcas <= 4');

    console.log('Borrando marcas ingresadas manualmente (IDs <= 4)...');
    await client.query('DELETE FROM marca WHERE idmarcas <= 4');

    console.log('Creando tabla modelos_has_anio si no existe...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS modelos_has_anio (
        idmodelos integer NOT NULL,
        idanio integer NOT NULL,
        CONSTRAINT pk_modelos_has_anio PRIMARY KEY (idmodelos, idanio),
        CONSTRAINT fk_mha_modelos FOREIGN KEY (idmodelos) REFERENCES modelos (idmodelos) ON DELETE CASCADE,
        CONSTRAINT fk_mha_anio FOREIGN KEY (idanio) REFERENCES anio (idanio) ON DELETE CASCADE
      )
    `);

    // Ensure modelos_has_motores has ON DELETE CASCADE if it doesn't
    // To be safe, we just leave it for now unless they delete models.

    await client.query('COMMIT');
    console.log('¡Limpieza y configuración completadas!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}
cleanAndSetup();
