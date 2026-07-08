const fs = require('fs');

let content = fs.readFileSync('index.js', 'utf8');

// 1
content = content.replace(
  'roles_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,',
  'roles_id INT NOT NULL REFERENCES roles(idroles) ON DELETE RESTRICT ON UPDATE CASCADE,'
);

// 2
content = content.replace(
  "const { rows: existing } = await pool.query('SELECT id, permisos, color FROM roles WHERE nombre = $1', [role.nombre]);",
  "const { rows: existing } = await pool.query('SELECT idroles AS id, permisos, color FROM roles WHERE nombre = $1', [role.nombre]);"
);

// 3
content = content.replace(
  "'UPDATE roles SET permisos = $1 WHERE id = $2',",
  "'UPDATE roles SET permisos = $1 WHERE idroles = $2',"
);

// 4
content = content.replace(
  "await pool.query('UPDATE roles SET color = $1 WHERE id = $2', [role.color, existingRole.id]);",
  "await pool.query('UPDATE roles SET color = $1 WHERE idroles = $2', [role.color, existingRole.id]);"
);

// 5 (two instances)
content = content.replace(
  /const \{ rows: (\w+) \} = await pool\.query\('SELECT id FROM roles WHERE nombre = \$1'/g,
  "const { rows: $1 } = await pool.query('SELECT idroles AS id FROM roles WHERE nombre = $1'"
);

// 6
content = content.replace(
  "const { rows } = await pool.query('SELECT * FROM roles ORDER BY id');",
  "const { rows } = await pool.query('SELECT *, idroles AS id FROM roles ORDER BY idroles');"
);

// 7
content = content.replace(
  "INSERT INTO roles (nombre, descripcion, permisos, color) VALUES ($1, $2, $3, $4) RETURNING id',",
  "INSERT INTO roles (nombre, descripcion, permisos, color) VALUES ($1, $2, $3, $4) RETURNING idroles AS id',"
);

// 8 (two instances)
content = content.replace(
  /const \{ rows \} = await pool\.query\('SELECT \* FROM roles WHERE id = \$1',/g,
  "const { rows } = await pool.query('SELECT *, idroles AS id FROM roles WHERE idroles = $1',"
);

// 9
content = content.replace(
  "'UPDATE roles SET nombre = $1, descripcion = $2, permisos = $3, color = $4 WHERE id = $5',",
  "'UPDATE roles SET nombre = $1, descripcion = $2, permisos = $3, color = $4 WHERE idroles = $5',"
);

// 10
content = content.replace(
  "await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);",
  "await pool.query('DELETE FROM roles WHERE idroles = $1', [roleId]);"
);

// 11 (three instances)
content = content.replace(
  /JOIN roles r ON u\.roles_id = r\.id/g,
  "JOIN roles r ON u.roles_id = r.idroles"
);

// 12 missing? let's also check for userRoleIdColumn = 'roles_id';

fs.writeFileSync('index.js', content);
console.log('Fixed index.js references to roles(id) -> roles(idroles)');
