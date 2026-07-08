/**
 * @file vehiculoController.js
 * @description Controlador para la consulta de datos relacionados con vehículos.
 *
 * Provee endpoints de lectura para los catálogos de años, modelos y motores,
 * que se utilizan al registrar o filtrar vehículos en el sistema.
 *
 * @module controllers/vehiculoController
 */

const pool = require('../db');

/**
 * Obtiene todos los años disponibles en el catálogo.
 *
 * @async
 * @function getAnios
 * @param {import('express').Request}  req - Objeto de solicitud HTTP (sin parámetros requeridos).
 * @param {import('express').Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un arreglo JSON de años:
 *   `[{ idAnio: number, anio: number }]`
 *
 * @example
 * // GET /api/anio
 * // Respuesta: [{ "idAnio": 1, "anio": 2020 }, ...]
 */
const getAnios = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Anio');
    res.json(result.rows);
  } catch (err) {
    console.error('Error en getAnios:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene los modelos disponibles para una marca específica.
 *
 * @async
 * @function getModelosByMarca
 * @param {import('express').Request}  req           - Objeto de solicitud HTTP.
 * @param {Object}                     req.params    - Parámetros de ruta.
 * @param {string}                     req.params.idmarca - ID numérico de la marca.
 * @param {import('express').Response} res           - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un arreglo de modelos ordenados alfabéticamente:
 *   `[{ idmodelo: number, nombre: string }]`
 *
 * @throws {400} Si el parámetro `idmarca` no es un número válido.
 *
 * @example
 * // GET /api/modelo/3
 * // Respuesta: [{ "idmodelo": 12, "nombre": "Corolla" }, ...]
 */
const getModelosByMarca = async (req, res) => {
  const idmarca = Number(req.params.idmarca || req.params.idmarcas);

  if (isNaN(idmarca)) {
    return res.status(400).json({ error: 'idmarca inválido' });
  }

  try {
    const result = await pool.query(
      'SELECT idmodelos AS idmodelo, nombre FROM modelos WHERE idmarcas = $1 ORDER BY nombre',
      [idmarca]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene todos los tipos de motor disponibles en el catálogo.
 *
 * @async
 * @function getMotores
 * @param {import('express').Request}  req - Objeto de solicitud HTTP (sin parámetros requeridos).
 * @param {import('express').Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un arreglo JSON de motores:
 *   `[{ idmotor: number, nombre: string }]`
 *
 * @example
 * // GET /api/motor
 * // Respuesta: [{ "idmotor": 1, "nombre": "1.6L" }, ...]
 */
const getMotores = async (req, res) => {
  try {
    const result = await pool.query('SELECT idMotores AS idmotor, tipo_motor AS nombre FROM Motores');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getVehiculos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.idVehiculos as id,
        v.placa,
        v.color,
        v.km as kilometraje,
        v.vin,
        ma.nombre as marca,
        mo.nombre as modelo,
        a.anio as año,
        mt.tipo_motor as motor,
        u.nombre as propietario_nombre,
        u.email as propietario_correo,
        u.telefono as propietario_telefono,
        v.idAnio, v.idMarcas, v.idMotores, v.idModelos, v.idUsuarios
      FROM Vehiculos v
      LEFT JOIN Marca ma ON v.idMarcas = ma.idMarcas
      LEFT JOIN Modelos mo ON v.idModelos = mo.idModelos
      LEFT JOIN Anio a ON v.idAnio = a.idAnio
      LEFT JOIN Motores mt ON v.idMotores = mt.idMotores
      LEFT JOIN Usuarios u ON v.idUsuarios = u.idUsuarios
      ORDER BY v.idVehiculos DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createVehiculo = async (req, res) => {
  const { idUsuarios, idAnio, idMarcas, idMotores, idModelos, placa, color, km, vin } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Vehiculos (idUsuarios, idAnio, idMarcas, idMotores, idModelos, placa, color, km, vin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [idUsuarios, idAnio, idMarcas, idMotores, idModelos, placa, color, km, vin]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateVehiculo = async (req, res) => {
  const { id } = req.params;
  const { idUsuarios, idAnio, idMarcas, idMotores, idModelos, placa, color, km, vin } = req.body;
  try {
    const result = await pool.query(
      `UPDATE Vehiculos SET 
        idUsuarios = $1, idAnio = $2, idMarcas = $3, idMotores = $4, idModelos = $5, 
        placa = $6, color = $7, km = $8, vin = $9
       WHERE idVehiculos = $10 RETURNING *`,
      [idUsuarios, idAnio, idMarcas, idMotores, idModelos, placa, color, km, vin, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteVehiculo = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM Vehiculos WHERE idVehiculos = $1', [id]);
    res.json({ message: 'Vehículo eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAnios, getModelosByMarca, getMotores, getVehiculos, createVehiculo, updateVehiculo, deleteVehiculo };
