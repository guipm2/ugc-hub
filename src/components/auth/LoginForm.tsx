import React, { useState } from 'react';
import { useRouter } from '../../hooks/useRouter';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import AuthLayout from './AuthLayout';

interface LoginFormProps {
  onToggleMode: () => void;
  onForgotPassword: () => void;
  onNavigateToAnalysts: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode, onForgotPassword, onNavigateToAnalysts }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { signIn, signOut } = useAuth();

  const { navigate } = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        // Handle specific role-based access errors
        if (error.message.includes('Este email está cadastrado como analista')) {
          setError('Acesso negado. Esta área é apenas para criadores.');
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login');
        } else {
          setError('Erro ao fazer login. Tente novamente.');
        }
      } else {
        // Check if user has accepted terms
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('terms_accepted')
            .eq('id', user.id)
            .single();

          if (profile && !profile.terms_accepted) {
            setShowTermsModal(true);
          } else {
            // Redireciona para dashboard após login bem-sucedido e termos aceitos
            navigate('/creators/dashboard');
          }
        }
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0'
        })
        .eq('id', user.id);
      
      setShowTermsModal(false);
    }
  };

  return (
    <AuthLayout
      title="Bem-vindo de volta!"
      subtitle="Acesse o hub de oportunidades e continue criando"
    >
      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="glass-panel w-full max-w-md space-y-5 px-6 py-7">
            <h3 className="text-lg font-semibold text-white">Aceitar Termos de Uso</h3>
            <p className="text-sm text-slate-300">
              Para continuar usando o UGC Hub, aceite os novos termos de uso. Eles garantem pagamentos protegidos e transparência nos fluxos.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowTermsModal(false);
                  signOut();
                }}
                className="flex-1 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleAcceptTerms}
                className="flex-1 rounded-full bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(74,91,255,0.45)] transition hover:shadow-[0_22px_48px_rgba(74,91,255,0.55)]"
              >
                Aceitar termos
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-[0_12px_35px_rgba(244,63,94,0.25)]">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
              placeholder="Sua senha"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#6E4FFF] focus:ring-[#6E4FFF]"
            />
            <span className="tracking-wide">Lembrar de mim</span>
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="font-semibold uppercase tracking-[0.25em] text-[#9A91FF] transition hover:text-white"
          >
            Esqueceu a senha?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] px-6 py-3 text-sm font-semibold text-white shadow-[0_25px_55px_-18px_rgba(74,91,255,0.6)] transition hover:scale-[1.02] hover:shadow-[0_30px_65px_-20px_rgba(74,91,255,0.65)] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </button>

        <div className="text-center text-sm text-slate-300">
          <span>Não tem uma conta? </span>
          <button
            type="button"
            onClick={onToggleMode}
            className="font-semibold text-[#9A91FF] transition hover:text-white"
          >
            Cadastre-se
          </button>
        </div>

        <div className="border-t border-white/10 pt-5 text-center text-xs uppercase tracking-[0.3em] text-slate-400">
          <p className="mb-2">Você é uma empresa ou analista?</p>
          <button
            type="button"
            onClick={onNavigateToAnalysts}
            className="font-semibold text-[#9A91FF] transition hover:text-white"
          >
            Acesse a área de analistas →
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginForm;