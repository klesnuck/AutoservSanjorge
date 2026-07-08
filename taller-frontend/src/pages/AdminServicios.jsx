import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useToast } from '../components/Toast';
import {
  fetchServicios,
  createServicio,
  updateServicio,
  deleteServicio,
  fetchProductos,
  fetchMarcas,
  fetchModelosByMarca,
  fetchCompatibilidadProducto,
  addCompatibilidad,
  deleteCompatibilidad,
} from '../utils/api';

export default function AdminServicios() {
  const toast = useToast();
  const [servicios, setServicios] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(true);

  const [nuevo, setNuevo] = useState({
    id: null,
    nombre: '',
    categoria: '',
    manoObra: '',
    tiempoEstimado: '',
    descripcion: '',
    costo: '',
    refacciones: [], // Array of { id, nombre, precio_unitario, cantidad }
  });

  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

  // Estados temporales para agregar refacción al servicio
  const [refaccionSeleccionada, setRefaccionSeleccionada] = useState('');
  const [cantidadRefaccion, setCantidadRefaccion] = useState(1);

  const [editando, setEditando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState('Todas las categorías');

  // ── Compatibility Modal State ───────────────────────────────────────────────
  const [showCompatModal, setShowCompatModal] = useState(false);
  const [compatProducto, setCompatProducto] = useState(null); // { id, nombre }
  const [compatEntries, setCompatEntries] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [compatForm, setCompatForm] = useState({ idMarcas: '', idModelos: '', cantidad: 1, precio_especial: '' });
  const [loadingCompat, setLoadingCompat] = useState(false);

  // Categorías únicas derivadas de los datos del backend
  const categoriasUnicas = [...new Set(servicios.map(s => String(s.categoria)).filter(Boolean))];
  const categorias = ['Todas las categorías', ...categoriasUnicas];

  const serviciosFiltrados = categoriaActiva === 'Todas las categorías'
    ? servicios
    : servicios.filter(s => String(s.categoria) === categoriaActiva);

  const loadServiciosYProductos = async () => {
    try {
      const [dataServicios, dataProductos] = await Promise.all([
        fetchServicios(),
        fetchProductos()
      ]);
      setServicios(dataServicios || []);
      setProductos(dataProductos || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setServicios([]);
      setProductos([]);
    } finally {
      setLoadingServicios(false);
      setLoadingProductos(false);
    }
  };

  useEffect(() => {
    loadServiciosYProductos();
    fetchMarcas().then(data => setMarcas(data || [])).catch(() => {});
  }, []);

  // Calcular refacciones estimadas sumando el precio_unitario * cantidad
  const totalRefacciones = nuevo.refacciones.reduce((acc, r) => acc + (Number(r.precio_unitario || 0) * Number(r.cantidad || 1)), 0);
  const costoTotalCalculado = (Number(nuevo.manoObra) || 0) + totalRefacciones;

  const agregarRefaccion = () => {
    if (!refaccionSeleccionada) return;
    const prod = productos.find(p => (p.idproductos || p.idProductos) === Number(refaccionSeleccionada));
    if (prod) {
      const prodId = prod.idproductos || prod.idProductos;
      const existe = nuevo.refacciones.find(r => r.id === prodId);
      if (existe) {
        setNuevo({
          ...nuevo,
          refacciones: nuevo.refacciones.map(r => r.id === prodId ? { ...r, cantidad: r.cantidad + cantidadRefaccion } : r)
        });
      } else {
        setNuevo({
          ...nuevo,
          refacciones: [...nuevo.refacciones, { id: prodId, nombre: prod.nombre, precio_unitario: prod.precio_unitario, cantidad: cantidadRefaccion }]
        });
      }
      setRefaccionSeleccionada('');
      setCantidadRefaccion(1);
    }
  };

  const eliminarRefaccion = (id) => {
    setNuevo({
      ...nuevo,
      refacciones: nuevo.refacciones.filter(r => r.id !== id)
    });
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: nuevo.nombre,
        categoria: nuevo.categoria,
        manoObra: Number(nuevo.manoObra) || 0,
        tiempoEstimado: Number(nuevo.tiempoEstimado) || 0,
        descripcion: nuevo.descripcion || '',
        costo: costoTotalCalculado,
        refaccionesEstimadas: totalRefacciones,
        refacciones: nuevo.refacciones.map(r => ({ id: r.id, cantidad: r.cantidad })),
      };

      if (editando) {
        await updateServicio(nuevo.id, payload);
      } else {
        await createServicio(payload);
      }
      await loadServiciosYProductos();
      cerrarModal();
    } catch (err) {
      toast.error(err.message, 'Error al guardar el servicio');
    }
  };

  const prepararEdicion = (s) => {
    setNuevo({
      id: s.id,
      nombre: s.nombre,
      categoria: s.categoria,
      manoObra: s.manoobra ?? s.manoObra ?? '',
      tiempoEstimado: s.tiempoestimado ?? s.tiempoEstimado ?? '',
      descripcion: s.descripcion || '',
      costo: s.costo || '',
      refacciones: s.refacciones || [],
    });
    setEditando(true);
    setShowModal(true);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar este servicio?')) return;
    try {
      await deleteServicio(id);
      await loadServiciosYProductos();
    } catch (err) {
      toast.error(err.message, 'Error al eliminar');
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setNuevo({
      id: null,
      nombre: '',
      categoria: '',
      manoObra: '',
      tiempoEstimado: '',
      descripcion: '',
      costo: '',
      refacciones: [],
    });
    setRefaccionSeleccionada('');
    setCantidadRefaccion(1);
  };

  // ── Compatibility Modal Handlers ────────────────────────────────────────────
  const abrirCompatModal = async (producto) => {
    setCompatProducto(producto);
    setLoadingCompat(true);
    setShowCompatModal(true);
    setCompatForm({ idMarcas: '', idModelos: '', cantidad: 1, precio_especial: '' });
    setModelos([]);
    try {
      const data = await fetchCompatibilidadProducto(producto.id);
      setCompatEntries(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompat(false);
    }
  };

  const handleCompatMarcaChange = async (idMarcas) => {
    setCompatForm(prev => ({ ...prev, idMarcas, idModelos: '' }));
    if (idMarcas) {
      try {
        const data = await fetchModelosByMarca(idMarcas);
        setModelos(data || []);
      } catch { setModelos([]); }
    } else {
      setModelos([]);
    }
  };

  const handleAddCompat = async () => {
    if (!compatProducto || !compatForm.idMarcas || !compatForm.idModelos) return;
    try {
      await addCompatibilidad(compatProducto.id, {
        idMarcas: compatForm.idMarcas,
        idModelos: compatForm.idModelos,
        cantidad: Number(compatForm.cantidad) || 1,
      });
      const data = await fetchCompatibilidadProducto(compatProducto.id);
      setCompatEntries(data || []);
      setCompatForm({ idMarcas: '', idModelos: '', cantidad: 1, precio_especial: '' });
      setModelos([]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCompat = async (id) => {
    try {
      await deleteCompatibilidad(id);
      setCompatEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Stats calculadas desde datos reales
  const totalActivos = servicios.length;
  const precioPromedio = servicios.length > 0
    ? Math.round(servicios.reduce((acc, s) => acc + (Number(s.costo) || 0), 0) / servicios.length)
    : 0;

  const getBadgeColor = () => 'bg-blue-100 text-blue-700';

  return (
    <AdminLayout activeTab="servicios">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Gestión de Servicios</h2>
            <p className="text-gray-500 text-sm">Administra el catálogo de servicios y precios</p>
          </div>
          <button
            type="button"
            onClick={() => { cerrarModal(); setShowModal(true); }}
            className="bg-[#1a56db] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Nuevo servicio
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-3xl font-medium text-blue-600">{totalActivos}</span>
            <span className="text-sm text-gray-500 mt-2">Servicios activos</span>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-3xl font-medium text-blue-600">${precioPromedio.toLocaleString()}</span>
            <span className="text-sm text-gray-500 mt-2">Costo promedio</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm mb-6 overflow-x-auto">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                categoriaActiva === cat
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content List */}
        {loadingServicios ? (
          <div className="text-center text-gray-500 py-12">Cargando servicios...</div>
        ) : serviciosFiltrados.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No hay servicios registrados.</div>
        ) : (
          <div className="space-y-4">
            {serviciosFiltrados.map(s => {
              const manoObra = Number(s.manoobra ?? s.manoObra ?? 0);
              const refacciones = Number(s.refaccionesestimadas ?? s.refaccionesEstimadas ?? 0);
              const costo = Number(s.costo) || 0;
              const tiempoEstimado = s.tiempoestimado ?? s.tiempoEstimado ?? '—';

              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative flex flex-col">
                  {/* Acciones */}
                  <div className="absolute right-6 top-6 flex gap-2">
                    <button onClick={() => prepararEdicion(s)} className="text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button onClick={() => handleEliminar(s.id)} className="text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  {/* Upper Section */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83M11.42 15.17l-1.42-1.42m1.42 1.42l-5.83-5.83A2.652 2.652 0 116.75 3l5.83 5.83m-1.42-1.42l1.42-1.42" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">{s.nombre}</h3>
                      {s.categoria && (
                        <div className="mt-1.5 inline-block">
                          <span className={`px-2.5 py-1 ${getBadgeColor(s.categoria)} rounded text-[11px] font-semibold tracking-wide`}>
                            {s.categoria}
                          </span>
                        </div>
                      )}
                      {s.descripcion && <p className="text-sm text-gray-500 mt-1">{s.descripcion}</p>}
                    </div>
                  </div>

                  {/* Grid details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-medium">Mano de obra</div>
                      <div className="text-gray-900 font-medium">${manoObra}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-medium">Refacciones est.</div>
                      <div className="text-gray-900 font-medium">${refacciones}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-medium">Costo total</div>
                      <div className="text-blue-600 font-bold">${costo}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-medium">Tiempo estimado</div>
                      <div className="text-gray-900 font-medium">{tiempoEstimado} h</div>
                    </div>
                  </div>

                  {/* Refacciones con botón de compatibilidad */}
                  {s.refacciones && s.refacciones.length > 0 && (
                    <div className="border-t border-gray-100 pt-4 mt-1">
                      <div className="text-xs text-gray-500 font-medium mb-2">Refacciones → Gestionar compatibilidad por modelo</div>
                      <div className="flex flex-wrap gap-2">
                        {s.refacciones.map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => abrirCompatModal({ id: r.id, nombre: r.nombre })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25" /></svg>
                            {r.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Compatibility Modal ───────────────────────────────────────────── */}
      {showCompatModal && compatProducto && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Compatibilidad por Vehículo</h2>
                <p className="text-sm text-gray-500 mt-0.5">Refacción: <span className="font-semibold text-blue-700">{compatProducto.nombre}</span></p>
              </div>
              <button onClick={() => setShowCompatModal(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Existing entries */}
              {loadingCompat ? (
                <p className="text-center text-gray-400 py-6">Cargando...</p>
              ) : compatEntries.length === 0 ? (
                <p className="text-center text-gray-400 py-6">Sin compatibilidades registradas. Agrega la primera abajo.</p>
              ) : (
                <div className="space-y-2">
                  {compatEntries.map(e => (
                    <div key={e.id} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-800">{e.marca_nombre}</span>
                        {e.modelo_nombre && <span className="text-gray-500"> · {e.modelo_nombre}</span>}
                        <span className="ml-3 text-gray-500">x{e.cantidad}</span>
                      </div>
                      <button onClick={() => handleDeleteCompat(e.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new compatibility */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                <h3 className="text-sm font-bold text-blue-900 mb-4">Agregar Compatibilidad</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Marca *</label>
                    <select value={compatForm.idMarcas} onChange={e => handleCompatMarcaChange(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">-- Selecciona marca --</option>
                      {marcas.map(m => {
                        const mId = m.idmarca ?? m.idMarcas ?? m.id;
                        return <option key={mId} value={mId}>{m.nombre}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Modelo *</label>
                    <select value={compatForm.idModelos} onChange={e => setCompatForm(prev => ({ ...prev, idModelos: e.target.value }))}
                      disabled={!compatForm.idMarcas || modelos.length === 0}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100">
                      <option value="">-- Selecciona modelo --</option>
                      {modelos.map(m => {
                        const mId = m.idmodelo ?? m.idModelos ?? m.id;
                        return <option key={mId} value={mId}>{m.nombre}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad usada</label>
                    <input type="number" min="1" value={compatForm.cantidad}
                      onChange={e => setCompatForm(prev => ({ ...prev, cantidad: e.target.value }))}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <button onClick={handleAddCompat} disabled={!compatForm.idMarcas || !compatForm.idModelos}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-8">

            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83M11.42 15.17l-1.42-1.42m1.42 1.42l-5.83-5.83A2.652 2.652 0 116.75 3l5.83 5.83m-1.42-1.42l1.42-1.42" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{editando ? 'Editar servicio' : 'Nuevo servicio'}</h2>
              </div>
              <button type="button" onClick={cerrarModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <form id="servicioForm" onSubmit={manejarEnvio} className="space-y-5">

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del servicio <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required
                    value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} placeholder="Cambio de aceite y filtro" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría</label>
                  <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={nuevo.categoria} onChange={e => setNuevo({...nuevo, categoria: e.target.value})} placeholder="Mantenimiento, Frenos, Afinación..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mano de obra (MXN)</label>
                    <input type="number" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={nuevo.manoObra} onChange={e => setNuevo({...nuevo, manoObra: e.target.value})} placeholder="450" min="0" />
                  </div>
                </div>

                <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-5 mt-4">
                  <h3 className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
                    Refacciones Asociadas (Opcional)
                  </h3>
                  
                  {nuevo.refacciones.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {nuevo.refacciones.map(r => (
                        <div key={r.id} className="flex justify-between items-center bg-white px-3 py-2 border border-gray-200 rounded-lg text-sm">
                          <div className="flex-1 truncate font-medium text-gray-800">{r.nombre}</div>
                          <div className="w-16 text-center text-gray-600">x{r.cantidad}</div>
                          <div className="w-24 text-right font-medium text-gray-900">${(Number(r.precio_unitario) * r.cantidad).toLocaleString()}</div>
                          <button type="button" onClick={() => eliminarRefaccion(r.id)} className="ml-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      <div className="text-right text-sm font-bold text-yellow-800 mt-2">
                        Total refacciones: ${totalRefacciones.toLocaleString()} MXN
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <select 
                        className="w-full px-4 py-2 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white"
                        value={refaccionSeleccionada}
                        onChange={e => setRefaccionSeleccionada(e.target.value)}
                      >
                        <option value="">-- Seleccionar refacción --</option>
                        {productos.map(p => {
                          const pId = p.idproductos || p.idProductos;
                          return (
                            <option key={pId} value={pId}>{p.nombre} (${p.precio_unitario})</option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="w-full sm:w-24">
                      <input 
                        type="number" 
                        min="1" 
                        className="w-full px-4 py-2 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={cantidadRefaccion}
                        onChange={e => setCantidadRefaccion(Number(e.target.value))}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={agregarRefaccion}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-bold text-sm whitespace-nowrap"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                  <div>    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiempo estimado (horas)</label>
                    <input type="number" step="0.5" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={nuevo.tiempoEstimado} onChange={e => setNuevo({...nuevo, tiempoEstimado: e.target.value})} placeholder="1.5" min="0" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción (opcional)</label>
                  <textarea className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows="3"
                    value={nuevo.descripcion} onChange={e => setNuevo({...nuevo, descripcion: e.target.value})} placeholder="Breve descripción del servicio..."></textarea>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-white">
              <div className="flex items-center gap-2 bg-blue-50/50 px-4 py-2 rounded-lg w-full sm:w-auto justify-between sm:justify-start border border-blue-50">
                <span className="text-sm font-semibold text-gray-700">Costo total</span>
                <span className="text-lg font-bold text-[#1a56db]">${costoTotalCalculado.toLocaleString()} MXN</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto min-w-max">
                <button type="button" onClick={cerrarModal} className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="servicioForm" className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-[#1a56db] hover:bg-blue-800 rounded-lg transition-colors">
                  {editando ? 'Guardar cambios' : 'Agregar servicio'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
}
