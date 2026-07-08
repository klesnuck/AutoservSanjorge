/**
 * @file usersRoutes.js
 * @description Rutas CRUD para la gestión de usuarios del sistema.
 *
 * Endpoints:
 *  - GET    /api/users       → Lista todos los usuarios con su rol
 *  - POST   /api/users       → Crea un nuevo usuario (admin)
 *  - PUT    /api/users/:id   → Actualiza datos de un usuario
 *  - DELETE /api/users/:id   → Elimina un usuario
 *
 * @module usersRoutes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');

// ---------------------------------------------------------------------------
// Helpers de validación
// ---------------------------------------------------------------------------

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length > 0 && email.length < 64 && emailRegex.test(email);
};

const validatePassword = (password) => {
  return typeof password === 'string' && password.length > 6 && /\d/.test(password);
};

const validateName = (name) => {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 100;
};

const validatePhone = (phone) => {
  if (!phone) return true;
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone);
};

const userPasswordColumn = 'contrasena';
const userRoleIdColumn = 'idroles';
const quoteIdentifier = (id) => `"${id}"`;

/**
 * Formatea una fila de Usuarios + Roles al formato de respuesta de la API.
 */
const formatUserRow = (row) => ({
  id: row.idusuarios,
  roleId: row.idroles,
  email: row.email,
  name: row.nombre,
  phone: row.telefono || '',
  role: row.rolename,
});

// ---------------------------------------------------------------------------
// GET /
// ---------------------------------------------------------------------------

/**
 * GET /api/users
 * Lista todos los usuarios del sistema con su rol asociado.
 * @returns {Array<{id, roleId, email, name, phone, role}>}
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.idUsuarios, u.idRoles, u.email, u.nombre, u.telefono, r.nombre AS rolename
       FROM Usuarios u
       JOIN Roles r ON u.idRoles = r.idRoles
       ORDER BY u.idUsuarios`
    );
    res.json(rows.map(formatUserRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// ---------------------------------------------------------------------------
// POST /
// ---------------------------------------------------------------------------

/**
 * POST /api/users
 * Crea un nuevo usuario desde el panel de administración.
 * @body {{ name, email, password, role, phone? }}
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!validateName(name) || !validateEmail(email) || !validatePassword(password)) {
      return res.status(400).json({ error: 'Datos de usuario inválidos' });
    }
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Teléfono inválido' });
    }

    const { rows: roleRow } = await pool.query('SELECT idRoles FROM Roles WHERE nombre = $1', [role]);
    if (!roleRow.length) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO Usuarios (${quoteIdentifier(userRoleIdColumn)}, email, ${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING idUsuarios`,
      [roleRow[0].idroles, email.trim(), hashedPassword, name.trim(), phone || '']
    );

    const { rows } = await pool.query(
      `SELECT u.idUsuarios, u.${userRoleIdColumn}, u.email, u.nombre, u.telefono, r.nombre AS rolename
       FROM Usuarios u
       JOIN Roles r ON u.${userRoleIdColumn} = r.idRoles WHERE u.idUsuarios = $1`,
      [result.rows[0].idusuarios]
    );

    res.json(formatUserRow(rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El correo ya existe' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id
// ---------------------------------------------------------------------------

/**
 * PUT /api/users/:id
 * Actualiza los datos de un usuario existente.
 * La contraseña es opcional; solo se actualiza si se provee.
 * @param {string} id - ID del usuario
 * @body {{ name, email, role, phone?, password? }}
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { name, email, password, role, phone } = req.body;

    if (Number.isNaN(userId) || !validateName(name) || !validateEmail(email)) {
      return res.status(400).json({ error: 'Datos de usuario inválidos' });
    }
    if (password && !validatePassword(password)) {
      return res.status(400).json({ error: 'Contraseña inválida' });
    }
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Teléfono inválido' });
    }

    const { rows: roleRow } = await pool.query('SELECT idRoles FROM Roles WHERE nombre = $1', [role]);
    if (!roleRow.length) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    const { rows: existing } = await pool.query('SELECT idUsuarios FROM Usuarios WHERE idUsuarios = $1', [userId]);
    if (!existing.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const fields = [roleRow[0].idroles, email.trim(), name.trim(), phone || '', userId];
    let query = `UPDATE Usuarios SET ${quoteIdentifier(userRoleIdColumn)} = $1, email = $2, nombre = $3, telefono = $4`;
    let fieldCount = 4;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fieldCount++;
      query += `, ${quoteIdentifier(userPasswordColumn)} = $${fieldCount}`;
      fields.splice(4, 0, hashedPassword);
    }
    fieldCount++;
    query += ` WHERE idUsuarios = $${fieldCount}`;

    await pool.query(query, fields);

    const { rows } = await pool.query(
      `SELECT u.idUsuarios, u.idRoles, u.email, u.nombre, u.telefono, r.nombre AS rolename
       FROM Usuarios u
       JOIN Roles r ON u.idRoles = r.idRoles WHERE u.idUsuarios = $1`,
      [userId]
    );

    res.json(formatUserRow(rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El correo ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id
// ---------------------------------------------------------------------------

/**
 * DELETE /api/users/:id
 * Elimina un usuario por su ID.
 * @param {string} id - ID del usuario
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    await pool.query('DELETE FROM Usuarios WHERE idUsuarios = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
