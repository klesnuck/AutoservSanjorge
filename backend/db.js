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
  host: 'localhost',
  user: 'user1_abd',
  password: '123',
  database: 'SanJorge',
  port: 5432,
});

module.exports = pool;