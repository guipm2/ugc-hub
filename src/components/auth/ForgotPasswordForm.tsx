import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AuthLayout from './AuthLayout';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError('Erro ao enviar email de recuperação. Tente novamente.');
      } else {
        setSuccess(true);
      }
  } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Email enviado!"
        subtitle="Verifique sua caixa de entrada para continuar"
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Mail className="h-8 w-8 text-[#00FF41]" />
          </div>
          <p className="text-sm text-slate-200">
            Enviamos um link de recuperação para <span className="font-semibold text-white">{email}</span>.
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            confira spam e promoções
          </p>
          <button
            onClick={onBack}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#00FF41] via-[#00CC34] to-[#00FF41] px-6 py-3 text-sm font-semibold text-black shadow-neon transition hover:scale-[1.02] hover:shadow-neon-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar para login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Esqueceu sua senha?"
      subtitle="Digite seu email para receber um link seguro de recuperação"
    >
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
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-influenciando-primary" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-influenciando-primary"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#00FF41] via-[#00CC34] to-[#00FF41] px-6 py-3 text-sm font-semibold text-black shadow-neon transition hover:scale-[1.02] hover:shadow-neon-lg disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar link de recuperação'
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200 transition hover:border-white/35 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          voltar
        </button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordForm;