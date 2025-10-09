import React, { useState } from 'react';
import { Bell, X, Check, Target, Users, MessageCircle, Calendar } from 'lucide-react';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { useRouter } from '../hooks/useRouter';

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { navigate } = useRouter();

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida se ainda não foi lida
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navegar baseado no tipo de notificação
    switch (notification.type) {
      case 'new_opportunity':
        // Se tiver opportunity_id, ir para a página específica da oportunidade
        if (notification.data.opportunity_id) {
          navigate(`/creators/opportunities/${notification.data.opportunity_id}`);
        } else {
          navigate('/creators/opportunities');
        }
        break;
      case 'new_application':
      case 'application_approved':
      case 'application_rejected':
        // Se tiver opportunity_id, ir para a página específica da oportunidade
        if (notification.data.opportunity_id) {
          navigate(`/creators/opportunities/${notification.data.opportunity_id}`);
        } else {
          navigate('/creators/opportunities');
        }
        break;
      case 'new_message':
        // Se tiver conversation_id, pode navegar direto para a conversa
        navigate('/creators/messages');
        break;
      case 'new_deliverable':
        // Navegar para a tela de projetos
        navigate('/creators/projects');
        break;
      default:
        // Navegação padrão
        navigate('/creators/dashboard');
        break;
    }

    // Fechar o dropdown
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_opportunity':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'new_application':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'application_approved':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'application_rejected':
        return <X className="h-4 w-4 text-red-600" />;
      case 'new_message':
        return <MessageCircle className="h-4 w-4 text-purple-600" />;
      case 'new_deliverable':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 z-20">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notificações</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/70 ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/40' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(notification.created_at)}
                            </span>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <button className="w-full text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  Ver todas as notificações
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;