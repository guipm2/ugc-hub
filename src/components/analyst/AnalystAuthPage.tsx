import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Building, Loader2 } from 'lucide-react';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';

const AnalystAuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const navigateToCreators = () => {
    window.location.href = '/creators';
  };

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: ''
  });
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAnalystAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let result;
      if (isLogin) {
        result = await signIn(formData.email, formData.password);
        if (result.error) {
          setError(result.error);
        }
      } else {
        // Unifica cadastro igual ao creator, mas passando role e company
        result = await signUp(formData.email, formData.password, formData.name, formData.company);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess(true);
        }
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {success && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Conta criada com sucesso!</h3>
            <p className="text-gray-600 mb-4">Enviamos um email de confirmação para <strong>{formData.email}</strong></p>
            <p className="text-sm text-gray-500 mb-6">Clique no link do email para ativar sua conta e fazer login</p>
            <button
              onClick={() => setIsLogin(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Voltar para Login
            </button>
          </div>
        </div>
      )}
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm">
                UGC
              </div>
              <span className="ml-3 text-2xl font-bold">UGC Hub - Analistas</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Encontre os melhores criadores
            </h1>
            <p className="text-xl text-purple-100 mb-8">
              Plataforma exclusiva para analistas conectarem com criadores de conteúdo
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Acesso a Criadores</h3>
                <p className="text-purple-100 text-sm">Visualize perfis completos e métricas de performance</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Gestão de Campanhas</h3>
                <p className="text-purple-100 text-sm">Crie e gerencie oportunidades para sua empresa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              UGC
            </div>
            <span className="ml-3 text-2xl font-bold text-gray-900">UGC Hub</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? 'Login de Analista' : 'Cadastro de Analista'}
            </h2>
            <p className="mt-2 text-gray-600">
              {isLogin ? 'Acesse sua conta de analista' : 'Crie sua conta de analista'}
            </p>
          </div>

          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        required={!isLogin}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Empresa
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleInputChange}
                        required={!isLogin}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
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
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {isLogin ? 'Entrando...' : 'Criando conta...'}
                  </>
                ) : (
                  isLogin ? 'Entrar' : 'Criar Conta'
                )}
              </button>

              <div className="text-center">
                <span className="text-gray-600">
                  {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-purple-600 hover:text-purple-500 font-medium"
                >
                  {isLogin ? 'Cadastre-se' : 'Faça login'}
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Você é um criador de conteúdo?</p>
                <button
                  type="button"
                  onClick={navigateToCreators}
                  className="text-blue-600 hover:text-blue-500 font-medium text-sm"
                >
                  Acesse a área de criadores →
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalystAuthPage;