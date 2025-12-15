const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const loginRoutes = require('./routes/loginRoutes');
const formRoutes = require('./routes/formRoutes');
const legacyFormRoutes = require('./routes/legacyFormRoutes');
const historyRoutes = require('./routes/historyRoutes');
const azureOpenAIRoutes = require('./routes/azureOpenAIRoutes');
const usageRoutes = require('./routes/usageRoutes');
const limitRoutes = require('./routes/limitRoutes');
const { initDatabase } = require('./config/database');
const logger = require('./utils/logger');
const PurgeService = require('./services/purgeService');
const UserLimit = require('./models/UserLimit');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 9090;

// CORS configuration with more options
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:9090', 'file://*', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'api-key'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increase limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev')); // HTTP request logger

// Serve static files from public directory (for cost dashboard)
app.use('/dashboard', express.static('public'));

// Add explicit OPTIONS handler for preflight requests
app.options('*', cors(corsOptions));

// Add request logging using Winston
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the offline_express API' });
});

// Hello World API endpoint
app.get('/api/hello', (req, res) => {
  res.json({ hello: 'world' });
});

// Add login routes
app.use('/api/login', loginRoutes);

// Add form routes - modern API style
app.use('/api/forms', formRoutes);

// Add legacy form routes - Spring Boot compatible routes
app.use('/form', legacyFormRoutes);

// Add history routes - Spring Boot compatible routes
app.use('/history', historyRoutes);

// Add Azure OpenAI proxy routes
app.use('/api/azure-openai', azureOpenAIRoutes);

// Add usage tracking routes
app.use('/api/usage', usageRoutes);

// Add token limit management routes
app.use('/api/limits', limitRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(200).json({
    success: false,
    message: 'Server error occurred',
    error: err.message || 'Unknown error'
  });
});

// Function to start the server
async function startServer() {
  try {
    // Initialize the database before starting the server
    await initDatabase();
    logger.info('Database initialized successfully');
    
    // Initialize user limits table
    await UserLimit.initializeTable();
    logger.info('User limits table initialized');
    
    // Initialize the data purge service for scheduled maintenance
    // Enable test mode to use 1-day threshold for synced records during testing
    PurgeService.initialize({ 
      runOnStartup: true, 
      testMode: false 
    });
    
    return app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export for use in Electron main process
module.exports = {
  app,
  startServer
};
