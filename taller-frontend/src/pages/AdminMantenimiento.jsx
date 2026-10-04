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
  updateMantenimiento,
  updateMantenimientoEstado,
  fetchCitas,
  updateCita,
  fetchProductosCompatibles
} from '../utils/api';

const DEFAULT_CHECKLIST = [
  { id: 'aceite', item: 'Nivel y calidad de aceite de motor', estado: 'Pendiente', nota: '' },
  { id: 'frenos', item: 'Estado de balatas y discos de freno', estado: 'Pendiente', nota: '' },
  { id: 'llantas', item: 'Presión y desgaste de neumáticos', estado: 'Pendiente', nota: '' },
  { id: 'bateria', item: 'Voltaje y limpieza de bornes de batería', estado: 'Pendiente', nota: '' },
  { id: 'refrigerante', item: 'Nivel de anticongelante y fuga de mangueras', estado: 'Pendiente', nota: '' },
  { id: 'filtros', item: 'Filtro de aire y filtro de cabina', estado: 'Pendiente', nota: '' },
  { id: 'luces', item: 'Sistema de luces (Altas, Bajas, Intermitentes, Stop)', estado: 'Pendiente', nota: '' },
  { id: 'suspension', item: 'Amortiguadores y bujes de suspensión', estado: 'Pendiente', nota: '' },
];

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
  
  // Estado del formulario de alta
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

  // ---------------------------------------------------------------------------
  // Estado para Hoja de Requisitos e Inspección en Tiempo Real
  // ---------------------------------------------------------------------------
  const [showHojaModal, setShowHojaModal] = useState(false);
  const [mantActivo, setMantActivo] = useState(null);
  const [checklistHoja, setChecklistHoja] = useState([]);
  const [trabajosHoja, setTrabajosHoja] = useState([]);
  const [refaccionesHoja, setRefaccionesHoja] = useState([]);
  const [nuevoItemChecklist, setNuevoItemChecklist] = useState('');
  const [observacionesHoja, setObservacionesHoja] = useState('');
  const [estadoHoja, setEstadoHoja] = useState('En proceso');
  const [guardandoHoja, setGuardandoHoja] = useState(false);

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
    totalAct += refacciones.reduce((acc, r) => acc + (Number(r.cantidad) * Number(r.precio_unitario || r.precio || 0)), 0);
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
        checklist: DEFAULT_CHECKLIST,
        servicios: trabajos.map(t => ({ id: t.id, precio: t.precio, descripcion: t.descripcion })),
        productos: refacciones.map(r => ({ id: r.id, cantidad: r.cantidad, precio: r.precio_unitario || r.precio }))
      };

      await createMantenimiento(payload);

      if (selectedCitaId) {
        await updateCita(selectedCitaId, { estado: 'Atendida' });
      }

      await loadData();
      cerrarModal();
      toast.success('Orden de mantenimiento registrada correctamente');
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

  // ---------------------------------------------------------------------------
  // Lógica de Hoja de Trabajo e Inspección en Tiempo Real
  // ---------------------------------------------------------------------------
  const abrirHojaTrabajo = (mant) => {
    setMantActivo(mant);
    const initialChecklist = mant.checklist && mant.checklist.length > 0 ? mant.checklist : DEFAULT_CHECKLIST;
    setChecklistHoja(initialChecklist);
    setTrabajosHoja(mant.servicios ? mant.servicios.map(s => ({ ...s, precio: s.precio })) : []);
    setRefaccionesHoja(mant.productos ? mant.productos.map(p => ({ ...p, precio_unitario: p.precio })) : []);
    setObservacionesHoja(mant.observaciones || '');
    setEstadoHoja(mant.estado || 'En proceso');
    setShowHojaModal(true);
  };

  const cerrarHojaTrabajo = () => {
    setShowHojaModal(false);
    setMantActivo(null);
    setChecklistHoja([]);
    setTrabajosHoja([]);
    setRefaccionesHoja([]);
    setObservacionesHoja('');
    setNuevoItemChecklist('');
  };

  const updateChecklistItem = (id, field, value) => {
    setChecklistHoja(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const agregarItemChecklistPersonalizado = () => {
    if (!nuevoItemChecklist.trim()) return;
    const newItem = {
      id: `custom_${Date.now()}`,
      item: nuevoItemChecklist.trim(),
      estado: 'Pendiente',
      nota: ''
    };
    setChecklistHoja(prev => [...prev, newItem]);
    setNuevoItemChecklist('');
    toast.info('Punto de revisión agregado');
  };

  const agregarServicioAHoja = (srvId) => {
    if (!srvId) return;
    const srv = serviciosDb.find(s => s.id === Number(srvId));
    if (srv) {
      if (trabajosHoja.some(t => t.id === srv.id)) {
        toast.warning('Servicio ya incluido en la orden');
        return;
      }
      setTrabajosHoja(prev => [...prev, {
        id: srv.id,
        nombre: srv.nombre,
        precio: srv.manoObra || srv.mano_obra || srv.costo || 0,
        descripcion: srv.descripcion
      }]);
    }
  };

  const agregarRefaccionAHoja = (prodId, cantidad) => {
    if (!prodId || cantidad < 1) return;
    const prod = productosDb.find(p => p.idproductos === Number(prodId));
    if (prod) {
      setRefaccionesHoja(prev => {
        const existe = prev.find(r => r.id === prod.idproductos);
        if (existe) {
          return prev.map(r => r.id === prod.idproductos ? { ...r, cantidad: r.cantidad + cantidad } : r);
        }
        return [...prev, {
          id: prod.idproductos,
          nombre: prod.nombre,
          precio_unitario: Number(prod.precio_unitario || prod.precio || 0),
          cantidad
        }];
      });
    }
  };

  const calcularTotalHoja = () => {
    let total = trabajosHoja.reduce((acc, t) => acc + Number(t.precio || 0), 0);
    total += refaccionesHoja.reduce((acc, r) => acc + (Number(r.cantidad || 1) * Number(r.precio_unitario || r.precio || 0)), 0);
    return total;
  };

  const guardarHojaTrabajo = async (nuevoEstado = null) => {
    if (!mantActivo) return;
    setGuardandoHoja(true);
    try {
      const estadoFinal = nuevoEstado || estadoHoja;
      const payload = {
        tecnico: mantActivo.tecnico,
        kilometraje: mantActivo.kilometraje,
        estado: estadoFinal,
        observaciones: observacionesHoja,
        costo_final: calcularTotalHoja(),
        checklist: checklistHoja,
        servicios: trabajosHoja.map(t => ({ id: t.id, precio: t.precio, descripcion: t.descripcion })),
        productos: refaccionesHoja.map(r => ({ id: r.id, cantidad: r.cantidad, precio: r.precio_unitario }))
      };

      await updateMantenimiento(mantActivo.id, payload);
      await loadData();
      toast.success(nuevoEstado === 'Completado' ? '¡Mantenimiento completado exitosamente!' : 'Hoja de trabajo guardada en tiempo real');
      if (nuevoEstado === 'Completado') {
        cerrarHojaTrabajo();
      }
    } catch (err) {
      toast.error(err.message, 'Error al guardar hoja de trabajo');
    } finally {
      setGuardandoHoja(false);
    }
  };

  const [filtroEstado, setFiltroEstado] = useState('Todos');

  const totalPendientes = mantenimientos.filter(m => m.estado === 'Pendiente de Aprobación').length;
  const totalCompletados = mantenimientos.filter(m => m.estado === 'Completado').length;
  const totalEnProceso = mantenimientos.filter(m => m.estado === 'En proceso').length;
  const ingresosTotales = mantenimientos.reduce((acc, m) => acc + Number(m.costo_final || 0), 0);

  const mantenimientosFiltrados = mantenimientos.filter(m => {
    if (filtroEstado === 'Todos') return true;
    return m.estado === filtroEstado;
  });

  const aprobarOrdenServicio = async (mId, nuevoEstado = 'En proceso') => {
    try {
      await updateMantenimientoEstado(mId, nuevoEstado);
      await loadData();
      toast.success(nuevoEstado === 'Completado' ? 'Orden de Servicio aprobada y completada' : 'Orden de Servicio aprobada y puesta en proceso');
    } catch (err) {
      toast.error(err.message, 'Error al aprobar Orden de Servicio');
    }
  };

  return (
    <AdminLayout activeTab="mantenimiento">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Centro de Mantenimiento & Inspección</h2>
            <p className="text-gray-500 text-sm">Gestiona la hoja de requisitos en tiempo real y aprueba órdenes de servicio enviadas por técnicos</p>
          </div>
        </div>

        {/* Muestras de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition">
            <span className="text-3xl font-extrabold text-blue-600">{mantenimientos.length}</span>
            <span className="text-sm font-medium text-gray-500 block mt-1">Servicios Registrados</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition">
            <span className="text-3xl font-extrabold text-amber-600">{totalPendientes}</span>
            <span className="text-sm font-medium text-gray-500 block mt-1">Órdenes por Aprobar</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition">
            <span className="text-3xl font-extrabold text-indigo-600">{totalEnProceso}</span>
            <span className="text-sm font-medium text-gray-500 block mt-1">En Proceso (Live)</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition">
            <span className="text-3xl font-extrabold text-emerald-600">{totalCompletados}</span>
            <span className="text-sm font-medium text-gray-500 block mt-1">Completados</span>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-sm mb-6 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-gray-500 uppercase px-3">Filtrar por:</span>
          {['Todos', 'Pendiente de Aprobación', 'En proceso', 'Completado'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltroEstado(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                filtroEstado === st
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'Pendiente de Aprobación' ? `📝 Órdenes por Aprobar (${totalPendientes})` : st}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 font-medium">Cargando mantenimientos e inspecciones...</div>
        ) : (
          <div className="space-y-4">
            {mantenimientosFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200/80 text-gray-400 font-medium">
                No hay mantenimientos ni órdenes de servicio con el filtro seleccionado.
              </div>
            ) : (
              mantenimientosFiltrados.map(m => {
                const servicioBaseName = m.servicios && m.servicios.length > 0 ? m.servicios[0].nombre : 'Mantenimiento General';
                const partesArray = m.productos ? m.productos.map(p => `${p.nombre} x${p.cantidad}`) : [];
                const totalItemsChecklist = m.checklist ? m.checklist.length : 8;
                const itemsListos = m.checklist ? m.checklist.filter(c => c.estado === 'OK' || c.estado === 'Cambiado').length : 0;
                const porcentajeProgreso = Math.round((itemsListos / totalItemsChecklist) * 100);
                const esPendienteRemision = m.estado === 'Pendiente de Aprobación';

                return (
                  <div key={m.id} className={`bg-white rounded-2xl border transition overflow-hidden text-left ${esPendienteRemision ? 'border-amber-300 shadow-amber-100/50 shadow-md ring-1 ring-amber-300' : 'border-gray-200/80 shadow-sm hover:shadow-md'}`}>
                    
                    {esPendienteRemision && (
                      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex justify-between items-center text-xs text-amber-900 font-semibold">
                        <span className="flex items-center gap-2">
                          <span className="text-base">📝</span>
                          <span>Orden de Servicio enviada por el Técnico <strong>{m.tecnico}</strong></span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => aprobarOrdenServicio(m.id, 'En proceso')}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            ✓ Aprobar Orden
                          </button>
                          <button
                            type="button"
                            onClick={() => aprobarOrdenServicio(m.id, 'Completado')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            ✓ Aprobar & Completar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 font-bold">
                          🚗
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">{servicioBaseName}</h3>
                            <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                              m.estado === 'Completado'
                                ? 'bg-emerald-100 text-emerald-700'
                                : m.estado === 'Pendiente de Aprobación'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {m.estado}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 flex flex-wrap items-center gap-3 mt-1">
                            <span className="font-semibold text-gray-700">{m.vehiculo}</span>
                            <span>•</span>
                            <span>Técnico: <strong className="text-gray-800">{m.tecnico || 'Sin asignar'}</strong></span>
                            <span>•</span>
                            <span>{new Date(m.fecha).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <button
                          type="button"
                          onClick={() => abrirHojaTrabajo(m)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm"
                        >
                          <span>📋 Hoja de Requisitos (Tiempo Real)</span>
                          <span className="bg-indigo-800/60 px-2 py-0.5 rounded-lg text-[10px] font-mono">{porcentajeProgreso}%</span>
                        </button>

                        <div className="text-right">
                          <div className="text-xl font-black text-gray-900">${Number(m.costo_final || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                  <div className="p-6 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vehículo & Propietario</h4>
                      <p className="text-sm text-gray-700 font-medium">{m.cliente_nombre}</p>
                      <p className="text-xs text-gray-500">{m.cliente_email}</p>
                      <p className="text-xs text-gray-600 mt-1">Km: <strong className="text-gray-800">{m.kilometraje}</strong></p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Partes & Servicios</h4>
                      {partesArray.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {partesArray.map((p, i) => (
                            <span key={i} className="bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-medium px-2 py-0.5 rounded-md">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Sin refacciones cargadas</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Progreso de Inspección</h4>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${porcentajeProgreso}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 text-right">{itemsListos} de {totalItemsChecklist} requisitos verificados</p>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* MODAL: HOJA DE REQUISITOS E INSPECCIÓN EN TIEMPO REAL                       */}
      {/* --------------------------------------------------------------------------- */}
      {showHojaModal && mantActivo && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 animate-fadeIn">
            
            {/* Header Modal */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                  📋
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Hoja de Requisitos & Inspección en Tiempo Real</h3>
                  <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                    <span>Vehículo: <strong>{mantActivo.vehiculo}</strong></span>
                    <span>•</span>
                    <span>Técnico: <strong>{mantActivo.tecnico}</strong></span>
                  </p>
                </div>
              </div>
              
              <button onClick={cerrarHojaTrabajo} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Barra de estado y progreso */}
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-900 uppercase">Estado del Mantenimiento:</span>
                <select
                  value={estadoHoja}
                  onChange={(e) => setEstadoHoja(e.target.value)}
                  className="px-3 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Pendiente de Aprobación">Pendiente de Aprobación</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Completado">Completado</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-900">Total Actualizado: </span>
                  <span className="text-lg font-black text-indigo-700">${calcularTotalHoja().toLocaleString()} MXN</span>
                </div>
              </div>
            </div>

            {/* Body scrollable */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">

              {/* SECCIÓN 1: Checklist Precargado & Dinámico */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-indigo-600">✓</span> Lista de Verificación y Requisitos del Vehículo
                    </h4>
                    <p className="text-xs text-slate-500">Precargado automáticamente. El técnico puede evaluar cada punto en tiempo real.</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    {checklistHoja.filter(c => c.estado === 'OK' || c.estado === 'Cambiado').length} / {checklistHoja.length} Listos
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {checklistHoja.map((chk) => (
                    <div key={chk.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-100/60 transition">
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-800 block">{chk.item}</span>
                        <input
                          type="text"
                          placeholder="Añadir nota u observación del componente..."
                          value={chk.nota || ''}
                          onChange={(e) => updateChecklistItem(chk.id, 'nota', e.target.value)}
                          className="w-full mt-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Botones de estado rápido */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(chk.id, 'estado', 'OK')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${chk.estado === 'OK' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50'}`}
                        >
                          🟢 OK
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(chk.id, 'estado', 'Atención')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${chk.estado === 'Atención' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50'}`}
                        >
                          🟡 Atención
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(chk.id, 'estado', 'Cambiado')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${chk.estado === 'Cambiado' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50'}`}
                        >
                          🔵 Cambiado
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Añadir nuevo requisito dinámico */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="+ Agregar nuevo punto de revisión o requisito encontrado en el momento..."
                    value={nuevoItemChecklist}
                    onChange={(e) => setNuevoItemChecklist(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarItemChecklistPersonalizado())}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={agregarItemChecklistPersonalizado}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition whitespace-nowrap"
                  >
                    + Agregar Requisito
                  </button>
                </div>
              </div>

              {/* SECCIÓN 2: Servicios / Mano de obra extra en vivo */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                  <span>🛠️</span> Servicios y Mano de Obra (Tiempo Real)
                </h4>

                <div className="space-y-2 mb-3">
                  {trabajosHoja.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-emerald-200/60 rounded-xl text-xs">
                      <div>
                        <strong className="text-slate-800">{t.nombre}</strong>
                        {t.descripcion && <span className="text-slate-500 block text-[11px]">{t.descripcion}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-800">${t.precio} MXN</span>
                        <button
                          type="button"
                          onClick={() => setTrabajosHoja(trabajosHoja.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      agregarServicioAHoja(e.target.value);
                      e.target.value = '';
                    }}
                    className="flex-1 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">+ Añadir servicio adicional del catálogo...</option>
                    {serviciosDb.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre} (${s.manoObra || s.mano_obra || s.costo} MXN)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECCIÓN 3: Refacciones / Repuestos extra en vivo */}
              <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                  <span>🔩</span> Refacciones y Repuestos Utilizados (Tiempo Real)
                </h4>

                <div className="space-y-2 mb-3">
                  {refaccionesHoja.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-amber-200/60 rounded-xl text-xs">
                      <div>
                        <strong className="text-slate-800">{r.nombre}</strong>
                        <span className="text-slate-500 block text-[11px]">Cantidad: x{r.cantidad}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-amber-800">${(Number(r.precio_unitario || r.precio || 0) * r.cantidad).toLocaleString()} MXN</span>
                        <button
                          type="button"
                          onClick={() => setRefaccionesHoja(refaccionesHoja.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <select
                    id="selectRefaccionHoja"
                    className="flex-1 px-4 py-2 bg-white border border-amber-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">+ Seleccionar refacción del inventario...</option>
                    {productosDb.map(p => (
                      <option key={p.idproductos} value={p.idproductos}>{p.nombre} (${p.precio_unitario} - Stock: {p.stock_actual})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const sel = document.getElementById('selectRefaccionHoja');
                      if (sel && sel.value) {
                        agregarRefaccionAHoja(sel.value, 1);
                        sel.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    + Añadir Parte
                  </button>
                </div>
              </div>

              {/* SECCIÓN 4: Observaciones Generales del Técnico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Observaciones Finales del Técnico
                </label>
                <textarea
                  rows="3"
                  value={observacionesHoja}
                  onChange={(e) => setObservacionesHoja(e.target.value)}
                  placeholder="Detalles sobre pruebas de ruta, fallas encontradas o recomendaciones para el cliente..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={cerrarHojaTrabajo}
                className="w-full md:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  disabled={guardandoHoja}
                  onClick={() => guardarHojaTrabajo('En proceso')}
                  className="flex-1 md:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  💾 Guardar Avance (Tiempo Real)
                </button>

                <button
                  type="button"
                  disabled={guardandoHoja}
                  onClick={() => guardarHojaTrabajo('Completado')}
                  className="flex-1 md:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  ✅ Completar Mantenimiento
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL ORIGINAL NUEVO REGISTRO */}
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
                    Trabajos Realizados (Servicios)
                  </h3>

                  {trabajos.map(t => (
                    <div key={t.id} className="flex gap-2 mb-3 items-center">
                      <div className="w-1/3 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm truncate font-medium">{t.nombre}</div>
                      <div className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm truncate text-gray-500">{t.descripcion || '-'}</div>
                      <div className="w-32 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900">${t.precio}</div>
                      <button type="button" onClick={() => eliminarTrabajo(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        ✕
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

                  {refacciones.map(r => (
                    <div key={r.id} className="flex gap-2 mb-3 items-center">
                      <div className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm truncate">{r.nombre}</div>
                      <div className="w-20 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center">x{r.cantidad}</div>
                      <div className="w-32 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-right">${(Number(r.precio_unitario || r.precio || 0) * r.cantidad).toLocaleString()}</div>
                      <button type="button" onClick={() => eliminarRefaccion(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        ✕
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
