import React from 'react';
import { useRouter } from '../../hooks/useRouter';
import AnalystOverview from './AnalystOverview';
import OpportunityManagement from './OpportunityManagement';
import OpportunityStagesManagementWrapper from './OpportunityStagesManagementWrapper';
import ProjectManagement from './ProjectManagement';
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

  // Handle project details route with ID parameter
  if (route.startsWith('/projects/') && route !== '/projects') {
    const projectId = route.split('/')[2];
    return <ProjectManagement onOpenConversation={onOpenConversation} selectedProjectId={projectId} />;
  }
  
  switch (route) {
    case '/overview':
      return <AnalystOverview />;
    case '/opportunities':
      return <OpportunityManagement />;
    case '/stages':
      return <OpportunityStagesManagementWrapper />;
    case '/projects':
      return <ProjectManagement onOpenConversation={onOpenConversation} />;
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