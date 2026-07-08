const pool = require('../db');

/**
 * Obtiene la lista de todos los proveedores
 */
const getProveedores = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Proveedor ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea un nuevo proveedor
 */
const createProveedor = async (req, res) => {
  const { nombre } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Proveedor (nombre) VALUES ($1) RETURNING *',
      [nombre]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProveedores,
  createProveedor
};
