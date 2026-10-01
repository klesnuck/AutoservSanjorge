/**
 * @file db.js
 * @description Configuración y exportación del pool de conexiones a PostgreSQL.
 *
 * Utiliza el paquete `pg` (node-postgres) para crear un pool de conexiones
 * que es reutilizado por todos los controladores del backend.
 *
 * @module db
 */

const { Pool } = require('pg');

/**
 * Pool de conexiones a la base de datos PostgreSQL "SanJorge".
 *
 * @type {import('pg').Pool}
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user1_abd',
  password: process.env.DB_PASSWORD || '123',
  database: process.env.DB_NAME || 'SanJorge',
  port: Number(process.env.DB_PORT) || 5432,
});

module.exports = pool;