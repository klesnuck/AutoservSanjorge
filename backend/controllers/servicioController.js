/**
 * @file servicioController.js
 * @description Controlador CRUD para la gestión de servicios del taller.
 *
 * Permite listar, crear, actualizar y eliminar servicios registrados
 * en la tabla `Servicios` de la base de datos.
 *
 * @module controllers/servicioController
 */

const pool = require('../db');

/**
 * Obtiene todos los servicios registrados.
 *
 * @async
 * @function getServicios
 * @param {import('express').Request}  req - Objeto de solicitud HTTP (sin parámetros requeridos).
 * @param {import('express').Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un arreglo JSON de servicios:
 *   `[{ id, nombre, descripcion, tiempoEstimado, costo, categoria, manoObra, refaccionesEstimadas }]`
 *
 * @example
 * // GET /api/servicios
 * // Respuesta: [{ "id": 1, "nombre": "Cambio de aceite", "costo": 350, ... }]
 */
const getServicios = async (req, res) => {
  try {
    const { rows: servicios } = await pool.query(
      'SELECT idServicios AS id, nombre, descripcion, tiempo_estimado AS tiempoEstimado, costo, categoria, mano_obra AS manoObra, refacciones_estimadas AS refaccionesEstimadas FROM Servicios'
    );

    // Obtener refacciones para cada servicio
    const result = await Promise.all(servicios.map(async (srv) => {
      const { rows: refacciones } = await pool.query(`
        SELECT p.idProductos as id, p.nombre, p.precio_unitario, phs.cantidad
        FROM Productos_has_Servicios phs
        JOIN Productos p ON phs.idProductos = p.idProductos
        WHERE phs.idServicios = $1
      `, [srv.id]);

      return { ...srv, refacciones };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea un nuevo servicio en la base de datos.
 *
 * @async
 * @function createServicio
 * @param {import('express').Request}  req                          - Objeto de solicitud HTTP.
 * @param {Object}                     req.body                    - Cuerpo de la solicitud.
 * @param {string}                     req.body.nombre             - Nombre del servicio.
 * @param {string}                     [req.body.descripcion]      - Descripción del servicio.
 * @param {number}                     [req.body.categoria]        - Categoría numérica del servicio.
 * @param {number}                     [req.body.manoObra]         - Costo de mano de obra.
 * @param {number}                     [req.body.tiempoEstimado]   - Tiempo estimado en horas.
 * @param {number}                     [req.body.costo]            - Costo total del servicio.
 * @param {number}                     [req.body.refaccionesEstimadas] - Costo estimado de refacciones.
 * @param {import('express').Response} res                         - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con el servicio recién creado (200) o un error (500).
 *
 * @example
 * // POST /api/servicios
 * // Body: { "nombre": "Afinación mayor", "costo": 800, "manoObra": 400 }
 * // Respuesta: { "id": 5, "nombre": "Afinación mayor", "costo": 800, ... }
 */
const createServicio = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, categoria, manoObra, tiempoEstimado, descripcion, costo, refaccionesEstimadas, refacciones } = req.body;
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO Servicios (nombre, categoria, mano_obra, tiempo_estimado, descripcion, costo, refacciones_estimadas) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING idServicios AS id, nombre, descripcion, tiempo_estimado AS tiempoEstimado, costo, categoria, mano_obra AS manoObra, refacciones_estimadas AS refaccionesEstimadas',
      [nombre, categoria || 0, manoObra || 0, tiempoEstimado || 0, descripcion || '', costo || 0, refaccionesEstimadas || 0]
    );

    const newServicio = result.rows[0];

    // Insertar refacciones en la tabla pivote
    if (refacciones && Array.isArray(refacciones)) {
      for (const ref of refacciones) {
        await client.query(
          'INSERT INTO Productos_has_Servicios (idServicios, idProductos, cantidad) VALUES ($1, $2, $3)',
          [newServicio.id, ref.id, ref.cantidad || 1]
        );
      }
    }

    await client.query('COMMIT');
    res.json(newServicio);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * Actualiza un servicio existente por su ID.
 *
 * @async
 * @function updateServicio
 * @param {import('express').Request}  req          - Objeto de solicitud HTTP.
 * @param {Object}                     req.params   - Parámetros de ruta.
 * @param {string}                     req.params.id - ID del servicio a actualizar.
 * @param {Object}                     req.body     - Campos a actualizar (mismos que `createServicio`).
 * @param {import('express').Response} res          - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con el servicio actualizado (200), no encontrado (404) o error (500).
 *
 * @example
 * // PUT /api/servicios/5
 * // Body: { "nombre": "Afinación mayor", "costo": 900 }
 * // Respuesta: { "id": 5, "nombre": "Afinación mayor", "costo": 900, ... }
 */
const updateServicio = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre, categoria, manoObra, tiempoEstimado, descripcion, costo, refaccionesEstimadas, refacciones } = req.body;
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE Servicios SET nombre = $1, categoria = $2, mano_obra = $3, tiempo_estimado = $4, descripcion = $5, costo = $6, refacciones_estimadas = $7 WHERE idServicios = $8 RETURNING idServicios AS id, nombre, descripcion, tiempo_estimado AS tiempoEstimado, costo, categoria, mano_obra AS manoObra, refacciones_estimadas AS refaccionesEstimadas',
      [nombre, categoria || 0, manoObra || 0, tiempoEstimado || 0, descripcion || '', costo || 0, refaccionesEstimadas || 0, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // Actualizar refacciones: borrar y recrear
    if (refacciones && Array.isArray(refacciones)) {
      await client.query('DELETE FROM Productos_has_Servicios WHERE idServicios = $1', [id]);
      for (const ref of refacciones) {
        await client.query(
          'INSERT INTO Productos_has_Servicios (idServicios, idProductos, cantidad) VALUES ($1, $2, $3)',
          [id, ref.id, ref.cantidad || 1]
        );
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * Elimina un servicio de la base de datos por su ID.
 *
 * @async
 * @function deleteServicio
 * @param {import('express').Request}  req          - Objeto de solicitud HTTP.
 * @param {Object}                     req.params   - Parámetros de ruta.
 * @param {string}                     req.params.id - ID del servicio a eliminar.
 * @param {import('express').Response} res          - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un mensaje de confirmación (200) o error (500).
 *
 * @example
 * // DELETE /api/servicios/5
 * // Respuesta: { "message": "Servicio 5 eliminado." }
 */
const deleteServicio = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM Servicios WHERE idServicios = $1', [id]);
    res.json({ message: `Servicio ${id} eliminado.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getServicios,
  createServicio,
  updateServicio,
  deleteServicio
};
