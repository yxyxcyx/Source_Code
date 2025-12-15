const axios = require('axios');
const logger = require('../utils/logger');
const TokenUsage = require('../models/TokenUsage');

class AzureOpenAIController {
  /**
   * Proxy chat completions requests to Azure OpenAI
   */
  static async chatCompletions(req, res) {
    try {
      const { endpoint, apiKey, deployment, apiVersion, username, department, conversationId, ...requestBody } = req.body;
      
      // Validate required parameters
      if (!endpoint || !apiKey || !deployment) {
        return res.status(400).json({
          error: {
            message: 'Missing required parameters: endpoint, apiKey, and deployment are required'
          }
        });
      }

      // Construct the Azure OpenAI URL
      const azureUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion || '2024-04-01-preview'}`;
      
      // Prepare headers for Azure OpenAI request
      const headers = {
        'Content-Type': 'application/json',
        'api-key': apiKey
      };

      logger.info(`Proxying request to Azure OpenAI: ${deployment}`);

      // Make request to Azure OpenAI
      const response = await axios.post(azureUrl, requestBody, {
        headers,
        timeout: 60000 // 60 second timeout
      });

      // Extract usage data from response
      const responseData = response.data;
      
      // Log token usage if available
      if (responseData.usage) {
        try {
          // Check if request contains an image
          const hasImage = requestBody.messages?.some(msg => 
            Array.isArray(msg.content) && 
            msg.content.some(item => item.type === 'image_url')
          );

          // Save token usage to database (async, don't wait)
          TokenUsage.create({
            model: responseData.model || deployment,
            deployment: deployment,
            promptTokens: responseData.usage.prompt_tokens || 0,
            completionTokens: responseData.usage.completion_tokens || 0,
            totalTokens: responseData.usage.total_tokens || 0,
            username: username,
            department: department,
            conversationId: conversationId,
            hasImage: hasImage
          }).catch(err => {
            logger.error('Failed to save token usage:', err.message);
          });

          logger.info(`Token usage - Prompt: ${responseData.usage.prompt_tokens}, Completion: ${responseData.usage.completion_tokens}, Total: ${responseData.usage.total_tokens}`);
        } catch (usageError) {
          logger.error('Error processing token usage:', usageError.message);
        }
      }

      // Return the response from Azure OpenAI (including usage data)
      res.json(responseData);

    } catch (error) {
      logger.error('Azure OpenAI proxy error:', error.message);
      
      if (error.response) {
        // Azure OpenAI returned an error response
        res.status(error.response.status).json(error.response.data);
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        res.status(408).json({
          error: {
            message: 'Request timeout - Azure OpenAI service did not respond in time'
          }
        });
      } else {
        // Other network or parsing errors
        res.status(500).json({
          error: {
            message: 'Failed to connect to Azure OpenAI service',
            details: error.message
          }
        });
      }
    }
  }

  /**
   * Health check endpoint for Azure OpenAI proxy
   */
  static async healthCheck(req, res) {
    res.json({
      status: 'healthy',
      service: 'Azure OpenAI Proxy',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = AzureOpenAIController;
