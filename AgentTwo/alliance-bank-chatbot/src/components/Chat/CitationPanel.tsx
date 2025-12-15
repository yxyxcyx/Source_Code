import React from 'react';
import styled from 'styled-components';

interface Citation {
  id: string;
  title: string;
  url?: string;
  docIndex: number;
  content?: string;
}

interface CitationPanelProps {
  activeCitation: Citation | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PanelContainerProps {
  $isOpen: boolean;
}

const CitationPanel: React.FC<CitationPanelProps> = ({ 
  activeCitation, 
  isOpen,
  onClose 
}) => {
  if (!isOpen || !activeCitation) {
    return null;
  }

  return (
    <PanelContainer $isOpen={isOpen}>
      <PanelHeader>
        <PanelTitle>{activeCitation.title}</PanelTitle>
        <CloseButton onClick={onClose}>×</CloseButton>
      </PanelHeader>
      <CitationContent>
        {activeCitation.content ? (
          <CitationText>{activeCitation.content}</CitationText>
        ) : (
          <CitationText>
            i) be an integral part of the financial institution's enterprise risk management
            <br/><br/>
            framework (ERM);
            <br/><br/>
            ii) be tailored to the cloud service models, both currently in use or being
            <br/><br/>
            considered for use; and
            <br/><br/>
            iii) specify the scope of the financial institution's responsibility under each
            <br/><br/>
            shared responsibility model, as the associated risks may vary.
            <br/><br/>
            (d) A financial institution is responsible for the protection of data stored in cloud
            <br/><br/>
            irrespective of cloud service models and the cloud service providers. Therefore,
            <br/><br/>
            the financial institution's understanding of the specific details of the cloud
            <br/><br/>
            arrangement, particularly what is or is not specified in the terms of the contract
            <br/><br/>
            with the cloud service providers is essential.
            <br/><br/>
            (e) Regardless of the cloud arrangement with cloud service providers, the onus
            <br/><br/>
            remains on the financial institution to satisfy the Bank that it is protecting
          </CitationText>
        )}
      </CitationContent>
    </PanelContainer>
  );
};

const PanelContainer = styled.div<PanelContainerProps>`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 400px;
  background-color: #2a2b32;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  opacity: ${props => props.$isOpen ? 1 : 0};
  transform: translateX(${props => props.$isOpen ? '0' : '100%'});
  transition: transform 0.3s ease, opacity 0.3s ease;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #444654;
`;

const PanelTitle = styled.h3`
  margin: 0;
  color: #ffffff;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #ffffff;
  
  &:hover {
    color: #10a37f;
  }
`;

const CitationContent = styled.div`
  padding: 16px;
  overflow-y: auto;
  flex: 1;
`;

const CitationText = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: #ffffff;
`;

export default CitationPanel;
