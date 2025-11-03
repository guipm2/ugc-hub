import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

/**
 * Banner que aparece no dashboard quando o onboarding foi completado
 * mas alguns dados não foram salvos corretamente (devido a timeout/erro)
 */
export const IncompleteDataBanner: React.FC = () => {
  const { user, profile } = useAuth();
  const [hasIncompleteData, setHasIncompleteData] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Verificar se há dados do onboarding salvos localmente (fallback)
    const fallbackStr = localStorage.getItem('onboarding_fallback');
    
    // Verificar se o perfil tem flag de dados incompletos
    const hasFlag = profile?.onboarding_data_incomplete === true;
    
    setHasIncompleteData(!!(fallbackStr || hasFlag));
  }, [profile]);

  const handleDismiss = async () => {
    // Marcar como dismissed localmente
    setDismissed(true);
    
    // Limpar flag do banco (usuário foi avisado)
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_data_incomplete: false })
          .eq('id', user.id);
      } catch (error) {
        console.error('Erro ao limpar flag:', error);
      }
    }
  };

  const handleGoToSettings = () => {
    window.location.href = '/creators/account-settings';
  };

  if (!hasIncompleteData || dismissed) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-red-500/10 p-5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-7 w-7 text-rose-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-base font-semibold text-rose-100">
            ⚠️ Ação Necessária: Complete Suas Informações
          </h3>
          <p className="mt-2 text-sm text-rose-200/90 leading-relaxed">
            Detectamos que algumas informações do seu cadastro não foram salvas corretamente 
            devido a um problema de conexão durante o processo de registro.
          </p>
          
          <div className="mt-4 rounded-lg bg-rose-900/20 border border-rose-500/20 p-4">
            <p className="text-sm font-semibold text-rose-100 mb-2">
              📋 Para usar a plataforma completamente, você precisa:
            </p>
            <ul className="space-y-1.5 text-sm text-rose-200/80">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-0.5">•</span>
                <span>Revisar e completar seus <strong>dados pessoais</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-0.5">•</span>
                <span>Adicionar sua <strong>chave PIX</strong> (para receber pagamentos)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-0.5">•</span>
                <span>Preencher <strong>documentos e endereço</strong> (para contratos)</span>
              </li>
            </ul>
          </div>

          <p className="mt-3 text-xs text-rose-300/70">
            💡 Sem essas informações, você não poderá se candidatar a oportunidades ou receber pagamentos.
          </p>
          
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleGoToSettings}
              className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl hover:from-rose-600 hover:to-red-600"
            >
              <Settings className="h-4 w-4" />
              Ir para Configurações da Conta
            </button>
            
            <button
              onClick={handleDismiss}
              className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-900/20 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-900/30"
            >
              <X className="h-4 w-4" />
              Entendi, vou fazer depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
