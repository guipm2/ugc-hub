import React, { useState, useEffect } from 'react';
import { Edit, Save, Eye, EyeOff, Shield, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const { user } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    email: '',
    instagram_url: '',
    tiktok_url: '',
    portfolio_url: '',
    age: null,
    gender: '',
    niches: [],
    pix_key: '',
    full_name: '',
    document_number: '',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfileData({
          name: data.name || '',
          bio: data.bio || '',
          email: data.email || user.email || '',
          instagram_url: data.instagram_url || '',
          tiktok_url: data.tiktok_url || '',
          portfolio_url: data.portfolio_url || '',
          age: data.age || null,
          gender: data.gender || '',
          niches: data.niches || [],
          pix_key: data.pix_key || '',
          full_name: data.full_name || '',
          document_number: data.document_number || '',
          phone: data.phone || ''
        });
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  const maskData = (data, type) => {
    if (!data) return '';
    if (type === 'pix') {
      return data.includes('@') 
        ? `${data.substring(0, 2)}***@${data.split('@')[1]}`
        : `${data.substring(0, 3)}***${data.substring(data.length - 3)}`;
    }
    if (type === 'document') {
      return `${data.substring(0, 3)}***${data.substring(data.length - 2)}`;
    }
    if (type === 'phone') {
      return `${data.substring(0, 4)}***${data.substring(data.length - 4)}`;
    }
    return data;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-1">Gerencie suas informações pessoais e profissionais</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSensitiveData ? 'Ocultar' : 'Mostrar'} dados sensíveis
          </button>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="h-4 w-4" />
              Editar Perfil
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                Salvar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {profileData.full_name || profileData.name || 'Nome não informado'}
              </h3>
              <p className="text-gray-500 text-sm">
                {profileData.niches.length > 0 ? profileData.niches.join(', ') : 'Nichos não informados'}
              </p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={profileData.name}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={profileData.bio}
                disabled={!isEditing}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                placeholder="Conte um pouco sobre você..."
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Bancários</h3>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 bg-yellow-100 px-2 py-1 rounded">Dados sensíveis</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chave PIX</label>
              <input
                type="text"
                value={showSensitiveData ? profileData.pix_key : maskData(profileData.pix_key, 'pix')}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                placeholder="Chave PIX não informada"
              />
              <p className="mt-2 text-sm text-gray-500">
                <Shield className="inline h-4 w-4 mr-1" />
                Para alterar dados bancários, entre em contato com o suporte
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Contratuais</h3>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800 bg-red-100 px-2 py-1 rounded">Somente leitura</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={profileData.full_name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  placeholder="Nome não informado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Documento</label>
                <input
                  type="text"
                  value={showSensitiveData ? profileData.document_number : maskData(profileData.document_number, 'document')}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  placeholder="Documento não informado"
                />
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <Shield className="inline h-4 w-4 mr-1" />
                Para alterar dados contratuais, entre em contato com o suporte.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
