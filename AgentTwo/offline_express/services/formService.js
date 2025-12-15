const { v4: uuidv4 } = require('uuid');
const BiypaOfflineForm = require('../models/BiypaOfflineForm');
const History = require('../models/History');
const { db } = require('../config/database');

/**
 * Form Service implementation
 * Equivalent to FormServiceImpl in Java
 */
class FormService {
  /**
   * Insert a new form
   * @param {Object} requestFormVo - Form data
   * @returns {Promise<Object>} Created form
   */
  async insertForm(requestFormVo) {
    // Begin transaction
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        db.run('BEGIN TRANSACTION');
        
        try {
          // Create new form
          const biypaOfflineForm = new BiypaOfflineForm({
            uuid: uuidv4(),
            createdBy: requestFormVo.createdBy,
            createdOn: new Date().toISOString(),
            customerId: requestFormVo.id,
            customerName: requestFormVo.name,
            formType: requestFormVo.formType,
            isFormSync: 0, // false in boolean
            formSyncStatus: "NONE",
            formCategory: requestFormVo.formCategory || null
          });
          
          // Generate JSON payload
          const payloadMakerVo = await this.payloadMaker(requestFormVo);
          
          biypaOfflineForm.payloadJson = payloadMakerVo.jsonPayload;
          biypaOfflineForm.status = payloadMakerVo.checkStatus ? 'PENDING_SYNC' : 'INCOMPLETE';
          
          // Save the form
          await biypaOfflineForm.save();
          
          // Create history record
          await this.insertHistory(
            "Form Created", 
            "", 
            biypaOfflineForm.uuid, 
            "SUCCESS", 
            "CREATED"
          );
          
          // Commit transaction
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              reject(err);
              return;
            }
            resolve(biypaOfflineForm);
          });
          
        } catch (error) {
          // Rollback transaction on error
          db.run('ROLLBACK', (err) => {
            console.error('Transaction rolled back:', error);
            reject(error);
          });
        }
      });
    });
  }
  
  /**
   * Update an existing form
   * @param {Object} requestFormVo - Form data with uuid
   * @returns {Promise<Object>} Updated form
   */
  async updateForm(requestFormVo) {
    // Begin transaction
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        db.run('BEGIN TRANSACTION');
        
        try {
          // Find existing form
          const existingForm = await BiypaOfflineForm.findByUuid(requestFormVo.uuid);
          if (!existingForm) {
            throw new Error(`Form with UUID ${requestFormVo.uuid} not found`);
          }
          
          // Update form fields
          existingForm.lastModifiedBy = requestFormVo.lastModifiedBy || existingForm.lastModifiedBy;
          existingForm.lastModifiedOn = new Date().toISOString();
          existingForm.customerId = requestFormVo.id || existingForm.customerId;
          existingForm.customerName = requestFormVo.name || existingForm.customerName;
          existingForm.formType = requestFormVo.formType || existingForm.formType;
          existingForm.formCategory = requestFormVo.formCategory || existingForm.formCategory;
          
          // Generate JSON payload if data provided
          if (requestFormVo.data) {
            const payloadMakerVo = await this.payloadMaker(requestFormVo);
            existingForm.payloadJson = payloadMakerVo.jsonPayload;
            existingForm.status = payloadMakerVo.checkStatus ? 'PENDING_SYNC' : 'INCOMPLETE';
          }
          
          // Save updated form
          await existingForm.save();
          
          // Create history record
          await this.insertHistory(
            "Form Updated", 
            "", 
            existingForm.uuid, 
            "SUCCESS", 
            "UPDATED"
          );
          
          // Commit transaction
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              reject(err);
              return;
            }
            resolve(existingForm);
          });
          
        } catch (error) {
          // Rollback transaction on error
          db.run('ROLLBACK', (err) => {
            console.error('Transaction rolled back:', error);
            reject(error);
          });
        }
      });
    });
  }
  
  /**
   * Delete a form (soft delete)
   * @param {string} uuid - Form UUID
   * @param {string} deletedBy - User who deleted
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteForm(uuid, deletedBy) {
    // Begin transaction
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        db.run('BEGIN TRANSACTION');
        
        try {
          // Find existing form
          const existingForm = await BiypaOfflineForm.findByUuid(uuid);
          if (!existingForm) {
            throw new Error(`Form with UUID ${uuid} not found`);
          }
          
          // Soft delete
          const result = await BiypaOfflineForm.softDelete(uuid, deletedBy);
          
          // Create history record
          await this.insertHistory(
            "Form Deleted", 
            "", 
            uuid, 
            "SUCCESS", 
            "DELETED"
          );
          
          // Commit transaction
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              reject(err);
              return;
            }
            resolve(result);
          });
          
        } catch (error) {
          // Rollback transaction on error
          db.run('ROLLBACK', (err) => {
            console.error('Transaction rolled back:', error);
            reject(error);
          });
        }
      });
    });
  }
  
  /**
   * Insert a history record
   * @param {string} remark - History remark
   * @param {string} errorMessage - Error message (if any)
   * @param {string} uuidOffline - Related form UUID
   * @param {string} status - Status code
   * @param {string} categoryCode - Category code
   * @returns {Promise<Object>} Created history record
   */
  async insertHistory(remark, errorMessage, uuidOffline, status, categoryCode) {
    try {
      const history = new History({
        uuid: uuidv4(),
        createdOn: new Date().toISOString(),
        remark,
        errorMessage,
        status,
        uuidOffline,
        categoryCode
      });
      
      await history.save();
      return history;
    } catch (error) {
      console.error('Error inserting history:', error);
      throw error;
    }
  }
  
  /**
   * Process form data into a payload
   * @param {Object} requestFormVo - Form data
   * @returns {Promise<Object>} Payload object
   */
  async payloadMaker(requestFormVo) {
    let jsonPayload = "";
    let hasData = true;
    const payloadMakerVo = {
      jsonPayload: "",
      checkStatus: false
    };

    try {
      if (requestFormVo.formType && requestFormVo.formType.toUpperCase() === "UPDATE_CONTACT_DETAIL") {
        if (requestFormVo.data) {
          const contactDetailsVo = requestFormVo.data;
          
          // Convert data to JSON string
          jsonPayload = JSON.stringify(contactDetailsVo);
          
          // Validate contact details
          // Check for partial entries (country code without number or vice versa)
          const isMobilePartial = 
            (contactDetailsVo.countryCodeMobile && contactDetailsVo.countryCodeMobile !== '' && (!contactDetailsVo.mobileNo || contactDetailsVo.mobileNo === '')) || 
            (contactDetailsVo.mobileNo && contactDetailsVo.mobileNo !== '' && (!contactDetailsVo.countryCodeMobile || contactDetailsVo.countryCodeMobile === ''));
            
          const isHomePartial = 
            (contactDetailsVo.countryCodeHome && contactDetailsVo.countryCodeHome !== '' && (!contactDetailsVo.homeNo || contactDetailsVo.homeNo === '')) || 
            (contactDetailsVo.homeNo && contactDetailsVo.homeNo !== '' && (!contactDetailsVo.countryCodeHome || contactDetailsVo.countryCodeHome === ''));
            
          const isOfficePartial = 
            (contactDetailsVo.countryCodeOffice && contactDetailsVo.countryCodeOffice !== '' && (!contactDetailsVo.officeNo || contactDetailsVo.officeNo === '')) || 
            (contactDetailsVo.officeNo && contactDetailsVo.officeNo !== '' && (!contactDetailsVo.countryCodeOffice || contactDetailsVo.countryCodeOffice === ''));
            
          const isEmail = contactDetailsVo.email && contactDetailsVo.email !== '';
          
          // Check if data is valid
          if (isMobilePartial || isHomePartial || isOfficePartial) {
            hasData = false;
          } else if (!isEmail && 
                    (!contactDetailsVo.countryCodeMobile || contactDetailsVo.countryCodeMobile === '') && 
                    (!contactDetailsVo.mobileNo || contactDetailsVo.mobileNo === '') && 
                    (!contactDetailsVo.countryCodeHome || contactDetailsVo.countryCodeHome === '') && 
                    (!contactDetailsVo.homeNo || contactDetailsVo.homeNo === '') && 
                    (!contactDetailsVo.countryCodeOffice || contactDetailsVo.countryCodeOffice === '') && 
                    (!contactDetailsVo.officeNo || contactDetailsVo.officeNo === '')) {
            hasData = false;
          } else {
            hasData = true;
          }
          
          console.log("Check status:", hasData);
          
          payloadMakerVo.jsonPayload = jsonPayload;
          payloadMakerVo.checkStatus = hasData;
        }
      } else {
        // For other form types, use basic validation
        const isComplete = this.validateFormData(requestFormVo);
        
        payloadMakerVo.jsonPayload = JSON.stringify(requestFormVo.data || {});
        payloadMakerVo.checkStatus = isComplete;
      }
      
      return payloadMakerVo;
    } catch (error) {
      console.error('Error making payload:', error);
      // Don't throw error, mimic Java implementation
      return payloadMakerVo;
    }
  }
  
  /**
   * Validate form data to determine if form is complete
   * @param {Object} formData - Form data
   * @returns {boolean} True if form is complete
   */
  validateFormData(formData) {
    // Implement your validation logic here
    // This is a simplified example
    return formData.data && 
           Object.keys(formData.data).length > 0 && 
           formData.id && 
           formData.name;
  }
}

module.exports = new FormService();
