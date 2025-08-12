import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = (token: string, user: any) => {
    console.log('Login successful:', user);
    
    // Redirection selon le type d'utilisateur
    if (user.subscription_type === 'enterprise') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return <LoginForm onLoginSuccess={handleLoginSuccess} />;
};

export default LoginPage; 