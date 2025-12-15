const express = require('express');
const router = express.Router();
const LimitController = require('../controllers/limitController');

// Get all users with custom limits + default limits
router.get('/', LimitController.getAllLimits);

// Get specific user's limits and current usage
router.get('/user/:username', LimitController.getUserStatus);

// Set custom limits for a user
router.post('/user/:username', LimitController.setUserLimits);

// Delete user's custom limits (revert to default)
router.delete('/user/:username', LimitController.deleteUserLimits);

// Check if a request would exceed limits
router.post('/check', LimitController.checkRequest);

module.exports = router;
