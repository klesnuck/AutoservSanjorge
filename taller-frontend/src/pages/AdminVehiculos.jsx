import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  return res.json();
}

// ─── Tabla genérica ───────────────────────────────────────────────────────────
function CatalogTable({ columns, rows, onEdit, onDelete, loading }) {
  if (loading) return <p className="text-center text-gray-500 py-10">Cargando...</p>;
  if (!rows.length) return <p className="text-center text-gray-400 py-10 italic">Sin registros</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map(c => (
              <th key={c.key} className="pb-3 text-xs font-semibold text-gray-500 uppercase px-3">{c.label}</th>
            ))}
            <th className="pb-3 text-xs font-semibold text-gray-500 uppercase px-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              {columns.map(c => (
                <td key={c.key} className="py-3 px-3 text-sm text-gray-700">{row[c.key]}</td>
              ))}
              <td className="py-3 px-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(row)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(row)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal simple ─────────────────────────────────────────────────────────────
function SimpleModal({ title, icon, onClose, onSubmit, children, submitLabel }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-lg">{icon}</div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {children}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-[#1a56db] hover:bg-blue-800 rounded-lg transition-colors">
              {submitLabel || 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminVehiculos() {
  const [activeTab, setActiveTab] = useState('marcas');
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Datos de cada catálogo
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [motores, setMotores] = useState([]);
  const [anios, setAnios] = useState([]);

  // Estado del modal
  const [modal, setModal] = useState(null); // { type: 'marca'|'modelo'|'motor'|'anio', item: null|{} }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, mo, mot, a] = await Promise.all([
        apiFetch('/api/catalogo/marcas'),
        apiFetch('/api/catalogo/modelos'),
        apiFetch('/api/catalogo/motores'),
        apiFetch('/api/catalogo/anios'),
      ]);
      setMarcas(m);
      setModelos(mo);
      setMotores(mot);
      setAnios(a);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Filtrado por búsqueda ───────────────────────────────────────────────────
  const filtered = (list, keys) => {
    if (!busqueda.trim()) return list;
    const q = busqueda.toLowerCase();
    return list.filter(item => keys.some(k => String(item[k] ?? '').toLowerCase().includes(q)));
  };

  // ── Abrir modal ─────────────────────────────────────────────────────────────
  const openModal = (type, item = null) => {
    setForm(item ? { ...item } : {});
    setModal({ type, item });
  };

  const closeModal = () => { setModal(null); setForm({}); };

  // ── Guardar (create / update) ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { type, item } = modal;
    const isEditing = !!item?.id;
    try {
      const pathMap = { marca: 'marcas', modelo: 'modelos', motor: 'motores', anio: 'anios' };
      const path = `/api/catalogo/${pathMap[type]}`;
      if (isEditing) {
        await apiFetch(`${path}/${item.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch(path, { method: 'POST', body: JSON.stringify(form) });
      }
      await loadAll();
      closeModal();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ────────────────────────────────────────────────────────────────
  const handleDelete = async (type, item) => {
    const nombres = { marca: 'esta marca', modelo: 'este modelo', motor: 'este motor', anio: 'este año' };
    if (!window.confirm(`¿Eliminar ${nombres[type]}? Esto puede afectar vehículos existentes.`)) return;
    const pathMap = { marca: 'marcas', modelo: 'modelos', motor: 'motores', anio: 'anios' };
    try {
      await apiFetch(`/api/catalogo/${pathMap[type]}/${item.id}`, { method: 'DELETE' });
      await loadAll();
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // ── Configuración de pestañas ───────────────────────────────────────────────
  const tabs = [
    { id: 'marcas',  label: 'Marcas',  icon: '🏷️',  count: marcas.length },
    { id: 'modelos', label: 'Modelos', icon: '🚘',  count: modelos.length },
    { id: 'motores', label: 'Motores', icon: '⚙️',  count: motores.length },
    { id: 'anios',   label: 'Años',    icon: '📅',  count: anios.length },
  ];

  const addLabels = { marcas: 'Agregar marca', modelos: 'Agregar modelo', motores: 'Agregar motor', anios: 'Agregar año' };
  const typeMap   = { marcas: 'marca', modelos: 'modelo', motores: 'motor', anios: 'anio' };

  return (
    <AdminLayout activeTab="catalogo-vehiculos">
      <div className="p-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Catálogo de Vehículos</h2>
            <p className="text-gray-500 text-sm">Gestiona marcas, modelos, motores y años disponibles en el sistema</p>
          </div>
          <button
            onClick={() => openModal(typeMap[activeTab])}
            className="bg-[#1a56db] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 shrink-0"
          >
            <span className="text-lg leading-none">+</span>
            {addLabels[activeTab]}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {tabs.map(t => (
            <div
              key={t.id}
              onClick={() => { setActiveTab(t.id); setBusqueda(''); }}
              className={`cursor-pointer rounded-xl border p-4 flex items-center gap-4 transition-all ${activeTab === t.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'}`}
            >
              <span className="text-2xl">{t.icon}</span>
              <div>
                <div className="text-2xl font-bold text-gray-900">{t.count}</div>
                <div className="text-xs text-gray-500">{t.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div className="mb-5 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
            placeholder={`Buscar ${activeTab}...`}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setBusqueda(''); }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === t.id
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{t.icon}</span> {t.label}
                <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 font-bold ${activeTab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">

            {/* MARCAS */}
            {activeTab === 'marcas' && (
              <CatalogTable
                loading={loading}
                columns={[{ key: 'id', label: '#' }, { key: 'nombre', label: 'Nombre de la marca' }]}
                rows={filtered(marcas, ['nombre'])}
                onEdit={row => openModal('marca', row)}
                onDelete={row => handleDelete('marca', row)}
              />
            )}

            {/* MODELOS */}
            {activeTab === 'modelos' && (
              <CatalogTable
                loading={loading}
                columns={[
                  { key: 'id', label: '#' },
                  { key: 'nombre', label: 'Nombre del modelo' },
                  { key: 'marca', label: 'Marca' },
                ]}
                rows={filtered(modelos, ['nombre', 'marca'])}
                onEdit={row => openModal('modelo', row)}
                onDelete={row => handleDelete('modelo', row)}
              />
            )}

            {/* MOTORES */}
            {activeTab === 'motores' && (
              <CatalogTable
                loading={loading}
                columns={[{ key: 'id', label: '#' }, { key: 'nombre', label: 'Tipo de motor' }]}
                rows={filtered(motores, ['nombre'])}
                onEdit={row => openModal('motor', row)}
                onDelete={row => handleDelete('motor', row)}
              />
            )}

            {/* AÑOS */}
            {activeTab === 'anios' && (
              <CatalogTable
                loading={loading}
                columns={[{ key: 'id', label: '#' }, { key: 'anio', label: 'Año' }]}
                rows={filtered(anios, ['anio'])}
                onEdit={row => openModal('anio', row)}
                onDelete={row => handleDelete('anio', row)}
              />
            )}

          </div>
        </div>
      </div>

      {/* ─── MODALES ─────────────────────────────────────────────────────────── */}

      {/* Modal Marca */}
      {modal?.type === 'marca' && (
        <SimpleModal
          title={modal.item ? 'Editar marca' : 'Nueva marca'}
          icon="🏷️"
          onClose={closeModal}
          onSubmit={handleSubmit}
          submitLabel={saving ? 'Guardando...' : (modal.item ? 'Guardar cambios' : 'Agregar marca')}
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre de la marca <span className="text-red-500">*</span></label>
            <input
              type="text" required autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: Toyota, Ford, Honda..."
              value={form.nombre || ''}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
        </SimpleModal>
      )}

      {/* Modal Modelo */}
      {modal?.type === 'modelo' && (
        <SimpleModal
          title={modal.item ? 'Editar modelo' : 'Nuevo modelo'}
          icon="🚘"
          onClose={closeModal}
          onSubmit={handleSubmit}
          submitLabel={saving ? 'Guardando...' : (modal.item ? 'Guardar cambios' : 'Agregar modelo')}
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Marca <span className="text-red-500">*</span></label>
            <select
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={form.idmarcas || form.idMarcas || ''}
              onChange={e => setForm({ ...form, idMarcas: e.target.value, idmarcas: e.target.value })}
            >
              <option value="">Seleccionar marca</option>
              {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del modelo <span className="text-red-500">*</span></label>
            <input
              type="text" required autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: Corolla, Mustang, Civic..."
              value={form.nombre || ''}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
        </SimpleModal>
      )}

      {/* Modal Motor */}
      {modal?.type === 'motor' && (
        <SimpleModal
          title={modal.item ? 'Editar motor' : 'Nuevo motor'}
          icon="⚙️"
          onClose={closeModal}
          onSubmit={handleSubmit}
          submitLabel={saving ? 'Guardando...' : (modal.item ? 'Guardar cambios' : 'Agregar motor')}
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de motor <span className="text-red-500">*</span></label>
            <input
              type="text" required autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: 1.6L Turbo, 2.0L Gasolina, Híbrido..."
              value={form.nombre || ''}
              onChange={e => setForm({ ...form, nombre: e.target.value, tipo_motor: e.target.value })}
            />
          </div>
        </SimpleModal>
      )}

      {/* Modal Año */}
      {modal?.type === 'anio' && (
        <SimpleModal
          title={modal.item ? 'Editar año' : 'Nuevo año'}
          icon="📅"
          onClose={closeModal}
          onSubmit={handleSubmit}
          submitLabel={saving ? 'Guardando...' : (modal.item ? 'Guardar cambios' : 'Agregar año')}
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Año <span className="text-red-500">*</span></label>
            <input
              type="number" required autoFocus
              min="1950" max="2030"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: 2024"
              value={form.anio || ''}
              onChange={e => setForm({ ...form, anio: e.target.value })}
            />
          </div>
        </SimpleModal>
      )}

    </AdminLayout>
  );
}
