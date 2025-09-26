import React, { useState, useEffect } from 'react';
import { X, User, Mail, MapPin, Users, Check, XIcon, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Application {
  id: string;
  creator_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string;
  applied_at: string;
  creator: {
    name: string;
    email: string;
    bio: string;
    location: string;
    niche: string;
    followers: string;
    website: string;
    avatar_url: string;
  };
}

interface ApplicationsModalProps {
  opportunityId: string;
  opportunityTitle: string;
  onClose: () => void;
}

const ApplicationsModal: React.FC<ApplicationsModalProps> = ({
  opportunityId,
  opportunityTitle,
  onClose
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [opportunityId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunity_applications')
        .select(`
          *,
          creator:profiles!creator_id (
            name,
            email,
            bio,
            location,
            niche,
            followers,
            website,
            avatar_url
          )
        `)
        .eq('opportunity_id', opportunityId)
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar candidaturas:', error);
      } else {
        setApplications(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar candidaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected') => {
    setUpdating(applicationId);

    try {
      const { error } = await supabase
        .from('opportunity_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) {
        console.error('Erro ao atualizar candidatura:', error);
        // REMOVIDO: alert('Erro ao atualizar candidatura');
      } else {
        setApplications(prev =>
          prev.map(app =>
            app.id === applicationId
              ? { ...app, status }
              : app
          )
        );
        // REMOVIDO: alert(`Candidatura ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso! O criador será notificado.`);
      }
    } catch (err) {
      console.error('Erro ao atualizar candidatura:', err);
      // REMOVIDO: alert('Erro ao atualizar candidatura');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Aprovada</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Rejeitada</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Pendente</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Candidaturas</h2>
            <p className="text-gray-600 mt-1">{opportunityTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhuma candidatura ainda</h3>
              <p className="text-gray-600">Aguarde criadores se candidatarem para esta oportunidade</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                        {application.creator.name?.charAt(0) || application.creator.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {application.creator.name || 'Nome não informado'}
                        </h3>
                        <p className="text-gray-600 text-sm">{application.creator.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Candidatou-se em {formatDate(application.applied_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(application.status)}
                    </div>
                  </div>

                  {/* Creator Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {application.creator.bio && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">{application.creator.bio}</p>
                      </div>
                    )}
                    
                    {application.creator.niche && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Nicho:</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {application.creator.niche.charAt(0).toUpperCase() + application.creator.niche.slice(1)}
                        </span>
                      </div>
                    )}
                    
                    {application.creator.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {application.creator.location}
                      </div>
                    )}
                    
                    {application.creator.followers && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        {application.creator.followers} seguidores
                      </div>
                    )}
                    
                    {application.creator.website && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ExternalLink className="h-4 w-4" />
                        <a
                          href={application.creator.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          Ver portfolio
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Application Message */}
                  {application.message && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Mensagem:</p>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                        {application.message}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {application.status === 'pending' && (
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => updateApplicationStatus(application.id, 'rejected')}
                        disabled={updating === application.id}
                        className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {updating === application.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <XIcon className="h-4 w-4" />
                        )}
                        Rejeitar
                      </button>
                      <button
                        onClick={() => updateApplicationStatus(application.id, 'approved')}
                        disabled={updating === application.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {updating === application.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Aprovar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationsModal;