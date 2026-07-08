/**
 * @file clienteController.js
 * @description Controlador para la creación de clientes en el sistema.
 *
 * Los clientes se almacenan en la tabla `Usuarios` con el rol "Cliente".
 * Se les asigna una contraseña por defecto hasheada con bcrypt.
 *
 * @module controllers/clienteController
 */

const pool = require('../db');
const bcrypt = require('bcryptjs');

/**
 * Crea un nuevo cliente en la base de datos.
 *
 * El cliente es registrado en la tabla `Usuarios` con:
 * - Rol: "Cliente" (obtenido dinámicamente desde la tabla `Roles`)
 * - Contraseña por defecto: `123456` (hasheada con bcrypt)
 *
 * @async
 * @function createCliente
 * @param {import('express').Request}  req - Objeto de solicitud HTTP.
 * @param {Object} req.body              - Cuerpo de la solicitud.
 * @param {string} req.body.nombre       - Nombre del cliente.
 * @param {string} [req.body.apellido]   - Apellido del cliente (opcional, se concatena al nombre).
 * @param {string} req.body.correo       - Correo electrónico único del cliente.
 * @param {string} [req.body.telefono]   - Teléfono del cliente (opcional).
 * @param {import('express').Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con los datos del cliente creado:
 *   `{ idUsuarios, nombre, correo, telefono }` o un objeto de error.
 *
 * @throws {400} Si el correo ya está registrado.
 * @throws {500} Si no existe el rol "Cliente" o hay un error de base de datos.
 *
 * @example
 * // POST /api/cliente
 * // Body: { "nombre": "Juan", "apellido": "Pérez", "correo": "juan@mail.com", "telefono": "5551234" }
 * // Respuesta 200: { "idUsuarios": 5, "nombre": "Juan Pérez", "correo": "juan@mail.com", "telefono": "5551234" }
 */
const createCliente = async (req, res) => {
  try {
    const { nombre, apellido, correo, telefono } = req.body;
    const fullName = apellido ? `${nombre} ${apellido}`.trim() : nombre;

    const { rows: roleRow } = await pool.query('SELECT idRoles FROM Roles WHERE nombre = $1', ['Cliente']);
    if (!roleRow.length) {
      return res.status(500).json({ error: 'No se encontró el rol Cliente' });
    }

    const { rows: existing } = await pool.query('SELECT idUsuarios FROM Usuarios WHERE email = $1', [correo]);
    if (existing.length) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Contraseña por defecto para clientes creados desde el panel de administración
    const hashedPassword = await bcrypt.hash('123456', 10);

    const result = await pool.query(
      'INSERT INTO Usuarios (idRoles, email, contrasena, nombre, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING idUsuarios, nombre, email as correo, telefono',
      [roleRow[0].idroles, correo, hashedPassword, fullName, telefono || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createCliente };
