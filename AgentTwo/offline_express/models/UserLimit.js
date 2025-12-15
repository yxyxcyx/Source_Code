// User token usage limits model
const { runQuery, getQuery, getOne } = require('../config/database');

class UserLimit {
  /**
   * Initialize user limits table
   */
  static async initializeTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS USER_LIMITS (
        username TEXT PRIMARY KEY,
        daily_token_limit INTEGER DEFAULT 100000,
        monthly_token_limit INTEGER DEFAULT 1000000,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await runQuery(createTableQuery);
  }

  /**
   * Get user's token limits
   * @param {string} username - Username
   * @returns {Promise<object>} User limits or default limits
   */
  static async getUserLimits(username) {
    if (!username) {
      return this.getDefaultLimits();
    }

    const query = `
      SELECT daily_token_limit, monthly_token_limit
      FROM USER_LIMITS
      WHERE username = ?
    `;

    const result = await getOne(query, [username]);
    
    if (result) {
      return {
        dailyLimit: result.daily_token_limit,
        monthlyLimit: result.monthly_token_limit
      };
    }

    // Return default limits if user not found
    return this.getDefaultLimits();
  }

  /**
   * Get default global limits
   * @returns {object} Default limits
   */
  static getDefaultLimits() {
    return {
      dailyLimit: 100000,    // 100K tokens per day (reasonable for normal use)
      monthlyLimit: 1000000  // 1M tokens per month
    };
  }

  /**
   * Set custom limits for a user
   * @param {string} username - Username
   * @param {number} dailyLimit - Daily token limit
   * @param {number} monthlyLimit - Monthly token limit
   * @returns {Promise<void>}
   */
  static async setUserLimits(username, dailyLimit, monthlyLimit) {
    const query = `
      INSERT INTO USER_LIMITS (username, daily_token_limit, monthly_token_limit, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(username) DO UPDATE SET
        daily_token_limit = excluded.daily_token_limit,
        monthly_token_limit = excluded.monthly_token_limit,
        updated_at = CURRENT_TIMESTAMP
    `;

    await runQuery(query, [username, dailyLimit, monthlyLimit]);
  }

  /**
   * Get user's current usage for today
   * @param {string} username - Username
   * @returns {Promise<number>} Total tokens used today
   */
  static async getDailyUsage(username) {
    if (!username) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const query = `
      SELECT COALESCE(SUM(total_tokens), 0) as total
      FROM TOKEN_USAGE
      WHERE username = ?
        AND timestamp >= ?
    `;

    const result = await getOne(query, [username, todayISO]);
    return result ? result.total : 0;
  }

  /**
   * Get user's current usage for this month
   * @param {string} username - Username
   * @returns {Promise<number>} Total tokens used this month
   */
  static async getMonthlyUsage(username) {
    if (!username) return 0;

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const monthStartISO = firstDayOfMonth.toISOString();

    const query = `
      SELECT COALESCE(SUM(total_tokens), 0) as total
      FROM TOKEN_USAGE
      WHERE username = ?
        AND timestamp >= ?
    `;

    const result = await getOne(query, [username, monthStartISO]);
    return result ? result.total : 0;
  }

  /**
   * Check if user has exceeded their limits
   * @param {string} username - Username
   * @param {number} requestedTokens - Tokens requested for this operation
   * @returns {Promise<object>} Limit check result
   */
  static async checkLimits(username, requestedTokens = 0) {
    const limits = await this.getUserLimits(username);
    const dailyUsage = await this.getDailyUsage(username);
    const monthlyUsage = await this.getMonthlyUsage(username);

    const dailyRemaining = limits.dailyLimit - dailyUsage;
    const monthlyRemaining = limits.monthlyLimit - monthlyUsage;

    const wouldExceedDaily = (dailyUsage + requestedTokens) > limits.dailyLimit;
    const wouldExceedMonthly = (monthlyUsage + requestedTokens) > limits.monthlyLimit;

    return {
      allowed: !wouldExceedDaily && !wouldExceedMonthly,
      limits: {
        daily: limits.dailyLimit,
        monthly: limits.monthlyLimit
      },
      usage: {
        daily: dailyUsage,
        monthly: monthlyUsage
      },
      remaining: {
        daily: Math.max(0, dailyRemaining),
        monthly: Math.max(0, monthlyRemaining)
      },
      exceeded: {
        daily: wouldExceedDaily,
        monthly: wouldExceedMonthly
      }
    };
  }

  /**
   * Get all users with custom limits
   * @returns {Promise<array>} List of users with custom limits
   */
  static async getAllUserLimits() {
    const query = `
      SELECT username, daily_token_limit, monthly_token_limit, created_at, updated_at
      FROM USER_LIMITS
      ORDER BY username
    `;

    return await getQuery(query);
  }

  /**
   * Delete user's custom limits (revert to default)
   * @param {string} username - Username
   * @returns {Promise<void>}
   */
  static async deleteUserLimits(username) {
    const query = `DELETE FROM USER_LIMITS WHERE username = ?`;
    await runQuery(query, [username]);
  }
}

module.exports = UserLimit;
