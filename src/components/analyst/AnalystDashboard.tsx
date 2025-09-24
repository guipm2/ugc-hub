import React, { useState } from 'react';
import { LayoutDashboard, Target, Users, MessageCircle, Package, Calendar, FolderOpen } from 'lucide-react';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';
import { useRouter } from '../../hooks/useRouter';
import AnalystGlobalSearch from './AnalystGlobalSearch';
import AnalystRouter from './AnalystRouter';
import AnalystNotificationDropdown from './NotificationDropdown';

interface AnalystDashboardProps {
  onOpenConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
  onBackToList: () => void;
}

const AnalystDashboard: React.FC<AnalystDashboardProps> = ({ 
  onOpenConversation, 
  selectedConversationId, 
  onBackToList 
}) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSidebarUserDropdown, setShowSidebarUserDropdown] = useState(false);
  const { profile, signOut } = useAnalystAuth();
  const { currentPath, navigate } = useRouter();
  
  const menuItems = [
    { path: '/analysts/overview', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analysts/opportunities', label: 'Oportunidades', icon: Target },
    { path: '/analysts/stages', label: 'Gerenciar Etapas', icon: Package },
    { path: '/analysts/projects', label: 'Projetos', icon: FolderOpen },
    { path: '/analysts/deliverables', label: 'Prazos', icon: Calendar },
    { path: '/analysts/creators', label: 'Criadores', icon: Users },
    { path: '/analysts/messages', label: 'Mensagens', icon: MessageCircle }
  ];

  // Redirect to /analysts/overview if on root analysts path
  React.useEffect(() => {
    if (currentPath === '/analysts') {
      navigate('/analysts/overview');
    }
  }, [currentPath, navigate]);

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
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
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
                    ? 'bg-purple-50 text-purple-600 border-r-2 border-purple-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className={`ml-3 transition-opacity duration-300 ${
                  sidebarExpanded ? 'opacity-100' : 'opacity-0'
                }`}>
                  {item.label}
                </span>
                
                {/* Tooltip for collapsed state */}
                {!sidebarExpanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
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
          <div className="relative">
            <button
              onClick={() => setShowSidebarUserDropdown(!showSidebarUserDropdown)}
              className={`w-full flex items-center rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-300 group ${
                sidebarExpanded ? 'px-3 py-2' : 'px-2 py-2 justify-center'
              }`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {profile?.name?.charAt(0) || profile?.email?.charAt(0).toUpperCase()}
              </div>
              <div className={`ml-3 transition-opacity duration-300 min-w-0 flex-1 ${
                sidebarExpanded ? 'opacity-100' : 'opacity-0'
              }`}>
                <div className="text-sm font-medium text-gray-900 truncate">{profile?.name}</div>
                <div className="text-xs text-gray-500">{profile?.company}</div>
              </div>
            </button>
            
            {/* Tooltip for collapsed state */}
            {!sidebarExpanded && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {profile?.name}
              </div>
            )}

            {/* Sidebar User Dropdown */}
            {showSidebarUserDropdown && sidebarExpanded && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSidebarUserDropdown(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowSidebarUserDropdown(false);
                        navigate('/analysts/profile');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Meu Perfil
                    </button>
                    <button
                      onClick={() => {
                        navigate('/analysts/settings');
                        setShowSidebarUserDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Configurações da Conta
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setShowSidebarUserDropdown(false);
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
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarExpanded ? 'ml-64' : 'ml-16'}`}>
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 fixed top-0 right-0 z-40" style={{ left: sidebarExpanded ? '256px' : '64px' }}>
          <AnalystGlobalSearch />
          
          <div className="flex items-center space-x-4">
            <AnalystNotificationDropdown />
            
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {profile?.name?.charAt(0) || profile?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{profile?.name}</div>
                  <div className="text-xs text-gray-500">{profile?.company}</div>
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
                          setShowUserDropdown(false);
                          navigate('/analysts/profile');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => {
                          navigate('/analysts/settings');
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
          <AnalystRouter 
            onOpenConversation={onOpenConversation}
            selectedConversationId={selectedConversationId}
            onBackToList={onBackToList}
          />
        </main>
      </div>
    </div>
  );
};

export default AnalystDashboard;