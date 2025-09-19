import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';

type AuthMode = 'login' | 'register' | 'forgot-password';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  const navigateToAnalysts = () => {
    window.location.href = '/login/analysts';
  };

  const handleToggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const handleForgotPassword = () => {
    setMode('forgot-password');
  };

  const handleBackToLogin = () => {
    setMode('login');
  };

  switch (mode) {
    case 'register':
      return <RegisterForm onToggleMode={handleToggleMode} />;
    case 'forgot-password':
      return <ForgotPasswordForm onBack={handleBackToLogin} />;
    default:
      return (
        <LoginForm
          onToggleMode={handleToggleMode}
          onForgotPassword={handleForgotPassword}
          onNavigateToAnalysts={navigateToAnalysts}
        />
      );
  }
};

export default AuthPage;