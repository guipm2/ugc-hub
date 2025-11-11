import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { normalizeCompanyLink } from '../../utils/formatters';
import ModalPortal from '../common/ModalPortal';
import OpportunityImageUpload from '../common/OpportunityImageUpload';

interface Opportunity {
  id: string;
  title: string;
  company: string;
  company_link?: string;
  description: string;
  budget: number;
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
  // Parse age_range para age_min e age_max
  const parseAgeRange = (ageRange?: string) => {
    if (!ageRange) return { min: '', max: '' };
    
    // Formato "20-45"
    if (ageRange.includes('-')) {
      const [min, max] = ageRange.split('-');
      return { min, max };
    }
    
    // Formato "20+"
    if (ageRange.includes('+')) {
      return { min: ageRange.replace('+', ''), max: '' };
    }
    
    // Formato "até 45"
    if (ageRange.includes('até')) {
      return { min: '', max: ageRange.replace('até ', '').trim() };
    }
    
    return { min: '', max: '' };
  };

  const { min: initialAgeMin, max: initialAgeMax } = parseAgeRange(opportunity.age_range);

  const [formData, setFormData] = useState({
    title: opportunity.title,
    company_link: opportunity.company_link ?? '',
    description: opportunity.description,
    budget: opportunity.budget,
    location: opportunity.location,
    content_type: opportunity.content_type,
    requirements: [...(opportunity.requirements || [])],
    deadline: opportunity.deadline.split('T')[0], // Format for input date
    status: opportunity.status,
    age_min: initialAgeMin,
    age_max: initialAgeMax,
    gender: opportunity.gender || ''
  });
  const [loading, setLoading] = useState(false);
  const [newRequirement, setNewRequirement] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Construir a age_range a partir de age_min e age_max
      let ageRange = '';
      if (formData.age_min && formData.age_max) {
        ageRange = `${formData.age_min}-${formData.age_max}`;
      } else if (formData.age_min) {
        ageRange = `${formData.age_min}+`;
      } else if (formData.age_max) {
        ageRange = `até ${formData.age_max}`;
      }

      const normalizedLink = normalizeCompanyLink(formData.company_link);
      const { error } = await supabase
        .from('opportunities')
        .update({
          title: formData.title,
          company_link: normalizedLink,
          description: formData.description,
          budget: formData.budget,
          location: formData.location,
          content_type: formData.content_type,
          requirements: formData.requirements,
          deadline: formData.deadline,
          status: formData.status,
          age_range: ageRange,
          gender: formData.gender,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunity.id);

      if (error) {
        console.error('Erro ao atualizar oportunidade:', error);
        // REMOVIDO: alert('Erro ao atualizar oportunidade');
      } else {
        onSubmit({ 
          ...formData, 
          company_link: normalizedLink,
          age_range: ageRange
        });
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
    <ModalPortal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent resize-none"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
            />
          </div>

          {/* Budget and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orçamento (R$) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localização
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                placeholder="Remoto, São Paulo, etc."
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                required
              >
                <option value="">Selecione o tipo</option>
                <option value="Foto">Foto</option>
                <option value="Foto + Video">Foto + Video</option>
                <option value="Video">Video</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                required
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gênero *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                required
              >
                <option value="">Selecione o gênero</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Não-binário">Não-binário</option>
                <option value="Qualquer gênero">Qualquer gênero</option>
              </select>
            </div>
          </div>

          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Faixa Etária
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  value={formData.age_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, age_min: e.target.value }))}
                  min="13"
                  max="100"
                  placeholder="Idade mín."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={formData.age_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, age_max: e.target.value }))}
                  min="13"
                  max="100"
                  placeholder="Idade máx."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Ex: 20 a 45 anos. Deixe em branco para qualquer idade.
            </p>
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF41] focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <button
                type="button"
                onClick={addRequirement}
                className="px-3 py-2 bg-[#00FF41] text-black rounded-lg hover:bg-[#00CC34] transition-colors"
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

          {/* Imagens da Oportunidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagens da Oportunidade
            </label>
            <OpportunityImageUpload opportunityId={opportunity.id} />
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
              className="px-6 py-2 bg-[#00FF41] hover:bg-[#00CC34] text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
};

export default EditOpportunityModal;