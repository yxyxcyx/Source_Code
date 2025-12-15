const { v4: uuidv4 } = require('uuid');
const { db, runQuery, getQuery, getOne } = require('../config/database');

/**
 * BiypaOfflineForm model - equivalent to Java entity
 */
class BiypaOfflineForm {
  /**
   * Create a new BiypaOfflineForm instance
   * @param {Object} data - Form data
   */
  constructor(data = {}) {
    this.uuid = data.uuid || uuidv4();
    this.uuidOnline = data.uuidOnline || null;
    this.refNo = data.refNo || null;
    this.payloadJson = data.payloadJson || null;
    this.formType = data.formType || null;
    this.isFormSync = data.isFormSync || 0; // Using 0/1 for boolean
    this.formSyncStatus = data.formSyncStatus || null;
    this.createdBy = data.createdBy || null;
    this.createdOn = data.createdOn || new Date().toISOString();
    this.lastModifiedBy = data.lastModifiedBy || null;
    this.lastModifiedOn = data.lastModifiedOn || null;
    this.formSyncDate = data.formSyncDate || null;
    this.formSyncOn = data.formSyncOn || null;
    this.customerName = data.customerName || null;
    this.customerId = data.customerId || null;
    this.transactionBranch = data.transactionBranch || null;
    this.dateOfBirth = data.dateOfBirth || null;
    this.countryOfOrigin = data.countryOfOrigin || null;
    this.idType = data.idType || null;
    this.status = data.status || null;
    this.deletedBy = data.deletedBy || null;
    this.deletedOn = data.deletedOn || null;
    this.formCategory = data.formCategory || null;
  }

  /**
   * Save the form to the database
   * @returns {Promise<BiypaOfflineForm>} The saved form
   */
  async save() {
    const query = `
      INSERT OR REPLACE INTO BIYPA_OFFLINE_FORM (
        uuid, uuidOnline, refNo, payloadJson, formType, isFormSync,
        formSyncStatus, createdBy, createdOn, lastModifiedBy, lastModifiedOn,
        formSyncDate, formSyncOn, customerName, customerId, transactionBranch,
        dateOfBirth, countryOfOrigin, idType, status, deletedBy, deletedOn,
        formCategory
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.uuid, this.uuidOnline, this.refNo, this.payloadJson, this.formType,
      this.isFormSync, this.formSyncStatus, this.createdBy, this.createdOn,
      this.lastModifiedBy, this.lastModifiedOn, this.formSyncDate, this.formSyncOn,
      this.customerName, this.customerId, this.transactionBranch, this.dateOfBirth,
      this.countryOfOrigin, this.idType, this.status, this.deletedBy, this.deletedOn,
      this.formCategory
    ];

    try {
      await runQuery(query, params);
      return this;
    } catch (error) {
      console.error('Error saving form:', error);
      throw error;
    }
  }

  /**
   * Find a form by UUID
   * @param {string} uuid - Form UUID
   * @returns {Promise<BiypaOfflineForm|null>} The found form or null
   */
  static async findByUuid(uuid) {
    try {
      const row = await getOne('SELECT * FROM BIYPA_OFFLINE_FORM WHERE uuid = ?', [uuid]);
      return row ? new BiypaOfflineForm(row) : null;
    } catch (error) {
      console.error('Error finding form by UUID:', error);
      throw error;
    }
  }

  /**
   * Get form by UUID (alias for findByUuid for legacy compatibility)
   * @param {string} uuid - Form UUID
   * @returns {Promise<Object|null>} The found form as plain object or null
   */
  static async getById(uuid) {
    try {
      const form = await this.findByUuid(uuid);
      // Return as plain object for legacy compatibility
      return form ? { ...form } : null;
    } catch (error) {
      console.error('Error getting form by ID:', error);
      throw error;
    }
  }

  /**
   * Find forms by criteria
   * @param {Object} criteria - Search criteria
   * @param {number} limit - Max number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<BiypaOfflineForm[]>} List of forms
   */
  static async findByCriteria(criteria = {}, limit = 100, offset = 0) {
    let query = 'SELECT * FROM BIYPA_OFFLINE_FORM WHERE 1=1';
    const params = [];

    // Add criteria to the query if provided
    if (criteria.formType) {
      query += ' AND formType = ?';
      params.push(criteria.formType);
    }
    
    if (criteria.customerName) {
      query += ' AND customerName LIKE ?';
      params.push(`%${criteria.customerName}%`);
    }

    if (criteria.customerId) {
      query += ' AND customerId = ?';
      params.push(criteria.customerId);
    }

    if (criteria.status) {
      query += ' AND status = ?';
      params.push(criteria.status);
    }

    if (criteria.formCategory) {
      query += ' AND formCategory = ?';
      params.push(criteria.formCategory);
    }

    if (criteria.isFormSync !== undefined) {
      query += ' AND isFormSync = ?';
      params.push(criteria.isFormSync ? 1 : 0);
    }

    // Handle date range filtering for createdOn
    if (criteria.createdOnStart) {
      query += ' AND createdOn >= ?';
      params.push(criteria.createdOnStart);
    }

    if (criteria.createdOnEnd) {
      query += ' AND createdOn <= ?';
      params.push(criteria.createdOnEnd);
    }

    // Add sorting
    query += ' ORDER BY createdOn DESC';

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const rows = await getQuery(query, params);
      return rows.map(row => new BiypaOfflineForm(row));
    } catch (error) {
      console.error('Error finding forms by criteria:', error);
      throw error;
    }
  }

  /**
   * Get all forms
   * @param {number} limit - Max number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<BiypaOfflineForm[]>} List of all forms
   */
  static async findAll(limit = 100, offset = 0) {
    try {
      const rows = await getQuery(
        'SELECT * FROM BIYPA_OFFLINE_FORM ORDER BY createdOn DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows.map(row => new BiypaOfflineForm(row));
    } catch (error) {
      console.error('Error finding all forms:', error);
      throw error;
    }
  }

  /**
   * Get all forms as plain objects (legacy compatibility)
   * @param {number} limit - Max number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object[]>} List of all forms as plain objects
   */
  static async getAll(limit = 100, offset = 0) {
    try {
      const forms = await this.findAll(limit, offset);
      // Return as plain objects for legacy compatibility
      return forms.map(form => ({ ...form }));
    } catch (error) {
      console.error('Error getting all forms:', error);
      throw error;
    }
  }

  /**
   * Get forms by status(es)
   * @param {string|string[]} statuses - Status or array of statuses to filter by
   * @param {number} limit - Max number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object[]>} List of forms as plain objects
   */
  static async getByStatuses(statuses, limit = 100, offset = 0) {
    try {
      // Normalize statuses to array
      const statusArray = Array.isArray(statuses) ? statuses : [statuses];
      
      // Build placeholders for the IN clause
      const placeholders = statusArray.map(() => '?').join(',');
      
      const query = `
        SELECT * FROM BIYPA_OFFLINE_FORM 
        WHERE status IN (${placeholders})
        ORDER BY createdOn DESC
        LIMIT ? OFFSET ?
      `;
      
      const params = [...statusArray, limit, offset];
      
      const rows = await getQuery(query, params);
      // Return as plain objects for legacy compatibility
      return rows.map(row => ({ ...new BiypaOfflineForm(row) }));
    } catch (error) {
      console.error('Error getting forms by status:', error);
      throw error;
    }
  }

  /**
   * Search forms by criteria (legacy compatibility wrapper for findByCriteria)
   * @param {Object} criteria - Search criteria
   * @param {number} limit - Max number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object[]>} List of forms as plain objects
   */
  static async search(criteria = {}, limit = 100, offset = 0) {
    try {
      const forms = await this.findByCriteria(criteria, limit, offset);
      // Return as plain objects for legacy compatibility
      return forms.map(form => ({ ...form }));
    } catch (error) {
      console.error('Error searching forms:', error);
      throw error;
    }
  }

  /**
   * Delete a form by UUID
   * @param {string} uuid - Form UUID
   * @returns {Promise<boolean>} True if deleted
   */
  static async deleteByUuid(uuid) {
    try {
      const result = await runQuery('DELETE FROM BIYPA_OFFLINE_FORM WHERE uuid = ?', [uuid]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting form:', error);
      throw error;
    }
  }

  /**
   * Soft delete a form (set status to CANCEL, update modification fields)
   * @param {string} uuid - Form UUID
   * @param {string} deletedBy - User who deleted
   * @returns {Promise<Object>} The updated form object
   */
  static async softDelete(uuid, deletedBy) {
    try {
      const now = new Date().toISOString();
      
      // Update all required fields to match Java implementation
      const result = await runQuery(
        `UPDATE BIYPA_OFFLINE_FORM SET 
         status = ?, 
         deletedBy = ?, 
         deletedOn = ?, 
         lastModifiedBy = ?, 
         lastModifiedOn = ? 
         WHERE uuid = ?`,
        ['CANCEL', deletedBy, now, deletedBy, now, uuid]
      );
      
      if (result.changes > 0) {
        // Get the updated form to return
        const updatedForm = await this.findByUuid(uuid);
        return { success: true, form: updatedForm };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Error soft-deleting form:', error);
      throw error;
    }
  }

  /**
   * Count forms by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<number>} Count of forms
   */
  static async count(criteria = {}) {
    let query = 'SELECT COUNT(*) as count FROM BIYPA_OFFLINE_FORM WHERE 1=1';
    const params = [];

    // Add criteria to the query if provided
    if (criteria.formType) {
      query += ' AND formType = ?';
      params.push(criteria.formType);
    }
    
    if (criteria.status) {
      query += ' AND status = ?';
      params.push(criteria.status);
    }

    try {
      const result = await getOne(query, params);
      return result.count;
    } catch (error) {
      console.error('Error counting forms:', error);
      throw error;
    }
  }
}

module.exports = BiypaOfflineForm;
