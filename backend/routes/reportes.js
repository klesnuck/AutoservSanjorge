const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/reportes/ventas
 */
router.get('/ventas', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        v.idVenta as id,
        u.nombre AS cliente,
        STRING_AGG(p.nombre || ' x' || dv.cantidad::text, ', ' ORDER BY p.nombre) AS servicio,
        v.fecha,
        v.total,
        v.metodo_pago
      FROM Venta v
      LEFT JOIN Usuarios u ON u.idUsuarios = v.idUsuarios
      LEFT JOIN DetalleVenta dv ON dv.idVenta = v.idVenta
      LEFT JOIN Productos p ON p.idProductos = dv.idProductos
      GROUP BY v.idVenta, u.nombre, v.fecha, v.total, v.metodo_pago
      ORDER BY v.fecha DESC
    `);

    // Map metodo_pago to strings
    const mapped = rows.map(r => {
      let metodo = 'efectivo';
      if (r.metodo_pago === 2) metodo = 'tarjeta';
      if (r.metodo_pago === 3) metodo = 'transferencia';
      return {
        id: `V-${r.id.toString().padStart(3, '0')}`,
        cliente: r.cliente || 'Cliente General',
        servicio: r.servicio || 'Venta',
        fecha: new Date(r.fecha).toLocaleDateString('es-ES'),
        total: Number(r.total) || 0,
        metodo
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reporte de ventas' });
  }
});

/**
 * GET /api/reportes/productos
 */
router.get('/productos', async (req, res) => {
  try {
    // Top stats
    const valorRes = await pool.query(`SELECT COALESCE(SUM(stock_actual * precio_venta), 0) as total FROM Productos`);
    const vendidosRes = await pool.query(`
      SELECT COUNT(*) as vendidos 
      FROM Venta 
      WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE) 
        AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    const ingresosRes = await pool.query(`SELECT COALESCE(SUM(total), 0) as ingresos FROM Venta`);

    // Rendimiento
    const rendRes = await pool.query(`
      SELECT 
        p.idProductos as id, 
        p.nombre, 
        p.stock_actual as stock,
        COALESCE(SUM(v.total), 0) as total_ingresos,
        COUNT(v.idVenta) as ventas
      FROM Productos p
      LEFT JOIN Venta v ON v.idProductos = p.idProductos
      GROUP BY p.idProductos, p.nombre, p.stock_actual
      ORDER BY ventas DESC
    `);

    const maxVentas = Math.max(...rendRes.rows.map(r => Number(r.ventas)), 1);

    const rendimiento = rendRes.rows.map(r => ({
      id: r.id,
      nombre: r.nombre,
      stock: r.stock,
      total: `$${Number(r.total_ingresos).toLocaleString('en-US', {minimumFractionDigits:0})}`,
      ventas: Number(r.ventas),
      progress: `w-[${Math.round((Number(r.ventas) / maxVentas) * 100)}%]` // Tailored inline width isn't always supported by Tailwind JIT unless whitelisted, so we might need inline style, but let's pass a percentage number
    }));

    res.json({
      valorInventario: Number(valorRes.rows[0].total),
      productosVendidosMes: Number(vendidosRes.rows[0].vendidos),
      ingresosTotales: Number(ingresosRes.rows[0].ingresos),
      rendimiento
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reporte de productos' });
  }
});

/**
 * GET /api/reportes/servicios
 */
router.get('/servicios', async (req, res) => {
  try {
    // Top stats
    const countRes = await pool.query(`SELECT COUNT(*) as cantidad FROM DetalleMantenimientoServicios`);
    const ingresosRes = await pool.query(`SELECT COALESCE(SUM(precio), 0) as ingresos FROM DetalleMantenimientoServicios`);
    
    const realizados = Number(countRes.rows[0].cantidad);
    const ingresos = Number(ingresosRes.rows[0].ingresos);
    const ticketPromedio = realizados > 0 ? ingresos / realizados : 0;

    // Distribución
    const distRes = await pool.query(`
      SELECT 
        s.nombre, 
        COUNT(d.idDetalle) as cantidad
      FROM Servicios s
      LEFT JOIN DetalleMantenimientoServicios d ON s.idServicios = d.idServicios
      GROUP BY s.idServicios, s.nombre
      ORDER BY cantidad DESC
    `);

    res.json({
      serviciosRealizados: realizados,
      ingresosPorServicios: ingresos,
      ticketPromedio: ticketPromedio,
      distribucion: distRes.rows.map(r => ({
        nombre: r.nombre,
        cantidad: Number(r.cantidad)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reporte de servicios' });
  }
});

module.exports = router;
