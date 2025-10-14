import React from 'react';
import { Users, Target, TrendingUp } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  topSlot?: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, topSlot }) => {
  const features = [
    {
      icon: Target,
      title: 'Oportunidades certeiras',
      description: 'Campanhas alinhadas ao seu posicionamento, com briefing inteligente e feedback ágil.'
    },
    {
      icon: Users,
      title: 'Curadoria de creators',
      description: 'Seleções diárias, squads temáticos e comunidade premium para trocar experiências.'
    },
    {
      icon: TrendingUp,
      title: 'Performance transparente',
      description: 'Dashboards vivos e indicadores em tempo real para provar o impacto de cada entrega.'
    }
  ];

  const highlightStats = [
    { value: '7.1K+', label: 'peças já entregues' },
    { value: '48h', label: 'feedback médio' }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060F] text-slate-100">
      <div className="pointer-events-none absolute -left-56 top-[-10rem] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(73,121,255,0.45)_0%,rgba(9,9,23,0)_72%)] blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-24 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,rgba(172,64,255,0.42)_0%,rgba(9,9,23,0)_75%)] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-20 bottom-[-18rem] h-[400px] rounded-full bg-[radial-gradient(circle_at_top,rgba(67,97,238,0.28)_0%,rgba(9,9,23,0)_70%)] blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Left column */}
        <div className="hidden lg:flex lg:w-[48%] flex-col justify-between px-14 py-16">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4361EE] via-[#5F3BFF] to-[#A855F7] text-lg font-semibold">
                UGC
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.38em] text-slate-400">Marketplace de creators</p>
                <span className="text-xl font-semibold text-white">UGC Hub</span>
              </div>
            </div>

            <h1 className="mt-10 text-4xl font-semibold leading-tight text-white">
              Crie com marcas que falam a sua língua
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300">
              Conectamos creators independentes a campanhas estratégicas, com suporte humano, contratos inteligentes e dados que fortalecem seu posicionamento.
            </p>
          </div>

          <div className="mt-12 space-y-5">
            {features.map(({ icon: Icon, title: featureTitle, description }) => (
              <div key={featureTitle} className="glass-panel flex items-start gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <Icon className="h-6 w-6 text-[#A78BFA]" />
                </div>
                <div className="text-sm">
                  <h3 className="text-base font-semibold text-white">{featureTitle}</h3>
                  <p className="mt-2 text-slate-300">{description}</p>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              {highlightStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/15 bg-white/5 px-5 py-4 text-center shadow-[0_20px_45px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
                >
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-300">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 md:px-12">
          <div className="w-full max-w-md space-y-10">
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4361EE] via-[#5F3BFF] to-[#A855F7] text-sm font-semibold">
                UGC
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.38em] text-slate-400">Marketplace</p>
                <span className="text-base font-semibold text-white">UGC Hub</span>
              </div>
            </div>

            <div className="glass-panel px-8 py-10">
              {topSlot && <div className="mb-6">{topSlot}</div>}
              <div className="space-y-3 text-center">
                <h2 className="text-3xl font-semibold text-white">{title}</h2>
                <p className="text-sm text-slate-300">{subtitle}</p>
              </div>
              <div className="mt-8">
                {children}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center text-xs uppercase tracking-[0.35em] text-slate-300">
              Criadores independentes • Negócios recorrentes • IA + curadoria humana
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;