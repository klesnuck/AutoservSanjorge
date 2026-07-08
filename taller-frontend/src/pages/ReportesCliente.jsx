import React, { useState, useEffect, useContext } from 'react';
import logo from '../assets/logg.png';
import { fetchMantenimientos } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

export default function ReportesCliente() {
  const { currentUser } = useContext(AuthContext);
  const [serviciosVehiculo, setServiciosVehiculo] = useState([]);
  const [printingServiceId, setPrintingServiceId] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    fetchMantenimientos()
      .then(data => {
        const completados = data.filter(m => m.estado === 'Completado' && m.cliente_email === currentUser.email);
        const mapped = completados.map(m => ({
          id: m.id,
          titulo: m.servicios && m.servicios.length > 0 
            ? m.servicios.map(s => s.nombre).join(', ') 
            : 'Mantenimiento General',
          fecha: new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
          kilometraje: `${m.kilometraje || 0} km`,
          tecnico: m.tecnico || 'Técnico asignado',
          observaciones: m.observaciones || 'Servicio realizado satisfactoriamente.',
          costo: `$${m.costo_final} MXN`,
          refacciones: m.productos ? m.productos.map(p => ({ nombre: p.nombre, cantidad: p.cantidad, precio: p.precio })) : [],
          cliente: m.cliente_nombre || 'Cliente San Jorge',
          vehiculoMarca: m.vehiculo_marca || '',
          vehiculoModelo: m.vehiculo_modelo || '',
          placa: m.vehiculo_placa || 'S/N'
        }));
        setServiciosVehiculo(mapped);
      })
      .catch(console.error);
  }, []);

  const handlePrint = (id) => {
    setPrintingServiceId(id);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 py-12 text-left">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes del vehículo</h1>
          <p className="text-gray-500">Acceso completo al historial de mantenimiento y servicios realizados a tu vehículo.</p>
        </div>

        {/* Vehicle Info Card */}
        <div className="bg-[#1a56db] rounded-2xl p-8 text-white mb-10 shadow-lg shadow-blue-900/10 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 p-8 opacity-5 text-[10rem] leading-none pointer-events-none transform translate-x-1/4 -translate-y-1/4">
            🚗
          </div>
          
          <div className="relative z-10 w-full mb-6 md:mb-0">
            <h2 className="text-2xl font-bold mb-4">
              {serviciosVehiculo.length > 0 ? `${serviciosVehiculo[0].vehiculoMarca} ${serviciosVehiculo[0].vehiculoModelo}` : 'Vehículo del cliente'}
            </h2>
            <div className="space-y-1.5 text-blue-100 text-sm">
              <p>Placa: <span className="text-white font-medium">{serviciosVehiculo.length > 0 ? serviciosVehiculo[0].placa : '---'}</span></p>
              <p>Kilometraje reciente: <span className="text-white font-medium">{serviciosVehiculo.length > 0 ? serviciosVehiculo[0].kilometraje : '---'}</span></p>
            </div>
          </div>

          <div className="relative z-10 text-right shrink-0 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-blue-500/50 md:border-none">
            <div className="text-5xl font-light mb-1">{serviciosVehiculo.length}</div>
            <div className="text-blue-100 text-sm">Servicios realizados</div>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-6">
          {serviciosVehiculo.map((servicio) => (
            <div key={servicio.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              
              {/* Card Header */}
              <div className="p-6 pb-5 flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-[#1a56db] rounded-xl flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{servicio.titulo}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {servicio.fecha} <span className="mx-1">•</span> {servicio.kilometraje}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 mb-1">{servicio.costo}</div>
                  <button 
                    onClick={() => handlePrint(servicio.id)}
                    className="text-[#1a56db] hover:text-blue-800 text-xs font-semibold flex items-center justify-end gap-1 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Descargar PDF
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Card Body Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Técnico responsable</p>
                  <p className="text-sm font-medium text-gray-800">{servicio.tecnico}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Observaciones</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{servicio.observaciones}</p>
                </div>
              </div>

              {/* Tag Pills */}
              <div className="p-6 pt-0">
                <p className="text-xs text-gray-400 mb-3">Partes y refacciones utilizadas</p>
                <div className="flex flex-wrap gap-2">
                  {servicio.refacciones.map((ref, idx) => (
                    <span key={idx} className="bg-blue-50 text-[#1a56db] text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100">
                      {ref.cantidad}x {ref.nombre}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* PRINT VERSION */}
      <div className="hidden print:block absolute inset-0 bg-white w-full text-black">
        <style>{`
          @media print {
            body { 
              background-color: white !important; 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
            }
            @page { margin: 0; size: letter; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>
        
        {printingServiceId && (
          <div className="p-12 max-w-[21cm] mx-auto min-h-screen bg-white">
            
            {/* Header */}
            <div className="flex items-center gap-6 border-b-2 border-gray-100 pb-6 mb-4">
              <img src={logo} alt="San Jorge Logo" className="h-20 object-contain" />
              <div>
                <h1 className="text-3xl font-black text-gray-700 tracking-tight leading-none mb-1">AUTO SERVICIO</h1>
                <h2 className="text-3xl font-black text-[#1a56db] tracking-tight leading-none mb-1">
                  SAN JORGE <span className="text-lg text-gray-600 font-bold uppercase">S.A. de C.V.</span>
                </h2>
                <p className="text-xs font-semibold text-gray-800">Calle 10 No. 505 | Tel: (55) 1234 5678 | autoserviciosanjorge.com</p>
              </div>
            </div>

            {/* Red Title Area */}
            <div className="bg-[#b91c1c] text-white text-center py-1.5 font-bold uppercase tracking-widest text-lg mb-4">
              Orden de Trabajo
            </div>

            {/* Client / Vehicle info matching the screenshot form */}
            <div className="flex justify-between text-sm font-bold mb-6 pt-2">
              <div className="w-[45%] space-y-4">
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="w-24">CLIENTE:</span>
                  <span className="font-normal font-serif italic text-base">{serviciosVehiculo.find(s => s.id === printingServiceId)?.cliente}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="w-24">VEHÍCULO:</span>
                  <span className="font-normal font-serif italic text-base">{serviciosVehiculo.find(s => s.id === printingServiceId)?.vehiculoMarca} {serviciosVehiculo.find(s => s.id === printingServiceId)?.vehiculoModelo}</span>
                </div>
              </div>
              <div className="w-[45%] space-y-4">
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="w-24">TELÉFONO:</span>
                  <span className="font-normal font-serif italic text-base">Registrado en sistema</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="w-24">PLACA:</span>
                  <span className="font-normal font-serif italic text-base uppercase tracking-wider">{serviciosVehiculo.find(s => s.id === printingServiceId)?.placa}</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-sm border-2 border-gray-500 mb-6">
              <thead>
                <tr className="bg-[#1e3a8a] text-white text-xs uppercase tracking-wider">
                  <th className="border border-gray-500 p-2 w-[10%] text-center font-bold">CANT.</th>
                  <th className="border border-gray-500 p-2 w-[55%] text-left font-bold">DESCRIPCIÓN DEL TRABAJO / REFACCIÓN</th>
                  <th className="border border-gray-500 p-2 w-[15%] text-center font-bold">COSTO ESTIM.</th>
                  <th className="border border-gray-500 p-2 w-[20%] text-center font-bold">ESTADO</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-gray-800">
                {/* Dynamically get the current service's parts */}
                {serviciosVehiculo.find(s => s.id === printingServiceId)?.refacciones.map((refaccion, idx) => (
                  <tr key={idx} className="border-b border-gray-400">
                    <td className="border-r border-gray-400 p-2.5 text-center">{refaccion.cantidad}</td>
                    <td className="border-r border-gray-400 p-2.5 uppercase">{refaccion.nombre}</td>
                    <td className="border-r border-gray-400 p-2.5 text-center">${Number(refaccion.precio || 0).toLocaleString()} MXN</td>
                    <td className="p-2.5 text-center flex items-center justify-between px-4">
                      <span>Completado</span>
                      <div className="w-4 h-4 border border-gray-500 flex items-center justify-center bg-gray-200 text-xs">✓</div>
                    </td>
                  </tr>
                ))}
                {/* Add the main service itself as a row */}
                <tr className="border-b border-gray-400">
                  <td className="border-r border-gray-400 p-2.5 text-center">1</td>
                  <td className="border-r border-gray-400 p-2.5 uppercase">{serviciosVehiculo.find(s => s.id === printingServiceId)?.titulo}</td>
                  <td className="border-r border-gray-400 p-2.5 text-center">{serviciosVehiculo.find(s => s.id === printingServiceId)?.costo}</td>
                  <td className="p-2.5 text-center flex items-center justify-between px-4">
                    <span>Completado</span>
                    <div className="w-4 h-4 border border-gray-500 flex items-center justify-center bg-gray-200 text-xs">✓</div>
                  </td>
                </tr>
                {/* Visual filler rows to make it look like a physical form */}
                {[...Array(3)].map((_, i) => (
                  <tr key={`fill-${i}`} className="border-b border-gray-400 h-10">
                    <td className="border-r border-gray-400 p-2"></td>
                    <td className="border-r border-gray-400 p-2"></td>
                    <td className="border-r border-gray-400 p-2"></td>
                    <td className="p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Technician Notes */}
            <div className="mb-14">
              <p className="font-bold text-sm mb-1">NOTAS DEL TÉCNICO:</p>
              <div className="border-b border-gray-400 pb-1 mb-3">
                <p className="font-serif italic text-lg leading-none -mb-1 px-4 text-gray-700">
                  {serviciosVehiculo.find(s => s.id === printingServiceId)?.observaciones}
                </p>
              </div>
              <div className="border-b border-gray-400 pb-5 mb-3"></div>
              <div className="border-b border-gray-400 pb-5"></div>
            </div>

            {/* Signatures & Footer info */}
            <div className="flex justify-between items-end px-12">
              <div className="w-[40%] text-center">
                <div className="h-16 flex items-end justify-center pb-2 relative">
                   <div className="font-serif italic text-4xl text-blue-900 absolute -bottom-2 -rotate-[6deg] opacity-80">Juan</div>
                </div>
                <div className="border-t border-gray-500 pt-1 font-bold text-xs">FIRMA DE CONFORMIDAD DEL CLIENTE</div>
              </div>
              <div className="w-[40%] text-center">
                <div className="h-16 flex items-end justify-center pb-2 relative">
                   <div className="font-serif italic text-4xl text-gray-800 absolute -bottom-2 rotate-[4deg] opacity-70">JP</div>
                </div>
                <div className="border-t border-gray-500 pt-1 font-bold text-xs">FIRMA DEL TÉCNICO</div>
              </div>
            </div>

            {/* Date and KM */}
            <div className="mt-8 flex justify-end gap-6 text-sm font-bold border-b border-gray-400 pb-1 w-[40%] ml-auto pr-4">
              <span>FECHA: {serviciosVehiculo.find(s => s.id === printingServiceId)?.fecha}</span>
              <span>KM: {serviciosVehiculo.find(s => s.id === printingServiceId)?.kilometraje.replace(' km', '')}</span>
            </div>

            {/* Red footer bar */}
            <div className="bg-[#b91c1c] h-3 w-full mt-4"></div>

          </div>
        )}
      </div>

    </div>
  );
}
