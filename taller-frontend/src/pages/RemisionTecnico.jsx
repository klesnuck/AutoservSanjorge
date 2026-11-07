import React, { useState, useEffect, useContext } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useToast } from '../components/Toast';
import { AuthContext } from '../context/AuthContext';
import {
  fetchUsers,
  fetchVehiculos,
  fetchServicios,
  fetchProductos,
  fetchCitas,
  createMantenimiento,
  updateCita
} from '../utils/api';

export default function RemisionTecnico() {
  const toast = useToast();
  const { currentUser } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Catálogos y datos
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [vehiculosDb, setVehiculosDb] = useState([]);
  const [serviciosDb, setServiciosDb] = useState([]);
  const [productosDb, setProductosDb] = useState([]);
  const [citasPendientes, setCitasPendientes] = useState([]);

  // Cita seleccionada para precargar datos
  const [selectedCitaId, setSelectedCitaId] = useState('');

  // Datos principales de la remisión
  const [clienteCorreo, setClienteCorreo] = useState('');
  const [idVehiculo, setIdVehiculo] = useState('');
  const [tecnicoNombre, setTecnicoNombre] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  // Pestañas auxiliares para alternar entre catálogo y personalizado
  const [modoServicio, setModoServicio] = useState('catalogo'); // 'catalogo' | 'custom'
  const [modoRefaccion, setModoRefaccion] = useState('inventario'); // 'inventario' | 'custom'

  // Listas dinámicas de trabajos y refacciones
  const [trabajos, setTrabajos] = useState([]);
  const [refacciones, setRefacciones] = useState([]);

  // Inputs para agregar nuevos ítems sobre la marcha
  const [selectedServicioId, setSelectedServicioId] = useState('');
  const [servicioCustom, setServicioCustom] = useState({ nombre: '', precio: '' });
  
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [cantProducto, setCantProducto] = useState(1);
  const [productoCustom, setProductoCustom] = useState({ nombre: '', precio: '', cantidad: 1 });

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, vRes, sRes, pRes, cRes] = await Promise.all([
        fetchUsers(),
        fetchVehiculos(),
        fetchServicios(),
        fetchProductos(),
        fetchCitas()
      ]);

      const allUsers = uRes || [];
      const clientesList = allUsers.filter(u => u.role === 'Cliente');
      const tecnicosList = allUsers.filter(u => u.role === 'Técnico');
      
      setClientes(clientesList);
      setTecnicos(tecnicosList);
      setVehiculosDb(vRes || []);
      setServiciosDb(sRes || []);
      setProductosDb(pRes || []);

      if (currentUser?.name) {
        setTecnicoNombre(currentUser.name);
      } else if (tecnicosList.length > 0) {
        setTecnicoNombre(tecnicosList[0].name);
      }

      if (cRes) {
        const pendientes = cRes.filter(c => c.estado === 'Pendiente' || c.estado === 'Confirmada');
        const parsed = pendientes.map(cita => {
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
              if (p.startsWith('Vehículo:')) extrVehiculo = p.replace('Vehículo:', '').trim();
              if (p.startsWith('Servicios:')) {
                const srvStr = p.replace('Servicios:', '').trim();
                if (srvStr && srvStr !== 'Servicio no definido') extrServicios = srvStr.split(',').map(s => s.trim());
              }
              if (p.startsWith('Notas:')) extrNotas = p.replace('Notas:', '').trim();
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
        setCitasPendientes(parsed);
      }
    } catch (err) {
      console.error('Error cargando datos para Remisión:', err);
      toast.error('No se pudieron cargar los datos requeridos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar vehículos del cliente seleccionado
  const vehiculosCliente = vehiculosDb.filter(v => v.propietario_correo === clienteCorreo);
  const vehiculoSeleccionado = vehiculosDb.find(v => String(v.idVehiculos) === String(idVehiculo));
  const clienteSeleccionado = clientes.find(c => c.email === clienteCorreo);

  // Manejar selección de Cita Pendiente
  const handleCitaSelect = (citaId) => {
    setSelectedCitaId(citaId);
    if (!citaId) return;

    const cita = citasPendientes.find(c => String(c.id) === String(citaId));
    if (!cita) return;

    let emailEncontrado = clienteCorreo;
    if (cita.parsedEmail) {
      const match = clientes.find(c => c.email.toLowerCase() === cita.parsedEmail.toLowerCase());
      if (match) emailEncontrado = match.email;
    } else if (cita.parsedCliente) {
      const match = clientes.find(c => c.name.toLowerCase() === cita.parsedCliente.toLowerCase());
      if (match) emailEncontrado = match.email;
    }

    setClienteCorreo(emailEncontrado);

    if (cita.parsedNotas) {
      setObservaciones(`[Cita agendada] ${cita.parsedNotas}`);
    }

    if (cita.parsedServicios && cita.parsedServicios.length > 0) {
      const matched = serviciosDb.filter(s => cita.parsedServicios.some(ps => ps.toLowerCase() === s.nombre.toLowerCase()));
      if (matched.length > 0) {
        const nuevosTrabajos = matched.map(srv => ({
          id: srv.id,
          nombre: srv.nombre,
          precio: Number(srv.manoObra || srv.mano_obra || srv.costo || 0),
          descripcion: srv.descripcion || 'Servicio agendado en cita'
        }));
        setTrabajos(nuevosTrabajos);

        let refsAuto = [];
        matched.forEach(srv => {
          if (srv.refacciones && Array.isArray(srv.refacciones)) {
            srv.refacciones.forEach(sr => {
              const existe = refsAuto.find(r => r.id === sr.id);
              if (existe) {
                existe.cantidad += sr.cantidad;
              } else {
                refsAuto.push({
                  id: sr.id,
                  nombre: sr.nombre,
                  precio_unitario: Number(sr.precio_unitario || 0),
                  cantidad: Number(sr.cantidad || 1)
                });
              }
            });
          }
        });
        setRefacciones(refsAuto);
      }
    }
    toast.info(`Datos precargados desde la cita de ${cita.parsedCliente}`);
  };

  // Agregar trabajo/servicio desde catálogo
  const agregarServicioCatalogo = () => {
    if (!selectedServicioId) return;
    const srv = serviciosDb.find(s => s.id === Number(selectedServicioId));
    if (!srv) return;

    if (trabajos.some(t => t.id === srv.id)) {
      toast.warning('Este servicio ya está en la remisión');
      return;
    }

    setTrabajos(prev => [
      ...prev,
      {
        id: srv.id,
        nombre: srv.nombre,
        precio: Number(srv.manoObra || srv.mano_obra || srv.costo || 0),
        descripcion: srv.descripcion || ''
      }
    ]);

    if (srv.refacciones && Array.isArray(srv.refacciones)) {
      setRefacciones(prev => {
        const copia = [...prev];
        srv.refacciones.forEach(sr => {
          const existe = copia.find(r => r.id === sr.id);
          if (existe) {
            existe.cantidad += sr.cantidad;
          } else {
            copia.push({
              id: sr.id,
              nombre: sr.nombre,
              precio_unitario: Number(sr.precio_unitario || 0),
              cantidad: Number(sr.cantidad || 1)
            });
          }
        });
        return copia;
      });
    }

    setSelectedServicioId('');
    toast.info(`Servicio "${srv.nombre}" agregado`);
  };

  // Agregar trabajo personalizado si no existe en catálogo
  const agregarServicioCustom = () => {
    if (!servicioCustom.nombre.trim() || !servicioCustom.precio) {
      toast.warning('Ingresa el nombre y costo del servicio');
      return;
    }
    const customId = `custom_srv_${Date.now()}`;
    setTrabajos(prev => [
      ...prev,
      {
        id: customId,
        nombre: servicioCustom.nombre.trim(),
        precio: Number(servicioCustom.precio),
        descripcion: 'Servicio técnico especializado fuera de catálogo'
      }
    ]);
    setServicioCustom({ nombre: '', precio: '' });
    toast.info('Servicio personalizado añadido');
  };

  const eliminarTrabajo = (id) => {
    setTrabajos(prev => prev.filter(t => t.id !== id));
  };

  // Agregar refacción desde inventario (refaccionaria)
  const agregarRefaccionCatalogo = () => {
    if (!selectedProductoId || cantProducto < 1) return;
    const prod = productosDb.find(p => p.idproductos === Number(selectedProductoId));
    if (!prod) return;

    setRefacciones(prev => {
      const existe = prev.find(r => r.id === prod.idproductos);
      if (existe) {
        return prev.map(r => r.id === prod.idproductos ? { ...r, cantidad: r.cantidad + Number(cantProducto) } : r);
      }
      return [
        ...prev,
        {
          id: prod.idproductos,
          nombre: prod.nombre,
          precio_unitario: Number(prod.precio_unitario || prod.precio || 0),
          cantidad: Number(cantProducto)
        }
      ];
    });

    setSelectedProductoId('');
    setCantProducto(1);
    toast.info(`Refacción "${prod.nombre}" añadida`);
  };

  // Agregar refacción personalizada (solicitud especial a refaccionaria)
  const agregarRefaccionCustom = () => {
    if (!productoCustom.nombre.trim() || !productoCustom.precio || productoCustom.cantidad < 1) {
      toast.warning('Ingresa nombre, precio unitario y cantidad válida');
      return;
    }
    const customId = `custom_prod_${Date.now()}`;
    setRefacciones(prev => [
      ...prev,
      {
        id: customId,
        nombre: productoCustom.nombre.trim(),
        precio_unitario: Number(productoCustom.precio),
        cantidad: Number(productoCustom.cantidad)
      }
    ]);
    setProductoCustom({ nombre: '', precio: '', cantidad: 1 });
    toast.info('Pieza especial solicitada a refaccionaria');
  };

  const eliminarRefaccion = (id) => {
    setRefacciones(prev => prev.filter(r => r.id !== id));
  };

  const updateRefaccionCantidad = (id, delta) => {
    setRefacciones(prev =>
      prev.map(r => {
        if (r.id === id) {
          const nueva = Math.max(1, Number(r.cantidad || 1) + delta);
          return { ...r, cantidad: nueva };
        }
        return r;
      })
    );
  };

  // Totales
  const totalTrabajos = trabajos.reduce((acc, t) => acc + Number(t.precio || 0), 0);
  const totalRefacciones = refacciones.reduce((acc, r) => acc + (Number(r.cantidad || 1) * Number(r.precio_unitario || 0)), 0);
  const totalRemision = totalTrabajos + totalRefacciones;

  // Atajos de notas rápidas
  const appendQuickNote = (tag) => {
    setObservaciones(prev => prev ? `${prev} · ${tag}` : tag);
  };

  // Enviar / Emitir Remisión
  const handleSubmitRemision = async (e) => {
    e.preventDefault();
    if (!idVehiculo) {
      toast.warning('Por favor selecciona un vehículo para emitir la orden');
      return;
    }
    if (trabajos.length === 0 && refacciones.length === 0) {
      toast.warning('Agrega al menos un servicio o refacción a la orden');
      return;
    }

    try {
      setSubmitting(true);

      const checklistPredeterminado = [
        { id: 'aceite', item: 'Nivel y calidad de aceite de motor', estado: 'Pendiente', nota: '' },
        { id: 'frenos', item: 'Estado de balatas y discos de freno', estado: 'Pendiente', nota: '' },
        { id: 'llantas', item: 'Presión y desgaste de neumáticos', estado: 'Pendiente', nota: '' },
        { id: 'bateria', item: 'Voltaje y limpieza de bornes de batería', estado: 'Pendiente', nota: '' },
        { id: 'refrigerante', item: 'Nivel de anticongelante y fuga de mangueras', estado: 'Pendiente', nota: '' },
        { id: 'filtros', item: 'Filtro de aire y filtro de cabina', estado: 'Pendiente', nota: '' },
        { id: 'luces', item: 'Sistema de luces (Altas, Bajas, Intermitentes, Stop)', estado: 'Pendiente', nota: '' },
        { id: 'suspension', item: 'Amortiguadores y bujes de suspensión', estado: 'Pendiente', nota: '' },
      ];

      const serviciosPayload = trabajos.map(t => ({
        id: t.id,
        nombre: t.nombre,
        precio: t.precio,
        descripcion: t.descripcion
      }));

      const productosPayload = refacciones.map(r => ({
        id: r.id,
        nombre: r.nombre,
        cantidad: r.cantidad,
        precio: r.precio_unitario
      }));

      const payload = {
        idVehiculos: Number(idVehiculo),
        tecnico: tecnicoNombre || 'Técnico de taller',
        kilometraje: kilometraje || '0',
        estado: 'Pendiente de Aprobación',
        fecha: fecha,
        observaciones: observaciones || 'Orden de servicio generada en estación técnica. Pendiente de aprobación.',
        costo_final: totalRemision,
        checklist: checklistPredeterminado,
        servicios: serviciosPayload,
        productos: productosPayload
      };

      await createMantenimiento(payload);

      if (selectedCitaId) {
        await updateCita(selectedCitaId, { estado: 'Atendida' });
      }

      toast.success('¡Orden de Servicio emitida con éxito! Enviada a Mantenimiento para aprobación.');
      resetForm();
    } catch (err) {
      console.error('Error al emitir orden de servicio:', err);
      toast.error(err.message || 'Error al emitir la Orden de Servicio');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setClienteCorreo('');
    setIdVehiculo('');
    setKilometraje('');
    setObservaciones('');
    setTrabajos([]);
    setRefacciones([]);
    setSelectedCitaId('');
    setSelectedServicioId('');
    setSelectedProductoId('');
  };

  return (
    <AdminLayout activeTab="remision">
      <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-10 text-left">
        
        {/* ========================================================================= */}
        {/* HERO / HEADER DE CABECERA DE ALTO IMPACTO */}
        {/* ========================================================================= */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800/80 mb-8">
          {/* Acento de luz decorativo */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Estación de Trabajo Técnica & Refaccionaria
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                Orden de Servicio
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Preliminar
                </span>
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                Recepción, diagnóstico técnico, estimación de mano de obra y requisición de repuestos para validación administrativa.
              </p>
            </div>

            {/* Badges de Estado y Acciones Rápidas */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-2xl px-4 py-2.5 text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Técnico a Cargo</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5 justify-end">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {tecnicoNombre || 'No asignado'}
                </div>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white text-xs font-bold transition border border-slate-700 shadow-sm"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4" />
            <p className="text-slate-600 font-semibold text-base">Cargando inventarios, vehículos y catálogos de servicio...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmitRemision} className="space-y-8">

            {/* ========================================================================= */}
            {/* SECCIÓN 1: VINCULACIÓN DE CITA Y DATOS DEL VEHÍCULO */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 transition hover:shadow-md">
              
              {/* Header de la tarjeta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Datos de Recepción y Unidad</h2>
                    <p className="text-xs text-slate-500">Selecciona el cliente y el vehículo a inspeccionar</p>
                  </div>
                </div>

                {/* Banner inteligente de citas pendientes */}
                {citasPendientes.length > 0 && (
                  <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 px-3.5 py-2 rounded-2xl">
                    <span className="text-blue-600 text-sm">📅</span>
                    <span className="text-xs font-bold text-slate-700 hidden sm:inline">¿Viene con cita?</span>
                    <select
                      value={selectedCitaId}
                      onChange={(e) => handleCitaSelect(e.target.value)}
                      className="text-xs bg-white border border-blue-200 text-blue-900 font-semibold px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                    >
                      <option value="">Seleccionar cita agendada...</option>
                      {citasPendientes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.parsedCliente} • {c.parsedVehiculo} ({c.fecha})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Grid de Formulario */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Cliente Registrado */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Cliente Registrado <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={clienteCorreo}
                      onChange={(e) => {
                        setClienteCorreo(e.target.value);
                        setIdVehiculo('');
                      }}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    >
                      <option value="">-- Seleccionar cliente --</option>
                      {clientes.map(c => (
                        <option key={c.id || c.email} value={c.email}>
                          {c.name || c.nombre} ({c.email})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Vehículo del Cliente */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Vehículo en Taller <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={idVehiculo}
                      onChange={(e) => setIdVehiculo(e.target.value)}
                      required
                      disabled={!clienteCorreo}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="">
                        {!clienteCorreo ? 'Selecciona primero el cliente' : (vehiculosCliente.length === 0 ? 'Sin vehículos registrados' : '-- Seleccionar vehículo --')}
                      </option>
                      {vehiculosCliente.map(v => (
                        <option key={v.idVehiculos} value={v.idVehiculos}>
                          {v.marca || ''} {v.modelo || ''} ({v.anio || 'Año S/D'}) • Placa: {v.placa || 'S/N'}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Técnico Emisor */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Técnico Emisor
                  </label>
                  <div className="relative">
                    <select
                      value={tecnicoNombre}
                      onChange={(e) => setTecnicoNombre(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    >
                      <option value="">-- Seleccionar técnico --</option>
                      {tecnicos.map(t => (
                        <option key={t.id || t.email} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                      {currentUser?.name && !tecnicos.some(t => t.name === currentUser.name) && (
                        <option value={currentUser.name}>{currentUser.name}</option>
                      )}
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Kilometraje Actual */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Kilometraje Actual (Odómetro)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Ej. 64250"
                      value={kilometraje}
                      onChange={(e) => setKilometraje(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                      KM
                    </span>
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Fecha de Entrada
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

              </div>

              {/* Ficha Técnica Interactiva del Vehículo Seleccionado */}
              {vehiculoSeleccionado && (
                <div className="mt-6 pt-6 border-t border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 rounded-2xl p-4.5 border border-slate-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Tarjeta tipo Placa Automotriz */}
                    <div className="bg-white border-2 border-slate-800 rounded-lg px-3 py-1.5 shadow-sm text-center min-w-[110px]">
                      <div className="text-[9px] font-black uppercase tracking-widest text-blue-900 border-b border-slate-200">MÉXICO</div>
                      <div className="text-base font-black tracking-widest text-slate-900">{vehiculoSeleccionado.placa || 'S/N PLACA'}</div>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-900 leading-tight">
                        {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                        {vehiculoSeleccionado.anio && (
                          <span className="font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            Año {vehiculoSeleccionado.anio}
                          </span>
                        )}
                        {vehiculoSeleccionado.color && (
                          <span className="font-medium bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                            Color: {vehiculoSeleccionado.color}
                          </span>
                        )}
                        {vehiculoSeleccionado.vin && (
                          <span className="font-mono text-[11px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
                            VIN: {vehiculoSeleccionado.vin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {clienteSeleccionado && (
                    <div className="text-left md:text-right text-xs text-slate-500 bg-white md:bg-transparent p-3 md:p-0 rounded-xl w-full md:w-auto border md:border-0 border-slate-200">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Propietario</span>
                      <span className="font-bold text-slate-800 text-sm block">{clienteSeleccionado.name}</span>
                      <span className="text-slate-500">{clienteSeleccionado.phone || clienteSeleccionado.email}</span>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN 2: SERVICIOS Y MANO DE OBRA */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 transition hover:shadow-md space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Mano de Obra y Servicios Requeridos</h2>
                    <p className="text-xs text-slate-500">Define los trabajos técnicos asignados a la unidad</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {trabajos.length} trabajos asignados
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Subtotal Labor</span>
                    <span className="text-lg font-black text-indigo-600">
                      ${totalTrabajos.toLocaleString()} <span className="text-xs font-medium">MXN</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector de modo: Catálogo vs Personalizado */}
              <div className="bg-slate-100 p-1 rounded-2xl inline-flex gap-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setModoServicio('catalogo')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${modoServicio === 'catalogo' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Catálogo de Servicios
                </button>
                <button
                  type="button"
                  onClick={() => setModoServicio('custom')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${modoServicio === 'custom' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  + Labor Personalizada / Diagnóstico
                </button>
              </div>

              {/* Barra de adición */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {modoServicio === 'catalogo' ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <select
                        value={selectedServicioId}
                        onChange={(e) => setSelectedServicioId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                      >
                        <option value="">Selecciona un servicio del taller...</option>
                        {serviciosDb.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nombre} — Mano de Obra: ${Number(s.manoObra || s.mano_obra || s.costo || 0).toLocaleString()} MXN
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={agregarServicioCatalogo}
                      disabled={!selectedServicioId}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                      <span>+ Agregar a Orden</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Ej. Diagnóstico con escáner OBD2 y prueba de compresión..."
                      value={servicioCustom.nombre}
                      onChange={(e) => setServicioCustom({ ...servicioCustom, nombre: e.target.value })}
                      className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    <div className="flex gap-2">
                      <div className="relative w-36">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          placeholder="Costo"
                          value={servicioCustom.precio}
                          onChange={(e) => setServicioCustom({ ...servicioCustom, precio: e.target.value })}
                          className="w-full pl-7 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={agregarServicioCustom}
                        className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm whitespace-nowrap"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Trabajos */}
              {trabajos.length > 0 ? (
                <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Labor Técnica</th>
                        <th className="py-3 px-4">Descripción Operativa</th>
                        <th className="py-3 px-4 text-right">Costo Mano de Obra</th>
                        <th className="py-3 px-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {trabajos.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {t.nombre}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                            {t.descripcion || 'Servicio estándar de taller'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            ${Number(t.precio).toLocaleString()} <span className="text-xs text-slate-400 font-normal">MXN</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarTrabajo(t.id)}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                              title="Remover labor"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 px-4 text-center bg-slate-50/60 border border-dashed border-slate-300 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center mb-2">
                    🔧
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Sin servicios agregados</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Selecciona servicios del catálogo o añade diagnósticos manuales para presupuestar la mano de obra.
                  </p>
                </div>
              )}

            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN 3: REQUISICIÓN A REFACCIONARIA / PARTES */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 transition hover:shadow-md space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-lg border border-amber-100">
                    3
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Requisición de Refacciones y Materiales</h2>
                    <p className="text-xs text-slate-500">Solicitud directa de repuestos al almacén o compra especial</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {refacciones.length} piezas solicitadas
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Subtotal Refacciones</span>
                    <span className="text-lg font-black text-amber-600">
                      ${totalRefacciones.toLocaleString()} <span className="text-xs font-medium">MXN</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector de modo */}
              <div className="bg-slate-100 p-1 rounded-2xl inline-flex gap-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setModoRefaccion('inventario')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${modoRefaccion === 'inventario' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Inventario de Taller
                </button>
                <button
                  type="button"
                  onClick={() => setModoRefaccion('custom')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${modoRefaccion === 'custom' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  + Pieza Especial No Inventariada
                </button>
              </div>

              {/* Barra de adición de refacciones */}
              <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60">
                {modoRefaccion === 'inventario' ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <select
                        value={selectedProductoId}
                        onChange={(e) => setSelectedProductoId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                      >
                        <option value="">Seleccionar refacción del almacén...</option>
                        {productosDb.map(p => (
                          <option key={p.idproductos} value={p.idproductos}>
                            {p.nombre} — ${Number(p.precio_unitario || 0).toLocaleString()} MXN (Stock: {p.stock_actual ?? '0'} pzas)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="Cant."
                          value={cantProducto}
                          onChange={(e) => setCantProducto(Math.max(1, Number(e.target.value)))}
                          className="w-full text-center py-3 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={agregarRefaccionCatalogo}
                        disabled={!selectedProductoId}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-amber-600/20 whitespace-nowrap flex items-center justify-center gap-2"
                      >
                        <span>+ Requerir Pieza</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Nombre de la refacción o repuesto especial..."
                      value={productoCustom.nombre}
                      onChange={(e) => setProductoCustom({ ...productoCustom, nombre: e.target.value })}
                      className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                    />
                    <div className="flex gap-2">
                      <div className="relative w-32">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          placeholder="Precio U."
                          value={productoCustom.precio}
                          onChange={(e) => setProductoCustom({ ...productoCustom, precio: e.target.value })}
                          className="w-full pl-7 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                        />
                      </div>
                      <div className="relative w-20">
                        <input
                          type="number"
                          min="1"
                          placeholder="Cant."
                          value={productoCustom.cantidad}
                          onChange={(e) => setProductoCustom({ ...productoCustom, cantidad: Math.max(1, Number(e.target.value)) })}
                          className="w-full text-center py-3 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={agregarRefaccionCustom}
                        className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm whitespace-nowrap"
                      >
                        + Pedir
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Refacciones */}
              {refacciones.length > 0 ? (
                <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Refacción / Insumo</th>
                        <th className="py-3 px-4 text-center">Cantidad</th>
                        <th className="py-3 px-4 text-right">Precio Unitario</th>
                        <th className="py-3 px-4 text-right">Importe</th>
                        <th className="py-3 px-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {refacciones.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {r.nombre}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => updateRefaccionCantidad(r.id, -1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-200 font-bold text-slate-600 transition"
                              >
                                -
                              </button>
                              <span className="w-8 font-black text-center text-xs text-slate-800">
                                {r.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateRefaccionCantidad(r.id, 1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-200 font-bold text-slate-600 transition"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-600">
                            ${Number(r.precio_unitario).toLocaleString()} <span className="text-xs text-slate-400">MXN</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-amber-700">
                            ${(Number(r.cantidad) * Number(r.precio_unitario)).toLocaleString()} <span className="text-xs font-normal">MXN</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarRefaccion(r.id)}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                              title="Remover refacción"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 px-4 text-center bg-slate-50/60 border border-dashed border-slate-300 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-2">
                    📦
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Sin refacciones requeridas</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Si el servicio no requiere repuestos, puedes omitir esta sección o agregar piezas según tu diagnóstico.
                  </p>
                </div>
              )}

            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN 4: OBSERVACIONES TÉCNICAS Y LIQUIDACIÓN RESUMEN */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 transition hover:shadow-md space-y-6">
              
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-100">
                  4
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Dictamen Técnico y Cierre de Orden</h2>
                  <p className="text-xs text-slate-500">Notas de inspección para el Administrador y desglose final</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Columna Izquierda: Notas y Atajos */}
                <div className="lg:col-span-7 space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Observaciones y Hallazgos del Técnico
                  </label>
                  
                  {/* Atajos de notas rápidas */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 self-center mr-1">Insertar rápido:</span>
                    {[
                      'Falla reportada por cliente',
                      'Fuga detectada en motor',
                      'Balatas al límite (15%)',
                      'Ruidos en suspensión delantera',
                      'Servicio preventivo completado',
                      'Requiere alineación y balanceo'
                    ].map((tag, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => appendQuickNote(tag)}
                        className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows="4"
                    placeholder="Escribe aquí las observaciones técnicas del vehículo, recomendaciones para el cliente o detalles para la refaccionaria..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-4 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition shadow-inner"
                  />
                  <p className="text-[11px] text-slate-400">
                    Estas notas quedarán registradas en el historial del expediente automotriz.
                  </p>
                </div>

                {/* Columna Derecha: Tarjeta Ejecutiva de Totales */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span>Resumen de Costos</span>
                    <span className="text-emerald-400">Cotización Taller</span>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Mano de Obra ({trabajos.length} trabajos):</span>
                      <span className="font-bold text-white">${totalTrabajos.toLocaleString()} MXN</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Refacciones ({refacciones.length} piezas):</span>
                      <span className="font-bold text-white">${totalRefacciones.toLocaleString()} MXN</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Total Estimado de la Orden
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                      ${totalRemision.toLocaleString()} <span className="text-sm font-medium text-emerald-200">MXN</span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/50">
                    Al emitir, se generará una orden en estado <span className="text-amber-300 font-bold">Pendiente de Aprobación</span> para que el Administrador valide los costos antes de intervenir la unidad.
                  </div>
                </div>

              </div>

              {/* Botón de Emisión Principal */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Listo para enviar a la mesa de trabajo de Mantenimiento
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/25 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Emitiendo Orden...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Emitir Orden de Servicio & Enviar a Mantenimiento</span>
                      <span className="text-lg">→</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </form>
        )}

      </div>
    </AdminLayout>
  );
}
