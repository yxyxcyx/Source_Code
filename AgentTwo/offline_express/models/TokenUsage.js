const { runQuery, getQuery, getOne } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { calculateCost } = require('../config/pricing');

class TokenUsage {
  /**
   * Save token usage data to the database
   * @param {object} usageData - Token usage data
   * @returns {Promise<object>} Saved usage record
   */
  static async create(usageData) {
    const {
      model,
      deployment,
      promptTokens,
      completionTokens,
      totalTokens,
      username,
      department,
      conversationId,
      hasImage
    } = usageData;

    // Calculate costs
    const costs = calculateCost(promptTokens, completionTokens, model);

    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const query = `
      INSERT INTO TOKEN_USAGE (
        id, timestamp, model, deployment,
        prompt_tokens, completion_tokens, total_tokens,
        prompt_cost, completion_cost, total_cost,
        username, department, conversation_id, has_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      timestamp,
      model,
      deployment || null,
      promptTokens,
      completionTokens,
      totalTokens,
      costs.promptCost,
      costs.completionCost,
      costs.totalCost,
      username || null,
      department || null,
      conversationId || null,
      hasImage ? 1 : 0
    ];

    await runQuery(query, params);

    return {
      id,
      timestamp,
      model,
      deployment,
      promptTokens,
      completionTokens,
      totalTokens,
      ...costs,
      username,
      department,
      conversationId,
      hasImage
    };
  }

  /**
   * Get usage summary for a date range
   * @param {string} fromDate - Start date (ISO string)
   * @param {string} toDate - End date (ISO string)
   * @returns {Promise<object>} Usage summary
   */
  static async getSummary(fromDate, toDate) {
    const query = `
      SELECT 
        COUNT(*) as total_requests,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(prompt_cost) as total_prompt_cost,
        SUM(completion_cost) as total_completion_cost,
        SUM(total_cost) as total_cost,
        AVG(total_tokens) as avg_tokens_per_request,
        AVG(total_cost) as avg_cost_per_request,
        SUM(has_image) as requests_with_images
      FROM TOKEN_USAGE
      WHERE timestamp >= ? AND timestamp <= ?
    `;

    const result = await getOne(query, [fromDate, toDate]);
    return result || {};
  }

  /**
   * Get usage breakdown by model
   * @param {string} fromDate - Start date (ISO string)
   * @param {string} toDate - End date (ISO string)
   * @returns {Promise<array>} Usage by model
   */
  static async getByModel(fromDate, toDate) {
    const query = `
      SELECT 
        model,
        COUNT(*) as requests,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost
      FROM TOKEN_USAGE
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY model
      ORDER BY total_cost DESC
    `;

    return await getQuery(query, [fromDate, toDate]);
  }

  /**
   * Get usage breakdown by user
   * @param {string} fromDate - Start date (ISO string)
   * @param {string} toDate - End date (ISO string)
   * @returns {Promise<array>} Usage by user
   */
  static async getByUser(fromDate, toDate) {
    const query = `
      SELECT 
        username,
        department,
        COUNT(*) as requests,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost
      FROM TOKEN_USAGE
      WHERE timestamp >= ? AND timestamp <= ?
        AND username IS NOT NULL
      GROUP BY username, department
      ORDER BY total_cost DESC
    `;

    return await getQuery(query, [fromDate, toDate]);
  }

  /**
   * Get usage breakdown by department
   * @param {string} fromDate - Start date (ISO string)
   * @param {string} toDate - End date (ISO string)
   * @returns {Promise<array>} Usage by department
   */
  static async getByDepartment(fromDate, toDate) {
    const query = `
      SELECT 
        department,
        COUNT(*) as requests,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost
      FROM TOKEN_USAGE
      WHERE timestamp >= ? AND timestamp <= ?
        AND department IS NOT NULL
      GROUP BY department
      ORDER BY total_cost DESC
    `;

    return await getQuery(query, [fromDate, toDate]);
  }

  /**
   * Get daily usage statistics
   * @param {string} fromDate - Start date (ISO string)
   * @param {string} toDate - End date (ISO string)
   * @returns {Promise<array>} Daily usage stats
   */
  static async getDailyStats(fromDate, toDate) {
    const query = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as requests,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost
      FROM TOKEN_USAGE
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;

    return await getQuery(query, [fromDate, toDate]);
  }

  /**
   * Get all usage records with pagination
   * @param {number} limit - Number of records to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<array>} Usage records
   */
  static async getAll(limit = 100, offset = 0) {
    const query = `
      SELECT * FROM TOKEN_USAGE
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    return await getQuery(query, [limit, offset]);
  }
}

module.exports = TokenUsage;
