import React from 'react';
import { useRouter } from '../../hooks/useRouter';
import AnalystOverview from './AnalystOverview';
import OpportunityManagement from './OpportunityManagement';
import OpportunityStagesManagement from './OpportunityStagesManagement';
import DeliverableManagement from './DeliverableManagement';
import CreatorsList from './CreatorsList';
import AnalystMessages from './AnalystMessages';
import AnalystAccountSettings from './AnalystAccountSettings';

interface AnalystRouterProps {
  onOpenConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
  onBackToList: () => void;
}

const AnalystRouter: React.FC<AnalystRouterProps> = ({ 
  onOpenConversation, 
  selectedConversationId, 
  onBackToList 
}) => {
  const { currentPath } = useRouter();

  // Extract the route from the path (remove /analysts prefix)
  const route = currentPath.replace('/analysts', '');

  
  switch (route) {
    case '/overview':
      return <AnalystOverview />;
    case '/opportunities':
      return <OpportunityManagement />;
    case '/stages':
      return <OpportunityStagesManagement />;
    case '/deliverables':
    case '/prazos':
      return <DeliverableManagement />;
    case '/creators':
      return <CreatorsList onOpenConversation={onOpenConversation} />;
    case '/messages':
      return <AnalystMessages selectedConversationId={selectedConversationId} onBackToList={onBackToList} />;
    case '/settings':
    case '/profile':
      return <AnalystAccountSettings />;
    default:
      return <AnalystOverview />;
  }
};

export default AnalystRouter;