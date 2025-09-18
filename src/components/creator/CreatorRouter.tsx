import React from 'react';
import { useRouter } from '../../hooks/useRouter';
import Dashboard from '../Dashboard';
import Opportunities from '../Opportunities';
import Projects from '../Projects';
import Messages from '../Messages';
import Training from '../Training';
import Profile from '../Profile';
import Help from '../Help';
import AccountSettings from '../AccountSettings';

interface CreatorRouterProps {
  onOpenConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
  onBackToList: () => void;
}

const CreatorRouter: React.FC<CreatorRouterProps> = ({ 
  onOpenConversation, 
  selectedConversationId, 
  onBackToList 
}) => {
  const { currentPath } = useRouter();

  // Extract the route from the path (remove /creators prefix)
  const route = currentPath.replace('/creators', '') || '/opportunities';

  switch (route) {
    case '/dashboard':
      return <Dashboard />;
    case '/opportunities':
      return <Opportunities />;
    case '/projects':
      return <Projects onOpenConversation={onOpenConversation} />;
    case '/messages':
      return <Messages selectedConversationId={selectedConversationId} onBackToList={onBackToList} />;
    case '/training':
      return <Training />;
    case '/profile':
      return <Profile />;
    case '/help':
      return <Help />;
    case '/settings':
      return <AccountSettings />;
    default:
      return <Opportunities />;
  }
};

export default CreatorRouter;