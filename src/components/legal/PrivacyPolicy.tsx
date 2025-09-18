import React from 'react';
import { ArrowLeft, Shield, Database, Eye, Lock } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      {onBack && (
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
              <p className="text-gray-600">Última atualização: Janeiro de 2025</p>
            </div>
          </div>
        </div>
      )}

      {!onBack && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
            <p className="text-gray-600">Última atualização: Janeiro de 2025</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="prose max-w-none">
            
            {/* Seção 1: Introdução */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-600" />
                1. Introdução
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                A UGC Hub valoriza sua privacidade e está comprometida em proteger seus dados pessoais. 
                Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Ao usar nossa plataforma, você concorda com as práticas descritas nesta política.
              </p>
            </section>

            {/* Seção 2: Informações que Coletamos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                2. Informações que Coletamos
              </h2>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-3">2.1 Informações Fornecidas por Você</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li><strong>Dados de Cadastro:</strong> Nome, email, telefone, localização</li>
                <li><strong>Perfil Profissional:</strong> Bio, nicho, número de seguidores, portfolio</li>
                <li><strong>Informações de Pagamento:</strong> Dados bancários para transferências</li>
                <li><strong>Conteúdo:</strong> Materiais enviados através da plataforma</li>
                <li><strong>Comunicações:</strong> Mensagens trocadas na plataforma</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">2.2 Informações Coletadas Automaticamente</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li><strong>Dados de Uso:</strong> Como você interage com a plataforma</li>
                <li><strong>Informações Técnicas:</strong> Endereço IP, tipo de dispositivo, navegador</li>
                <li><strong>Cookies:</strong> Para melhorar sua experiência de uso</li>
                <li><strong>Logs de Atividade:</strong> Horários de acesso e ações realizadas</li>
              </ul>
            </section>

            {/* Seção 3: Como Usamos suas Informações */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Como Usamos suas Informações</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Finalidades Principais</h3>
                <ul className="list-disc list-inside space-y-2 text-blue-800">
                  <li>Facilitar conexões entre criadores e empresas</li>
                  <li>Processar pagamentos e transações</li>
                  <li>Fornecer suporte ao cliente</li>
                  <li>Melhorar nossos serviços</li>
                  <li>Enviar notificações importantes</li>
                  <li>Garantir segurança da plataforma</li>
                </ul>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">3.1 Compartilhamento com Terceiros</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Compartilhamos suas informações apenas quando necessário:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li><strong>Com Empresas:</strong> Dados do perfil para avaliação de candidaturas</li>
                <li><strong>Processadores de Pagamento:</strong> Para transações financeiras</li>
                <li><strong>Prestadores de Serviço:</strong> Que nos ajudam a operar a plataforma</li>
                <li><strong>Autoridades:</strong> Quando exigido por lei</li>
              </ul>
            </section>

            {/* Seção 4: Proteção de Dados */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                4. Proteção e Segurança
              </h2>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                Implementamos medidas técnicas e organizacionais para proteger seus dados:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Medidas Técnicas</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Criptografia de dados</li>
                    <li>• Conexões HTTPS seguras</li>
                    <li>• Backups regulares</li>
                    <li>• Monitoramento 24/7</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Medidas Organizacionais</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Acesso restrito aos dados</li>
                    <li>• Treinamento da equipe</li>
                    <li>• Políticas de segurança</li>
                    <li>• Auditorias regulares</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Seção 5: Seus Direitos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Seus Direitos (LGPD)</h2>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                Conforme a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <div>
                      <strong>Acesso:</strong> Solicitar informações sobre o tratamento de seus dados
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <div>
                      <strong>Correção:</strong> Solicitar correção de dados incompletos ou incorretos
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <div>
                      <strong>Exclusão:</strong> Solicitar eliminação de dados desnecessários
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <div>
                      <strong>Portabilidade:</strong> Solicitar transferência de dados para outro fornecedor
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <div>
                      <strong>Oposição:</strong> Opor-se ao tratamento de dados em certas situações
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* Seção 6: Retenção de Dados */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Retenção de Dados</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Mantemos seus dados pelo tempo necessário para:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li>Fornecer nossos serviços</li>
                <li>Cumprir obrigações legais</li>
                <li>Resolver disputas</li>
                <li>Fazer cumprir nossos acordos</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Após esse período, os dados são excluídos ou anonimizados de forma segura.
              </p>
            </section>

            {/* Seção 7: Cookies */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Cookies e Tecnologias Similares</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Usamos cookies para melhorar sua experiência na plataforma. Você pode gerenciar 
                suas preferências de cookies nas configurações do seu navegador.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Nota:</strong> Alguns cookies são essenciais para o funcionamento da plataforma 
                  e não podem ser desabilitados.
                </p>
              </div>
            </section>

            {/* Seção 8: Alterações */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Alterações nesta Política</h2>
              <p className="text-gray-700 leading-relaxed">
                Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas 
                através da plataforma ou por email. Recomendamos revisar esta política regularmente.
              </p>
            </section>

            {/* Seção 9: Contato */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Contato e DPO</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato:
                </p>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Email:</strong> <a href="mailto:privacidade@ugchub.com" className="text-blue-600 hover:text-blue-700">privacidade@ugchub.com</a></p>
                  <p><strong>DPO (Encarregado de Dados):</strong> <a href="mailto:dpo@ugchub.com" className="text-blue-600 hover:text-blue-700">dpo@ugchub.com</a></p>
                  <p><strong>Telefone:</strong> (11) 3000-0000</p>
                </div>
              </div>
            </section>

      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-gray-500 text-sm">
        <p>© 2025 UGC Hub. Todos os direitos reservados.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;