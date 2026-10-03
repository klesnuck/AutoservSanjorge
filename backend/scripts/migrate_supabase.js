/**
 * @file migrate_supabase.js
 * @description Script de migración e inicialización automatizada para Supabase.
 * Lee el archivo supabase_schema.sql y lo ejecuta contra la base de datos de Supabase.
 *
 * Uso: node scripts/migrate_supabase.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function runMigration() {
  console.log('---------------------------------------------------------');
  console.log('🚀 Iniciando migración de base de datos hacia Supabase...');
  console.log('---------------------------------------------------------');

  try {
    // 1. Probar conexión básica
    const { rows: testRows } = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`✅ Conexión exitosa a Supabase (BD: ${testRows[0].db_name}, Hora servidor: ${testRows[0].current_time})`);

    // 2. Leer archivo SQL de esquema
    const schemaPath = path.join(__dirname, '..', 'supabase_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`No se encontró el archivo de esquema en: ${schemaPath}`);
    }

    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    console.log('📜 Ejecutando script de esquema de tablas y datos iniciales...');

    // 3. Ejecutar SQL en la BD
    await pool.query(sqlContent);
    console.log('✅ Esquema y tablas creados exitosamente en Supabase.');

    // 4. Verificar tablas creadas
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`\n📋 Tablas verificadas en el esquema public (${tables.length} tablas):`);
    tables.forEach((t) => console.log(`   - ${t.table_name}`));

    // 5. Verificar roles e usuario administrador
    const { rows: roles } = await pool.query('SELECT idroles, nombre FROM Roles ORDER BY idroles');
    console.log('\n👥 Roles registrados:');
    roles.forEach((r) => console.log(`   - ID ${r.idroles}: ${r.nombre}`));

    const { rows: admin } = await pool.query("SELECT email, nombre FROM Usuarios WHERE email = 'admin@admin.com'");
    if (admin.length > 0) {
      console.log(`\n👑 Usuario Administrador inicial verificado (${admin[0].email})`);
    }

    console.log('\n🎉 ¡Migración a Supabase completada con éxito!');
  } catch (error) {
    console.error('\n❌ Error durante la migración:');
    console.error('Mensaje:', error.message);
    if (error.detail) console.error('Detalle:', error.detail);
    if (error.hint) console.error('Pista:', error.hint);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigration();
