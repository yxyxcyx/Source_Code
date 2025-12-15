const UserLimit = require('../models/UserLimit');
const logger = require('../utils/logger');

class LimitController {
  /**
   * Get user's current limits and usage
   */
  static async getUserStatus(req, res) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      const status = await UserLimit.checkLimits(username, 0);
      
      res.json({
        success: true,
        username: username,
        status: status
      });
    } catch (error) {
      logger.error('Error getting user status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user status',
        message: error.message
      });
    }
  }

  /**
   * Set custom limits for a user
   */
  static async setUserLimits(req, res) {
    try {
      const { username } = req.params;
      const { dailyLimit, monthlyLimit } = req.body;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      if (!dailyLimit || !monthlyLimit) {
        return res.status(400).json({
          success: false,
          error: 'Both dailyLimit and monthlyLimit are required'
        });
      }

      if (dailyLimit < 0 || monthlyLimit < 0) {
        return res.status(400).json({
          success: false,
          error: 'Limits must be positive numbers'
        });
      }

      await UserLimit.setUserLimits(username, dailyLimit, monthlyLimit);
      
      logger.info(`Updated limits for user ${username}: daily=${dailyLimit}, monthly=${monthlyLimit}`);
      
      res.json({
        success: true,
        message: `Limits updated for user ${username}`,
        limits: {
          daily: dailyLimit,
          monthly: monthlyLimit
        }
      });
    } catch (error) {
      logger.error('Error setting user limits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set user limits',
        message: error.message
      });
    }
  }

  /**
   * Get all users with custom limits
   */
  static async getAllLimits(req, res) {
    try {
      const users = await UserLimit.getAllUserLimits();
      const defaultLimits = UserLimit.getDefaultLimits();
      
      res.json({
        success: true,
        defaultLimits: defaultLimits,
        customLimits: users.map(user => ({
          username: user.username,
          dailyLimit: user.daily_token_limit,
          monthlyLimit: user.monthly_token_limit,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }))
      });
    } catch (error) {
      logger.error('Error getting all limits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve limits',
        message: error.message
      });
    }
  }

  /**
   * Delete user's custom limits (revert to default)
   */
  static async deleteUserLimits(req, res) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      await UserLimit.deleteUserLimits(username);
      
      logger.info(`Deleted custom limits for user ${username}, reverted to default`);
      
      res.json({
        success: true,
        message: `Custom limits deleted for user ${username}, reverted to default limits`
      });
    } catch (error) {
      logger.error('Error deleting user limits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user limits',
        message: error.message
      });
    }
  }

  /**
   * Check if a request would exceed limits (for pre-validation)
   */
  static async checkRequest(req, res) {
    try {
      const { username, estimatedTokens } = req.body;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      const tokens = estimatedTokens || 1000; // Default estimate
      const status = await UserLimit.checkLimits(username, tokens);
      
      res.json({
        success: true,
        allowed: status.allowed,
        status: status
      });
    } catch (error) {
      logger.error('Error checking request limits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check request limits',
        message: error.message
      });
    }
  }
}

module.exports = LimitController;
