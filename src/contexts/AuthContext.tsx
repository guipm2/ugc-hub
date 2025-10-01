import React, { createContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Tipagem do perfil de usuário
export interface Profile {
  id: string;
  email: string;
  name?: string;
  role: string;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  terms_version?: string;
  onboarding_completed?: boolean;
  onboarding_step?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signUp: (email: string, password: string, userData?: { 
    name?: string;
    termsAccepted?: boolean;
    termsAcceptedAt?: string;
    termsVersion?: string;
  }) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => void;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingSession, setProcessingSession] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isInitializing = true;
    let hasInitialized = false;
    
    // Timeout de segurança - aumentado para 30 segundos para evitar falso positivo
    timeoutId = setTimeout(() => {
      if (loading && isInitializing) {
        console.error('⏱️ [AUTH] Timeout de carregamento - forçando logout');
        setProfile(null);
        setUser(null);
        setSession(null);
        setLoading(false);
        // Força logout do Supabase para limpar estado
        supabase.auth.signOut();
      }
    }, 30000); // Aumentado para 30 segundos

    // Check for existing session and set up auth state listener
    const getInitialSession = async () => {
      if (hasInitialized) {
        return;
      }
      
      hasInitialized = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await handleUserSession(session);
        } else {
          setProfile(null);
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('[AUTH] Erro ao obter sessão:', error);
        setProfile(null);
        setUser(null);
        setSession(null);
      }
      
      setLoading(false);
      isInitializing = false;
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Se não é a inicialização, processa mudanças de estado
      if (!isInitializing) {
        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserSession(session);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    });

    getInitialSession();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserSession = async (session: Session) => {
    const sessionId = session.user.id;
    
    // Evita processamento duplo da mesma sessão
    if (processingSession === sessionId) {
      return;
    }
    
    setProcessingSession(sessionId);
    
    try {
      setUser(session.user);
      setSession(session);
      
      // Busca perfil do usuário
      const { data: initialProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (fetchError) {
        console.error('[AUTH] Erro ao buscar perfil:', fetchError.message);
        // Se falhou por RLS ou permissão, cria perfil de fallback
        const fallbackProfile: Profile = {
          id: sessionId,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'Creator User',
          role: 'creator',
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0',
          onboarding_completed: false,
          onboarding_step: 0,
        };
        setProfile(fallbackProfile);
        return;
      }

      let finalProfile = initialProfile;

      // Se não existe perfil, cria automaticamente
      if (!finalProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: sessionId,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || null,
            role: 'creator',
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
            onboarding_completed: false,
            onboarding_step: 0,
          });
        
        if (!profileError) {
          await new Promise(res => setTimeout(res, 300));
          const { data: newProfile, error: newFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionId)
            .maybeSingle();
          
          if (newFetchError) {
            console.error('[AUTH] Erro ao buscar novo perfil:', newFetchError.message);
            // Se falhou novamente, usa perfil de fallback
            finalProfile = {
              id: sessionId,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || 'Creator User',
              role: 'creator',
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString(),
              terms_version: '1.0'
            };
          } else {
            finalProfile = newProfile;
          }
        } else {
          console.error('[AUTH] Falha na criação do perfil:', profileError.message);
          // Se falhou, usa perfil de fallback
          finalProfile = {
            id: sessionId,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'Creator User',
            role: 'creator',
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
            onboarding_completed: false,
            onboarding_step: 0,
          };
        }
      }

      // Valida se o usuário é creator
      if (finalProfile && finalProfile.role !== 'creator') {
        await supabase.auth.signOut();
        return;
      }
      
      setProfile(finalProfile ?? null);
    } catch (error) {
      console.error('[AUTH] Erro inesperado em handleUserSession:', error);
      
      // Em caso de erro, cria perfil básico localmente para destravar
      const emergencyProfile: Profile = {
        id: sessionId,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || 'Creator User',
        role: 'creator',
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
        onboarding_completed: false,
        onboarding_step: 0,
      };
      setProfile(emergencyProfile);
    } finally {
      setProcessingSession(null);
    }
  };

  const signUp = async (email: string, password: string, userData?: { 
    name?: string;
    termsAccepted?: boolean;
    termsAcceptedAt?: string;
    termsVersion?: string;
  }) => {
    try {
      // Check if email already exists as analyst in profiles table
      const { data: analystExists } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .eq('role', 'analyst')
        .maybeSingle();

      if (analystExists) {
        return { error: { message: 'Este email já está cadastrado como analista' } as AuthError };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        return { error };
      }

      return { error };
    } catch {
      return { error: { message: 'Erro ao criar conta' } as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔑 [AUTH] Iniciando processo de login para:', email);
    try {
      // First check if this email exists as analyst in profiles table
      const { data: analystExists } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('email', email)
        .maybeSingle();

      if (analystExists && analystExists.role === 'analyst') {
        return { error: { message: 'Este email está cadastrado como analista. Acesse a área de analistas.' } as AuthError };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ [AUTH] Erro no login:', error);
        return { error: { message: 'Email ou senha incorretos' } as AuthError };
      }

      console.log('✅ [AUTH] Login bem-sucedido, sessão será tratada pelo onAuthStateChange');
      
      // NÃO fazemos validação aqui - deixa o onAuthStateChange e handleUserSession cuidar
      // Isso evita dupla validação e conflitos de estado

      return { error: null };
    } catch (err) {
      console.error('💥 [AUTH] Erro inesperado durante login:', err);
      return { error: { message: 'Erro ao fazer login' } as AuthError };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
    // Redirecionar para landing page após logout
    window.location.href = '/';
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
