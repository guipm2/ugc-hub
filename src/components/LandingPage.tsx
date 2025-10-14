import React, { useEffect } from 'react';
import { motion, type MotionProps } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Target,
  MessageCircle,
  Clapperboard,
  Users,
  Gem,
  Layers,
  Clock,
  Award
} from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { supabase } from '../lib/supabase';

const fadeInUp = (delay = 0): MotionProps => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
  viewport: { once: true, amount: 0.35 }
});

const LandingPage: React.FC = () => {
  const { navigate } = useRouter();

  useEffect(() => {
    const handleEmailConfirmationRedirect = async () => {
      if (typeof window === 'undefined') return;

      const { pathname, hash } = window.location;

      if (pathname !== '/' || !hash) return;

      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const eventType = hashParams.get('type');

      if (eventType !== 'signup' || !hashParams.has('access_token')) return;

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[LandingPage] Erro ao obter sessão após confirmação de email:', error);
        }

        const role = data?.session?.user?.user_metadata?.role === 'analyst' ? 'analyst' : 'creator';

        navigate(`/auth/email-confirmed?type=${role}`);
      } catch (err) {
        console.error('[LandingPage] Falha ao redirecionar confirmação de email:', err);
        navigate('/auth/email-confirmed?type=creator');
      }
    };

    handleEmailConfirmationRedirect();
  }, [navigate]);

  const heroHighlights = [
    {
      icon: Sparkles,
      text: 'Match inteligente com marcas alinhadas ao seu nicho'
    },
    {
      icon: ShieldCheck,
      text: 'Pagamentos protegidos e contratos simplificados'
    },
    {
      icon: BarChart3,
      text: 'Insights em tempo real sobre campanhas e entregas'
    }
  ];

  const impactMetrics = [
    { value: '7.135+', label: 'Peças criativas produzidas', detail: 'por creators independentes dentro do hub' },
    { value: 'R$225Mi', label: 'Faturamento impulsionado', detail: 'por campanhas gerenciadas na comunidade' },
    { value: '86%', label: 'Match médio aprovado', detail: 'entre creators e campanhas ativas' },
    { value: '48h', label: 'Tempo médio', detail: 'para receber feedback das marcas' }
  ];

  const valueProps = [
    {
      icon: Target,
      title: 'Campanhas na medida certa',
      highlight: 'UGC Sync™',
      description:
        'Nossa IA alinha nicho, tom de voz e dados de performance para sugerir briefings que valorizam seu conteúdo.'
    },
    {
      icon: MessageCircle,
      title: 'Negociação transparente',
      highlight: 'Flow centralizado',
      description:
        'Converse com o time cliente sem sair da plataforma, compartilhe previews, aprove ajustes e registre entregas com segurança.'
    },
    {
      icon: Clapperboard,
      title: 'Portfólio vivo',
      highlight: 'Showcase interativo',
      description:
        'Transforme peças em vitrines imersivas. Vincule vídeos, métricas e depoimentos para se destacar nas curadorias diárias.'
    }
  ];

  const differentiators = [
    {
      icon: Gem,
      title: 'Experiência visual do hub',
      description: 'Interface com brilho translúcido, gradientes hiper-modernos e a sensação de estar dentro de um hub futurista.'
    },
    {
      icon: Layers,
      title: 'Pipeline completo',
      description: 'Acompanhe briefing, candidaturas, entregas e pagamentos em uma linha do tempo visual e dinâmica.'
    },
    {
      icon: Users,
      title: 'Comunidade de creators premium',
      description: 'Acesso a masterminds, feedbacks e missões exclusivas para quem cria com consistência e alto padrão.'
    }
  ];

  const creatorJourney = [
    {
      step: '01',
      title: 'Construa sua identidade UGC Hub',
      description:
        'Sincronize redes, destaque cases e deixe nossa curadoria entender o seu storytelling e estilo de edição.'
    },
    {
      step: '02',
      title: 'Receba oportunidades alinhadas',
      description:
        'Filtre por nicho, formato, ticket e receba alertas em tempo real quando uma campanha pede o seu tipo de criação.'
    },
    {
      step: '03',
      title: 'Negocie com suporte especializado',
      description:
        'Defina escopo, valores e prazos com segurança jurídica e orientação prática do nosso time.'
    },
    {
      step: '04',
      title: 'Entregue, seja pago, repita',
      description:
        'Faça upload, receba feedback estruturado, aprove e acompanhe métricas de impacto para o próximo pitch.'
    }
  ];

  const creatorQuotes = [
    {
      name: 'Guilherme Duarte',
      role: 'Creator de Tecnologia',
      quote:
        '“O UGC Hub elevou minhas propostas. As marcas chegam já sabendo o que eu entrego e eu ganho tempo focando em conteúdo.”'
    },
    {
      name: 'Ana Clara',
      role: 'Creator de Lifestyle e Beleza',
      quote:
        '“Ter contratos e pagamentos em um só lugar traz uma tranquilidade enorme. Consigo projetar metas mensais com segurança.”'
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060F] text-slate-100">
      <div className="pointer-events-none absolute -left-64 top-[-12rem] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle_at_center,rgba(73,121,255,0.45)_0%,rgba(9,9,23,0)_70%)] blur-3xl" />
      <div className="pointer-events-none absolute -right-48 top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(172,64,255,0.45)_0%,rgba(9,9,23,0)_70%)] blur-3xl" />

  <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="w-full max-w-6xl">
          <div className="glass-nav pointer-events-auto w-full justify-between md:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4361EE] via-[#5F3BFF] to-[#A855F7] text-sm font-semibold">
                UGC
              </div>
              <span className="text-sm font-semibold text-white md:text-base">UGC Hub</span>
            </div>

            <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 md:flex">
              <a href="#beneficios" className="transition-colors hover:text-white">Benefícios</a>
              <a href="#experiencia" className="transition-colors hover:text-white">Experiência</a>
              <a href="#diferenciais" className="transition-colors hover:text-white">Diferenciais</a>
              <a href="#comunidade" className="transition-colors hover:text-white">Comunidade</a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login/analysts')}
                className="hidden rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 transition-colors hover:border-white/35 hover:text-white md:inline-flex"
              >
                Sou marca
              </button>
              <button
                onClick={() => navigate('/login/creators')}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(74,91,255,0.6)] transition hover:scale-[1.02] hover:shadow-[0_22px_48px_-18px_rgba(74,91,255,0.65)]"
              >
                Entrar como creator
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-28 md:grid-cols-[1.1fr_0.9fr] md:pt-36">
          <motion.div {...fadeInUp()}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-300">
              Plataforma UGC Hub para creators
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-[3.5rem]">
              Colabore com marcas de alta performance <span className="bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] bg-clip-text text-transparent">no marketplace certo</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 md:text-xl">
              Receba briefings exclusivos, negocie com suporte especializado do UGC Hub e entregue conteúdos que geram resultado real. Tudo em um ambiente líquido, tecnológico e criado para valorizar quem produz.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/login/creators')}
                className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] px-7 py-3 text-base font-semibold text-white shadow-[0_25px_45px_-15px_rgba(74,91,255,0.6)] transition hover:scale-[1.02] hover:shadow-[0_30px_55px_-20px_rgba(74,91,255,0.65)]"
              >
                Quero criar com o UGC Hub
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => navigate('/login/analysts')}
                className="rounded-full border border-white/15 px-7 py-3 text-base font-semibold text-slate-300 transition hover:border-white/40 hover:text-white"
              >
                Sou marca
              </button>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {heroHighlights.map(({ icon: Icon, text }) => (
                <div key={text} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
                  <Icon className="h-4 w-4 text-[#8A7CFF]" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeInUp()}
            className="relative mt-4 md:mt-0"
          >
            <div className="glass-panel flex h-full flex-col justify-between p-8">
              <div className="relative z-10 space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-300">Insights do hub</p>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Campanha em destaque</p>
                    <p className="mt-2 text-lg font-semibold text-white">Maratona de inovação fintech</p>
                    <p className="mt-1 text-sm text-slate-300">Ticket médio: R$ 3.500 • Formato: Short-form Vídeo</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-200">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Match</p>
                      <p className="mt-2 text-2xl font-semibold text-white">92%</p>
                      <p className="text-xs text-slate-400">Baseado no seu perfil de tecnologia</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Prazo</p>
                      <p className="mt-2 text-2xl font-semibold text-white">5 dias</p>
                      <p className="text-xs text-slate-400">Feedback garantido pela equipe do hub</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8 flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-[#4A5BFF]/30 via-[#6E4FFF]/20 to-[#B249FF]/30 px-5 py-4 text-sm">
                <div>
                  <p className="font-semibold text-white">Novo briefing disponível</p>
                  <p className="text-xs text-slate-300">Marcas selecionadas pelo time de curadoria para o próximo drop</p>
                </div>
                <button
                  onClick={() => navigate('/login/creators')}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  Ver oportunidades
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="bg-white/5 py-16" id="beneficios">
          <div className="mx-auto max-w-6xl px-6">
            <motion.p {...fadeInUp()} className="text-center text-sm uppercase tracking-[0.35em] text-slate-400">
              dados que criam confiança
            </motion.p>
            <motion.h2
              {...fadeInUp()}
              className="mt-4 text-center text-3xl font-semibold text-white md:text-4xl"
            >
              Aceleradora digital que potencializa creators independentes
            </motion.h2>
            <motion.div
              {...fadeInUp()}
              className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {impactMetrics.map((metric) => (
                <div key={metric.label} className="glass-panel p-6 text-center">
                  <p className="text-3xl font-bold text-white">{metric.value}</p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-[#A1A6FF]">{metric.label}</p>
                  <p className="mt-3 text-sm text-slate-300">{metric.detail}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20" id="experiencia">
          <motion.div {...fadeInUp()} className="text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">benefícios do hub</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Marketplace + inteligência de negócios em cada entrega</h2>
          </motion.div>
          <motion.div
            {...fadeInUp()}
            className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3"
          >
            {valueProps.map(({ icon: Icon, title, highlight, description }) => (
              <div key={title} className="glass-panel group flex flex-col gap-6 p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[#A1A6FF]">
                  {highlight}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[#C6CBFF]">
                  <Icon className="h-6 w-6 text-[#A78BFA]" />
                </div>
                <h3 className="text-2xl font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-300">{description}</p>
                <div className="mt-auto text-xs font-semibold uppercase tracking-[0.35em] text-transparent">
                  {title}
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        <section className="bg-white/5 py-20" id="diferenciais">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div {...fadeInUp()} className="md:flex md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">por dentro do fluxo</p>
                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Sua jornada dentro do hub, fase a fase</h2>
              </div>
              <p className="mt-6 max-w-xl text-slate-300 md:mt-0">
                Cada etapa foi desenhada para reduzir ruído, garantir pagamento e amplificar seu posicionamento como creator premium dentro do ecossistema UGC Hub.
              </p>
            </motion.div>

            <motion.div
              {...fadeInUp()}
              className="mt-12 grid gap-6 md:grid-cols-2"
            >
              {creatorJourney.map(({ step, title, description }) => (
                <div key={step} className="glass-panel flex items-start gap-6 p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4A5BFF] to-[#B249FF] text-xl font-semibold text-white">
                    {step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <p className="mt-3 text-sm text-slate-300">{description}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              {...fadeInUp()}
              className="mt-16 grid gap-6 md:grid-cols-3"
            >
              {differentiators.map(({ icon: Icon, title, description }) => (
                <div key={title} className="glass-panel flex flex-col gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                    <Icon className="h-6 w-6 text-[#A78BFA]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                  <p className="text-sm text-slate-300">{description}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20" id="comunidade">
          <motion.div {...fadeInUp()} className="flex flex-col items-center text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">comunidade do hub</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Creators que já vivem o futuro do UGC</h2>
            <p className="mt-4 max-w-3xl text-slate-300">
              Com suporte do time do UGC Hub você fecha campanhas que valorizam seu trabalho, cria recorrência e acessa relatórios para comprovar sua performance em cada entrega.
            </p>
          </motion.div>

          <motion.div
            {...fadeInUp()}
            className="mt-12 grid gap-6 md:grid-cols-2"
          >
            {creatorQuotes.map(({ name, role, quote }) => (
              <div key={name} className="glass-panel flex flex-col gap-4 p-8">
                <p className="text-lg italic text-slate-100">{quote}</p>
                <div className="flex items-center gap-3 pt-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#4A5BFF] to-[#B249FF] text-sm font-semibold">
                    {name.split(' ')[0].charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeInUp()} className="mt-16 flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-r from-[#4A5BFF]/40 via-[#6E4FFF]/30 to-[#B249FF]/40 p-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-200">
              infraestrutura ugc hub
            </div>
            <h3 className="max-w-3xl text-3xl font-semibold text-white md:text-4xl">
              Entre para a base de creators que criam com marcas líderes sem abrir mão da liberdade autoral
            </h3>
            <p className="max-w-2xl text-slate-200">
              Cadastre-se, personalize seu portfólio com a identidade UGC Hub e receba convites que combinam com a sua assinatura criativa.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => navigate('/login/creators')}
                className="group inline-flex items-center gap-3 rounded-full bg-white px-7 py-3 text-base font-semibold text-[#2A2F66] transition hover:scale-[1.02]"
              >
                Quero acessar minha área
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => navigate('/auth/register/creators')}
                className="rounded-full border border-white/20 px-7 py-3 text-base font-semibold text-white transition hover:border-white/40"
              >
                Criar perfil agora
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-[0.35em] text-slate-200">
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#A78BFA]" /> Proteção do hub
              </div>
              <div className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#A78BFA]" /> feedback em até 48h
              </div>
              <div className="inline-flex items-center gap-2">
                <Award className="h-4 w-4 text-[#A78BFA]" /> programas de fidelidade
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#060813]/90 py-12 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] text-sm font-semibold">
                UGC
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">UGC Hub</p>
                <p className="text-base font-semibold text-white">UGC Hub Creators</p>
              </div>
            </div>
            <p className="mt-4 max-w-lg text-sm text-slate-400">
              Uma plataforma independente com design líquido, tecnologia de matchmaking em tempo real e suporte humano para creators que querem viver de conteúdo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm text-slate-300 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Mapa</p>
              <ul className="mt-3 space-y-2">
                <li><a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a></li>
                <li><a href="#experiencia" className="hover:text-white transition-colors">Experiência</a></li>
                <li><a href="#diferenciais" className="hover:text-white transition-colors">Diferenciais</a></li>
                <li><a href="#comunidade" className="hover:text-white transition-colors">Comunidade</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Recursos</p>
              <ul className="mt-3 space-y-2">
                <li><a href="#experiencia" className="hover:text-white transition-colors">Guia da experiência</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Central de ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos & privacidade</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Contato</p>
              <ul className="mt-3 space-y-2">
                <li><a href="mailto:hello@ugc-hub.com" className="hover:text-white transition-colors">hello@ugc-hub.com</a></li>
                <li><a href="https://www.linkedin.com/company/ugc-hub" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a></li>
                <li><a href="https://www.instagram.com/ugc.hub" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 text-center text-xs uppercase tracking-[0.35em] text-slate-500">
          2025 © UGC Hub • Creators
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;