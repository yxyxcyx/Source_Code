const express = require('express');
const router = express.Router();
const UsageController = require('../controllers/usageController');

// Get usage summary
router.get('/summary', UsageController.getSummary);

// Get usage breakdown by model
router.get('/by-model', UsageController.getByModel);

// Get usage breakdown by user
router.get('/by-user', UsageController.getByUser);

// Get usage breakdown by department
router.get('/by-department', UsageController.getByDepartment);

// Get daily statistics
router.get('/daily', UsageController.getDailyStats);

// Get all usage records
router.get('/records', UsageController.getAll);

// Get current exchange rate (USD to MYR)
router.get('/exchange-rate', UsageController.getExchangeRate);

module.exports = router;
