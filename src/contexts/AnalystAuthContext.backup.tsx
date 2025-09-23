import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Analyst {
  id: string;
  email: string;
  name?: string;
  company?: string;
  role: 'analyst';
  terms_accepted?: boolean;
  terms_accepted_at?: string;
  terms_version?: string;
}

interface AnalystAuthContextType {
  profile: Analyst | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, company: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AnalystAuthContext = createContext<AnalystAuthContextType | undefined>(undefined);

export const useAnalystAuth = () => {
  const context = useContext(AnalystAuthContext);
  if (context === undefined) {
    throw new Error('useAnalystAuth must be used within an AnalystAuthProvider');
  }
  return context;
};

export const AnalystAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Analyst | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Check for existing session
    const getSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) {
            setProfile(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          if (mounted) {
            setUser(session.user);
          }
          
          // Busca perfil na tabela profiles
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            if (mounted) {
              setProfile(null);
              setLoading(false);
            }
            return;
          }

          // Se não existe perfil, cria automaticamente
          if (!userProfile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || '',
                company: session.user.user_metadata?.company || '',
                role: 'analyst',
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
              if (mounted) {
                setProfile(newProfile ?? null);
              }
            } else {
              console.error('Profile creation error:', profileError);
              if (mounted) {
                setProfile(null);
              }
            }
          } else {
            if (mounted) {
              setProfile(userProfile);
            }
          }
        } else {
          if (mounted) {
            setProfile(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          setProfile(null);
          setUser(null);
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (!mounted) return;

      try {
        if (session?.user) {
          setUser(session.user);
          
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile fetch error on auth change:', profileError);
            setProfile(null);
            return;
          }

          if (!userProfile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || '',
                company: session.user.user_metadata?.company || '',
                role: 'analyst',
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
              setProfile(newProfile ?? null);
            } else {
              console.error('Profile creation error on auth change:', profileError);
              setProfile(null);
            }
          } else {
            setProfile(userProfile);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setProfile(null);
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);



  const signIn = async (email: string, password: string) => {
    try {
      // Verifica se existe perfil de criador com esse email
      const { data: creatorExists } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('email', email)
        .maybeSingle();

      if (creatorExists && creatorExists.role === 'creator') {
        return { error: 'Este email está cadastrado como criador. Acesse a área de criadores.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: 'Email ou senha incorretos' };
      }

      if (data.user) {
        // Busca perfil na tabela profiles
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!userProfile || userProfile.role !== 'analyst') {
          await supabase.auth.signOut();
          return { error: 'Acesso negado. Esta área é apenas para analistas.' };
        }

        setUser(data.user);
        setProfile(userProfile);
      }

      return { error: null };
    } catch {
      return { error: 'Erro ao fazer login' };
    }
  };

  const signUp = async (email: string, password: string, name: string, company: string) => {
    try {
      // Verifica se já existe perfil de criador com esse email
      const { data: creatorExists } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('email', email)
        .maybeSingle();

      if (creatorExists && creatorExists.role === 'creator') {
        return { error: 'Este email já está cadastrado como criador' };
      }

      // Cria o usuário com role analyst no user_metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'analyst',
            name,
            company
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return { error: 'Este email já está cadastrado' };
        }
        return { error: 'Erro ao criar conta' };
      }

      setUser(authData.user ?? null);
      return { error: null };
    } catch {
      return { error: 'Erro ao criar conta' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    // Redirecionar para landing page após logout
    window.location.href = '/';
  };

  const value = {
  profile,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AnalystAuthContext.Provider value={value}>{children}</AnalystAuthContext.Provider>;
};