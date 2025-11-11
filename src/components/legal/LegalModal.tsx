import React, { useState } from 'react';
import { X, FileText, Shield } from 'lucide-react';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import ModalPortal from '../common/ModalPortal';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6">
        <div className="glass-panel flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden px-0 pb-0">
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white">Documentos legais</h2>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
              <button
                onClick={() => setActiveTab('terms')}
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition ${
                  activeTab === 'terms'
                    ? 'bg-[#00FF41] text-black shadow-neon-sm' : 'text-slate-300 hover:text-[#00FF41]'
                }`}
              >
                <FileText className="h-4 w-4" />
                Termos de uso
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition ${
                  activeTab === 'privacy'
                    ? 'bg-[#00FF41] text-black shadow-neon-sm' : 'text-slate-300 hover:text-[#00FF41]'
                }`}
              >
                <Shield className="h-4 w-4" />
                Política de privacidade
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-200 transition hover:border-white/30 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-6 text-sm leading-relaxed text-slate-200">
          {activeTab === 'terms' ? <TermsOfService /> : <PrivacyPolicy />}
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};

export default LegalModal;