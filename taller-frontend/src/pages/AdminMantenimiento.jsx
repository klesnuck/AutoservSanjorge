import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useToast } from '../components/Toast';
import {
  fetchUsers,
  fetchVehiculos,
  fetchServicios,
  fetchProductos,
  fetchMantenimientos,
  createMantenimiento,
  updateMantenimientoEstado,
  fetchCitas,
  updateCita,
  fetchProductosCompatibles
} from '../utils/api';

export default function AdminMantenimiento() {
  const toast = useToast();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [citasPendientes, setCitasPendientes] = useState([]);
  const [selectedCitaId, setSelectedCitaId] = useState('');

  // Catálogos
  const [clientes, setClientes] = useState([]);
  const [vehiculosDb, setVehiculosDb] = useState([]);
  const [serviciosDb, setServiciosDb] = useState([]);
  const [productosDb, setProductosDb] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);

  const [showModal, setShowModal] = useState(false);
  
  // Estado del formulario
  const [nuevo, setNuevo] = useState({
    clienteCorreo: '',
    idVehiculos: '',
    kilometraje: '',
    tecnico: '',
    estado: 'En proceso',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: '',
  });

  const [trabajos, setTrabajos] = useState([]);
  const [nuevoTrabajoId, setNuevoTrabajoId] = useState('');
  
  const [refacciones, setRefacciones] = useState([]);
  const [nuevaRefaccion, setNuevaRefaccion] = useState({ id: '', cantidad: 1 });

  const loadData = async () => {
    try {
      const [uRes, vRes, sRes, pRes, mRes, cRes] = await Promise.all([
        fetchUsers(),
        fetchVehiculos(),
        fetchServicios(),
        fetchProductos(),
        fetchMantenimientos(),
        fetchCitas()
      ]);
      
      const allUsers = uRes || [];
      setClientes(allUsers.filter(u => u.role === 'Cliente'));
      setTecnicos(allUsers.filter(u => u.role === 'Técnico'));
      setVehiculosDb(vRes || []);
      setServiciosDb(sRes || []);
      setProductosDb(pRes || []);
      setMantenimientos(mRes || []);

      if (cRes) {
        const pendientes = cRes.filter(c => c.estado === 'Pendiente' || c.estado === 'Confirmada');
        const parsedCitas = pendientes.map(cita => {
          let extrCliente = cita.cliente || 'Cliente sin nombre';
          let extrEmail = cita.email || '';
          let extrVehiculo = cita.vehiculo || 'Vehículo no definido';
          let extrServicios = [];
          let extrNotas = '';

          if (cita.nota) {
             const parts = cita.nota.split(' | ');
             parts.forEach(p => {
               if (p.startsWith('Cliente:')) {
                 const cInfo = p.replace('Cliente:', '').split('-');
                 extrCliente = cInfo[0].trim();
                 if (cInfo[1] && cInfo[1].includes('@')) extrEmail = cInfo[1].trim();
               }
               if (p.startsWith('Vehículo:')) {
                 extrVehiculo = p.replace('Vehículo:', '').trim();
               }
               if (p.startsWith('Servicios:')) {
                 const srvStr = p.replace('Servicios:', '').trim();
                 if (srvStr && srvStr !== 'Servicio no definido') {
                    extrServicios = srvStr.split(',').map(s => s.trim());
                 }
               }
               if (p.startsWith('Notas:')) {
                 extrNotas = p.replace('Notas:', '').trim();
               }
             });
          }

          return {
            ...cita,
            parsedCliente: extrCliente,
            parsedEmail: extrEmail,
            parsedVehiculo: extrVehiculo,
            parsedServicios: extrServicios,
            parsedNotas: extrNotas
          };
        });
        setCitasPendientes(parsedCitas);
      }
    } catch (err) {
      console.error('Error loading mantenimiento data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const vehiculosCliente = vehiculosDb.filter(v => v.propietario_correo === nuevo.clienteCorreo);

  const handleServicioChange = (e) => {
    setNuevoTrabajoId(e.target.value);
  };

  const agregarTrabajo = () => {
    if (!nuevoTrabajoId) return;
    const srv = serviciosDb.find(s => s.id === Number(nuevoTrabajoId));
    if (srv) {
      // Evitar duplicados de servicio
      if (trabajos.find(t => t.id === srv.id)) {
        toast.warning('Este servicio ya fue agregado.');
        return;
      }

      setTrabajos([...trabajos, { 
        id: srv.id, 
        nombre: srv.nombre, 
        precio: srv.manoObra || srv.mano_obra || srv.manoobra || srv.costo || 0, 
        descripcion: srv.descripcion 
      }]);
      setNuevoTrabajoId('');

      // Auto-cargar refacciones asociadas al servicio
      if (srv.refacciones && Array.isArray(srv.refacciones)) {
        const refsActuales = [...refacciones];
        srv.refacciones.forEach(sr => {
          const existe = refsActuales.find(r => r.id === sr.id);
          if (existe) {
            existe.cantidad += sr.cantidad;
          } else {
            refsActuales.push({
              id: sr.id,
              nombre: sr.nombre,
              precio_unitario: sr.precio_unitario,
              cantidad: sr.cantidad
            });
          }
        });
        setRefacciones(refsActuales);
      }
    }
  };

  const handleCitaSelect = (citaId) => {
    setSelectedCitaId(citaId);
    if (!citaId) return;

    const cita = citasPendientes.find(c => String(c.id) === String(citaId));
    if (!cita) return;

    let clienteEmail = nuevo.clienteCorreo;
    
    // Try to match client by email or name
    if (cita.parsedEmail) {
      const match = clientes.find(c => c.email.toLowerCase() === cita.parsedEmail.toLowerCase());
      if (match) clienteEmail = match.email;
    } else {
      const match = clientes.find(c => c.name.toLowerCase() === cita.parsedCliente.toLowerCase());
      if (match) clienteEmail = match.email;
    }

    setNuevo(prev => ({
      ...prev,
      clienteCorreo: clienteEmail,
      observaciones: cita.parsedNotas ? `Notas de la cita: ${cita.parsedNotas}` : ''
    }));

    // Auto-load services
    if (cita.parsedServicios.length > 0) {
       const matchedServicios = serviciosDb.filter(s => cita.parsedServicios.some(ps => ps.toLowerCase() === s.nombre.toLowerCase()));
       if (matchedServicios.length > 0) {
            const nuevosTrabajos = matchedServicios.map(srv => ({ 
              id: srv.id, 
              nombre: srv.nombre, 
              precio: srv.manoObra || srv.mano_obra || srv.manoobra || srv.costo || 0, 
              descripcion: srv.descripcion 
            }));
           setTrabajos(nuevosTrabajos);
           
           let refsActuales = [];
           matchedServicios.forEach(srv => {
               if (srv.refacciones && Array.isArray(srv.refacciones)) {
                   srv.refacciones.forEach(sr => {
                      const existe = refsActuales.find(r => r.id === sr.id);
                      if (existe) existe.cantidad += sr.cantidad;
                      else refsActuales.push({ id: sr.id, nombre: sr.nombre, precio_unitario: sr.precio_unitario, cantidad: sr.cantidad });
                   });
               }
           });
           setRefacciones(refsActuales);
       }
    }
  };

  const eliminarTrabajo = (id) => {
    setTrabajos(trabajos.filter(t => t.id !== id));
  };

  const agregarRefaccion = () => {
    if (!nuevaRefaccion.id || nuevaRefaccion.cantidad < 1) return;
    const prod = productosDb.find(p => p.idproductos === Number(nuevaRefaccion.id));
    if (prod) {
      const existe = refacciones.find(r => r.id === prod.idproductos);
      if (existe) {
        setRefacciones(refacciones.map(r => r.id === prod.idproductos ? { ...r, cantidad: r.cantidad + nuevaRefaccion.cantidad } : r));
      } else {
        setRefacciones([...refacciones, { id: prod.idproductos, nombre: prod.nombre, precio_unitario: prod.precio_unitario, cantidad: nuevaRefaccion.cantidad }]);
      }
      setNuevaRefaccion({ id: '', cantidad: 1 });
    }
  };

  const eliminarRefaccion = (id) => {
    setRefacciones(refacciones.filter(r => r.id !== id));
  };

  const calcularTotal = () => {
    let totalAct = trabajos.reduce((acc, t) => acc + Number(t.precio), 0);
    totalAct += refacciones.reduce((acc, r) => acc + (Number(r.cantidad) * Number(r.precio_unitario)), 0);
    return totalAct;
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!nuevo.idVehiculos) {
      toast.warning('Selecciona un vehículo antes de continuar.');
      return;
    }

    try {
      const payload = {
        idVehiculos: nuevo.idVehiculos,
        tecnico: nuevo.tecnico,
        kilometraje: nuevo.kilometraje,
        estado: nuevo.estado,
        fecha: nuevo.fecha,
        observaciones: nuevo.observaciones,
        costo_final: calcularTotal(),
        servicios: trabajos.map(t => ({ id: t.id, precio: t.precio, descripcion: t.descripcion })),
        productos: refacciones.map(r => ({ id: r.id, cantidad: r.cantidad, precio: r.precio_unitario }))
      };

      await createMantenimiento(payload);

      // Si hay una cita vinculada, marcarla como Atendida
      if (selectedCitaId) {
        await updateCita(selectedCitaId, { estado: 'Atendida' });
      }

      await loadData();
      cerrarModal();
    } catch (err) {
      toast.error(err.message, 'Error al crear la orden');
    }
  };

  const toggleEstado = async (mId, actualEstado) => {
    const nuevoEstado = actualEstado === 'Completado' ? 'En proceso' : 'Completado';
    try {
      await updateMantenimientoEstado(mId, nuevoEstado);
      await loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setNuevo({ clienteCorreo: '', idVehiculos: '', kilometraje: '', tecnico: '', estado: 'En proceso', fecha: new Date().toISOString().split('T')[0], observaciones: '' });
    setTrabajos([]);
    setRefacciones([]);
    setNuevoTrabajoId('');
    setNuevaRefaccion({ id: '', cantidad: 1 });
    setSelectedCitaId('');
  };

  const totalCompletados = mantenimientos.filter(m => m.estado === 'Completado').length;
  const totalEnProceso = mantenimientos.filter(m => m.estado === 'En proceso').length;
  const ingresosTotales = mantenimientos.reduce((acc, m) => acc + Number(m.costo_final || 0), 0);

  return (
    <AdminLayout activeTab="mantenimiento">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Gestión de Mantenimiento</h2>
            <p className="text-gray-500 text-sm">Registra y administra el mantenimiento de vehículos</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="bg-[#1a56db] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Nuevo registro
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-3xl font-medium text-blue-600">{mantenimientos.length}</span>
            <span className="text-sm text-gray-500 mt-2">Servicios registrados</span>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-3xl font-medium text-green-600">{totalCompletados}</span>
            <span className="text-sm text-gray-500 mt-2">Completados</span>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-3xl font-medium text-orange-500">{totalEnProceso}</span>
            <span className="text-sm text-gray-500 mt-2">En proceso</span>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-3xl font-medium text-blue-600">${ingresosTotales.toLocaleString()}</span>
            <span className="text-sm text-gray-500 mt-2">Ingresos totales</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Cargando reportes de mantenimiento...</div>
        ) : (
          <div className="space-y-4">
            {mantenimientos.map(m => {
              const servicioBaseName = m.servicios && m.servicios.length > 0 ? m.servicios[0].nombre : 'Mantenimiento General';
              const partesArray = m.productos ? m.productos.map(p => `${p.nombre} x${p.cantidad}`) : [];
              
              return (
                <div key={m.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-left">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{servicioBaseName}</h3>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                          {m.vehiculo}
                          <span className="text-gray-300">•</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {new Date(m.fecha).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 mb-1">${Number(m.costo_final || 0).toLocaleString()}</div>
                      <button onClick={() => toggleEstado(m.id, m.estado)} className={`px-2.5 py-1 rounded text-xs font-semibold hover:opacity-80 transition ${m.estado === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {m.estado}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Información del vehículo</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><span className="font-medium">Propietario:</span> {m.cliente_nombre} ({m.cliente_email})</p>
                        <p><span className="font-medium">Kilometraje:</span> {m.kilometraje}</p>
                        <p><span className="font-medium">Técnico:</span> {m.tecnico}</p>
                      </div>

                      {partesArray.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Partes utilizadas</h4>
                          <div className="flex flex-wrap gap-2">
                            {partesArray.map((p, i) => (
                              <span key={i} className="inline-block bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs items-center justify-center">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Observaciones</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {m.observaciones || 'Sin observaciones.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col my-8 max-h-[90vh]">

            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Nueva Orden de Mantenimiento</h2>
                <p className="text-sm text-gray-500 mt-1">Registra todos los detalles del servicio</p>
              </div>
              <button type="button" onClick={cerrarModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-left space-y-6">
              <form id="mantenimientoForm" onSubmit={manejarEnvio}>

                {citasPendientes.length > 0 && (
                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-6 mb-6">
                    <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Vincular con Cita Pendiente
                    </h3>
                    <select className="w-full px-4 py-2.5 border border-purple-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                      value={selectedCitaId} onChange={(e) => handleCitaSelect(e.target.value)}>
                      <option value="">-- Opcional: Selecciona una cita para autocompletar --</option>
                      {citasPendientes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.parsedCliente} - {c.parsedVehiculo} (Fecha: {c.fecha || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-blue-50/30 border border-blue-50 rounded-xl p-6 mb-6">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Información del Cliente y Vehículo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo del Cliente *</label>
                      <select required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={nuevo.clienteCorreo} onChange={e => setNuevo({ ...nuevo, clienteCorreo: e.target.value, idVehiculos: '' })}>
                        <option value="">-- Selecciona un cliente --</option>
                        {clientes.map(c => <option key={c.email} value={c.email}>{c.name} ({c.email})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vehículo Asociado *</label>
                      <select required disabled={!nuevo.clienteCorreo} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        value={nuevo.idVehiculos}
                        onChange={async (e) => {
                          const vehiculoId = e.target.value;
                          setNuevo(prev => ({ ...prev, idVehiculos: vehiculoId }));

                          // Auto-load compatible parts for this vehicle's model
                          if (vehiculoId) {
                            const vehiculo = vehiculosDb.find(v => String(v.id) === String(vehiculoId));
                            if (vehiculo && vehiculo.idmodelos) {
                              try {
                                const compatibles = await fetchProductosCompatibles(vehiculo.idmodelos);
                                if (compatibles && compatibles.length > 0) {
                                  setRefacciones(compatibles.map(cp => ({
                                    id: cp.idproductos,
                                    nombre: cp.nombre,
                                    precio_unitario: Number(cp.precio_unitario),
                                    cantidad: cp.cantidad
                                  })));
                                }
                              } catch (err) {
                                console.error('Error cargando refacciones compatibles:', err);
                              }
                            }
                          }
                        }}>
                        <option value="">-- Selecciona el vehículo --</option>
                        {vehiculosCliente.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} • {v.placa}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kilometraje Actual *</label>
                    <input required type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={nuevo.kilometraje} onChange={e => setNuevo({ ...nuevo, kilometraje: e.target.value })} placeholder="Ej: 45,230 km" />
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-6 mb-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Detalles del Servicio
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha del Servicio *</label>
                      <input required type="date" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={nuevo.fecha} onChange={e => setNuevo({ ...nuevo, fecha: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Técnico Responsable *</label>
                      <select required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={nuevo.tecnico} onChange={e => setNuevo({ ...nuevo, tecnico: e.target.value })}>
                        <option value="">-- Selecciona un técnico --</option>
                        {tecnicos.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
                      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={nuevo.estado} onChange={e => setNuevo({ ...nuevo, estado: e.target.value })}>
                        <option value="En proceso">En proceso</option>
                        <option value="Completado">Completado</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50/50 border border-green-100 rounded-xl p-6 mb-6">
                  <h3 className="text-sm font-bold text-green-800 flex items-center gap-2 mb-4">
                    <span className="font-bold text-lg leading-none text-green-600">$</span>
                    Trabajos Realizados (Servicios)
                  </h3>

                  {trabajos.length > 0 && (
                    <div className="flex gap-2 mb-2 px-1 text-[10px] font-bold text-green-700 uppercase tracking-wider">
                      <div className="w-1/3 px-4">Servicio</div>
                      <div className="flex-1 px-4">Descripción</div>
                      <div className="w-32 px-4">Mano de obra</div>
                      <div className="w-10"></div>
                    </div>
                  )}

                  {trabajos.map(t => (
                    <div key={t.id} className="flex gap-2 mb-3 items-center">
                      <div className="w-1/3 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm truncate font-medium">{t.nombre}</div>
                      <div className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm truncate text-gray-500">{t.descripcion || '-'}</div>
                      <div className="w-32 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900">${t.precio}</div>
                      <button type="button" onClick={() => eliminarTrabajo(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                    <div className="flex-1 w-full">
                      <select className="w-full px-4 py-2.5 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white"
                        value={nuevoTrabajoId} onChange={handleServicioChange}>
                        <option value="">Seleccione un servicio del catálogo</option>
                        {serviciosDb.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nombre} (Mano de obra: ${s.manoObra || s.mano_obra || s.costo})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={agregarTrabajo} className="px-4 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-bold whitespace-nowrap">
                      Agregar Servicio
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-6 mb-6">
                  <h3 className="text-sm font-bold text-yellow-800 flex items-center gap-2 mb-4">
                    Partes y Refacciones Utilizadas
                  </h3>
                  <p className="text-xs text-yellow-700 mb-4 opacity-80">* Las refacciones ligadas a los servicios agregados se precargan automáticamente. Puedes añadir más si fue necesario.</p>

                  {refacciones.map(r => (
                    <div key={r.id} className="flex gap-2 mb-3 items-center">
                      <div className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm truncate">{r.nombre}</div>
                      <div className="w-20 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center">x{r.cantidad}</div>
                      <div className="w-32 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-right">${(Number(r.precio_unitario) * r.cantidad).toLocaleString()}</div>
                      <button type="button" onClick={() => eliminarRefaccion(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                    <div className="flex-1 w-full">
                      <select className="w-full px-4 py-2.5 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white"
                        value={nuevaRefaccion.id} onChange={e => setNuevaRefaccion({ ...nuevaRefaccion, id: e.target.value })}>
                        <option value="">Seleccione una refacción del inventario</option>
                        {productosDb.map(p => <option key={p.idproductos} value={p.idproductos}>{p.nombre} (${p.precio_unitario} - Stock: {p.stock_actual})</option>)}
                      </select>
                    </div>
                    <div className="w-full md:w-20">
                      <input type="number" min="1" className="w-full px-4 py-2.5 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={nuevaRefaccion.cantidad} onChange={e => setNuevaRefaccion({ ...nuevaRefaccion, cantidad: Number(e.target.value) })} placeholder="Cant." />
                    </div>
                    <button type="button" onClick={agregarRefaccion} className="px-4 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-bold whitespace-nowrap">
                      Añadir Parte
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones y Notas</label>
                  <textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows="4"
                    value={nuevo.observaciones} onChange={e => setNuevo({ ...nuevo, observaciones: e.target.value })} placeholder="Escribe cualquier observación importante sobre el trabajo realizado..."></textarea>
                </div>

                <div className="bg-[#1a56db] rounded-xl p-6 text-white flex justify-between items-center mb-6">
                  <div>
                    <div className="text-sm text-blue-200 mb-1">Total del Servicio</div>
                    <div className="text-3xl font-bold">${calcularTotal().toLocaleString()} MXN</div>
                  </div>
                  <div>
                    <svg className="w-12 h-12 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
              <button type="button" onClick={cerrarModal} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" form="mantenimientoForm" className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!nuevo.idVehiculos || trabajos.length === 0}>
                Crear Orden
              </button>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
}
