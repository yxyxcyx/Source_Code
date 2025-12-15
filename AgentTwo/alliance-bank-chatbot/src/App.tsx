// src/App.tsx
import React, { useState } from 'react';
import './App.css';
import styled from 'styled-components';
import Header from './components/Layout/Header';
import ChatContainer from './components/Chat/ChatContainer';
import LoginPage from './components/Auth/LoginPage';

interface User {
  username: string;
  department: string;
  display_name: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Show login page if user is not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show chatbot interface if user is authenticated
  return (
    <AppContainer>
      <Header user={user} onLogout={handleLogout} />
      <ChatContainer user={user} />
    </AppContainer>
  );
}

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #ffffff;
`;

export default App;