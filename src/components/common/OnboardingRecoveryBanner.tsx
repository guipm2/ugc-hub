import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useOnboardingRecovery } from '../../hooks/useOnboardingRecovery';
import { useAuth } from '../../hooks/useAuth';

/**
 * Banner que aparece no dashboard se existirem dados do onboarding 
 * salvos localmente (fallback de erro de cold start)
 */
export const OnboardingRecoveryBanner: React.FC = () => {
  const { user } = useAuth();
  const { hasFallbackData, fallbackData, isRecovering, recoverOnboarding, clearFallback } = 
    useOnboardingRecovery(user?.id);

  if (!hasFallbackData || !fallbackData) {
    return null;
  }

  const handleRecover = async () => {
    const success = await recoverOnboarding();
    if (success) {
      alert('✅ Seus dados foram recuperados e salvos com sucesso!');
      window.location.reload();
    } else {
      alert('❌ Não foi possível recuperar os dados agora.\n\nTente novamente mais tarde ou entre em contato com o suporte.');
    }
  };

  const handleDismiss = () => {
    if (confirm('⚠️ Tem certeza que deseja descartar os dados salvos?\n\nVocê terá que preencher o onboarding novamente.')) {
      clearFallback();
    }
  };

  const errorDate = new Date(fallbackData.timestamp);
  const timeSinceError = Date.now() - errorDate.getTime();
  const hoursSinceError = Math.floor(timeSinceError / (1000 * 60 * 60));

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-100">
            📋 Dados do Onboarding Pendentes
          </h3>
          <p className="mt-1 text-xs text-amber-200/80">
            Detectamos que você tentou completar o onboarding há {hoursSinceError > 0 ? `${hoursSinceError}h` : 'pouco tempo'}, 
            mas houve um problema de conexão com o servidor.
          </p>
          <p className="mt-2 text-xs text-amber-200/80">
            💡 <strong>O servidor estava em modo economia (cold start).</strong> Agora ele já está ativo!
            Clique abaixo para tentar salvar seus dados novamente.
          </p>
          
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleRecover}
              disabled={isRecovering}
              className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50"
            >
              {isRecovering ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 transition group-hover:rotate-180" />
                  Tentar Salvar Agora
                </>
              )}
            </button>
            
            <button
              onClick={handleDismiss}
              disabled={isRecovering}
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-900/30 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Descartar
            </button>
          </div>
          
          {fallbackData.error && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-amber-300/60 hover:text-amber-300">
                Ver detalhes do erro
              </summary>
              <pre className="mt-2 rounded-lg bg-black/20 p-2 text-[10px] text-amber-200/70">
                {fallbackData.error}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};
