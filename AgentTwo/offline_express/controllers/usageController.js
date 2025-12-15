const TokenUsage = require('../models/TokenUsage');
const logger = require('../utils/logger');
const { getExchangeRateInfo } = require('../services/currencyService');

class UsageController {
  /**
   * Get current USD to MYR exchange rate
   */
  static async getExchangeRate(req, res) {
    try {
      const rateInfo = await getExchangeRateInfo();
      
      res.json({
        success: true,
        exchangeRate: {
          from: 'USD',
          to: 'MYR',
          rate: rateInfo.rate,
          isCached: rateInfo.isCached,
          cacheAgeMinutes: rateInfo.cacheAgeMinutes,
          lastUpdated: rateInfo.lastUpdated
        }
      });
    } catch (error) {
      logger.error('Error getting exchange rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve exchange rate',
        message: error.message
      });
    }
  }

  /**
   * Get usage summary for a date range
   */
  static async getSummary(req, res) {
    try {
      const { from, to } = req.query;
      
      // Default to last 30 days if not specified
      const toDate = to || new Date().toISOString();
      const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const summary = await TokenUsage.getSummary(fromDate, toDate);
      
      res.json({
        success: true,
        dateRange: { from: fromDate, to: toDate },
        summary: {
          totalRequests: summary.total_requests || 0,
          totalTokens: summary.total_tokens || 0,
          promptTokens: summary.total_prompt_tokens || 0,
          completionTokens: summary.total_completion_tokens || 0,
          totalCost: parseFloat((summary.total_cost || 0).toFixed(4)),
          promptCost: parseFloat((summary.total_prompt_cost || 0).toFixed(4)),
          completionCost: parseFloat((summary.total_completion_cost || 0).toFixed(4)),
          avgTokensPerRequest: parseFloat((summary.avg_tokens_per_request || 0).toFixed(2)),
          avgCostPerRequest: parseFloat((summary.avg_cost_per_request || 0).toFixed(6)),
          requestsWithImages: summary.requests_with_images || 0
        }
      });
    } catch (error) {
      logger.error('Error getting usage summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage summary',
        message: error.message
      });
    }
  }

  /**
   * Get usage breakdown by model
   */
  static async getByModel(req, res) {
    try {
      const { from, to } = req.query;
      
      const toDate = to || new Date().toISOString();
      const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const breakdown = await TokenUsage.getByModel(fromDate, toDate);
      
      res.json({
        success: true,
        dateRange: { from: fromDate, to: toDate },
        breakdown: breakdown.map(item => ({
          model: item.model,
          requests: item.requests,
          totalTokens: item.total_tokens,
          totalCost: parseFloat((item.total_cost || 0).toFixed(4)),
          avgCost: parseFloat((item.avg_cost || 0).toFixed(6))
        }))
      });
    } catch (error) {
      logger.error('Error getting usage by model:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage by model',
        message: error.message
      });
    }
  }

  /**
   * Get usage breakdown by user
   */
  static async getByUser(req, res) {
    try {
      const { from, to } = req.query;
      
      const toDate = to || new Date().toISOString();
      const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const breakdown = await TokenUsage.getByUser(fromDate, toDate);
      
      res.json({
        success: true,
        dateRange: { from: fromDate, to: toDate },
        breakdown: breakdown.map(item => ({
          username: item.username,
          department: item.department,
          requests: item.requests,
          totalTokens: item.total_tokens,
          totalCost: parseFloat((item.total_cost || 0).toFixed(4)),
          avgCost: parseFloat((item.avg_cost || 0).toFixed(6))
        }))
      });
    } catch (error) {
      logger.error('Error getting usage by user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage by user',
        message: error.message
      });
    }
  }

  /**
   * Get usage breakdown by department
   */
  static async getByDepartment(req, res) {
    try {
      const { from, to } = req.query;
      
      const toDate = to || new Date().toISOString();
      const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const breakdown = await TokenUsage.getByDepartment(fromDate, toDate);
      
      res.json({
        success: true,
        dateRange: { from: fromDate, to: toDate },
        breakdown: breakdown.map(item => ({
          department: item.department,
          requests: item.requests,
          totalTokens: item.total_tokens,
          totalCost: parseFloat((item.total_cost || 0).toFixed(4)),
          avgCost: parseFloat((item.avg_cost || 0).toFixed(6))
        }))
      });
    } catch (error) {
      logger.error('Error getting usage by department:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage by department',
        message: error.message
      });
    }
  }

  /**
   * Get daily usage statistics
   */
  static async getDailyStats(req, res) {
    try {
      const { from, to } = req.query;
      
      const toDate = to || new Date().toISOString();
      const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const stats = await TokenUsage.getDailyStats(fromDate, toDate);
      
      res.json({
        success: true,
        dateRange: { from: fromDate, to: toDate },
        stats: stats.map(item => ({
          date: item.date,
          requests: item.requests,
          totalTokens: item.total_tokens,
          totalCost: parseFloat((item.total_cost || 0).toFixed(4)),
          avgCost: parseFloat((item.avg_cost || 0).toFixed(6))
        }))
      });
    } catch (error) {
      logger.error('Error getting daily stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve daily statistics',
        message: error.message
      });
    }
  }

  /**
   * Get all usage records with pagination
   */
  static async getAll(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      
      const records = await TokenUsage.getAll(limit, offset);
      
      res.json({
        success: true,
        pagination: { limit, offset },
        records: records.map(record => ({
          ...record,
          promptCost: parseFloat((record.prompt_cost || 0).toFixed(6)),
          completionCost: parseFloat((record.completion_cost || 0).toFixed(6)),
          totalCost: parseFloat((record.total_cost || 0).toFixed(6)),
          hasImage: record.has_image === 1
        }))
      });
    } catch (error) {
      logger.error('Error getting all usage records:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage records',
        message: error.message
      });
    }
  }
}

module.exports = UsageController;
