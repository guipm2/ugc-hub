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

  useEffect(() => {
    // Timeout de segurança - se não carregar em 15 segundos, força logout
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('⏱️ [AUTH] Loading timeout - forcing logout');
        setProfile(null);
        setUser(null);
        setSession(null);
        setLoading(false);
        // Força logout do Supabase para limpar estado
        supabase.auth.signOut();
      }
    }, 15000);

    // Check for existing session and set up auth state listener
    const getInitialSession = async () => {
      console.log('🚀 [AUTH] Getting initial session...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('📋 [AUTH] Initial session result:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          userEmail: session?.user?.email 
        });
        
        if (session?.user) {
          await handleUserSession(session);
        } else {
          console.log('❌ [AUTH] No session found, clearing state');
          setProfile(null);
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('💥 [AUTH] Error getting session:', error);
        setProfile(null);
        setUser(null);
        setSession(null);
      }
      
      console.log('⏹️ [AUTH] Initial session loading complete');
      setLoading(false);
      clearTimeout(timeoutId); // Cancela timeout se carregou com sucesso
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await handleUserSession(session);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUser(null);
        setSession(null);
      }
    });

    getInitialSession();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserSession = async (session: Session) => {
    console.log('🔄 [AUTH] Handling user session for:', session.user.id);
    setUser(session.user);
    setSession(session);
    
    try {
      // Busca perfil do usuário
      console.log('🔍 [AUTH] Fetching profile for user:', session.user.id);
      const { data: initialProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ [AUTH] Error fetching profile:', fetchError);
        // Se falhou por RLS ou permissão, cria perfil de fallback
        console.log('⚡ [AUTH] Creating fallback profile due to fetch error');
        const fallbackProfile: Profile = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'Creator User',
          role: 'creator',
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0'
        };
        setProfile(fallbackProfile);
        return;
      } else {
        console.log('📊 [AUTH] Profile fetch result:', { userProfile: initialProfile, exists: !!initialProfile });
      }

      let finalProfile = initialProfile;

      // Se não existe perfil, cria automaticamente
      if (!finalProfile) {
        console.log('👤 [AUTH] Creating new profile for user:', session.user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || null,
            role: 'creator',
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
          });
        
        if (!profileError) {
          console.log('✅ [AUTH] Profile created, fetching new profile...');
          await new Promise(res => setTimeout(res, 300));
          const { data: newProfile, error: newFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (newFetchError) {
            console.error('❌ [AUTH] Error fetching new profile:', newFetchError);
            // Se falhou novamente, usa perfil de fallback
            finalProfile = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || 'Creator User',
              role: 'creator',
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString(),
              terms_version: '1.0'
            };
          } else {
            finalProfile = newProfile;
            console.log('✅ [AUTH] Profile created successfully:', finalProfile?.id);
          }
        } else {
          console.error('❌ [AUTH] Profile creation failed:', profileError);
          // Se falhou, usa perfil de fallback
          finalProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'Creator User',
            role: 'creator',
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0'
          };
        }
      }
      
      console.log('🎯 [AUTH] Setting profile:', { id: finalProfile?.id, role: finalProfile?.role });
      setProfile(finalProfile ?? null);
    } catch (error) {
      console.error('💥 [AUTH] Unexpected error in handleUserSession:', error);
      
      // Em caso de erro, cria perfil básico localmente para destravar
      console.log('⚡ [AUTH] Creating emergency fallback profile');
      const emergencyProfile: Profile = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || 'Creator User',
        role: 'creator',
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0'
      };
      setProfile(emergencyProfile);
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: { message: 'Email ou senha incorretos' } as AuthError };
      }

      if (data.user) {
        // Busca perfil na tabela profiles
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!userProfile || userProfile.role !== 'creator') {
          await supabase.auth.signOut();
          return { error: { message: 'Acesso negado. Esta área é apenas para criadores.' } as AuthError };
        }

        setUser(data.user);
        setProfile(userProfile);
      }

      return { error: null };
    } catch {
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
