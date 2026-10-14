/**
 * @file featureFlagRoutes.js
 * @description Rutas para feature flags y pruebas A/B.
 *
 * Monta el enrutador bajo `/api/feature-flags` (definido en index.js).
 *
 * | Método | Ruta                              | Auth            | Descripción                                        |
 * |--------|-----------------------------------|-----------------|----------------------------------------------------|
 * | GET    | /api/feature-flags                | Admin           | Lista flags con métricas agregadas por variante    |
 * | GET    | /api/feature-flags/:clave         | Opcional        | Devuelve la variante asignada (aleatoria por visita)|
 * | POST   | /api/feature-flags/:clave/eventos | Opcional        | Registra una impresión o un clic                   |
 * | PUT    | /api/feature-flags/:clave         | Admin           | Activa/desactiva y edita variantes (pesos)         |
 *
 * @module routes/featureFlagRoutes
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normaliza la columna JSONB `variantes` a un arreglo válido de {id, peso}.
 * @param {unknown} value
 * @returns {Array<{id: string, peso: number}>}
 */
const normalizeVariants = (value) => {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((v) => v && typeof v.id === 'string' && Number.isFinite(Number(v.peso)) && Number(v.peso) > 0)
    .map((v) => ({ id: v.id, peso: Number(v.peso) }));
};

/**
 * Elige una variante de forma aleatoria ponderada por su peso.
 * @param {Array<{id: string, peso: number}>} variantes
 * @returns {string} id de la variante seleccionada
 */
const pickVariant = (variantes) => {
  const total = variantes.reduce((acc, v) => acc + v.peso, 0);
  if (total <= 0) return variantes[0]?.id || 'control';
  let roll = Math.random() * total;
  for (const v of variantes) {
    roll -= v.peso;
    if (roll < 0) return v.id;
  }
  return variantes[variantes.length - 1].id;
};

/**
 * Valida el arreglo de variantes recibido en un PUT.
 * @param {unknown} variantes
 * @returns {boolean}
 */
const isValidVariantsInput = (variantes) => {
  if (!Array.isArray(variantes) || variantes.length === 0) return false;
  return variantes.every(
    (v) => v && typeof v.id === 'string' && v.id.trim().length > 0 && Number.isFinite(Number(v.peso)) && Number(v.peso) > 0
  );
};

const formatFlag = (row, metricas = []) => ({
  id: row.idflag,
  clave: row.clave,
  descripcion: row.descripcion,
  activo: row.activo,
  variantes: normalizeVariants(row.variantes),
  metricas,
});

// ---------------------------------------------------------------------------
// GET /  (solo Administrador) — listado + métricas
// ---------------------------------------------------------------------------

router.get('/', authenticateToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { rows: flags } = await pool.query('SELECT * FROM FeatureFlag ORDER BY idFlag');
    const { rows: agg } = await pool.query(`
      SELECT idFlag, variante,
             COUNT(*) FILTER (WHERE tipo = 'impression') AS impressions,
             COUNT(*) FILTER (WHERE tipo = 'click') AS clicks
      FROM FeatureFlagEvento
      GROUP BY idFlag, variante
    `);

    const byFlag = agg.reduce((acc, row) => {
      const id = row.idflag;
      if (!acc[id]) acc[id] = {};
      const impressions = Number(row.impressions) || 0;
      const clicks = Number(row.clicks) || 0;
      acc[id][row.variante] = {
        variante: row.variante,
        impressions,
        clicks,
        ctr: impressions > 0 ? clicks / impressions : 0,
      };
      return acc;
    }, {});

    res.json(
      flags.map((flag) =>
        formatFlag(flag, Object.values(byFlag[flag.idflag] || {}))
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener feature flags' });
  }
});

// ---------------------------------------------------------------------------
// GET /:clave  (auth opcional) — asignación de variante
// ---------------------------------------------------------------------------

router.get('/:clave', optionalAuth, async (req, res) => {
  try {
    const { clave } = req.params;
    const { rows } = await pool.query('SELECT * FROM FeatureFlag WHERE clave = $1', [clave]);

    if (!rows.length) {
      return res.json({ clave, activo: false, variante: 'control' });
    }

    const flag = rows[0];
    if (!flag.activo) {
      return res.json({ clave, activo: false, variante: 'control' });
    }

    const variantes = normalizeVariants(flag.variantes);
    const variante = variantes.length ? pickVariant(variantes) : 'control';

    res.json({ clave, activo: true, variante });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al evaluar el feature flag' });
  }
});

// ---------------------------------------------------------------------------
// POST /:clave/eventos  (auth opcional) — tracking
// ---------------------------------------------------------------------------

router.post('/:clave/eventos', optionalAuth, async (req, res) => {
  try {
    const { clave } = req.params;
    const { variante, tipo, visitorId } = req.body;

    if (tipo !== 'impression' && tipo !== 'click') {
      return res.status(400).json({ error: 'Tipo de evento inválido' });
    }
    if (typeof variante !== 'string' || !variante.trim()) {
      return res.status(400).json({ error: 'Variante inválida' });
    }

    const { rows } = await pool.query('SELECT idFlag, variantes FROM FeatureFlag WHERE clave = $1', [clave]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Feature flag no encontrado' });
    }

    const validVariants = normalizeVariants(rows[0].variantes).map((v) => v.id);
    if (validVariants.length && !validVariants.includes(variante)) {
      return res.status(400).json({ error: 'La variante no pertenece al flag' });
    }

    await pool.query(
      `INSERT INTO FeatureFlagEvento (idFlag, variante, tipo, idUsuarios, visitorId)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        rows[0].idflag,
        variante,
        tipo,
        req.user?.id ?? null,
        typeof visitorId === 'string' ? visitorId.slice(0, 64) : null,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el evento' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:clave  (solo Administrador) — activar/desactivar y editar variantes
// ---------------------------------------------------------------------------

router.put('/:clave', authenticateToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { clave } = req.params;
    const { activo, variantes } = req.body;

    if (typeof activo !== 'boolean' && variantes === undefined) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }
    if (variantes !== undefined && !isValidVariantsInput(variantes)) {
      return res.status(400).json({ error: 'Variantes inválidas' });
    }

    const sets = [];
    const values = [];
    let idx = 1;

    if (typeof activo === 'boolean') {
      sets.push(`activo = $${idx++}`);
      values.push(activo);
    }
    if (variantes !== undefined) {
      sets.push(`variantes = $${idx++}::jsonb`);
      values.push(JSON.stringify(variantes.map((v) => ({ id: v.id, peso: Number(v.peso) }))));
    }
    sets.push('actualizado_en = CURRENT_TIMESTAMP');

    values.push(clave);
    const { rows } = await pool.query(
      `UPDATE FeatureFlag SET ${sets.join(', ')} WHERE clave = $${idx} RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Feature flag no encontrado' });
    }

    res.json(formatFlag(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el feature flag' });
  }
});

module.exports = router;
