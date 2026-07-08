/**
 * @file marcaController.js
 * @description Controlador para la gestión de marcas de vehículos.
 *
 * Expone operaciones de lectura sobre la tabla `Marca`.
 *
 * @module controllers/marcaController
 */

const pool = require('../db');

/**
 * Obtiene todas las marcas registradas en la base de datos.
 *
 * @async
 * @function getMarcas
 * @param {import('express').Request}  req - Objeto de solicitud HTTP (sin parámetros requeridos).
 * @param {import('express').Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un arreglo JSON de marcas:
 *   `[{ idmarca: number, nombre: string }]`
 *
 * @example
 * // GET /api/marca
 * // Respuesta: [{ "idmarca": 1, "nombre": "Toyota" }, ...]
 */
const getMarcas = async (req, res) => {
  try {
    const result = await pool.query('SELECT idMarcas AS idmarca, nombre FROM Marca');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMarcas };
