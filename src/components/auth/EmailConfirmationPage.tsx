import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MailCheck, AlertTriangle, LogIn, ArrowLeft } from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';
import AuthLayout from './AuthLayout';

type ConfirmationState = 'idle' | 'success' | 'error';

const parseHashParams = (hash: string) => {
  if (!hash) return new URLSearchParams();
  return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
};

const ConfirmationStatusMessage: React.FC<{ state: ConfirmationState; errorMessage?: string }> = ({ state, errorMessage }) => {
  if (state === 'error') {
    return (
      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-500/35 bg-red-500/10 px-6 py-5 text-left shadow-[0_18px_45px_-20px_rgba(244,63,94,0.45)]">
        <div className="flex items-start gap-3 text-sm text-red-100">
          <AlertTriangle className="mt-1 h-6 w-6 text-red-300" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-red-200">O link expirou ou é inválido</h2>
            <p className="text-red-100/80">
              {errorMessage || 'O link de confirmação não pôde ser validado. Solicite um novo email de confirmação e tente novamente.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#4ADE80]/40 bg-[#4ADE80]/10 px-6 py-5 text-left">
        <div className="flex items-start gap-3 text-sm text-[#B7FBBF]">
          <CheckCircle2 className="mt-1 h-6 w-6 text-[#6EE7B7]" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#D1FADF]">Email verificado com sucesso!</h2>
            <p>Sua conta está pronta para uso. Escolha abaixo como deseja continuar.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/15 bg-white/5 px-6 py-5 text-left backdrop-blur-md">
      <div className="flex items-start gap-3 text-sm text-slate-200">
        <MailCheck className="mt-1 h-6 w-6 text-[#8A7CFF]" />
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">Validando seu email...</h2>
          <p className="text-slate-200/80">Aguarde só um instante enquanto confirmamos suas credenciais.</p>
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
      title="Confirmação de email"
      subtitle="Obrigado por validar seu endereço. Em segundos você volta para o fluxo ideal."
    >
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.08] shadow-[0_25px_55px_-20px_rgba(103,99,255,0.45)]">
            <MailCheck className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="text-base text-slate-200">
              Obrigado por confirmar seu email. Agora você pode acessar normalmente a plataforma UGC Hub.
            </p>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
              Link detectado para <span className="font-semibold text-white">{accountType === 'analyst' ? 'analistas' : 'criadores'}</span>
            </p>
          </div>
        </div>

        <ConfirmationStatusMessage state={confirmationState} errorMessage={errorMessage} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleNavigate('/login/analysts')}
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-transparent hover:bg-gradient-to-r hover:from-[#4A5BFF] hover:via-[#6E4FFF] hover:to-[#B249FF] hover:shadow-[0_30px_60px_-25px_rgba(74,91,255,0.65)]"
          >
            <LogIn className="h-4 w-4 text-[#A69CFF] group-hover:text-white" />
            Sou analista
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/login/creators')}
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-transparent hover:bg-gradient-to-r hover:from-[#FF6CAB] hover:via-[#736FFF] hover:to-[#4BE1EC] hover:shadow-[0_30px_60px_-25px_rgba(255,108,171,0.55)]"
          >
            <LogIn className="h-4 w-4 text-[#FF9BCF] group-hover:text-white" />
            Sou criador
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-5 text-sm text-slate-300">
          Teve problemas com o link? Refaça o cadastro usando o mesmo email ou solicite um novo link pela tela de login.
        </div>
      </div>
    </AuthLayout>
  );
};

export default EmailConfirmationPage;
