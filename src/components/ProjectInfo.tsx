import React from 'react';
import { Building2, Calendar, Briefcase, Globe, Instagram, ExternalLink } from 'lucide-react';

interface ProjectInfoProps {
  project: {
    title: string;
    company: string;
    description: string;
    company_link?: string;
    created_at: string;
  };
  briefing?: string;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({ project, briefing }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Briefing do Projeto */}
      {briefing && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Briefing do Projeto</h3>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{briefing}</p>
          </div>
        </div>
      )}

      {/* Informações da Empresa */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Building2 className="h-5 w-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Sobre a Empresa</h3>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-3 bg-gray-100 rounded-xl flex-shrink-0">
              <Building2 className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900 truncate">{project.company}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4" />
                Membro desde {formatDate(project.created_at)}
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Esta empresa confia na nossa plataforma para encontrar criadores de conteúdo talentosos
                para suas campanhas de marketing digital.
              </p>
            </div>
          </div>

          {/* Company Link Button */}
          {project.company_link && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">
                Conheça a empresa
              </h4>
              <button
                onClick={() => {
                  window.open(project.company_link, '_blank', 'noopener,noreferrer');
                }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                {project.company_link?.includes('instagram.com') ? (
                  <Instagram className="h-5 w-5" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
                {project.company_link?.includes('instagram.com') ? 'Ver Instagram' : 'Visitar Site'}
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectInfo;