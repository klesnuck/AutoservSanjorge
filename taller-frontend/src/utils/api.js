const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const contentType = response.headers.get('content-type');
  const body = contentType && contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const error = body?.error || response.statusText || 'Error en la petición';
    throw new Error(error);
  }

  return body;
}

// ─── Citas ───────────────────────────────────────────────────────────────────
export const fetchCitas = () => request('/api/citas');
export const createCita = (data) => request('/api/citas', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const createCitaCompleta = (data) => request('/api/citas/completa', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateCita = (id, data) => request(`/api/citas/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(data),
});
export const deleteCita = (id) => request(`/api/citas/${id}`, {
  method: 'DELETE',
});

// ─── Cotizaciones ─────────────────────────────────────────────────────────────
export const fetchCotizaciones = () => request('/api/cotizaciones');
export const createCotizacion = (data) => request('/api/cotizaciones', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateCotizacion = (id, data) => request(`/api/cotizaciones/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});
export const deleteCotizacion = (id) => request(`/api/cotizaciones/${id}`, {
  method: 'DELETE',
});

// ─── Servicios ────────────────────────────────────────────────────────────────
export const fetchServicios = () => request('/api/servicios');
export const createServicio = (data) => request('/api/servicios', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateServicio = (id, data) => request(`/api/servicios/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});
export const deleteServicio = (id) => request(`/api/servicios/${id}`, {
  method: 'DELETE',
});

// ─── Vehículos (gestión) ──────────────────────────────────────────────────────
export const fetchVehiculos = () => request('/api/vehiculos');
export const createVehiculo = (data) => request('/api/vehiculos', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateVehiculo = (id, data) => request(`/api/vehiculos/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});
export const deleteVehiculo = (id) => request(`/api/vehiculos/${id}`, {
  method: 'DELETE',
});

// ─── Ventas ──────────────────────────────────────────────────────────────────
export const fetchVentas = () => request('/api/ventas');
export const createVenta = (data) => request('/api/ventas', {
  method: 'POST',
  body: JSON.stringify(data),
});

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const fetchDashboardStats = () => request('/api/dashboard/stats');

// ─── Vehículos (catálogos) ────────────────────────────────────────────────────
export const fetchMarcas = () => request('/api/catalogo/marcas');
export const fetchModelosByMarca = (idmarca) => request(`/api/catalogo/modelos/marca/${idmarca}`);
export const fetchAnios = () => request('/api/catalogo/anios');
export const fetchMotores = () => request('/api/catalogo/motores');

// ─── Productos ────────────────────────────────────────────────────────────────
export const fetchProductos = () => request('/api/productos');
export const createProducto = (data) => request('/api/productos', {
  method: 'POST',
  body: JSON.stringify(data),
});
export const updateProducto = (id, data) => request(`/api/productos/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});
export const deleteProducto = (id) => request(`/api/productos/${id}`, {
  method: 'DELETE',
});

// ─── Compatibilidad por Modelo ────────────────────────────────────────────────
export const fetchProductosCompatibles = (idModelos) =>
  request(`/api/productos/compatibles?idModelos=${idModelos}`);

export const fetchCompatibilidadProducto = (idProducto) =>
  request(`/api/productos/${idProducto}/compatibilidad`);

export const addCompatibilidad = (idProducto, data) =>
  request(`/api/productos/${idProducto}/compatibilidad`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateCompatibilidad = (id, data) =>
  request(`/api/productos/compatibilidad/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteCompatibilidad = (id) =>
  request(`/api/productos/compatibilidad/${id}`, {
    method: 'DELETE',
  });

// ─── Usuarios ────────────────────────────────────────────────────────────────
export const fetchUsers = () => request('/api/users');

// --- Proveedores ---
export const fetchProveedores = () => request('/api/proveedores');

// --- Compras ---
export const fetchCompras = () => request('/api/compras');
export const fetchBajoStock = () => request('/api/compras/bajo-stock');
export const createCompra = (data) => request('/api/compras', {
  method: 'POST',
  body: JSON.stringify(data),
});

// --- Mantenimiento ---
export const fetchMantenimientos = () => request('/api/mantenimientos');
export const createMantenimiento = (data) => request('/api/mantenimientos', { method: 'POST', body: JSON.stringify(data) });
export const updateMantenimientoEstado = (id, estado) => request(`/api/mantenimientos/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) });

// --- Reportes ---
export const fetchReporteVentas = () => request('/api/reportes/ventas');
export const fetchReporteProductos = () => request('/api/reportes/productos');
export const fetchReporteServicios = () => request('/api/reportes/servicios');
