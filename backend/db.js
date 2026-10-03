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
 * Pool de conexiones a la base de datos PostgreSQL (local o Supabase).
 * Soporta conexión por cadena de conexión `DATABASE_URL` / `SUPABASE_DB_URL`
 * o variables individuales (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
 */
let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (connectionString) {
  // Corregir contraseñas con caracteres especiales como '#' sin codificar
  const match = connectionString.match(/^(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (match) {
    const prefix = match[1];
    const password = match[2];
    const suffix = match[3];
    if (password.includes('#') && !password.includes('%23')) {
      connectionString = `${prefix}${password.replace(/#/g, '%23')}${suffix}`;
    }
  }
}

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'user1_abd',
      password: process.env.DB_PASSWORD || '123',
      database: process.env.DB_NAME || 'SanJorge',
      port: Number(process.env.DB_PORT) || 5432,
      ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    };

const pool = new Pool(poolConfig);

module.exports = pool;