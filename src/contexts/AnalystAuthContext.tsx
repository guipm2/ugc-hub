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
  analyst: Analyst | null; // Dados específicos da tabela analysts
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
  const [analyst, setAnalyst] = useState<Analyst | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      console.log('🔍 Checking session...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('📊 Session found:', !!session?.user);
        
        if (session?.user) {
          setUser(session.user);
          // Busca perfil na tabela profiles
          let { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          console.log('👤 Profile found:', !!userProfile);

          // Se não existe perfil, cria automaticamente
          if (!userProfile) {
            console.log('🆕 Creating new profile...');
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
              // Criar também registro na tabela analysts
              const { error: analystError } = await supabase
                .from('analysts')
                .insert({
                  id: session.user.id, // Usar o mesmo ID do auth.users
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name || '',
                  company: session.user.user_metadata?.company || '',
                  role: 'analyst'
                });
              
              if (analystError) {
                console.error('❌ Analyst record creation failed:', analystError);
              } else {
                console.log('✅ Analyst record created');
              }
              
              await new Promise(res => setTimeout(res, 300));
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              userProfile = newProfile;
              console.log('✅ Profile created');
            } else {
              console.error('❌ Profile creation failed:', profileError);
            }
          }
          
          setProfile(userProfile ?? null);
          
          // Buscar dados específicos da tabela analysts
          if (userProfile) {
            let { data: analystData } = await supabase
              .from('analysts')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            
            // Se não existe registro na tabela analysts, criar automaticamente
            if (!analystData && userProfile.role === 'analyst') {
              console.log('🔧 Creating missing analyst record for existing user');
              const { error: analystError } = await supabase
                .from('analysts')
                .insert({
                  id: session.user.id,
                  email: userProfile.email,
                  name: userProfile.name || '',
                  company: userProfile.company || '',
                  role: 'analyst'
                });
              
              if (!analystError) {
                // Buscar o registro recém-criado
                const { data: newAnalystData } = await supabase
                  .from('analysts')
                  .select('*')
                  .eq('id', session.user.id)
                  .maybeSingle();
                analystData = newAnalystData;
                console.log('✅ Analyst record created for existing user');
              } else {
                console.error('❌ Failed to create analyst record:', analystError);
              }
            }
            
            setAnalyst(analystData ?? null);
          }
        } else {
          setProfile(null);
          setUser(null);
          setAnalyst(null);
        }
      } catch (error) {
        console.error('💥 Error getting session:', error);
        setProfile(null);
        setUser(null);
        setAnalyst(null);
      }
      
      console.log('✅ Setting loading to false');
      setLoading(false);
    };

    getSession();
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

        // Buscar dados específicos da tabela analysts
        let { data: analystData } = await supabase
          .from('analysts')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        // Se não existe registro na tabela analysts, criar automaticamente
        if (!analystData) {
          console.log('🔧 Creating missing analyst record during login');
          const { error: analystError } = await supabase
            .from('analysts')
            .insert({
              id: data.user.id,
              email: userProfile.email,
              name: userProfile.name || '',
              company: userProfile.company || '',
              role: 'analyst'
            });
          
          if (!analystError) {
            // Buscar o registro recém-criado
            const { data: newAnalystData } = await supabase
              .from('analysts')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();
            analystData = newAnalystData;
            console.log('✅ Analyst record created during login');
          } else {
            console.error('❌ Failed to create analyst record during login:', analystError);
          }
        }

        setUser(data.user);
        setProfile(userProfile);
        setAnalyst(analystData ?? null);
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

      // Se o usuário foi criado com sucesso, criar perfil e registro de analyst
      if (authData.user) {
        // Aguardar confirmação do usuário por email antes de criar registros
        // Os registros serão criados automaticamente no getSession() quando o usuário confirmar
        console.log('✅ User created, waiting for email confirmation to create profile and analyst record');
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
    setAnalyst(null);
    // Redirecionar para landing page após logout
    window.location.href = '/';
  };

  const value = {
    profile,
    user,
    analyst,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AnalystAuthContext.Provider value={value}>{children}</AnalystAuthContext.Provider>;
};