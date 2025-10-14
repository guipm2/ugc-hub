import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Building, Mail, Lock, AlertCircle, User } from 'lucide-react';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';
import { useRouter } from '../../hooks/useRouter';
import AuthLayout from './AuthLayout';

const AnalystLoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { signIn, signUp } = useAnalystAuth();
  const { navigate } = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error: loginError } = await signIn(email, password);
        if (loginError) {
          setError(loginError);
        } else {
          navigate('/analysts/overview');
        }
      } else {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem');
          return;
        }

        const { error: signUpError } = await signUp(email, password, name, company);

        if (signUpError) {
          setError(signUpError);
        } else {
          setSuccessMessage(`Conta criada! Enviamos um email de confirmação para ${email}. Ative o acesso e retorne para continuar.`);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setName('');
          setCompany('');
          setTimeout(() => {
            setIsLogin(true);
            setSuccessMessage('');
          }, 5000);
        }
      }
    } catch {
      setError('Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const backButton = (
    <button
      onClick={() => navigate('/')}
      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />
      voltar ao início
    </button>
  );

  return (
    <AuthLayout
      topSlot={backButton}
      title={isLogin ? 'Entrar como analista' : 'Cadastrar analista'}
      subtitle={isLogin ? 'Gerencie oportunidades e conduza campanhas com suporte do hub' : 'Cadastre-se para criar pipelines personalizados para suas marcas'}
    >
      <div className="space-y-6">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-[0_12px_35px_rgba(244,63,94,0.25)]">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-[#4ADE80]/40 bg-[#4ADE80]/10 px-4 py-3 text-sm text-[#B7FBBF]">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Nome completo
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Nome da empresa
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
                    placeholder="Nome da sua empresa"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Email corporativo
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
                placeholder="analista@empresa.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
                placeholder="••••••••"
                required
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

          {!isLogin && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6E4FFF]"
                  placeholder="••••••••"
                  required
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
          )}

          <button
            type="submit"
            disabled={loading}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] px-6 py-3 text-sm font-semibold text-white shadow-[0_25px_55px_-18px_rgba(74,91,255,0.6)] transition hover:scale-[1.02] hover:shadow-[0_30px_65px_-20px_rgba(74,91,255,0.65)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {isLogin ? 'Entrando...' : 'Criando conta...'}
              </>
            ) : (
              isLogin ? 'Entrar' : 'Criar conta'
            )}
          </button>
        </form>

        <div className="text-center text-sm text-slate-300">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-[#9A91FF] transition hover:text-white"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>

        <div className="text-center text-xs uppercase tracking-[0.3em] text-slate-400">
          <button
            onClick={() => navigate('/login/creators')}
            className="font-semibold text-[#9A91FF] transition hover:text-white"
          >
            Você é creator? Acesse a área dedicada →
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default AnalystLoginPage;