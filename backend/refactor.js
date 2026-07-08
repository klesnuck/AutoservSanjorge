const fs = require('fs');

let content = fs.readFileSync('index.js', 'utf8');

content = content.replace('const quoteIdentifier = (identifier) => `\\`${identifier}\\``;', 'const quoteIdentifier = (identifier) => `"\\${identifier}"`;');

const oldInit = `const initializeDatabase = async () => {
  pool = await createPool();

  await pool.query(\`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL UNIQUE,
      descripcion TEXT,
      permisos LONGTEXT,
      color VARCHAR(30) DEFAULT '#A78BFA'
    );
  \`);

  const [rolePermColumns] = await pool.query("SHOW COLUMNS FROM roles LIKE 'permisos'");
  if (rolePermColumns.length && !/text/i.test(rolePermColumns[0].Type) && !/longtext/i.test(rolePermColumns[0].Type)) {
    await pool.query('ALTER TABLE roles MODIFY permisos LONGTEXT');
  }

  const [roleDescColumns] = await pool.query("SHOW COLUMNS FROM roles LIKE 'descripcion'");
  if (roleDescColumns.length && !/text/i.test(roleDescColumns[0].Type)) {
    await pool.query('ALTER TABLE roles MODIFY descripcion TEXT');
  }

  await pool.query(\`
    CREATE TABLE IF NOT EXISTS usuarios (
      idUsuarios INT AUTO_INCREMENT PRIMARY KEY,
      Roles_id INT NOT NULL,
      email VARCHAR(128) NOT NULL UNIQUE,
      contrasena VARCHAR(255) NOT NULL,
      nombre VARCHAR(150) NOT NULL,
      telefono VARCHAR(50) DEFAULT '',
      FOREIGN KEY (Roles_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
    );
  \`);

  const [userPasswordColumns] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'contrasena'");
  const [userPasswordAccentColumns] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'contraseña'");
  if (userPasswordColumns.length) {
    userPasswordColumn = 'contrasena';
  } else if (userPasswordAccentColumns.length) {
    userPasswordColumn = 'contraseña';
  } else {
    await pool.query("ALTER TABLE usuarios ADD COLUMN contrasena VARCHAR(255) NOT NULL AFTER email");
    userPasswordColumn = 'contrasena';
  }

  const [roleIdColumns] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'Roles_id'");
  if (roleIdColumns.length) {
    userRoleIdColumn = 'Roles_id';
  } else {
    userRoleIdColumn = 'roles_id';
  }

  for (const role of DEFAULT_ROLES) {
    const [existing] = await pool.query('SELECT id, permisos, color FROM roles WHERE nombre = ?', [role.nombre]);
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO roles (nombre, descripcion, permisos, color) VALUES (?, ?, ?, ?)',
        [role.nombre, role.descripcion, JSON.stringify(role.permisos), role.color]
      );
      continue;
    }

    const existingRole = existing[0];
    let storedPermissions = [];
    try {
      const parsed = Array.isArray(existingRole.permisos)
        ? existingRole.permisos
        : JSON.parse(existingRole.permisos || '[]');
      if (Array.isArray(parsed)) {
        storedPermissions = parsed;
      }
    } catch (parseError) {
      storedPermissions = [];
    }

    if (storedPermissions.length === 0 && role.permisos.length > 0) {
      await pool.query(
        'UPDATE roles SET permisos = ? WHERE id = ?',
        [JSON.stringify(role.permisos), existingRole.id]
      );
    }

    if (!existingRole.color) {
      await pool.query('UPDATE roles SET color = ? WHERE id = ?', [role.color, existingRole.id]);
    }
  }

  const [adminRole] = await pool.query('SELECT id FROM roles WHERE nombre = ?', ['Administrador']);
  if (adminRole.length > 0) {
    const [adminUser] = await pool.query('SELECT idusuarios FROM usuarios WHERE email = ?', ['admin@admin.com']);
    if (adminUser.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        \`INSERT INTO usuarios (\${quoteIdentifier(userRoleIdColumn)}, email, \${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES (?, ?, ?, ?, ?)\`,
        [adminRole[0].id, 'admin@admin.com', hashedPassword, 'Administrador', '']
      );
    }
  }
};`;

const newInit = `const initializeDatabase = async () => {
  pool = await createPool();

  await pool.query(\`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL UNIQUE,
      descripcion TEXT,
      permisos TEXT,
      color VARCHAR(30) DEFAULT '#A78BFA'
    );
  \`);

  await pool.query(\`
    CREATE TABLE IF NOT EXISTS usuarios (
      idUsuarios SERIAL PRIMARY KEY,
      roles_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      email VARCHAR(128) NOT NULL UNIQUE,
      contrasena VARCHAR(255) NOT NULL,
      nombre VARCHAR(150) NOT NULL,
      telefono VARCHAR(50) DEFAULT ''
    );
  \`);
  
  userPasswordColumn = 'contrasena';
  userRoleIdColumn = 'roles_id';

  for (const role of DEFAULT_ROLES) {
    const { rows: existing } = await pool.query('SELECT id, permisos, color FROM roles WHERE nombre = $1', [role.nombre]);
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO roles (nombre, descripcion, permisos, color) VALUES ($1, $2, $3, $4)',
        [role.nombre, role.descripcion, JSON.stringify(role.permisos), role.color]
      );
      continue;
    }

    const existingRole = existing[0];
    let storedPermissions = [];
    try {
      const parsed = Array.isArray(existingRole.permisos)
        ? existingRole.permisos
        : JSON.parse(existingRole.permisos || '[]');
      if (Array.isArray(parsed)) {
        storedPermissions = parsed;
      }
    } catch (parseError) {
      storedPermissions = [];
    }

    if (storedPermissions.length === 0 && role.permisos.length > 0) {
      await pool.query(
        'UPDATE roles SET permisos = $1 WHERE id = $2',
        [JSON.stringify(role.permisos), existingRole.id]
      );
    }

    if (!existingRole.color) {
      await pool.query('UPDATE roles SET color = $1 WHERE id = $2', [role.color, existingRole.id]);
    }
  }

  const { rows: adminRole } = await pool.query('SELECT id FROM roles WHERE nombre = $1', ['Administrador']);
  if (adminRole.length > 0) {
    const { rows: adminUser } = await pool.query('SELECT idusuarios FROM usuarios WHERE email = $1', ['admin@admin.com']);
    if (adminUser.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        \`INSERT INTO usuarios (\${quoteIdentifier(userRoleIdColumn)}, email, \${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES ($1, $2, $3, $4, $5)\`,
        [adminRole[0].id, 'admin@admin.com', hashedPassword, 'Administrador', '']
      );
    }
  }
};`;

content = content.replace(oldInit, newInit);

content = content.replace(/const \[rows\] = await pool\.query/g, 'const { rows } = await pool.query');
content = content.replace(/const \[existing\] = await pool\.query/g, 'const { rows: existing } = await pool.query');
content = content.replace(/const \[roleRow\] = await pool\.query/g, 'const { rows: roleRow } = await pool.query');
content = content.replace(/const \[result\] = await pool\.query/g, 'const result = await pool.query');

content = content.replace(/err\.code === 'ER_DUP_ENTRY'/g, "err.code === '23505'");

content = content.replace(
  `const result = await pool.query(
      'INSERT INTO roles (nombre, descripcion, permisos, color) VALUES (?, ?, ?, ?)',
      [name.trim(), description.trim(), JSON.stringify(permissions), color || '#A78BFA']
    );\`,
  \`const result = await pool.query(
      'INSERT INTO roles (nombre, descripcion, permisos, color) VALUES ($1, $2, $3, $4) RETURNING id',
      [name.trim(), description.trim(), JSON.stringify(permissions), color || '#A78BFA']
    );\`
);

content = content.replace(/result\.insertId/g, 'result.rows[0].id');

content = content.replace(
  \`const result = await pool.query(
      \\\`INSERT INTO usuarios (\${quoteIdentifier(userRoleIdColumn)}, email, \${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES (?, ?, ?, ?, ?)\\\`,
      [roleRow[0].id, email.trim(), hashedPassword, name.trim(), phone || '']
    );\`,
  \`const result = await pool.query(
      \\\`INSERT INTO usuarios (\${quoteIdentifier(userRoleIdColumn)}, email, \${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING idusuarios AS id\\\`,
      [roleRow[0].id, email.trim(), hashedPassword, name.trim(), phone || '']
    );\`
);

content = content.replace(
  \`await pool.query(
      \\\`INSERT INTO usuarios (\${quoteIdentifier(userRoleIdColumn)}, email, \${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES (?, ?, ?, ?, ?)\\\`,
      [roleRow[0].id, email.trim(), hashedPassword, name.trim(), phone || '']
    );\`,
  \`await pool.query(
      \\\`INSERT INTO usuarios (\${quoteIdentifier(userRoleIdColumn)}, email, \${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES ($1, $2, $3, $4, $5)\\\`,
      [roleRow[0].id, email.trim(), hashedPassword, name.trim(), phone || '']
    );\`
);

// manual replacements for remaining ?s
content = content.replace(
  "const { rows } = await pool.query('SELECT * FROM roles WHERE id = ?', [result.rows[0].id]);",
  "const { rows } = await pool.query('SELECT * FROM roles WHERE id = $1', [result.rows[0].id]);"
);

content = content.replace(
  \`await pool.query(
      'UPDATE roles SET nombre = ?, descripcion = ?, permisos = ?, color = ? WHERE id = ?',
      [name.trim(), description.trim(), JSON.stringify(permissions), color || '#A78BFA', roleId]
    );\`,
  \`await pool.query(
      'UPDATE roles SET nombre = $1, descripcion = $2, permisos = $3, color = $4 WHERE id = $5',
      [name.trim(), description.trim(), JSON.stringify(permissions), color || '#A78BFA', roleId]
    );\`
);

content = content.replace(
  "const { rows } = await pool.query('SELECT * FROM roles WHERE id = ?', [roleId]);",
  "const { rows } = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId]);"
);

content = content.replace(
  "await pool.query('DELETE FROM roles WHERE id = ?', [roleId]);",
  "await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);"
);

content = content.replace(
  "const { rows: roleRow } = await pool.query('SELECT id FROM roles WHERE nombre = ?', [role]);",
  "const { rows: roleRow } = await pool.query('SELECT id FROM roles WHERE nombre = $1', [role]);"
);

content = content.replace(
  \`WHERE u.idusuarios = ?\\\`,
      [result.rows[0].id]\`,
  \`WHERE u.idusuarios = $1\\\`,
      [result.rows[0].id]\`
);

content = content.replace(
  "const { rows: existing } = await pool.query('SELECT idusuarios FROM usuarios WHERE idusuarios = ?', [userId]);",
  "const { rows: existing } = await pool.query('SELECT idusuarios FROM usuarios WHERE idusuarios = $1', [userId]);"
);

content = content.replace(
  \`let query = \\\`UPDATE usuarios SET \${quoteIdentifier(userRoleIdColumn)} = ?, email = ?, nombre = ?, telefono = ?\\\`;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += \\\`, \${quoteIdentifier(userPasswordColumn)} = ?\\\`;
      fields.splice(4, 0, hashedPassword);
    }
    query += ' WHERE idusuarios = ?';\`,
  \`let query = \\\`UPDATE usuarios SET \${quoteIdentifier(userRoleIdColumn)} = $1, email = $2, nombre = $3, telefono = $4\\\`;
    let fieldCount = 4;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fieldCount++;
      query += \\\`, \${quoteIdentifier(userPasswordColumn)} = $\${fieldCount}\\\`;
      fields.splice(4, 0, hashedPassword);
    }
    fieldCount++;
    query += \\\` WHERE idusuarios = $\${fieldCount}\\\`;\`
);

content = content.replace(
  \`WHERE u.idusuarios = ?\\\`,
      [userId]\`,
  \`WHERE u.idusuarios = $1\\\`,
      [userId]\`
);

content = content.replace(
  "await pool.query('DELETE FROM usuarios WHERE idusuarios = ?', [userId]);",
  "await pool.query('DELETE FROM usuarios WHERE idusuarios = $1', [userId]);"
);

content = content.replace(
  "const { rows: roleRow } = await pool.query('SELECT id FROM roles WHERE nombre = ?', ['Cliente']);",
  "const { rows: roleRow } = await pool.query('SELECT id FROM roles WHERE nombre = $1', ['Cliente']);"
);

content = content.replace(
  "const { rows: existing } = await pool.query('SELECT idusuarios FROM usuarios WHERE email = ?', [email.trim()]);",
  "const { rows: existing } = await pool.query('SELECT idusuarios FROM usuarios WHERE email = $1', [email.trim()]);"
);

content = content.replace(
  \`WHERE u.email = ?\\\`,
      [email.trim()]\`,
  \`WHERE u.email = $1\\\`,
      [email.trim()]\`
);

fs.writeFileSync('index.js', content);
console.log('Done refactoring index.js');

