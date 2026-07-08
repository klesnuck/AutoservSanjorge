const pool = require('./db');

async function clearData() {
  const client = await pool.connect();
  try {
    console.log("Truncating Venta and Productos tables with CASCADE...");
    await client.query('TRUNCATE TABLE Productos, Venta CASCADE;');
    console.log("Success! All sales and products data have been deleted.");
  } catch (err) {
    console.error("Error executing TRUNCATE:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

clearData();
