import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';

import AuthPage from './components/auth/AuthPage';
import Dashboard from './pages/Dashboard';

const MainApp = () => {
  const { user } = useAuth();

  if (!user) {
    return <AuthPage />;
  }

  return (
    <SocketProvider>
      <CallProvider>
        <Dashboard />
      </CallProvider>
    </SocketProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
