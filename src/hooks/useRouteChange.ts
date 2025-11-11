import { useEffect, useRef } from 'react';
import { router } from '../utils/router';

/**
 * Hook para detectar mudanças de rota e executar um callback
 * Útil para recarregar dados quando o usuário navega entre páginas
 */
export function useRouteChange(onRouteChange?: () => void | Promise<void>) {
  const callbackRef = useRef(onRouteChange);
  const previousPathRef = useRef<string | null>(null);

  // Atualizar ref do callback
  useEffect(() => {
    callbackRef.current = onRouteChange;
  }, [onRouteChange]);

  useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = router.getCurrentPath();
      
      // Se a rota mudou, executa o callback
      if (previousPathRef.current !== null && previousPathRef.current !== currentPath) {
        console.log(`🔄 [ROUTE] Navegou de ${previousPathRef.current} para ${currentPath}`);
        
        if (callbackRef.current) {
          const result = callbackRef.current();
          if (result instanceof Promise) {
            result.catch((err) => {
              console.error('❌ [ROUTE] Erro ao recarregar dados após mudança de rota:', err);
            });
          }
        }
      }
      
      previousPathRef.current = currentPath;
    };

    // Registrar o path inicial
    previousPathRef.current = router.getCurrentPath();

    // Adicionar listener para mudanças de rota
    router.addListener(handleRouteChange);

    // Cleanup
    return () => {
      router.removeListener(handleRouteChange);
    };
  }, []);
}
