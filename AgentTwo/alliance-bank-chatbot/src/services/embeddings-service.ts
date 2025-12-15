// src/services/embeddings-service.ts
import { AzureKeyCredential } from "@azure/core-auth";
const { OpenAI } = require("@azure/openai");

class EmbeddingsService {
  private client: any;
  private endpoint: string;
  private apiKey: string;
  private deploymentName: string;
  private isConfigured: boolean;

  constructor() {
    this.endpoint = process.env.REACT_APP_AZURE_ENDPOINT || '';
    this.apiKey = process.env.REACT_APP_AZURE_API_KEY || '';
    this.deploymentName = process.env.REACT_APP_AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002';
    
    this.isConfigured = !!(this.endpoint && this.apiKey && this.deploymentName);
    
    if (this.isConfigured) {
      try {
        this.client = new OpenAI(
          this.endpoint, 
          new AzureKeyCredential(this.apiKey)
        );
        console.log('Embeddings service initialized successfully with Azure OpenAI');
      } catch (error) {
        console.error('Error initializing Azure OpenAI embeddings client:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('EmbeddingsService is not fully configured. Check environment variables.');
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      if (!this.isConfigured || !this.client) {
        console.error('EmbeddingsService not properly configured');
        return [];
      }
      
      console.log(`Generating embeddings for text: "${text.substring(0, 50)}..."`);
      
      const result = await this.client.getEmbeddings(
        this.deploymentName, 
        [text]
      );
      
      if (result && result.data && result.data.length > 0) {
        console.log(`Successfully generated embedding vector with length: ${result.data[0].embedding.length}`);
        return result.data[0].embedding;
      } else {
        console.error('Failed to generate embeddings: Empty response');
        return [];
      }
    } catch (error: any) {
      console.error('Error generating embeddings:', error);
      return [];
    }
  }
}

export default new EmbeddingsService();