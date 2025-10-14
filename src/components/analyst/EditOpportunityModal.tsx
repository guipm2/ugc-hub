import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { normalizeCompanyLink } from '../../utils/formatters';

interface Opportunity {
  id: string;
  title: string;
  company: string;
  company_link?: string;
  description: string;
  budget_min: number;
  budget_max: number;
  location: string;
  content_type: string;
  requirements: string[];
  deadline: string;
  status: string;
  candidates_count: number;
  age_range?: string;
  gender?: string;
  created_at: string;
}

interface EditOpportunityModalProps {
  opportunity: Opportunity;
  onClose: () => void;
  onSubmit: (updatedData: Partial<Opportunity>) => void;
}

const EditOpportunityModal: React.FC<EditOpportunityModalProps> = ({ 
  opportunity, 
  onClose, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState({
    title: opportunity.title,
    company_link: opportunity.company_link ?? '',
    description: opportunity.description,
    budget_min: opportunity.budget_min,
    budget_max: opportunity.budget_max,
    location: opportunity.location,
    content_type: opportunity.content_type,
    requirements: [...(opportunity.requirements || [])],
    deadline: opportunity.deadline.split('T')[0], // Format for input date
    status: opportunity.status,
    age_range: opportunity.age_range || '',
    gender: opportunity.gender || ''
  });
  const [loading, setLoading] = useState(false);
  const [newRequirement, setNewRequirement] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedLink = normalizeCompanyLink(formData.company_link);
      const { error } = await supabase
        .from('opportunities')
        .update({
          title: formData.title,
          company_link: normalizedLink,
          description: formData.description,
          budget_min: formData.budget_min,
          budget_max: formData.budget_max,
          location: formData.location,
          content_type: formData.content_type,
          requirements: formData.requirements,
          deadline: formData.deadline,
          status: formData.status,
          age_range: formData.age_range,
          gender: formData.gender,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunity.id);

      if (error) {
        console.error('Erro ao atualizar oportunidade:', error);
        // REMOVIDO: alert('Erro ao atualizar oportunidade');
      } else {
        onSubmit({ ...formData, company_link: normalizedLink });
        // REMOVIDO: alert('Oportunidade atualizada com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao atualizar oportunidade:', err);
      // REMOVIDO: alert('Erro ao atualizar oportunidade');
    } finally {
      setLoading(false);
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Editar Oportunidade</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da Oportunidade *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link da Empresa
            </label>
            <input
              type="text"
              value={formData.company_link}
              onChange={(e) => setFormData(prev => ({ ...prev, company_link: e.target.value }))}
              placeholder="https://instagram.com/empresa ou https://empresa.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Budget and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Mínimo (R$) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget_min}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_min: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localização *
              </label>
              <select
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="Remoto">Remoto</option>
                <option value="São Paulo">São Paulo</option>
                <option value="Rio de Janeiro">Rio de Janeiro</option>
                <option value="Belo Horizonte">Belo Horizonte</option>
                <option value="Brasília">Brasília</option>
                <option value="Salvador">Salvador</option>
                <option value="Fortaleza">Fortaleza</option>
                <option value="Recife">Recife</option>
                <option value="Porto Alegre">Porto Alegre</option>
                <option value="Curitiba">Curitiba</option>
              </select>
            </div>
          </div>

          {/* Content Type and Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Conteúdo *
              </label>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Selecione o tipo</option>
                <option value="Reel + Stories">Reel + Stories</option>
                <option value="Vídeo YouTube">Vídeo YouTube</option>
                <option value="Post Instagram">Post Instagram</option>
                <option value="Stories">Stories</option>
                <option value="TikTok">TikTok</option>
                <option value="Reels">Reels</option>
                <option value="IGTV">IGTV</option>
                <option value="Feed + Stories">Feed + Stories</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prazo de Entrega *
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Status, Gender, and Age Range */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gênero
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Qualquer gênero</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faixa Etária
              </label>
              <select
                value={formData.age_range}
                onChange={(e) => setFormData(prev => ({ ...prev, age_range: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Qualquer idade</option>
                <option value="16-20">16-20 anos</option>
                <option value="21-25">21-25 anos</option>
                <option value="26-30">26-30 anos</option>
                <option value="31-35">31-35 anos</option>
                <option value="36-40">36-40 anos</option>
                <option value="41+">41+ anos</option>
              </select>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requisitos
            </label>
            
            {/* Add new requirement */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Adicionar requisito..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <button
                type="button"
                onClick={addRequirement}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Requirements list */}
            {formData.requirements.length > 0 && (
              <div className="space-y-2">
                {formData.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-sm">{req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOpportunityModal;