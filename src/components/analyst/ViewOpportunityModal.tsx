import React from 'react';
import { X, MapPin, Calendar, DollarSign, Tag } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

interface Opportunity {
  id: string;
  title: string;
  company: string;
  description: string;
  budget_min: number;
  budget_max: number;
  location: string;
  content_type: string;
  requirements: string[];
  deadline: string;
  status: string;
  candidates_count: number;
  created_at: string;
}

interface ViewOpportunityModalProps {
  opportunity: Opportunity;
  onClose: () => void;
}

const ViewOpportunityModal: React.FC<ViewOpportunityModalProps> = ({ opportunity, onClose }) => {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{opportunity.title}</h2>
            <p className="text-gray-600">{opportunity.company}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              opportunity.status === 'ativo' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {opportunity.status === 'ativo' ? 'Ativa' : 'Inativa'}
            </span>
            <span className="text-gray-600 text-sm">
              {opportunity.candidates_count} candidatos
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
            <p className="text-gray-600 leading-relaxed">{opportunity.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Valor para Criador</p>
                <p className="font-medium">
                  {opportunity.budget_min === 0 && opportunity.budget_max === 0 
                    ? 'Permuta' 
                    : `R$ ${opportunity.budget_min.toFixed(2)}`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Localização</p>
                <p className="font-medium">{opportunity.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Tipo de Conteúdo</p>
                <p className="font-medium">{opportunity.content_type}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Prazo</p>
                <p className="font-medium">
                  {new Date(opportunity.deadline).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Requirements */}
          {opportunity.requirements && opportunity.requirements.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Requisitos</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                {opportunity.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Created Date */}
          <div className="text-sm text-gray-500">
            Criada em {new Date(opportunity.created_at).toLocaleDateString('pt-BR')} às{' '}
            {new Date(opportunity.created_at).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};

export default ViewOpportunityModal;