const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { uploadProduct } = require('../middleware/upload');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/active', productController.getActiveProducts);
router.get('/search', productController.searchProducts);
router.get('/countries', productController.getCountriesOfOrigin);
router.get('/purities', productController.getPurityValues);
router.get('/category/:categoryId', productController.getProductsByCategory);
router.get('/:id', productController.getProductById);

// Admin routes
router.post('/', authenticateToken, isAdmin, uploadProduct, productController.createProduct);
router.put('/:id', authenticateToken, isAdmin, uploadProduct, productController.updateProduct);
router.delete('/:id', authenticateToken, isAdmin, productController.deleteProduct);

module.exports = router;