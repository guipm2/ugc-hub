import React, { useMemo, useState } from 'react';
import { Bell, X, Check, Target, Users, MessageCircle, Calendar } from 'lucide-react';
import { useAnalystNotifications, AnalystNotification } from '../../hooks/useAnalystNotifications';
import { useRouter } from '../../hooks/useRouter';

const AnalystNotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAnalystNotifications();
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
      gradient: 'from-[#6C4DFF]/35 via-[#8C5CFF]/20 to-transparent',
      icon: 'text-indigo-100',
      chip: 'chip-info',
      ring: 'ring-indigo-400/25'
    },
    success: {
      gradient: 'from-emerald-400/35 via-emerald-500/18 to-transparent',
      icon: 'text-emerald-100',
      chip: 'chip-success',
      ring: 'ring-emerald-400/25'
    },
    danger: {
      gradient: 'from-rose-500/35 via-rose-500/18 to-transparent',
      icon: 'text-rose-100',
      chip: 'chip-danger',
      ring: 'ring-rose-400/25'
    },
    message: {
      gradient: 'from-fuchsia-400/30 via-purple-500/18 to-transparent',
      icon: 'text-fuchsia-100',
      chip: 'chip-info',
      ring: 'ring-fuchsia-400/25'
    },
    schedule: {
      gradient: 'from-amber-400/35 via-orange-500/18 to-transparent',
      icon: 'text-amber-100',
      chip: 'chip-warning',
      ring: 'ring-amber-400/25'
    }
  };

  const handleNotificationClick = (notification: AnalystNotification) => {
    // Marcar como lida se ainda não foi lida
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navegar baseado no tipo de notificação
    switch (notification.type) {
      case 'new_opportunity':
        navigate('/analysts/opportunities');
        break;
      case 'new_application':
        navigate('/analysts/opportunities');
        break;
      case 'application_approved':
      case 'application_rejected':
        navigate('/analysts/opportunities');
        break;
      case 'new_message':
        navigate('/analysts/messages');
        break;
      case 'new_deliverable':
        // Para analista, navegar para projetos onde pode gerenciar deliverables
        navigate('/analysts/projects');
        break;
      default:
        navigate('/analysts/overview');
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
        <Bell className="h-5 w-5 text-indigo-100" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-rose-400 to-pink-500 text-[10px] font-semibold text-white shadow-lg shadow-rose-500/40">
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
          <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-white/12 bg-slate-950/95 p-0 backdrop-blur-[30px] saturate-150 shadow-[0_25px_70px_-30px_rgba(12,18,45,0.85)] ring-1 ring-fuchsia-400/10 z-50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-sm font-semibold text-white">Notificações</p>
                <p className="text-xs text-gray-400">Atualizações críticas da operação</p>
              </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-indigo-200 transition-colors hover:text-indigo-100"
                  >
                    Marcar todas como lidas
                  </button>
                )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-white/8">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Bell className="mx-auto mb-3 h-8 w-8 text-gray-500" />
                  <p className="text-sm">Nenhuma notificação recente</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex cursor-pointer flex-col gap-3 px-5 py-4 transition-all duration-200 hover:bg-white/5 ${
                      !notification.read ? 'ring-1 ring-fuchsia-400/25 bg-white/[0.04]' : 'bg-transparent'
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
                              {!notification.read && <span className="h-2 w-2 rounded-full bg-fuchsia-300" />}
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
                <button className="w-full text-sm font-semibold text-indigo-200 transition-colors hover:text-indigo-100">
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

export default AnalystNotificationDropdown;