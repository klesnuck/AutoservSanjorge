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

      // Establecer técnico por defecto basado en usuario logueado o primer técnico
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

    // Auto agregar servicios especificados en la cita
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

        // Auto cargar refacciones asociadas a los servicios
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

    // Agregar refacciones asociadas al servicio si las tiene
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
      toast.warning('Ingresa el nombre y costo del servicio personalizado');
      return;
    }
    const customId = `custom_srv_${Date.now()}`;
    setTrabajos(prev => [
      ...prev,
      {
        id: customId,
        nombre: servicioCustom.nombre.trim(),
        precio: Number(servicioCustom.precio),
        descripcion: 'Servicio personalizado adicionado en remisión'
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
    toast.info('Pieza especial agregada a la orden de refaccionaria');
  };

  const eliminarRefaccion = (id) => {
    setRefacciones(prev => prev.filter(r => r.id !== id));
  };

  const updateRefaccionCantidad = (id, newCant) => {
    if (newCant < 1) return;
    setRefacciones(prev => prev.map(r => r.id === id ? { ...r, cantidad: Number(newCant) } : r));
  };

  // Totales
  const totalTrabajos = trabajos.reduce((acc, t) => acc + Number(t.precio || 0), 0);
  const totalRefacciones = refacciones.reduce((acc, r) => acc + (Number(r.cantidad || 1) * Number(r.precio_unitario || 0)), 0);
  const totalRemision = totalTrabajos + totalRefacciones;

  // Enviar / Emitir Remisión
  const handleSubmitRemision = async (e) => {
    e.preventDefault();
    if (!idVehiculo) {
      toast.warning('Por favor selecciona un vehículo para la remisión');
      return;
    }
    if (trabajos.length === 0 && refacciones.length === 0) {
      toast.warning('Agrega al menos un servicio o refacción a la remisión');
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
        estado: 'Pendiente de Aprobación', // Estado inicial para que el Admin apruebe
        fecha: fecha,
        observaciones: observaciones || 'Orden de servicio generada por técnico en espera de revisión y aprobación administrativa.',
        costo_final: totalRemision,
        checklist: checklistPredeterminado,
        servicios: serviciosPayload,
        productos: productosPayload
      };

      await createMantenimiento(payload);

      // Si venía de una cita agendada, actualizar cita
      if (selectedCitaId) {
        await updateCita(selectedCitaId, { estado: 'Atendida' });
      }

      toast.success('¡Orden de Servicio emitida exitosamente! Ha sido enviada al área de Mantenimiento para aprobación del Administrador.');
      
      // Limpiar formulario
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
      <div className="p-4 md:p-8 max-w-6xl mx-auto text-left">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/20">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Orden de Servicio</h2>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                  Área de Técnicos & Refaccionaria
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                Genera la orden preliminar de trabajo y solicitud de refacciones para enviarla a revisión administrativa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition"
            >
              Limpiar Formulario
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 font-medium">Cargando catálogos de técnico y refaccionaria...</div>
        ) : (
          <form onSubmit={handleSubmitRemision} className="space-y-8">
            
            {/* SECCIÓN 1: Cita previa y Datos del Cliente / Vehículo */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-blue-600">1.</span> Datos del Cliente y Vehículo
                </h3>

                {citasPendientes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Cargar desde Cita:</span>
                    <select
                      value={selectedCitaId}
                      onChange={(e) => handleCitaSelect(e.target.value)}
                      className="text-xs bg-blue-50 border border-blue-200 text-blue-900 font-medium px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Seleccionar cita pendiente --</option>
                      {citasPendientes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.parsedCliente} - {c.parsedVehiculo} ({c.fecha})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Cliente */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Cliente Registrado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={clienteCorreo}
                    onChange={(e) => {
                      setClienteCorreo(e.target.value);
                      setIdVehiculo('');
                    }}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar cliente --</option>
                    {clientes.map(c => (
                      <option key={c.id || c.email} value={c.email}>
                        {c.name || c.nombre} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehículo */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Vehículo del Cliente <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={idVehiculo}
                    onChange={(e) => setIdVehiculo(e.target.value)}
                    required
                    disabled={!clienteCorreo}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">
                      {!clienteCorreo ? '-- Selecciona primero un cliente --' : (vehiculosCliente.length === 0 ? 'Sin vehículos registrados' : '-- Seleccionar vehículo --')}
                    </option>
                    {vehiculosCliente.map(v => (
                      <option key={v.idVehiculos} value={v.idVehiculos}>
                        {v.marca || ''} {v.modelo || ''} • Placa: {v.placa || 'S/N'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Técnico Asignado */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Técnico Emisor
                  </label>
                  <select
                    value={tecnicoNombre}
                    onChange={(e) => setTecnicoNombre(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                </div>

                {/* Kilometraje */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Kilometraje Actual
                  </label>
                  <input
                    type="number"
                    placeholder="Ej. 45000"
                    value={kilometraje}
                    onChange={(e) => setKilometraje(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Fecha de la Remisión
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>
            </div>

            {/* SECCIÓN 2: Trabajos y Servicios a Realizar */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-blue-600">2.</span> Servicios y Mano de Obra (Trabajos)
                  </h3>
                  <p className="text-xs text-gray-500">Selecciona del catálogo o añade trabajos específicos si detectas nuevos requerimientos.</p>
                </div>
                <span className="font-extrabold text-blue-700 text-base">
                  Subtotal: ${totalTrabajos.toLocaleString()} MXN
                </span>
              </div>

              {/* Tabla de trabajos agregados */}
              {trabajos.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200/80 rounded-2xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-bold text-xs uppercase border-b border-gray-200">
                      <tr>
                        <th className="p-3.5">Servicio / Trabajo</th>
                        <th className="p-3.5">Descripción</th>
                        <th className="p-3.5 text-right">Costo Estimado</th>
                        <th className="p-3.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {trabajos.map((t, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition">
                          <td className="p-3.5 font-bold text-gray-900">{t.nombre}</td>
                          <td className="p-3.5 text-gray-500 text-xs">{t.descripcion || 'Sin descripción'}</td>
                          <td className="p-3.5 text-right font-black text-gray-900">${Number(t.precio).toLocaleString()} MXN</td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarTrabajo(t.id)}
                              className="text-red-500 hover:text-red-700 font-bold text-xs px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-gray-400 text-sm">
                  Aún no se han agregado servicios a la remisión.
                </div>
              )}

              {/* Controles para agregar servicios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                {/* Desde Catálogo */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedServicioId}
                    onChange={(e) => setSelectedServicioId(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">+ Seleccionar servicio del catálogo...</option>
                    {serviciosDb.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} (${Number(s.manoObra || s.mano_obra || s.costo || 0)} MXN)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={agregarServicioCatalogo}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm whitespace-nowrap justify-center flex items-center"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Personalizado */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nombre de servicio no registrado..."
                    value={servicioCustom.nombre}
                    onChange={(e) => setServicioCustom({ ...servicioCustom, nombre: e.target.value })}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="$ Costo"
                      value={servicioCustom.precio}
                      onChange={(e) => setServicioCustom({ ...servicioCustom, precio: e.target.value })}
                      className="w-full sm:w-24 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={agregarServicioCustom}
                      className="px-4 py-2.5 bg-gray-800 hover:bg-black text-white font-bold text-xs rounded-xl transition whitespace-nowrap shrink-0 flex items-center justify-center"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* SECCIÓN 3: Solicitud a la Refaccionaria (Repuestos y Refacciones) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-amber-600">3.</span> Solicitud a Refaccionaria (Partes y Repuestos)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Marca las refacciones necesarias. Si requieres piezas adicionales durante la revisión, puedes agregarlas aquí directamente.
                  </p>
                </div>
                <span className="font-extrabold text-amber-700 text-base">
                  Subtotal: ${totalRefacciones.toLocaleString()} MXN
                </span>
              </div>

              {/* Tabla de refacciones */}
              {refacciones.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200/80 rounded-2xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-amber-50/50 text-amber-900 font-bold text-xs uppercase border-b border-amber-100">
                      <tr>
                        <th className="p-3.5">Pieza / Refacción</th>
                        <th className="p-3.5 text-center">Cantidad Requerida</th>
                        <th className="p-3.5 text-right">Precio Unitario</th>
                        <th className="p-3.5 text-right">Subtotal</th>
                        <th className="p-3.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {refacciones.map((r, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20 transition">
                          <td className="p-3.5 font-bold text-gray-900">{r.nombre}</td>
                          <td className="p-3.5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={r.cantidad}
                              onChange={(e) => updateRefaccionCantidad(r.id, e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-center font-bold text-xs"
                            />
                          </td>
                          <td className="p-3.5 text-right text-gray-600">${Number(r.precio_unitario).toLocaleString()} MXN</td>
                          <td className="p-3.5 text-right font-black text-amber-800">
                            ${(Number(r.cantidad) * Number(r.precio_unitario)).toLocaleString()} MXN
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarRefaccion(r.id)}
                              className="text-red-500 hover:text-red-700 font-bold text-xs px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-gray-400 text-sm">
                  Sin refacciones solicitadas aún.
                </div>
              )}

              {/* Controles para agregar refacciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                {/* Desde inventario */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedProductoId}
                    onChange={(e) => setSelectedProductoId(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">+ Seleccionar refacción del inventario...</option>
                    {productosDb.map(p => (
                      <option key={p.idproductos} value={p.idproductos}>
                        {p.nombre} (${Number(p.precio_unitario || 0)} MXN - Stock: {p.stock_actual})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={cantProducto}
                      onChange={(e) => setCantProducto(e.target.value)}
                      className="w-20 sm:w-16 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-center font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={agregarRefaccionCatalogo}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-sm whitespace-nowrap justify-center flex items-center"
                    >
                      + Pedir Pieza
                    </button>
                  </div>
                </div>

                {/* Especial / No inventariada */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nombre de refacción especial..."
                    value={productoCustom.nombre}
                    onChange={(e) => setProductoCustom({ ...productoCustom, nombre: e.target.value })}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="$ Precio U."
                      value={productoCustom.precio}
                      onChange={(e) => setProductoCustom({ ...productoCustom, precio: e.target.value })}
                      className="w-full sm:w-24 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={agregarRefaccionCustom}
                      className="px-4 py-2.5 bg-gray-800 hover:bg-black text-white font-bold text-xs rounded-xl transition whitespace-nowrap shrink-0 flex items-center justify-center"
                    >
                      + Pedir Especial
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* SECCIÓN 4: Observaciones y Resumen de Cierre */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-emerald-600">4.</span> Observaciones y Resumen Final
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Observaciones Iniciales del Técnico
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Instrucciones para la refaccionaria, fallas reportadas por el cliente o notas iniciales..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Tarjeta de Total */}
                <div className="bg-emerald-950 text-white p-6 rounded-2xl shadow-lg border border-emerald-800 space-y-2 text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">Total de la Orden de Servicio</span>
                  <div className="text-3xl font-black text-white">
                    ${totalRemision.toLocaleString()} MXN
                  </div>
                  <p className="text-[11px] text-emerald-200">
                    Incluye {trabajos.length} servicios y {refacciones.length} refacciones
                  </p>
                </div>
              </div>

              {/* Botón de Enviar a Mantenimiento */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold text-base transition shadow-xl shadow-emerald-600/20 flex items-center gap-3 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Emitiendo Orden de Servicio...</span>
                  ) : (
                    <>
                      <span>📄 Emitir Orden de Servicio & Enviar a Mantenimiento</span>
                      <span className="text-xl">→</span>
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
