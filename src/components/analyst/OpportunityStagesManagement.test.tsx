import React from 'react';
import OpportunityStagesManagement from './OpportunityStagesManagement';

// Componente de teste simples para verificar se carrega sem loop infinito
const TestComponent: React.FC = () => {
  console.log('Componente de teste renderizando...');
  
  return (
    <div>
      <h1>Teste do OpportunityStagesManagement</h1>
      <div style={{ height: '100vh', width: '100vw' }}>
        <OpportunityStagesManagement />
      </div>
    </div>
  );
};

export default TestComponent;