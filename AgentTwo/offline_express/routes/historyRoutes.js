const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

/**
 * @route   GET /history/search
 * @desc    Search history records by uuidOffline
 * @access  Public
 */
router.get('/search', historyController.searchByUuidOffline);

module.exports = router;
