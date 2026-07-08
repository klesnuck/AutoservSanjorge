const pool = require('../db');

/**
 * GET /api/productos/compatibles?idModelos=X&idMarcas=Y
 * Returns products (with cantidad and optional precio_especial) compatible
 * with a given modelo (and optionally marca).
 */
const getProductosCompatibles = async (req, res) => {
  try {
    const { idModelos, idMarcas } = req.query;
    if (!idModelos && !idMarcas) {
      return res.status(400).json({ error: 'Debes indicar idModelos o idMarcas' });
    }

    let query, params;
    const modelId = idModelos ? Number(idModelos) : null;
    const brandId = idMarcas ? Number(idMarcas) : null;

    if (modelId) {
      // Si hay modelo, traer lo específico del modelo + lo que es para toda la marca (modelo NULL)
      query = `
        SELECT
          pc.id,
          pc.idProductos,
          p.nombre,
          p.sku,
          pc.cantidad,
          COALESCE(pc.precio_especial, p.precio_unitario) AS precio_unitario,
          pc.precio_especial,
          p.precio_unitario AS precio_base,
          p.stock_actual,
          pc.idMarcas,
          pc.idModelos
        FROM Productos_compatibilidad pc
        JOIN Productos p ON pc.idProductos = p.idProductos
        WHERE pc.idModelos = $1 
           OR (pc.idMarcas = (SELECT idMarcas FROM Modelos WHERE idModelos = $1) AND pc.idModelos IS NULL)
        ORDER BY p.nombre
      `;
      params = [modelId];
    } else {
      // Solo marca
      query = `
        SELECT
          pc.id,
          pc.idProductos,
          p.nombre,
          p.sku,
          pc.cantidad,
          COALESCE(pc.precio_especial, p.precio_unitario) AS precio_unitario,
          pc.precio_especial,
          p.precio_unitario AS precio_base,
          p.stock_actual,
          pc.idMarcas,
          pc.idModelos
        FROM Productos_compatibilidad pc
        JOIN Productos p ON pc.idProductos = p.idProductos
        WHERE pc.idMarcas = $1 AND pc.idModelos IS NULL
        ORDER BY p.nombre
      `;
      params = [brandId];
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/productos/compatibilidad/:idProducto
 * Returns all compatibility entries for a given product (used in admin UI)
 */
const getCompatibilidadPorProducto = async (req, res) => {
  try {
    const { idProducto } = req.params;
    const { rows } = await pool.query(`
      SELECT
        pc.id,
        pc.idProductos,
        pc.idMarcas,
        ma.nombre AS marca_nombre,
        pc.idModelos,
        mo.nombre AS modelo_nombre,
        pc.cantidad,
        pc.precio_especial
      FROM Productos_compatibilidad pc
      LEFT JOIN Marca ma ON pc.idMarcas = ma.idMarcas
      LEFT JOIN Modelos mo ON pc.idModelos = mo.idModelos
      WHERE pc.idProductos = $1
      ORDER BY ma.nombre, mo.nombre
    `, [idProducto]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/productos/:idProducto/compatibilidad
 * Adds a compatibility rule: { idMarcas, idModelos, cantidad, precio_especial }
 */
const addCompatibilidad = async (req, res) => {
  try {
    const { idProducto } = req.params;
    const { idMarcas, idModelos, cantidad, precio_especial } = req.body;

    const { rows } = await pool.query(`
      INSERT INTO Productos_compatibilidad (idProductos, idMarcas, idModelos, cantidad, precio_especial)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
      RETURNING *
    `, [idProducto, idMarcas || null, idModelos || null, cantidad || 1, precio_especial || null]);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /api/productos/compatibilidad/:id
 * Updates a compatibility entry
 */
const updateCompatibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, precio_especial } = req.body;
    const { rows } = await pool.query(`
      UPDATE Productos_compatibilidad
      SET cantidad = $1, precio_especial = $2
      WHERE id = $3
      RETURNING *
    `, [cantidad, precio_especial || null, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/productos/compatibilidad/:id
 */
const deleteCompatibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM Productos_compatibilidad WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProductosCompatibles,
  getCompatibilidadPorProducto,
  addCompatibilidad,
  updateCompatibilidad,
  deleteCompatibilidad,
};
