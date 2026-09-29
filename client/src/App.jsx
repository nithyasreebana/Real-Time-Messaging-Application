import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#818cf8',
          fontSize: '1.2rem',
          fontWeight: 600
        }}
      >
        Loading RealTime Chat...
      </div>
    );
  }

  if (isAuthenticated) {
    return <ChatPage />;
  }

  return authView === 'login' ? (
    <LoginPage onSwitchToRegister={() => setAuthView('register')} />
  ) : (
    <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
  );
}

export default App;
