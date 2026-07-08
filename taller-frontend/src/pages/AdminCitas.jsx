import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useToast } from '../components/Toast';
import { fetchCitas, updateCita, createCitaCompleta, fetchServicios, fetchVehiculos, deleteCita, fetchMarcas, fetchModelosByMarca, fetchAnios, fetchMotores, fetchUsers } from '../utils/api';

const generateFechas = () => {
  const fechas = [];
  const diasSemana = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const mesesAbrev = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  let d = new Date();
  d.setDate(d.getDate() + 1); // Empezar desde mañana

  while (fechas.length < 8) {
    if (d.getDay() !== 0) { // Omitir domingos
      fechas.push({
        diaSemana: diasSemana[d.getDay()],
        dia: String(d.getDate()),
        mes: mesesAbrev[d.getMonth()],
        year: d.getFullYear()
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return fechas;
};

const fechasDisponibles = generateFechas();
export default function AdminCitas() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);

  // Appointments state
  const [citas, setCitas] = useState([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [catMarcas, setCatMarcas] = useState([]);
  const [catModelos, setCatModelos] = useState([]);
  const [catAnios, setCatAnios] = useState([]);
  const [catMotores, setCatMotores] = useState([]);

  // Modal State
  const [selectedFecha, setSelectedFecha] = useState(null);
  const [selectedHora, setSelectedHora] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    marca: '',
    idMarcas: '',
    modelo: '',
    idModelos: '',
    ano: '',
    idAnio: '',
    motor: '',
    idMotores: '',
    placa: '',
    servicios: [],
    notas: ''
  });
  const [clientVehicles, setClientVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [editingCitaId, setEditingCitaId] = useState(null);
  const [viewingCita, setViewingCita] = useState(null);

  // Reagendar modal
  const [reagendarCita, setReagendarCita] = useState(null); // cita a reagendar
  const [fechaReagendar, setFechaReagendar] = useState(null);

  const loadCitas = async () => {
    try {
      const data = await fetchCitas();
      const enriched = data.map((item) => {
        let extrCliente = item.cliente;
        let extrVehiculo = item.vehiculo;
        let extrServicio = item.servicio;
        let extrTelefono = item.telefono;
        let extrEmail = item.email;

        if (item.nota && item.nota.includes('Cliente:')) {
           const parts = item.nota.split(' | ');
           parts.forEach(p => {
             if (p.startsWith('Cliente:')) {
               const cInfo = p.replace('Cliente:', '').split('-');
               if (!item.cliente || item.cliente === 'Cliente sin nombre') extrCliente = cInfo[0].trim();
               if (!item.telefono && cInfo[1]) {
                   const t = cInfo[1].trim();
                   if (t.includes('@')) extrEmail = t; else extrTelefono = t;
               }
             }
             if (p.startsWith('Vehículo:')) {
               if (!item.vehiculo || item.vehiculo === 'Vehículo no definido' || !item.vehiculo.trim()) extrVehiculo = p.replace('Vehículo:', '').trim();
             }
             if (p.startsWith('Servicios:')) {
               if (!item.servicio || item.servicio === 'Servicio no definido') extrServicio = p.replace('Servicios:', '').trim();
             }
           });
        }

        const finalCliente = extrCliente && extrCliente.trim() !== '' ? extrCliente : 'Cliente sin nombre';

        return {
          ...item,
          cliente: finalCliente,
          vehiculo: extrVehiculo || 'Vehículo no definido',
          servicio: extrServicio || 'Servicio no definido',
          telefono: extrTelefono || '',
          email: extrEmail || '',
          avatar: finalCliente.charAt(0).toUpperCase(),
          estado: item.estado || 'Pendiente',
          fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : 'Sin fecha',
          hora: item.hora || 'Sin hora',
          costo: item.costo || 0,
        };
      });
      setCitas(enriched);
    } catch (error) {
      console.error('Error cargando citas:', error);
      setCitas([]);
    }
  };

  useEffect(() => {
    loadCitas();
    fetchUsers().then(data => setAllUsers(data || [])).catch(() => setAllUsers([]));
    fetchServicios().then(data => setServiciosDisponibles(data || [])).catch(() => setServiciosDisponibles([]));
    fetchVehiculos().then(data => setAllVehicles(data || [])).catch(() => setAllVehicles([]));
    fetchMarcas().then(data => setCatMarcas(data || [])).catch(() => setCatMarcas([]));
    fetchAnios().then(data => setCatAnios(data || [])).catch(() => setCatAnios([]));
    fetchMotores().then(data => setCatMotores(data || [])).catch(() => setCatMotores([]));
  }, []);

  useEffect(() => {
    if (formData.idMarcas) {
      fetchModelosByMarca(formData.idMarcas)
        .then(data => setCatModelos(data || []))
        .catch(() => setCatModelos([]));
    } else {
      setCatModelos([]);
    }
  }, [formData.idMarcas]);

  const handleUpdateCita = async (id, updates) => {
    try {
      await updateCita(id, updates);
      loadCitas();
    } catch (error) {
      console.error('Error actualizando cita:', error);
      toast.error('No se pudo actualizar la cita. Por favor, inténtalo de nuevo.');
    }
  };

  const handleReagendar = (cita) => {
    setReagendarCita(cita);
    setFechaReagendar(null);
  };

  const confirmarReagendado = async () => {
    if (!fechaReagendar) { toast.warning('Selecciona una fecha primero.'); return; }
    const meses = { Ene: '01', Feb: '02', Mar: '03', Abr: '04', May: '05', Jun: '06', Jul: '07', Ago: '08', Sep: '09', Oct: '10', Nov: '11', Dic: '12' };
    const fechaStr = `${fechaReagendar.year}-${meses[fechaReagendar.mes]}-${fechaReagendar.dia.padStart(2, '0')}`;
    await handleUpdateCita(reagendarCita.id, { estado: 'Reagendada', fecha: fechaStr });
    toast.success(`Cita reagendada para el ${fechaReagendar.dia} de ${fechaReagendar.mes} de ${fechaReagendar.year}.`, '¡Reagendado!');
    setReagendarCita(null);
    setFechaReagendar(null);
  };

  const handleDeleteCita = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta cita permanentemente? Esta acción no se puede deshacer.")) {
      try {
        await deleteCita(id);
        loadCitas();
      } catch (err) {
        console.error(err);
        toast.error('Error al eliminar la cita.');
      }
    }
  };

  const getBadgeColor = (estado) => {
    switch (estado) {
      case 'Confirmada': return 'bg-[#d1fae5] text-[#065f46]';
      case 'Pendiente': return 'bg-[#fef3c7] text-[#92400e]';
      case 'Cancelada': return 'bg-[#fee2e2] text-[#991b1b]';
      case 'Reagendada': return 'bg-[#e0f2fe] text-[#0369a1]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const nextStep = () => setModalStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setModalStep(prev => Math.max(prev - 1, 1));
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalStep(1);
      setSelectedFecha(null);
      setSelectedHora('');
      setFormData({ nombre: '', telefono: '', email: '', marca: '', idMarcas: '', modelo: '', idModelos: '', ano: '', idAnio: '', motor: '', idMotores: '', placa: '', servicios: [], notas: '' });
      setClientVehicles([]);
      setSelectedVehicleId('');
      setEditingCitaId(null);
    }, 300);
  };

  const handleEditCitaClick = (cita) => {
    setEditingCitaId(cita.id);
    
    let extrMarca = '';
    let extrModelo = '';
    let extrAno = '';
    let extrNotas = '';
    let extrServicios = [];

    if (cita.nota) {
      const p = cita.nota.split(' | ');
      p.forEach(part => {
          if (part.startsWith('Vehículo:')) {
              const vRaw = part.replace('Vehículo:', '').trim().split(' ');
              extrAno = vRaw.pop() || '';
              extrModelo = vRaw.pop() || '';
              extrMarca = vRaw.join(' ') || '';
          }
          if (part.startsWith('Servicios:')) {
              extrServicios = part.replace('Servicios:', '').split(',').map(s => s.trim());
          }
          if (part.startsWith('Notas:')) {
              extrNotas = part.replace('Notas:', '').trim();
          }
      });
    }

    if (!extrMarca && cita.vehiculo !== 'Vehículo no definido') {
      const vRaw = cita.vehiculo.split(' ');
      extrAno = vRaw.pop() || '';
      extrModelo = vRaw.pop() || '';
      extrMarca = vRaw.join(' ') || '';
    }

    setFormData({
      nombre: cita.cliente !== 'Cliente sin nombre' ? cita.cliente : '',
      telefono: cita.telefono || '',
      email: cita.email || '',
      marca: extrMarca,
      modelo: extrModelo,
      ano: extrAno,
      placa: '',
      servicios: extrServicios.length > 0 ? extrServicios : (cita.servicio !== 'Servicio no definido' ? [cita.servicio] : []),
      notas: extrNotas !== 'Requiere revisión de administrador' ? extrNotas : ''
    });

    if (cita.fecha && cita.fecha !== 'Sin fecha') {
      const parts = cita.fecha.split('/'); 
      if (parts.length === 3) {
        const m = { '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic' };
        setSelectedFecha({
          dia: parts[0].padStart(2, '0'),
          mes: m[parts[1].padStart(2, '0')] || 'Ene',
          year: parts[2],
          diaSemana: 'DÍA'
        });
      }
    }
    
    setModalStep(2);
    setIsModalOpen(true);
  };

  const handleConfirmarCita = async () => {
    try {
      const meses = { Ene: '01', Feb: '02', Mar: '03', Abr: '04', May: '05', Jun: '06', Jul: '07', Ago: '08', Sep: '09', Oct: '10', Nov: '11', Dic: '12' };
      const fechaStr = selectedFecha ? `${selectedFecha.year}-${meses[selectedFecha.mes]}-${selectedFecha.dia.padStart(2, '0')}` : null;

      const newNota = `Cliente: ${formData.nombre} - ${formData.telefono} | Vehículo: ${formData.marca} ${formData.modelo} ${formData.ano} | Servicios: ${formData.servicios.join(', ')}` + (formData.notas ? ` | Notas: ${formData.notas}` : '');

      if (editingCitaId) {
        await updateCita(editingCitaId, {
          nota: newNota,
          fecha: fechaStr || undefined
        });
        toast.success('Los datos de la cita han sido actualizados.', '¡Actualizado!');
      } else {
        const totalEstimado = formData.servicios.reduce((total, sName) => {
          const s = serviciosDisponibles.find(sv => sv.nombre === sName);
          return total + Number(s?.costo || 0);
        }, 0);

        const idServiciosArr = formData.servicios.map(sName => {
          const s = serviciosDisponibles.find(sv => sv.nombre === sName);
          return s ? s.idServicios : null;
        }).filter(id => id !== null);

        await createCitaCompleta({
          cliente: {
            nombre: formData.nombre,
            telefono: formData.telefono,
            email: formData.email
          },
          vehiculo: {
            idVehiculoExistente: selectedVehicleId && selectedVehicleId !== 'nuevo' ? selectedVehicleId : null,
            idMarcas: formData.idMarcas || null,
            idModelos: formData.idModelos || null,
            idAnio: formData.idAnio || null,
            idMotores: formData.idMotores || null,
            placa: formData.placa || ''
          },
          idServicios: idServiciosArr,
          totalEstimado: totalEstimado,
          fecha: fechaStr || new Date().toISOString().slice(0, 10),
          hora: '09:00',
          nota: newNota,
          estado: 'Pendiente'
        });
        toast.success('La cita ha sido agendada exitosamente.', '¡Cita agendada!');
      }
      
      handleCloseModal();
      loadCitas();
    } catch (err) {
      toast.error(err.message, 'Error al guardar la cita');
    }
  };

  return (
    <AdminLayout activeTab="citas">
      <div className="p-8">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Citas</h1>
            <p className="text-gray-500">Administra las citas programadas y su estado</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva cita
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 absolute left-3 top-2.5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input 
              type="text" 
              placeholder="Buscar por cliente o vehículo..." 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="md:w-64 relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 absolute left-3 top-2.5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            <select className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
              <option>Todos los estados</option>
              <option>Confirmada</option>
              <option>Pendiente</option>
              <option>Cancelada</option>
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute right-3 top-3 text-gray-500 pointer-events-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <div className="md:w-64">
            <input 
              type="date" 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
        </div>

        {/* Appointment List */}
        <div className="space-y-4">
          {citas.map(cita => (
            <div key={cita.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
              {/* Badge */}
              <div className="absolute top-6 right-6">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getBadgeColor(cita.estado)}`}>
                  {cita.estado}
                </span>
              </div>

              {/* Top row: Profile */}
              <div className="flex gap-4 items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
                  {cita.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{cita.cliente}</h3>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    {cita.email} <span className="text-gray-300">•</span> {cita.telefono}
                  </div>
                </div>
              </div>

              {/* Grid block */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <div className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider">Vehículo</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677h3.351a.75.75 0 01.696.471z" /></svg>
                    {cita.vehiculo}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider">Servicio</div>
                  <div className="text-sm font-medium text-gray-800">{cita.servicio}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider">Fecha programada</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    {cita.fecha}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider">Costo estimado</div>
                  <div className="text-sm font-bold text-blue-600">${cita.costo}</div>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex justify-between items-center relative z-10">
                <div className="flex gap-2">
                  <button onClick={() => setViewingCita(cita)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Ver detalles</button>
                  <button onClick={() => handleUpdateCita(cita.id, { estado: 'Confirmada' })} className="bg-[#10b981] hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Confirmar</button>
                  <button onClick={() => handleReagendar(cita)} className="bg-[#f59e0b] hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Reagendar</button>
                  <button onClick={() => handleEditCitaClick(cita)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors">Editar</button>
                </div>
                <button onClick={() => handleDeleteCita(cita.id)} className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors">
                  Eliminar cita
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* Moda: Nueva Cita (Multi-step) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">
            
            {/* Modal Header & Stepper */}
            <div className="px-6 py-6 border-b border-gray-100 relative">
              <button onClick={handleCloseModal} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              <h2 className="text-xl font-bold text-gray-900 mb-6">{editingCitaId ? 'Actualizar cita' : 'Agendar nueva cita'}</h2>
              
              <div className="flex justify-center items-center max-w-xl mx-auto">
                {/* Step 1 */}
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${modalStep > 1 ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                    {modalStep > 1 ? '✓' : '1'}
                  </div>
                  <span className={`text-sm font-semibold ${modalStep > 1 ? 'text-green-500' : 'text-blue-600'}`}>Fecha</span>
                </div>
                <div className={`flex-1 h-px mx-4 ${modalStep >= 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                
                {/* Step 2 */}
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${modalStep > 2 ? 'bg-green-500 text-white' : modalStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {modalStep > 2 ? '✓' : '2'}
                  </div>
                  <span className={`text-sm font-semibold ${modalStep > 2 ? 'text-green-500' : modalStep === 2 ? 'text-blue-600' : 'text-gray-400'}`}>Información</span>
                </div>
                <div className={`flex-1 h-px mx-4 ${modalStep >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                
                {/* Step 3 */}
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${modalStep === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                  <span className={`text-sm font-semibold ${modalStep === 3 ? 'text-blue-600' : 'text-gray-400'}`}>Confirmar</span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 relative">
              
              {/* --- STEP 1: Fecha --- */}
              {modalStep === 1 && (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-blue-50/50">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Selecciona la fecha</h3>
                    <p className="text-sm text-gray-500 mt-2">¿Para cuándo deseas agendar el vehículo en el taller?</p>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-300 transition-colors">
                    <label className="block text-sm font-bold text-gray-700 mb-3 text-center">Fecha programada *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {fechasDisponibles.map((f, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedFecha(f)}
                          className={`p-4 rounded-xl border-2 text-center transition-all ${selectedFecha?.dia === f.dia ? 'border-[#1A56DB] bg-blue-50/20' : 'border-gray-100/80 hover:border-gray-300 bg-white'}`}
                        >
                          <div className="text-xs font-bold mb-1 text-gray-500">{f.diaSemana}</div>
                          <div className="text-2xl font-black mb-1 text-gray-900">{f.dia}</div>
                          <div className="text-sm font-medium text-gray-500">{f.mes}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --- STEP 2: Información --- */}
              {modalStep === 2 && (
                <div className="max-w-3xl mx-auto space-y-6">
                  
                  {/* Info Cliente — el correo va PRIMERO como disparador de autocompletado */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Información del cliente</h3>

                    {/* Correo primero — dispara el autocompletado */}
                    <div className="mb-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                        Correo electrónico
                        <span className="ml-1 text-blue-500 font-normal">— ingresa para autocompletar</span>
                      </label>
                      <input
                        type="email"
                        placeholder="juan@email.com"
                        value={formData.email}
                        onChange={e => {
                          const newEmail = e.target.value;
                          setFormData(prev => ({ ...prev, email: newEmail }));

                          if (newEmail.length > 5) {
                            // Buscar en usuarios primero
                            const matchedUser = allUsers.find(u => u.email?.toLowerCase() === newEmail.trim().toLowerCase());
                            
                            // Buscar vehículos asociados (por el email que tipearon)
                            const matchedVehicles = allVehicles.filter(v => {
                              const correo = (v.propietario_correo || v.propietario_email || v.email || '').toLowerCase();
                              return correo === newEmail.trim().toLowerCase();
                            });
                            
                            setClientVehicles(matchedVehicles);

                            if (matchedUser) {
                               setFormData(prev => ({
                                 ...prev,
                                 nombre: matchedUser.name || matchedUser.nombre || prev.nombre,
                                 telefono: matchedUser.phone || matchedUser.telefono || prev.telefono,
                                 marca: '', modelo: '', ano: '', placa: '', idMarcas: '', idModelos: '', idAnio: ''
                               }));
                               setSelectedVehicleId(matchedVehicles.length === 1 ? (matchedVehicles[0].idVehiculos || matchedVehicles[0].id || '') : '');
                            } else if (matchedVehicles.length > 0) {
                               const v = matchedVehicles[0];
                               setFormData(prev => ({
                                 ...prev,
                                 nombre: v.propietario_nombre || v.propietario || v.nombre_propietario || prev.nombre,
                                 telefono: v.propietario_telefono || v.telefono_propietario || v.telefono || prev.telefono,
                                 marca: '', modelo: '', ano: '', placa: '', idMarcas: '', idModelos: '', idAnio: ''
                               }));
                               setSelectedVehicleId(matchedVehicles.length === 1 ? (v.idVehiculos || v.id || '') : '');
                            } else {
                               setSelectedVehicleId('');
                            }
                          } else {
                            setClientVehicles([]);
                            setSelectedVehicleId('');
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {(clientVehicles.length > 0 || allUsers.some(u => u.email?.toLowerCase() === formData.email.trim().toLowerCase())) && formData.email.length > 5 && (
                        <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Cliente encontrado — datos autocompletados
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                          Nombre completo *
                        </label>
                        <input type="text" placeholder="Juan Pérez García" value={formData.nombre} onChange={e=>setFormData({...formData, nombre: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.21-3.91-6.805-6.805l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                          Teléfono *
                        </label>
                        <input type="tel" placeholder="123-456-7890" value={formData.telefono} onChange={e=>setFormData({...formData, telefono: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Info Vehículo */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Información del vehículo</h3>
                    
                    {clientVehicles.length > 1 && (
                      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                        <label className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677h3.351a.75.75 0 01.696.471z" /></svg>
                          Vehículos registrados
                        </label>
                        <p className="text-xs text-blue-700 mb-3">Este cliente tiene múltiples vehículos. Selecciona uno para la cita:</p>
                        <select 
                          value={selectedVehicleId} 
                          onChange={(e) => {
                            const vId = e.target.value;
                            setSelectedVehicleId(vId);
                            if (vId === 'nuevo' || vId === '') {
                               setFormData(prev => ({...prev, marca: '', modelo: '', ano: '', placa: ''}));
                            } else {
                               const v = clientVehicles.find(veh => String(veh.idVehiculos || veh.id || veh.placas) === String(vId));
                               if (v) {
                                 setFormData(prev => ({
                                    ...prev,
                                    marca: v.marca || '',
                                    modelo: v.modelo || '',
                                    ano: v.año || v.anio || '',
                                    placa: v.placas || v.placa || ''
                                 }));
                               }
                            }
                          }}
                          className="w-full border border-blue-200 rounded-lg p-3 text-sm text-blue-900 bg-white focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                        >
                          <option value="">-- Selecciona un vehículo --</option>
                          {clientVehicles.map((v, i) => {
                             const uniqueId = v.idVehiculos || v.id || v.placas || i;
                             return (
                               <option key={uniqueId} value={uniqueId}>
                                 {v.marca} {v.modelo} {v.año || v.anio} ({v.placas || v.placa || 'Sin placa'})
                               </option>
                             );
                          })}
                          <option value="nuevo">+ Registrar nuevo vehículo para esta cita</option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Marca *</label>
                        <select 
                          value={formData.idMarcas} 
                          onChange={(e) => {
                            const id = e.target.value;
                            const m = catMarcas.find(x => String(x.id) === String(id));
                            setFormData({...formData, idMarcas: id, marca: m ? m.nombre : '', idModelos: '', modelo: ''});
                          }} 
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Selecciona una marca...</option>
                          {catMarcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Modelo</label>
                        <select 
                          value={formData.idModelos} 
                          onChange={(e) => {
                            const id = e.target.value;
                            const m = catModelos.find(x => String(x.id) === String(id));
                            setFormData({...formData, idModelos: id, modelo: m ? m.nombre : ''});
                          }} 
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          disabled={!formData.idMarcas}
                        >
                          <option value="">Selecciona un modelo...</option>
                          {catModelos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Año</label>
                        <select 
                          value={formData.idAnio} 
                          onChange={(e) => {
                            const id = e.target.value;
                            const a = catAnios.find(x => String(x.id) === String(id));
                            setFormData({...formData, idAnio: id, ano: a ? a.anio : ''});
                          }} 
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Selecciona el año...</option>
                          {catAnios.map(a => <option key={a.id} value={a.id}>{a.anio}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Motor</label>
                        <select 
                          value={formData.idMotores} 
                          onChange={(e) => {
                            const id = e.target.value;
                            const mt = catMotores.find(x => String(x.id) === String(id));
                            setFormData({...formData, idMotores: id, motor: mt ? mt.nombre : ''});
                          }} 
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Selecciona el motor...</option>
                          {catMotores.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Servicios solicitados *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                        {serviciosDisponibles.length === 0 ? (
                          <p className="text-xs text-gray-400 italic col-span-2">Cargando servicios...</p>
                        ) : (
                          serviciosDisponibles.map((s) => {
                            const isSelected = formData.servicios?.includes(s.nombre);
                            return (
                              <label key={s.id} className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <input
                                  type="checkbox"
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                  checked={isSelected || false}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setFormData(prev => {
                                      const current = prev.servicios || [];
                                      const newServicios = checked ? [...current, s.nombre] : current.filter(item => item !== s.nombre);
                                      return { ...prev, servicios: newServicios };
                                    });
                                  }}
                                />
                                <span className="text-sm font-medium text-gray-800">{s.nombre}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas adicionales</label>
                      <textarea value={formData.notas} onChange={e=>setFormData({...formData, notas: e.target.value})} placeholder="Observaciones sobre el vehículo o el servicio..." className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows="3"></textarea>
                    </div>
                  </div>

                </div>
              )}

              {/* --- STEP 3: Confirmar --- */}
              {modalStep === 3 && (
                <div className="max-w-2xl mx-auto flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 text-[#10b981] rounded-full flex items-center justify-center mb-4 ring-8 ring-green-50/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-8">{editingCitaId ? 'Confirmar actualización' : 'Confirmar cita'}</h3>

                  <div className="w-full bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-inner">
                    
                    <div className="pb-4 mb-4 border-b border-gray-200">
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Fecha programada</div>
                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {selectedFecha ? `${selectedFecha.diaSemana.toLowerCase()}., ${selectedFecha.dia} de ${selectedFecha.mes.toLowerCase()} de ${selectedFecha.year}` : 'Fecha no seleccionada'}
                      </div>
                    </div>

                    <div className="pb-4 mb-4 border-b border-gray-200">
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Cliente</div>
                      <div className="text-sm font-semibold text-gray-900 flex flex-col">
                        <span>{formData.nombre || 'No especificado'}</span>
                        {formData.telefono && <span className="text-gray-500 font-medium">{formData.telefono}</span>}
                        {formData.email && <span className="text-gray-500 font-medium">{formData.email}</span>}
                      </div>
                    </div>

                    <div className="pb-4 mb-4 border-b border-gray-200">
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Vehículo</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formData.marca || 'Marca no especificada'} {formData.modelo} {formData.ano}
                        {formData.placa && <div className="text-gray-500 font-medium mt-0.5">Placa: {formData.placa}</div>}
                      </div>
                    </div>

                    <div className="pb-4 mb-4 border-b border-gray-200">
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Servicios</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formData.servicios && formData.servicios.length > 0 ? (
                          <ul className="list-disc pl-4 space-y-1">
                            {formData.servicios.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        ) : 'No especificado'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Notas</div>
                      <div className="text-sm font-medium text-gray-700 bg-white p-3 rounded border border-gray-200 italic">
                        {formData.notas || 'Sin notas adicionales.'}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex justify-end items-center gap-3">
              {modalStep > 1 && (
                <button onClick={prevStep} className="mr-auto px-5 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                  Atrás
                </button>
              )}
              <button onClick={handleCloseModal} className="px-5 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              
              {modalStep < 3 ? (
                 <button
                  onClick={nextStep}
                  disabled={modalStep === 1 && !selectedFecha}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                    modalStep === 1 && !selectedFecha
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#1A56DB] text-white hover:bg-blue-700'
                  }`}
                 >
                   Continuar
                 </button>
              ) : (
                <button
                  onClick={handleConfirmarCita}
                  className={`px-6 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-sm ${editingCitaId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#10b981] hover:bg-emerald-600'}`}
                >
                  {editingCitaId ? 'Actualizar datos' : 'Confirmar cita'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal: Ver Detalles */}
      {viewingCita && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative">
            
            {/* Header decorativo */}
            <div className={`h-24 absolute top-0 w-full ${getBadgeColor(viewingCita.estado).split(' ')[0]} opacity-20`}></div>
            
            <button onClick={() => setViewingCita(null)} className="absolute right-5 top-5 z-50 text-gray-600 hover:text-gray-900 bg-white/80 hover:bg-white rounded-full p-1.5 backdrop-blur-sm cursor-pointer transition-all shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="p-8 relative z-10 pt-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-3xl shadow-lg shadow-blue-600/30">
                    {viewingCita.avatar}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 leading-none mb-1">{viewingCita.cliente}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block mt-2 ${getBadgeColor(viewingCita.estado)}`}>
                      Estado: {viewingCita.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                
                {/* Contacto */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contacto</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 border border-gray-200">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.21-3.91-6.805-6.805l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      </div>
                      {viewingCita.telefono || 'Sin teléfono'}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 border border-gray-200">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      </div>
                      {viewingCita.email || 'Sin correo electrónico'}
                    </div>
                  </div>
                </div>

                {/* Fecha y Costo */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detalles de Agendado</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 border border-blue-100">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      {viewingCita.fecha} a las {viewingCita.hora}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-green-600">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-500 border border-green-200">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      Costo estimado: ${viewingCita.costo}
                    </div>
                  </div>
                </div>

                {/* Vehículo */}
                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehículo</h4>
                  <div className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677h3.351a.75.75 0 01.696.471z" /></svg>
                    {viewingCita.vehiculo}
                  </div>
                </div>

                {/* Servicios */}
                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Servicios solicitados</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingCita.servicio.split(',').map((s, i) => (
                      <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-lg border border-blue-200">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notas */}
                {viewingCita.nota && viewingCita.nota.includes('Notas:') && (
                  <div className="md:col-span-2 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notas adicionales</h4>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm text-gray-600 italic">
                      "{viewingCita.nota.split('Notas:')[1].trim()}"
                    </div>
                  </div>
                )}

              </div>

              <div className="mt-8 flex justify-end">
                <button onClick={() => setViewingCita(null)} className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors shadow-lg shadow-gray-900/30">
                  Cerrar detalles
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reagendar cita ── */}
      {reagendarCita && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Reagendar cita</h3>
                  <p className="text-xs text-gray-500">{reagendarCita.cliente}</p>
                </div>
              </div>
              <button onClick={() => { setReagendarCita(null); setFechaReagendar(null); }} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body — fecha selector */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Selecciona la nueva fecha para esta cita:</p>
              <div className="grid grid-cols-4 gap-3">
                {fechasDisponibles.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFechaReagendar(f)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      fechaReagendar?.dia === f.dia && fechaReagendar?.mes === f.mes
                        ? 'border-amber-400 bg-amber-50 shadow-sm shadow-amber-200'
                        : 'border-gray-100 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-gray-400 mb-1">{f.diaSemana}</div>
                    <div className="text-xl font-black text-gray-900">{f.dia}</div>
                    <div className="text-xs font-medium text-gray-500">{f.mes}</div>
                  </button>
                ))}
              </div>

              {fechaReagendar && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Nueva fecha: {fechaReagendar.diaSemana} {fechaReagendar.dia} de {fechaReagendar.mes} {fechaReagendar.year}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => { setReagendarCita(null); setFechaReagendar(null); }}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarReagendado}
                disabled={!fechaReagendar}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-lg transition ${fechaReagendar ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                Confirmar reagendado
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
