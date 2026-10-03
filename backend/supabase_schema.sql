-- ============================================================================
-- ESQUEMA DE BASE DE DATOS POSTGRESQL PARA SUPABASE - AUTOSERVICIO SAN JORGE
-- ============================================================================
-- Instrucciones: Copia y ejecuta todo este contenido en el SQL Editor de Supabase.

-- 1. Tabla Roles
CREATE TABLE IF NOT EXISTS Roles (
  idRoles SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion VARCHAR(255),
  permisos TEXT
);

-- 2. Tabla Usuarios
CREATE TABLE IF NOT EXISTS Usuarios (
  idUsuarios SERIAL PRIMARY KEY,
  idRoles INTEGER REFERENCES Roles(idRoles) ON DELETE SET NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  nombre VARCHAR(100),
  telefono VARCHAR(20)
);

-- 3. Catálogo de Marcas de Vehículos
CREATE TABLE IF NOT EXISTS Marca (
  idMarcas SERIAL PRIMARY KEY,
  nombre VARCHAR(45) NOT NULL
);

-- 4. Catálogo de Modelos
CREATE TABLE IF NOT EXISTS Modelos (
  idModelos SERIAL PRIMARY KEY,
  idMarcas INTEGER REFERENCES Marca(idMarcas) ON DELETE CASCADE,
  nombre VARCHAR(45) NOT NULL
);

-- 5. Catálogo de Motores
CREATE TABLE IF NOT EXISTS Motores (
  idMotores SERIAL PRIMARY KEY,
  tipo_motor VARCHAR(45) NOT NULL
);

-- 6. Relación Modelos <-> Motores
CREATE TABLE IF NOT EXISTS Modelos_has_Motores (
  idModelos INTEGER REFERENCES Modelos(idModelos) ON DELETE CASCADE,
  idMotores INTEGER REFERENCES Motores(idMotores) ON DELETE CASCADE,
  PRIMARY KEY (idModelos, idMotores)
);

-- 7. Catálogo de Años
CREATE TABLE IF NOT EXISTS Anio (
  idAnio SERIAL PRIMARY KEY,
  anio INTEGER NOT NULL
);

-- 8. Tabla Vehículos
CREATE TABLE IF NOT EXISTS Vehiculos (
  idVehiculos SERIAL PRIMARY KEY,
  idUsuarios INTEGER REFERENCES Usuarios(idUsuarios) ON DELETE CASCADE,
  idAnio INTEGER REFERENCES Anio(idAnio) ON DELETE SET NULL,
  idMarcas INTEGER REFERENCES Marca(idMarcas) ON DELETE SET NULL,
  idMotores INTEGER REFERENCES Motores(idMotores) ON DELETE SET NULL,
  idModelos INTEGER REFERENCES Modelos(idModelos) ON DELETE SET NULL,
  placa VARCHAR(20),
  color VARCHAR(45),
  km NUMERIC,
  vin VARCHAR(50)
);

-- 9. Catálogo de Productos
CREATE TABLE IF NOT EXISTS Productos (
  idProductos SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio_unitario NUMERIC(10,2) DEFAULT 0,
  precio_venta NUMERIC(10,2) DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  stock_actual INTEGER DEFAULT 0,
  categoria VARCHAR(100),
  sku VARCHAR(50) UNIQUE,
  ubicacion_almacen VARCHAR(100),
  marca VARCHAR(100)
);

-- 10. Catálogo de Servicios
CREATE TABLE IF NOT EXISTS Servicios (
  idServicios SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  tiempo_estimado NUMERIC DEFAULT 0,
  costo NUMERIC DEFAULT 0,
  categoria NUMERIC DEFAULT 0,
  mano_obra NUMERIC DEFAULT 0,
  refacciones_estimadas NUMERIC DEFAULT 0
);

-- 11. Relación Productos <-> Servicios
CREATE TABLE IF NOT EXISTS Productos_has_Servicios (
  idProductos INTEGER REFERENCES Productos(idProductos) ON DELETE CASCADE,
  idServicios INTEGER REFERENCES Servicios(idServicios) ON DELETE CASCADE,
  cantidad INTEGER DEFAULT 1,
  PRIMARY KEY (idProductos, idServicios)
);

-- 12. Catálogo de Proveedores
CREATE TABLE IF NOT EXISTS Proveedor (
  idProveedor SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

-- 13. Tabla Compra (Órdenes de Compra a Proveedores)
CREATE TABLE IF NOT EXISTS Compra (
  numero_orden SERIAL PRIMARY KEY,
  idProveedor INTEGER REFERENCES Proveedor(idProveedor) ON DELETE SET NULL,
  estado_compra VARCHAR(50) DEFAULT 'Pendiente',
  estado_pago VARCHAR(50) DEFAULT 'Pendiente',
  total NUMERIC DEFAULT 0,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Detalle de Compra
CREATE TABLE IF NOT EXISTS DetalleCompra (
  idDetalle SERIAL PRIMARY KEY,
  numero_orden INTEGER REFERENCES Compra(numero_orden) ON DELETE CASCADE,
  idProductos INTEGER REFERENCES Productos(idProductos) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0
);

-- 15. Tabla Cotizaciones
CREATE TABLE IF NOT EXISTS Cotizacion (
  idCotizacion SERIAL PRIMARY KEY,
  idUsuarios INTEGER REFERENCES Usuarios(idUsuarios) ON DELETE CASCADE,
  idVehiculos INTEGER REFERENCES Vehiculos(idVehiculos) ON DELETE SET NULL,
  idServicios INTEGER REFERENCES Servicios(idServicios) ON DELETE SET NULL,
  idProductos INTEGER REFERENCES Productos(idProductos) ON DELETE SET NULL,
  total_estimado NUMERIC DEFAULT 0,
  fecha VARCHAR(50),
  detalles TEXT,
  estado VARCHAR(50) DEFAULT 'Pendiente'
);

-- 16. Tabla Ventas
CREATE TABLE IF NOT EXISTS Venta (
  idVenta SERIAL PRIMARY KEY,
  idProductos INTEGER REFERENCES Productos(idProductos) ON DELETE SET NULL,
  idUsuarios INTEGER REFERENCES Usuarios(idUsuarios) ON DELETE SET NULL,
  metodo_pago INTEGER DEFAULT 1,
  total NUMERIC DEFAULT 0,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Detalle de Venta
CREATE TABLE IF NOT EXISTS DetalleVenta (
  idDetalleVenta SERIAL PRIMARY KEY,
  idVenta INTEGER REFERENCES Venta(idVenta) ON DELETE CASCADE,
  idProductos INTEGER REFERENCES Productos(idProductos) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 18. Compatibilidad de Productos
CREATE TABLE IF NOT EXISTS Productos_compatibilidad (
  id SERIAL PRIMARY KEY,
  idProductos INT NOT NULL REFERENCES Productos(idProductos) ON DELETE CASCADE,
  idMarcas INT REFERENCES Marca(idMarcas) ON DELETE CASCADE,
  idModelos INT REFERENCES Modelos(idModelos) ON DELETE CASCADE,
  cantidad INT NOT NULL DEFAULT 1,
  precio_especial NUMERIC(10,2) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_compatibilidad_modelos ON Productos_compatibilidad(idModelos);
CREATE INDEX IF NOT EXISTS idx_compatibilidad_marcas ON Productos_compatibilidad(idMarcas);

-- 19. Facturas
CREATE TABLE IF NOT EXISTS Factura (
  idFactura SERIAL PRIMARY KEY,
  idVenta INTEGER REFERENCES Venta(idVenta) ON DELETE CASCADE,
  img TEXT
);

-- 20. Mantenimiento
CREATE TABLE IF NOT EXISTS Mantenimiento (
  idMantenimiento SERIAL PRIMARY KEY,
  idVehiculos INTEGER REFERENCES Vehiculos(idVehiculos) ON DELETE CASCADE,
  tecnico VARCHAR(100),
  kilometraje VARCHAR(50),
  estado VARCHAR(50) DEFAULT 'En Proceso',
  fecha DATE DEFAULT CURRENT_DATE,
  observaciones TEXT,
  costo_final NUMERIC DEFAULT 0
);

-- 21. Detalle Mantenimiento Servicios
CREATE TABLE IF NOT EXISTS DetalleMantenimientoServicios (
  idDetalle SERIAL PRIMARY KEY,
  idMantenimiento INTEGER REFERENCES Mantenimiento(idMantenimiento) ON DELETE CASCADE,
  idServicios INTEGER REFERENCES Servicios(idServicios) ON DELETE CASCADE,
  precio NUMERIC DEFAULT 0,
  descripcion VARCHAR(255)
);

-- 22. Detalle Mantenimiento Productos
CREATE TABLE IF NOT EXISTS DetalleMantenimientoProductos (
  idDetalle SERIAL PRIMARY KEY,
  idMantenimiento INTEGER REFERENCES Mantenimiento(idMantenimiento) ON DELETE CASCADE,
  idProductos INTEGER REFERENCES Productos(idProductos) ON DELETE CASCADE,
  cantidad INTEGER DEFAULT 1,
  precio NUMERIC DEFAULT 0
);

-- 23. Citas
CREATE TABLE IF NOT EXISTS Cita (
  idCita SERIAL PRIMARY KEY,
  idCotizacion INTEGER REFERENCES Cotizacion(idCotizacion) ON DELETE CASCADE,
  idUsuarios INTEGER REFERENCES Usuarios(idUsuarios) ON DELETE CASCADE,
  fecha DATE,
  hora TIME,
  nota VARCHAR(255),
  estado VARCHAR(50) DEFAULT 'Pendiente'
);

-- ============================================================================
-- DATOS INICIALES POR DEFECTO (ROLES Y USUARIO ADMINISTRADOR)
-- ============================================================================

-- Asegurar restricciones de unicidad para ON CONFLICT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'Roles'::regclass AND contype = 'u') THEN
    ALTER TABLE Roles ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'Usuarios'::regclass AND contype = 'u') THEN
    ALTER TABLE Usuarios ADD CONSTRAINT usuarios_email_key UNIQUE (email);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Insertar roles por defecto si no existen
INSERT INTO Roles (nombre, descripcion, permisos)
VALUES 
  ('Administrador', 'Acceso completo al sistema', '["Dashboard","Citas","Vehículos","Servicios","Productos","Ventas","Compras","Cotizaciones","Reportes","Usuarios","Roles"]'),
  ('Técnico', 'Acceso a servicios y mantenimiento', '["Citas","Vehículos","Servicios"]'),
  ('Cliente', 'Acceso al portal de clientes', '["Cotizaciones","Reportes"]')
ON CONFLICT DO NOTHING;

-- Insertar o actualizar usuario Administrador por defecto (Email: admin@admin.com / Contraseña: admin123)
DELETE FROM Usuarios WHERE email = 'admin@admin.com';
INSERT INTO Usuarios (idRoles, email, contrasena, nombre, telefono)
SELECT idRoles, 'admin@admin.com', '$2a$10$5xXZeYGdGAboPDX9LleGnPs.HRO9rRaJhTD3G9zwP2P', 'Administrador', ''
FROM Roles WHERE nombre = 'Administrador';
