import React from 'react';
import { useState, useEffect } from 'react';
import { TrendingUp, Eye, Heart, MessageCircle, Share2, Calendar, Award, Target, Clock, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  opportunity: {
    id: string;
    title: string;
    company: string;
    budget_min: number;
    budget_max: number;
    deadline: string;
  };
}

const Dashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('opportunity_applications')
        .select(`
          id,
          status,
          applied_at,
          opportunity:opportunities (
            id,
            title,
            company,
            budget_min,
            budget_max,
            deadline
          )
        `)
        .eq('creator_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar candidaturas:', error);
      } else {
        setApplications(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar candidaturas:', err);
    } finally {
      setLoadingApplications(false);
    }
  };

  const stats = [
    { 
      label: 'Oportunidades Aplicadas', 
      value: applications.length.toString(), 
      icon: Target, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100' 
    },
    { 
      label: 'Propostas Aceitas', 
      value: applications.filter(app => app.status === 'approved').length.toString(), 
      icon: Award, 
      color: 'text-green-600', 
      bg: 'bg-green-100' 
    },
    { 
      label: 'Candidaturas Pendentes', 
      value: applications.filter(app => app.status === 'pending').length.toString(), 
      icon: Clock, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-100' 
    },
    { label: 'Receita Total', value: 'R$ 15.2K', icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-100' }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'application',
      title: 'Aplicação enviada',
      description: 'Campanha de Verão - Moda Praia',
      time: '2 horas atrás',
      status: 'pending'
    },
    {
      id: 2,
      type: 'accepted',
      title: 'Proposta aceita',
      description: 'Parceria Fitness - Suplementos',
      time: '1 dia atrás',
      status: 'accepted'
    },
    {
      id: 3,
      type: 'completed',
      title: 'Campanha finalizada',
      description: 'Review de Produtos Tech',
      time: '3 dias atrás',
      status: 'completed'
    }
  ];

  const performanceData = [
    { metric: 'Visualizações', value: '125.4K', change: '+12.5%', icon: Eye },
    { metric: 'Curtidas', value: '8.2K', change: '+8.3%', icon: Heart },
    { metric: 'Comentários', value: '1.1K', change: '+15.2%', icon: MessageCircle },
    { metric: 'Compartilhamentos', value: '456', change: '+22.1%', icon: Share2 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Acompanhe suas atividades e métricas de performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Applications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Minhas Candidaturas</h3>
          {loadingApplications ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nenhuma candidatura ainda</p>
              <p className="text-sm text-gray-500">Candidate-se a oportunidades para vê-las aqui</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {applications.slice(0, 5).map((application) => (
                <div key={application.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      application.status === 'approved' 
                        ? 'bg-green-100' 
                        : application.status === 'rejected'
                        ? 'bg-red-100'
                        : 'bg-yellow-100'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        application.status === 'approved' 
                          ? 'bg-green-600' 
                          : application.status === 'rejected'
                          ? 'bg-red-600'
                          : 'bg-yellow-600'
                      }`}></div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{application.opportunity.title}</p>
                    <p className="text-sm text-gray-600">{application.opportunity.company}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {new Date(application.applied_at).toLocaleDateString('pt-BR')}
                      </p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        application.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : application.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {application.status === 'approved' 
                          ? 'Aprovado' 
                          : application.status === 'rejected'
                          ? 'Rejeitado'
                          : 'Pendente'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Próximos Prazos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Calendar className="h-4 w-4 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-800">15 de Fevereiro</span>
            </div>
            <p className="font-semibold text-gray-900">Campanha de Verão</p>
            <p className="text-sm text-gray-600">Entrega do conteúdo final</p>
          </div>
          
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Calendar className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">20 de Fevereiro</span>
            </div>
            <p className="font-semibold text-gray-900">Parceria Fitness</p>
            <p className="text-sm text-gray-600">Posts do Instagram</p>
          </div>
          
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Calendar className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">1 de Março</span>
            </div>
            <p className="font-semibold text-gray-900">Review Tech</p>
            <p className="text-sm text-gray-600">Vídeo de unboxing</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;