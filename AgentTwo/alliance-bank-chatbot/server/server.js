require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Proxy endpoint for Azure Search API
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const searchApiKey = process.env.SEARCH_ADMIN_KEY;
    const searchEndpoint = process.env.SEARCH_ENDPOINT;
    const searchIndex = process.env.SEARCH_INDEX || 'alliance-bank-docs';
    
    if (!searchApiKey || !searchEndpoint) {
      return res.status(500).json({ error: 'Search service not configured properly' });
    }
    
    console.log(`Searching for: "${query}" in index ${searchIndex}`);
    
    const response = await axios.post(
      `${searchEndpoint}/indexes/${searchIndex}/docs/search?api-version=2025-05-01-preview`,
      {
        search: query,
        top: 3,
        select: "id,content,sourcefile"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': searchApiKey
        }
      }
    );
    
    // Extract the search results from the response
    const searchResults = response.data.value.map(doc => ({
      id: doc.id,
      content: doc.content,
      sourcefile: doc.sourcefile,
      score: doc["@search.score"] || 0
    }));
    
    console.log(`Found ${searchResults.length} results`);
    res.json(searchResults);
    
  } catch (error) {
    console.error('Error calling Azure Search API:', error.message);
    res.status(500).json({ 
      error: 'Error searching documents',
      details: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Search endpoint: http://localhost:${PORT}/api/search`);
});
