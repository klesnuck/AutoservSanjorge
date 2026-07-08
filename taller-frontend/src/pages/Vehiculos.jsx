import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useToast } from '../components/Toast';
import { 
  fetchVehiculos, createVehiculo, updateVehiculo, deleteVehiculo,
  fetchMarcas, fetchModelosByMarca, fetchAnios, fetchMotores, fetchUsers
} from '../utils/api';

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  
  // Catálogos
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anios, setAnios] = useState([]);
  const [motores, setMotores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [nuevo, setNuevo] = useState({
    id: null,
    idMarcas: '',
    idModelos: '',
    idAnio: '',
    idMotores: '',
    idUsuarios: '',
    placa: '',
    vin: '',
    color: '',
    kilometraje: '',
  });

  const [editando, setEditando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    try {
      const [v, m, a, mot, u] = await Promise.all([
        fetchVehiculos(),
        fetchMarcas(),
        fetchAnios(),
        fetchMotores(),
        fetchUsers()
      ]);
      setVehiculos(v || []);
      setMarcas(m || []);
      setAnios(a || []);
      setMotores(mot || []);
      setUsuarios(u || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (nuevo.idMarcas) {
      fetchModelosByMarca(nuevo.idMarcas).then(setModelos).catch(() => setModelos([]));
    } else {
      setModelos([]);
    }
  }, [nuevo.idMarcas]);

  const vehiculosFiltrados = (vehiculos || []).filter(v => {
    const terminoBusqueda = busqueda.toLowerCase();
    return (
      (v.marca || '').toLowerCase().includes(terminoBusqueda) ||
      (v.modelo || '').toLowerCase().includes(terminoBusqueda) ||
      (v.placa || '').toLowerCase().includes(terminoBusqueda) ||
      (v.propietario_nombre || '').toLowerCase().includes(terminoBusqueda)
    );
  });

  const manejarEnvio = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        idMarcas: Number(nuevo.idMarcas),
        idModelos: Number(nuevo.idModelos),
        idAnio: Number(nuevo.idAnio),
        idMotores: Number(nuevo.idMotores),
        idUsuarios: Number(nuevo.idUsuarios),
        placa: nuevo.placa,
        vin: nuevo.vin,
        color: nuevo.color,
        km: Number(nuevo.kilometraje) || 0,
      };

      if (editando) {
        await updateVehiculo(nuevo.id, payload);
      } else {
        await createVehiculo(payload);
      }
      await loadData();
      cerrarModal();
    } catch (err) {
      toast.error(err.message, 'Error al guardar');
    }
  };

  const prepararEdicion = (v) => {
    setNuevo({
      id: v.id,
      idMarcas: v.idmarcas || '',
      idModelos: v.idmodelos || '',
      idAnio: v.idanio || '',
      idMotores: v.idmotores || '',
      idUsuarios: v.idusuarios || '',
      placa: v.placa || '',
      vin: v.vin || '',
      color: v.color || '',
      kilometraje: v.kilometraje || '',
    });
    setEditando(true);
    setShowModal(true);
  };

  const eliminarVehiculo = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return;
    try {
      await deleteVehiculo(id);
      await loadData();
    } catch (err) {
      toast.error(err.message, 'Error al eliminar');
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setNuevo({
      id: null, idMarcas: '', idModelos: '', idAnio: '', idMotores: '', idUsuarios: '',
      placa: '', vin: '', color: '', kilometraje: ''
    });
  };

  return (
    <AdminLayout activeTab="vehiculos">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 text-left">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Gestión de Vehículos</h2>
            <p className="text-gray-500 text-sm">Administra los vehículos y sus propietarios</p>
          </div>
          <button 
            type="button" 
            onClick={() => { cerrarModal(); setShowModal(true); }} 
            className="bg-[#1a56db] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Registrar vehiculo
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 shadow-sm"
            placeholder="Buscar por marca, modelo, placa o propietario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Vehicle Cards Grid */}
        {loading ? (
          <p className="text-center text-gray-500">Cargando vehículos...</p>
        ) : vehiculosFiltrados.length === 0 ? (
          <p className="text-center text-gray-500">No hay vehículos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {vehiculosFiltrados.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* Card Header (Blue) */}
                <div className="bg-[#1a56db] p-5 text-white relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677h3.351a.75.75 0 01.696.471z" />
                      </svg>
                    </div>
                    <div className="flex gap-2 text-white/80">
                      <button onClick={() => prepararEdicion(v)} className="hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => eliminarVehiculo(v.id)} className="hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">{v.marca} {v.modelo}</h3>
                  <p className="text-blue-100 text-sm mt-1">{v.año}</p>
                </div>

                {/* Card Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-50/50">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Placa</span>
                      <span className="font-medium text-gray-900 text-sm">{v.placa}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-50/50">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">VIN</span>
                      <span className="font-medium text-gray-900 text-[11px] truncate max-w-[150px]">{v.vin}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-50/50">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Color</span>
                      <span className="font-medium text-gray-900 text-sm">{v.color}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-50/50">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Kilometraje</span>
                      <span className="font-medium text-gray-900 text-sm">{v.kilometraje} km</span>
                    </div>
                  </div>
                  
                  {/* Owner info */}
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{v.propietario_nombre}</span>
                      <span className="text-xs text-gray-500">{v.propietario_correo}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 flex gap-3">
                    <button onClick={() => prepararEdicion(v)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-8 text-left">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677h3.351a.75.75 0 01.696.471z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{editando ? 'Editar vehículo' : 'Registrar nuevo vehículo'}</h2>
              </div>
              <button type="button" onClick={cerrarModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <form id="vehiculoForm" onSubmit={manejarEnvio} className="space-y-6">
                
                {/* Propietario section */}
                <div>
                  <h3 className="text-md font-bold text-gray-900 mb-4">Propietario</h3>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Seleccionar Cliente <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium" 
                    required
                    value={nuevo.idUsuarios} 
                    onChange={e => setNuevo({...nuevo, idUsuarios: e.target.value})}
                  >
                    <option value="">Seleccionar cliente</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                <hr className="border-gray-100" />

                {/* Información del vehículo section */}
                <div>
                  <h3 className="text-md font-bold text-gray-900 mb-4">Información del vehículo</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Marca <span className="text-red-500">*</span></label>
                      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium" required
                        value={nuevo.idMarcas} onChange={e => setNuevo({...nuevo, idMarcas: e.target.value})}>
                        <option value="">Seleccionar marca</option>
                        {marcas.map(m => {
                          const mId = m.idmarca || m.idMarcas || m.idmarcas || m.id;
                          return <option key={mId} value={mId}>{m.nombre}</option>
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Modelo <span className="text-red-500">*</span></label>
                      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium" required
                        value={nuevo.idModelos} onChange={e => setNuevo({...nuevo, idModelos: e.target.value})} disabled={!nuevo.idMarcas}>
                        <option value="">Seleccionar modelo</option>
                        {modelos.map(m => {
                          const mId = m.idmodelo ?? m.idModelos ?? m.id;
                          return <option key={mId} value={mId}>{m.nombre}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Año <span className="text-red-500">*</span></label>
                      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium" required
                        value={nuevo.idAnio} onChange={e => setNuevo({...nuevo, idAnio: e.target.value})}>
                        <option value="">Seleccionar año</option>
                        {anios.map(a => {
                          const aId = a.idanio ?? a.idAnio ?? a.id;
                          const aLabel = a.anio ?? a.nombre ?? aId;
                          return <option key={aId} value={aId}>{aLabel}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Placa <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required
                        value={nuevo.placa} onChange={e => setNuevo({...nuevo, placa: e.target.value})} placeholder="ABC-123-XYZ" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">VIN (Número de serie) <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required
                        value={nuevo.vin} onChange={e => setNuevo({...nuevo, vin: e.target.value})} placeholder="1HGBH41JXMN109186" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Color <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required
                        value={nuevo.color} onChange={e => setNuevo({...nuevo, color: e.target.value})} placeholder="Blanco, Negro, Gris..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Motor <span className="text-red-500">*</span></label>
                      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium" required
                        value={nuevo.idMotores} onChange={e => setNuevo({...nuevo, idMotores: e.target.value})}>
                        <option value="">Seleccionar motor</option>
                        {motores.map(m => {
                          const mId = m.idmotor ?? m.idMotores ?? m.id;
                          return <option key={mId} value={mId}>{m.nombre}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kilometraje actual <span className="text-red-500">*</span></label>
                      <input type="number" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required
                        value={nuevo.kilometraje} onChange={e => setNuevo({...nuevo, kilometraje: e.target.value})} placeholder="45230" />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
              <button type="button" onClick={cerrarModal} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="vehiculoForm" className="px-6 py-2.5 text-sm font-bold text-white bg-[#1a56db] hover:bg-blue-800 rounded-lg transition-colors">
                {editando ? 'Guardar cambios' : 'Registrar vehículo'}
              </button>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
}
