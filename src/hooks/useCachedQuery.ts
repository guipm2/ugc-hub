import { useEffect, useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseCachedQueryOptions {
  /**
   * Tempo de vida do cache em milissegundos
   * @default 5 minutos (300000ms)
   */
  ttl?: number;
  
  /**
   * Se true, faz refresh em background mesmo com cache válido
   * @default false
   */
  refreshInBackground?: boolean;
  
  /**
   * Chave única para o cache
   */
  cacheKey: string;
  
  /**
   * Se true, não usa cache e sempre faz query fresh
   * @default false
   */
  noCache?: boolean;
}

/**
 * Hook personalizado para cachear queries do Supabase
 * Reduz requisições desnecessárias e melhora performance em mobile
 * 
 * @example
 * ```typescript
 * const { data, loading, error, refresh } = useCachedQuery({
 *   cacheKey: 'opportunities-list',
 *   ttl: 5 * 60 * 1000, // 5 minutos
 *   queryFn: async () => {
 *     const { data, error } = await supabase
 *       .from('opportunities')
 *       .select('*');
 *     if (error) throw error;
 *     return data;
 *   }
 * });
 * ```
 */
export function useCachedQuery<T>(
  queryFn: () => Promise<T>,
  options: UseCachedQueryOptions
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutos default
    refreshInBackground = false,
    cacheKey,
    noCache = false
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Limpa caches antigos do localStorage
   */
  const clearOldCaches = useCallback(() => {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith('supabase_cache_'));
    
    // Remove caches mais antigos
    const entries: Array<{ key: string; timestamp: number }> = [];
    cacheKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry = JSON.parse(cached);
          entries.push({ key, timestamp: entry.timestamp || 0 });
        }
      } catch {
        // Remove se der erro ao parsear
        localStorage.removeItem(key);
      }
    });

    // Ordena por timestamp e remove os 50% mais antigos
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = entries.slice(0, Math.floor(entries.length / 2));
    toRemove.forEach(({ key }) => localStorage.removeItem(key));
    
    console.log(`[Cache CLEANUP] Removidos ${toRemove.length} caches antigos`);
  }, []);

  /**
   * Busca dados do cache localStorage
   */
  const getFromCache = useCallback((): T | null => {
    if (noCache) return null;
    
    try {
      const cached = localStorage.getItem(`supabase_cache_${cacheKey}`);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Verifica se cache ainda é válido
      if (now - entry.timestamp < ttl) {
        console.log(`[Cache HIT] ${cacheKey} - usando dados em cache`);
        return entry.data;
      }
      
      // Cache expirado
      console.log(`[Cache EXPIRED] ${cacheKey} - cache expirou`);
      localStorage.removeItem(`supabase_cache_${cacheKey}`);
      return null;
    } catch (err) {
      console.error('[Cache ERROR] Erro ao ler cache:', err);
      return null;
    }
  }, [cacheKey, ttl, noCache]);

  /**
   * Salva dados no cache localStorage
   */
  const saveToCache = useCallback((data: T) => {
    if (noCache) return;
    
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`supabase_cache_${cacheKey}`, JSON.stringify(entry));
      console.log(`[Cache SAVE] ${cacheKey} - dados salvos no cache`);
    } catch (err) {
      console.error('[Cache ERROR] Erro ao salvar cache:', err);
      // Se localStorage estiver cheio, limpa caches antigos
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        clearOldCaches();
        // Tenta salvar novamente
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now()
          };
          localStorage.setItem(`supabase_cache_${cacheKey}`, JSON.stringify(entry));
        } catch {
          // Se ainda falhar, ignora
        }
      }
    }
  }, [cacheKey, noCache, clearOldCaches]);

  /**
   * Executa a query e atualiza estado
   */
  const executeQuery = useCallback(async (useCache: boolean = true) => {
    // Cancela requisição anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Tenta pegar do cache primeiro
      if (useCache) {
        const cachedData = getFromCache();
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          setError(null);
          
          // Se refreshInBackground, faz query mas não mostra loading
          if (refreshInBackground) {
            console.log(`[Cache] ${cacheKey} - fazendo refresh em background`);
            queryFn()
              .then(freshData => {
                setData(freshData);
                saveToCache(freshData);
              })
              .catch(err => {
                console.error('[Cache] Erro no refresh em background:', err);
              });
          }
          
          return;
        }
      }
      
      // Cache miss ou refresh forçado - faz query
      console.log(`[Cache MISS] ${cacheKey} - fazendo query fresh`);
      setLoading(true);
      setError(null);
      
      const result = await queryFn();
      
      setData(result);
      saveToCache(result);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[Cache] Query cancelada');
        return;
      }
      
      console.error('[Cache] Erro na query:', err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }, [queryFn, getFromCache, saveToCache, cacheKey, refreshInBackground]);

  /**
   * Força refresh dos dados (ignora cache)
   */
  const refresh = useCallback(() => {
    console.log(`[Cache] ${cacheKey} - refresh forçado`);
    executeQuery(false);
  }, [executeQuery, cacheKey]);

  /**
   * Invalida cache (limpa dados salvos)
   */
  const invalidate = useCallback(() => {
    console.log(`[Cache] ${cacheKey} - invalidando cache`);
    localStorage.removeItem(`supabase_cache_${cacheKey}`);
  }, [cacheKey]);

  // Executa query na montagem
  useEffect(() => {
    executeQuery(true);
    
    // Cleanup ao desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeQuery]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate
  };
}
