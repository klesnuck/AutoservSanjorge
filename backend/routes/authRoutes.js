/**
 * @file authRoutes.js
 * @description Rutas de autenticación: login y registro de usuarios.
 *
 * Endpoints:
 *  - POST /api/auth/register  → Registra un nuevo usuario con rol "Cliente"
 *  - POST /api/auth/login     → Autentica un usuario y devuelve sus datos y permisos
 *
 * @module authRoutes
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

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/register
 * Registra un nuevo usuario con el rol "Cliente".
 * @body {{ name, email, password, phone? }}
 * @returns {{ success: true }}
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!validateName(name) || !validateEmail(email) || !validatePassword(password)) {
      return res.status(400).json({ error: 'Datos de registro inválidos' });
    }
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Teléfono inválido' });
    }

    const { rows: roleRow } = await pool.query('SELECT idRoles FROM Roles WHERE nombre = $1', ['Cliente']);
    if (!roleRow.length) {
      return res.status(500).json({ error: 'No se encontró el rol Cliente' });
    }

    const { rows: existing } = await pool.query('SELECT idUsuarios FROM Usuarios WHERE email = $1', [email.trim()]);
    if (existing.length) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO Usuarios (${quoteIdentifier(userRoleIdColumn)}, email, ${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES ($1, $2, $3, $4, $5)`,
      [roleRow[0].idroles, email.trim(), hashedPassword, name.trim(), phone || '']
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el registro' });
  }
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/login
 * Autentica un usuario con email y contraseña (bcrypt).
 * @body {{ email, password }}
 * @returns {{ id, email, name, phone, role, permissions }}
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validateEmail(email) || !password) {
      return res.status(400).json({ error: 'Email o contraseña inválidos' });
    }

    const passwordReference = `u.${quoteIdentifier(userPasswordColumn)} AS passwordhash`;
    const { rows } = await pool.query(
      `SELECT u.idUsuarios, u.email, ${passwordReference}, u.nombre, u.telefono, r.nombre AS rolename, r.permisos
       FROM Usuarios u
       JOIN Roles r ON u.${userRoleIdColumn} = r.idRoles
       WHERE u.email = $1`,
      [email.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.passwordhash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    res.json({
      id: user.idusuarios,
      email: user.email,
      name: user.nombre,
      phone: user.telefono || '',
      role: user.rolename,
      permissions: Array.isArray(user.permisos) ? user.permisos : JSON.parse(user.permisos || '[]')
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el inicio de sesión' });
  }
});

module.exports = router;
