import React from 'react';
import { Circle, Clock, MessageSquare } from 'lucide-react';

interface AnalystStatusProps {
  name: string;
  company: string;
  isOnline?: boolean;
  lastSeen?: string;
  responseTime?: number; // Average response time in minutes
  variant?: 'compact' | 'full';
  className?: string;
}

const AnalystStatus: React.FC<AnalystStatusProps> = ({
  name,
  company,
  isOnline = false,
  lastSeen,
  responseTime,
  variant = 'compact',
  className = ''
}) => {
  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Nunca visto';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ativo agora';
    if (diffInMinutes < 60) return `Visto há ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `Visto há ${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `Visto há ${Math.floor(diffInMinutes / 1440)}d`;
    return `Visto em ${date.toLocaleDateString('pt-BR')}`;
  };

  const formatResponseTime = (minutes?: number) => {
    if (!minutes) return 'Sem dados';
    if (minutes < 60) return `~${Math.round(minutes)}min`;
    if (minutes < 1440) return `~${Math.round(minutes / 60)}h`;
    return `~${Math.round(minutes / 1440)}d`;
  };

  const getStatusColor = () => {
    if (isOnline) return 'bg-green-500';
    if (lastSeen) {
      const date = new Date(lastSeen);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      if (diffInHours < 1) return 'bg-yellow-500';
      if (diffInHours < 24) return 'bg-orange-500';
    }
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (isOnline) return 'Online';
    return formatLastSeen(lastSeen);
  };

  const getResponseTimeColor = () => {
    if (!responseTime) return 'text-gray-500';
    if (responseTime < 60) return 'text-green-600'; // < 1 hour
    if (responseTime < 720) return 'text-yellow-600'; // < 12 hours
    return 'text-red-600'; // > 12 hours
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-blue-600">
              {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor()} rounded-full border-2 border-white`}></div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{getStatusText()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor()} rounded-full border-2 border-white`}></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{name}</h4>
          <p className="text-xs text-gray-500 mb-2">{company}</p>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Circle className={`h-2 w-2 ${isOnline ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-xs text-gray-600">{getStatusText()}</span>
            </div>
            
            {responseTime && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className={`text-xs ${getResponseTimeColor()}`}>
                  Resposta em {formatResponseTime(responseTime)}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-600">
                {isOnline ? 'Disponível para chat' : 'Responderá em breve'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
            Enviar Mensagem
          </button>
          <button className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            Ver Perfil
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalystStatus;