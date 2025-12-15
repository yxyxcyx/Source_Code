const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Windows login authentication endpoint
router.post('/window-login', loginController.windowsLogin);

// Online authentication endpoint matching Java Spring Boot implementation
router.post('/auth', loginController.authLogin);

// CIF information endpoint matching Java Spring Boot implementation
router.post('/cif', loginController.getCif);

module.exports = router;
