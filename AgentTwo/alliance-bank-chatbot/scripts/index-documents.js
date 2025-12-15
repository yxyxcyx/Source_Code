// scripts/index-documents.js
const { BlobServiceClient } = require('@azure/storage-blob');
const { DocumentAnalysisClient } = require('@azure/ai-form-recognizer');
const { AzureKeyCredential, SearchIndexClient, SearchClient } = require('@azure/search-documents');
const fs = require('fs');
const path = require('path');

// Fix path to .env file
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
require('dotenv').config({ path: envPath });

// Azure Document Intelligence configuration
const documentIntelligenceEndpoint = process.env.REACT_APP_DOCUMENT_INTELLIGENCE_ENDPOINT;
const documentIntelligenceKey = process.env.REACT_APP_DOCUMENT_INTELLIGENCE_KEY;

// Azure AI Search configuration
let searchEndpoint = process.env.REACT_APP_SEARCH_ENDPOINT;
const searchAdminKey = process.env.REACT_APP_SEARCH_ADMIN_KEY;

// Debug environment variables (redacting sensitive information)
console.log('Environment variables loaded:');
console.log(`Document Intelligence Endpoint: ${documentIntelligenceEndpoint ? 'Set ' : 'Missing '}`);
console.log(`Document Intelligence Key: ${documentIntelligenceKey ? 'Set ' : 'Missing '}`);
console.log(`Search Endpoint: ${searchEndpoint ? 'Set ' : 'Missing '}`);
console.log(`Search Admin Key: ${searchAdminKey ? 'Set ' : 'Missing '}`);

// Check for https:// prefix in search endpoint
if (searchEndpoint && !searchEndpoint.startsWith('https://')) {
  console.log('Adding https:// prefix to searchEndpoint');
  searchEndpoint = 'https://' + searchEndpoint;
}

const searchIndexName = 'alliance-bank-docs';

// Initialize clients with try/catch to handle any initialization errors
let documentClient = null;
try {
  if (documentIntelligenceEndpoint && documentIntelligenceKey) {
    documentClient = new DocumentAnalysisClient(
      documentIntelligenceEndpoint, 
      new AzureKeyCredential(documentIntelligenceKey)
    );
  }
} catch (error) {
  console.error('Error initializing Document Intelligence client:', error.message);
}

let searchIndexClient = null;
let searchClient = null;
try {
  if (searchEndpoint && searchAdminKey) {
    searchIndexClient = new SearchIndexClient(
      searchEndpoint, 
      new AzureKeyCredential(searchAdminKey)
    );
    searchClient = new SearchClient(
      searchEndpoint, 
      searchIndexName, 
      new AzureKeyCredential(searchAdminKey)
    );
  }
} catch (error) {
  console.error('Error initializing Search clients:', error.message);
}

// Check if clients were created successfully
if (!documentClient) console.error('Failed to create Document Intelligence client - check Document Intelligence credentials');
if (!searchIndexClient) console.error('Failed to create Search Index client - check Search credentials');
if (!searchClient) console.error('Failed to create Search client - check Search credentials');

// Create search index if it doesn't exist
async function createSearchIndex() {
  try {
    const indexDefinition = {
      name: searchIndexName,
      fields: [
        {
          name: "id",
          type: "Edm.String",
          key: true,
          filterable: true
        },
        {
          name: "content",
          type: "Edm.String",
          searchable: true
        },
        {
          name: "sourcefile",
          type: "Edm.String",
          filterable: true,
          searchable: true
        }
      ]
    };

    console.log('Creating search index...');
    await searchIndexClient.createIndex(indexDefinition);
    console.log('Search index created successfully.');
  } catch (error) {
    if (error.statusCode === 409) {
      console.log('Index already exists.');
    } else {
      console.error('Error creating index:', error);
      throw error;
    }
  }
}

// Extract text from PDF using Azure Document Intelligence
async function extractTextFromPdf(filePath) {
  try {
    console.log(`Extracting text from: ${filePath}`);
    const fileBuffer = fs.readFileSync(filePath);
    
    const poller = await documentClient.beginAnalyzeDocument(
      "prebuilt-layout",
      fileBuffer
    );
    
    const result = await poller.pollUntilDone();
    
    let extractedText = '';
    if (result && result.content) {
      extractedText = result.content;
      console.log(`Extracted ${extractedText.length} characters of text`);
      // Log a small preview of the content
      console.log("Content preview:", extractedText.substring(0, 200) + "...");
    } else {
      console.log("No content extracted from document.");
      // Try to get content from pages if available
      if (result && result.pages && result.pages.length > 0) {
        console.log(`Document has ${result.pages.length} pages`);
        // Try to extract text from each page
        for (const page of result.pages) {
          if (page.lines) {
            for (const line of page.lines) {
              extractedText += line.content + "\n";
            }
          }
        }
        console.log(`Extracted ${extractedText.length} characters from page lines`);
      }
    }
    
    return extractedText;
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    return '';
  }
}

// Split text into chunks for indexing
function splitTextIntoChunks(text, maxChunkSize = 8000) {
  // If text is very short, just return it as a single chunk
  if (text.length <= maxChunkSize) {
    console.log(`Text is ${text.length} characters, returning as single chunk`);
    return [text];
  }

  console.log(`Splitting ${text.length} characters into chunks of max size ${maxChunkSize}`);
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/); // Split by paragraph
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // If a single paragraph exceeds maxChunkSize, split it into sentences
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if ((sentenceChunk + sentence).length <= maxChunkSize) {
            sentenceChunk += sentenceChunk ? ' ' + sentence : sentence;
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
            }
            sentenceChunk = sentence;
          }
        }
        
        if (sentenceChunk) {
          currentChunk = sentenceChunk;
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  console.log(`Created ${chunks.length} chunks from the text`);
  return chunks;
}

// Index document chunks (without embeddings)
async function indexDocumentChunks(chunks, sourceFile) {
  try {
    console.log(`Indexing ${chunks.length} chunks from: ${sourceFile}`);
    
    const batch = [];
    let counter = 1;
    
    for (const chunk of chunks) {
      // Generate a sanitized unique ID for this chunk
      // Replace spaces and special chars with underscore, keep only alphanumeric, underscore, dash, and equals
      const baseFileName = path.basename(sourceFile, path.extname(sourceFile))
                              .replace(/[^\w\-=]/g, '_');
      const id = `${baseFileName}_${counter}`;
      counter++;
      
      // Add to batch
      batch.push({
        id: id,
        content: chunk,
        sourcefile: path.basename(sourceFile)
      });
    }
    
    // Upload batch to search index
    console.log(`Uploading ${batch.length} documents to search index...`);
    const indexResult = await searchClient.uploadDocuments(batch);
    console.log(`Indexed ${indexResult.results.length} documents successfully.`);
    
    return batch.length;
  } catch (error) {
    console.error('Error indexing document chunks:', error);
    return 0;
  }
}

// Process all PDF files in a directory
async function processDirectory(directoryPath) {
  try {
    console.log(`Processing files in: ${directoryPath}`);
    
    // Create the search index if it doesn't exist
    await createSearchIndex();
    
    const files = fs.readdirSync(directoryPath);
    const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
    
    console.log(`Found ${pdfFiles.length} PDF files`);
    
    let totalChunksIndexed = 0;
    
    for (const pdfFile of pdfFiles) {
      const filePath = path.join(directoryPath, pdfFile);
      
      // Extract text from PDF
      const extractedText = await extractTextFromPdf(filePath);
      
      if (extractedText) {
        // Split text into chunks
        const chunks = splitTextIntoChunks(extractedText);
        
        // Index chunks
        const chunksIndexed = await indexDocumentChunks(chunks, pdfFile);
        totalChunksIndexed += chunksIndexed;
      } else {
        console.log(`No text extracted from ${pdfFile}`);
      }
    }
    
    console.log(`Successfully indexed ${totalChunksIndexed} chunks from ${pdfFiles.length} PDF files.`);
  } catch (error) {
    console.error('Error processing directory:', error);
  }
}

// Main function
async function main() {
  // Check for command line argument for directory path
  const directoryPath = process.argv[2];
  
  if (!directoryPath) {
    console.error('Please provide a directory path containing PDF files.');
    process.exit(1);
  }
  
  if (!fs.existsSync(directoryPath)) {
    console.error(`Directory not found: ${directoryPath}`);
    process.exit(1);
  }
  
  await processDirectory(directoryPath);
}

// Run main function
main().catch(console.error);