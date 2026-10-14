import React, { useContext, useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { fetchFeatureFlags, updateFeatureFlag } from '../utils/api';

const VARIANT_LABELS = {
  control: 'Control · "Cotizar" (azul)',
  B: 'Variante B · "Agendar cita en 2 minutos" (naranja)',
};

const formatCtr = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

function FlagCard({ flag, token, onRefresh }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState({});

  useEffect(() => {
    const initial = {};
    (flag.variantes || []).forEach((v) => {
      initial[v.id] = v.peso;
    });
    setWeights(initial);
  }, [flag]);

  const totalWeight = Object.values(weights).reduce((acc, w) => acc + (Number(w) || 0), 0);

  const handleToggle = async () => {
    setSaving(true);
    try {
      await updateFeatureFlag(flag.clave, { activo: !flag.activo }, token);
      toast.success(`Experimento ${flag.activo ? 'desactivado' : 'activado'}`);
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el flag');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeights = async () => {
    const variantes = Object.entries(weights).map(([id, peso]) => ({ id, peso: Number(peso) }));
    if (variantes.some((v) => !(v.peso > 0))) {
      toast.warning('Cada variante debe tener un peso mayor a 0');
      return;
    }
    setSaving(true);
    try {
      await updateFeatureFlag(flag.clave, { variantes }, token);
      toast.success('Pesos actualizados');
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'No se pudieron actualizar los pesos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">{flag.clave}</h3>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                flag.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {flag.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {flag.descripcion && <p className="text-sm text-gray-500 mt-1">{flag.descripcion}</p>}
        </div>

        <button
          onClick={handleToggle}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            flag.activo
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {flag.activo ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      {/* Pesos de las variantes */}
      <div className="mt-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Distribución del tráfico</h4>
        <div className="flex flex-wrap items-end gap-4">
          {Object.keys(weights).map((id) => (
            <div key={id} className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">{VARIANT_LABELS[id] || id}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={weights[id]}
                  onChange={(e) => setWeights((prev) => ({ ...prev, [id]: e.target.value }))}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-400">
                  {totalWeight > 0 ? `${Math.round(((Number(weights[id]) || 0) / totalWeight) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          ))}
          <button
            onClick={handleSaveWeights}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Guardar pesos
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="mt-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Resultados</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-6 font-medium">Variante</th>
                <th className="py-2 pr-6 font-medium">Impresiones</th>
                <th className="py-2 pr-6 font-medium">Clics</th>
                <th className="py-2 font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {(flag.metricas || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-400">Aún no hay eventos registrados.</td>
                </tr>
              )}
              {(flag.metricas || []).map((m) => (
                <tr key={m.variante} className="border-b last:border-0">
                  <td className="py-2 pr-6 font-medium text-gray-800">{VARIANT_LABELS[m.variante] || m.variante}</td>
                  <td className="py-2 pr-6">{m.impressions}</td>
                  <td className="py-2 pr-6">{m.clicks}</td>
                  <td className="py-2 font-semibold text-blue-700">{formatCtr(m.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminExperimentos() {
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFlags = async () => {
    try {
      const data = await fetchFeatureFlags(token);
      setFlags(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar los feature flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminLayout activeTab="experimentos">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Experimentos A/B</h2>
          <p className="text-gray-500 text-sm">
            Activa la variante del botón principal y revisa el rendimiento por variante. Los cambios se aplican
            sin necesidad de volver a desplegar.
          </p>
        </div>

        {loading && <p className="text-gray-400">Cargando…</p>}
        {!loading && flags.length === 0 && <p className="text-gray-400">No hay feature flags registrados.</p>}
        {flags.map((flag) => (
          <FlagCard key={flag.clave} flag={flag} token={token} onRefresh={loadFlags} />
        ))}
      </div>
    </AdminLayout>
  );
}

export default AdminExperimentos;
