import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para detectar quando a aba volta a ficar ativa/visível
 * e executar um callback para recarregar dados
 */
export function useTabVisibility(onVisible?: () => void | Promise<void>) {
  const wasHiddenRef = useRef(false);
  const callbackRef = useRef(onVisible);

  // Atualizar ref do callback
  useEffect(() => {
    callbackRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      
      // Se estava escondido e agora ficou visível, executa callback
      if (wasHiddenRef.current && !isHidden) {
        console.log('🔄 [TAB] Aba voltou a ficar visível - recarregando dados');
        
        if (callbackRef.current) {
          const result = callbackRef.current();
          if (result instanceof Promise) {
            result.catch((err) => {
              console.error('❌ [TAB] Erro ao recarregar dados:', err);
            });
          }
        }
      }
      
      wasHiddenRef.current = isHidden;
    };

    // Adicionar listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Retornar função para forçar reload manualmente se necessário
  const forceReload = useCallback(() => {
    if (callbackRef.current) {
      const result = callbackRef.current();
      if (result instanceof Promise) {
        result.catch((err) => {
          console.error('❌ [TAB] Erro ao forçar reload:', err);
        });
      }
    }
  }, []);

  return { forceReload };
}
