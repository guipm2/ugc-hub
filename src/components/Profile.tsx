import React, { useState } from 'react';
import { useEffect } from 'react';
import { Instagram, Camera, MapPin, Link as LinkIcon, Save, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [countryCode, setCountryCode] = useState('+55');
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    niche: '',
    followers: '',
    website: '',
    email: '',
    phone: ''
  });

  const countryCodes = [
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
    { code: '+1', country: 'Estados Unidos', flag: '🇺🇸' },
    { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
    { code: '+33', country: 'França', flag: '🇫🇷' },
    { code: '+49', country: 'Alemanha', flag: '🇩🇪' },
    { code: '+34', country: 'Espanha', flag: '🇪🇸' },
    { code: '+39', country: 'Itália', flag: '🇮🇹' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+52', country: 'México', flag: '🇲🇽' }
  ];

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return;
      }

      if (data) {
        setFormData({
          name: data.name || '',
          bio: data.bio || '',
          location: data.location || '',
          niche: data.niche || '',
          followers: data.followers || '',
          website: data.website || '',
          email: data.email || user.email || '',
          phone: data.phone || ''
        });
        
        // Extrair código do país do telefone se existir
        if (data.phone) {
          const phoneWithCode = data.phone;
          const foundCode = countryCodes.find(cc => phoneWithCode.startsWith(cc.code));
          if (foundCode) {
            setCountryCode(foundCode.code);
            setFormData(prev => ({
              ...prev,
              phone: phoneWithCode.replace(foundCode.code, '').trim()
            }));
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara brasileira (11) 99999-9999
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
    }
    
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({
      ...formData,
      phone: formatted
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Combinar código do país com telefone
      const fullPhone = formData.phone ? `${countryCode} ${formData.phone}` : '';
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
          niche: formData.niche,
          followers: formData.followers,
          website: formData.website,
          email: formData.email,
          phone: fullPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao salvar perfil:', error);
        // REMOVIDO: alert('Erro ao salvar perfil. Tente novamente.');
        return;
      }

      setIsEditing(false);
      // REMOVIDO: alert('Perfil salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      // REMOVIDO: alert('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Perfil</h1>
          <p className="text-gray-600 mt-1">Carregando perfil...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Avatar & Instagram */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : (formData.email ? formData.email.charAt(0).toUpperCase() : 'U')}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
                    <Camera className="h-4 w-4 text-gray-600" />
                  </button>
                )}
              </div>
              
              <button className="mt-4 w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center">
                <Instagram className="h-5 w-5 mr-2" />
                Conectar Instagram
              </button>
              
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-gray-600">Status da Conexão</div>
                <div className="text-green-600 font-medium">Conectado</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Informações Pessoais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Localização
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Cidade, Estado"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nicho Principal *
                </label>
                <select
                  name="niche"
                  value={formData.niche}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Selecione seu nicho</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="fashion">Moda</option>
                  <option value="beauty">Beleza</option>
                  <option value="fitness">Fitness</option>
                  <option value="food">Culinária</option>
                  <option value="travel">Viagem</option>
                  <option value="tech">Tecnologia</option>
                  <option value="business">Negócios</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seguidores Instagram
                </label>
                <input
                  type="text"
                  name="followers"
                  value={formData.followers}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Ex: 10K, 50K, 100K+"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="seu@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <div className="flex">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={!isEditing}
                    className="px-3 py-3 border border-gray-300 border-r-0 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 bg-gray-50"
                  >
                    {countryCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    disabled={!isEditing}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio / Descrição
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                disabled={!isEditing}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Conte um pouco sobre você e seu conteúdo..."
              />
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <LinkIcon className="inline h-4 w-4 mr-1" />
                Website / Portfolio
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="https://seusite.com"
              />
            </div>
            
            {isEditing && (
              <div className="mt-8">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Cancelar
                  </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Salvar Perfil
                    </>
                  )}
                </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;