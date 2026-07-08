const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user1_abd',
  password: process.env.DB_PASSWORD || '123',
  database: 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function listDBs() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT datname FROM pg_database');
    console.log(res.rows.map(row => row.datname));
  } finally {
    client.release();
    pool.end();
  }
}
listDBs().catch(console.error);
