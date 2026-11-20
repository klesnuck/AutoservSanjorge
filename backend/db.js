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
 * Pool de conexiones a la base de datos PostgreSQL en Supabase.
 * Requiere la variable de entorno `DATABASE_URL` o `SUPABASE_DB_URL` (definida en `backend/.env` para local).
 */
let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error(
    'Falta configurar DATABASE_URL o SUPABASE_DB_URL en backend/.env para conectarse a Supabase.'
  );
}

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

const poolConfig = {
  connectionString,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
};

const pool = new Pool(poolConfig);

module.exports = pool;