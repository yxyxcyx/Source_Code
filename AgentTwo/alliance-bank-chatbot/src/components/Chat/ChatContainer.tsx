// src/components/Chat/ChatContainer.tsx
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import IncidentForm from './IncidentForm';
import azureAIService from '../../services/azure-ai-service';
import CitationPanel from './CitationPanel';

// Define the message type
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  imageUrl?: string; // Add support for image attachments
  citations?: {
    id: string;
    title: string;
    url?: string;
    docIndex: number; // Add docIndex property
    content?: string;
  }[];
}

interface Citation {
  id: string;
  title: string;
  url?: string;
  docIndex: number;
  content?: string;
}

interface User {
  username: string;
  department: string;
  display_name: string;
}

interface ChatContainerProps {
  user: User;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ user }) => {
  // Set to true to bypass incident form and go directly to chat
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    // Add initial welcome message
    {
      id: 1,
      text: `Welcome to Alliance Bank Malaysia Berhad IT Support Assistant. I'm here to help you with your queries.`,
      sender: 'bot' as const
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [citationPanelOpen, setCitationPanelOpen] = useState(false);

  const handleFormSubmit = async (formData: any) => {
    // Check if tablet error was selected
    const isTabletError = formData.q1 === 'Error in Tablet - Native (Sdn Bhd/Sole Prop)' ||
                          formData.q1 === 'Error in Tablet - Joget (Partnership, LLP, PB, etc)';
    
    // Build message parts
    const messageParts = [
      'New Incident Report:',
      `Q1: What issue you're facing today: ${formData.q1}`
    ];
    
    if (isTabletError) {
      messageParts.push(`Q1.a: Updated to latest version: ${formData.q1a ? 'Yes' : 'No'}`);
    }
    
    messageParts.push(`Q2: What is your role: ${formData.q2}`);
    messageParts.push(`Q3: What is your application status: ${formData.q3}`);
    
    if (formData.q3a) {
      messageParts.push(`Q3.a: What is the NonIndividual CIF Status: ${formData.q3a}`);
    }
    if (formData.q3b) {
      messageParts.push(`Q3.b: What is the NonIndividual Account Status: ${formData.q3b}`);
    }
    if (formData.q3c) {
      messageParts.push(`Q3.c: What is the application BCA Status: ${formData.q3c}`);
    }
    if (formData.q3d) {
      messageParts.push(`Q3.d: What is the application Bizsmart Status: ${formData.q3d}`);
    }
    
    messageParts.push(`Q4: Please explain your error message/inquiry: ${formData.q4}`);
    
    // Format the form data into a message
    const formattedMessage = messageParts.join('\n    ');
    
    console.log('Form data:', formData);
    console.log('Formatted message:', formattedMessage);

    // Create initial messages
    const initialMessages = [
      {
        id: 1,
        text: `Welcome to Alliance Bank Malaysia Berhad IT Support Assistant. I'll help you with your issue.`,
        sender: 'bot' as const
      },
      {
        id: 2,
        text: formattedMessage,
        sender: 'user' as const
      }
    ];

    // Set the initial messages
    setMessages(initialMessages);
    setShowChat(true);
    
    // Auto-scroll to the bottom of the chat
    setTimeout(() => {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);

    // Trigger the bot's response
    try {
      setIsLoading(true);
      
      // Build conversation history from the initial messages
      const conversationHistory = initialMessages
        .filter(msg => msg.sender === 'bot')
        .map(msg => ({
          role: 'assistant' as const,
          content: msg.text
        }));
      
      // Get response from Azure AI service with user context
      const response = await azureAIService.getChatCompletion(
        formattedMessage, 
        conversationHistory,
        undefined, // no image
        { username: user.username, department: user.department, conversationId: 'form-submission' }
      );
      
      // Add the bot's response to the messages
      const botResponse = {
        id: initialMessages.length + 1,
        text: response.content,
        sender: 'bot' as const,
        citations: response.citations?.map((citation: any, index: number) => ({
          id: `citation-${index}`,
          title: citation.title || 'Source',
          url: citation.url,
          docIndex: index,
          content: citation.content
        }))
      };
      
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      const errorMessage = {
        id: Date.now(),
        text: 'Sorry, I encountered an error while processing your request. Please try again.',
        sender: 'bot' as const
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, imageUrl?: string) => {
    // Add user message
    const newUserMessage: Message = {
      id: messages.length + 1,
      text,
      sender: 'user',
      imageUrl
    };
    
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setIsLoading(true);
    
    try {
      // Build conversation history from existing messages (excluding the welcome message)
      const conversationHistory = messages
        .filter(msg => msg.id !== 1) // Exclude welcome message
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.text
        }));
      
      // Get response from Azure AI service with conversation history and user context
      const response = await azureAIService.getChatCompletion(
        text, 
        conversationHistory, 
        imageUrl,
        { username: user.username, department: user.department, conversationId: `chat-${Date.now()}` }
      );
      
      // Extract the content and citations from the response
      const botResponse = response.content;
      const apiCitations = response.citations || [];
      
      console.log('Bot response:', botResponse);
      console.log('API Citations:', apiCitations);
      console.log('User department:', user.department);
      
      // Check if no citations were found and response contains default Azure message
      // BUT allow responses when an image is uploaded (vision analysis doesn't need citations)
      const hasImageInMessage = imageUrl !== undefined && imageUrl !== null;
      
      if (!hasImageInMessage && (apiCitations.length === 0 || 
          botResponse.includes("The requested information is not available in the retrieved data") ||
          botResponse.includes("not available in the retrieved data") ||
          botResponse.includes("Please try another query"))) {
        
        const customMessage = "The current demo assistant is limited to regulatory frameworks (e.g., BNM's RMiT, PCI DSS). I'm unable to provide answers outside this scope.";
        
        const newBotMessage: Message = {
          id: messages.length + 2,
          text: customMessage,
          sender: 'bot',
          citations: []
        };
        
        setMessages(prevMessages => [...prevMessages, newBotMessage]);
        setIsLoading(false);
        return;
      }
      
      // Clean the response: Fix citation references and remove References section
      let cleanedResponse = botResponse;
      
      // Find all [docN] references in the response text
      const docReferences = Array.from(cleanedResponse.matchAll(/\[doc(\d+)\]/g));
      const referencedDocNumbers = Array.from(new Set(docReferences.map((match: any) => parseInt(match[1])))).sort((a, b) => a - b);
      
      console.log('Referenced doc numbers from text:', referencedDocNumbers);
      
      // Create a mapping from docN to sequential citation numbers
      const docToCitationMap: { [key: number]: number } = {};
      const validCitations: any[] = [];
      
      referencedDocNumbers.forEach((docNum, index) => {
        // docN in the text corresponds to citations[docNum-1] in the array
        const citationIndex = docNum - 1;
        if (citationIndex >= 0 && citationIndex < apiCitations.length) {
          docToCitationMap[docNum] = index + 1; // Sequential numbering [1], [2], [3]...
          validCitations.push(apiCitations[citationIndex]);
        }
      });
      
      console.log('Doc to citation mapping:', docToCitationMap);
      console.log('Valid citations for display:', validCitations.length);
      
      // Replace [docN] with sequential [1], [2], [3]... based on the mapping
      if (Object.keys(docToCitationMap).length > 0) {
        for (const [docNum, citationNum] of Object.entries(docToCitationMap)) {
          const oldRef = `[doc${docNum}]`;
          const newRef = `[${citationNum}]`;
          cleanedResponse = cleanedResponse.replace(new RegExp(oldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newRef);
        }
        
        // Remove the "References:" section at the end
        cleanedResponse = cleanedResponse.replace(/\n\nReferences:\s*\[doc\d+\](\[doc\d+\])*\s*$/g, '');
        cleanedResponse = cleanedResponse.replace(/References:\s*\[doc\d+\](\[doc\d+\])*\s*$/g, '');
      }
      
      console.log('Cleaned response:', cleanedResponse);
      
      // Check for citation markers [1], [2], [3], etc. in the cleaned response
      const citationMarkerPattern: RegExp = /\[(\d+)\]/g;
      const referencedCitationNumbers: Set<number> = new Set();
      let match: RegExpExecArray | null;
      
      while ((match = citationMarkerPattern.exec(cleanedResponse)) !== null) {
        const citationNumber = parseInt(match[1]);
        if (citationNumber >= 1 && citationNumber <= validCitations.length) {
          referencedCitationNumbers.add(citationNumber);
        }
      }
      
      console.log('Referenced citation numbers from [1][2][3] markers:', Array.from(referencedCitationNumbers));
      
      // Create citation objects from the valid citations (already filtered above)
      const uniqueCitations = validCitations.map((citation, index) => {
        // Extract content from the citation - could be in different fields based on Azure API response
        let citationContent = '';
        
        // Try to get content from various possible fields in the citation object
        if (citation.content) {
          citationContent = citation.content;
        } else if (citation.text) {
          citationContent = citation.text;
        } else if (citation.snippet) {
          citationContent = citation.snippet;
        } else if (citation.chunk_content) {
          citationContent = citation.chunk_content;
        } else if (citation.content_text) {
          citationContent = citation.content_text;
        } else if (citation.metadata?.content) {
          citationContent = citation.metadata.content;
        } else {
          // Fallback content with part number to differentiate
          citationContent = `Citation ${index + 1} from ${citation.title || 'document'}.`;
        }
        
        return {
          id: String(index + 1), // Citation number starting from 1
          title: citation.title || `Document ${index + 1}`,
          url: citation.url || undefined,
          docIndex: index, // Store the sequential index for reference
          content: citationContent
        };
      });
      
      console.log('Final unique citations:', uniqueCitations);
      
      // Check if the response text actually contains citation markers like [1], [2], etc.
      const citationMarkers = cleanedResponse.match(citationMarkerPattern);
      
      console.log('Citation markers found in response:', citationMarkers);
      
      // Only include citations in the message if there are actual citation markers in the response text
      const shouldShowCitations = citationMarkers && citationMarkers.length > 0 && uniqueCitations.length > 0;
      
      const newBotMessage: Message = {
        id: messages.length + 2,
        text: cleanedResponse,
        sender: 'bot',
        citations: shouldShowCitations ? uniqueCitations : undefined
      };
      
      setMessages(prevMessages => [...prevMessages, newBotMessage]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      const errorMessage: Message = {
        id: messages.length + 2,
        text: 'Sorry, I encountered an error. Please try again later.',
        sender: 'bot'
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClick = (citation: Citation) => {
    setActiveCitation(citation);
    setCitationPanelOpen(true);
  };

  const closeCitationPanel = () => {
    setCitationPanelOpen(false);
  };

  const renderMessages = () => {
    return messages.map((message, index) => {
      console.log(`Rendering message ${index}:`, message);
      return (
        <MessageWrapper key={index}>
          <ChatMessage
            text={message.text || ''}
            sender={message.sender}
            imageUrl={message.imageUrl}
            citations={message.citations}
            onCitationClick={handleCitationClick}
          />
        </MessageWrapper>
      );
    });
  };

  // COMMENTED OUT: Incident form requirement removed
  // Users can now directly access the chat without filling the form
  // if (!showChat) {
  //   return (
  //     <Container>
  //       <IncidentForm onSubmit={handleFormSubmit} />
  //     </Container>
  //   );
  // }

  return (
    <Container>
      <MessagesContainer id="messages-container">
        {renderMessages()}
        {isLoading && (
          <LoadingMessage>
            <MessageWrapper>
              <ChatMessage
                key="loading" 
                text="Thinking..." 
                sender="bot" 
              />
            </MessageWrapper>
          </LoadingMessage>
        )}
      </MessagesContainer>
      <ChatInput onSendMessage={handleSendMessage} />
      <CitationPanel
        activeCitation={activeCitation}
        isOpen={citationPanelOpen}
        onClose={closeCitationPanel}
      />
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #ffffff;
  color: #374151;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  background-color: #ffffff;
`;

const MessageWrapper = styled.div`
  width: 100%;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

const LoadingMessage = styled.div`
  opacity: 0.7;
`;

export default ChatContainer;