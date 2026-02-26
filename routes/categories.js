const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { uploadCategory } = require('../middleware/upload');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/active', categoryController.getActiveCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin routes
router.post('/', authenticateToken, isAdmin, uploadCategory, categoryController.createCategory);
router.put('/:id', authenticateToken, isAdmin, uploadCategory, categoryController.updateCategory);
router.delete('/:id', authenticateToken, isAdmin, categoryController.deleteCategory);

module.exports = router;