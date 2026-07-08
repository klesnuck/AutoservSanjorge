/**
 * @file cotizacionController.js
 * @description Controlador CRUD para la gestión de cotizaciones del taller.
 *
 * Permite crear, consultar, actualizar y eliminar cotizaciones almacenadas
 * en la tabla `Cotizacion`. Cada cotización vincula un usuario, un vehículo,
 * un servicio y/o un producto con un total estimado y una fecha.
 *
 * @module controllers/cotizacionController
 */

const pool = require('../db');

/**
 * Obtiene todas las cotizaciones registradas, ordenadas por ID descendente.
 *
 * @async
 * @function getCotizaciones
 * @param {import('express').Request}  req - Objeto de solicitud HTTP (sin parámetros requeridos).
 * @param {import('express').Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Arreglo JSON de cotizaciones:
 * ```json
 * [{
 *   "id": 1,
 *   "idUsuarios": 3,
 *   "idVehiculos": 2,
 *   "idServicios": 1,
 *   "idProductos": null,
 *   "totalEstimado": 850,
 *   "fecha": "2026-05-01"
 * }]
 * ```
 *
 * @throws {500} Si ocurre un error en la base de datos.
 */
const getCotizaciones = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.idcotizacion AS id,
         c.idusuarios,
         c.idvehiculos,
         c.idservicios,
         c.idproductos,
         c.total_estimado AS "totalEstimado",
         c.fecha,
         COALESCE(c.detalles, ci.nota) AS detalles,
         COALESCE(c.estado, ci.estado) AS estado
       FROM cotizacion c
       LEFT JOIN cita ci ON ci.idcotizacion = c.idcotizacion
       ORDER BY c.idcotizacion DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene una cotización específica por su ID.
 *
 * @async
 * @function getCotizacionById
 * @param {import('express').Request}  req          - Objeto de solicitud HTTP.
 * @param {Object}                     req.params   - Parámetros de ruta.
 * @param {string}                     req.params.id - ID de la cotización a consultar.
 * @param {import('express').Response} res          - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Objeto JSON con los datos de la cotización (200),
 *   no encontrada (404) o error (500).
 *
 * @example
 * // GET /api/cotizaciones/3
 * // Respuesta: { "id": 3, "idUsuarios": 5, "totalEstimado": 1200, ... }
 */
const getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
         c.idcotizacion AS id,
         c.idusuarios,
         c.idvehiculos,
         c.idservicios,
         c.idproductos,
         c.total_estimado AS "totalEstimado",
         c.fecha,
         COALESCE(c.detalles, ci.nota) AS detalles,
         COALESCE(c.estado, ci.estado) AS estado
       FROM cotizacion c
       LEFT JOIN cita ci ON ci.idcotizacion = c.idcotizacion
       WHERE c.idcotizacion = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea una nueva cotización en la base de datos.
 *
 * Todos los IDs de relaciones son opcionales (se almacenan como NULL si no se proveen).
 * Si no se especifica fecha, se utiliza la fecha actual del servidor.
 *
 * @async
 * @function createCotizacion
 * @param {import('express').Request}  req                        - Objeto de solicitud HTTP.
 * @param {Object}                     req.body                   - Cuerpo de la solicitud.
 * @param {number}                     [req.body.idUsuarios]      - ID del usuario/cliente.
 * @param {number}                     [req.body.idVehiculos]     - ID del vehículo asociado.
 * @param {number}                     [req.body.idServicios]     - ID del servicio cotizado.
 * @param {number}                     [req.body.idProductos]     - ID del producto cotizado.
 * @param {number}                     [req.body.total_estimado]  - Total estimado de la cotización.
 * @param {string}                     [req.body.fecha]           - Fecha de la cotización (YYYY-MM-DD).
 * @param {import('express').Response} res                        - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con la cotización creada (201) o un error (500).
 *
 * @example
 * // POST /api/cotizaciones
 * // Body: { "idUsuarios": 3, "idServicios": 1, "total_estimado": 850, "fecha": "2026-05-01" }
 * // Respuesta 201: { "id": 10, "totalEstimado": 850, ... }
 */
const createCotizacion = async (req, res) => {
  try {
    const {
      idUsuarios,
      idVehiculos,
      idServicios,
      idProductos,
      total_estimado,
      fecha,
      detalles,
      estado
    } = req.body;

    const result = await pool.query(
      `INSERT INTO cotizacion
         (idusuarios, idvehiculos, idservicios, idproductos, total_estimado, fecha, detalles, estado)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING
         idcotizacion AS id,
         idusuarios,
         idvehiculos,
         idservicios,
         idproductos,
         total_estimado AS "totalEstimado",
         fecha, detalles, estado`,
      [
        idUsuarios || null,
        idVehiculos || null,
        idServicios || null,
        idProductos || null,
        total_estimado || 0,
        fecha || new Date().toISOString().slice(0, 10),
        detalles || null,
        estado || 'Pendiente'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza una cotización existente por su ID (actualización completa).
 *
 * Todos los campos del cuerpo son reemplazados. Los IDs de relaciones son
 * opcionales y se convierten en NULL si no se proveen.
 *
 * @async
 * @function updateCotizacion
 * @param {import('express').Request}  req          - Objeto de solicitud HTTP.
 * @param {Object}                     req.params   - Parámetros de ruta.
 * @param {string}                     req.params.id - ID de la cotización a actualizar.
 * @param {Object}                     req.body     - Campos actualizados (mismos que `createCotizacion`).
 * @param {import('express').Response} res          - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con la cotización actualizada (200), no encontrada (404) o error (500).
 *
 * @example
 * // PUT /api/cotizaciones/10
 * // Body: { "total_estimado": 950 }
 * // Respuesta: { "id": 10, "totalEstimado": 950, ... }
 */
const updateCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      idUsuarios,
      idVehiculos,
      idServicios,
      idProductos,
      total_estimado,
      fecha,
      detalles,
      estado
    } = req.body;

    const result = await pool.query(
      `UPDATE cotizacion SET
         idusuarios = $1,
         idvehiculos = $2,
         idservicios = $3,
         idproductos = $4,
         total_estimado = $5,
         fecha = $6,
         detalles = $7,
         estado = $8
       WHERE idcotizacion = $9
       RETURNING
         idcotizacion AS id,
         idusuarios,
         idvehiculos,
         idservicios,
         idproductos,
         total_estimado AS "totalEstimado",
         fecha, detalles, estado`,
      [
        idUsuarios || null,
        idVehiculos || null,
        idServicios || null,
        idProductos || null,
        total_estimado || 0,
        fecha || new Date().toISOString().slice(0, 10),
        detalles || null,
        estado || 'Pendiente',
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Elimina una cotización de la base de datos por su ID.
 *
 * @async
 * @function deleteCotizacion
 * @param {import('express').Request}  req          - Objeto de solicitud HTTP.
 * @param {Object}                     req.params   - Parámetros de ruta.
 * @param {string}                     req.params.id - ID de la cotización a eliminar.
 * @param {import('express').Response} res          - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un mensaje de confirmación (200) o error (500).
 *
 * @example
 * // DELETE /api/cotizaciones/10
 * // Respuesta: { "message": "Cotización 10 eliminada" }
 */
const deleteCotizacion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    
    // Primero eliminamos las citas vinculadas a esta cotización para evitar errores de llave foránea
    // PostgreSQL convierte todo a minúsculas por defecto, así que usamos idcotizacion y cita
    await client.query('DELETE FROM cita WHERE idcotizacion = $1', [id]);
    
    // Luego eliminamos la cotización
    const result = await client.query('DELETE FROM cotizacion WHERE idcotizacion = $1', [id]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    await client.query('COMMIT');
    res.json({ message: `Cotización ${id} eliminada correctamente.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar cotización:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

module.exports = {
  getCotizaciones,
  getCotizacionById,
  createCotizacion,
  updateCotizacion,
  deleteCotizacion,
};
