const BiypaOfflineForm = require('../models/BiypaOfflineForm');
const History = require('../models/History');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const https = require('https');
const logger = require('../utils/logger');

/**
 * Get all offline forms
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getAllForms(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const forms = await BiypaOfflineForm.findAll(limit, offset);
    const count = await BiypaOfflineForm.count();
    
    res.status(200).json({
      success: true,
      message: 'Forms retrieved successfully',
      count,
      data: forms
    });
  } catch (error) {
    console.error('Error retrieving forms:', error);
    res.status(200).json({
      success: false,
      message: 'Error retrieving forms',
      error: error.message
    });
  }
}

/**
 * Get a specific form by UUID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getFormById(req, res) {
  try {
    const { uuid } = req.params;
    
    const form = await BiypaOfflineForm.findByUuid(uuid);
    if (!form) {
      return res.status(200).json({
        success: false,
        message: `Form with UUID ${uuid} not found`
      });
    }
    
    // Get related history records
    const history = await History.findByUuidOffline(uuid);
    
    res.status(200).json({
      success: true,
      message: 'Form retrieved successfully',
      data: {
        form,
        history
      }
    });
  } catch (error) {
    console.error('Error retrieving form:', error);
    res.status(200).json({
      success: false,
      message: 'Error retrieving form',
      error: error.message
    });
  }
}

/**
 * Create a new form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function createForm(req, res) {
  try {
    const formData = req.body;
    
    // Generate a UUID if not provided
    if (!formData.uuid) {
      formData.uuid = uuidv4();
    }
    
    // Set creation timestamp if not provided
    if (!formData.createdOn) {
      formData.createdOn = new Date().toISOString();
    }
    
    // Create and save the form
    const form = new BiypaOfflineForm(formData);
    await form.save();
    
    // Create a history record for this form
    const history = new History({
      remark: `Form created with type: ${formData.formType || 'N/A'}`,
      status: 'CREATED',
      uuidOffline: form.uuid,
      categoryCode: formData.formCategory || 'UNKNOWN'
    });
    await history.save();
    
    res.status(200).json({
      success: true,
      message: 'Form created successfully',
      data: {
        form,
        history
      }
    });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(200).json({
      success: false,
      message: 'Error creating form',
      error: error.message
    });
  }
}

/**
 * Update an existing form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function updateForm(req, res) {
  try {
    const { uuid } = req.params;
    const formData = req.body;
    
    // Check if form exists
    const existingForm = await BiypaOfflineForm.findByUuid(uuid);
    if (!existingForm) {
      return res.status(200).json({
        success: false,
        message: `Form with UUID ${uuid} not found`
      });
    }
    
    // Update lastModifiedOn
    formData.lastModifiedOn = new Date().toISOString();
    
    // Merge existing form with updated data
    const updatedForm = new BiypaOfflineForm({
      ...existingForm,
      ...formData,
      uuid // Ensure UUID doesn't change
    });
    
    await updatedForm.save();
    
    // Create a history record for this update
    const history = new History({
      remark: `Form updated: ${updatedForm.formType || 'N/A'}`,
      status: 'UPDATED',
      uuidOffline: updatedForm.uuid,
      categoryCode: updatedForm.formCategory || 'UNKNOWN'
    });
    await history.save();
    
    res.status(200).json({
      success: true,
      message: 'Form updated successfully',
      data: {
        form: updatedForm,
        history
      }
    });
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(200).json({
      success: false,
      message: 'Error updating form',
      error: error.message
    });
  }
}

/**
 * Delete a form (soft delete)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function softDeleteForm(req, res) {
  try {
    const { uuid } = req.params;
    const { deletedBy } = req.body;
    
    // Check if form exists
    const existingForm = await BiypaOfflineForm.findByUuid(uuid);
    if (!existingForm) {
      return res.status(200).json({
        success: false,
        message: `Form with UUID ${uuid} not found`
      });
    }
    
    // Soft delete the form
    const result = await BiypaOfflineForm.softDelete(uuid, deletedBy);
    
    // Create a history record for this deletion
    const history = new History({
      remark: `Form soft deleted by: ${deletedBy || 'Unknown user'}`,
      status: 'DELETED',
      uuidOffline: uuid,
      categoryCode: existingForm.formCategory || 'UNKNOWN'
    });
    await history.save();
    
    res.status(200).json({
      success: true,
      message: 'Form soft deleted successfully',
      data: {
        uuid,
        deletedBy,
        deletedOn: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error soft deleting form:', error);
    res.status(200).json({
      success: false,
      message: 'Error soft deleting form',
      error: error.message
    });
  }
}

/**
 * Permanently delete a form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function deleteForm(req, res) {
  try {
    const { uuid } = req.params;
    
    // Check if form exists
    const existingForm = await BiypaOfflineForm.findByUuid(uuid);
    if (!existingForm) {
      return res.status(200).json({
        success: false,
        message: `Form with UUID ${uuid} not found`
      });
    }
    
    // Delete all related history records
    await History.deleteByUuidOffline(uuid);
    
    // Delete the form
    await BiypaOfflineForm.deleteByUuid(uuid);
    
    res.status(200).json({
      success: true,
      message: 'Form and related history deleted permanently',
      data: { uuid }
    });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(200).json({
      success: false,
      message: 'Error deleting form',
      error: error.message
    });
  }
}

/**
 * Search for forms by criteria
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function searchForms(req, res) {
  try {
    const criteria = req.query;
    const limit = parseInt(criteria.limit) || 100;
    const offset = parseInt(criteria.offset) || 0;
    
    // Remove pagination parameters from search criteria
    delete criteria.limit;
    delete criteria.offset;
    
    // Convert isFormSync string to boolean if present
    if ('isFormSync' in criteria) {
      criteria.isFormSync = criteria.isFormSync === 'true';
    }
    
    const forms = await BiypaOfflineForm.findByCriteria(criteria, limit, offset);
    const count = await BiypaOfflineForm.count(criteria);
    
    res.status(200).json({
      success: true,
      message: 'Forms searched successfully',
      count,
      data: forms
    });
  } catch (error) {
    console.error('Error searching forms:', error);
    res.status(200).json({
      success: false,
      message: 'Error searching forms',
      error: error.message
    });
  }
}

/**
 * Get branches list - matches Spring Boot implementation
 * @param {Object} req - Express request object with authorizationCode in body
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getBranches(req, res) {
  try {
    const { authorizationCode } = req.body;
    
    if (!authorizationCode) {
      console.log('Branches request failed: Missing authorization code');
      return res.status(200).json([]);
    }

    // Create a custom https agent for TLS 1.2
    const https = require('https');
    const axios = require('axios');
    
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Trust self-signed certificates
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.2'
    });

    // API endpoint for branches
    const branchesUrl = 'https://services-uat.dbosuat.corp.alliancebg.com.my/dbob/product/protected/v1/branches';
    
    console.log(`Calling branches API: ${branchesUrl}`);
    
    // Headers for the request
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${authorizationCode}`
    };
    
    // Make the HTTP request to the branches API
    const response = await axios.get(
      branchesUrl,
      { 
        headers,
        httpsAgent,
        timeout: 10000
      }
    );
    
    console.log('Branches API response received');
    
    const responseData = response.data;
    
    // Format response to match Spring Boot
    const branchList = [];
    
    if (Array.isArray(responseData)) {
      for (const branch of responseData) {
        branchList.push({
          branchName: branch.branchName || '',
          uuid: branch.uuid || '',
          convBranch: branch.convBranch || '',
          islamicBranch: branch.islamicBranch || ''
        });
      }
    }
    
    return res.status(200).json(branchList);
    
  } catch (error) {
    console.error('getBranches error:', error.message);
    // Return empty array on error to match Spring Boot behavior
    return res.status(200).json([]);
  }
}

/**
 * Sync an offline form with the online system (matches Spring Boot implementation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function syncForm(req, res) {
  const uuid = req.query.uuid;
  const loginVo = req.body;
  
  try {
    logger.info(`Starting form sync process for UUID: ${uuid}`);
    
    // Look up form by UUID
    const form = await BiypaOfflineForm.findByUuid(uuid);
    if (!form) {
      logger.error(`Form not found with UUID: ${uuid}`);
      return res.status(200).json({
        uuid: uuid,
        error: true,
        message: 'Form not found'
      });
    }
    
    logger.info(`Found form ${uuid}, starting sync with online system`);
    
    // Build Biypa response object
    const biypaVo = {
      uuid: form.uuidOnline || '',
      refNo: form.refNo || '',
      error: false,
      message: '',
      status: 'success'
    };
    
    // Configure TLS for external API calls
    logger.info('Configuring TLS 1.2 for external API call');
    const agent = new https.Agent({
      rejectUnauthorized: false, // For dev only - remove in production
      secureProtocol: 'TLSv1_2_method'
    });
    
    // Set up headers
    const headers = {
      'DBOS-HS': loginVo.dbosHS,
      'Authorization': `Bearer ${loginVo.authorizationCode}`
    };
    
    // Send POST request to external API
    const apiUrl = 'https://services-uat.dbosuat.corp.alliancebg.com.my/dbob/scenter/protected/v1/biypa/form/advance/submit';
    logger.info(`Making external API call to ${apiUrl}`);
    const response = await axios.post(apiUrl, loginVo.valueBody, {
      headers,
      httpsAgent: agent
    });
    
    // Update the form based on the response
    if (response && response.data) {
      const responseData = response.data;
      
      logger.info(`Received successful response from API: ${JSON.stringify(responseData)}`);
      
      const now = new Date();
      // Convert Date to Java format [year, month, day, hour, minute, second, nanosecond]
      const nowJavaFormat = [
        now.getFullYear(),
        now.getMonth() + 1,  // Java months are 1-based, JS is 0-based
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds() * 1000000 // Convert milliseconds to nanoseconds
      ];
      
      // Update the form in the database - create updated form and save
      const updatedForm = new BiypaOfflineForm({
        ...form,
        formSync: true,
        formSyncOn: nowJavaFormat,
        formSyncStatus: 'success',
        lastModifiedBy: loginVo.username,
        lastModifiedOn: nowJavaFormat,
        formSyncDate: nowJavaFormat,
        status: 'COMPLETE',
        refNo: responseData.refNo || '',
        uuidOnline: responseData.uuid || ''
      });
      await updatedForm.save();
      logger.info(`Form ${uuid} updated with sync status SUCCESS`);
      
      // Add history entry
      const history = new History({
        uuid: uuidv4(),
        errorMessage: '',
        uuidOffline: uuid,
        createdOn: nowJavaFormat,
        status: 'SUCCESS',
        remark: 'Form Synchronized - Success',
        categoryCode: 'SYNC'
      });
      await history.save();
      logger.info(`History entry created for successful sync of form ${uuid}`);
    } else {
      // Handle case with no response
      logger.warn(`No response data received from API for form ${uuid}`);
      
      const now = new Date();
      // Convert Date to Java format [year, month, day, hour, minute, second, nanosecond]
      const nowJavaFormat = [
        now.getFullYear(),
        now.getMonth() + 1,  // Java months are 1-based, JS is 0-based
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds() * 1000000 // Convert milliseconds to nanoseconds
      ];
      
      const updatedForm = new BiypaOfflineForm({
        ...form,
        formSync: false,
        formSyncOn: nowJavaFormat,
        formSyncStatus: 'failed',
        lastModifiedBy: loginVo.username,
        lastModifiedOn: nowJavaFormat,
        formSyncDate: nowJavaFormat,
        status: 'FAILED'
      });
      await updatedForm.save();
      logger.warn(`Form ${uuid} updated with sync status FAILED (no response data)`);
      
      // Add history entry
      const history = new History({
        uuid: uuidv4(),
        errorMessage: 'No response received from server.',
        uuidOffline: uuid,
        createdOn: nowJavaFormat,
        status: 'FAILED',
        remark: 'Form Synchronized - Failed',
        categoryCode: 'SYNC'
      });
      await history.save();
      logger.warn(`History entry created for failed sync of form ${uuid} (no response data)`);
    }
    
    return res.status(200).json(biypaVo);
    
  } catch (error) {
    logger.error(`Error syncing form with online system: ${uuid}`, error);
    
    // Update the form to reflect the failure
    const now = new Date();
    // Convert Date to Java format [year, month, day, hour, minute, second, nanosecond]
    const nowJavaFormat = [
      now.getFullYear(),
      now.getMonth() + 1,  // Java months are 1-based, JS is 0-based
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds() * 1000000 // Convert milliseconds to nanoseconds
    ];
    
    const updatedForm = new BiypaOfflineForm({
      ...form,
      formSync: false,
      formSyncOn: nowJavaFormat,
      formSyncStatus: 'failed',
      lastModifiedBy: loginVo.username || 'system',
      lastModifiedOn: nowJavaFormat,
      formSyncDate: nowJavaFormat,
      status: 'FAILED'
    });
    await updatedForm.save();
    logger.error(`Form ${uuid} updated with sync status FAILED (error: ${error.message})`);
    
    // Add history entry
    const history = new History({
      uuid: uuidv4(),
      errorMessage: error.toString(),
      uuidOffline: uuid,
      createdOn: nowJavaFormat,
      status: 'ERROR',
      remark: 'Form Synchronized - Exception',
      categoryCode: 'SYNC'
    });
    await history.save();
    logger.error(`History entry created for error during sync of form ${uuid}`);
    
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

module.exports = {
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  searchForms,
  softDeleteForm,
  getBranches,
  syncForm
};
