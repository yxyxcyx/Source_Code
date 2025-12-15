const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');

// GET /api/forms - Get all forms with pagination
router.get('/', formController.getAllForms);

// GET /api/forms/search - Search forms by criteria
router.get('/search', formController.searchForms);

// GET /api/forms/:uuid - Get form by UUID
router.get('/:uuid', formController.getFormById);

// POST /api/forms - Create a new form
router.post('/', formController.createForm);

// PUT /api/forms/:uuid - Update an existing form
router.put('/:uuid', formController.updateForm);

// PATCH /api/forms/:uuid/soft-delete - Soft delete a form
router.patch('/:uuid/cancel', formController.softDeleteForm);

// DELETE /api/forms/:uuid - Permanently delete a form
router.delete('/:uuid', formController.deleteForm);

// POST /api/forms/branches - Get branches list (matches Spring Boot implementation)
router.post('/branches', formController.getBranches);

module.exports = router;
