import React, { useState } from 'react';
import { useRouter } from '../../hooks/useRouter';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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
      subtitle="Faça login para acessar sua conta"
    >
      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aceitar Termos de Uso</h3>
            <p className="text-gray-600 mb-6">
              Para continuar usando nossa plataforma, você precisa aceitar nossos termos de uso atualizados.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowTermsModal(false);
                  signOut();
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAcceptTerms}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Sua senha"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">Lembrar de mim</span>
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            Esqueceu a senha?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </button>

        <div className="text-center">
          <span className="text-gray-600">Não tem uma conta? </span>
          <button
            type="button"
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Cadastre-se
          </button>
        </div>

        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Você é uma empresa ou analista?</p>
          <button
            type="button"
            onClick={onNavigateToAnalysts}
            className="text-purple-600 hover:text-purple-500 font-medium text-sm"
          >
            Acesse a área de analistas →
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginForm;