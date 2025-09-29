import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        // Check if user exists in profiles table (creator)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && profile.role === 'creator') {
          setRole('creator');
        } else {
          // Check if user exists in analysts table
          const { data: analyst } = await supabase
            .from('analysts')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (analyst && analyst.role === 'analyst') {
            setRole('analyst');
          } else {
            setRole(null);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar papel do usuário:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkUserRole();
    } else {
      setRole(null);
      setLoading(false);
    }
  }, [user]);

  return { role, loading };
};
