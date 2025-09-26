import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Target, MessageCircle, GraduationCap, User, HelpCircle, Lock, Folder } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AnalystAuthProvider, useAnalystAuth } from './contexts/AnalystAuthContext';
import { useRouter } from './hooks/useRouter';
import { supabase } from './lib/supabase';
import CreatorRouter from './components/creator/CreatorRouter';
import GlobalSearch from './components/GlobalSearch';
import NotificationDropdown from './components/NotificationDropdown';
import AuthPage from './components/auth/AuthPage';
import CreatorLoginPage from './components/auth/CreatorLoginPage';
import AnalystLoginPage from './components/auth/AnalystLoginPage';
import AnalystAuthPage from './components/analyst/AnalystAuthPage';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
            UGC
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não tem perfil, mostra tela de login
  if (!profile) {
    return <AnalystAuthPage />;
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
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const { user, loading, signOut, profile } = useAuth();
  const { currentPath, navigate } = useRouter();

  const handleOpenConversation = (projectId: string) => { // Changed parameter name for clarity
    setSelectedProjectId(projectId);
    navigate(`/creators/messages/${projectId}`); // Navigate directly to project chat
  };

  const handleBackToMessagesList = () => {
    setSelectedProjectId(null);
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

  // Redirect to /creators/opportunities if on root creators path
  useEffect(() => {
    if (currentPath === '/creators') {
      navigate('/creators/opportunities');
    }
  }, [currentPath, navigate]);

  // Fetch opportunities count when user loads
  useEffect(() => {
    if (user) {
      fetchOpportunitiesCount();
    }
  }, [user, fetchOpportunitiesCount]);

  // Se ainda está carregando, mostra loading
  if (loading) {
    console.log('⏳ [CREATOR APP] Still loading... user:', !!user, 'profile:', !!profile);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">
            UGC
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  console.log('🔍 [CREATOR APP] Auth check - user:', !!user, 'profile:', profile, 'role:', profile?.role);

  // Se não tem usuário ou perfil, mostra tela de login
  if (!user || !profile || profile.role !== 'creator') {
    console.log('❌ [CREATOR APP] Auth failed - redirecting to login');
    return <AuthPage />;
  }

  console.log('✅ [CREATOR APP] Auth success - rendering creator interface');

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 overflow-hidden ${
          sidebarExpanded ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div 
          className="flex items-center h-16 px-4 border-b border-gray-200"
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            UGC
          </div>
          <span className={`ml-3 font-semibold text-gray-900 transition-opacity duration-300 ${
            sidebarExpanded ? 'opacity-100' : 'opacity-0'
          }`}>
            UGC Hub
          </span>
        </div>

        {/* Navigation */}
        <nav 
          className="mt-8 px-2"
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-3 py-3 mb-1 rounded-lg text-left transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`ml-3 transition-opacity duration-300 ${
                  sidebarExpanded ? 'opacity-100' : 'opacity-0'
                }`}>
                  {item.label}
                </span>
                {item.locked && (
                  <Lock className={`w-4 h-4 ml-auto flex-shrink-0 transition-opacity duration-300 ${
                    sidebarExpanded ? 'opacity-100' : 'opacity-0'
                  } text-gray-400`} />
                )}
                {item.badge && (
                  <span className={`ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-opacity duration-300 ${
                    sidebarExpanded ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {item.badge}
                  </span>
                )}
                
                {/* Tooltip for collapsed state */}
                {!sidebarExpanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label} {item.locked && '🔒'}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div 
          className="absolute bottom-4 left-2 right-2"
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className={`flex items-center rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-300 ${
            sidebarExpanded ? 'px-3 py-2' : 'px-2 py-2 justify-center'
          }`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div className={`ml-3 transition-opacity duration-300 min-w-0 flex-1 ${
              sidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="text-sm font-medium text-gray-900 truncate">{user.user_metadata?.name || user.email}</div>
              <div className="text-xs text-gray-500">Criador</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarExpanded ? 'ml-64' : 'ml-16'}`}>
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 fixed top-0 right-0 z-40" style={{ left: sidebarExpanded ? '256px' : '64px' }}>
          <GlobalSearch />
          
          <div className="flex items-center space-x-4">
            <NotificationDropdown />
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{user.user_metadata?.name || user.email}</div>
                  <div className="text-xs text-gray-500">Criador</div>
                </div>
              </button>

              {showUserDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/creators/profile');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => {
                          navigate('/creators/settings');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Configurações da Conta
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          signOut();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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

        {/* Page Content */}
        <main className="p-6 mt-16">
          <CreatorRouter 
            onOpenConversation={handleOpenConversation}
            selectedConversationId={selectedProjectId} // Will be renamed in CreatorRouter interface
            onBackToList={handleBackToMessagesList}
          />
        </main>
      </div>
    </div>
  );
}

function App() {
  const { currentPath } = useRouter();

  console.log('Current path:', currentPath); // Debug log

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
  console.log('Fallback to landing page for path:', currentPath);
  return <LandingPage />;
}

export default App;