import { useEffect, useRef, useState } from 'react';
import { fetchFeatureFlag, trackFeatureFlagEvent } from '../utils/api';

const CONTROL = 'control';

/**
 * Evalúa un feature flag A/B contra el backend y devuelve la variante asignada.
 * Si el flag no existe, está inactivo o la petición falla, devuelve "control".
 * Registra automáticamente una impresión cuando se resuelve la variante activa.
 *
 * @param {string} clave - Clave del feature flag (ej: "cta_cotizar_ab").
 * @param {{ trackImpression?: boolean }} [options]
 * @returns {{ variant: string, active: boolean, loading: boolean }}
 */
export function useFeatureFlag(clave, options = {}) {
  const { trackImpression = true } = options;
  const [variant, setVariant] = useState(CONTROL);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const trackedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      try {
        const data = await fetchFeatureFlag(clave);
        if (cancelled) return;
        setActive(Boolean(data?.activo));
        setVariant(data?.variante || CONTROL);
      } catch {
        if (!cancelled) {
          setActive(false);
          setVariant(CONTROL);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    evaluate();
    return () => {
      cancelled = true;
    };
  }, [clave]);

  useEffect(() => {
    if (loading || !active || !trackImpression || trackedRef.current) return;
    trackedRef.current = true;
    trackFeatureFlagEvent(clave, { variante: variant, tipo: 'impression' }).catch(() => {});
  }, [loading, active, variant, clave, trackImpression]);

  return { variant, active, loading };
}

export default useFeatureFlag;
