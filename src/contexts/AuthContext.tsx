import React, { createContext, useContext, useEffect, useState } from 'react';
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
    // Check for existing session and set up auth state listener
    const getInitialSession = async () => {
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
        console.error('💥 Error getting session:', error);
        setProfile(null);
        setUser(null);
        setSession(null);
      }
      
      setLoading(false);
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
    };
  }, []);

  const handleUserSession = async (session: Session) => {
    setUser(session.user);
    setSession(session);
    
    // Busca perfil do usuário
    let { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    // Se não existe perfil, cria automaticamente
    if (!userProfile) {
      console.log('👤 Creating new profile for user:', session.user.id);
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
        await new Promise(res => setTimeout(res, 300));
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        userProfile = newProfile;
        console.log('✅ Profile created successfully:', userProfile?.id);
      } else {
        console.error('❌ Profile creation failed:', profileError);
      }
    }
    
    setProfile(userProfile ?? null);
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
