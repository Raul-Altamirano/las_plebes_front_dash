/**
 * src/app/hooks/useOAuthCallback.ts
 * Detecta cuando Meta redirige de vuelta al dashboard.
 *
 * Uso en MarketplaceDetail.tsx (/marketplaces/facebook):
 *
 * const { connected, error } = useOAuthCallback();
 * useEffect(() => {
 *   if (connected) toast.success(`✅ ${connected} conectado`);
 *   if (error)     toast.error(error);
 * }, [connected, error]);
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface OAuthCallbackResult {
  connected: string | null;  // nombre de la página si conectó
  error: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  cancelled:        'Cancelaste la conexión con Facebook',
  invalid_callback: 'Callback inválido — intenta de nuevo',
  oauth_failed:     'Error al conectar con Facebook — intenta de nuevo',
};

export function useOAuthCallback(): OAuthCallbackResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<OAuthCallbackResult>({
    connected: null,
    error: null,
  });

  useEffect(() => {
    const connected = searchParams.get('connected');
    const page      = searchParams.get('page');
    const error     = searchParams.get('error');

    if (connected === 'true') {
      setResult({ connected: page || 'Facebook', error: null });
      setSearchParams({}); // limpiar URL
    }

    if (error) {
      setResult({
        connected: null,
        error: ERROR_MESSAGES[error] || 'Error desconocido',
      });
      setSearchParams({});
    }
  }, []);

  return result;
}