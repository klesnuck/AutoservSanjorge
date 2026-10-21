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

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { sendMfaEmail } = require('../services/emailService');

// ---------------------------------------------------------------------------
// Almacén en memoria para códigos de segundo factor (MFA)
// ---------------------------------------------------------------------------
const mfaPendingSessions = new Map();

// Limpiador automático cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of mfaPendingSessions.entries()) {
    if (session.expiresAt < now) {
      mfaPendingSessions.delete(key);
    }
  }
}, 5 * 60 * 1000);

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ---------------------------------------------------------------------------
// POST /login (Paso 1 del Login con MFA)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/login
 * Autentica un usuario con email y contraseña (bcrypt).
 * Retorna desafío MFA con token temporal para validar en el Paso 2.
 * @body {{ email, password, skipMfa? }}
 * @returns {{ mfaRequired: true, tempToken, email, otpDev, emailSent, emailPreviewUrl }}
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, skipMfa } = req.body;

    if (!validateEmail(email) || !password) {
      return res.status(400).json({ error: 'Email o contraseña inválidos' });
    }

    const passwordReference = `u.${quoteIdentifier(userPasswordColumn)} AS passwordhash`;
    const { rows } = await pool.query(
      `SELECT u.idUsuarios, u.email, ${passwordReference}, u.nombre, u.telefono, r.nombre AS rolename, r.permisos
       FROM Usuarios u
       JOIN Roles r ON u.${userRoleIdColumn} = r.idRoles
       WHERE LOWER(u.email) = LOWER($1)`,
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

    const permissions = Array.isArray(user.permisos) ? user.permisos : JSON.parse(user.permisos || '[]');

    // Si se solicita omitir MFA explícitamente vía variable o parámetro
    if (skipMfa || process.env.DISABLE_MFA === 'true') {
      const token = jwt.sign(
        {
          id: user.idusuarios,
          email: user.email,
          role: user.rolename,
          permissions,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        id: user.idusuarios,
        email: user.email,
        name: user.nombre,
        phone: user.telefono || '',
        role: user.rolename,
        permissions,
        token,
      });
    }

    // Generar desafío MFA (Multi-Factor Authentication - 2FA)
    const mfaCode = generateOtp();
    const tempToken = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos de vigencia

    mfaPendingSessions.set(tempToken, {
      code: mfaCode,
      expiresAt,
      user: {
        id: user.idusuarios,
        email: user.email,
        name: user.nombre,
        phone: user.telefono || '',
        role: user.rolename,
        permissions,
      }
    });

    console.log(`[MFA] Código de verificación para ${user.email}: ${mfaCode}`);

    // Enviar código de confirmación por correo electrónico
    const emailResult = await sendMfaEmail({
      to: user.email,
      name: user.nombre,
      code: mfaCode,
    });

    return res.json({
      mfaRequired: true,
      tempToken,
      message: 'Código de verificación enviado a tu correo electrónico para confirmar tu identidad.',
      email: user.email,
      emailSent: emailResult.success,
      emailPreviewUrl: emailResult.previewUrl || null,
      otpDev: mfaCode, // Se envía en la respuesta para facilitar la prueba/evaluación rápida
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el inicio de sesión' });
  }
});

// ---------------------------------------------------------------------------
// POST /verify-mfa (Paso 2 del Login: Validación del OTP y emisión del JWT)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/verify-mfa
 * Valida el código OTP de segundo factor y genera el JWT final.
 * @body {{ tempToken, code }}
 * @returns {{ id, email, name, phone, role, permissions, token }}
 */
router.post('/verify-mfa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: 'El token temporal y el código son requeridos' });
    }

    const session = mfaPendingSessions.get(tempToken);
    if (!session) {
      return res.status(401).json({ error: 'La sesión MFA ha expirado o no es válida. Inicia sesión de nuevo.' });
    }

    if (Date.now() > session.expiresAt) {
      mfaPendingSessions.delete(tempToken);
      return res.status(401).json({ error: 'El código ha expirado. Por favor solicita uno nuevo.' });
    }

    if (session.code !== String(code).trim()) {
      return res.status(401).json({ error: 'Código de verificación incorrecto' });
    }

    // Código válido: consumir la sesión temporal
    mfaPendingSessions.delete(tempToken);

    // Emitir el token JWT firmado
    const token = jwt.sign(
      {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        permissions: session.user.permissions,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      phone: session.user.phone,
      role: session.user.role,
      permissions: session.user.permissions,
      token,
    });
  } catch (err) {
    console.error('[Error en verify-mfa]:', err);
    res.status(500).json({ error: 'Error al verificar el código MFA' });
  }
});

// ---------------------------------------------------------------------------
// POST /resend-mfa (Reenvío de nuevo código OTP)
// ---------------------------------------------------------------------------

router.post('/resend-mfa', async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      return res.status(400).json({ error: 'Token temporal no provisto' });
    }

    const session = mfaPendingSessions.get(tempToken);
    if (!session) {
      return res.status(401).json({ error: 'Sesión no encontrada o expirada' });
    }

    const newCode = generateOtp();
    session.code = newCode;
    session.expiresAt = Date.now() + 5 * 60 * 1000;
    mfaPendingSessions.set(tempToken, session);

    console.log(`[MFA Reenviado] Nuevo código para ${session.user.email}: ${newCode}`);

    // Reenviar por correo
    const emailResult = await sendMfaEmail({
      to: session.user.email,
      name: session.user.name,
      code: newCode,
    });

    res.json({
      success: true,
      message: 'Nuevo código enviado a tu correo electrónico.',
      emailSent: emailResult.success,
      emailPreviewUrl: emailResult.previewUrl || null,
      otpDev: newCode,
    });
  } catch (err) {
    console.error('[Error en resend-mfa]:', err);
    res.status(500).json({ error: 'Error al reenviar código' });
  }
});

// ---------------------------------------------------------------------------
// GET /me (Verificación de token y sesión activa)
// ---------------------------------------------------------------------------

const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/auth/me
 * Verifica el JWT y devuelve los datos actualizados del usuario autenticado.
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.idUsuarios, u.email, u.nombre, u.telefono, r.nombre AS rolename, r.permisos
       FROM Usuarios u
       JOIN Roles r ON u.${userRoleIdColumn} = r.idRoles
       WHERE u.idUsuarios = $1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const permissions = Array.isArray(user.permisos) ? user.permisos : JSON.parse(user.permisos || '[]');

    res.json({
      id: user.idusuarios,
      email: user.email,
      name: user.nombre,
      phone: user.telefono || '',
      role: user.rolename,
      permissions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar sesión' });
  }
});

module.exports = router;
