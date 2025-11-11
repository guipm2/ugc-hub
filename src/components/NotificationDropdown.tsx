import React, { useMemo, useState } from 'react';
import { Bell, X, Check, Target, Users, MessageCircle, Calendar } from 'lucide-react';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { useRouter } from '../hooks/useRouter';

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { navigate } = useRouter();

  const typeConfig = useMemo(
    () =>
      ({
        new_opportunity: { icon: Target, label: 'Nova oportunidade', tone: 'info' },
        new_application: { icon: Users, label: 'Nova candidatura', tone: 'info' },
        application_approved: { icon: Check, label: 'Aprovação', tone: 'success' },
        application_rejected: { icon: X, label: 'Atualização', tone: 'danger' },
        new_message: { icon: MessageCircle, label: 'Nova mensagem', tone: 'message' },
        new_deliverable: { icon: Calendar, label: 'Novo deliverable', tone: 'schedule' },
        default: { icon: Bell, label: 'Atualização', tone: 'info' }
      }) satisfies Record<string, { icon: typeof Bell; label: string; tone: 'info' | 'success' | 'danger' | 'message' | 'schedule' }>,
    []
  );

  type ToneKey = 'info' | 'success' | 'danger' | 'message' | 'schedule';

  const toneTokens: Record<ToneKey, { gradient: string; icon: string; chip: string; ring: string }> = {
    info: {
      gradient: 'from-[#00FF41]/35 via-[#00CC34]/15 to-transparent',
      icon: 'text-[#00FF41]',
      chip: 'chip-info',
      ring: 'ring-[#00FF41]/25'
    },
    success: {
      gradient: 'from-emerald-400/35 via-emerald-500/15 to-transparent',
      icon: 'text-emerald-100',
      chip: 'chip-success',
      ring: 'ring-emerald-400/25'
    },
    danger: {
      gradient: 'from-red-500/35 via-red-500/18 to-transparent',
      icon: 'text-red-100',
      chip: 'chip-danger',
      ring: 'ring-red-400/25'
    },
    message: {
      gradient: 'from-[#00FF41]/30 via-[#00CC34]/18 to-transparent',
      icon: 'text-[#00FF41]',
      chip: 'chip-info',
      ring: 'ring-[#00FF41]/25'
    },
    schedule: {
      gradient: 'from-amber-400/35 via-orange-500/18 to-transparent',
      icon: 'text-amber-100',
      chip: 'chip-warning',
      ring: 'ring-amber-400/25'
    }
  };

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
        onClick={() => setIsOpen(prev => !prev)}
        className="relative btn-ghost-glass h-11 w-11 rounded-full p-0"
      >
        <Bell className="h-5 w-5 text-[#00FF41]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#00FF41] via-[#00CC34] to-[#00FF41] text-[10px] font-semibold text-black shadow-lg shadow-[#00FF41]/40">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-white/12 bg-black/95 p-0 backdrop-blur-[30px] saturate-150 shadow-[0_25px_70px_-30px_rgba(0,0,0,0.9)] ring-1 ring-[#00FF41]/10 z-50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-sm font-semibold text-white">Notificações</p>
                <p className="text-xs text-gray-400">Acompanhe atualizações importantes</p>
              </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-[#00FF41] transition-colors hover:text-[#00CC34]"
                  >
                    Marcar todas como lidas
                  </button>
                )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-white/8">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Bell className="mx-auto mb-3 h-8 w-8 text-gray-500" />
                  <p className="text-sm">Nenhuma notificação por enquanto</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex cursor-pointer flex-col gap-3 px-5 py-4 transition-all duration-200 hover:bg-white/5 ${
                      !notification.read ? 'ring-1 ring-[#00FF41]/25 bg-white/[0.04]' : 'bg-transparent'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {(() => {
                      const config = typeConfig[notification.type] || typeConfig.default;
                      const tone = toneTokens[config.tone];
                      const Icon = config.icon;

                      return (
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-gradient-to-br ${tone.gradient}`}
                          >
                            <Icon className={`h-5 w-5 ${tone.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-white truncate">
                                {notification.title}
                              </p>
                              <span className="text-xs text-gray-400">{formatTime(notification.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`glass-chip ${tone.chip} text-[0.6rem]`}>{config.label}</span>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-[#00FF41]" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-white/10 px-5 py-3">
                <button className="w-full text-sm font-semibold text-[#00FF41] transition-colors hover:text-[#00CC34]">
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