// src/components/Layout/Header.tsx
import React from 'react';
import styled from 'styled-components';

interface User {
  username: string;
  department: string;
  display_name: string;
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <HeaderContainer>
      <LeftSection>
        <Logo src="/logo.ico" alt="Alliance Bank" />
        <TitleSection>
          <Title>Alliance Bank – Regulatory Knowledge Assistant (Demo)</Title>
          <Subtitle>Built on regulatory frameworks</Subtitle>
        </TitleSection>
      </LeftSection>
      
      <RightSection>
        <UserInfo>
          <DemoLabel>Demo Access</DemoLabel>
          <LogoutButton onClick={onLogout}>
            Logout
          </LogoutButton>
        </UserInfo>
      </RightSection>
    </HeaderContainer>
  );
};

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Logo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 6px;
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.2;
`;

const Subtitle = styled.span`
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DemoLabel = styled.span`
  font-size: 14px;
  color: #374151;
  font-weight: 500;
`;

const LogoutButton = styled.button`
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #e5e7eb;
    border-color: #9ca3af;
  }
`;

export default Header;