// src/services/azure-ai-service.ts
import axios from 'axios';

// Interface for the chat request with data_sources
interface ChatRequest {
  data_sources?: Array<{
    type: string;
    parameters: any;
  }>;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
    context?: any;
  }[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

// Interface for the Azure OpenAI response
interface ChatResponse {
  choices: {
    message: {
      role: string;
      content: string;
      context?: {
        citations?: any[];
        intent?: string;
      };
    };
    index?: number;
    finish_reason?: string;
  }[];
}

class AzureAIService {
  private apiKey: string;
  private endpoint: string;
  private deploymentName: string;
  private searchEndpoint: string;
  private searchApiKey: string;
  private searchIndexName: string;

  constructor() {
    // These should be stored in environment variables in a production app
    this.apiKey = process.env.REACT_APP_AZURE_API_KEY || '';
    this.endpoint = process.env.REACT_APP_AZURE_ENDPOINT || '';
    this.deploymentName = process.env.REACT_APP_AZURE_DEPLOYMENT_NAME || '';
    
    // Azure AI Search configuration
    const rawSearchEndpoint = process.env.REACT_APP_SEARCH_ENDPOINT || '';
    this.searchEndpoint = rawSearchEndpoint.startsWith('https://') 
      ? rawSearchEndpoint 
      : `https://${rawSearchEndpoint}`;
    this.searchApiKey = process.env.REACT_APP_SEARCH_ADMIN_KEY || '';
    this.searchIndexName = process.env.REACT_APP_SEARCH_INDEX || 'id';
  }

  // Method to check if the service is configured
  isConfigured(): boolean {
    const azureConfigured = Boolean(this.apiKey && this.endpoint && this.deploymentName);
    const searchConfigured = Boolean(this.searchEndpoint && this.searchApiKey && this.searchIndexName);
    return azureConfigured && searchConfigured;
  }

  // Method to get chat completion from Azure OpenAI via Express proxy
  /**
   * Step 1: Extract text and error information from image
   */
  private async extractTextFromImage(
    imageUrl: string,
    userMessage: string
  ): Promise<string> {
    const proxyUrl = 'http://localhost:9090/api/azure-openai/chat/completions';
    
    const extractionBody = {
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      deployment: this.deploymentName,
      apiVersion: "2024-04-01-preview",
      messages: [
        {
          role: 'system',
          content: `Extract ALL visible text and technical information from this image for IT support.

List in this format:
1. Error Messages: [error codes, error text]
2. Status: [system status, warnings]
3. UI Elements: [buttons, fields, screen title]
4. Technical: [URLs, timestamps, IDs]
5. Context: [what user was doing]

Be precise. Extract exact text as shown.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userMessage || 'Please extract all text and error information from this image.'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      stream: false
    };

    const response = await axios.post(proxyUrl, extractionBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data.choices[0].message.content;
  }

  /**
   * Step 2: Search knowledge base with extracted information
   */
  private async searchKnowledgeBase(
    extractedText: string,
    originalMessage: string,
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [],
    userContext?: { username?: string; department?: string; conversationId?: string }
  ): Promise<{ content: string; citations: any[] }> {
    const proxyUrl = 'http://localhost:9090/api/azure-openai/chat/completions';
    
    // Combine extracted text with user's question
    const searchQuery = `Based on this information from an image:
${extractedText}

User's question: ${originalMessage || 'What is the issue and how do I fix it?'}`;

    const searchBody = {
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      deployment: this.deploymentName,
      apiVersion: "2024-04-01-preview",
      username: userContext?.username,
      department: userContext?.department,
      conversationId: userContext?.conversationId,
      data_sources: [
        {
          type: "azure_search",
          parameters: {
            endpoint: this.searchEndpoint,
            index_name: this.searchIndexName,
            query_type: "simple",
            fields_mapping: {},
            in_scope: true,
            role_information: "You are an AI assistant that helps people find information from regulatory documents only. You must NEVER use external knowledge or general information.",
            top_n_documents: 5,
            authentication: {
              type: "api_key",
              key: this.searchApiKey
            }
          }
        }
      ],
      messages: [
        {
          role: 'system',
          content: `You are SME-Assist, an IT Support AI for Alliance Bank's SME onboarding system.

## CRITICAL RULES
1. ONLY use information from the knowledge base documents provided
2. NO external knowledge, NO guessing, NO assumptions
3. If not in knowledge base: state "Solution not found in documentation" and escalate
4. Be DIRECT and CONCISE - no filler words
5. ALWAYS cite sources [doc1], [doc2]

## RESPONSE FORMAT (Image Query)
1. State the issue seen in image (1 sentence)
2. Provide solution steps (numbered list, max 5 steps)
3. Include citations
4. If no solution: "Contact IT Support with: [extracted details]"

## STYLE
- Direct and precise
- No apologies or conversational filler
- Action-oriented language only
- Professional but brief`
        },
        ...conversationHistory,
        {
          role: 'user',
          content: searchQuery
        }
      ],
      temperature: 0.1,
      top_p: 0.95,
      max_tokens: 1000,
      stream: false
    };

    const response = await axios.post(proxyUrl, searchBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    return {
      content: response.data.choices[0].message.content,
      citations: response.data.choices[0].message.context?.citations || []
    };
  }

  async getChatCompletion(
    userMessage: string,
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [],
    imageUrl?: string,
    userContext?: { username?: string; department?: string; conversationId?: string }
  ): Promise<{ content: string; citations: any[] }> {
    console.log('Azure AI Service configuration:', {
      apiKeyExists: Boolean(this.apiKey),
      endpoint: this.endpoint,
      deploymentName: this.deploymentName,
      searchEndpoint: this.searchEndpoint,
      searchIndexExists: Boolean(this.searchApiKey),
      searchIndexName: this.searchIndexName,
      isConfigured: this.isConfigured()
    });
    
    if (!this.isConfigured()) {
      console.log('Azure AI Service not configured, using mock response');
      return {
        content: this.getMockResponse(userMessage),
        citations: []
      };
    }

    try {
      // Two-step process for images: Extract text, then search knowledge base
      if (imageUrl) {
        console.log('🔍 Step 1: Extracting text from image...');
        const extractedText = await this.extractTextFromImage(imageUrl, userMessage);
        console.log('✅ Extracted text:', extractedText.substring(0, 200) + '...');
        
        console.log('🔍 Step 2: Searching knowledge base with extracted information...');
        const result = await this.searchKnowledgeBase(
          extractedText,
          userMessage,
          conversationHistory,
          userContext
        );
        console.log('✅ Knowledge base search complete with', result.citations.length, 'citations');
        
        return result;
      }

      // Standard text-only query with knowledge base
      const proxyUrl = 'http://localhost:9090/api/azure-openai/chat/completions';
      console.log('Making API call to Express proxy:', { proxyUrl });
      
      const requestBody = {
        endpoint: this.endpoint,
        apiKey: this.apiKey,
        deployment: this.deploymentName,
        apiVersion: "2024-04-01-preview",
        // Pass user context for token tracking
        username: userContext?.username,
        department: userContext?.department,
        conversationId: userContext?.conversationId,
        // Always include data_sources for text queries (images handled separately)
        data_sources: [
          {
            type: "azure_search",
            parameters: {
              endpoint: this.searchEndpoint,
              index_name: this.searchIndexName,
              query_type: "simple",
              fields_mapping: {},
              in_scope: true,
              role_information: "You are an AI assistant that helps people find information from regulatory documents only. You must NEVER use external knowledge or general information.",
              top_n_documents: 5,
              authentication: {
                type: "api_key",
                key: this.searchApiKey
              }
            }
          }
        ],
        messages: [
          {
            role: 'system',
            content: `You are SME-Assist, an IT Support AI for Alliance Bank's SME onboarding system.

## CRITICAL RULES
1. ONLY use information from the knowledge base documents provided
2. NO external knowledge, NO guessing, NO assumptions
3. If not in knowledge base: state "Solution not found in documentation" and escalate
4. Be DIRECT and CONCISE - no filler words, no apologies
5. ALWAYS cite sources [doc1], [doc2]

## RESPONSE FORMAT
1. Identify the issue (1 sentence max)
2. Provide solution steps (numbered list, max 5 steps)
3. Include citations
4. If no solution: "Contact IT Support Team"

## STYLE
- Direct and precise
- No conversational filler (avoid "I can help", "Let's", "Let me know")
- Action-oriented language only
- Professional but brief
- Get straight to the solution`
          },
          ...conversationHistory,
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.1,
        top_p: 0.95,
        max_tokens: 1000,
        stream: false
      };

      const response = await axios.post(proxyUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Return both content and citations
      return {
        content: response.data.choices[0].message.content,
        citations: response.data.choices[0].message.context?.citations || []
      };
    } catch (error: any) {
      console.error('Error calling Express proxy:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return {
        content: this.getMockResponse(userMessage),
        citations: []
      };
    }
  }

  // Fallback method for mock responses when API is not configured
  private getMockResponse(message: string): string {
    return "Sorry, you are currently in Offline Mode. Please try again later.";
  }
}

export default new AzureAIService();
