// Database inspection tool
const { getQuery } = require('./config/database');
const logger = require('./utils/logger');

async function inspectDatabase() {
  try {
    logger.info('--- Database Inspection Tool ---');
    
    // 1. Check status values in database
    logger.info('Checking unique status values:');
    const statusResults = await getQuery('SELECT DISTINCT status FROM BIYPA_OFFLINE_FORM');
    statusResults.forEach(row => {
      logger.info(`Status: "${row.status}"`);
    });
    
    // 2. Check records with formSyncDate
    logger.info('\nChecking records with formSyncDate:');
    const formSyncDateResults = await getQuery(`
      SELECT 
        uuid, status, formSyncDate, createdOn
      FROM BIYPA_OFFLINE_FORM 
      WHERE formSyncDate IS NOT NULL
      ORDER BY formSyncDate DESC
    `);
    
    if (formSyncDateResults.length === 0) {
      logger.info('No records found with formSyncDate set');
    } else {
      formSyncDateResults.forEach(row => {
        logger.info(`UUID: ${row.uuid}, Status: "${row.status}", FormSyncDate: ${row.formSyncDate}, CreatedOn: ${row.createdOn}`);
      });
    }
    
    // 3. Check PENDING_SYNC records
    logger.info('\nChecking PENDING_SYNC records:');
    const pendingSyncResults = await getQuery(`
      SELECT 
        uuid, status, formSyncDate, createdOn
      FROM BIYPA_OFFLINE_FORM 
      WHERE status = 'PENDING_SYNC'
      ORDER BY createdOn DESC
    `);
    
    pendingSyncResults.forEach(row => {
      logger.info(`UUID: ${row.uuid}, FormSyncDate: ${row.formSyncDate || 'NULL'}, CreatedOn: ${row.createdOn}`);
    });
    
    // 4. Check incomplete records
    logger.info('\nChecking INCOMPLETE records:');
    const incompleteResults = await getQuery(`
      SELECT 
        uuid, status, formSyncDate, createdOn
      FROM BIYPA_OFFLINE_FORM 
      WHERE status = 'INCOMPLETE'
      ORDER BY createdOn DESC
    `);
    
    incompleteResults.forEach(row => {
      logger.info(`UUID: ${row.uuid}, FormSyncDate: ${row.formSyncDate || 'NULL'}, CreatedOn: ${row.createdOn}`);
    });
    
    // 5. Try various purge queries to find sync-completed records
    logger.info('\nAttempting to find sync-completed records with different queries:');
    
    // Query 1 - Standard check for SYNCHRONIZATION_COMPLETE
    const query1Results = await getQuery(`
      SELECT COUNT(*) as count 
      FROM BIYPA_OFFLINE_FORM 
      WHERE status = 'SYNCHRONIZATION_COMPLETE'
    `);
    logger.info(`Query 1 (status = 'SYNCHRONIZATION_COMPLETE'): ${query1Results[0].count} records`);
    
    // Query 2 - Check for 'Synchronization Complete'
    const query2Results = await getQuery(`
      SELECT COUNT(*) as count 
      FROM BIYPA_OFFLINE_FORM 
      WHERE status = 'Synchronization Complete'
    `);
    logger.info(`Query 2 (status = 'Synchronization Complete'): ${query2Results[0].count} records`);
    
    // Query 3 - Check for any status containing 'sync' or 'Sync' and has formSyncDate
    const query3Results = await getQuery(`
      SELECT COUNT(*) as count 
      FROM BIYPA_OFFLINE_FORM 
      WHERE (status LIKE '%sync%' OR status LIKE '%Sync%')
      AND formSyncDate IS NOT NULL
    `);
    logger.info(`Query 3 (LIKE '%sync%' with formSyncDate): ${query3Results[0].count} records`);
    
    // Query 4 - Check only for formSyncDate regardless of status
    const query4Results = await getQuery(`
      SELECT COUNT(*) as count 
      FROM BIYPA_OFFLINE_FORM 
      WHERE formSyncDate IS NOT NULL
    `);
    logger.info(`Query 4 (only formSyncDate IS NOT NULL): ${query4Results[0].count} records`);

    // Query 5 - Get sample of records with formSyncDate regardless of status
    if (query4Results[0].count > 0) {
      const sampleResults = await getQuery(`
        SELECT uuid, status, formSyncDate, createdOn
        FROM BIYPA_OFFLINE_FORM 
        WHERE formSyncDate IS NOT NULL
        LIMIT 5
      `);
      
      logger.info('\nSample records with formSyncDate:');
      sampleResults.forEach(row => {
        logger.info(`UUID: ${row.uuid}, Status: "${row.status}", FormSyncDate: ${row.formSyncDate}, CreatedOn: ${row.createdOn}`);
      });
    }

    logger.info('\nDatabase inspection complete.');
  } catch (error) {
    logger.error('Error inspecting database:', error);
  }
}

// Execute the inspection
inspectDatabase()
  .then(() => {
    logger.info('Inspection completed successfully');
    process.exit(0);
  })
  .catch(err => {
    logger.error('Inspection failed:', err);
    process.exit(1);
  });
