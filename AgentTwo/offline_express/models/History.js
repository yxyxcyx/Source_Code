const { v4: uuidv4 } = require('uuid');
const { db, runQuery, getQuery, getOne } = require('../config/database');

/**
 * History model - equivalent to Java entity
 */
class History {
  /**
   * Create a new History instance
   * @param {Object} data - History data
   */
  constructor(data = {}) {
    this.uuid = data.uuid || uuidv4();
    this.createdOn = data.createdOn || new Date().toISOString();
    this.remark = data.remark || null;
    this.errorMessage = data.errorMessage || null;
    this.status = data.status || null;
    this.uuidOffline = data.uuidOffline || null;
    this.categoryCode = data.categoryCode || null;
  }

  /**
   * Save the history record to the database
   * @returns {Promise<History>} The saved history
   */
  async save() {
    const query = `
      INSERT OR REPLACE INTO HISTORY (
        uuid, createdOn, remark, errorMessage,
        status, uuidOffline, categoryCode
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.uuid, this.createdOn, this.remark, this.errorMessage,
      this.status, this.uuidOffline, this.categoryCode
    ];

    try {
      await runQuery(query, params);
      return this;
    } catch (error) {
      console.error('Error saving history:', error);
      throw error;
    }
  }

  /**
   * Find a history record by UUID
   * @param {string} uuid - History UUID
   * @returns {Promise<History|null>} The found history or null
   */
  static async findByUuid(uuid) {
    try {
      const row = await getOne('SELECT * FROM HISTORY WHERE uuid = ?', [uuid]);
      return row ? new History(row) : null;
    } catch (error) {
      console.error('Error finding history by UUID:', error);
      throw error;
    }
  }

  /**
   * Find history records by offline form UUID
   * @param {string} uuidOffline - UUID of the related offline form
   * @returns {Promise<History[]>} List of history records
   */
  static async findByUuidOffline(uuidOffline) {
    try {
      const rows = await getQuery(
        'SELECT * FROM HISTORY WHERE uuidOffline = ? ORDER BY createdOn DESC',
        [uuidOffline]
      );
      return rows.map(row => new History(row));
    } catch (error) {
      console.error('Error finding history by uuidOffline:', error);
      throw error;
    }
  }

  /**
   * Find history records by criteria
   * @param {Object} criteria - Search criteria
   * @param {number} limit - Max number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<History[]>} List of history records
   */
  static async findByCriteria(criteria = {}, limit = 100, offset = 0) {
    let query = 'SELECT * FROM HISTORY WHERE 1=1';
    const params = [];

    // Add criteria to the query if provided
    if (criteria.status) {
      query += ' AND status = ?';
      params.push(criteria.status);
    }
    
    if (criteria.uuidOffline) {
      query += ' AND uuidOffline = ?';
      params.push(criteria.uuidOffline);
    }

    if (criteria.categoryCode) {
      query += ' AND categoryCode = ?';
      params.push(criteria.categoryCode);
    }

    // Add sorting
    query += ' ORDER BY createdOn DESC';

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const rows = await getQuery(query, params);
      return rows.map(row => new History(row));
    } catch (error) {
      console.error('Error finding history records by criteria:', error);
      throw error;
    }
  }

  /**
   * Get all history records
   * @param {number} limit - Max number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<History[]>} List of all history records
   */
  static async findAll(limit = 100, offset = 0) {
    try {
      const rows = await getQuery(
        'SELECT * FROM HISTORY ORDER BY createdOn DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows.map(row => new History(row));
    } catch (error) {
      console.error('Error finding all history records:', error);
      throw error;
    }
  }

  /**
   * Delete a history record by UUID
   * @param {string} uuid - History UUID
   * @returns {Promise<boolean>} True if deleted
   */
  static async deleteByUuid(uuid) {
    try {
      const result = await runQuery('DELETE FROM HISTORY WHERE uuid = ?', [uuid]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting history record:', error);
      throw error;
    }
  }

  /**
   * Delete history records by offline form UUID
   * @param {string} uuidOffline - UUID of the related offline form
   * @returns {Promise<number>} Number of records deleted
   */
  static async deleteByUuidOffline(uuidOffline) {
    try {
      const result = await runQuery('DELETE FROM HISTORY WHERE uuidOffline = ?', [uuidOffline]);
      return result.changes;
    } catch (error) {
      console.error('Error deleting history records by uuidOffline:', error);
      throw error;
    }
  }

  /**
   * Count history records by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<number>} Count of history records
   */
  static async count(criteria = {}) {
    let query = 'SELECT COUNT(*) as count FROM HISTORY WHERE 1=1';
    const params = [];

    // Add criteria to the query if provided
    if (criteria.status) {
      query += ' AND status = ?';
      params.push(criteria.status);
    }
    
    if (criteria.uuidOffline) {
      query += ' AND uuidOffline = ?';
      params.push(criteria.uuidOffline);
    }

    try {
      const result = await getOne(query, params);
      return result.count;
    } catch (error) {
      console.error('Error counting history records:', error);
      throw error;
    }
  }
}

module.exports = History;
