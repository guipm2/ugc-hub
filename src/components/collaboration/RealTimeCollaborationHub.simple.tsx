import React, { useState } from 'react';
import { Activity, Users, Bell, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';
import useRealTimeCollaboration from '../../hooks/useRealTimeCollaboration.simple';

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
  const { profile: analyst } = useAnalystAuth();
  
  const {
    activityFeed,
    // userPresence,
    loading,
    error,
    markActivityAsRead,
    getUnreadActivityCount,
    getOnlineUsers
  } = useRealTimeCollaboration({
    enableActivityFeed: showActivityFeed,
    enablePresence: showPresence,
    enableMessageStatus: true,
    activityFeedLimit: 10
  });

  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState<'activity' | 'presence'>('activity');

  const onlineUsers = getOnlineUsers();
  const unreadCount = getUnreadActivityCount();

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Colaboração</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {isExpanded ? 
          <ChevronUp className="w-4 h-4 text-gray-400" /> : 
          <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </div>

      {isExpanded && (
        <div className="p-4">
          {/* Tabs */}
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeTab === 'activity'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Atividades
            </button>
            <button
              onClick={() => setActiveTab('presence')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeTab === 'presence'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Online ({onlineUsers.length})
            </button>
          </div>

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              {activityFeed.length > 0 ? (
                activityFeed.slice(0, compact ? 5 : 10).map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      activity.read
                        ? 'bg-gray-50 border-gray-100'
                        : 'bg-blue-50 border-blue-100'
                    }`}
                    onClick={() => markActivityAsRead(activity.id)}
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        activity.read ? 'bg-gray-300' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">
                          {activity.title}
                        </h4>
                        {activity.description && (
                          <p className="text-xs text-gray-600 mb-1">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(activity.created_at).toLocaleString('pt-BR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nenhuma atividade recente</p>
                </div>
              )}
            </div>
          )}

          {/* Presence Tab */}
          {activeTab === 'presence' && (
            <div className="space-y-2">
              {onlineUsers.length > 0 ? (
                onlineUsers.map((presence) => (
                  <div key={presence.user_id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      U
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        Usuário {presence.user_id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        Online
                        {presence.current_activity && ` • ${presence.current_activity}`}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nenhum usuário online</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {showQuickActions && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors">
                  <Bell className="w-3 h-3 inline mr-1" />
                  Notificações
                </button>
                <button className="flex-1 px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                  <Settings className="w-3 h-3 inline mr-1" />
                  Configurar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeCollaborationHub;