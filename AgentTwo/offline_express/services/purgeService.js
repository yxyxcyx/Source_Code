// services/purgeService.js
const schedule = require('node-schedule');
const BiypaOfflineForm = require('../models/BiypaOfflineForm');
const { runQuery } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Service to handle data purging for the BIYPA_OFFLINE_FORM table
 */
class PurgeService {
  /**
   * Initialize the purge service with scheduled jobs
   * @param {Object} options - Configuration options
   * @param {boolean} options.runOnStartup - Whether to run purge immediately on startup
   * @param {boolean} options.testMode - Use shorter thresholds for testing
   */
  static initialize(options = {}) {
    const { runOnStartup = true, testMode = false } = options;
    
    // Schedule purge job to run daily at midnight (0 0 * * *)
    schedule.scheduleJob('0 0 * * *', async () => {
      try {
        logger.info('Running scheduled data purge job');
        // Always use standard thresholds for scheduled jobs (7 and 14 days)
        await this.expireOldSyncedData(7);
        await this.expireStaleData(14);
        logger.info('Scheduled data purge job completed successfully');
      } catch (error) {
        logger.error(`Error in scheduled data purge job: ${error.message}`);
      }
    });
    
    // Run immediately if specified
    if (runOnStartup) {
      // Use test thresholds if in test mode - for testing, use 0 days to see immediate results
      const syncDays = testMode ? 0 : 7;
      const staleDays = testMode ? 0 : 14;
      
      this.runManualPurge(syncDays, staleDays)
        .then(({ syncedCount, expiredCount }) => {
          logger.info(`Startup purge completed (${testMode ? 'TEST MODE' : 'STANDARD MODE'}): ${syncedCount} synced records expired, ${expiredCount} stale records expired`);
        })
        .catch(error => {
          logger.error(`Error in startup purge: ${error.message}`);
        });
    }
    
    logger.info(`Data purge service initialized with daily schedule${runOnStartup ? ' and startup execution' : ''}${testMode ? ' (TEST MODE)' : ''}`);
  }

  /**
   * Expire successfully synchronized data older than specified days
   * by changing status to EXPIRED rather than deleting
   * @param {number} days - Number of days threshold (default: 7)
   */
  static async expireOldSyncedData(days = 7) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);
      
      // Format date as YYYY-MM-DD for SQLite comparison
      const dateString = thresholdDate.toISOString().split('T')[0];
      
      // Update status to EXPIRED for old synced records instead of deleting them
      const sql = `UPDATE BIYPA_OFFLINE_FORM 
                  SET status = 'EXPIRED',
                      lastModifiedOn = datetime('now')
                  WHERE status IN ('SYNCHRONIZATION_COMPLETE', 'Synchronization Complete') 
                  AND formSyncDate IS NOT NULL 
                  AND date(formSyncDate) <= date('${dateString}')`;
      
      const result = await runQuery(sql);
      logger.info(`Expired ${result.changes} old synchronized records (${days} day threshold)`);
      
      return result.changes; // Return number of expired records
    } catch (error) {
      logger.error(`Error expiring old synced data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Expire stale PENDING_SYNC and INCOMPLETE records older than specified days
   * @param {number} days - Number of days threshold (default: 14)
   */
  static async expireStaleData(days = 14) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);
      
      // Format date as YYYY-MM-DD for SQLite comparison
      const dateString = thresholdDate.toISOString().split('T')[0];
      
      // Update status to EXPIRED for stale records
      const sql = `UPDATE BIYPA_OFFLINE_FORM 
                  SET status = 'EXPIRED', 
                      lastModifiedOn = datetime('now') 
                  WHERE status IN ('PENDING_SYNC', 'INCOMPLETE', 'Pending Sync', 'Incomplete') 
                  AND date(createdOn) <= date('${dateString}')`;
      
      const result = await runQuery(sql);
      logger.info(`Expired ${result.changes} stale records (${days} day threshold)`);
      
      return result.changes; // Return number of expired records
    } catch (error) {
      logger.error(`Error expiring stale data: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Run the purge operations manually (for testing or on-demand purging)
   * @param {number} syncDays - Days threshold for synced records
   * @param {number} staleDays - Days threshold for stale records
   */
  static async runManualPurge(syncDays = 7, staleDays = 14) {
    try {
      logger.info(`Running manual data purge job (sync: ${syncDays} days, stale: ${staleDays} days)`);
      const syncedCount = await this.expireOldSyncedData(syncDays);
      const expiredCount = await this.expireStaleData(staleDays);
      logger.info(`Manual purge completed: ${syncedCount} synced records expired, ${expiredCount} stale records expired`);
      return { syncedCount, expiredCount };
    } catch (error) {
      logger.error(`Error in manual data purge job: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PurgeService;
