/**
 * @file auth.js
 * @description Middleware de autenticación con JWT y control de acceso basado en roles (RBAC).
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sanjorge_secret_key_2026_super_secure';

/**
 * Middleware para autenticar solicitudes mediante Token JWT en el encabezado Authorization.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.headers['x-access-token'];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token de autenticación no provisto' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

/**
 * Middleware opcional para extraer usuario si hay token, pero permitir continuar si no lo hay.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.headers['x-access-token'];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  });
};

/**
 * Middleware para restringir el acceso a roles específicos.
 * @param {...string} allowedRoles - Nombres de roles autorizados.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }

    next();
  };
};

module.exports = {
  JWT_SECRET,
  authenticateToken,
  optionalAuth,
  requireRole,
};
