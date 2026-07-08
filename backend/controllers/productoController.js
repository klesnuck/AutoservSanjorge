const pool = require('../db');

/**
 * GET /api/productos
 * Lista todos los productos del catálogo.
 */
const getProductos = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM Productos ORDER BY idProductos');
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

/**
 * POST /api/productos
 * Crea un nuevo producto.
 */
const createProducto = async (req, res) => {
  const { nombre, precio_unitario, precio_venta, stock_minimo, stock_actual, categoria, sku, ubicacion_almacen, marca } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO Productos (nombre, precio_unitario, precio_venta, stock_minimo, stock_actual, categoria, sku, ubicacion_almacen, marca)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [nombre, precio_unitario || 0, precio_venta || 0, stock_minimo || 0, stock_actual || 0, categoria || null, sku || null, ubicacion_almacen || null, marca || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un producto con ese SKU. Por favor usa uno diferente.' });
    }
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

/**
 * PUT /api/productos/:id
 * Actualiza un producto existente.
 */
const updateProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, precio_unitario, precio_venta, stock_minimo, stock_actual, categoria, sku, ubicacion_almacen, marca } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE Productos SET
         nombre = $1,
         precio_unitario = $2,
         precio_venta = $3,
         stock_minimo = $4,
         stock_actual = $5,
         categoria = $6,
         sku = $7,
         ubicacion_almacen = $8,
         marca = $9
       WHERE idProductos = $10 RETURNING *`,
      [nombre, precio_unitario || 0, precio_venta || 0, stock_minimo || 0, stock_actual || 0, categoria || null, sku || null, ubicacion_almacen || null, marca || null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un producto con ese SKU. Por favor usa uno diferente.' });
    }
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

/**
 * DELETE /api/productos/:id
 * Elimina un producto por ID.
 */
const deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM Productos WHERE idProductos = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

module.exports = { getProductos, createProducto, updateProducto, deleteProducto };
