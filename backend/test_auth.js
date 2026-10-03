require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function fixAdminPassword() {
  try {
    const newHash = await bcrypt.hash('admin123', 10);
    console.log('Generated live hash:', newHash);

    const updateRes = await pool.query(
      'UPDATE Usuarios SET contrasena = $1 WHERE LOWER(email) = LOWER($2)',
      [newHash, 'admin@admin.com']
    );
    console.log('Updated rows:', updateRes.rowCount);

    const { rows } = await pool.query(
      'SELECT idusuarios, email, contrasena FROM Usuarios WHERE LOWER(email) = LOWER($1)',
      ['admin@admin.com']
    );

    if (rows.length > 0) {
      console.log('Retrieved stored hash:', rows[0].contrasena);
      const isMatch = await bcrypt.compare('admin123', rows[0].contrasena);
      console.log('✅ BCRYPT COMPARE MATCHES admin123?:', isMatch);
    } else {
      console.log('❌ User admin@admin.com not found!');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

fixAdminPassword();
