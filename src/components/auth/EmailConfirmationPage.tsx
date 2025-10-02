import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MailCheck, AlertTriangle, LogIn } from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';

type ConfirmationState = 'idle' | 'success' | 'error';

const parseHashParams = (hash: string) => {
  if (!hash) return new URLSearchParams();
  return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
};

const ConfirmationStatusMessage: React.FC<{ state: ConfirmationState; errorMessage?: string }> = ({ state, errorMessage }) => {
  if (state === 'error') {
    return (
      <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-red-600">O link expirou ou é inválido</h2>
            <p className="text-red-500 mt-1">
              {errorMessage || 'O link de confirmação não pôde ser validado. Solicite um novo email de confirmação e tente novamente.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="max-w-xl mx-auto bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-green-700">Email verificado com sucesso!</h2>
            <p className="text-green-600 mt-1">
              Sua conta está pronta para uso. Escolha abaixo como deseja continuar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
      <div className="flex items-start gap-3">
        <MailCheck className="w-6 h-6 text-blue-600 mt-1" />
        <div>
          <h2 className="text-lg font-semibold text-blue-700">Validando seu email...</h2>
          <p className="text-blue-600 mt-1">
            Aguarde só um instante enquanto confirmamos suas credenciais.
          </p>
        </div>
      </div>
    </div>
  );
};

const EmailConfirmationPage: React.FC = () => {
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const { navigate } = useRouter();

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const accountType = (searchParams.get('type') ?? 'creator') as 'creator' | 'analyst';

  useEffect(() => {
    const hashParams = parseHashParams(window.location.hash);
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    if (error) {
      setConfirmationState('error');
      setErrorMessage(errorDescription ?? undefined);
      return;
    }

    if (hashParams.has('access_token') || hashParams.has('type')) {
      setConfirmationState('success');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }

    setConfirmationState('success');
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full bg-white shadow-xl rounded-3xl p-10 border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <MailCheck className="h-9 w-9 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900 tracking-tight">
            Confirmação de email
          </h1>
          <p className="mt-3 text-base text-gray-600">
            Obrigado por confirmar seu endereço de email. Agora você pode acessar sua conta UGC Hub normalmente.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Detectamos que este link foi gerado para a área de <span className="font-semibold text-gray-700">{accountType === 'analyst' ? 'analistas' : 'criadores'}</span>.
          </p>
        </div>

        <ConfirmationStatusMessage state={confirmationState} errorMessage={errorMessage} />

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleNavigate('/login/analysts')}
            className="flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-5 py-4 text-base font-semibold text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition"
          >
            <LogIn className="w-5 h-5" />
            Sou analista
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/login/creators')}
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-4 text-base font-semibold text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition"
          >
            <LogIn className="w-5 h-5" />
            Sou criador
          </button>
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          <p>
            Teve problemas com o link? Refaça o cadastro usando o mesmo email ou solicite um novo link de verificação a partir da tela de login.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;
