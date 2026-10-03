/**
 * @file index.js
 * @description Punto de entrada principal del backend del Taller San Jorge.
 *
 * Responsabilidades:
 * - Configura y levanta el servidor Express en el puerto definido por la variable de entorno `PORT` (por defecto 4000).
 * - Inicializa la base de datos PostgreSQL creando todas las tablas necesarias si no existen (`initializeDatabase`).
 * - Registra los roles por defecto (Administrador, Técnico, Cliente) y el usuario administrador inicial.
 * - Expone los endpoints de autenticación (`/api/auth/login`, `/api/auth/register`) y gestión de
 *   usuarios y roles (`/api/users`, `/api/roles`) directamente en este archivo.
 * - Monta los enrutadores de los módulos especializados:
 *   - `/api/marca`       → marcaRoutes
 *   - `/api`             → vehiculoRoutes (anio, modelo, motor)
 *   - `/api/cliente`     → clienteRoutes
 *   - `/api/servicios`   → servicioRoutes
 *   - `/api/cotizaciones`→ cotizacionRoutes
 *   - `/api/citas`       → citaRoutes
 *
 * @module index
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const bcrypt = require('bcryptjs');
const pool = require('./db');

const marcaRoutes = require('./routes/marcaRoutes');
const vehiculoRoutes = require('./routes/vehiculoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const citaRoutes = require('./routes/citaRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const productoRoutes = require('./routes/productoRoutes');
const compatibilidadRoutes = require('./routes/compatibilidadRoutes');
const ventaRoutes = require('./routes/ventaRoutes');
const compraRoutes = require('./routes/compraRoutes');
const proveedorRoutes = require('./routes/proveedorRoutes');
const mantenimientoRoutes = require('./routes/mantenimientoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportesRoutes = require('./routes/reportes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const rolesRoutes = require('./routes/rolesRoutes');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Roles por defecto que se insertan al inicializar la base de datos
 * si no existen previamente. Cada rol incluye su nombre, descripción
 * y un arreglo de permisos que determinan el acceso a módulos del sistema.
 *
 * @type {Array<{nombre: string, descripcion: string, permisos: string[]}>}
 */
const DEFAULT_ROLES = [
  {
    nombre: 'Administrador',
    descripcion: 'Acceso completo al sistema',
    permisos: ['Dashboard', 'Citas', 'Vehículos', 'Servicios', 'Productos', 'Ventas', 'Compras', 'Cotizaciones', 'Reportes', 'Usuarios', 'Roles']
  },
  {
    nombre: 'Técnico',
    descripcion: 'Acceso a servicios y mantenimiento',
    permisos: ['Citas', 'Vehículos', 'Servicios']
  },
  {
    nombre: 'Cliente',
    descripcion: 'Acceso al portal de clientes',
    permisos: ['Cotizaciones', 'Reportes']
  },
];

// ---------------------------------------------------------------------------
// Funciones de validación de entrada
// ---------------------------------------------------------------------------

/**
 * Valida que el email tenga un formato correcto y longitud aceptable.
 * @param {string} email
 * @returns {boolean}
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length > 0 && email.length < 64 && emailRegex.test(email);
};

/**
 * Valida que la contraseña tenga más de 6 caracteres y al menos un dígito.
 * @param {string} password
 * @returns {boolean}
 */
const validatePassword = (password) => {
  return typeof password === 'string' && password.length > 6 && /\d/.test(password);
};

/**
 * Valida que el nombre no esté vacío y no supere los 100 caracteres.
 * @param {string} name
 * @returns {boolean}
 */
const validateName = (name) => {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 100;
};

/**
 * Valida que el teléfono tenga un formato numérico aceptable.
 * Si el teléfono es nulo o undefined, se considera válido (campo opcional).
 * @param {string|undefined} phone
 * @returns {boolean}
 */
const validatePhone = (phone) => {
  if (!phone) return true;
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone);
};

/**
 * Envuelve un identificador SQL en comillas dobles para preservar
 * su casing original en PostgreSQL (ej: `"idRoles"`).
 * @param {string} identifier
 * @returns {string}
 */
const quoteIdentifier = (identifier) => `"${identifier}"`;

let userPasswordColumn = 'contrasena';
let userRoleIdColumn = 'idroles';

// ---------------------------------------------------------------------------
// Inicialización de la base de datos
// ---------------------------------------------------------------------------

/**
 * Inicializa la base de datos creando las tablas necesarias si no existen,
 * insertando los roles por defecto y creando el usuario administrador inicial.
 *
 * Tablas creadas:
 * - `Roles`, `Usuarios`, `Marca`, `Modelos`, `Motores`, `Modelos_has_Motores`
 * - `Anio`, `Vehiculos`, `Productos`, `Servicios`, `Productos_has_Servicios`
 * - `Proveedor`, `Compra`, `Cotizacion`, `Venta`, `Factura`, `Mantenimiento`, `Cita`
 *
 * Usuario administrador por defecto:
 * - Email: `admin@admin.com`
 * - Contraseña: `admin123`
 *
 * @async
 * @function initializeDatabase
 * @returns {Promise<void>}
 */
const initializeDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Roles (
      idRoles SERIAL PRIMARY KEY,
      nombre VARCHAR(100) UNIQUE,
      descripcion VARCHAR(255),
      permisos TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Usuarios (
      idUsuarios SERIAL PRIMARY KEY,
      idRoles INTEGER REFERENCES Roles(idRoles),
      email VARCHAR(100) UNIQUE,
      contrasena VARCHAR(255),
      nombre VARCHAR(100),
      telefono VARCHAR(20)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Marca (
      idMarcas SERIAL PRIMARY KEY,
      nombre VARCHAR(45)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Modelos (
      idModelos SERIAL PRIMARY KEY,
      idMarcas INTEGER REFERENCES Marca(idMarcas),
      nombre VARCHAR(45)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Motores (
      idMotores SERIAL PRIMARY KEY,
      tipo_motor VARCHAR(45)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Modelos_has_Motores (
      idModelos INTEGER,
      idMotores INTEGER,
      PRIMARY KEY (idModelos, idMotores),
      FOREIGN KEY (idModelos) REFERENCES Modelos(idModelos),
      FOREIGN KEY (idMotores) REFERENCES Motores(idMotores)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Anio (
      idAnio SERIAL PRIMARY KEY,
      anio INTEGER
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Vehiculos (
      idVehiculos SERIAL PRIMARY KEY,
      idUsuarios INTEGER REFERENCES Usuarios(idUsuarios),
      idAnio INTEGER REFERENCES Anio(idAnio),
      idMarcas INTEGER REFERENCES Marca(idMarcas),
      idMotores INTEGER REFERENCES Motores(idMotores),
      idModelos INTEGER REFERENCES Modelos(idModelos),
      placa VARCHAR(20),
      color VARCHAR(45),
      km NUMERIC,
      vin VARCHAR(50)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Productos (
      idProductos SERIAL PRIMARY KEY,
      nombre VARCHAR(100),
      precio_unitario INTEGER,
      precio_venta INTEGER,
      stock_minimo INTEGER,
      stock_actual INTEGER DEFAULT 0,
      categoria VARCHAR(100),
      sku VARCHAR(50) UNIQUE,
      ubicacion_almacen VARCHAR(100),
      marca VARCHAR(100)
    );
  `);

  // Migración: agregar columnas si no existen en versiones anteriores de la tabla
  await pool.query(`ALTER TABLE Productos ADD COLUMN IF NOT EXISTS stock_actual INTEGER DEFAULT 0`).catch(() => {});
  await pool.query(`ALTER TABLE Productos ADD COLUMN IF NOT EXISTS ubicacion_almacen VARCHAR(100)`).catch(() => {});
  await pool.query(`ALTER TABLE Productos ADD COLUMN IF NOT EXISTS marca VARCHAR(100)`).catch(() => {});
  await pool.query(`ALTER TABLE Productos ALTER COLUMN categoria TYPE VARCHAR(100) USING categoria::text`).catch(() => {});
  // Agregar constraint UNIQUE en sku si no existe
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'productos_sku_key'
        AND conrelid = 'Productos'::regclass
      ) THEN
        ALTER TABLE Productos ADD CONSTRAINT productos_sku_key UNIQUE (sku);
      END IF;
    END $$;
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Servicios (
      idServicios SERIAL PRIMARY KEY,
      nombre VARCHAR(100),
      descripcion VARCHAR(255),
      tiempo_estimado NUMERIC,
      costo NUMERIC,
      categoria NUMERIC,
      mano_obra NUMERIC,
      refacciones_estimadas NUMERIC
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Productos_has_Servicios (
      idProductos INTEGER,
      idServicios INTEGER,
      cantidad INTEGER DEFAULT 1,
      PRIMARY KEY (idProductos, idServicios),
      FOREIGN KEY (idProductos) REFERENCES Productos(idProductos),
      FOREIGN KEY (idServicios) REFERENCES Servicios(idServicios) ON DELETE CASCADE
    );
  `);

  // Migración para Productos_has_Servicios (por si ya existe)
  try {
    await pool.query('ALTER TABLE Productos_has_Servicios ADD COLUMN IF NOT EXISTS cantidad INTEGER DEFAULT 1');
  } catch (e) {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Proveedor (
      idProveedor SERIAL PRIMARY KEY,
      nombre VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Compra (
      numero_orden SERIAL PRIMARY KEY,
      idProveedor INTEGER REFERENCES Proveedor(idProveedor),
      estado_compra VARCHAR(50),
      estado_pago VARCHAR(50),
      total NUMERIC,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS DetalleCompra (
      idDetalle SERIAL PRIMARY KEY,
      numero_orden INTEGER REFERENCES Compra(numero_orden) ON DELETE CASCADE,
      idProductos INTEGER REFERENCES Productos(idProductos),
      cantidad INTEGER,
      precio_unitario NUMERIC,
      total NUMERIC
    );
  `);

  // Migraciones para Compra por si existía con el esquema viejo
  try {
    await pool.query('ALTER TABLE Compra DROP COLUMN IF EXISTS idProductos');
    await pool.query('ALTER TABLE Compra DROP COLUMN IF EXISTS cant_prod');
    await pool.query('ALTER TABLE Compra ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(50)');
    await pool.query('ALTER TABLE Compra ADD COLUMN IF NOT EXISTS fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await pool.query('ALTER TABLE Compra ALTER COLUMN estado_compra TYPE VARCHAR(50)');
    await pool.query('ALTER TABLE Compra ALTER COLUMN total TYPE NUMERIC');
  } catch (err) {
    console.log('Migración Compra omitida o con error no crítico:', err.message);
  }


  await pool.query(`
    CREATE TABLE IF NOT EXISTS Cotizacion (
      idCotizacion SERIAL PRIMARY KEY,
      idUsuarios INTEGER REFERENCES Usuarios(idUsuarios),
      idVehiculos INTEGER REFERENCES Vehiculos(idVehiculos),
      idServicios INTEGER REFERENCES Servicios(idServicios),
      idProductos INTEGER REFERENCES Productos(idProductos),
      total_estimado NUMERIC,
      fecha VARCHAR(50)
    );
  `);

  await pool.query(`ALTER TABLE Cotizacion ADD COLUMN IF NOT EXISTS detalles TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE Cotizacion ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'Pendiente'`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Venta (
      idVenta SERIAL PRIMARY KEY,
      idProductos INTEGER REFERENCES Productos(idProductos),
      idUsuarios INTEGER REFERENCES Usuarios(idUsuarios),
      metodo_pago INTEGER,
      total INTEGER,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Asegurar que la columna fecha exista si la tabla ya fue creada
  try {
    await pool.query('ALTER TABLE Venta ADD COLUMN IF NOT EXISTS fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  } catch (err) {
    console.log('La columna fecha ya existe o hubo un error al crearla');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS DetalleVenta (
      idDetalleVenta SERIAL PRIMARY KEY,
      idVenta INTEGER REFERENCES Venta(idVenta) ON DELETE CASCADE,
      idProductos INTEGER REFERENCES Productos(idProductos),
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio_unitario NUMERIC(10,2) NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL
    );
  `);

  try {
    await pool.query('ALTER TABLE Venta ALTER COLUMN idProductos DROP NOT NULL');
  } catch (err) {
    console.log('Migración Venta.idProductos omitida o ya aplicada:', err.message);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Productos_compatibilidad (
      id SERIAL PRIMARY KEY,
      idProductos INT NOT NULL REFERENCES Productos(idProductos) ON DELETE CASCADE,
      idMarcas INT REFERENCES Marca(idMarcas) ON DELETE CASCADE,
      idModelos INT REFERENCES Modelos(idModelos) ON DELETE CASCADE,
      cantidad INT NOT NULL DEFAULT 1,
      precio_especial NUMERIC(10,2) DEFAULT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_compatibilidad_modelos
    ON Productos_compatibilidad(idModelos)
  `).catch(() => {});

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_compatibilidad_marcas
    ON Productos_compatibilidad(idMarcas)
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Factura (
      idFactura SERIAL PRIMARY KEY,
      idVenta INTEGER REFERENCES Venta(idVenta),
      img TEXT
    );
  `);

  // Tablas para Mantenimiento Dinámico
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Mantenimiento (
      idMantenimiento SERIAL PRIMARY KEY,
      idVehiculos INTEGER REFERENCES Vehiculos(idVehiculos),
      tecnico VARCHAR(100),
      kilometraje VARCHAR(50),
      estado VARCHAR(50),
      fecha DATE,
      observaciones TEXT,
      costo_final NUMERIC
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS DetalleMantenimientoServicios (
      idDetalle SERIAL PRIMARY KEY,
      idMantenimiento INTEGER REFERENCES Mantenimiento(idMantenimiento) ON DELETE CASCADE,
      idServicios INTEGER REFERENCES Servicios(idServicios),
      precio NUMERIC,
      descripcion VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS DetalleMantenimientoProductos (
      idDetalle SERIAL PRIMARY KEY,
      idMantenimiento INTEGER REFERENCES Mantenimiento(idMantenimiento) ON DELETE CASCADE,
      idProductos INTEGER REFERENCES Productos(idProductos),
      cantidad INTEGER,
      precio NUMERIC
    );
  `);

  // Intentar borrar la tabla Mantenimiento vieja si existe y tiene otra estructura
  try {
    const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'mantenimiento' AND column_name = 'idservicios'");
    if (rows.length > 0) {
      console.log('Detectado esquema antiguo de Mantenimiento. Recreando tabla...');
      await pool.query('DROP TABLE Mantenimiento CASCADE');
      // Las sentencias de arriba volverán a crearla al reiniciar
    }
  } catch (e) {
    console.error('Error migrando Mantenimiento:', e);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Cita (
      idCita SERIAL PRIMARY KEY,
      idCotizacion INTEGER REFERENCES Cotizacion(idCotizacion) ON DELETE CASCADE,
      idUsuarios INTEGER REFERENCES Usuarios(idUsuarios),
      fecha DATE,
      hora TIME,
      nota VARCHAR(255),
      estado VARCHAR(50) DEFAULT 'Pendiente'
    );
  `);

  for (const role of DEFAULT_ROLES) {
    const { rows: existing } = await pool.query('SELECT idRoles, permisos FROM Roles WHERE nombre = $1', [role.nombre]);
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO Roles (nombre, descripcion, permisos) VALUES ($1, $2, $3)',
        [role.nombre, role.descripcion, JSON.stringify(role.permisos)]
      );
      continue;
    }

    const existingRole = existing[0];
    let storedPermissions = [];
    try {
      const parsed = Array.isArray(existingRole.permisos)
        ? existingRole.permisos
        : JSON.parse(existingRole.permisos || '[]');
      if (Array.isArray(parsed)) {
        storedPermissions = parsed;
      }
    } catch (parseError) {
      storedPermissions = [];
    }

    if (storedPermissions.length === 0 && role.permisos.length > 0) {
      await pool.query(
        'UPDATE Roles SET permisos = $1 WHERE idRoles = $2',
        [JSON.stringify(role.permisos), existingRole.idRoles]
      );
    }
  }

  const { rows: adminRole } = await pool.query('SELECT idRoles FROM Roles WHERE nombre = $1', ['Administrador']);
  if (adminRole.length > 0) {
    const { rows: adminUser } = await pool.query('SELECT idUsuarios FROM Usuarios WHERE email = $1', ['admin@admin.com']);
    if (adminUser.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO Usuarios (${quoteIdentifier(userRoleIdColumn)}, email, ${quoteIdentifier(userPasswordColumn)}, nombre, telefono) VALUES ($1, $2, $3, $4, $5)`,
        [adminRole[0].idroles, 'admin@admin.com', hashedPassword, 'Administrador', '']
      );
    }
  }
};

// ---------------------------------------------------------------------------
// Helpers de formato para respuestas JSON
// ---------------------------------------------------------------------------

/**
 * Transforma una fila cruda de la tabla `Roles` al formato de respuesta de la API.
 * Convierte el campo `permisos` de JSON string a arreglo.
 * @param {Object} row - Fila de la BD.
 * @returns {{ id: number, name: string, description: string, permissions: string[] }}
 */
const formatRoleRow = (row) => ({
  id: row.idroles,
  name: row.nombre,
  description: row.descripcion,
  permissions: Array.isArray(row.permisos) ? row.permisos : JSON.parse(row.permisos || '[]')
});

/**
 * Transforma una fila cruda de la tabla `Usuarios` al formato de respuesta de la API.
 * @param {Object} row - Fila de la BD (requiere JOIN con Roles para `rolename`).
 * @returns {{ id: number, roleId: number, email: string, name: string, phone: string, role: string }}
 */
const formatUserRow = (row) => ({
  id: row.idusuarios,
  roleId: row.idroles,
  email: row.email,
  name: row.nombre,
  phone: row.telefono || '',
  role: row.rolename,
});

app.get('/', (req, res) => {
  res.send('Backend en funcionamiento');
});

// ---------------------------------------------------------------------------
// Rutas de módulos especializados (delegadas a enrutadores externos)
// ---------------------------------------------------------------------------
app.use('/api/marca', marcaRoutes);
app.use('/api', vehiculoRoutes); // Maneja /api/anio, /api/modelo/:idmarca, /api/motor
app.use('/api/cliente', clienteRoutes);

// Nuevas Rutas (Preparadas para conectarse después)
app.use('/api/citas', citaRoutes);
// Compatibilidad de productos por modelo de vehículo (debe ir ANTES de productoRoutes)
app.use('/api/productos', compatibilidadRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/mantenimientos', mantenimientoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/roles', rolesRoutes);

const PORT = process.env.PORT || 4000;

// Inicialización de la base de datos (desactivada en Vercel Serverless para evitar bloqueos)
if (!process.env.VERCEL) {
  initializeDatabase()
    .then(() => {
      console.log('Base de datos verificada/inicializada.');
    })
    .catch((err) => {
      console.error('Advertencia en inicialización de base de datos:', err.message);
    });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
