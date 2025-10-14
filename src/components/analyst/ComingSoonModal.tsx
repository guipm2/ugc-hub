import React from 'react';
import { X, Clock, Settings } from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';
import ModalPortal from '../common/ModalPortal';

interface ComingSoonModalProps {
  title?: string;
  description?: string;
  onClose?: () => void;
}

const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ 
  title = "Funcionalidade em Desenvolvimento",
  description = "Esta funcionalidade estará disponível em breve.",
  onClose
}) => {
  const { navigate } = useRouter();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Redirecionar para dashboard por padrão
      navigate('/analysts/overview');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="bg-white rounded-xl max-w-md w-full mx-auto shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Settings className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 text-orange-600" />
            </div>
            <p className="text-gray-600 text-lg mb-2">{description}</p>
            <p className="text-sm text-gray-500">
              Estamos trabalhando para tornar esta experiência ainda melhor!
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progresso</span>
              <span>75%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>

          {/* Features coming */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Em breve:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Gestão completa de etapas de projeto
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Automação de workflows
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Relatórios avançados
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleClose}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              Voltar ao Dashboard
            </button>
            <button
              onClick={() => window.open('mailto:suporte@ugchub.com.br?subject=Interesse em Gerenciamento de Etapas', '_blank')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              Notificar quando estiver pronto
            </button>
          </div>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};

export default ComingSoonModal;