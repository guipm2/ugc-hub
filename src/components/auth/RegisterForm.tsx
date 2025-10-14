import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AuthLayout from './AuthLayout';
import LegalModal from '../legal/LegalModal';

interface RegisterFormProps {
  onToggleMode: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy'>('terms');

  const { signUp } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp(formData.email, formData.password, {
        name: formData.name
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Este email já está cadastrado');
        } else if (signUpError.message.includes('Password should be at least 6 characters')) {
          setError('A senha deve ter pelo menos 6 caracteres');
        } else {
          setError('Erro ao criar conta. Tente novamente.');
        }
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
        title="Conta criada com sucesso!"
        subtitle="Verifique seu email para ativar o acesso"
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20">
            <svg className="h-8 w-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-200">
            Enviamos um email de confirmação para <span className="font-semibold text-white">{formData.email}</span>.
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            clique no link para ativar sua conta
          </p>
          <button
            onClick={onToggleMode}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] px-6 py-3 text-sm font-semibold text-white shadow-[0_25px_55px_-18px_rgba(74,91,255,0.6)] transition hover:scale-[1.02] hover:shadow-[0_30px_65px_-20px_rgba(74,91,255,0.65)]"
          >
            Voltar para login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Junte-se ao marketplace que valoriza sua criação"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-[0_12px_35px_rgba(244,63,94,0.25)]">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Nome completo
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
              placeholder="Seu nome completo"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
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
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
              placeholder="Mínimo 6 caracteres"
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

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Confirmar senha
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
              placeholder="Confirme sua senha"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
          <input
            id="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-[#6E4FFF] focus:ring-[#6E4FFF]"
          />
          <label htmlFor="terms" className="leading-relaxed">
            Eu concordo com os{' '}
            <button
              type="button"
              onClick={() => {
                setLegalModalTab('terms');
                setShowLegalModal(true);
              }}
              className="font-semibold text-[#9A91FF] underline underline-offset-4 transition hover:text-white"
            >
              Termos de Uso
            </button>{' '}
            e{' '}
            <button
              type="button"
              onClick={() => {
                setLegalModalTab('privacy');
                setShowLegalModal(true);
              }}
              className="font-semibold text-[#9A91FF] underline underline-offset-4 transition hover:text-white"
            >
              Política de Privacidade
            </button>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !termsAccepted}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] px-6 py-3 text-sm font-semibold text-white shadow-[0_25px_55px_-18px_rgba(74,91,255,0.6)] transition hover:scale-[1.02] hover:shadow-[0_30px_65px_-20px_rgba(74,91,255,0.65)] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar conta'
          )}
        </button>

        <div className="text-center text-sm text-slate-300">
          <span>Já tem uma conta? </span>
          <button
            type="button"
            onClick={onToggleMode}
            className="font-semibold text-[#9A91FF] transition hover:text-white"
          >
            Faça login
          </button>
        </div>
      </form>

      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab={legalModalTab}
      />
    </AuthLayout>
  );
};

export default RegisterForm;