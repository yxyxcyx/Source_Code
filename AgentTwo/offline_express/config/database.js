const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get project root directory
const projectRoot = path.resolve(__dirname, '..');
// Navigate up to the parent directory of the project
const parentDir = path.dirname(projectRoot);
// Create a data directory at the parent level (outside project)
const externalDataDir = path.join(parentDir, 'data');
if (!fs.existsSync(externalDataDir)) {
  fs.mkdirSync(externalDataDir, { recursive: true });
  console.log(`Created external data directory at ${externalDataDir}`);
}

const dbPath = path.join(externalDataDir, 'offline_express.db');
console.log(`SQLite database path: ${dbPath}`);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
    throw err;
  }
  console.log('Connected to the SQLite database.');
});

// Set pragmas for better performance and foreign key support
db.exec('PRAGMA foreign_keys = ON;', (err) => {
  if (err) {
    console.error('Error setting foreign_keys pragma:', err);
  }
});

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Enable foreign keys
    db.serialize(() => {
      // Create BIYPA_OFFLINE_FORM table (matching Java entity)
      db.run(`CREATE TABLE IF NOT EXISTS BIYPA_OFFLINE_FORM (
        uuid TEXT PRIMARY KEY,
        uuidOnline TEXT,
        refNo TEXT,
        payloadJson TEXT,
        formType TEXT,
        isFormSync INTEGER,
        formSyncStatus TEXT,
        createdBy TEXT,
        createdOn TEXT,
        lastModifiedBy TEXT,
        lastModifiedOn TEXT,
        formSyncDate TEXT,
        formSyncOn TEXT,
        customerName TEXT,
        customerId TEXT,
        transactionBranch TEXT,
        dateOfBirth TEXT,
        countryOfOrigin TEXT,
        idType TEXT,
        status TEXT,
        deletedBy TEXT,
        deletedOn TEXT,
        formCategory TEXT
      )`, (err) => {
        if (err) {
          console.error('Error creating BIYPA_OFFLINE_FORM table:', err.message);
          reject(err);
          return;
        }
        console.log('BIYPA_OFFLINE_FORM table created or already exists');
        
        // Create HISTORY table (matching Java entity)
        db.run(`CREATE TABLE IF NOT EXISTS HISTORY (
          uuid TEXT PRIMARY KEY,
          createdOn TEXT,
          remark TEXT,
          errorMessage TEXT,
          status TEXT,
          uuidOffline TEXT,
          categoryCode TEXT,
          FOREIGN KEY (uuidOffline) REFERENCES BIYPA_OFFLINE_FORM(uuid)
        )`, (err) => {
          if (err) {
            console.error('Error creating HISTORY table:', err.message);
            reject(err);
            return;
          }
          console.log('HISTORY table created or already exists');
          
          // Create TOKEN_USAGE table for cost tracking
          db.run(`CREATE TABLE IF NOT EXISTS TOKEN_USAGE (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            model TEXT NOT NULL,
            deployment TEXT,
            prompt_tokens INTEGER NOT NULL,
            completion_tokens INTEGER NOT NULL,
            total_tokens INTEGER NOT NULL,
            prompt_cost REAL NOT NULL,
            completion_cost REAL NOT NULL,
            total_cost REAL NOT NULL,
            username TEXT,
            department TEXT,
            conversation_id TEXT,
            has_image INTEGER DEFAULT 0
          )`, (err) => {
            if (err) {
              console.error('Error creating TOKEN_USAGE table:', err.message);
              reject(err);
              return;
            }
            console.log('TOKEN_USAGE table created or already exists');
            resolve();
          });
        });
      });
    });
  });
};

// Helper function to run queries with promises
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Helper function to get query results with promises
const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

// Helper function to get a single row
const getOne = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
};

// Close the database connection when the application exits
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing SQLite database:', err.message);
    } else {
      console.log('SQLite database connection closed.');
    }
    process.exit(0);
  });
});

module.exports = {
  db,
  initDatabase,
  runQuery,
  getQuery,
  getOne
};
