const pool = require('../db');

/**
 * Obtiene todas las compras con sus detalles y nombre del proveedor
 */
const getCompras = async (req, res) => {
  try {
    const { rows: compras } = await pool.query(`
      SELECT 
        c.numero_orden, 
        c.estado_compra, 
        c.estado_pago, 
        c.total, 
        c.fecha,
        p.nombre as proveedor_nombre
      FROM Compra c
      LEFT JOIN Proveedor p ON c.idProveedor = p.idProveedor
      ORDER BY c.fecha DESC
    `);

    // Obtener detalles para cada compra (puede optimizarse con json_agg en una sola query)
    const result = await Promise.all(compras.map(async (compra) => {
      const { rows: detalles } = await pool.query(`
        SELECT 
          d.cantidad, 
          d.precio_unitario, 
          d.total,
          pr.nombre as producto_nombre
        FROM DetalleCompra d
        LEFT JOIN Productos pr ON d.idProductos = pr.idProductos
        WHERE d.numero_orden = $1
      `, [compra.numero_orden]);

      return {
        ...compra,
        productos: detalles
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea una nueva orden de compra y sus detalles
 * Aumenta el stock de los productos
 */
const createCompra = async (req, res) => {
  const { idProveedor, estado_compra, estado_pago, total, productos } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Crear la Compra
    const insertCompra = await client.query(`
      INSERT INTO Compra (idProveedor, estado_compra, estado_pago, total) 
      VALUES ($1, $2, $3, $4) RETURNING numero_orden, fecha
    `, [idProveedor, estado_compra, estado_pago, total]);
    
    const newCompraId = insertCompra.rows[0].numero_orden;

    // 2. Insertar Detalles y Actualizar Stock
    for (const prod of productos) {
      await client.query(`
        INSERT INTO DetalleCompra (numero_orden, idProductos, cantidad, precio_unitario, total)
        VALUES ($1, $2, $3, $4, $5)
      `, [newCompraId, prod.productoId, prod.cantidad, prod.costo, prod.total]);

      // Si el estado es completado/recibido (puedes ajustar esta lógica según tus estados), sumar stock
      // Asumiremos que al crear la compra se aumenta el stock actual, o al menos si no está cancelada
      await client.query(`
        UPDATE Productos 
        SET stock_actual = stock_actual + $1 
        WHERE idProductos = $2
      `, [prod.cantidad, prod.productoId]);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, numero_orden: newCompraId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * Obtiene los productos con bajo stock
 */
const getBajoStock = async (req, res) => {
  try {
    const { rows: bajoStock } = await pool.query(`
      SELECT 
        idProductos as id, 
        nombre, 
        stock_actual, 
        stock_minimo, 
        precio_unitario,
        (stock_minimo - stock_actual) as sugerido,
        (stock_minimo - stock_actual) * precio_unitario as costo_total
      FROM Productos 
      WHERE stock_actual < stock_minimo
      ORDER BY stock_actual ASC
    `);
    res.json(bajoStock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCompras,
  createCompra,
  getBajoStock
};
