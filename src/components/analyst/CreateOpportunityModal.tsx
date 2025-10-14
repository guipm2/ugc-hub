import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { normalizeCompanyLink } from '../../utils/formatters';
import ModalPortal from '../common/ModalPortal';

interface CreateOpportunityModalProps {
  onClose: () => void;
  onSubmit: (data: OpportunityData) => void;
}

interface OpportunityData {
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
  age_range: string;
  gender: string;
}

const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    company_link: '',
    description: '',
    contract_value: '',
    payment_type: '',
    custom_budget: '',
    creators_count: '1',
    content_type: '',
    niche: '',
    deadline: '',
    requirements: [''],
    age_range: '',
    gender: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePaymentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      payment_type: value,
      custom_budget: value !== 'custom' ? '' : formData.custom_budget
    });
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData({
      ...formData,
      requirements: newRequirements
    });
  };

  const addRequirement = () => {
    setFormData({
      ...formData,
      requirements: [...formData.requirements, '']
    });
  };

  const removeRequirement = (index: number) => {
    const newRequirements = formData.requirements.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      requirements: newRequirements
    });
  };

  const calculateBudget = () => {
    const contractValue = parseFloat(formData.contract_value) || 0;
    const creatorsCount = parseInt(formData.creators_count) || 1;
    
    switch (formData.payment_type) {
      case 'permuta':
        return { min: 0, max: 0 };
      case 'percentage': {
        const percentage = (contractValue * 0.15) / creatorsCount;
        return { min: percentage, max: percentage };
      }
      case 'custom': {
        const customValue = (parseFloat(formData.custom_budget) || 0) / creatorsCount;
        return { min: customValue, max: customValue };
      }
      default:
        return { min: 0, max: 0 };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filteredRequirements = formData.requirements.filter(req => req.trim() !== '');
    const budget = calculateBudget();
    
    const opportunityData = {
      title: formData.title,
      company: formData.company || 'Empresa não informada',
      company_link: normalizeCompanyLink(formData.company_link),
      description: formData.description,
      budget_min: budget.min,
      budget_max: budget.max,
      location: 'Remoto', // Sempre remoto por padrão
      content_type: formData.content_type,
      requirements: filteredRequirements,
      deadline: formData.deadline,
      status: 'ativo',
      age_range: formData.age_range,
      gender: formData.gender
    };

    onSubmit(opportunityData);
  };

  const getBudgetDisplay = () => {
    const budget = calculateBudget();
    const creatorsCount = parseInt(formData.creators_count) || 1;
    
    switch (formData.payment_type) {
      case 'permuta':
        return 'Permuta';
      case 'percentage':
        return `R$ ${budget.min.toFixed(2)} por criador (15% ÷ ${creatorsCount})`;
      case 'custom':
        return `R$ ${budget.min.toFixed(2)} por criador`;
      default:
        return 'Selecione o tipo de pagamento';
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Nova Oportunidade</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da Oportunidade *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ex: Campanha Skincare - Verão 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa *
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ex: Beauty Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram ou Site da Empresa
            </label>
            <input
              type="url"
              name="company_link"
              value={formData.company_link}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ex: https://instagram.com/empresa ou https://empresa.com.br"
            />
            <p className="text-sm text-gray-500 mt-1">
              Link do perfil do Instagram ou website da empresa
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Descreva a oportunidade, objetivos e expectativas..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor do Contrato (R$) *
            </label>
            <input
              type="number"
              name="contract_value"
              value={formData.contract_value}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="10000.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade de Criadores *
            </label>
            <input
              type="number"
              name="creators_count"
              value={formData.creators_count}
              onChange={handleInputChange}
              required
              min="1"
              max="50"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Número de criadores que participarão desta campanha
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Pagamento *
            </label>
            <select
              name="payment_type"
              value={formData.payment_type}
              onChange={handlePaymentTypeChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Selecione o tipo de pagamento</option>
              <option value="permuta">Permuta</option>
              <option value="percentage">15% do valor do contrato</option>
              <option value="custom">Valor Personalizado</option>
            </select>
          </div>

          {formData.payment_type === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Personalizado (R$) *
              </label>
              <input
                type="number"
                name="custom_budget"
                value={formData.custom_budget}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="1500.00"
              />
            </div>
          )}

          {formData.payment_type && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Valor por Criador ({formData.creators_count} criador{parseInt(formData.creators_count) > 1 ? 'es' : ''}):
                </span>
                <span className="text-lg font-semibold text-purple-600">{getBudgetDisplay()}</span>
              </div>
              {formData.payment_type !== 'permuta' && (
                <div className="mt-2 text-sm text-gray-600">
                  Valor total da campanha: R$ {((calculateBudget().min * parseInt(formData.creators_count)) || 0).toFixed(2)}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Conteúdo *
            </label>
            <select
              name="content_type"
              value={formData.content_type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Selecione o tipo</option>
              <option value="Foto">Foto</option>
              <option value="Foto + Video">Foto + Video</option>
              <option value="Video">Video</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nicho *
            </label>
            <select
              name="niche"
              value={formData.niche}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Selecione o nicho</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="fashion">Moda</option>
              <option value="beauty">Beleza</option>
              <option value="fitness">Fitness</option>
              <option value="food">Culinária</option>
              <option value="travel">Viagem</option>
              <option value="tech">Tecnologia</option>
              <option value="business">Negócios</option>
              <option value="health">Saúde</option>
              <option value="education">Educação</option>
              <option value="entertainment">Entretenimento</option>
              <option value="sports">Esportes</option>
              <option value="automotive">Automotivo</option>
              <option value="home">Casa e Decoração</option>
              <option value="parenting">Maternidade/Paternidade</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faixa Etária *
              </label>
              <select
                name="age_range"
                value={formData.age_range}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Selecione a faixa etária</option>
                <option value="16-20">16-20 anos</option>
                <option value="21-25">21-25 anos</option>
                <option value="26-30">26-30 anos</option>
                <option value="31-35">31-35 anos</option>
                <option value="36-40">36-40 anos</option>
                <option value="41-45">41-45 anos</option>
                <option value="46-50">46-50 anos</option>
                <option value="50+">50+ anos</option>
                <option value="Qualquer idade">Qualquer idade</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gênero *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Selecione o gênero</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Não-binário">Não-binário</option>
                <option value="Qualquer gênero">Qualquer gênero</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prazo de Entrega *
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleInputChange}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requisitos
            </label>
            <div className="space-y-3">
              {formData.requirements.map((requirement, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={requirement}
                    onChange={(e) => handleRequirementChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Seguidores: 10K+"
                  />
                  {formData.requirements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRequirement}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Adicionar Requisito
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <form onSubmit={handleSubmit} className="flex items-center gap-4 w-full justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Criar Oportunidade
            </button>
          </form>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};

export default CreateOpportunityModal;