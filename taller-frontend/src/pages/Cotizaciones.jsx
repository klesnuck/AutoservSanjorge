import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useToast } from '../components/Toast';
import { fetchCotizaciones, createCotizacion, fetchServicios, fetchVehiculos, deleteCotizacion } from '../utils/api';

export default function Cotizaciones() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [serviciosList, setServiciosList] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [stats, setStats] = useState({ activas: 0, aceptadas: 0, pendientes: 0, valorTotal: 0 });
  const [detalleModal, setDetalleModal] = useState(null); // cotización seleccionada
  const [vehiculosTodos, setVehiculosTodos] = useState([]); // all vehicles for email lookup
  const [vehiculosCliente, setVehiculosCliente] = useState([]); // filtered by client email

  // Modal State
  const [newQuoteForm, setNewQuoteForm] = useState({
    cliente: '',
    email: '',
    vehiculo: '',
    idVehiculos: '',
    servicios: [],
    manoObra: '',
    refacciones: '',
    validaHasta: ''
  });

  const loadCotizaciones = async () => {
    setLoadingQuotes(true);
    try {
      const data = await fetchCotizaciones();
      const mapped = data.map((item) => {
        let extrCliente = item.cliente;
        let extrVehiculo = item.vehiculo;
        let extrServicio = item.servicio;
        let extrEmail = item.email;

        if (item.detalles && item.detalles.includes('Cliente:')) {
           const parts = item.detalles.split(' | ');
           parts.forEach(p => {
             if (p.startsWith('Cliente:')) {
               const cInfo = p.replace('Cliente:', '').split('-');
               extrCliente = cInfo[0].trim();
               if (cInfo[1]) extrEmail = cInfo[1].trim();
             }
             if (p.startsWith('Vehículo:')) {
               extrVehiculo = p.replace('Vehículo:', '').trim();
             }
             if (p.startsWith('Servicios:')) {
               extrServicio = p.replace('Servicios:', '').trim();
             }
           });
        }

        const finalCliente = extrCliente && extrCliente.trim() !== '' ? extrCliente : `Cliente sin registro`;

        return {
          ...item,
          id: item.id,
          cliente: finalCliente,
          email: extrEmail || 'No disponible',
          servicio: extrServicio || 'Servicio no asignado',
          vehiculo: extrVehiculo || 'Vehículo no asignado',
          estado: item.estado || 'Pendiente',
          fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : 'Sin fecha',
          validaHasta: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : 'Sin fecha',
          manoObra: item.totalEstimado || 0,
          refacciones: 0,
          total: item.totalEstimado || 0,
          avatar: finalCliente.charAt(0).toUpperCase(),
        };
      });
      setCotizaciones(mapped);
      const activas = mapped.length;
      const aceptadas = mapped.filter((item) => item.estado === 'Aceptada').length;
      const pendientes = mapped.filter((item) => item.estado === 'Enviada' || item.estado === 'Pendiente').length;
      const valorTotal = mapped.reduce((sum, item) => sum + Number(item.total || 0), 0);
      setStats({ activas, aceptadas, pendientes, valorTotal });
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
      setCotizaciones([]);
    } finally {
      setLoadingQuotes(false);
    }
  };

  useEffect(() => {
    loadCotizaciones();
    fetchServicios().then(data => {
      const mapped = (data || []).map(s => ({
        id: s.idservicios,
        nombre: s.nombre,
        manoObra: Number(s.mano_obra) || 0,
        refacciones: Number(s.refacciones_estimadas) || 0,
        total: (Number(s.mano_obra) || 0) + (Number(s.refacciones_estimadas) || 0)
      }));
      setServiciosList(mapped);
    }).catch(console.error);
    fetchVehiculos().then(data => setVehiculosTodos(data || [])).catch(console.error);
  }, []);

  // When email changes in the new quote form, filter client vehicles
  const handleEmailChange = (email) => {
    handleNewQuoteChange('email', email);
    handleNewQuoteChange('vehiculo', '');
    handleNewQuoteChange('idVehiculos', '');
    if (email) {
      const matches = vehiculosTodos.filter(
        v => (v.propietario_correo || '').toLowerCase() === email.toLowerCase()
      );
      setVehiculosCliente(matches);
    } else {
      setVehiculosCliente([]);
    }
  };

  const handleNewQuoteChange = (field, value) => {
    setNewQuoteForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateQuote = async () => {
    const totalEstimado = Number(newQuoteForm.manoObra || 0) + Number(newQuoteForm.refacciones || 0);
    const sNombres = serviciosList.filter(s => newQuoteForm.servicios.includes(s.id)).map(s => s.nombre).join(', ') || 'Cotización General';
    const vehiculoLabel = newQuoteForm.vehiculo || 'No especificado';
    const detallesStr = `Cliente: ${newQuoteForm.cliente} - ${newQuoteForm.email} | Vehículo: ${vehiculoLabel} | Servicios: ${sNombres}`;

    try {
      await createCotizacion({
        idUsuarios: null,
        idVehiculos: newQuoteForm.idVehiculos || null,
        idServicios: null,
        idProductos: null,
        total_estimado: totalEstimado,
        fecha: newQuoteForm.validaHasta || new Date().toISOString().slice(0, 10),
        detalles: detallesStr,
        estado: 'Pendiente'
      });
      setIsModalOpen(false);
      setNewQuoteForm({
        cliente: '',
        email: '',
        vehiculo: '',
        idVehiculos: '',
        servicios: [],
        manoObra: '',
        refacciones: '',
        validaHasta: ''
      });
      setVehiculosCliente([]);
      loadCotizaciones();
      toast.success('La cotización ha sido creada exitosamente.');
    } catch (error) {
      console.error('No se pudo crear la cotización:', error);
      toast.error('Error al crear la cotización. Intenta de nuevo.');
    }
  };

  const handleDeleteQuote = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta cotización?')) return;
    try {
      await deleteCotizacion(id);
      loadCotizaciones();
      setDetalleModal(null);
      toast.success('Cotización eliminada correctamente.');
    } catch (error) {
      console.error('Error al eliminar cotización:', error);
      toast.error(error.message || 'Error desconocido', 'No se pudo eliminar');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Enviada': return 'bg-blue-100 text-blue-700';
      case 'Aceptada': return 'bg-green-100 text-green-700';
      case 'Pendientes': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AdminLayout activeTab="cotizaciones">
      <div className="p-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Cotizaciones</h1>
            <p className="text-gray-500">Administra las cotizaciones en el sistema</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva cotización
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.activas}</div>
            <div className="text-sm font-medium text-gray-500">Cotizaciones activas</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-green-500 mb-1">{stats.aceptadas}</div>
            <div className="text-sm font-medium text-gray-500">Aceptadas</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-orange-400 mb-1">{stats.pendientes}</div>
            <div className="text-sm font-medium text-gray-500">Pendientes</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-blue-600 mb-1">${stats.valorTotal}</div>
            <div className="text-sm font-medium text-gray-500">Valor total cotizado</div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Cotizaciones recientes */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Cotizaciones recientes</h2>
            <div className="space-y-6">
              {cotizaciones.map(cot => (
                <div key={cot.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group">

                  {/* Card Header Profile */}
                  <div className="p-6 pb-4 flex justify-between items-start border-b border-gray-100">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
                        {cot.avatar}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{cot.cliente}</h3>
                        <p className="text-sm text-gray-500">{cot.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-md text-xs font-bold ${getStatusColor(cot.estado)}`}>
                        {cot.estado}
                      </span>
                      <button 
                        onClick={() => handleDeleteQuote(cot.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar cotización"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Card Details Grid */}
                  <div className="p-6 pb-2 grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <span className="text-gray-500">Servicio: </span>
                      <span className="font-medium text-gray-800">{cot.servicio}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Vehículo: </span>
                      <span className="font-medium text-gray-800">{cot.vehiculo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      Fecha: {cot.fecha}
                    </div>
                    <div>
                      <span className="text-gray-500">Válida hasta: </span>
                      <span className="font-medium text-gray-800">{cot.validaHasta}</span>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="p-6 pt-2">
                    <div className="flex justify-between items-center text-sm py-2 text-gray-600">
                      <span>Mano de obra</span>
                      <span className="font-medium text-gray-900">${cot.manoObra}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-2 text-gray-600 border-b border-gray-100">
                      <span>Refacciones</span>
                      <span className="font-medium text-gray-900">${cot.refacciones}</span>
                    </div>
                    <div className="flex justify-between items-center py-4">
                      <span className="font-bold text-gray-900 text-lg">Total</span>
                      <span className="font-bold text-blue-600 text-lg">${cot.total}</span>
                    </div>
                  </div>

                  {/* Actions — only Ver detalles */}
                  <div className="p-6 pt-0 flex gap-3">
                    <button
                      onClick={() => setDetalleModal(cot)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                      Ver detalles
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Lista de Precios */}


        </div>

      {/* Detalle Modal */}
      {detalleModal && (
        <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Detalle de Cotización</h2>
              <button onClick={() => setDetalleModal(null)} className="text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 block text-xs font-medium mb-0.5">Cliente</span><span className="font-semibold text-gray-900">{detalleModal.cliente}</span></div>
                <div><span className="text-gray-500 block text-xs font-medium mb-0.5">Correo</span><span className="font-semibold text-gray-900">{detalleModal.email}</span></div>
                <div><span className="text-gray-500 block text-xs font-medium mb-0.5">Vehículo</span><span className="font-semibold text-gray-900">{detalleModal.vehiculo}</span></div>
                <div><span className="text-gray-500 block text-xs font-medium mb-0.5">Estado</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(detalleModal.estado)}`}>{detalleModal.estado}</span></div>
                <div><span className="text-gray-500 block text-xs font-medium mb-0.5">Servicio(s)</span><span className="font-semibold text-gray-900">{detalleModal.servicio}</span></div>
                <div><span className="text-gray-500 block text-xs font-medium mb-0.5">Fecha</span><span className="font-semibold text-gray-900">{detalleModal.fecha}</span></div>
                <div><span className="text-gray-500 block text-xs font-medium mb-0.5">Válida hasta</span><span className="font-semibold text-gray-900">{detalleModal.validaHasta}</span></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Mano de obra</span><span className="font-medium">${detalleModal.manoObra}</span></div>
                <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2"><span>Refacciones</span><span className="font-medium">${detalleModal.refacciones}</span></div>
                <div className="flex justify-between font-bold text-gray-900 pt-1"><span>Total</span><span className="text-blue-600 font-bold">${detalleModal.total}</span></div>
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button 
                onClick={() => handleDeleteQuote(detalleModal.id)} 
                className="px-5 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition"
              >
                Eliminar
              </button>
              <button 
                onClick={() => setDetalleModal(null)} 
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Modal: Nueva Cotización */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

              {/* Modal Header */}
              <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Nueva cotización</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">

                {/* Información del cliente */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Información del cliente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre del cliente *</label>
                      <input
                        type="text"
                        placeholder="Juan Pérez García"
                        value={newQuoteForm.cliente}
                        onChange={(e) => handleNewQuoteChange('cliente', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  {/* Correo electrónico + vehicle lookup */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Correo electrónico *</label>
                      <input
                        type="email"
                        placeholder="juan@email.com"
                        value={newQuoteForm.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Detalles del servicio */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Detalles del servicio</h4>
                  <div className="space-y-4">
                    {/* Vehicle selector — appears after email is entered */}
                    {vehiculosCliente.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vehículo del cliente *</label>
                        <select
                          value={newQuoteForm.idVehiculos || ''}
                          onChange={e => {
                            const v = vehiculosCliente.find(x => String(x.id) === String(e.target.value));
                            handleNewQuoteChange('idVehiculos', e.target.value);
                            handleNewQuoteChange('vehiculo', v ? `${v.marca || ''} ${v.modelo || ''} ${v.placa ? '• ' + v.placa : ''}`.trim() : '');
                          }}
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          required
                        >
                          <option value="">-- Selecciona el vehículo --</option>
                          {vehiculosCliente.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.marca || ''} {v.modelo || ''}{v.placa ? ' • ' + v.placa : ''}{v.año ? ' (' + v.año + ')' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {newQuoteForm.email && vehiculosCliente.length === 0 && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">No se encontraron vehículos registrados para este correo. Puedes ingresar el vehículo manualmente.</p>
                    )}

                    {/* Vehículo manual (only when no client vehicles found) */}
                    {vehiculosCliente.length === 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vehículo *</label>
                        <input
                          type="text"
                          placeholder="Toyota Corolla 2020"
                          value={newQuoteForm.vehiculo}
                          onChange={(e) => handleNewQuoteChange('vehiculo', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Servicios *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                        {serviciosList.map(s => {
                          const isSelected = newQuoteForm.servicios?.includes(s.id);
                          return (
                            <label key={s.id} className={`flex items-start gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                checked={isSelected || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setNewQuoteForm(prev => {
                                    const current = prev.servicios || [];
                                    const newServicios = checked ? [...current, s.id] : current.filter(id => id !== s.id);

                                    const selectedItems = serviciosList.filter(item => newServicios.includes(item.id));
                                    const totalManoObra = selectedItems.reduce((acc, item) => acc + item.manoObra, 0);
                                    const totalRefacciones = selectedItems.reduce((acc, item) => acc + item.refacciones, 0);

                                    return {
                                      ...prev,
                                      servicios: newServicios,
                                      manoObra: totalManoObra || '',
                                      refacciones: totalRefacciones || ''
                                    };
                                  });
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-800 leading-tight">{s.nombre}</span>
                                <span className="text-xs text-gray-500 mt-1">${s.total}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mano de obra (MXN) *</label>
                        <input
                          type="number"
                          placeholder="450"
                          value={newQuoteForm.manoObra}
                          onChange={(e) => handleNewQuoteChange('manoObra', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Partes y refacciones (MXN) *</label>
                        <input
                          type="number"
                          placeholder="400"
                          value={newQuoteForm.refacciones}
                          onChange={(e) => handleNewQuoteChange('refacciones', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Válida hasta *</label>
                      <input
                        type="date"
                        value={newQuoteForm.validaHasta}
                        onChange={(e) => handleNewQuoteChange('validaHasta', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>


                {/* Resumen de cotización */}
                <div className="bg-[#f0f7ff] rounded-xl p-5 border border-[#e0f0ff]">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-3">
                    <span className="text-blue-600 font-extrabold text-lg">$</span> Resumen de la cotización
                  </h4>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs text-blue-900">
                      <span>Mano de obra</span>
                      <span className="font-semibold">${newQuoteForm.manoObra || '0'} MXN</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-900">
                      <span>Partes y consumibles</span>
                      <span className="font-semibold">${newQuoteForm.refacciones || '0'} MXN</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-3 border-t border-blue-200/60">
                    <span className="font-bold text-blue-900">Total estimado</span>
                    <span className="font-bold text-blue-700 text-lg">${(Number(newQuoteForm.manoObra) + Number(newQuoteForm.refacciones)) || '0'} MXN</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button onClick={handleCreateQuote} className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm shadow-purple-200">
                  Crear cotización
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
