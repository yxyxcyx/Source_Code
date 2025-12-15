const express = require('express');
const router = express.Router();
const AzureOpenAIController = require('../controllers/azureOpenAIController');

// Health check endpoint
router.get('/health', AzureOpenAIController.healthCheck);

// Chat completions proxy endpoint
router.post('/chat/completions', AzureOpenAIController.chatCompletions);

module.exports = router;
