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
    <div className="space-y-8">
      {/* Briefing do Projeto */}
      {briefing && (
        <div className="glass-card p-6 md:p-8 space-y-4">
          <div className="glass-section-title mb-0">
            <div className="icon-wrap">
              <Briefcase className="h-5 w-5" />
            </div>
            <h3>Briefing do Projeto</h3>
          </div>

          <div className="surface-muted rounded-2xl border border-white/12 p-5">
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {briefing}
            </p>
          </div>
        </div>
      )}

      {/* Informações da Empresa */}
      <div className="glass-card p-6 md:p-8 space-y-6">
        <div className="glass-section-title mb-0">
          <div className="icon-wrap">
            <Building2 className="h-5 w-5" />
          </div>
          <h3>Sobre a Empresa</h3>
        </div>

        <div className="surface-muted rounded-2xl border border-white/12 p-5 flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex-shrink-0">
            <Building2 className="h-6 w-6 text-indigo-200" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-lg font-semibold text-white/95 truncate">{project.company}</p>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Membro desde {formatDate(project.created_at)}
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              Esta empresa confia na UGC Hub para cocriar campanhas com creators e acelerar lançamentos com autenticidade.
            </p>
          </div>
        </div>

        {project.company_link && (
          <div className="surface-muted rounded-2xl border border-white/12 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Conheça a marca</p>
                <h4 className="mt-2 text-sm text-gray-300">
                  Explore o ecossistema digital da empresa para mergulhar na identidade visual e tom de voz.
                </h4>
              </div>
              <button
                onClick={() => {
                  window.open(project.company_link, '_blank', 'noopener,noreferrer');
                }}
                className="btn-primary-glow text-sm"
              >
                {project.company_link?.includes('instagram.com') ? (
                  <Instagram className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                {project.company_link?.includes('instagram.com') ? 'Ver Instagram' : 'Visitar site'}
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectInfo;