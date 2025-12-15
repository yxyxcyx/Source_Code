const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { db, runQuery } = require('../config/database');
const BiypaOfflineForm = require('../models/BiypaOfflineForm');
const History = require('../models/History');

/**
 * Data Migration Utility
 * 
 * This utility helps migrate data from H2DB (Java) to SQLite (Node.js).
 * H2DB does not have native connectivity from Node.js, so this utility
 * imports data from CSV files that can be exported from the Java application.
 */

/**
 * Import forms from a CSV file
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<{ success: boolean, count: number, errors: Array }>}
 */
async function importFormsFromCsv(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const results = {
      success: true,
      count: 0,
      errors: []
    };

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });

    let isFirstLine = true;
    let headers = [];

    rl.on('line', async (line) => {
      try {
        // Skip empty lines
        if (!line.trim()) return;

        // Process header row
        if (isFirstLine) {
          headers = parseCSVLine(line);
          isFirstLine = false;
          return;
        }

        // Parse CSV line into values
        const values = parseCSVLine(line);
        
        // Create object from headers and values
        const formData = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            formData[header] = values[index];
          }
        });

        // Create and save the form
        const form = new BiypaOfflineForm(formData);
        await form.save();
        results.count++;
      } catch (error) {
        console.error('Error processing line:', line, error);
        results.errors.push({ line, error: error.message });
        results.success = false;
      }
    });

    rl.on('close', () => {
      resolve(results);
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Import history records from a CSV file
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<{ success: boolean, count: number, errors: Array }>}
 */
async function importHistoryFromCsv(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const results = {
      success: true,
      count: 0,
      errors: []
    };

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });

    let isFirstLine = true;
    let headers = [];

    rl.on('line', async (line) => {
      try {
        // Skip empty lines
        if (!line.trim()) return;

        // Process header row
        if (isFirstLine) {
          headers = parseCSVLine(line);
          isFirstLine = false;
          return;
        }

        // Parse CSV line into values
        const values = parseCSVLine(line);
        
        // Create object from headers and values
        const historyData = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            historyData[header] = values[index];
          }
        });

        // Create and save the history record
        const history = new History(historyData);
        await history.save();
        results.count++;
      } catch (error) {
        console.error('Error processing line:', line, error);
        results.errors.push({ line, error: error.message });
        results.success = false;
      }
    });

    rl.on('close', () => {
      resolve(results);
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Parse a CSV line into an array of values
 * @param {string} line - CSV line
 * @returns {Array<string>} Array of values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && current === '' && !inQuotes) {
      // Start of quoted field
      inQuotes = true;
    } else if (char === '"' && nextChar === '"' && inQuotes) {
      // Escaped quote inside quoted field
      current += '"';
      i++; // Skip the next quote
    } else if (char === '"' && inQuotes) {
      // End of quoted field
      inQuotes = false;
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      // Add character to current field
      current += char;
    }
  }

  // Add the last field
  result.push(current);
  return result;
}

/**
 * Generate SQL script to export data from H2DB
 * @returns {string} SQL script
 */
function generateH2ExportScript() {
  return `
-- H2 Export Script for BIYPA_OFFLINE_FORM table
CALL CSVWRITE('export_forms.csv', 'SELECT * FROM BIYPA_OFFLINE_FORM');

-- H2 Export Script for HISTORY table
CALL CSVWRITE('export_history.csv', 'SELECT * FROM HISTORY');
  `.trim();
}

/**
 * Run the complete migration process
 * @param {string} formsFilePath - Path to forms CSV file
 * @param {string} historyFilePath - Path to history CSV file
 * @returns {Promise<{ success: boolean, forms: Object, history: Object }>}
 */
async function runMigration(formsFilePath, historyFilePath) {
  try {
    console.log('Starting data migration...');
    
    const formsResult = await importFormsFromCsv(formsFilePath);
    console.log(`Forms imported: ${formsResult.count}, Errors: ${formsResult.errors.length}`);
    
    const historyResult = await importHistoryFromCsv(historyFilePath);
    console.log(`History records imported: ${historyResult.count}, Errors: ${historyResult.errors.length}`);
    
    return {
      success: formsResult.success && historyResult.success,
      forms: formsResult,
      history: historyResult
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  importFormsFromCsv,
  importHistoryFromCsv,
  generateH2ExportScript,
  runMigration
};
