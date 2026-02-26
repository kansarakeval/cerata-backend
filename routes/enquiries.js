const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Public routes
router.post('/', enquiryController.submitEnquiry);

// Admin routes
router.get('/', authenticateToken, isAdmin, enquiryController.getAllEnquiries);
router.get('/stats', authenticateToken, isAdmin, enquiryController.getEnquiryStats);
router.get('/:id', authenticateToken, isAdmin, enquiryController.getEnquiryById);
router.put('/:id/status', authenticateToken, isAdmin, enquiryController.updateEnquiryStatus);
router.delete('/:id', authenticateToken, isAdmin, enquiryController.deleteEnquiry);

module.exports = router;