import { useState, useCallback, useRef } from 'react';

interface AsyncOperationOptions {
  /**
   * Delay antes de mostrar el loader (evita flashes en operaciones rápidas)
   * @default 200ms
   */
  showDelayMs?: number;
  
  /**
   * Tiempo mínimo que el loader debe permanecer visible una vez mostrado
   * (evita flashes al desaparecer)
   * @default 400ms
   */
  minVisibleMs?: number;
}

interface AsyncOperationState {
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook para manejar operaciones asíncronas con UX optimizada:
 * - Delay antes de mostrar loader (evita flashes en ops rápidas)
 * - Tiempo mínimo de visibilidad del loader (evita flashes al desaparecer)
 * - Sin latencia artificial si la operación ya terminó
 */
export function useAsyncOperation(options: AsyncOperationOptions = {}) {
  const { showDelayMs = 200, minVisibleMs = 400 } = options;
  
  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
  });
  
  const loaderShownAtRef = useRef<number | null>(null);
  const showDelayTimeoutRef = useRef<number | null>(null);
  const minVisibleTimeoutRef = useRef<number | null>(null);

  const execute = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T> => {
      // Limpiar timeouts previos
      if (showDelayTimeoutRef.current) {
        clearTimeout(showDelayTimeoutRef.current);
      }
      if (minVisibleTimeoutRef.current) {
        clearTimeout(minVisibleTimeoutRef.current);
      }

      setState({ isLoading: false, error: null });
      loaderShownAtRef.current = null;

      // Programar mostrar el loader después del delay
      const showDelayTimeout = window.setTimeout(() => {
        setState(prev => ({ ...prev, isLoading: true }));
        loaderShownAtRef.current = Date.now();
      }, showDelayMs);
      
      showDelayTimeoutRef.current = showDelayTimeout;

      try {
        const result = await asyncFn();

        // Calcular cuánto tiempo ha estado visible el loader
        const hideLoader = () => {
          setState({ isLoading: false, error: null });
          loaderShownAtRef.current = null;
        };

        // Si el loader nunca se mostró (operación fue muy rápida)
        if (!loaderShownAtRef.current) {
          clearTimeout(showDelayTimeout);
          hideLoader();
          return result;
        }

        // Si el loader se mostró, asegurar que esté visible el tiempo mínimo
        const timeVisible = Date.now() - loaderShownAtRef.current;
        const remainingTime = minVisibleMs - timeVisible;

        if (remainingTime > 0) {
          // Esperar el tiempo mínimo restante
          minVisibleTimeoutRef.current = window.setTimeout(() => {
            hideLoader();
          }, remainingTime);
        } else {
          // Ya pasó el tiempo mínimo, ocultar inmediatamente
          hideLoader();
        }

        return result;
      } catch (error) {
        // En caso de error, ocultar el loader inmediatamente
        clearTimeout(showDelayTimeout);
        if (minVisibleTimeoutRef.current) {
          clearTimeout(minVisibleTimeoutRef.current);
        }
        
        setState({
          isLoading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
        throw error;
      }
    },
    [showDelayMs, minVisibleMs]
  );

  return {
    ...state,
    execute,
  };
}
