/**
 * @file rolesRoutes.js
 * @description Rutas CRUD para la gestión de roles del sistema.
 *
 * Endpoints:
 *  - GET    /api/roles       → Lista todos los roles
 *  - POST   /api/roles       → Crea un nuevo rol
 *  - PUT    /api/roles/:id   → Actualiza un rol existente
 *  - DELETE /api/roles/:id   → Elimina un rol
 *
 * @module rolesRoutes
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

// ---------------------------------------------------------------------------
// Helpers de validación
// ---------------------------------------------------------------------------

const validateName = (name) => {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 100;
};

/**
 * Formatea una fila de la tabla Roles al formato de respuesta de la API.
 * Convierte el campo `permisos` de JSON string a arreglo.
 * @param {Object} row
 * @returns {{ id, name, description, permissions }}
 */
const formatRoleRow = (row) => ({
  id: row.idroles,
  name: row.nombre,
  description: row.descripcion,
  permissions: Array.isArray(row.permisos) ? row.permisos : JSON.parse(row.permisos || '[]')
});

// ---------------------------------------------------------------------------
// GET /
// ---------------------------------------------------------------------------

/**
 * GET /api/roles
 * Lista todos los roles disponibles en el sistema.
 * @returns {Array<{id, name, description, permissions}>}
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM Roles ORDER BY idRoles');
    res.json(rows.map(formatRoleRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// ---------------------------------------------------------------------------
// POST /
// ---------------------------------------------------------------------------

/**
 * POST /api/roles
 * Crea un nuevo rol. Valida nombre, descripción y que `permissions` sea un arreglo.
 * @body {{ name, description, permissions: string[] }}
 * @returns {{ id, name, description, permissions }}
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!validateName(name) || !description || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Datos de rol inválidos' });
    }

    const result = await pool.query(
      'INSERT INTO Roles (nombre, descripcion, permisos) VALUES ($1, $2, $3) RETURNING idRoles',
      [name.trim(), description.trim(), JSON.stringify(permissions)]
    );

    const newRoleId = result.rows[0]?.idroles ?? result.rows[0]?.idRoles;
    if (!newRoleId) {
      console.error('Rol creado pero no se obtuvo idRoles del INSERT', result.rows[0]);
      return res.status(500).json({ error: 'Error interno al crear el rol' });
    }

    const { rows } = await pool.query('SELECT * FROM Roles WHERE idRoles = $1', [newRoleId]);
    if (!rows.length) {
      console.error('Rol no encontrado después del INSERT', newRoleId);
      return res.status(500).json({ error: 'Error interno al crear el rol' });
    }

    res.json(formatRoleRow(rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El nombre del rol ya existe' });
    }
    res.status(500).json({ error: 'Error al crear el rol' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id
// ---------------------------------------------------------------------------

/**
 * PUT /api/roles/:id
 * Actualiza un rol existente por su ID.
 * @param {string} id - ID del rol
 * @body {{ name, description, permissions: string[] }}
 */
router.put('/:id', async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const { name, description, permissions } = req.body;

    if (Number.isNaN(roleId) || !validateName(name) || !description || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Datos de rol inválidos' });
    }

    await pool.query(
      'UPDATE Roles SET nombre = $1, descripcion = $2, permisos = $3 WHERE idRoles = $4',
      [name.trim(), description.trim(), JSON.stringify(permissions), roleId]
    );

    const { rows } = await pool.query('SELECT * FROM Roles WHERE idRoles = $1', [roleId]);
    if (!rows.length) return res.status(404).json({ error: 'Rol no encontrado' });

    res.json(formatRoleRow(rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El nombre del rol ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar el rol' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id
// ---------------------------------------------------------------------------

/**
 * DELETE /api/roles/:id
 * Elimina un rol por su ID.
 * @param {string} id - ID del rol
 */
router.delete('/:id', async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    if (Number.isNaN(roleId)) {
      return res.status(400).json({ error: 'ID de rol inválido' });
    }
    await pool.query('DELETE FROM Roles WHERE idRoles = $1', [roleId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el rol' });
  }
});

module.exports = router;
