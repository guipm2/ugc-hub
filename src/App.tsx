import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Target, MessageCircle, GraduationCap, User, HelpCircle, Lock, Folder } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { AnalystAuthProvider, useAnalystAuth } from './contexts/AnalystAuthContext';
import { useRouter } from './hooks/useRouter';
import { supabase } from './lib/supabase';
import CreatorRouter from './components/creator/CreatorRouter';
import CreatorOnboarding from './components/CreatorOnboarding';
import GlobalSearch from './components/GlobalSearch';
import NotificationDropdown from './components/NotificationDropdown';
import CreatorLoginPage from './components/auth/CreatorLoginPage';
import AnalystLoginPage from './components/auth/AnalystLoginPage';
import EmailConfirmationPage from './components/auth/EmailConfirmationPage';
import AnalystDashboard from './components/analyst/AnalystDashboard';
import LandingPage from './components/LandingPage';

function AnalystApp() {
  const { profile, loading } = useAnalystAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { navigate } = useRouter();

  const handleOpenConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    navigate('/analysts/messages');
  };

  const handleBackToMessagesList = () => {
    setSelectedConversationId(null);
  };

  // Se ainda está carregando, mostra loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
            UGC
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não tem perfil, mostrar página de login de analistas (não redirecionar)
  if (!profile) {
    return <AnalystLoginPage />;
  }

  return (
    <AnalystDashboard 
      onOpenConversation={handleOpenConversation}
      selectedConversationId={selectedConversationId}
      onBackToList={handleBackToMessagesList}
    />
  );
}

function CreatorApp() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null); // Changed from selectedConversationId
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSidebarUserDropdown, setShowSidebarUserDropdown] = useState(false);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [profileTimeout, setProfileTimeout] = useState(false);
  const { user, loading, signOut, profile } = useAuth();
  const { currentPath, navigate } = useRouter();

  // Timeout para profile loading - aumentado para 15 segundos
  useEffect(() => {
    if (user && !profile && !loading) {
      const timeoutId = setTimeout(() => {
        setProfileTimeout(true);
      }, 15000); // Aumentado para 15 segundos

      return () => clearTimeout(timeoutId);
    } else if (profile) {
      setProfileTimeout(false);
    }
  }, [user, profile, loading]);

  const handleOpenConversation = (projectId: string) => { // Changed parameter name for clarity
    setSelectedProjectId(projectId);
    navigate(`/creators/messages/${projectId}`); // Navigate directly to project chat
  };

  const handleBackToMessagesList = () => {
    setSelectedProjectId(null);
    navigate('/creators/messages');
  };

  // Fetch opportunities count
  const fetchOpportunitiesCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      if (error) {
        console.error('Erro ao buscar contagem de oportunidades:', error);
      } else {
        setOpportunitiesCount(count || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar contagem de oportunidades:', err);
    }
  }, [user]);

  // Redirect automático após login bem-sucedido
  useEffect(() => {
    if (user && profile && profile.role === 'creator') {
      // Se está numa página de login ou root, redireciona para opportunities
      if (currentPath === '/creators' || currentPath === '/login/creators' || currentPath === '/') {
        navigate('/creators/opportunities');
      }
    }
  }, [user, profile, currentPath, navigate]);

  // Redirect to /creators/opportunities if on root creators path
  useEffect(() => {
    if (currentPath === '/creators' && user && profile) {
      navigate('/creators/opportunities');
    }
  }, [currentPath, navigate, user, profile]);

  // Fetch opportunities count when user loads
  useEffect(() => {
    if (user) {
      fetchOpportunitiesCount();
    }
  }, [user, fetchOpportunitiesCount]);

  // Se ainda está carregando, mostra loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
            UGC
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não tem usuário ou perfil, redireciona para landing page
  // Se profile timeout, força logout
  if (!user || (!profile && !loading && profileTimeout) || (profile && profile.role !== 'creator')) {
    if (profileTimeout) {
      signOut();
    }
    // Usar navigate em vez de renderizar a página obsoleta
    navigate('/');
    return null;
  }

  // Se ainda está carregando profile sem timeout
  if (!profile && !profileTimeout) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
            UGC
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando perfil...</p>
          
          {/* Botão de emergência para forçar logout */}
          <button
            onClick={() => {
              signOut();
            }}
            className="mt-8 px-4 py-2 bg-red-600 text-white rounded-lg transition-colors hover:bg-red-700 dark:hover:bg-red-500"
          >
            Forçar Logout (Caso Esteja Travado)
          </button>
        </div>
      </div>
    );
  }

  // Verificar se precisa completar onboarding
  if (profile && !profile.onboarding_completed) {
    return (
      <CreatorOnboarding 
        onComplete={() => {
          // Recarregar perfil após completar onboarding
          window.location.reload();
        }} 
      />
    );
  }

  const menuItems = [
    { path: '/creators/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/creators/opportunities', label: 'Oportunidades', icon: Target, badge: opportunitiesCount > 0 ? opportunitiesCount : undefined },
    { path: '/creators/projects', label: 'Projetos', icon: Folder },
    { path: '/creators/messages', label: 'Mensagens', icon: MessageCircle },
    { path: '/creators/training', label: 'Treinamentos', icon: GraduationCap, locked: true },
    { path: '/creators/profile', label: 'Perfil', icon: User },
    { path: '/creators/help', label: 'Ajuda', icon: HelpCircle }
  ];

  const isActiveRoute = (path: string) => {
    return currentPath === path;
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden text-slate-100">
      {/* Sidebar */}
      <div
        className={`glass-sidebar fixed left-0 top-0 z-50 h-full overflow-hidden transition-all duration-300 ${
          sidebarExpanded ? 'w-72' : 'w-20'
        }`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo */}
        <div className="flex h-20 items-center px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] text-sm font-bold text-white">
            UGC
          </div>
          <span
            className={`text-sm font-semibold uppercase tracking-[0.45em] text-slate-200 transition-all duration-300 ${
              sidebarExpanded ? 'ml-3 max-w-[160px] opacity-100' : 'ml-0 max-w-0 overflow-hidden opacity-0'
            }`}
          >
            Hub
          </span>
        </div>

        {/* Navigation */}
        <nav
          className="mt-6 flex flex-1 flex-col gap-0.5 px-2"
          style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'hidden' }}
        >
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.path);
            const buttonClasses = [
              'group relative w-full rounded-2xl transition-all duration-300',
              sidebarExpanded
                ? 'flex items-center gap-2 px-4 py-2.5'
                : 'flex flex-col items-center justify-center gap-1 px-0 py-3'
            ];

            buttonClasses.push(
              isActive
                ? sidebarExpanded
                  ? 'bg-gradient-to-r from-[#4A5BFF]/85 via-[#6E4FFF]/80 to-[#B249FF]/70 text-white shadow-[0_20px_55px_-26px_rgba(74,91,255,0.65)]'
                  : 'text-white'
                : sidebarExpanded
                  ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                  : 'text-slate-300 hover:text-white'
            );

            const iconWrapperClasses = [
              'flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 transition-all duration-300 shadow-inner shadow-black/30',
              isActive
                ? 'bg-gradient-to-br from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF]'
                : 'bg-white/5 group-hover:bg-white/10'
            ].join(' ');

            return (
              <button key={item.path} onClick={() => navigate(item.path)} className={buttonClasses.join(' ')}>
                <div className="relative">
                  <div className={iconWrapperClasses}>
                    <Icon
                      className={`h-5 w-5 ${
                        isActive
                          ? 'text-white drop-shadow-[0_0_12px_rgba(110,79,255,0.65)]'
                          : 'text-slate-300 group-hover:text-white/90'
                      }`}
                    />
                  </div>
                  {!sidebarExpanded && item.locked && (
                    <Lock className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-slate-200" />
                  )}
                  {!sidebarExpanded && item.badge && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gradient-to-r from-[#FF6CAB] to-[#7366FF] px-1 text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`whitespace-nowrap text-sm font-medium tracking-wide transition-all duration-300 ${
                    sidebarExpanded
                      ? 'ml-1 opacity-100 translate-x-0'
                      : 'ml-0 max-w-0 overflow-hidden opacity-0 -translate-x-2 pointer-events-none'
                  }`}
                >
                  {item.label}
                </span>

                {sidebarExpanded && (item.badge || item.locked) && (
                  <div className="ml-auto flex items-center gap-2">
                    {item.locked && <Lock className="h-4 w-4 text-slate-300" />}
                    {item.badge && (
                      <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-gradient-to-r from-[#FF6CAB] to-[#7366FF] px-2 text-xs font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {!sidebarExpanded && (
                  <div className="pointer-events-none absolute left-full ml-3 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200 opacity-0 backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-5 left-2 right-2">
          <div className="relative">
            <button
              onClick={() => setShowSidebarUserDropdown(!showSidebarUserDropdown)}
              className={`group flex w-full items-center rounded-2xl bg-white/5 text-left transition-all duration-300 hover:bg-white/10 ${
                sidebarExpanded ? 'justify-start gap-3 px-4 py-3' : 'justify-center px-0 py-2'
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] text-sm font-semibold text-white">
                {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <div
                className={`min-w-0 transition-all duration-300 ${
                  sidebarExpanded ? 'opacity-100 ml-2' : 'pointer-events-none opacity-0 max-w-0 ml-0 overflow-hidden'
                }`}
              >
                <div className="truncate text-sm font-semibold text-white">
                  {user.user_metadata?.name || user.email}
                </div>
                <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Creator</div>
              </div>
            </button>

            {showSidebarUserDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSidebarUserDropdown(false)} />
                <div
                  className={`absolute bottom-full mb-3 w-52 overflow-hidden rounded-2xl border border-white/12 bg-slate-950/95 backdrop-blur-[30px] saturate-150 ${
                    sidebarExpanded ? 'left-0' : 'left-1/2 -translate-x-1/2'
                  } z-20`}
                >
                  <div className="divide-y divide-white/10 text-sm text-slate-200">
                    <button
                      onClick={() => {
                        navigate('/creators/profile');
                        setShowSidebarUserDropdown(false);
                      }}
                      className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
                    >
                      Meu Perfil
                    </button>
                    <button
                      onClick={() => {
                        navigate('/creators/settings');
                        setShowSidebarUserDropdown(false);
                      }}
                      className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
                    >
                      Configurações da Conta
                    </button>
                    <button
                      onClick={() => {
                        setShowSidebarUserDropdown(false);
                        signOut();
                      }}
                      className="block w-full px-4 py-3 text-left text-rose-300 transition hover:bg-rose-500/10"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarExpanded ? 'ml-72' : 'ml-20'}`}>
        <header
          className="glass-header overflow-visible fixed top-0 right-0 z-40 flex h-20 items-center justify-between px-6"
          style={{ left: sidebarExpanded ? '288px' : '80px' }}
        >
          <div className="w-full max-w-xl">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] text-sm font-semibold text-white">
                  {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">
                    {user.user_metadata?.name || user.email}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.45em] text-slate-400">Creator</div>
                </div>
              </button>

              {showUserDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserDropdown(false)} />
                  <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-white/12 bg-slate-950/95 backdrop-blur-[30px] saturate-150 shadow-[0_25px_70px_-30px_rgba(12,18,45,0.85)]">
                    <div className="divide-y divide-white/10 text-sm text-slate-200">
                      <button
                        onClick={() => {
                          navigate('/creators/profile');
                          setShowUserDropdown(false);
                        }}
                        className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
                      >
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => {
                          navigate('/creators/settings');
                          setShowUserDropdown(false);
                        }}
                        className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
                      >
                        Configurações da Conta
                      </button>
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          signOut();
                        }}
                        className="block w-full px-4 py-3 text-left text-rose-300 transition hover:bg-rose-500/10"
                      >
                        Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 mt-20 px-6 pb-10">
          <CreatorRouter
            onOpenConversation={handleOpenConversation}
            selectedConversationId={selectedProjectId}
            onBackToList={handleBackToMessagesList}
          />
        </main>
      </div>
    </div>
  );
}

function App() {
  const { currentPath } = useRouter();

  // Handle login routes first (more specific)
  if (currentPath === '/login/creators') {
    return (
      <AuthProvider>
        <CreatorLoginPage />
      </AuthProvider>
    );
  }

  if (currentPath === '/login/analysts') {
    return (
      <AnalystAuthProvider>
        <AnalystLoginPage />
      </AnalystAuthProvider>
    );
  }

  // Handle generic auth routes
  if (currentPath === '/auth/email-confirmed') {
    return <EmailConfirmationPage />;
  }

  // Handle root route
  if (currentPath === '/') {
    return <LandingPage />;
  }

  // Handle analyst routes
  if (currentPath.startsWith('/analysts')) {
    return (
      <AnalystAuthProvider>
        <AnalystApp />
      </AnalystAuthProvider>
    );
  }

  // Handle creator routes
  if (currentPath.startsWith('/creators')) {
    return (
      <AuthProvider>
        <CreatorApp />
      </AuthProvider>
    );
  }

  // Default fallback to landing page for any unmatched route
  return <LandingPage />;
}

export default App;