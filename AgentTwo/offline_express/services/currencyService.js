// Currency conversion service with real-time exchange rates
const axios = require('axios');
const logger = require('../utils/logger');

// Cache exchange rate for 1 hour to avoid excessive API calls
let cachedRate = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get USD to MYR exchange rate
 * Uses exchangerate-api.com (free tier: 1,500 requests/month)
 * Falls back to cached rate or default rate if API fails
 * @returns {Promise<number>} Exchange rate (USD to MYR)
 */
async function getUSDtoMYRRate() {
  try {
    // Check cache first
    if (cachedRate && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      logger.info(`Using cached exchange rate: 1 USD = ${cachedRate} MYR (cached ${Math.round((Date.now() - cacheTimestamp) / 60000)} minutes ago)`);
      return cachedRate;
    }

    // Fetch fresh rate from API
    logger.info('Fetching fresh USD to MYR exchange rate...');
    
    // Using exchangerate-api.com (free, no API key required for basic usage)
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
      timeout: 5000
    });

    if (response.data && response.data.rates && response.data.rates.MYR) {
      const rate = response.data.rates.MYR;
      
      // Update cache
      cachedRate = rate;
      cacheTimestamp = Date.now();
      
      logger.info(`✅ Fresh exchange rate fetched: 1 USD = ${rate} MYR`);
      return rate;
    } else {
      throw new Error('Invalid response format from exchange rate API');
    }
  } catch (error) {
    logger.error('Error fetching exchange rate:', error.message);
    
    // If we have a cached rate (even if expired), use it
    if (cachedRate) {
      logger.warn(`⚠️  Using expired cached rate: 1 USD = ${cachedRate} MYR`);
      return cachedRate;
    }
    
    // Fallback to approximate rate (as of Nov 2024: ~4.50 MYR per USD)
    const fallbackRate = 4.50;
    logger.warn(`⚠️  Using fallback rate: 1 USD = ${fallbackRate} MYR`);
    
    // Cache the fallback rate
    cachedRate = fallbackRate;
    cacheTimestamp = Date.now();
    
    return fallbackRate;
  }
}

/**
 * Convert USD amount to MYR
 * @param {number} usdAmount - Amount in USD
 * @returns {Promise<object>} Conversion result with rate and MYR amount
 */
async function convertUSDtoMYR(usdAmount) {
  const rate = await getUSDtoMYRRate();
  const myrAmount = usdAmount * rate;
  
  return {
    usd: parseFloat(usdAmount.toFixed(6)),
    myr: parseFloat(myrAmount.toFixed(4)),
    rate: rate,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get current exchange rate info
 * @returns {Promise<object>} Rate information
 */
async function getExchangeRateInfo() {
  const rate = await getUSDtoMYRRate();
  const isCached = cachedRate && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION);
  const cacheAge = cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / 60000) : null;
  
  return {
    rate: rate,
    isCached: isCached,
    cacheAgeMinutes: cacheAge,
    lastUpdated: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null
  };
}

/**
 * Clear exchange rate cache (useful for testing or forcing refresh)
 */
function clearCache() {
  cachedRate = null;
  cacheTimestamp = null;
  logger.info('Exchange rate cache cleared');
}

module.exports = {
  getUSDtoMYRRate,
  convertUSDtoMYR,
  getExchangeRateInfo,
  clearCache
};
