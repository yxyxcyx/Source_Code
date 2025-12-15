// src/services/search-service.ts
import axios from 'axios';
import embeddingsService from "./embeddings-service";

interface SearchResult {
  id: string;
  content: string;
  sourcefile: string;
  score: number;
}

class SearchService {
  private apiKey: string;
  private endpoint: string;
  private indexName: string;
  private isConfigured: boolean = false;
  private directApiUrl: string;

  constructor() {
    console.log('SearchService constructor called');
    this.apiKey = process.env.REACT_APP_SEARCH_ADMIN_KEY || '';
    this.endpoint = process.env.REACT_APP_SEARCH_ENDPOINT || '';
    this.indexName = process.env.REACT_APP_SEARCH_INDEX || 'pdf-index';
    
    // Set direct API URL
    this.directApiUrl = "https://alliancesearchcolin1.search.windows.net/indexes/pdf-index/docs/search?api-version=2025-04-01-preview";
    console.log(`DirectApiUrl set to: ${this.directApiUrl}`);
    
    this.isConfigured = !!(this.apiKey && this.endpoint);
    console.log(`SearchService isConfigured: ${this.isConfigured}`);
    console.log(`ApiKey exists: ${!!this.apiKey}`);
    
    if (this.isConfigured) {
      console.log(`Search service initialized with index: ${this.indexName}`);
    } else {
      console.warn('SearchService is not fully configured. Check environment variables.');
    }
  }

  /**
   * Search for relevant documents based on a query using text search
   * @param query The search query
   * @param topK Maximum number of results to return
   * @returns Promise with search results
   */
  async searchDocuments(query: string, topK: number = 3): Promise<SearchResult[]> {
    console.log('searchDocuments called');
    try {
      console.log(`Performing document search for: "${query}"`);
      
      // Use direct API call
      const headers = {
        'Content-Type': 'application/json',
        'api-key': this.apiKey
      };
      
      const data = {
        search: query,
        top: topK,
        select: "id,content,sourcefile"
      };
      
      console.log(`Making direct API call to ${this.directApiUrl}`);
      const response = await axios.post(this.directApiUrl, data, { headers });
      console.log('API call response received');
      
      if (response.data && response.data.value && response.data.value.length > 0) {
        const results: SearchResult[] = response.data.value.map((doc: any) => ({
          id: doc.id,
          content: doc.content,
          sourcefile: doc.sourcefile,
          score: doc["@search.score"] || 0
        }));
        
        console.log(`Found ${results.length} search results for query: "${query}"`);
        return results;
      } else {
        console.log(`No results found for query: "${query}"`);
        return [];
      }
    } catch (error: any) {
      console.error('Error performing document search:', error);
      console.log('Error details:', error.message);
      return [];
    }
  }

  /**
   * Perform semantic search using vector embeddings
   * @param query User query to search for
   * @param topK Maximum number of results to return
   * @returns Promise with search results
   */
  async semanticSearch(query: string, topK: number = 3): Promise<SearchResult[]> {
    console.log('semanticSearch called');
    try {
      console.log(`Performing semantic search for: "${query}"`);
      
      // Generate embeddings for the query
      console.log('Generating embeddings for query...');
      const queryEmbeddings = await embeddingsService.generateEmbeddings(query);
      console.log('Embeddings generated');
      
      if (!queryEmbeddings || queryEmbeddings.length === 0) {
        console.error('Failed to generate embeddings for query');
        console.log('Falling back to text-based search');
        return this.searchDocuments(query, topK);
      }
      
      console.log(`Generated embeddings with length: ${queryEmbeddings.length}`);
      
      // Use direct API call for vector search
      const headers = {
        'Content-Type': 'application/json',
        'api-key': this.apiKey
      };
      
      // Create vector search options
      const searchOptions = {
        top: topK,
        select: "id,content,sourcefile",
        vectorQueries: [
          {
            vector: queryEmbeddings,
            fields: "contentVector",
            k: topK,
          }
        ]
      };
      
      console.log('Vector search options:', JSON.stringify(searchOptions));
      
      try {
        const response = await axios.post(this.directApiUrl, searchOptions, { headers });
        console.log('API call response received');
        
        // Process results
        if (response.data && response.data.value && response.data.value.length > 0) {
          const results: SearchResult[] = response.data.value.map((doc: any) => ({
            id: doc.id,
            content: doc.content,
            sourcefile: doc.sourcefile,
            score: doc["@search.score"] || 0
          }));
          
          console.log(`Found ${results.length} vector search results for query: "${query}"`);
          return results;
        } else {
          console.log(`No vector search results found for query: "${query}", falling back to text search`);
          return this.searchDocuments(query, topK);
        }
      } catch (vectorError: any) {
        console.error('Error during vector search:', vectorError);
        console.log('Error details:', vectorError.message);
        console.log('Falling back to text-based search');
        return this.searchDocuments(query, topK);
      }
    } catch (error: any) {
      console.error('Error performing semantic search:', error);
      console.log('Error details:', error.message);
      console.log('Falling back to text-based search');
      return this.searchDocuments(query, topK);
    }
  }
}

// Export as default singleton
export default new SearchService();