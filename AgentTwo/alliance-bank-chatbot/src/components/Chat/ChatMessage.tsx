import React, { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

interface Citation {
  id: string;
  title: string;
  url?: string;
  docIndex: number;
  content?: string;
}

interface ChatMessageProps {
  text: string;
  sender: 'user' | 'bot';
  imageUrl?: string;
  citations?: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  text, 
  sender,
  imageUrl,
  citations,
  onCitationClick
}) => {
  const [feedback, setFeedback] = useState<'thumbsUp' | 'thumbsDown' | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [storedAnswer, setStoredAnswer] = useState(text);
  const [storedCitations, setStoredCitations] = useState<Citation[]>(citations ?? []);
  const [showReferencesList, setShowReferencesList] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  useEffect(() => {
    setStoredAnswer(text);
  }, [text]);

  useEffect(() => {
    setStoredCitations(citations ?? []);
  }, [citations]);

  useEffect(() => {
    setActiveCitation(null);
  }, [storedAnswer, storedCitations]);
  
  // Debug logging
  if (!storedAnswer) {
    console.error('ChatMessage received undefined text!', { text: storedAnswer, sender, citations: storedCitations });
  }
  
  // Toggle references list
  const toggleReferencesList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReferencesList(!showReferencesList);
  };
  
  // Handle clicking a specific reference
  const handleReferenceClick = (citation: Citation, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCitationClick) {
      onCitationClick(citation);
    }
    setShowReferencesList(false); // Close the list after selection
    setActiveCitation(citation);
  };
  
  const findCitationByDocNumber = (docNumber: number) => {
    if (docNumber <= 0) return undefined;

    const directIndexMatch = storedCitations[docNumber - 1];
    if (directIndexMatch) {
      return directIndexMatch;
    }

    return storedCitations.find((citation) => {
      const normalizedId = citation.id.toLowerCase();
      const numericId = parseInt(citation.id.replace(/[^0-9]/g, ''), 10);
      return (
        normalizedId === `doc${docNumber}` ||
        normalizedId === `document${docNumber}` ||
        citation.id === `${docNumber}` ||
        (!Number.isNaN(numericId) && numericId === docNumber) ||
        citation.docIndex === docNumber ||
        citation.docIndex + 1 === docNumber
      );
    });
  };

  // Simple markdown parser
  const parseMarkdown = (text: string): string => {
    if (!text) return '';
    let html = text;
    
    // Remove markdown code block markers at start and end
    html = html.replace(/^```markdown\s*\n?/i, '');
    html = html.replace(/^```\s*\n?/i, '');
    html = html.replace(/\n?```\s*$/i, '');
    
    // Convert bold text (**text**) - handle multiple on same line
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert headings (### text) - must be at start of line
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Handle tables first (before line processing)
    html = parseMarkdownTables(html);
    
    // Process lines to handle numbered lists and nested content
    const lines = html.split('\n');
    const processedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip lines that are already processed as table HTML
      if (line.includes('<table') || line.includes('</table>') || line.includes('<tr>') || line.includes('<td>') || line.includes('<th>')) {
        processedLines.push(line);
        continue;
      }
      
      // Handle numbered list items (1. 2. 3. etc.)
      if (line.match(/^\d+\.\s+/)) {
        processedLines.push(`<div class="list-item">${line}</div>`);
      }
      // Handle sub-bullets with dash (- text)
      else if (line.match(/^\s*-\s+/)) {
        const indentLevel = line.match(/^(\s*)/)?.[1]?.length || 0;
        const content = line.replace(/^\s*-\s+/, '');
        processedLines.push(`<div class="sub-item" style="margin-left: ${Math.max(20, indentLevel)}px;">• ${content}</div>`);
      }
      // Handle regular indented content
      else if (line.match(/^\s+/) && line.trim()) {
        const indentLevel = line.match(/^(\s*)/)?.[1]?.length || 0;
        processedLines.push(`<div class="indented-content" style="margin-left: ${Math.max(20, indentLevel)}px;">${line.trim()}</div>`);
      }
      // Handle regular content
      else if (line.trim()) {
        processedLines.push(`<div class="regular-content">${line}</div>`);
      }
      // Handle empty lines
      else {
        processedLines.push('<div class="line-break"></div>');
      }
    }
    
    html = processedLines.join('');
    
    return html;
  };

  // Helper function to parse markdown tables
  const parseMarkdownTables = (text: string): string => {
    const lines = text.split('\n');
    const result: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Check if this line starts a table (has pipes and content)
      if (line.includes('|') && line.split('|').filter(cell => cell.trim()).length >= 2 && !line.match(/^\|[\s\-\|]+\|$/)) {
        // Found start of table, collect all table rows
        const tableRows: string[] = [];
        
        // Add the current line as first row
        tableRows.push(line);
        i++;
        
        // Continue collecting table rows and associated content
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          
          // Skip separator rows
          if (nextLine.match(/^\|[\s\-\|]+\|$/)) {
            i++;
            continue;
          }
          
          // If it's a table row (has pipes and multiple columns)
          if (nextLine.includes('|') && nextLine.split('|').filter(cell => cell.trim()).length >= 2) {
            tableRows.push(nextLine);
            i++;
          }
          // If it's a continuation line (starts with - and we have table rows)
          else if (nextLine.startsWith('-') && tableRows.length > 0) {
            // Append to the last table row's middle column
            const lastRowIndex = tableRows.length - 1;
            const lastRow = tableRows[lastRowIndex];
            const cells = lastRow.split('|');
            
            // Add to the middle column (index 2, since index 0 is empty due to leading |)
            if (cells.length >= 3) {
              cells[2] = cells[2].trim() + '<br>' + nextLine;
              tableRows[lastRowIndex] = cells.join('|');
            }
            i++;
          }
          // If it's an empty line, skip it but continue looking for more table content
          else if (nextLine === '') {
            i++;
            // Look ahead to see if there's more table content
            if (i < lines.length) {
              const lookAhead = lines[i].trim();
              if (lookAhead.includes('|') && lookAhead.split('|').filter(cell => cell.trim()).length >= 2 && !lookAhead.match(/^\|[\s\-\|]+\|$/)) {
                // More table content found, continue
                continue;
              }
            }
            break;
          }
          // Non-table content - end of table
          else {
            break;
          }
        }
        
        // Convert collected table rows to HTML
        if (tableRows.length > 0) {
          result.push(convertToHtmlTable(tableRows));
        }
      } else if (line.trim() !== '') {
        // Not a table line and not empty, add as is
        result.push(lines[i]);
        i++;
      } else {
        // Empty line
        result.push(lines[i]);
        i++;
      }
    }
    
    return result.join('\n');
  };

  // Helper function to convert table rows to HTML
  const convertToHtmlTable = (rows: string[]): string => {
    if (rows.length === 0) return '';
    
    let html = '<table class="markdown-table">';
    
    rows.forEach((row, index) => {
      // Split by | and clean up cells
      const allCells = row.split('|');
      // Remove empty cells at start/end (from leading/trailing |)
      let cells = allCells.slice(1, -1).map(cell => cell.trim());
      
      // Ensure we have at least 3 cells for proper table structure
      while (cells.length < 3) {
        cells.push('');
      }
      
      if (cells.length === 0) return;
      
      html += '<tr>';
      cells.forEach(cell => {
        // First row is typically headers
        const tag = index === 0 ? 'th' : 'td';
        // Clean up any HTML entities and ensure proper formatting
        const cleanCell = cell.replace(/<br>/g, '<br/>');
        html += `<${tag}>${cleanCell}</${tag}>`;
      });
      html += '</tr>';
    });
    
    html += '</table>';
    return html;
  };

  // Replace citation markers like [1], [2], [3] with clickable superscript numbers
  const formatTextWithCitations = () => {
    if (!storedAnswer) return '';

    let processedText = storedAnswer;
    if (storedCitations.length > 0) {
      const docPattern = /\[doc(\d+)\]/gi;
      processedText = processedText.replace(docPattern, (match, docNumberValue) => {
        const docNumber = parseInt(docNumberValue, 10);
        if (Number.isNaN(docNumber)) {
          return match;
        }
        const citation = findCitationByDocNumber(docNumber);
        if (!citation) {
          return match;
        }
        const citationIndex = storedCitations.findIndex((item) => item.id === citation.id);
        const displayIndex = citationIndex >= 0 ? citationIndex + 1 : docNumber;
        return `<span class="citation-badge" data-citation-id="${citation.id}">[${displayIndex}]</span>`;
      });

      const numericPattern = /\[(\d+)\]/g;
      processedText = processedText.replace(numericPattern, (match, markerValue, offset, fullText) => {
        const markerNumber = parseInt(markerValue, 10);
        if (Number.isNaN(markerNumber)) {
          return match;
        }

        const lastOpenSpan = fullText.lastIndexOf('<span', offset);
        const lastCloseSpan = fullText.lastIndexOf('</span>', offset);
        if (lastOpenSpan !== -1 && lastOpenSpan > lastCloseSpan) {
          return match;
        }

        const citation = findCitationByDocNumber(markerNumber);
        if (!citation) {
          return match;
        }

        const citationIndex = storedCitations.findIndex((item) => item.id === citation.id);
        const displayIndex = citationIndex >= 0 ? citationIndex + 1 : markerNumber;
        return `<span class="citation-badge" data-citation-id="${citation.id}">[${displayIndex}]</span>`;
      });
    }

    return parseMarkdown(processedText);
  };

  // Handle clicking on a citation number
  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('citation-badge')) {
      const citationId = target.getAttribute('data-citation-id');
      if (citationId) {
        const citation = storedCitations.find((item) => item.id === citationId);
        if (citation) {
          setActiveCitation((prev) => (prev && prev.id === citation.id ? null : citation));
          if (onCitationClick) {
            onCitationClick(citation);
          }
          setShowReferencesList(false);
        }
      }
      return;
    }
    if (activeCitation) {
      setActiveCitation(null);
    }
  };

  const activeCitationIndex = activeCitation ? storedCitations.findIndex((item) => item.id === activeCitation.id) : -1;

  return (
    <MessageContainer sender={sender}>
      <MessageInner>
        <IconContainer>
          {sender === 'user' ? (
            '👤'
          ) : (
            <BotAvatar src="/logo.ico"/>
          )}
        </IconContainer>
        <ContentContainer>
          {imageUrl && (
            <MessageImage src={imageUrl} alt="Uploaded image" />
          )}
          <MessageContent 
            dangerouslySetInnerHTML={{ __html: formatTextWithCitations() }} 
            onClick={handleContentClick}
          />
          {activeCitation && (
            <CitationTooltip>
              <TooltipHeader>
                <TooltipBadge>{activeCitationIndex >= 0 ? activeCitationIndex + 1 : ''}</TooltipBadge>
                <TooltipTitle>{activeCitation.title}</TooltipTitle>
                <TooltipCloseButton onClick={() => setActiveCitation(null)}>×</TooltipCloseButton>
              </TooltipHeader>
              <TooltipMeta>Document ID: {activeCitation.id}</TooltipMeta>
              {activeCitation.url && (
                <TooltipLink href={activeCitation.url} target="_blank" rel="noopener noreferrer">
                  View source
                </TooltipLink>
              )}
              {activeCitation.content && (
                <TooltipContent>{activeCitation.content}</TooltipContent>
              )}
            </CitationTooltip>
          )}
          
          {storedCitations && storedCitations.length > 0 && (
            <CitationsContainer>
              <CitationsToggle onClick={toggleReferencesList}>
                {storedCitations.length} {storedCitations.length === 1 ? 'reference' : 'references'}
                <ToggleIcon isOpen={showReferencesList}>▼</ToggleIcon>
              </CitationsToggle>
              
              {showReferencesList && (
                <ReferencesList>
                  {storedCitations.map((citation, index) => (
                    <ReferenceItem 
                      key={citation.id || index} 
                      onClick={(e) => handleReferenceClick(citation, e)}
                    >
                      <ReferenceNumber>{index + 1}</ReferenceNumber>
                      <ReferenceTitle>{citation.title}</ReferenceTitle>
                    </ReferenceItem>
                  ))}
                </ReferencesList>
              )}
            </CitationsContainer>
          )}
          
          {sender === 'bot' && (
            <FeedbackContainer>
              {!feedbackSubmitted ? (
                <>
                  <FeedbackText>Was this helpful?</FeedbackText>
                  <FeedbackButton 
                    isActive={feedback === 'thumbsUp'}
                    onClick={() => {
                      setFeedback('thumbsUp');
                      setFeedbackSubmitted(true);
                      // Here you can add an API call to send feedback to your backend
                    }}
                    aria-label="Thumbs up"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.5 9.5L12 2L9.5 9.5H2L8 14.5L5.5 22L12 17L18.5 22L16 14.5L22 9.5H14.5Z" fill="currentColor" />
                    </svg>
                  </FeedbackButton>
                  <FeedbackButton 
                    isActive={feedback === 'thumbsDown'}
                    onClick={() => {
                      setFeedback('thumbsDown');
                      setFeedbackSubmitted(true);
                      // Here you can add an API call to send feedback to your backend
                    }}
                    aria-label="Thumbs down"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(180deg)' }}>
                      <path d="M14.5 9.5L12 2L9.5 9.5H2L8 14.5L5.5 22L12 17L18.5 22L16 14.5L22 9.5H14.5Z" fill="currentColor" />
                    </svg>
                  </FeedbackButton>
                </>
              ) : (
                <FeedbackThanks>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor" />
                  </svg>
                  Thank you for your feedback!
                </FeedbackThanks>
              )}
            </FeedbackContainer>
          )}
        </ContentContainer>
      </MessageInner>
    </MessageContainer>
  );
};

const FeedbackContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
  font-size: 14px;
  color: #6b7280;
`;

const FeedbackButton = styled.button<{ isActive?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  margin-right: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4b5563;
  
  &:hover {
    background-color: #f3f4f6;
  }
  
  ${props => props.isActive && css`
    background-color: #f3f4f6;
    border-color: #9ca3af;
  `}
`;

const FeedbackText = styled.span`
  margin-right: 8px;
  font-weight: 500;
`;

const FeedbackThanks = styled.div`
  color: #4b5563;
  font-size: 13px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 6px;
    color: #10b981;
  }
`;

const MessageContainer = styled.div<{ sender: string }>`
  display: flex;
  padding: 20px 24px;
  background-color: ${props => props.sender === 'user' ? '#ffffff' : '#f7f7f8'};
  max-width: 100%;
  color: #374151;
  justify-content: center;
`;

const MessageInner = styled.div`
  display: flex;
  max-width: 768px;
  width: 100%;
  gap: 16px;
`;

const IconContainer = styled.div`
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-shrink: 0;
  padding-top: 2px;
`;

const ContentContainer = styled.div`
  flex: 1;
  min-width: 0;
`;

const MessageContent = styled.div`
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 16px;
  color: #374151;
  position: relative;
  
  /* Heading styles */
  h1, h2, h3, h4, h5, h6 {
    margin: 20px 0 12px 0;
    font-weight: 600;
    color: #1f2937;
    line-height: 1.3;
  }
  
  h3 {
    font-size: 18px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  
  /* Paragraph spacing */
  p {
    margin: 12px 0;
    line-height: 1.7;
  }
  
  /* Bold text */
  strong, b {
    font-weight: 600;
    color: #1f2937;
  }
  
  /* Lists */
  ul, ol {
    margin: 16px 0;
    padding-left: 0;
  }
  
  ol.numbered-list {
    counter-reset: list-counter;
    list-style: none;
  }
  
  ol.numbered-list > li {
    counter-increment: list-counter;
    margin: 12px 0;
    padding-left: 32px;
    position: relative;
    line-height: 1.6;
  }
  
  ol.numbered-list > li::before {
    content: counter(list-counter) ".";
    position: absolute;
    left: 0;
    top: 0;
    font-weight: 600;
    color: #374151;
    min-width: 24px;
  }
  
  /* Regular ordered lists - use default browser numbering */
  ol:not(.numbered-list) {
    list-style: decimal;
    padding-left: 24px;
  }
  
  ol:not(.numbered-list) > li {
    margin: 8px 0;
    line-height: 1.6;
  }
  
  ul {
    list-style: none;
  }
  
  ul > li {
    margin: 8px 0;
    padding-left: 24px;
    position: relative;
    line-height: 1.6;
  }
  
  ul > li::before {
    content: "•";
    position: absolute;
    left: 8px;
    top: 0;
    color: #6b7280;
  }
  
  /* Code blocks */
  code {
    background-color: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 14px;
  }
  
  pre {
    background-color: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
    margin: 16px 0;
    overflow-x: auto;
  }
  
  /* Blockquotes */
  blockquote {
    border-left: 4px solid #d1d5db;
    padding-left: 16px;
    margin: 16px 0;
    color: #6b7280;
    font-style: italic;
  }
  
  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
  }
  
  th, td {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
    text-align: left;
  }
  
  th {
    background-color: #f9fafb;
    font-weight: 600;
  }
  
  /* Markdown tables */
  .markdown-table {
    border-collapse: collapse;
    width: 100%;
    margin: 20px 0;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .markdown-table th {
    background-color: #f8fafc;
    border: 1px solid #d1d5db;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }
  
  .markdown-table td {
    border: 1px solid #e5e7eb;
    padding: 12px 16px;
    text-align: left;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.5;
  }
  
  .markdown-table tr:nth-child(even) {
    background-color: #f9fafb;
  }
  
  .markdown-table tr:hover {
    background-color: #f3f4f6;
  }
  
  /* Links */
  a {
    color: #3b82f6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  /* Citation superscripts */
  .citation-sup {
    color: #2563eb;
    cursor: pointer;
    padding: 0 2px;
    font-size: 0.75em;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .citation-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    margin: 0 4px;
    border-radius: 9999px;
    background-color: #eef2ff;
    color: #4338ca;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .citation-badge:hover {
    background-color: #e0e7ff;
  }
  
  /* Horizontal rules */
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 24px 0;
  }
  
  /* First paragraph no top margin */
  p:first-child {
    margin-top: 0;
  }
  
  /* Last element no bottom margin */
  *:last-child {
    margin-bottom: 0;
  }
  
  /* List items */
  .list-item {
    margin: 16px 0;
    line-height: 1.6;
    font-weight: 500;
  }
  
  /* Sub-items */
  .sub-item {
    margin: 8px 0;
    line-height: 1.6;
    color: #374151;
  }
  
  /* Indented content */
  .indented-content {
    margin: 6px 0;
    line-height: 1.6;
    color: #4b5563;
  }
  
  /* Regular content */
  .regular-content {
    margin: 12px 0;
    line-height: 1.6;
  }
  
  /* Line breaks */
  .line-break {
    height: 8px;
  }
`;

const CitationsContainer = styled.div`
  margin-top: 16px;
  position: relative;
`;

const CitationsToggle = styled.div`
  display: flex;
  align-items: center;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  width: fit-content;
  
  &:hover {
    background-color: #e5e7eb;
  }
`;

const ToggleIcon = styled.span<{ isOpen: boolean }>`
  margin-left: 5px;
  font-size: 10px;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
`;

const ReferencesList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 5px;
  background-color: #2a2b32;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  min-width: 250px;
  max-width: 400px;
  z-index: 100;
  overflow: hidden;
  color: #ffffff;
`;

const ReferenceItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #3a3b42;
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid #444654;
  }
`;

const ReferenceNumber = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #10a37f;
  color: white;
  font-size: 12px;
  margin-right: 10px;
  flex-shrink: 0;
`;

const ReferenceTitle = styled.div`
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CitationTooltip = styled.div`
  margin-top: 16px;
  background-color: #1f2937;
  border-radius: 8px;
  padding: 16px;
  color: #f9fafb;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
`;

const TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TooltipBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #3b82f6;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
`;

const TooltipTitle = styled.span`
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  color: #f9fafb;
`;

const TooltipCloseButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px;
  transition: color 0.2s ease;
  
  &:hover {
    color: #f9fafb;
  }
`;

const TooltipMeta = styled.div`
  margin-top: 12px;
  font-size: 14px;
  color: #d1d5db;
`;

const TooltipLink = styled.a`
  display: inline-flex;
  align-items: center;
  margin-top: 8px;
  font-size: 14px;
  color: #60a5fa;
  
  &:hover {
    text-decoration: underline;
  }
`;

const TooltipContent = styled.div`
  margin-top: 12px;
  font-size: 14px;
  color: #e5e7eb;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const BotAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
`;

const MessageImage = styled.img`
  max-width: 400px;
  max-height: 400px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
`;

export default ChatMessage;