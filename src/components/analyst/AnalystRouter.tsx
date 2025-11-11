import React from 'react';
import { useRouter } from '../../hooks/useRouter';
import AnalystOverview from './AnalystOverview';
import OpportunityManagement from './OpportunityManagement';
import OpportunityStagesManagementWrapper from './OpportunityStagesManagementWrapper';
import ProjectManagement from './ProjectManagement';
import CreatorsList from './CreatorsList';
import AnalystMessages from './AnalystMessages';
import AnalystAccountSettings from './AnalystAccountSettings';
import EnhancedDeliverableManagement from './EnhancedDeliverableManagement';
import EnhancedProjectDashboard from './EnhancedProjectDashboard';
import CreatorProfilePage from './CreatorProfilePage';

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

  if (route.startsWith('/creators/') && route !== '/creators') {
    return <CreatorProfilePage />;
  }
  
  switch (route) {
    case '/overview':
      return <AnalystOverview key={route} />;
    case '/project-dashboard':
      return <EnhancedProjectDashboard key={route} />;
    case '/opportunities':
      return <OpportunityManagement key={route} />;
    case '/stages':
      return <OpportunityStagesManagementWrapper key={route} />;
    case '/projects':
      return <ProjectManagement key={route} onOpenConversation={onOpenConversation} />;
    case '/deliverables':
      return <EnhancedDeliverableManagement key={route} />;
    case '/creators':
      return <CreatorsList key={route} onOpenConversation={onOpenConversation} />;
    case '/messages':
      return <AnalystMessages key={route} selectedConversationId={selectedConversationId} onBackToList={onBackToList} />;
    case '/settings':
    case '/profile':
      return <AnalystAccountSettings key={route} />;
    default:
      return <AnalystOverview key={route} />;
  }
};

export default AnalystRouter;