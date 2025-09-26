import React, { useState, useRef } from 'react';
import { 
  Activity, Users, MessageCircle, FileText, Clock, 
  ChevronDown, ChevronUp, Search, Zap, CheckCircle,
  UserCheck, MessageSquare, Upload, AlertCircle,
  Settings, Plus
} from 'lucide-react';
import { useRealTimeCollaboration } from '../../hooks/useRealTimeCollaboration';
import { useAuth } from '../../contexts/AuthContext';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';

interface RealTimeCollaborationHubProps {
  className?: string;
  compact?: boolean;
  showActivityFeed?: boolean;
  showPresence?: boolean;
  showQuickActions?: boolean;
}

const RealTimeCollaborationHub: React.FC<RealTimeCollaborationHubProps> = ({
  className = '',
  compact = false,
  showActivityFeed = true,
  showPresence = true,
  showQuickActions = true
}) => {
  const { user } = useAuth();
  const { analyst } = useAnalystAuth();
  const currentUser = user || analyst;
  
  const {
    activityFeed,
    // userPresence,
    loading,
    error,
    markActivityAsRead,
    clearActivityFeed,
    getUnreadActivityCount,
    getHighPriorityActivities,
    // updatePresence,
    getOnlineUsers,
    createCollaborativeSession,
    uploadSharedFile,
    // updateNotificationPreferences,
    // notificationPreferences
  } = useRealTimeCollaboration({
    enableActivityFeed: showActivityFeed,
    enablePresence: showPresence,
    enableMessageStatus: true,
    activityFeedLimit: 30
  });

  const [activeTab, setActiveTab] = useState<'activity' | 'presence' | 'sessions' | 'settings'>('activity');
  const [activityFilter, setActivityFilter] = useState<'all' | 'unread' | 'high-priority'>('unread');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter activities based on current filter
  const filteredActivities = activityFeed.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    if (!matchesSearch) return false;
    
    switch (activityFilter) {
      case 'unread':
        return !activity.read;
      case 'high-priority':
        return activity.priority <= 2;
      default:
        return true;
    }
  });

  const onlineUsers = getOnlineUsers();
  const unreadCount = getUnreadActivityCount();
  const highPriorityCount = getHighPriorityActivities().length;

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  // Get activity icon
  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'message_sent':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'deliverable_created':
      case 'deliverable_updated':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'deliverable_submitted':
        return <Upload className="h-4 w-4 text-orange-500" />;
      case 'deliverable_approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'deliverable_rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'file_uploaded':
        return <Upload className="h-4 w-4 text-purple-500" />;
      case 'collaboration_started':
        return <Users className="h-4 w-4 text-indigo-500" />;
      case 'deadline_reminder':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'border-l-red-500 bg-red-50';
      case 2: return 'border-l-orange-500 bg-orange-50';
      case 3: return 'border-l-blue-500 bg-blue-50';
      case 4: return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploadedFile = await uploadSharedFile(file, {
        accessLevel: 'shared',
        permissions: { can_download: true, can_share: true }
      });
      
      if (uploadedFile) {
        // Show success notification or update UI
        console.log('File uploaded successfully:', uploadedFile);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    }
  };

  // Create collaborative session
  const handleCreateSession = async (sessionData: {
    name: string;
    type: string;
    description?: string;
  }) => {
    try {
      const sessionId = await createCollaborativeSession(
        sessionData.name,
        sessionData.type,
        {
          description: sessionData.description,
          settings: { allow_screen_share: true, record_session: false }
        }
      );
      
      if (sessionId) {
        setShowSessionModal(false);
        // Navigate to session or show success
        console.log('Session created:', sessionId);
      }
    } catch (err) {
      console.error('Error creating session:', err);
    }
  };

  if (loading && activityFeed.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center justify-center h-32 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Colaboração</h3>
            </div>
            
            {(unreadCount > 0 || highPriorityCount > 0) && (
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {unreadCount} novos
                  </span>
                )}
                {highPriorityCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {highPriorityCount} urgentes
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {showQuickActions && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                  title="Upload arquivo"
                >
                  <Upload className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                  title="Criar sessão colaborativa"
                >
                  <Plus className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                  title="Configurações"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </>
            )}

            {compact && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        {isExpanded && (
          <div className="mt-4 flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'activity', label: 'Atividades', icon: Activity, count: unreadCount },
              { key: 'presence', label: 'Presença', icon: Users, count: onlineUsers.length },
              { key: 'sessions', label: 'Sessões', icon: MessageCircle, count: 0 }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-purple-600 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Activity Feed Tab */}
          {activeTab === 'activity' && showActivityFeed && (
            <div className="space-y-4">
              {/* Activity Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar atividades..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value as typeof activityFilter)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todas</option>
                    <option value="unread">Não lidas ({unreadCount})</option>
                    <option value="high-priority">Prioritárias ({highPriorityCount})</option>
                  </select>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={clearActivityFeed}
                    className="px-3 py-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* Activity List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`border-l-4 p-3 rounded-lg cursor-pointer hover:shadow-sm transition-shadow ${
                      activity.read ? 'bg-white' : getPriorityColor(activity.priority)
                    }`}
                    onClick={() => !activity.read && markActivityAsRead(activity.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm ${activity.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                            {activity.title}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                        </div>
                        
                        {activity.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {activity.description}
                          </p>
                        )}

                        {activity.metadata.opportunity_title && (
                          <div className="flex items-center mt-2 text-xs text-gray-400">
                            <FileText className="h-3 w-3 mr-1" />
                            {activity.metadata.opportunity_title}
                          </div>
                        )}
                      </div>

                      {!activity.read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredActivities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Nenhuma atividade encontrada</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Presence Tab */}
          {activeTab === 'presence' && showPresence && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Usuários Online</h4>
                <span className="text-sm text-gray-500">
                  {onlineUsers.length} online
                </span>
              </div>

              <div className="space-y-2">
                {onlineUsers.map((presence) => (
                  <div key={presence.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {presence.user?.avatar_url ? (
                          <img
                            src={presence.user.avatar_url}
                            alt={presence.user.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <UserCheck className="h-4 w-4 text-purple-600" />
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          presence.status === 'online' ? 'bg-green-500' :
                          presence.status === 'away' ? 'bg-yellow-500' :
                          presence.status === 'busy' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {presence.user?.name || 'Usuário'}
                        </p>
                        {presence.current_activity && (
                          <p className="text-xs text-gray-500">
                            {presence.current_activity}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="text-xs text-gray-400">
                      {formatTimeAgo(presence.last_seen)}
                    </span>
                  </div>
                ))}

                {onlineUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum usuário online</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Sessões Colaborativas</h4>
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  Nova Sessão
                </button>
              </div>

              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma sessão ativa</p>
                <p className="text-xs mt-1">Crie uma sessão para colaborar em tempo real</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
      />

      {/* Modals would go here - SessionModal, SettingsModal, etc. */}
    </div>
  );
};

export default RealTimeCollaborationHub;