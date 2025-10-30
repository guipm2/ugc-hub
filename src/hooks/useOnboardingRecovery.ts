import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface OnboardingFallback {
  userId: string;
  data: Record<string, unknown>;
  timestamp: string;
  error: string;
}

/**
 * Hook para recuperar dados do onboarding salvos localmente como fallback
 * Útil para quando o cold start do Supabase causa timeout
 */
export const useOnboardingRecovery = (userId: string | undefined) => {
  const [hasFallbackData, setHasFallbackData] = useState(false);
  const [fallbackData, setFallbackData] = useState<OnboardingFallback | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Verificar se existe fallback salvo
    const fallbackStr = localStorage.getItem('onboarding_fallback');
    if (!fallbackStr) return;

    try {
      const fallback = JSON.parse(fallbackStr) as OnboardingFallback;
      
      // Verificar se é do usuário atual
      if (fallback.userId === userId) {
        setHasFallbackData(true);
        setFallbackData(fallback);
      }
    } catch (error) {
      console.error('Erro ao ler fallback:', error);
    }
  }, [userId]);

  const recoverOnboarding = async (): Promise<boolean> => {
    if (!fallbackData || !userId) {
      return false;
    }

    setIsRecovering(true);

    try {
      console.log('🔄 Tentando recuperar dados do onboarding salvos localmente...');

      const updateData = {
        birth_date: fallbackData.data.birth_date as string || null,
        instagram_url: typeof fallbackData.data.instagram_url === 'string' ? fallbackData.data.instagram_url.trim() : null,
        tiktok_url: typeof fallbackData.data.tiktok_url === 'string' ? fallbackData.data.tiktok_url.trim() : null,
        portfolio_url: typeof fallbackData.data.portfolio_url === 'string' ? fallbackData.data.portfolio_url.trim() : null,
        age: fallbackData.data.age as number,
        gender: fallbackData.data.gender as string,
        niches: Array.isArray(fallbackData.data.niches) ? fallbackData.data.niches : [],
        pix_key: typeof fallbackData.data.pix_key === 'string' ? fallbackData.data.pix_key.trim() : null,
        full_name: typeof fallbackData.data.full_name === 'string' ? fallbackData.data.full_name.trim() : null,
        phone: fallbackData.data.phone as string,
        email: typeof fallbackData.data.email === 'string' ? fallbackData.data.email.trim() : null,
        address: fallbackData.data.address as Record<string, unknown> || null,
        document_type: fallbackData.data.document_type as string || null,
        document_number: fallbackData.data.document_number as string,
        onboarding_completed: true,
        onboarding_step: 4,
        onboarding_completed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('❌ Erro ao recuperar dados:', error);
        return false;
      }

      console.log('✅ Dados do onboarding recuperados com sucesso!');
      
      // Limpar fallback do localStorage
      localStorage.removeItem('onboarding_fallback');
      setHasFallbackData(false);
      setFallbackData(null);

      return true;
    } catch (error) {
      console.error('Erro ao recuperar onboarding:', error);
      return false;
    } finally {
      setIsRecovering(false);
    }
  };

  const clearFallback = () => {
    localStorage.removeItem('onboarding_fallback');
    setHasFallbackData(false);
    setFallbackData(null);
  };

  return {
    hasFallbackData,
    fallbackData,
    isRecovering,
    recoverOnboarding,
    clearFallback
  };
};
