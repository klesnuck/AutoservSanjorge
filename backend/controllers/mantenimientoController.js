const pool = require('../db');

const getMantenimientos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.idMantenimiento as id,
        m.tecnico,
        m.kilometraje,
        m.estado,
        m.fecha,
        m.observaciones,
        m.costo_final,
        v.idVehiculos as vehiculo_id,
        v.placa as vehiculo_placa,
        mo.nombre as vehiculo_modelo,
        ma.nombre as vehiculo_marca,
        u.nombre as cliente_nombre,
        u.email as cliente_email
      FROM Mantenimiento m
      JOIN Vehiculos v ON m.idVehiculos = v.idVehiculos
      JOIN Usuarios u ON v.idUsuarios = u.idUsuarios
      LEFT JOIN Modelos mo ON v.idModelos = mo.idModelos
      LEFT JOIN Marca ma ON v.idMarcas = ma.idMarcas
      ORDER BY m.fecha DESC, m.idMantenimiento DESC
    `);
    
    const mantenimientos = await Promise.all(result.rows.map(async (m) => {
      // Fetch servicios
      const servRes = await pool.query(`
        SELECT d.idServicios as id, s.nombre, d.precio, d.descripcion
        FROM DetalleMantenimientoServicios d
        JOIN Servicios s ON d.idServicios = s.idServicios
        WHERE d.idMantenimiento = $1
      `, [m.id]);
      
      // Fetch productos
      const prodRes = await pool.query(`
        SELECT d.idProductos as id, p.nombre, d.cantidad, d.precio
        FROM DetalleMantenimientoProductos d
        JOIN Productos p ON d.idProductos = p.idProductos
        WHERE d.idMantenimiento = $1
      `, [m.id]);

      return {
        ...m,
        vehiculo: `${m.vehiculo_marca || ''} ${m.vehiculo_modelo || ''} • ${m.vehiculo_placa || ''}`,
        servicios: servRes.rows,
        productos: prodRes.rows
      };
    }));
    
    res.json(mantenimientos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createMantenimiento = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { idVehiculos, tecnico, kilometraje, estado, fecha, observaciones, costo_final, servicios, productos } = req.body;
    
    const mantRes = await client.query(`
      INSERT INTO Mantenimiento (idVehiculos, tecnico, kilometraje, estado, fecha, observaciones, costo_final)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING idMantenimiento
    `, [idVehiculos, tecnico, kilometraje, estado || 'En proceso', fecha, observaciones || '', costo_final || 0]);
    
    const idMantenimiento = mantRes.rows[0].idmantenimiento;
    
    if (servicios && Array.isArray(servicios)) {
      for (const s of servicios) {
        await client.query(`
          INSERT INTO DetalleMantenimientoServicios (idMantenimiento, idServicios, precio, descripcion)
          VALUES ($1, $2, $3, $4)
        `, [idMantenimiento, s.id, s.precio || 0, s.descripcion || '']);
      }
    }
    
    if (productos && Array.isArray(productos)) {
      for (const p of productos) {
        await client.query(`
          INSERT INTO DetalleMantenimientoProductos (idMantenimiento, idProductos, cantidad, precio)
          VALUES ($1, $2, $3, $4)
        `, [idMantenimiento, p.id, p.cantidad || 1, p.precio || 0]);
        
        // Descontar inventario
        await client.query(`
          UPDATE Productos SET stock_actual = stock_actual - $1 WHERE idProductos = $2
        `, [p.cantidad || 1, p.id]);
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ success: true, idMantenimiento });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const updateMantenimientoEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const result = await pool.query(
      'UPDATE Mantenimiento SET estado = $1 WHERE idMantenimiento = $2 RETURNING *',
      [estado, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMantenimientos,
  createMantenimiento,
  updateMantenimientoEstado
};
