const pool = require('../db');

/**
 * GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    // 1. Valor total del inventario
    const { rows: inventory } = await pool.query('SELECT SUM(stock_actual * precio_venta) as total FROM Productos');
    
    // 2. Total ventas del mes actual
    const { rows: sales } = await pool.query(`
      SELECT SUM(total) as total FROM Venta 
      WHERE idVenta > 0 -- Aquí podrías filtrar por fecha si tuvieras la columna
    `);

    // 3. Citas pendientes
    const { rows: appointments } = await pool.query("SELECT COUNT(*) as total FROM Cita WHERE estado = 'Pendiente'");

    // 4. Vehículos registrados
    const { rows: vehicles } = await pool.query('SELECT COUNT(*) as total FROM Vehiculos');

    // 5. Datos para la gráfica (Simulados por ahora o agrupados por idVenta si no hay fecha)
    const chartData = [
      { month: 'Ene', total: 1200 },
      { month: 'Feb', total: 1900 },
      { month: 'Mar', total: sales[0].total || 0 },
    ];

    res.json({
      inventoryValue: inventory[0].total || 0,
      totalSales: sales[0].total || 0,
      pendingAppointments: appointments[0].total || 0,
      totalVehicles: vehicles[0].total || 0,
      chartData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDashboardStats };
