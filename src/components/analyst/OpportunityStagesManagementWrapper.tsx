import React from 'react';
import ComingSoonModal from './ComingSoonModal';

const OpportunityStagesManagementWrapper: React.FC = () => {
  return (
    <div className="relative">
      {/* Background blur effect */}
      <div className="filter blur-sm pointer-events-none">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gerenciamento de Etapas</h1>
            <p className="text-gray-600">Acompanhe o progresso dos seus projetos através de etapas personalizadas</p>
          </div>

          {/* Mock content to show what's being blurred */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline de Projetos</h3>
              <div className="space-y-4">
                <div className="h-16 bg-gray-100 rounded-lg"></div>
                <div className="h-16 bg-gray-100 rounded-lg"></div>
                <div className="h-16 bg-gray-100 rounded-lg"></div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Etapas Personalizadas</h3>
              <div className="space-y-4">
                <div className="h-12 bg-gray-100 rounded-lg"></div>
                <div className="h-12 bg-gray-100 rounded-lg"></div>
                <div className="h-12 bg-gray-100 rounded-lg"></div>
                <div className="h-12 bg-gray-100 rounded-lg"></div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Automações</h3>
              <div className="space-y-4">
                <div className="h-20 bg-gray-100 rounded-lg"></div>
                <div className="h-20 bg-gray-100 rounded-lg"></div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Relatórios de Progresso</h3>
              <div className="h-32 bg-gray-100 rounded-lg"></div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Performance</h3>
              <div className="h-32 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        title="Gerenciamento de Etapas"
        description="Estamos desenvolvendo uma ferramenta completa para gerenciar as etapas dos seus projetos de forma automatizada e inteligente."
      />
    </div>
  );
};

export default OpportunityStagesManagementWrapper;