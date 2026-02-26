const express = require('express');
const router = express.Router();
const learnController = require('../controllers/learnController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { uploadLearn } = require('../middleware/upload');

// ====== PUBLIC ROUTES ======
router.get('/categories', learnController.getAllLearnCategories);
router.get('/categories/:id', learnController.getLearnCategoryById);

// Article routes
router.get('/articles/all', learnController.getAllLearnArticlesNoPagination);
router.get('/articles/featured', learnController.getFeaturedArticles);
router.get('/articles/category/:categoryId', learnController.getArticlesByCategory);
router.get('/articles', learnController.getAllLearnArticles);
router.get('/articles/:id', learnController.getLearnArticleById);

// ====== ADMIN ROUTES ======
// Learn Categories
router.post('/categories', authenticateToken, isAdmin, uploadLearn, learnController.createLearnCategory);
router.put('/categories/:id', authenticateToken, isAdmin, uploadLearn, learnController.updateLearnCategory);
router.delete('/categories/:id', authenticateToken, isAdmin, learnController.deleteLearnCategory);

// Learn Articles
router.post('/articles', authenticateToken, isAdmin, uploadLearn, learnController.createLearnArticle);
router.put('/articles/:id', authenticateToken, isAdmin, uploadLearn, learnController.updateLearnArticle);
router.delete('/articles/:id', authenticateToken, isAdmin, learnController.deleteLearnArticle);

module.exports = router;