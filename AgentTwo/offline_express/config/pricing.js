// Azure OpenAI Pricing Configuration
// Prices are in USD per 1,000 tokens
// Source: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
// Last Updated: November 2024
// Note: Prices shown are for pay-as-you-go. Provisioned throughput has different pricing.

const PRICING = {
  // GPT-4o models (Latest, October 2024)
  'gpt-4o': {
    prompt: 0.0025,    // $2.50 per 1M tokens = $0.0025 per 1K tokens
    completion: 0.01   // $10.00 per 1M tokens = $0.01 per 1K tokens
  },
  'gpt-4o-mini': {
    prompt: 0.00015,   // $0.15 per 1M tokens = $0.00015 per 1K tokens
    completion: 0.0006 // $0.60 per 1M tokens = $0.0006 per 1K tokens
  },
  'gpt-4o-2024-08-06': {
    prompt: 0.0025,
    completion: 0.01
  },
  
  // GPT-4 Turbo models
  'gpt-4': {
    prompt: 0.03,      // $0.03 per 1K prompt tokens
    completion: 0.06   // $0.06 per 1K completion tokens
  },
  'gpt-4-32k': {
    prompt: 0.06,
    completion: 0.12
  },
  'gpt-4-turbo': {
    prompt: 0.01,
    completion: 0.03
  },
  'gpt-4-turbo-2024-04-09': {
    prompt: 0.01,
    completion: 0.03
  },
  
  // GPT-4 Vision models
  'gpt-4-vision': {
    prompt: 0.01,
    completion: 0.03
  },
  'gpt-4-vision-preview': {
    prompt: 0.01,
    completion: 0.03
  },
  
  // GPT-3.5 Turbo models
  'gpt-35-turbo': {
    prompt: 0.0005,    // $0.0005 per 1K prompt tokens
    completion: 0.0015 // $0.0015 per 1K completion tokens
  },
  'gpt-35-turbo-16k': {
    prompt: 0.003,
    completion: 0.004
  },
  
  // Default fallback pricing (using GPT-4o-mini as baseline - most cost-effective)
  'default': {
    prompt: 0.00015,
    completion: 0.0006
  }
};

/**
 * Get pricing for a specific model
 * @param {string} modelName - The model name from Azure OpenAI
 * @returns {object} Pricing object with prompt and completion costs
 */
function getModelPricing(modelName) {
  if (!modelName) {
    return PRICING.default;
  }
  
  // Convert to lowercase for comparison
  const lowerModelName = modelName.toLowerCase();
  
  // Try exact match first
  if (PRICING[modelName]) {
    return PRICING[modelName];
  }
  
  if (PRICING[lowerModelName]) {
    return PRICING[lowerModelName];
  }
  
  // Special handling for versioned models
  // CRITICAL: Check for most specific matches first to avoid incorrect matching
  // e.g., "gpt-4o-mini-2024-07-18" should match "gpt-4o-mini", NOT "gpt-4o"
  
  if (lowerModelName.includes('gpt-4o-mini')) {
    return PRICING['gpt-4o-mini'];
  }
  
  if (lowerModelName.includes('gpt-4o')) {
    return PRICING['gpt-4o'];
  }
  
  if (lowerModelName.includes('gpt-4-turbo')) {
    return PRICING['gpt-4-turbo'];
  }
  
  if (lowerModelName.includes('gpt-4-vision')) {
    return PRICING['gpt-4-vision'];
  }
  
  if (lowerModelName.includes('gpt-4-32k')) {
    return PRICING['gpt-4-32k'];
  }
  
  if (lowerModelName.includes('gpt-4')) {
    return PRICING['gpt-4'];
  }
  
  if (lowerModelName.includes('gpt-35-turbo-16k') || lowerModelName.includes('gpt-3.5-turbo-16k')) {
    return PRICING['gpt-35-turbo-16k'];
  }
  
  if (lowerModelName.includes('gpt-35-turbo') || lowerModelName.includes('gpt-3.5-turbo')) {
    return PRICING['gpt-35-turbo'];
  }
  
  // Return default pricing
  return PRICING.default;
}

/**
 * Calculate cost for token usage
 * @param {number} promptTokens - Number of prompt tokens
 * @param {number} completionTokens - Number of completion tokens
 * @param {string} modelName - The model name
 * @returns {object} Cost breakdown
 */
function calculateCost(promptTokens, completionTokens, modelName) {
  const pricing = getModelPricing(modelName);
  
  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;
  const totalCost = promptCost + completionCost;
  
  return {
    promptCost: parseFloat(promptCost.toFixed(6)),
    completionCost: parseFloat(completionCost.toFixed(6)),
    totalCost: parseFloat(totalCost.toFixed(6))
  };
}

module.exports = {
  PRICING,
  getModelPricing,
  calculateCost
};
