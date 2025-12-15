const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const formService = require('../services/formService');
const BiypaOfflineForm = require('../models/BiypaOfflineForm');
const History = require('../models/History'); // Assuming History model is defined in this file

/**
 * Legacy routes for compatibility with Spring Boot API
 * This allows for easier migration from Java to Node.js
 */

// POST /form/requestForm - Create a new form
router.post('/requestForm', async (req, res) => {
  try {
    const result = await formService.insertForm(req.body);
    
    if (result.success) {
      // Get the created form and return it directly
      const form = await BiypaOfflineForm.getById(result.uuid);
      if (form) {
        // Convert to match Java format
        formatFormForJavaCompatibility(form);
        res.status(200).json(form);
      } else {
        res.status(200).json({}); // Empty object if not found
      }
    } else {
      res.status(200).json({}); // Return empty object on error to match Java behavior
    }
  } catch (error) {
    console.error('Error in requestForm endpoint:', error);
    res.status(200).json({}); // Return empty object on error to match Java behavior
  }
});

// PUT /form/update - Update an existing form
router.put('/update', async (req, res) => {
  try {
    const uuid = req.query.uuid;
    if (!uuid) {
      return res.status(200).json({});
    }
    
    const result = await formService.updateForm({
      ...req.body,
      uuid
    });
    
    if (result.success) {
      // Get the updated form and return it directly
      const form = await BiypaOfflineForm.getById(uuid);
      if (form) {
        // Convert to match Java format
        formatFormForJavaCompatibility(form);
        res.status(200).json(form);
      } else {
        res.status(200).json({}); // Empty object if not found
      }
    } else {
      res.status(200).json({}); // Empty object on error
    }
  } catch (error) {
    console.error('Error in update endpoint:', error);
    res.status(200).json({});
  }
});

// GET /form/list - Get all forms by status
router.get('/list', async (req, res) => {
  try {
    const statusList = req.query.status ? 
      (Array.isArray(req.query.status) ? req.query.status : req.query.status.split(',')) : 
      [];
    
    // Get all forms with the specified status(es)
    let forms = [];
    if (statusList.length > 0) {
      forms = await BiypaOfflineForm.getByStatuses(statusList);
    } else {
      forms = await BiypaOfflineForm.getAll();
    }
    
    // Convert each form to match Java format
    forms = forms.map(form => formatFormForJavaCompatibility(form));
    
    // Send direct array response like Spring Boot
    res.status(200).json(forms);
  } catch (error) {
    console.error('Error in list endpoint:', error);
    res.status(200).json([]);  // Empty array on error
  }
});

// GET /form/selected - Get form by UUID
router.get('/selected', async (req, res) => {
  try {
    const uuid = req.query.uuid;
    if (!uuid) {
      return res.status(200).json({});
    }
    
    const form = await BiypaOfflineForm.getById(uuid);
    if (form) {
      // Convert to match Java format
      formatFormForJavaCompatibility(form);
      res.status(200).json(form);
    } else {
      res.status(200).json({});  // Empty object if not found
    }
  } catch (error) {
    console.error('Error in selected endpoint:', error);
    res.status(200).json({});
  }
});

// PUT /form/cancel - Cancel/soft delete a form
router.put('/cancel', async (req, res) => {
  try {
    const uuid = req.query.uuid;
    const modifiedBy = req.query.modifiedBy || 'system';
    
    if (!uuid) {
      return res.status(200).json({});
    }
    
    const result = await BiypaOfflineForm.softDelete(uuid, modifiedBy);
    
    if (result.success) {
      // Format the form object for Java compatibility
      const formattedForm = formatFormForJavaCompatibility(result.form);
      
      // Create a history record for this deletion
      const history = new History({
        remark: "Form Deleted",
        errorMessage: "",
        status: "DELETED",
        uuidOffline: uuid,
        categoryCode: "DELETED"
      });
      await history.save();
      
      // Return the updated form like the Java API does
      res.status(200).json(formattedForm);
    } else {
      res.status(200).json({});
    }
  } catch (error) {
    console.error('Error in cancel endpoint:', error);
    res.status(200).json({});
  }
});

// GET /form/search - Search forms by criteria
router.get('/search', async (req, res) => {
  try {
    // Create a copy of the query parameters to modify
    const criteria = { ...req.query };
    
    // Handle 'statuses' parameter for multiple status filtering
    if (criteria.statuses) {
      // Get statuses as an array
      let statusList;
      if (Array.isArray(criteria.statuses)) {
        statusList = criteria.statuses;
      } else {
        // Split comma-separated string into array
        statusList = criteria.statuses.split(',');
      }
      
      // Remove the original statuses parameter
      delete criteria.statuses;
      
      // For date ranges, convert string dates to proper ISO format if needed
      if (criteria.createdOnStart) {
        try {
          // If date is not already in ISO format, convert it
          if (!criteria.createdOnStart.includes('T')) {
            const date = new Date(criteria.createdOnStart);
            criteria.createdOnStart = date.toISOString();
          }
        } catch (e) {
          console.error('Invalid createdOnStart date format:', e);
        }
      }
      
      if (criteria.createdOnEnd) {
        try {
          // If date is not already in ISO format, convert it
          if (!criteria.createdOnEnd.includes('T')) {
            const date = new Date(criteria.createdOnEnd);
            // Set time to end of day to include the entire day
            date.setHours(23, 59, 59, 999);
            criteria.createdOnEnd = date.toISOString();
          }
        } catch (e) {
          console.error('Invalid createdOnEnd date format:', e);
        }
      }
      
      // Handle search with multiple statuses
      const promises = statusList.map(status => 
        BiypaOfflineForm.search({ ...criteria, status })
      );
      
      // Combine results from all status searches
      const formArrays = await Promise.all(promises);
      let forms = [].concat(...formArrays);
      
      // Filter out duplicates based on uuid
      const uniqueFormMap = new Map();
      forms.forEach(form => {
        uniqueFormMap.set(form.uuid, form);
      });
      forms = Array.from(uniqueFormMap.values());
      
      // Convert each form to match Java format and sort by createdOn DESC to match Java behavior
      const formattedForms = forms
        .map(form => formatFormForJavaCompatibility(form))
        .sort((a, b) => {
          // Compare createdOn array values in reverse order (newer first)
          // [year, month, day, hour, minute, second, nanosecond]
          for (let i = 0; i < 7; i++) {
            if (a.createdOn[i] !== b.createdOn[i]) {
              return b.createdOn[i] - a.createdOn[i];
            }
          }
          return 0;
        });
      
      // Send direct array response like Spring Boot
      return res.status(200).json(formattedForms);
    }
    
    // If no 'statuses' parameter, use standard search
    // For date ranges, convert string dates to proper ISO format if needed
    if (criteria.createdOnStart) {
      try {
        // If date is not already in ISO format, convert it
        if (!criteria.createdOnStart.includes('T')) {
          const date = new Date(criteria.createdOnStart);
          criteria.createdOnStart = date.toISOString();
        }
      } catch (e) {
        console.error('Invalid createdOnStart date format:', e);
      }
    }
    
    if (criteria.createdOnEnd) {
      try {
        // If date is not already in ISO format, convert it
        if (!criteria.createdOnEnd.includes('T')) {
          const date = new Date(criteria.createdOnEnd);
          // Set time to end of day to include the entire day
          date.setHours(23, 59, 59, 999);
          criteria.createdOnEnd = date.toISOString();
        }
      } catch (e) {
        console.error('Invalid createdOnEnd date format:', e);
      }
    }
    
    const forms = await BiypaOfflineForm.search(criteria);
    
    // Convert each form to match Java format
    const formattedForms = forms.map(form => formatFormForJavaCompatibility(form));
    
    // Send direct array response like Spring Boot
    res.status(200).json(formattedForms);
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(200).json([]);  // Empty array on error
  }
});

// GET /form/history - Get form history
router.get('/history', async (req, res) => {
  // Existing history route logic
});

// POST /form/branches - Get branches list (matches Spring Boot implementation)
router.post('/branches', formController.getBranches);

// POST /form/sync - Sync offline form with online system (matches Spring Boot implementation)
router.post('/sync', formController.syncForm);

module.exports = router;

/**
 * Format a form object to match Java Spring Boot response format
 * - Convert date strings to arrays [year, month, day, hour, minute, second, nanosecond]
 * - Convert boolean values to match Java format
 * @param {Object} form - The form object to format
 * @returns {Object} - The formatted form object
 */
function formatFormForJavaCompatibility(form) {
  // Make a copy to avoid mutating the original
  const formatted = { ...form };
  
  // Convert isFormSync from number to boolean
  if (formatted.isFormSync !== undefined) {
    formatted.isFormSync = formatted.isFormSync === 1;
    // Add formSync field for compatibility (Java has both)
    formatted.formSync = formatted.isFormSync;
  }
  
  // Convert date strings to Java format arrays [year, month, day, hour, minute, second, nanosecond]
  if (formatted.createdOn) {
    const date = new Date(formatted.createdOn);
    formatted.createdOn = [
      date.getFullYear(),
      date.getMonth() + 1,  // Java uses 1-12 for months
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds() * 1000000  // Convert milliseconds to nanoseconds
    ];
  }
  
  if (formatted.lastModifiedOn) {
    const date = new Date(formatted.lastModifiedOn);
    formatted.lastModifiedOn = [
      date.getFullYear(),
      date.getMonth() + 1,  // Java uses 1-12 for months
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds() * 1000000  // Convert milliseconds to nanoseconds
    ];
  }
  
  if (formatted.deletedOn) {
    const date = new Date(formatted.deletedOn);
    formatted.deletedOn = [
      date.getFullYear(),
      date.getMonth() + 1,  // Java uses 1-12 for months
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds() * 1000000  // Convert milliseconds to nanoseconds
    ];
  }
  
  // Add conversion for formSyncOn
  if (formatted.formSyncOn) {
    const date = new Date(formatted.formSyncOn);
    formatted.formSyncOn = [
      date.getFullYear(),
      date.getMonth() + 1,  // Java uses 1-12 for months
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds() * 1000000  // Convert milliseconds to nanoseconds
    ];
  }
  
  // Add conversion for formSyncDate
  if (formatted.formSyncDate) {
    const date = new Date(formatted.formSyncDate);
    formatted.formSyncDate = [
      date.getFullYear(),
      date.getMonth() + 1,  // Java uses 1-12 for months
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds() * 1000000  // Convert milliseconds to nanoseconds
    ];
  }
  
  return formatted;
}

// Additional endpoints can be added as needed for further compatibility
