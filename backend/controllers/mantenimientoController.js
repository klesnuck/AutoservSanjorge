const pool = require('../db');

// Asegurar que la tabla Mantenimiento tenga la columna checklist
const ensureChecklistColumn = async () => {
  try {
    await pool.query(`
      ALTER TABLE Mantenimiento ADD COLUMN IF NOT EXISTS checklist TEXT;
    `);
  } catch (err) {
    console.error('Error verificando columna checklist:', err.message);
  }
};
ensureChecklistColumn();

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
        m.checklist,
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

      let parsedChecklist = [];
      if (m.checklist) {
        try {
          parsedChecklist = JSON.parse(m.checklist);
        } catch {
          parsedChecklist = [];
        }
      }

      return {
        ...m,
        vehiculo: `${m.vehiculo_marca || ''} ${m.vehiculo_modelo || ''} • ${m.vehiculo_placa || ''}`,
        servicios: servRes.rows,
        productos: prodRes.rows,
        checklist: parsedChecklist
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
    
    const { idVehiculos, tecnico, kilometraje, estado, fecha, observaciones, costo_final, servicios, productos, checklist } = req.body;
    const checklistJson = checklist ? JSON.stringify(checklist) : null;
    
    const mantRes = await client.query(`
      INSERT INTO Mantenimiento (idVehiculos, tecnico, kilometraje, estado, fecha, observaciones, costo_final, checklist)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING idMantenimiento
    `, [idVehiculos, tecnico, kilometraje, estado || 'En proceso', fecha, observaciones || '', costo_final || 0, checklistJson]);
    
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

const updateMantenimientoFull = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { tecnico, kilometraje, estado, observaciones, costo_final, checklist, servicios, productos } = req.body;
    
    await client.query('BEGIN');
    
    const checklistJson = checklist ? JSON.stringify(checklist) : null;

    await client.query(`
      UPDATE Mantenimiento
      SET tecnico = COALESCE($1, tecnico),
          kilometraje = COALESCE($2, kilometraje),
          estado = COALESCE($3, estado),
          observaciones = COALESCE($4, observaciones),
          costo_final = COALESCE($5, costo_final),
          checklist = COALESCE($6, checklist)
      WHERE idMantenimiento = $7
    `, [tecnico, kilometraje, estado, observaciones, costo_final, checklistJson, id]);

    if (servicios && Array.isArray(servicios)) {
      await client.query(`DELETE FROM DetalleMantenimientoServicios WHERE idMantenimiento = $1`, [id]);
      for (const s of servicios) {
        await client.query(`
          INSERT INTO DetalleMantenimientoServicios (idMantenimiento, idServicios, precio, descripcion)
          VALUES ($1, $2, $3, $4)
        `, [id, s.id, s.precio || 0, s.descripcion || '']);
      }
    }

    if (productos && Array.isArray(productos)) {
      // Revertir stock de productos anteriores
      const oldProds = await client.query(`SELECT idProductos, cantidad FROM DetalleMantenimientoProductos WHERE idMantenimiento = $1`, [id]);
      for (const oldP of oldProds.rows) {
        await client.query(`UPDATE Productos SET stock_actual = stock_actual + $1 WHERE idProductos = $2`, [oldP.cantidad, oldP.idproductos]);
      }

      await client.query(`DELETE FROM DetalleMantenimientoProductos WHERE idMantenimiento = $1`, [id]);
      for (const p of productos) {
        await client.query(`
          INSERT INTO DetalleMantenimientoProductos (idMantenimiento, idProductos, cantidad, precio)
          VALUES ($1, $2, $3, $4)
        `, [id, p.id, p.cantidad || 1, p.precio || 0]);

        await client.query(`
          UPDATE Productos SET stock_actual = stock_actual - $1 WHERE idProductos = $2
        `, [p.cantidad || 1, p.id]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
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
  updateMantenimientoFull,
  updateMantenimientoEstado
};
