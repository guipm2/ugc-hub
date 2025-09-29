import React, { useState } from 'react';
import { Bell, CheckCheck, Clock, MessageSquare, Target, Award, X } from 'lucide-react';
import { useNotifications, Notification } from '../../hooks/useNotifications';

interface CreatorNotificationCenterProps {
  variant?: 'dropdown' | 'full';
  className?: string;
  onClose?: () => void;
}

const CreatorNotificationCenter: React.FC<CreatorNotificationCenterProps> = ({ 
  variant = 'dropdown', 
  className = '',
  onClose
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'applications' | 'projects' | 'deadlines'>('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_approved':
      case 'application_rejected':
      case 'new_application':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'new_deliverable':
        return <Award className="h-4 w-4 text-green-600" />;
      case 'new_message':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'new_opportunity':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    const baseColor = isRead ? 'bg-gray-50' : 'bg-blue-50';
    const borderColor = isRead ? 'border-gray-200' : 'border-blue-200';
    
    switch (type) {
      case 'application_rejected':
        return isRead ? 'bg-red-50 border-red-200' : 'bg-red-100 border-red-300';
      case 'application_approved':
        return isRead ? 'bg-green-50 border-green-200' : 'bg-green-100 border-green-300';
      case 'new_deliverable':
        return isRead ? 'bg-orange-50 border-orange-200' : 'bg-orange-100 border-orange-300';
      default:
        return `${baseColor} ${borderColor}`;
    }
  };

  const getPriorityOrder = (notification: Notification) => {
    // Ordem de prioridade para ordenação
    const priorities = {
      'application_rejected': 1,
      'new_deliverable': 2, 
      'application_approved': 3,
      'new_application': 4,
      'new_message': 5,
      'new_opportunity': 6
    };
    return priorities[notification.type] || 7;
  };

  const filteredNotifications = notifications
    .filter(notification => {
      switch (filter) {
        case 'unread':
          return !notification.read;
        case 'applications':
          return ['application_approved', 'application_rejected', 'new_application'].includes(notification.type);
        case 'projects':
          return ['new_deliverable'].includes(notification.type);
        case 'deadlines':
          return notification.type === 'new_deliverable' && notification.data?.due_date;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // Primeiro por status de leitura (não lidas primeiro)
      if (a.read !== b.read) {
        return a.read ? 1 : -1;
      }
      // Depois por prioridade
      const priorityDiff = getPriorityOrder(a) - getPriorityOrder(b);
      if (priorityDiff !== 0) return priorityDiff;
      // Por último por data (mais recentes primeiro)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const displayNotifications = variant === 'dropdown' 
    ? filteredNotifications.slice(0, 5)
    : filteredNotifications;

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getNotificationTitle = (notification: Notification) => {
    switch (notification.type) {
      case 'application_approved':
        return 'Candidatura Aprovada';
      case 'application_rejected':
        return 'Candidatura Rejeitada';
      case 'new_application':
        return 'Nova Candidatura';
      case 'new_deliverable':
        return 'Novo Deliverable';
      case 'new_message':
        return 'Nova Mensagem';
      case 'new_opportunity':
        return 'Nova Oportunidade';
      default:
        return notification.title || 'Notificação';
    }
  };

  if (loading && variant === 'dropdown') {
    return (
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${
      variant === 'dropdown' ? 'w-80 max-h-96' : 'w-full'
    } ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">
              Notificações
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar todas como lidas
              </button>
            )}
            {variant === 'dropdown' && onClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters for full variant */}
        {variant === 'full' && (
          <div className="flex gap-2 mt-3">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'unread', label: 'Não Lidas' },
              { key: 'applications', label: 'Candidaturas' },
              { key: 'projects', label: 'Projetos' },
              { key: 'deadlines', label: 'Prazos' }
            ].map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as 'all' | 'unread' | 'applications' | 'projects' | 'deadlines')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className={`${variant === 'dropdown' ? 'max-h-80 overflow-y-auto' : ''}`}>
        {displayNotifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">
              {filter === 'all' ? 'Nenhuma notificação' : `Nenhuma notificação ${filter === 'unread' ? 'não lida' : filter}`}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg mb-2 border cursor-pointer transition-all hover:shadow-sm ${getNotificationColor(notification.type, notification.read)}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {getNotificationTitle(notification)}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    {notification.data?.opportunity_title && (
                      <p className="text-xs text-gray-500 mt-1">
                        📋 {notification.data.opportunity_title}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer for dropdown variant */}
      {variant === 'dropdown' && filteredNotifications.length > 5 && (
        <div className="p-3 border-t border-gray-200">
          <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium text-center">
            Ver todas as notificações →
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatorNotificationCenter;