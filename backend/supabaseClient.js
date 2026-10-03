/**
 * @file supabaseClient.js
 * @description Cliente de Supabase opcional para operaciones directas con el SDK de Supabase.
 *
 * Utiliza las variables de entorno `SUPABASE_URL` y `SUPABASE_ANON_KEY` o `SUPABASE_SERVICE_ROLE_KEY`.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.log('[Supabase Client] Variables SUPABASE_URL y SUPABASE_KEY no configuradas. El backend usará la conexión PostgreSQL nativa (pg pool).');
}

module.exports = supabase;
