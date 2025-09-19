import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, Database } from '../lib/supabase';

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
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Busca perfil do usuário
        let { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // Se não existe perfil, cria automaticamente
        if (!userProfile) {
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
            // Aguarda um pequeno delay para garantir persistência
            await new Promise(res => setTimeout(res, 300));
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            userProfile = newProfile;
          }
        }
        setProfile(userProfile ?? null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        let { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // Se não existe perfil, cria automaticamente
        if (!userProfile) {
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
            // Aguarda um pequeno delay para garantir persistência
            await new Promise(res => setTimeout(res, 300));
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            userProfile = newProfile;
          }
        }
        setProfile(userProfile ?? null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

      // Create profile after successful signup
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            name: userData?.name || null,
            role: 'creator',
            terms_accepted: userData?.termsAccepted || false,
            terms_accepted_at: userData?.termsAcceptedAt || null,
            terms_version: userData?.termsVersion || null,
          });
        if (!profileError) {
          // Atualiza estado global do perfil
          setProfile({
            id: user.id,
            email: user.email || '',
            name: userData?.name || undefined,
            role: 'creator',
            terms_accepted: userData?.termsAccepted || false,
            terms_accepted_at: userData?.termsAcceptedAt || undefined,
            terms_version: userData?.termsVersion || undefined,
          });
        } else {
          console.error('Error creating profile:', profileError);
        }
      }

      return { error };
    } catch (err) {
      return { error: { message: 'Erro ao criar conta' } as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // First check if this email exists as analyst in profiles table
      const { data: analystExists } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .eq('role', 'analyst')
        .maybeSingle();

      if (analystExists) {
        return { error: { message: 'Este email está cadastrado como analista. Acesse a área de analistas.' } as AuthError };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // After successful login, verify user has creator profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        // Se não existe perfil, cria agora
        if (!userProfile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || null,
              role: 'creator',
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString(),
              terms_version: '1.0',
            });
          if (profileError) {
            console.error('Erro ao criar perfil de criador após login:', profileError);
            await supabase.auth.signOut();
            return { error: { message: 'Erro ao criar perfil. Tente novamente.' } as AuthError };
          }
          // Buscar perfil recém-criado
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          userProfile = newProfile;
        }

        // Atualiza estado global do perfil
  setProfile(userProfile ?? null);

        // Verificar se o papel está correto
        if (userProfile && userProfile.role && userProfile.role !== 'creator') {
          console.error('Usuário tem papel incorreto:', userProfile.role);
          await supabase.auth.signOut();
          return { error: { message: 'Acesso negado. Esta área é apenas para criadores.' } as AuthError };
        }
      }

      return { error };
    } catch (err) {
      return { error: { message: 'Erro ao fazer login' } as AuthError };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      // Redirecionar para landing page após logout
      window.location.href = '/';
    }
    return { error };
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