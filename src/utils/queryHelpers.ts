import { PostgrestError } from '@supabase/supabase-js';

/**
 * Configuração para retry de queries
 */
interface RetryConfig {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: true,
};

/**
 * Utilitário para executar queries com retry automático
 * Útil quando a aba fica inativa e as conexões podem ter expirado
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  config: RetryConfig = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const { maxAttempts, delayMs, backoff } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: PostgrestError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await queryFn();

      // Se teve sucesso, retorna
      if (!result.error) {
        if (attempt > 1) {
          console.log(`✅ [RETRY] Query bem-sucedida na tentativa ${attempt}`);
        }
        return result;
      }

      lastError = result.error;

      // Se não é erro de conexão/timeout, não tenta novamente
      const isRetriableError =
        result.error.message?.includes('Failed to fetch') ||
        result.error.message?.includes('NetworkError') ||
        result.error.message?.includes('timeout') ||
        result.error.code === 'PGRST301' || // Timeout
        result.error.code === '57014'; // Query canceled

      if (!isRetriableError) {
        console.warn(`⚠️ [RETRY] Erro não recuperável:`, result.error);
        return result;
      }

      // Se não é a última tentativa, aguarda antes de tentar novamente
      if (attempt < maxAttempts) {
        const delay = backoff ? delayMs * attempt : delayMs;
        console.log(
          `🔄 [RETRY] Tentativa ${attempt} falhou. Tentando novamente em ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`❌ [RETRY] Erro inesperado na tentativa ${attempt}:`, error);
      if (attempt === maxAttempts) {
        throw error;
      }
      // Aguarda antes de tentar novamente
      const delay = backoff ? delayMs * attempt : delayMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Retorna o último erro se todas as tentativas falharam
  console.error(`❌ [RETRY] Todas as ${maxAttempts} tentativas falharam`);
  return { data: null, error: lastError };
}

/**
 * Verifica se a sessão do Supabase ainda é válida
 * e tenta fazer refresh se necessário
 */
export async function ensureValidSession(supabase: any): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ [SESSION] Erro ao verificar sessão:', error);
      return false;
    }

    if (!session) {
      console.warn('⚠️ [SESSION] Sem sessão ativa');
      return false;
    }

    // Verifica se o token está próximo de expirar (menos de 5 minutos)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 300) { // 5 minutos
        console.log('🔄 [SESSION] Token próximo de expirar, fazendo refresh...');
        const { data: { session: newSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ [SESSION] Erro ao fazer refresh:', refreshError);
          return false;
        }
        
        console.log('✅ [SESSION] Sessão renovada com sucesso');
        return !!newSession;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ [SESSION] Erro ao validar sessão:', error);
    return false;
  }
}
