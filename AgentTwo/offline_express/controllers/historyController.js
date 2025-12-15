const History = require('../models/History');

/**
 * Controller for history-related endpoints
 */
const historyController = {
  /**
   * Search history records by uuidOffline
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchByUuidOffline(req, res) {
    try {
      const { uuid } = req.query;
      
      if (!uuid) {
        return res.status(400).json({ error: 'UUID parameter is required' });
      }

      // Get history records
      const histories = await History.findByUuidOffline(uuid);
      
      // Format to match Java Spring Boot response
      const formattedHistories = histories.map(history => {
        // Convert ISO date to Java array format [year, month, day, hour, minute, second, nanosecond]
        const date = new Date(history.createdOn);
        const createdOn = [
          date.getFullYear(),
          date.getMonth() + 1, // JavaScript months are 0-based
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
          date.getSeconds(),
          date.getMilliseconds() * 1000000 // Convert milliseconds to nanoseconds
        ];

        return {
          uuid: history.uuid,
          createdOn,
          remark: history.remark || '',
          errorMessage: history.errorMessage || '',
          status: history.status,
          uuidOffline: history.uuidOffline,
          categoryCode: history.categoryCode || 'UPDATED'
        };
      });

      // Return direct array (no wrapping object) to match Java format
      return res.status(200).json(formattedHistories);
    } catch (error) {
      console.error('Error searching history:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = historyController;
