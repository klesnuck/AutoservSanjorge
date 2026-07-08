const pool = require('../db');

/**
 * GET /api/ventas
 */
const getVentas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.idVenta as id,
        v.total,
        v.metodo_pago,
        v.fecha,
        u.nombre as cliente,
        u.email as cliente_correo,
        STRING_AGG(p.nombre, ', ') as producto_nombre
      FROM Venta v
      LEFT JOIN Usuarios u ON v.idUsuarios = u.idUsuarios
      LEFT JOIN DetalleVenta dv ON v.idVenta = dv.idVenta
      LEFT JOIN Productos p ON dv.idProductos = p.idProductos
      GROUP BY v.idVenta, u.nombre, u.email
      ORDER BY v.idVenta DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/ventas
 */
const createVenta = async (req, res) => {
  const { idUsuarios, metodo_pago, total, productos } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Insert Venta (idProductos will be NULL or the first one if we want backward compatibility, but let's use NULL)
    const resultVenta = await client.query(
      `INSERT INTO Venta (idUsuarios, metodo_pago, total)
       VALUES ($1, $2, $3) RETURNING idVenta`,
      [idUsuarios, metodo_pago, total]
    );
    const idVenta = resultVenta.rows[0].idventa;

    // 2. Insert DetalleVenta and update stock for each product
    for (const prod of productos) {
      await client.query(
        `INSERT INTO DetalleVenta (idVenta, idProductos, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [idVenta, prod.idproductos, prod.cantidad, prod.precio_venta, prod.subtotal]
      );

      // Decrement stock
      await client.query(
        'UPDATE Productos SET stock_actual = stock_actual - $1 WHERE idProductos = $2',
        [prod.cantidad, prod.idproductos]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, idVenta });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getVentas, createVenta };
