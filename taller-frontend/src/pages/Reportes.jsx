import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import logo from '../assets/logg.png';
import { fetchReporteVentas, fetchReporteProductos, fetchReporteServicios } from '../utils/api';

const carWatermark = "https://www.transparenttextures.com/patterns/stardust.png";

export default function Reportes() {
  const [activeReportTab, setActiveReportTab] = useState('productos');

  const [dataVentas, setDataVentas] = useState([]);
  const [prodStats, setProdStats] = useState({ valorInventario: 0, productosVendidosMes: 0, ingresosTotales: 0 });
  const [rendimientoProductos, setRendimientoProductos] = useState([]);
  const [servStats, setServStats] = useState({ serviciosRealizados: 0, ingresosPorServicios: 0, ticketPromedio: 0 });
  const [distribucionServicios, setDistribucionServicios] = useState([]);

  // Estado para expandir detalle de venta
  const [expandedVentaId, setExpandedVentaId] = useState(null);

  const toggleVentaDetalle = (id) => {
    setExpandedVentaId(expandedVentaId === id ? null : id);
  };

  // Filtros de fecha
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroAplicado, setFiltroAplicado] = useState(false);

  // Datos filtrados de ventas
  const ventasFiltradas = (() => {
    if (!filtroAplicado || (!fechaInicio && !fechaFin)) return dataVentas;
    return dataVentas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      const desde = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : null;
      const hasta = fechaFin   ? new Date(fechaFin   + 'T23:59:59') : null;
      if (desde && fechaVenta < desde) return false;
      if (hasta && fechaVenta > hasta) return false;
      return true;
    });
  })();

  useEffect(() => {
    fetchReporteVentas().then(setDataVentas).catch(console.error);
    fetchReporteProductos().then(res => {
      setProdStats({
        valorInventario: res.valorInventario || 0,
        productosVendidosMes: res.productosVendidosMes || 0,
        ingresosTotales: res.ingresosTotales || 0
      });
      setRendimientoProductos(res.rendimiento || []);
    }).catch(console.error);
    fetchReporteServicios().then(res => {
      setServStats({
        serviciosRealizados: res.serviciosRealizados || 0,
        ingresosPorServicios: res.ingresosPorServicios || 0,
        ticketPromedio: res.ticketPromedio || 0
      });
      setDistribucionServicios(res.distribucion || []);
    }).catch(console.error);
  }, []);

  const handleGenerarReporte = () => {
    setFiltroAplicado(true);
  };

  const handleLimpiarFiltro = () => {
    setFechaInicio('');
    setFechaFin('');
    setFiltroAplicado(false);
  };

  // Helpers for Services Pie Chart
  const pieColors = ['#1A56DB', '#a855f7', '#f59e0b', '#10b981'];
  const top4Services = distribucionServicios.slice(0, 4);
  const totalTop4 = top4Services.reduce((acc, s) => acc + s.cantidad, 0) || 1;
  let currentPiePercent = 0;
  
  const conicGradientString = top4Services.map((s, i) => {
    const p = Math.round((s.cantidad / totalTop4) * 100);
    const start = currentPiePercent;
    currentPiePercent += p;
    // ensure last slice closes exactly at 100%
    const end = (i === top4Services.length - 1) ? 100 : currentPiePercent;
    return `${pieColors[i]} ${start}% ${end}%`;
  }).join(', ');

  const pieLabelsPos = [
    { class: "top-10 right-4", colorClass: "text-[#1A56DB]" },
    { class: "bottom-10 -right-2", colorClass: "text-[#a855f7]" },
    { class: "bottom-0 left-12", colorClass: "text-[#f59e0b]" },
    { class: "top-1/2 -left-8 -translate-y-1/2", colorClass: "text-[#10b981]" }
  ];

  return (
    <AdminLayout activeTab="reportes">
      <div className="p-8 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Reportes</h1>
            <p className="text-gray-500 text-sm">Análisis general del negocio</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="bg-[#1a56db] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors flex items-center gap-2 print:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar reportes
          </button>
        </div>

        {/* Tabs Container */}
        <div className="bg-white rounded-xl border border-gray-100 p-2 flex gap-2 mb-8 shadow-sm print:hidden">
          <button 
            onClick={() => setActiveReportTab('ventas')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-colors ${activeReportTab === 'ventas' ? 'bg-[#1a56db] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            Reporte de Ventas
          </button>
          
          <button 
            onClick={() => setActiveReportTab('servicios')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-colors ${activeReportTab === 'servicios' ? 'bg-[#1a56db] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.492-3.053c.217-.266.154-.657-.14-.803l-1.071-.536c-.286-.143-.604-.045-.769.215l-1.574 2.443-1.421-1.421 2.443-1.574c.26-.165.358-.483.215-.769l-.536-1.071c-.146-.294-.537-.357-.803-.14l-3.053 2.492M11.42 15.17l-3.218 3.218A2.652 2.652 0 012.25 15.17l3.218-3.218" />
            </svg>
            Reporte de Servicios
          </button>
          
          <button 
            onClick={() => setActiveReportTab('productos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-colors ${activeReportTab === 'productos' ? 'bg-[#1a56db] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            Reporte de Productos
          </button>
        </div>

        {/* --- CONTENIDO DE LAS PESTAÑAS --- */}

        {/* PESTAÑA PRODUCTOS */}
        {activeReportTab === 'productos' && (
          <div className="space-y-6 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 mb-4 font-semibold text-[11px] uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                  Valor Inventario
                </div>
                <div className="text-[2rem] font-bold text-gray-900 leading-tight">${prodStats.valorInventario.toLocaleString('en-US', {minimumFractionDigits: 0})}</div>
                <div className="text-sm text-gray-500 mt-1">Total en productos</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
                <div className="flex items-center gap-2 text-green-500 mb-4 font-semibold text-[11px] uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                  Productos Vendidos
                </div>
                <div className="text-[2rem] font-bold text-gray-900 leading-tight">{prodStats.productosVendidosMes}</div>
                <div className="text-sm text-gray-500 mt-1">Unidades este mes</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
                <div className="flex items-center gap-2 text-purple-600 mb-4 font-semibold text-[11px] uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                  Ingresos por Productos
                </div>
                <div className="text-[2rem] font-bold text-gray-900 leading-tight">${prodStats.ingresosTotales.toLocaleString('en-US', {minimumFractionDigits: 0})}</div>
                <div className="text-sm text-green-500 mt-1 font-medium">Total generado</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-8">Rendimiento de Productos</h3>
              
              <div className="space-y-8">
                {rendimientoProductos.map((prod) => (
                  <div key={prod.id}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 text-[#1a56db] rounded-lg flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{prod.nombre}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Stock: {prod.stock} unidades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#1a56db] text-sm">{prod.total}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{prod.ventas} ventas</div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1a56db] rounded-full" style={{ width: (prod.progress || '').replace('w-[', '').replace(']', '') }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA VENTAS */}
        {activeReportTab === 'ventas' && (
          <div className="space-y-6 print:hidden">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Fecha inicio</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                    value={fechaInicio}
                    onChange={e => { setFechaInicio(e.target.value); setFiltroAplicado(false); }}
                  />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Fecha fin</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                    value={fechaFin}
                    onChange={e => { setFechaFin(e.target.value); setFiltroAplicado(false); }}
                    min={fechaInicio || undefined}
                  />
               </div>
               <div className="flex items-end">
                  <button
                    onClick={handleGenerarReporte}
                    className="w-full bg-[#1a56db] text-white p-2.5 rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors"
                  >
                    Generar Reporte
                  </button>
               </div>
               <div className="flex items-end">
                  <button
                    onClick={handleLimpiarFiltro}
                    disabled={!filtroAplicado && !fechaInicio && !fechaFin}
                    className="w-full border border-gray-300 bg-white text-gray-600 p-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Limpiar filtro
                  </button>
               </div>
            </div>

            {/* Indicador de filtro activo */}
            {filtroAplicado && (fechaInicio || fechaFin) && (
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                <span className="font-semibold">Filtro activo:</span>
                {fechaInicio && <span>Desde <strong>{new Date(fechaInicio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>}
                {fechaInicio && fechaFin && <span>—</span>}
                {fechaFin && <span>Hasta <strong>{new Date(fechaFin + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>}
                <span className="ml-1 text-blue-600">· {ventasFiltradas.length} resultado{ventasFiltradas.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            <div className="flex gap-6">
              <div className="flex-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Total Ventas</h3>
                <h2 className="text-3xl font-bold text-gray-900">${ventasFiltradas.reduce((acc, v) => acc + v.total, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</h2>
              </div>
              <div className="flex-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Número Ventas</h3>
                <h2 className="text-3xl font-bold text-gray-900">{ventasFiltradas.length}</h2>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="mb-6 font-bold text-lg text-gray-900">Historial de Ventas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-semibold text-gray-500 px-2">ID</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 px-2">Cliente</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 px-2">Servicio / Producto</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 px-2">Fecha</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 px-2">Total</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 px-2">Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasFiltradas.map((v) => (
                      <React.Fragment key={v.id}>
                        <tr className={`border-b border-gray-100 hover:bg-gray-50 ${expandedVentaId === v.id ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-4 px-2 text-sm font-medium text-gray-900">{v.id}</td>
                          <td className="py-4 px-2 text-sm text-gray-600">{v.cliente}</td>
                          <td className="py-4 px-2 text-sm text-gray-600">
                            <button onClick={() => toggleVentaDetalle(v.id)} className="text-[#1a56db] hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors">
                              {expandedVentaId === v.id ? 'Ocultar detalles' : 'Ver detalles'}
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform duration-200 ${expandedVentaId === v.id ? 'rotate-180' : ''}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                          </td>
                          <td className="py-4 px-2 text-sm text-gray-600">{v.fecha}</td>
                          <td className="py-4 px-2 text-sm font-medium text-gray-900">${v.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          <td className="py-4 px-2">
                            <span
                              className={`px-3 py-1 text-white font-semibold rounded-full text-xs uppercase tracking-wide flex w-max ${
                                v.metodo === "efectivo"
                                  ? "bg-green-500"
                                  : v.metodo === "tarjeta"
                                  ? "bg-[#1a56db]"
                                  : "bg-purple-500"
                              }`}
                            >
                              {v.metodo}
                            </span>
                          </td>
                        </tr>
                        {expandedVentaId === v.id && (
                          <tr className="bg-blue-50/30 border-b border-blue-100">
                            <td colSpan="6" className="py-4 px-6 text-sm text-gray-700">
                              <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                                <div className="font-semibold text-gray-900 text-xs uppercase tracking-wide border-b pb-2">Artículos en esta venta:</div>
                                <ul className="list-disc pl-5 space-y-1.5 mt-1">
                                  {v.servicio.split(', ').map((item, idx) => (
                                    <li key={idx} className="text-gray-600">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {ventasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500 text-sm">
                          {filtroAplicado && (fechaInicio || fechaFin)
                            ? 'No hay ventas en el rango de fechas seleccionado.'
                            : 'No hay ventas registradas'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA SERVICIOS */}
        {activeReportTab === 'servicios' && (
          <div className="space-y-6 print:hidden">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 mb-4 font-semibold text-[11px] uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.492-3.053c.217-.266.154-.657-.14-.803l-1.071-.536c-.286-.143-.604-.045-.769.215l-1.574 2.443-1.421-1.421 2.443-1.574c.26-.165.358-.483.215-.769l-.536-1.071c-.146-.294-.537-.357-.803-.14l-3.053 2.492M11.42 15.17l-3.218 3.218A2.652 2.652 0 012.25 15.17l3.218-3.218" />
                  </svg>
                  Servicios Realizados
                </div>
                <div className="text-[2rem] font-bold text-gray-900 leading-tight">{servStats.serviciosRealizados}</div>
                <div className="text-sm text-gray-500 mt-1">Total histórico</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
                <div className="flex items-center gap-2 text-green-500 mb-4 font-semibold text-[11px] uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                  Ingresos por Servicios
                </div>
                <div className="text-[2rem] font-bold text-gray-900 leading-tight">${servStats.ingresosPorServicios.toLocaleString('en-US', {minimumFractionDigits: 0})}</div>
                <div className="text-sm text-green-500 mt-1 font-medium">Total generado</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
                <div className="flex items-center gap-2 text-purple-600 mb-4 font-semibold text-[11px] uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.25 2.25 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  Promedio por Servicio
                </div>
                <div className="text-[2rem] font-bold text-gray-900 leading-tight">${servStats.ticketPromedio.toLocaleString('en-US', {minimumFractionDigits: 0})}</div>
                <div className="text-sm text-gray-500 mt-1">Ticket promedio</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm flex flex-col items-center">
                <h3 className="text-lg font-bold text-gray-900 w-full mb-8">Distribución de Servicios</h3>
                <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
                  
                  <div 
                    className="w-56 h-56 rounded-full"
                    style={{
                      background: top4Services.length > 0 
                        ? `conic-gradient(${conicGradientString})` 
                        : 'conic-gradient(#e5e7eb 0% 100%)'
                    }}
                  ></div>
                  
                  <div className="absolute w-[3px] h-full bg-white rotate-[-4deg]"></div>
                  <div className="absolute w-[3px] h-full bg-white rotate-[80deg]"></div>
                  
                  {top4Services.map((s, i) => (
                    <div key={i} className={`absolute text-sm font-semibold whitespace-nowrap ${pieLabelsPos[i]?.class || ''} ${pieLabelsPos[i]?.colorClass || ''}`}>
                      {s.nombre} {Math.round((s.cantidad / totalTop4) * 100)}%
                    </div>
                  ))}
                  {top4Services.length === 0 && (
                    <div className="absolute text-sm font-semibold text-gray-500">Sin datos</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-8">Servicios más solicitados</h3>
                
                <div className="space-y-6">
                  {distribucionServicios.slice(0, 4).map((s, i) => {
                     const percent = Math.round((s.cantidad / (distribucionServicios[0]?.cantidad || 1)) * 100);
                     return (
                        <div key={i}>
                          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                            <span>{s.nombre}</span>
                            <span className="text-gray-500">{s.cantidad} servicios</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width: `${percent}%`, backgroundColor: pieColors[i % pieColors.length]}}></div>
                          </div>
                        </div>
                     )
                  })}
                  {distribucionServicios.length === 0 && <p className="text-gray-500 text-sm italic">Sin datos registrados</p>}
                </div>

              </div>
            </div>

            {/* Export Bottom Panel */}
            <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-blue-50 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Exportar reportes</h3>
                  <p className="text-sm text-gray-500">Descarga los reportes en diferentes formatos para el análisis externo</p>
                </div>
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 md:flex-none border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
                >
                  Exportar PDF
                </button>
                <button 
                  onClick={() => alert("Simulando exportación a Excel...")}
                  className="flex-1 md:flex-none border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
                >
                  Exportar Excel
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* HIDDEN PRINT VERSIONS (Only visible when printing) */}
      <div className="hidden print:block w-full bg-[#faf9f5] min-h-screen text-black">
        <style>{`
          @media print {
            body { 
              background-color: #fcfbf8 !important; 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: Arial, Helvetica, sans-serif;
            }
            @page { margin: 1cm; }
            .print\\:hidden { display: none !important; }
            aside { display: none !important; }
            header { display: none !important; }
          }
        `}</style>
        
        {/* PRINTABLE HEADER (Shared) */}
        <div className="flex justify-between items-start pt-8 pb-6 border-b-2 border-gray-200">
          <div>
            <img src={logo} alt="San Jorge Logo" className="h-28 object-contain -ml-4" />
          </div>
          <div className="text-right text-sm">
            <h3 className="font-black text-lg">Auto Servicio San Jorge S.A. de C.V.</h3>
            <p>Calle 10, No. 505, Col. Centro,</p>
            <p>San Jorge, Mexico</p>
            <p>Teléfono: +52 1 234 567 890</p>
            <p>www.autoserviciosanjorge.com</p>
          </div>
        </div>

        {/* PRINT CONTENT: VENTAS */}
        {activeReportTab === 'ventas' && (
          <div className="mt-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black tracking-tight mb-1">REPORTE DE VENTAS</h2>
              <p className="text-gray-700 font-medium">Historial de Ventas - Detalle Completo</p>
              <p className="text-gray-600 text-sm mt-1">Fecha generación: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 mb-6 relative z-10">
              <p className="font-bold text-lg">Total de Ventas: <span className="font-normal text-gray-800">${dataVentas.reduce((acc, v) => acc + v.total, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></p>
              <p className="font-bold text-lg">Número de Ventas: <span className="font-normal text-gray-800">{dataVentas.length}</span></p>
            </div>

            <table className="w-full text-center border-collapse border border-gray-300 bg-white">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="p-3 border border-gray-300 font-bold uppercase text-sm">ID VENTA</th>
                  <th className="p-3 border border-gray-300 font-bold uppercase text-sm">CLIENTE</th>
                  <th className="p-3 border border-gray-300 font-bold uppercase text-sm">SERVICIO/PRODUCTO</th>
                  <th className="p-3 border border-gray-300 font-bold uppercase text-sm">FECHA</th>
                  <th className="p-3 border border-gray-300 font-bold uppercase text-sm">TOTAL</th>
                  <th className="p-3 border border-gray-300 font-bold uppercase text-sm">MÉTODO DE PAGO</th>
                </tr>
              </thead>
              <tbody>
                {dataVentas.map((v, i) => (
                  <tr key={v.id} className="border-b border-gray-300 odd:bg-[#f6fcf8] even:bg-white">
                    <td className="p-3 border border-gray-300 text-sm font-medium">{v.id}</td>
                    <td className="p-3 border border-gray-300 text-sm">{v.cliente}</td>
                    <td className="p-3 border border-gray-300 text-sm">{v.servicio}</td>
                    <td className="p-3 border border-gray-300 text-sm">{v.fecha}</td>
                    <td className="p-3 border border-gray-300 text-sm">${v.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    <td className="p-3 border border-gray-300">
                      <div className={`px-2 py-1 mx-auto w-max rounded-full text-xs font-bold border ${v.metodo === 'efectivo' ? 'bg-[#d1fae5] text-[#059669] border-[#a7f3d0]' : v.metodo === 'tarjeta' ? 'bg-[#dbeafe] text-[#2563eb] border-[#bfdbfe]' : 'bg-[#f3e8ff] text-[#9333ea] border-[#e9d5ff]'}`}>
                        {v.metodo === 'efectivo' && '💵 Efectivo'}
                        {v.metodo === 'tarjeta' && '💳 Tarjeta'}
                        {v.metodo === 'transferencia' && '🏦 Transferencia'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-12 flex justify-between text-sm font-bold text-gray-600 border-t pt-4">
              <p>Página 1 de 1</p>
              <p>Total de ventas mostradas en esta página: {dataVentas.length} de {dataVentas.length}</p>
            </div>
          </div>
        )}

        {/* PRINT CONTENT: INVENTARIO */}
        {activeReportTab === 'productos' && (
          <div className="mt-8 relative">
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-3xl font-black tracking-tight mb-1">REPORTE DE INVENTARIO</h2>
              <p className="text-gray-700 font-medium">Inventario Actual del Taller - Detalle Completo</p>
            </div>

            <div className="mb-6 relative z-10 text-sm font-bold border-b-2 border-gray-200 pb-2">
              <p>Filtros Aplicados: <span className="font-normal text-gray-800">Ninguno - Inventario General Completo</span></p>
              <p>Fecha de Generación: <span className="font-normal text-gray-800">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
            </div>

            <table className="w-full text-center border-collapse bg-white relative z-10">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-t-2 border-gray-200">
                  <th className="p-4 font-bold uppercase text-xs">ID PRODUCTO</th>
                  <th className="p-4 font-bold uppercase text-xs text-left">NOMBRE</th>
                  <th className="p-4 font-bold uppercase text-xs">CATEGORÍA</th>
                  <th className="p-4 font-bold uppercase text-xs">STOCK ACTUAL</th>
                  <th className="p-4 font-bold uppercase text-xs">STOCK MÍNIMO</th>
                  <th className="p-4 font-bold uppercase text-xs">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {rendimientoProductos.map((prod, i) => (
                  <tr key={prod.id} className="border-b border-gray-200 odd:bg-[#f8f9fa] even:bg-white">
                    <td className="p-4 text-sm font-medium text-gray-600">PRD-00{prod.id}</td>
                    <td className="p-4 text-sm text-left font-medium">{prod.nombre}</td>
                    <td className="p-4 text-sm text-gray-600">Autopartes</td>
                    <td className="p-4 font-black">{prod.stock}</td>
                    <td className="p-4 text-sm text-gray-500">10</td>
                    <td className="p-4">
                      {prod.stock > 15 ? (
                        <div className="px-3 py-1 bg-[#d1fae5] text-[#065f46] font-bold text-xs rounded-full inline-block">Disponible</div>
                      ) : prod.stock > 8 ? (
                        <div className="px-3 py-1 bg-[#ffedd5] text-[#9a3412] font-bold text-xs rounded-full inline-block">Stock Bajo</div>
                      ) : (
                        <div className="px-3 py-1 bg-[#fee2e2] text-[#991b1b] font-bold text-xs rounded-full inline-block">Crítico</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-12 flex justify-between text-sm font-bold text-gray-600 border-t-2 pt-4">
              <p>Total de productos listados: {rendimientoProductos.length} de {rendimientoProductos.length}</p>
              <p>Página 1 de 1</p>
            </div>
          </div>
        )}

        {/* PRINT CONTENT: SERVICIOS */}
        {activeReportTab === 'servicios' && (
          <div className="mt-8 relative">
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-3xl font-black tracking-tight mb-1">REPORTE DE SERVICIOS</h2>
              <p className="text-gray-700 font-medium">Análisis de Desempeño y Métrica de Servicios</p>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8 relative z-10 text-center">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                 <p className="text-gray-500 text-sm font-bold uppercase mb-2">Servicios Realizados</p>
                 <p className="text-4xl font-black text-blue-600">{servStats.serviciosRealizados}</p>
              </div>
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                 <p className="text-gray-500 text-sm font-bold uppercase mb-2">Ingresos por Servicios</p>
                 <p className="text-4xl font-black text-[#10b981]">${servStats.ingresosPorServicios.toLocaleString('en-US', {minimumFractionDigits: 0})}</p>
              </div>
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                 <p className="text-gray-500 text-sm font-bold uppercase mb-2">Ticket Promedio</p>
                 <p className="text-4xl font-black text-[#a855f7]">${servStats.ticketPromedio.toLocaleString('en-US', {minimumFractionDigits: 0})}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
               <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h3 className="font-bold text-center border-b pb-2 mb-4">DISTRIBUCIÓN DE SERVICIOS</h3>
                  <ul className="space-y-3 font-semibold text-gray-800">
                    {top4Services.map((s, i) => (
                      <li key={i} className="flex justify-between items-center">
                        <span style={{color: pieColors[i]}}>{s.nombre}</span> 
                        <span>{Math.round((s.cantidad / totalTop4) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
               </div>
               <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h3 className="font-bold text-center border-b pb-2 mb-4">SERVICIOS MÁS SOLICITADOS</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {distribucionServicios.slice(0, 4).map((s, i) => (
                        <tr key={i} className="border-b"><td className="py-2.5 font-medium">{s.nombre}</td><td className="text-right font-black" style={{color: pieColors[i]}}>{s.cantidad} svcs</td></tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="mt-12 flex justify-between text-sm font-bold text-gray-600 border-t-2 pt-4">
              <p>Generado electrónicamente desde San Jorge Admin</p>
              <p>Página 1 de 1</p>
            </div>
          </div>
        )}
        
      </div>

    </AdminLayout>
  );
}
